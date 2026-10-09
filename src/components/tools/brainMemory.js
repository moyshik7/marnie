'use strict';

const fs = require('fs');
const path = require('path');
const { WORKSPACE_DIR } = require('../../utils/workspace');
const db = require('../../db/index');
const ollama = require('../providers/ollama/interact');

const BRAIN_FILE_PATH = path.join(WORKSPACE_DIR, 'BRAIN.md');

/**
 * Default initial template for BRAIN.md
 */
const INITIAL_BRAIN_TEMPLATE = `# BRAIN (Persistent Memory)

This file stores persistent memory, context, and preferences about the user.
It is automatically updated by Marnie to personalize conversations and retain knowledge across sessions.

## User Profile & Preferences
- Name/Identity: User
- Communication Style: Direct, technical, and concise

## Technical Stack & Working Style
- Primary Technologies: Node.js, JavaScript/TypeScript, Linux, Bash
- Development Preferences: Clean architecture, modular code, persistent memory

## Active Projects & Goals
- Marnie AI Workspace
`;

/**
 * Ensure BRAIN.md exists with initial template if missing.
 */
function ensureBrainFile() {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
  if (!fs.existsSync(BRAIN_FILE_PATH)) {
    try {
      fs.writeFileSync(BRAIN_FILE_PATH, INITIAL_BRAIN_TEMPLATE, 'utf8');
    } catch (err) {
      console.warn('[brain] Failed to create initial BRAIN.md:', err.message);
    }
  }
}

/**
 * Read current BRAIN.md content.
 * @returns {string}
 */
function getBrainContent() {
  try {
    if (!fs.existsSync(BRAIN_FILE_PATH)) {
      ensureBrainFile();
    }
    return fs.readFileSync(BRAIN_FILE_PATH, 'utf8');
  } catch (err) {
    console.warn('[brain] Error reading BRAIN.md:', err.message);
    return '';
  }
}

/**
 * Write updated content to BRAIN.md.
 * @param {string} content
 * @returns {boolean}
 */
function saveBrainContent(content) {
  try {
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
    fs.writeFileSync(BRAIN_FILE_PATH, content, 'utf8');
    return true;
  } catch (err) {
    console.error('[brain] Error writing to BRAIN.md:', err.message);
    return false;
  }
}

/**
 * Format BRAIN.md memory context for inclusion in LLM system prompt.
 * @returns {string}
 */
function formatBrainForSystemPrompt() {
  const content = getBrainContent().trim();
  if (!content) return '';

  return `
## PERSISTENT USER MEMORY & CONTEXT (from workspace/BRAIN.md)
The following is your persistent long-term memory about the user, their preferences, coding styles, and active projects, loaded from \`workspace/BRAIN.md\`. Always maintain continuity, personalize your responses, and align with these facts unless the user explicitly instructs otherwise:
<user_brain_memory>
${content}
</user_brain_memory>
`.trim();
}

/**
 * Get setting value from SQLite.
 */
function getSetting(key, fallback = '') {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row && row.value !== undefined ? row.value : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Set setting value in SQLite.
 */
function setSetting(key, value) {
  try {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES (?, ?, strftime('%s','now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%s','now')
    `).run(key, String(value));
  } catch (err) {
    console.warn(`[brain] Failed to save setting ${key}:`, err.message);
  }
}

/**
 * Check if a conversation has reached 5 new messages since last memory consolidation.
 * @param {string} conversationId
 * @returns {{ shouldConsolidate: boolean, currentCount: number, lastConsolidated: number }}
 */
function checkMemoryTrigger(conversationId) {
  if (!conversationId) return { shouldConsolidate: false, currentCount: 0, lastConsolidated: 0 };

  const enabled = getSetting('brain_enabled', 'true') !== 'false';
  if (!enabled) {
    return { shouldConsolidate: false, currentCount: 0, lastConsolidated: 0 };
  }

  try {
    const row = db.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?').get(conversationId);
    const currentCount = row ? row.count : 0;
    const settingKey = `brain_last_count_${conversationId}`;
    const lastConsolidated = parseInt(getSetting(settingKey, '0'), 10) || 0;

    // Trigger after at least 5 messages and every 5 messages since last consolidation
    const shouldConsolidate = currentCount >= 5 && (currentCount - lastConsolidated) >= 5;

    return {
      shouldConsolidate,
      currentCount,
      lastConsolidated,
    };
  } catch (err) {
    console.warn('[brain] Error checking memory trigger:', err.message);
    return { shouldConsolidate: false, currentCount: 0, lastConsolidated: 0 };
  }
}

/**
 * Consolidate memory using an additional LLM call.
 * Takes previous memory + last 5 conversation messages and generates updated BRAIN.md.
 *
 * @param {object} opts
 * @param {string} opts.conversationId
 * @param {string} [opts.model]
 * @returns {Promise<{ updated: boolean, content: string, error?: string }>}
 */
async function consolidateMemory({ conversationId, model }) {
  try {
    console.log(`[brain] Starting memory consolidation for conversation ${conversationId}...`);

    // 1. Get current memory
    const previousMemory = getBrainContent();

    // 2. Fetch last 5 messages in chronological order
    const recentMessages = db.prepare(`
      SELECT role, content FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(conversationId).reverse();

    if (recentMessages.length === 0) {
      return { updated: false, content: previousMemory, error: 'No recent messages found' };
    }

    const conversationExcerpt = recentMessages.map((m) => {
      // Clean thinking tags or tool call dumps from excerpt
      const clean = (m.content || '')
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/<!-- tool-output:[\s\S]*?-->/gi, '')
        .trim();
      return `${m.role.toUpperCase()}: ${clean.slice(0, 1000)}`;
    }).join('\n\n');

    // 3. Formulate memory consolidation prompt
    const consolidationMessages = [
      {
        role: 'system',
        content: `You are Marnie's Memory Consolidation Engine.
Your job is to maintain the user's persistent long-term memory file (workspace/BRAIN.md).
You will be provided with:
1. The EXISTING MEMORY from BRAIN.md
2. The LAST 5 CONVERSATION MESSAGES between the user and assistant.

CRITICAL INSTRUCTIONS:
- Extract and update facts about the user: identity, preferences, technical stack, tools used, coding patterns, active projects, and specific instructions or constraints they mentioned.
- Merge the new information into the existing memory seamlessly.
- Preserve all existing accurate information while updating or refining details.
- Avoid logging trivial greetings, ephemeral banter, or temporary conversational artifacts.
- Keep the format clean, well-structured, professional Markdown.
- Output ONLY the updated raw Markdown document that will be saved to BRAIN.md. Do NOT wrap the entire output in triple backticks (\`\`\`), and do NOT include conversational preambles or explanations.`,
      },
      {
        role: 'user',
        content: `CURRENT MEMORY (workspace/BRAIN.md):
\`\`\`markdown
${previousMemory || '(Empty memory)'}
\`\`\`

LAST 5 CONVERSATION MESSAGES:
\`\`\`
${conversationExcerpt}
\`\`\`

Please generate the updated, consolidated memory document for workspace/BRAIN.md now:`,
      },
    ];

    // 4. Call Ollama model for memory consolidation
    const response = await ollama.chat({
      model: model || undefined,
      messages: consolidationMessages,
      options: {
        temperature: 0.3, // Lower temperature for factual memory synthesis
      },
    });

    let updatedContent = response.message?.content || '';

    // Strip internal thinking tags if model produced them
    updatedContent = updatedContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    // Strip accidental full-document code block fences (e.g. ```markdown ... ```)
    if (updatedContent.startsWith('```markdown')) {
      updatedContent = updatedContent.slice(11).replace(/```$/, '').trim();
    } else if (updatedContent.startsWith('```md')) {
      updatedContent = updatedContent.slice(5).replace(/```$/, '').trim();
    } else if (updatedContent.startsWith('```')) {
      updatedContent = updatedContent.slice(3).replace(/```$/, '').trim();
    }

    if (!updatedContent || updatedContent.length < 20) {
      console.warn('[brain] Model returned empty or too short memory update. Keeping previous.');
      return { updated: false, content: previousMemory, error: 'Synthesis returned empty content' };
    }

    // 5. Save updated memory to workspace/BRAIN.md
    saveBrainContent(updatedContent);

    // 6. Update last consolidated message count marker in SQLite
    const row = db.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?').get(conversationId);
    const currentCount = row ? row.count : 5;
    setSetting(`brain_last_count_${conversationId}`, currentCount);
    setSetting('brain_last_updated_at', new Date().toISOString());

    console.log(`[brain] Memory successfully updated in workspace/BRAIN.md at ${currentCount} messages.`);
    return { updated: true, content: updatedContent };
  } catch (err) {
    console.error('[brain] Memory consolidation error:', err.message);
    return { updated: false, content: getBrainContent(), error: err.message };
  }
}

// Initialize file on module load
ensureBrainFile();

module.exports = {
  BRAIN_FILE_PATH,
  ensureBrainFile,
  getBrainContent,
  saveBrainContent,
  formatBrainForSystemPrompt,
  checkMemoryTrigger,
  consolidateMemory,
};
