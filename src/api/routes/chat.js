'use strict';

const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/index');
const ollama = require('../../components/providers/ollama/interact');

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
  stmtMsgInsert.run({
    id,
    conversation_id: convId,
    role,
    content,
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

  // Build message history for LLM
  const history = stmtMsgList.all(conv.id).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Prepend system prompt if provided
  const messages = system
    ? [{ role: 'system', content: system }, ...history]
    : history;

  try {
    if (stream) {
      // ── Streaming ──────────────────────────────────────────────────────
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullContent = '';

      await ollama.chatStream({
        model: model || conv.model,
        messages,
        options,
        onChunk: (chunk) => {
          const token = chunk.message?.content || '';
          fullContent += token;
          res.write(`data: ${JSON.stringify({ token, done: chunk.done })}\n\n`);
        },
        onDone: () => {
          // persist assistant message after stream ends
          insertMsg(conv.id, 'assistant', fullContent);
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
          res.end();
        },
      });
    } else {
      // ── Non-streaming ──────────────────────────────────────────────────
      const response = await ollama.chat({ model: model || conv.model, messages, options });
      const assistantContent = response.message?.content || '';
      const saved = insertMsg(conv.id, 'assistant', assistantContent);
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
  const { messages, model, options = {}, stream = false } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '`messages` (array) is required' });
  }

  try {
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      await ollama.chatStream({
        model,
        messages,
        options,
        onChunk: (chunk) => {
          res.write(`data: ${JSON.stringify({ token: chunk.message?.content || '', done: chunk.done })}\n\n`);
        },
        onDone: () => { res.end(); },
      });
    } else {
      const response = await ollama.chat({ model, messages, options });
      res.json({ message: response.message, usage: response });
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
