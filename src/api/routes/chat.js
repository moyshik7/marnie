'use strict';

const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/index');
const ollama = require('../../components/providers/ollama/interact');
const { executeTool, buildSystemPrompt, parseToolCalls, OLLAMA_TOOLS } = require('../../components/tools/registry');
const { filterEmDashes } = require('../../components/tools/emDashFilter');

function getEffectiveSystemPrompt(customSystem = '') {
  let dbSystemPrompt = '';
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'system_prompt'").get();
    if (row && row.value) dbSystemPrompt = row.value;
  } catch {}

  const merged = [dbSystemPrompt, customSystem].filter(Boolean).join('\n\n');
  return buildSystemPrompt(merged);
}

async function runToolCallsAndFormat(toolCalls) {
  let output = '';
  for (const call of toolCalls) {
    try {
      const res = await executeTool(call.name, call.arguments);
      output += `\n\n> **Executed Tool:** \`${call.name}\`\n`;
      if (res && typeof res === 'object') {
        if (call.name === 'send_alert' || call.name === 'discord_alert' || (res.sent === true && Object.keys(res).length === 1)) {
          output += `\nSuccessful\n`;
        } else if ((call.name === 'set_timer' || call.name === 'timer') && res.status) {
          output += `\n${res.status}\n`;
        } else if ((call.name === 'web_search' || call.name === 'duckduckgo_search' || call.name === 'searxng_search') && Array.isArray(res.results)) {
          if (res.results.length === 0) {
            output += `\n*No results found for "${res.query || ''}".*\n`;
          } else {
            output += `\n**Web Search Results (${res.provider || 'web'}):**\n\n`;
            for (let i = 0; i < res.results.length; i++) {
              const r = res.results[i];
              output += `${i + 1}. [${r.title || 'Untitled'}](${r.url})\n   ${r.snippet || ''}\n\n`;
            }
          }
        } else if (res.stdout !== undefined || res.stderr !== undefined) {
          if (res.stdout) output += `\`\`\`\n${res.stdout.trimEnd()}\n\`\`\`\n`;
          if (res.stderr) output += `\`\`\`stderr\n${res.stderr.trimEnd()}\n\`\`\`\n`;
          if (!res.stdout && !res.stderr) output += `*(Process finished with exit code ${res.exitCode})*\n`;
        } else {
          output += `\`\`\`json\n${JSON.stringify(res, null, 2)}\n\`\`\`\n`;
        }
      } else {
        output += `\`\`\`\n${String(res)}\n\`\`\`\n`;
      }
    } catch (err) {
      output += `\n\n> **Tool Failed (\`${call.name}\`):** ${err.message}\n`;
    }
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

      // 2. Strip fake/displayed tool execution markdown (> **Executed Tool:** ... or > 🛠️ **Executed Tool:** ...)
      const hadToolExec = />\s*(?:🛠️)?\s*\*{0,2}Executed Tool:\*{0,2}\s*`?(\w+)`?/gi.test(content);
      if (hadToolExec) {
        content = content
          .replace(/>\s*(?:🛠️)?\s*\*{0,2}Executed Tool:\*{0,2}\s*`?(\w+)`?[\s\S]*?(?:Successful|```(?:json)?[\s\S]*?```|$)/gi, '[Action: Tool "$1" executed successfully]')
          .trim();
      }

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
  const effectiveSystem = getEffectiveSystemPrompt(system);
  const messages = [{ role: 'system', content: effectiveSystem }, ...history];

  try {
    if (stream) {
      // ── Streaming ──────────────────────────────────────────────────────
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullContent = '';
      let fullThinking = '';
      const nativeToolCalls = [];

      await ollama.chatStream({
        model: model || conv.model,
        messages,
        options,
        tools: OLLAMA_TOOLS,
        onChunk: (chunk) => {
          const token = chunk.message?.content || '';
          const thinking = chunk.message?.thinking || '';
          if (thinking) {
            fullThinking += thinking;
          }
          if (token) {
            fullContent += token;
          }
          if (token || thinking) {
            res.write(`data: ${JSON.stringify({ token, thinking, done: chunk.done })}\n\n`);
          }
          if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
            nativeToolCalls.push(...chunk.message.tool_calls);
          }
        },
        onDone: async () => {
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

          const parsedCalls = parseToolCalls(fullContent);
          for (const pc of parsedCalls) {
            if (!allToolCalls.some((t) => t.name === pc.name)) {
              allToolCalls.push(pc);
            }
          }

          if (allToolCalls.length > 0) {
            const toolOutput = await runToolCallsAndFormat(allToolCalls);
            fullContent += toolOutput;
            res.write(`data: ${JSON.stringify({ token: toolOutput, done: false })}\n\n`);
          }

          // Persist assistant message in SQLite, preserving thinking if present
          const persistedContent = fullThinking
            ? `<think>\n${fullThinking.trim()}\n</think>\n\n${fullContent.trim()}`
            : fullContent;
          insertMsg(conv.id, 'assistant', persistedContent);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
        },
      });
    } else {
      // ── Non-streaming ──────────────────────────────────────────────────
      const response = await ollama.chat({
        model: model || conv.model,
        messages,
        options,
        tools: OLLAMA_TOOLS,
      });

      let assistantContent = response.message?.content || '';
      const thinkingContent = response.message?.thinking || '';
      const allToolCalls = [];

      if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
        for (const tc of response.message.tool_calls) {
          if (tc.function) {
            const args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments || '{}')
              : (tc.function.arguments || {});
            allToolCalls.push({ name: tc.function.name, arguments: args });
          }
        }
      }

      const parsedCalls = parseToolCalls(assistantContent);
      for (const pc of parsedCalls) {
        if (!allToolCalls.some((t) => t.name === pc.name)) {
          allToolCalls.push(pc);
        }
      }

      if (allToolCalls.length > 0) {
        const toolOutput = await runToolCallsAndFormat(allToolCalls);
        assistantContent += toolOutput;
      }

      const persistedContent = thinkingContent
        ? `<think>\n${thinkingContent.trim()}\n</think>\n\n${assistantContent.trim()}`
        : assistantContent;
      const saved = insertMsg(conv.id, 'assistant', persistedContent);
      res.json({
        message: parseMsg(saved),
        usage: response.eval_count ? { eval_count: response.eval_count, prompt_eval_count: response.prompt_eval_count } : undefined,
      });
    }
  } catch (err) {
    console.error('[chat] LLM error:', err.message);
    res.status(502).json({ error: 'LLM provider error', detail: err.message });
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
    : [{ role: 'system', content: getEffectiveSystemPrompt() }, ...cleanMessages];

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullContent = '';
      let fullThinking = '';
      const nativeToolCalls = [];

      await ollama.chatStream({
        model,
        messages,
        options,
        tools: OLLAMA_TOOLS,
        onChunk: (chunk) => {
          const token = chunk.message?.content || '';
          const thinking = chunk.message?.thinking || '';
          if (thinking) {
            fullThinking += thinking;
          }
          if (token) {
            fullContent += token;
          }
          if (token || thinking) {
            res.write(`data: ${JSON.stringify({ token, thinking, done: chunk.done })}\n\n`);
          }
          if (chunk.message?.tool_calls && chunk.message.tool_calls.length > 0) {
            nativeToolCalls.push(...chunk.message.tool_calls);
          }
        },
        onDone: async () => {
          const allToolCalls = [];
          for (const tc of nativeToolCalls) {
            if (tc.function) {
              const args = typeof tc.function.arguments === 'string'
                ? JSON.parse(tc.function.arguments || '{}')
                : (tc.function.arguments || {});
              allToolCalls.push({ name: tc.function.name, arguments: args });
            }
          }

          const parsedCalls = parseToolCalls(fullContent);
          for (const pc of parsedCalls) {
            if (!allToolCalls.some((t) => t.name === pc.name)) {
              allToolCalls.push(pc);
            }
          }

          if (allToolCalls.length > 0) {
            const toolOutput = await runToolCallsAndFormat(allToolCalls);
            fullContent += toolOutput;
            res.write(`data: ${JSON.stringify({ token: toolOutput, done: false })}\n\n`);
          }
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
        },
      });
    } else {
      const response = await ollama.chat({
        model,
        messages,
        options,
        tools: OLLAMA_TOOLS,
      });

      let assistantContent = response.message?.content || '';
      const thinkingContent = response.message?.thinking || '';
      const allToolCalls = [];

      if (response.message?.tool_calls && response.message.tool_calls.length > 0) {
        for (const tc of response.message.tool_calls) {
          if (tc.function) {
            const args = typeof tc.function.arguments === 'string'
              ? JSON.parse(tc.function.arguments || '{}')
              : (tc.function.arguments || {});
            allToolCalls.push({ name: tc.function.name, arguments: args });
          }
        }
      }

      const parsedCalls = parseToolCalls(assistantContent);
      for (const pc of parsedCalls) {
        if (!allToolCalls.some((t) => t.name === pc.name)) {
          allToolCalls.push(pc);
        }
      }

      if (allToolCalls.length > 0) {
        const toolOutput = await runToolCallsAndFormat(allToolCalls);
        assistantContent += toolOutput;
      }

      const finalContent = thinkingContent
        ? `<think>\n${thinkingContent.trim()}\n</think>\n\n${assistantContent.trim()}`
        : assistantContent;
      res.json({ message: { role: 'assistant', content: filterEmDashes(finalContent) }, usage: response });
    }
  } catch (err) {
    res.status(502).json({ error: 'LLM provider error', detail: err.message });
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
