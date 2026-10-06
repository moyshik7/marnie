'use strict';

const router = require('express').Router();
const axios = require('axios');
const db = require('../../db/index');
const discord = require('../../components/tools/discord');

const stmtGetAll = db.prepare('SELECT key, value, updated_at FROM settings');
const stmtGet = db.prepare('SELECT key, value, updated_at FROM settings WHERE key = ?');
const stmtUpsert = db.prepare(`
  INSERT INTO settings (key, value, updated_at)
  VALUES (@key, @value, strftime('%s','now'))
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    updated_at = strftime('%s','now')
`);

// GET /api/settings
router.get('/', (_req, res) => {
  const rows = stmtGetAll.all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  res.json({
    settings,
    updated_at: rows.length ? Math.max(...rows.map(r => r.updated_at)) : null,
  });
});

// PATCH /api/settings or POST /api/settings
const updateSettingsHandler = (req, res) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Body must be an object with key-value settings' });
  }

  const allowedKeys = [
    'ollama_base_url',
    'default_model',
    'discord_webhook_url',
    'searxng_url',
    'deep_research_enabled',
    'agent_mode_enabled',
    'system_prompt',
  ];

  const updatedKeys = [];
  const runTransaction = db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      if (allowedKeys.includes(key)) {
        stmtUpsert.run({ key, value: String(value) });
        updatedKeys.push(key);
      }
    }
  });

  runTransaction();

  // Return new merged state
  const rows = stmtGetAll.all();
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }

  res.json({ success: true, updatedKeys, settings });
};

router.patch('/', updateSettingsHandler);
router.post('/', updateSettingsHandler);

// POST /api/settings/test-ollama
router.post('/test-ollama', async (req, res) => {
  let url = req.body.url;
  if (!url) {
    const row = stmtGet.get('ollama_base_url');
    url = (row && row.value) || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }
  // Trim trailing slash
  url = url.replace(/\/+$/, '');

  try {
    const response = await axios.get(`${url}/api/tags`, { timeout: 5000 });
    const models = (response.data.models || []).map((m) => m.name);
    res.json({ ok: true, url, models, message: `Connected to Ollama! Found ${models.length} model(s).` });
  } catch (err) {
    res.status(502).json({
      ok: false,
      url,
      error: `Could not connect to Ollama at ${url}: ${err.message}`,
    });
  }
});

// POST /api/settings/test-discord
router.post('/test-discord', async (req, res) => {
  const webhookUrl = req.body.webhookUrl;
  try {
    await discord.sendNotification({
      webhookUrl,
      title: 'Marnie Test Notification',
      body: 'Your Discord webhook has been successfully configured and verified in Marnie AI Workspace!',
      level: 'success',
      username: 'Marnie System',
    });
    res.json({ ok: true, message: 'Test alert sent successfully to Discord!' });
  } catch (err) {
    res.status(err.status || 500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
