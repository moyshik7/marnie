'use strict';

const router = require('express').Router();
const brain = require('../../components/tools/brainMemory');
const db = require('../../db/index');

/**
 * GET /api/brain
 * Fetch current BRAIN.md content and memory status
 */
router.get('/', (req, res) => {
  try {
    const content = brain.getBrainContent();
    const lastUpdatedRow = db.prepare("SELECT value FROM settings WHERE key = 'brain_last_updated_at'").get();
    const enabledRow = db.prepare("SELECT value FROM settings WHERE key = 'brain_enabled'").get();

    res.json({
      content,
      filePath: 'workspace/BRAIN.md',
      lastUpdated: lastUpdatedRow?.value || null,
      enabled: enabledRow ? enabledRow.value !== 'false' : true,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/brain
 * Manually update BRAIN.md content
 */
router.put('/', (req, res) => {
  const { content } = req.body;
  if (content === undefined || content === null) {
    return res.status(400).json({ error: '`content` string is required' });
  }

  try {
    const ok = brain.saveBrainContent(content);
    if (!ok) throw new Error('Failed to save BRAIN.md');

    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('brain_last_updated_at', ?, strftime('%s','now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%s','now')
    `).run(new Date().toISOString());

    res.json({ success: true, content, lastUpdated: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/brain/consolidate
 * Manually trigger memory consolidation for a conversation
 */
router.post('/consolidate', async (req, res) => {
  const { conversationId, model } = req.body;

  let targetConvId = conversationId;
  if (!targetConvId) {
    // Pick the most recently active conversation
    const latest = db.prepare('SELECT id FROM conversations ORDER BY updated_at DESC LIMIT 1').get();
    if (latest) targetConvId = latest.id;
  }

  if (!targetConvId) {
    return res.status(400).json({ error: 'No conversation available to consolidate' });
  }

  try {
    const result = await brain.consolidateMemory({ conversationId: targetConvId, model });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/brain/settings
 * Toggle brain memory enabled/disabled
 */
router.patch('/settings', (req, res) => {
  const { enabled } = req.body;
  if (enabled === undefined) return res.status(400).json({ error: '`enabled` boolean required' });

  try {
    db.prepare(`
      INSERT INTO settings (key, value, updated_at)
      VALUES ('brain_enabled', ?, strftime('%s','now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%s','now')
    `).run(String(enabled));

    res.json({ success: true, enabled: Boolean(enabled) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
