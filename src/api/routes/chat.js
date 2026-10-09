'use strict';

const router = require('express').Router();
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/index');
const ollama = require('../../components/providers/ollama/interact');
const { executeTool, buildSystemPrompt, parseToolCalls, OLLAMA_TOOLS } = require('../../components/tools/registry');
const { filterEmDashes } = require('../../components/tools/emDashFilter');
const brain = require('../../components/tools/brainMemory');

function getEffectiveSystemPrompt(customSystem = '', options = {}) {
  let dbSystemPrompt = '';
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'system_prompt'").get();
    if (row && row.value) dbSystemPrompt = row.value;
  } catch {}

  // Brain persistent memory context (workspace/BRAIN.md) injected by default unless explicitly disabled
  let brainContext = '';
  if (!options.skipBrain && !options.noBrain) {
    try {
      const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'brain_enabled'").get();
      const isBrainEnabled = !enabledRow || enabledRow.value !== 'false';
      if (isBrainEnabled) {
        brainContext = brain.formatBrainForSystemPrompt();
      }
    } catch (err) {
      console.warn('[brain] Failed to load brain context:', err.message);
    }
  }

  const merged = [dbSystemPrompt, customSystem, brainContext].filter(Boolean).join('\n\n');
  return buildSystemPrompt(merged);
}

async function runToolCallsAndFormat(toolCalls) {
  let output = '';
  for (const call of toolCalls) {
    let callOutput = '';
    try {
      const res = await executeTool(call.name, call.arguments);
      callOutput += `\n> **Executed Tool:** \`${call.name}\`\n`;
      if (res && typeof res === 'object') {
        if (call.name === 'create_file' || call.name === 'write_file' || call.name === 'file_create' || call.name === 'file_write') {
          const action = (call.name === 'create_file' || call.name === 'file_create') ? 'created' : 'edited';
          const relPath = (res.relativePath || (res.path ? path.basename(res.path) : (call.arguments?.filePath || 'file'))).replace(/\\/g, '/');
          const fileName = res.name || path.basename(relPath);
          const linesText = res.totalLines !== undefined ? ` (${res.totalLines} lines)` : '';
          callOutput += `\n<!-- file-artifact:{"path":"${relPath.replace(/"/g, '\\"')}","name":"${fileName.replace(/"/g, '\\"')}","action":"${action}"} -->\n`;
          callOutput += `\n**File ${action === 'created' ? 'Created' : 'Updated'}:** \`${relPath}\`${linesText}\n`;
        } else if (call.name === 'send_alert' || call.name === 'discord_alert' || (res.sent === true && Object.keys(res).length === 1)) {
          callOutput += `\nSuccessful\n`;
        } else if ((call.name === 'set_timer' || call.name === 'timer') && res.status) {
          callOutput += `\n${res.status}\n`;
        } else if ((call.name === 'web_search' || call.name === 'duckduckgo_search' || call.name === 'searxng_search') && Array.isArray(res.results)) {
          if (res.results.length === 0) {
            callOutput += `\n*No results found for "${res.query || ''}".*\n`;
          } else {
            callOutput += `\n**Web Search Results (${res.provider || 'web'}):**\n\n`;
            for (let i = 0; i < res.results.length; i++) {
              const r = res.results[i];
              callOutput += `${i + 1}. [${r.title || 'Untitled'}](${r.url})\n   ${r.snippet || ''}\n`;
              if (r.content) {
                callOutput += `   > **Page Content Excerpt:** ${r.content.replace(/\n+/g, ' ')}\n`;
              }
              callOutput += '\n';
            }
          }
        } else if ((call.name === 'fetch_webpage' || call.name === 'scrape_webpage') && res.url) {
          callOutput += `\n**Scraped Webpage Content (${res.url}):**\n\n${res.content}\n\n`;
        } else if ((call.name === 'api_call' || call.name === 'http_request' || call.name === 'api') && res.status !== undefined) {
          callOutput += `\n**HTTP Status:** \`${res.status} ${res.statusText || ''}\` (Duration: ${res.durationMs}ms)\n`;
          if (res.data !== undefined && res.data !== null) {
            const dataStr = typeof res.data === 'object' ? JSON.stringify(res.data, null, 2) : String(res.data);
            const truncated = dataStr.length > 3500 ? dataStr.slice(0, 3500) + '\n... (truncated)' : dataStr;
            callOutput += `\`\`\`json\n${truncated}\n\`\`\`\n`;
          }
        } else if (call.name === 'read_brain_memory' || call.name === 'read_brain' || call.name === 'read_memory') {
          callOutput += `\n**Persistent Brain Memory (workspace/BRAIN.md):**\n\n${res.content || '(Empty)'}\n`;
        } else if (call.name === 'update_brain_memory' || call.name === 'update_brain' || call.name === 'save_brain') {
          callOutput += `\n<!-- file-artifact:{"path":"BRAIN.md","name":"BRAIN.md","action":"edited"} -->\n`;
          callOutput += `\n**Persistent Memory Updated:** \`workspace/BRAIN.md\`\n`;
        } else if (call.name === 'fetch_notes' || call.name === 'get_notes' || call.name === 'read_notes' || call.name === 'notes') {
          callOutput += `\n**AI Notes & Tasks (workspace/NOTES.md):**\n\n${res.content || '(Empty notes)'}\n`;
        } else if (call.name === 'update_notes' || call.name === 'edit_notes' || call.name === 'notes_edit' || call.name === 'add_note' || call.name === 'add_notes' || call.name === 'save_notes' || call.name === 'append_notes' || call.name === 'write_notes') {
          callOutput += `\n<!-- file-artifact:{"path":"NOTES.md","name":"NOTES.md","action":"edited"} -->\n`;
          callOutput += `\n**AI Notes Updated:** \`workspace/NOTES.md\`\n`;
        } else if (res.stdout !== undefined || res.stderr !== undefined) {
          if (res.stdout) callOutput += `\`\`\`\n${res.stdout.trimEnd()}\n\`\`\`\n`;
          if (res.stderr) callOutput += `\`\`\`stderr\n${res.stderr.trimEnd()}\n\`\`\`\n`;
          if (!res.stdout && !res.stderr) callOutput += `*(Process finished with exit code ${res.exitCode})*\n`;
        } else {
          callOutput += `\`\`\`json\n${JSON.stringify(res, null, 2)}\n\`\`\`\n`;
        }
      } else {
        callOutput += `\`\`\`\n${String(res)}\n\`\`\`\n`;
      }
    } catch (err) {
      callOutput += `\n> **Tool Failed (\`${call.name}\`):** ${err.message}\n`;
    }
    output += `\n\n<!-- tool-output:${call.name} -->${callOutput}<!-- /tool-output -->\n`;
  }
  return output;
}

// --- DB helpers -----------------------------------------------------------
const stmtConvCreate  = db.prepare(`
  INSERT INTO conversations (id, title, model, provider)
  VALUES (@id, @title, @model, @provider)
`);
const stmtConvGet     = db.prepare('SELECT * FROM conversations WHERE id = ?');
const stmtConvList    = db.prepare('SELECT * FROM conversations ORDER BY updated_at DESC');
const stmtConvDelete  = db.prepare('DELETE FROM conversations WHERE id = ?');
const stmtConvUpdate  = db.prepare(`
  UPDATE conversations SET title=@title, model=@model, updated_at=strftime('%s','now') WHERE id=@id
`);

const stmtMsgInsert   = db.prepare(`
  INSERT INTO messages (id, conversation_id, role, content, tool_calls, tool_call_id)
  VALUES (@id, @conversation_id, @role, @content, @tool_calls, @tool_call_id)
`);
const stmtMsgList     = db.prepare('SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at');
const stmtMsgGet      = db.prepare('SELECT * FROM messages WHERE id=?');

function touchConv(id) {
  db.prepare("UPDATE conversations SET updated_at=strftime('%s','now') WHERE id=?").run(id);
}

function insertMsg(convId, role, content, toolCalls = null, toolCallId = null) {
  const id = uuidv4();
  const filteredContent = role === 'assistant' && typeof content === 'string'
    ? filterEmDashes(content)
    : content;
  stmtMsgInsert.run({
    id,
    conversation_id: convId,
    role,
    content: filteredContent,
    tool_calls: toolCalls ? JSON.stringify(toolCalls) : null,
    tool_call_id: toolCallId,
  });
  touchConv(convId);
  return stmtMsgGet.get(id);
}

// ═══════════════════════════════════════════════════════════════════════════
// Conversations CRUD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/chat/conversations
 * List all conversations.
 */
router.get('/conversations', (_req, res) => {
  res.json(stmtConvList.all());
});

/**
 * POST /api/chat/conversations
 * Create a new conversation.
 * Body: { title?, model?, provider? }
 */
router.post('/conversations', async (req, res) => {
  const id = uuidv4();
  let { title = 'New conversation', model, provider = 'ollama' } = req.body;
  if (!model) {
    try {
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'default_model'").get();
      if (setting && setting.value) model = setting.value;
    } catch {}
  }
  if (!model) {
    try {
      const models = await ollama.listModels();
      if (models.length > 0) model = models[0];
    } catch {}
  }
  model = model || process.env.DEFAULT_MODEL || 'llama3.2';
  stmtConvCreate.run({ id, title, model, provider });
  res.status(201).json(stmtConvGet.get(id));
});

/**
 * GET /api/chat/conversations/:id
 */
router.get('/conversations/:id', (req, res) => {
  const conv = stmtConvGet.get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const messages = stmtMsgList.all(conv.id).map(parseMsg);
  res.json({ ...conv, messages });
});

/**
 * PATCH /api/chat/conversations/:id
 * Update title or model.
 */
router.patch('/conversations/:id', (req, res) => {
  const conv = stmtConvGet.get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const title = req.body.title !== undefined ? req.body.title : conv.title;
  const model = req.body.model !== undefined ? req.body.model : conv.model;
  stmtConvUpdate.run({ id: conv.id, title, model });
  res.json(stmtConvGet.get(conv.id));
});

/**
 * DELETE /api/chat/conversations/:id
 */
router.delete('/conversations/:id', (req, res) => {
  const conv = stmtConvGet.get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  stmtConvDelete.run(req.params.id);
  res.json({ deleted: req.params.id });
});

/**
 * POST /api/chat/conversations/:id/fork
 * Fork current conversation up to an optional message ID into a new independent thread.
 * Body: { upToMessageId?, title? }
 */
router.post('/conversations/:id/fork', (req, res) => {
  const sourceConv = stmtConvGet.get(req.params.id);
  if (!sourceConv) return res.status(404).json({ error: 'Source conversation not found' });

  const { upToMessageId, title } = req.body;
  const newConvId = uuidv4();
  const forkTitle = title || `Fork of ${sourceConv.title}`;

  stmtConvCreate.run({
    id: newConvId,
    title: forkTitle,
    model: sourceConv.model,
    provider: sourceConv.provider || 'ollama',
  });

  const sourceMsgs = stmtMsgList.all(sourceConv.id);
  let msgsToCopy = sourceMsgs;
  if (upToMessageId) {
    const targetIdx = sourceMsgs.findIndex((m) => m.id === upToMessageId);
    if (targetIdx !== -1) {
      msgsToCopy = sourceMsgs.slice(0, targetIdx + 1);
    }
  }

  const insertForkMsg = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, tool_calls, tool_call_id, created_at)
    VALUES (@id, @conversation_id, @role, @content, @tool_calls, @tool_call_id, @created_at)
  `);

  const tx = db.transaction(() => {
    for (const msg of msgsToCopy) {
      insertForkMsg.run({
        id: uuidv4(),
        conversation_id: newConvId,
        role: msg.role,
        content: msg.content,
        tool_calls: msg.tool_calls,
        tool_call_id: msg.tool_call_id,
        created_at: msg.created_at,
      });
    }
  });
  tx();

  const createdConv = stmtConvGet.get(newConvId);
  const messages = stmtMsgList.all(newConvId).map(parseMsg);
  res.status(201).json({ ...createdConv, messages });
});

/**
 * POST /api/chat/conversations/:id/compact
 * Summarize conversation history so far to free context window while preserving critical points.
 * Replaces older history in SQLite with a consolidated summary system/assistant note.
 */
router.post('/conversations/:id/compact', async (req, res) => {
  const conv = stmtConvGet.get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const msgs = stmtMsgList.all(conv.id);
  if (msgs.length <= 1) {
    return res.json({
      success: true,
      compacted: false,
      message: 'Conversation is too short to compact.',
      conversation: { ...conv, messages: msgs.map(parseMsg) },
    });
  }

  // Build condensed transcript of past messages
  const transcriptLines = msgs.map((m) => {
    let text = (m.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    if (text.length > 500) text = text.slice(0, 500) + '...';
    return `${m.role.toUpperCase()}: ${text}`;
  }).join('\n\n');

  let summary = '';
  try {
    const summaryPrompt = [
      {
        role: 'system',
        content: 'You are an expert conversation summarizer and state compressor. Condense the previous conversation into a structured summary that captures all important facts, user requirements, decisions made, code files modified, and current progress. Be clear, concise, and structured.',
      },
      {
        role: 'user',
        content: `Please condense and compact the following conversation transcript while preserving all critical context, project state, and user constraints:\n\n${transcriptLines}`,
      },
    ];

    const modelToUse = conv.model || process.env.DEFAULT_MODEL || 'llama3.2';
    const llmRes = await ollama.chat({
      model: modelToUse,
      messages: summaryPrompt,
    });
    summary = (llmRes.message?.content || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  } catch (err) {
    console.warn('[compact] LLM summarization fallback to manual outline:', err.message);
  }

  if (!summary) {
    summary = `### Previous Conversation Summary (Compacted)\n\nKey context from previous messages (${msgs.length} messages) compacted on ${new Date().toISOString()}.\n\n` +
      msgs.slice(0, 4).map(m => `- **${m.role}**: ${(m.content || '').slice(0, 160).replace(/\n/g, ' ')}`).join('\n');
  }

  const compactedMessageContent = `<!-- compacted-context -->\n### Compacted Conversation Summary\n${summary}\n\n*(Earlier conversation history was compacted to free up the context window while preserving critical context.)*`;

  // Retain the very last user/assistant message if relevant, replace the rest with the summary
  const lastMsg = msgs[msgs.length - 1];
  const deleteStmt = db.prepare('DELETE FROM messages WHERE conversation_id = ?');

  const tx = db.transaction(() => {
    deleteStmt.run(conv.id);
    // Insert summary as first message
    insertMsg(conv.id, 'assistant', compactedMessageContent);
    // If the last message was a user message, keep it so it is not lost
    if (lastMsg && lastMsg.role === 'user') {
      insertMsg(conv.id, 'user', lastMsg.content);
    }
  });
  tx();

  const updatedMsgs = stmtMsgList.all(conv.id).map(parseMsg);
  res.json({
    success: true,
    compacted: true,
    summary,
    conversation: { ...stmtConvGet.get(conv.id), messages: updatedMsgs },
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Messages
// ═══════════════════════════════════════════════════════════════════════════

function parseMsg(m) {
  return {
    ...m,
    tool_calls: m.tool_calls ? JSON.parse(m.tool_calls) : null,
  };
}

/**
 * GET /api/chat/conversations/:id/messages
 */
router.get('/conversations/:id/messages', (req, res) => {
  const conv = stmtConvGet.get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  res.json(stmtMsgList.all(conv.id).map(parseMsg));
});

// ═══════════════════════════════════════════════════════════════════════════
// Chat Completion
// ═══════════════════════════════════════════════════════════════════════════

function sanitizeHistoryForLLM(rawMessages) {
  return rawMessages.map((m) => {
    let content = m.content || '';
    if (m.role === 'assistant') {
      // 1. Strip internal <think>...</think> blocks from previous turns so they don't pollute subsequent generation
      content = content.replace(/<think>[\s\S]*?<\/think>\s*/gi, '').trim();

      // 2. Strip comment-delimited tool outputs while preserving subsequent assistant answers
      content = content.replace(/<!-- file-artifact:[\s\S]*?-->/gi, '');
      content = content.replace(/<!-- tool-output:?(\w*) -->[\s\S]*?<!-- \/tool-output -->/gi, (_m, name) => {
        return `\n[Action: Tool "${name || 'tool'}" executed successfully]\n`;
      });

      // 3. Strip legacy tool execution markdown without wiping out subsequent response text
      const legacyToolRegex = />\s*(?:🛠️)?\s*\*{0,2}Executed Tool:\*{0,2}\s*`?(\w+)`?[\s\S]*?(?:Successful|\*No results found[^\n]*\*|(?:\*\*Web Search Results[^\n]*\*\*[\s\S]*?(?=\n\n(?!\d+\.)[^\n]|\n\n\n|$))|```(?:json|stderr)?[\s\S]*?```)/gi;
      content = content.replace(legacyToolRegex, '[Action: Tool "$1" executed successfully]').trim();

      if (!content || content.startsWith('[Action: Tool')) {
        content = content || '[System: Tool execution completed successfully.]';
      }
    }
    return {
      role: m.role,
      content,
    };
  });
}

/**
 * POST /api/chat/conversations/:id/complete
 * Send a user message and get an AI response.
 * Body: { message, system?, model?, options?, stream? }
 */
router.post('/conversations/:id/complete', async (req, res) => {
  const conv = stmtConvGet.get(req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const { message, system, model, options = {}, stream = false } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: '`message` (string) is required' });
  }

  // If a model is explicitly passed and differs, persist it
  if (model && model !== conv.model) {
    db.prepare('UPDATE conversations SET model = ?, updated_at = strftime("%s","now") WHERE id = ?').run(model, conv.id);
  }

  // Persist user message
  insertMsg(conv.id, 'user', message);

  // Build sanitized message history for LLM
  const rawHistory = stmtMsgList.all(conv.id);
  const history = sanitizeHistoryForLLM(rawHistory);

  // Prepend comprehensive workspace system prompt
  const effectiveSystem = getEffectiveSystemPrompt(system, options);
  const messages = [{ role: 'system', content: effectiveSystem }, ...history];

  try {
    if (stream) {
      // ── Streaming ──────────────────────────────────────────────────────
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullContent = '';
      let fullThinking = '';
      let currentMessages = [...messages];
      const maxTurns = 5;
      let turn = 0;

      while (turn < maxTurns) {
        turn++;
        if (res.writableEnded || res.destroyed) break;

        let turnContent = '';
        let turnThinking = '';
        const nativeToolCalls = [];

        await ollama.chatStream({
          model: model || conv.model,
          messages: currentMessages,
          options,
          tools: OLLAMA_TOOLS,
          onChunk: (chunk) => {
            const token = chunk.message?.content || '';
            const thinking = chunk.message?.thinking || '';
            if (thinking) {
              turnThinking += thinking;
              fullThinking += thinking;
            }
            if (token) {
              turnContent += token;
              fullContent += token;
            }
            if (token || thinking) {
              res.write(`data: ${JSON.stringify({ token, thinking, done: false })}\n\n`);
            }
            if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
              nativeToolCalls.push(...chunk.message.tool_calls);
            }
          },
        });

        // Combine native tool calls and parsed text tool calls
        const allToolCalls = [];
        for (const tc of nativeToolCalls) {
          if (tc.function) {
            const args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments || '{}')
              : (tc.function.arguments || {});
            allToolCalls.push({ name: tc.function.name, arguments: args });
          }
        }

        const parsedCalls = parseToolCalls(turnContent);
        for (const pc of parsedCalls) {
          if (!allToolCalls.some((t) => t.name === pc.name)) {
            allToolCalls.push(pc);
          }
        }

        // If no tool calls in this turn, the assistant completed its generation
        if (allToolCalls.length === 0) {
          break;
        }

        // Run tool calls and stream output to client
        const toolOutput = await runToolCallsAndFormat(allToolCalls);
        fullContent += toolOutput;
        res.write(`data: ${JSON.stringify({ token: toolOutput, done: false })}\n\n`);

        // Prepare context for next turn to let LLM formulate final answer using search results
        if (nativeToolCalls.length > 0) {
          currentMessages.push({
            role: 'assistant',
            content: turnContent,
            tool_calls: nativeToolCalls,
          });
          currentMessages.push({
            role: 'tool',
            content: toolOutput,
          });
        } else {
          currentMessages.push({
            role: 'assistant',
            content: turnContent,
          });
          currentMessages.push({
            role: 'user',
            content: `[Tool Execution Result]:\n${toolOutput}\n\nPlease use the above tool results to synthesize and complete your response for the user.`,
          });
        }
      }

      // Persist assistant message in SQLite, preserving thinking if present
      const persistedContent = fullThinking
        ? `<think>\n${fullThinking.trim()}\n</think>\n\n${fullContent.trim()}`
        : fullContent.trim();
      insertMsg(conv.id, 'assistant', persistedContent);

      // Background auto-consolidation of BRAIN.md memory if 5-message trigger reached
      try {
        const trigger = brain.checkMemoryTrigger(conv.id);
        if (trigger.shouldConsolidate) {
          brain.consolidateMemory({ conversationId: conv.id, model: conv.model }).catch((err) => {
            console.warn('[brain] Background consolidation error:', err.message);
          });
        }
      } catch (err) {
        console.warn('[brain] Memory trigger check error:', err.message);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } else {
      // ── Non-streaming ──────────────────────────────────────────────────
      let assistantContent = '';
      let thinkingContent = '';
      let currentMessages = [...messages];
      let lastUsage = undefined;
      const maxTurns = 5;
      let turn = 0;

      while (turn < maxTurns) {
        turn++;
        const response = await ollama.chat({
          model: model || conv.model,
          messages: currentMessages,
          options,
          tools: OLLAMA_TOOLS,
        });

        if (response.eval_count) {
          lastUsage = { eval_count: response.eval_count, prompt_eval_count: response.prompt_eval_count };
        }

        const turnContent = response.message?.content || '';
        const turnThinking = response.message?.thinking || '';
        if (turnThinking) thinkingContent += (thinkingContent ? '\n' : '') + turnThinking;
        assistantContent += turnContent;

        const nativeToolCalls = [];
        if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
          nativeToolCalls.push(...response.message.tool_calls);
        }

        const allToolCalls = [];
        for (const tc of nativeToolCalls) {
          if (tc.function) {
            const args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments || '{}')
              : (tc.function.arguments || {});
            allToolCalls.push({ name: tc.function.name, arguments: args });
          }
        }

        const parsedCalls = parseToolCalls(turnContent);
        for (const pc of parsedCalls) {
          if (!allToolCalls.some((t) => t.name === pc.name)) {
            allToolCalls.push(pc);
          }
        }

        if (allToolCalls.length === 0) {
          break;
        }

        const toolOutput = await runToolCallsAndFormat(allToolCalls);
        assistantContent += toolOutput;

        if (nativeToolCalls.length > 0) {
          currentMessages.push({
            role: 'assistant',
            content: turnContent,
            tool_calls: nativeToolCalls,
          });
          currentMessages.push({
            role: 'tool',
            content: toolOutput,
          });
        } else {
          currentMessages.push({
            role: 'assistant',
            content: turnContent,
          });
          currentMessages.push({
            role: 'user',
            content: `[Tool Execution Result]:\n${toolOutput}\n\nPlease use the above tool results to synthesize and complete your response for the user.`,
          });
        }
      }

      const persistedContent = thinkingContent
        ? `<think>\n${thinkingContent.trim()}\n</think>\n\n${assistantContent.trim()}`
        : assistantContent.trim();
      const saved = insertMsg(conv.id, 'assistant', persistedContent);

      // Background auto-consolidation of BRAIN.md memory if 5-message trigger reached
      try {
        const trigger = brain.checkMemoryTrigger(conv.id);
        if (trigger.shouldConsolidate) {
          brain.consolidateMemory({ conversationId: conv.id, model: conv.model }).catch((err) => {
            console.warn('[brain] Background consolidation error:', err.message);
          });
        }
      } catch (err) {
        console.warn('[brain] Memory trigger check error:', err.message);
      }

      res.json({
        message: parseMsg(saved),
        usage: lastUsage,
      });
    }
  } catch (err) {
    console.error('[chat] LLM error:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'LLM provider error', detail: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ token: `\n\n⚠️ Provider Error: ${err.message}`, done: true })}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/chat/complete
 * Stateless single-turn completion (no conversation stored).
 * Body: { messages, model?, options?, stream? }
 */
router.post('/complete', async (req, res) => {
  const { messages: rawMessages, model, options = {}, stream = false } = req.body;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return res.status(400).json({ error: '`messages` (array) is required' });
  }

  // Inject system prompt if not present
  const hasSystem = rawMessages.some((m) => m.role === 'system');
  const cleanMessages = sanitizeHistoryForLLM(rawMessages);
  const messages = hasSystem
    ? cleanMessages
    : [{ role: 'system', content: getEffectiveSystemPrompt('', options) }, ...cleanMessages];

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullContent = '';
      let fullThinking = '';
      let currentMessages = [...messages];
      const maxTurns = 5;
      let turn = 0;

      while (turn < maxTurns) {
        turn++;
        if (res.writableEnded || res.destroyed) break;

        let turnContent = '';
        let turnThinking = '';
        const nativeToolCalls = [];

        await ollama.chatStream({
          model,
          messages: currentMessages,
          options,
          tools: OLLAMA_TOOLS,
          onChunk: (chunk) => {
            const token = chunk.message?.content || '';
            const thinking = chunk.message?.thinking || '';
            if (thinking) {
              turnThinking += thinking;
              fullThinking += thinking;
            }
            if (token) {
              turnContent += token;
              fullContent += token;
            }
            if (token || thinking) {
              res.write(`data: ${JSON.stringify({ token, thinking, done: false })}\n\n`);
            }
            if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
              nativeToolCalls.push(...chunk.message.tool_calls);
            }
          },
        });

        const allToolCalls = [];
        for (const tc of nativeToolCalls) {
          if (tc.function) {
            const args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments || '{}')
              : (tc.function.arguments || {});
            allToolCalls.push({ name: tc.function.name, arguments: args });
          }
        }

        const parsedCalls = parseToolCalls(turnContent);
        for (const pc of parsedCalls) {
          if (!allToolCalls.some((t) => t.name === pc.name)) {
            allToolCalls.push(pc);
          }
        }

        if (allToolCalls.length === 0) {
          break;
        }

        const toolOutput = await runToolCallsAndFormat(allToolCalls);
        fullContent += toolOutput;
        res.write(`data: ${JSON.stringify({ token: toolOutput, done: false })}\n\n`);

        if (nativeToolCalls.length > 0) {
          currentMessages.push({
            role: 'assistant',
            content: turnContent,
            tool_calls: nativeToolCalls,
          });
          currentMessages.push({
            role: 'tool',
            content: toolOutput,
          });
        } else {
          currentMessages.push({
            role: 'assistant',
            content: turnContent,
          });
          currentMessages.push({
            role: 'user',
            content: `[Tool Execution Result]:\n${toolOutput}\n\nPlease use the above tool results to synthesize and complete your response for the user.`,
          });
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } else {
      let assistantContent = '';
      let thinkingContent = '';
      let currentMessages = [...messages];
      let lastUsage = undefined;
      const maxTurns = 5;
      let turn = 0;

      while (turn < maxTurns) {
        turn++;
        const response = await ollama.chat({
          model,
          messages: currentMessages,
          options,
          tools: OLLAMA_TOOLS,
        });

        if (response.eval_count) {
          lastUsage = response;
        }

        const turnContent = response.message?.content || '';
        const turnThinking = response.message?.thinking || '';
        if (turnThinking) thinkingContent += (thinkingContent ? '\n' : '') + turnThinking;
        assistantContent += turnContent;

        const nativeToolCalls = [];
        if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
          nativeToolCalls.push(...response.message.tool_calls);
        }

        const allToolCalls = [];
        for (const tc of nativeToolCalls) {
          if (tc.function) {
            const args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments || '{}')
              : (tc.function.arguments || {});
            allToolCalls.push({ name: tc.function.name, arguments: args });
          }
        }

        const parsedCalls = parseToolCalls(turnContent);
        for (const pc of parsedCalls) {
          if (!allToolCalls.some((t) => t.name === pc.name)) {
            allToolCalls.push(pc);
          }
        }

        if (allToolCalls.length === 0) {
          break;
        }

        const toolOutput = await runToolCallsAndFormat(allToolCalls);
        assistantContent += toolOutput;

        if (nativeToolCalls.length > 0) {
          currentMessages.push({
            role: 'assistant',
            content: turnContent,
            tool_calls: nativeToolCalls,
          });
          currentMessages.push({
            role: 'tool',
            content: toolOutput,
          });
        } else {
          currentMessages.push({
            role: 'assistant',
            content: turnContent,
          });
          currentMessages.push({
            role: 'user',
            content: `[Tool Execution Result]:\n${toolOutput}\n\nPlease use the above tool results to synthesize and complete your response for the user.`,
          });
        }
      }

      const finalContent = thinkingContent
        ? `<think>\n${thinkingContent.trim()}\n</think>\n\n${assistantContent.trim()}`
        : assistantContent.trim();
      res.json({ message: { role: 'assistant', content: filterEmDashes(finalContent) }, usage: lastUsage });
    }
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({ error: 'LLM provider error', detail: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ token: `\n\n⚠️ Provider Error: ${err.message}`, done: true })}\n\n`);
      res.end();
    }
  }
});

/**
 * GET /api/chat/models
 * List models available from the configured Ollama instance.
 */
router.get('/models', async (_req, res) => {
  try {
    const models = await ollama.listModels();
    res.json({ models });
  } catch (err) {
    res.status(502).json({ error: 'Could not reach Ollama', detail: err.message });
  }
});

module.exports = router;
