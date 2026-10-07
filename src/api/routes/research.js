'use strict';

const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/index');
const engine = require('../../components/tools/deepResearchEngine');

/**
 * GET /api/research
 * List all deep research runs.
 */
router.get('/', (_req, res) => {
  try {
    const list = engine.listResearches();
    res.json({ researches: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/research/status/ongoing
 * Check if there is currently any ongoing research (for blinking indicator).
 */
router.get('/status/ongoing', (_req, res) => {
  try {
    const ongoing = engine.hasOngoingResearch();
    res.json({ ongoing });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/research/:id
 * Retrieve details of a specific research run.
 */
router.get('/:id', (req, res) => {
  try {
    const item = engine.getResearch(req.params.id);
    if (!item) return res.status(404).json({ error: 'Research not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/research
 * Create and launch a new deep research session.
 * Body: { topic, model?, minRevisions?, maxRevisions?, maxResults? }
 */
router.post('/', async (req, res) => {
  const {
    topic,
    model,
    minRevisions = 1,
    maxRevisions = 3,
    maxResults = 5,
  } = req.body;

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: '`topic` (string) is required' });
  }

  const id = uuidv4();
  let resolvedModel = model;
  if (!resolvedModel) {
    try {
      const setting = db.prepare("SELECT value FROM settings WHERE key = 'default_model'").get();
      if (setting?.value) resolvedModel = setting.value;
    } catch {}
  }
  resolvedModel = resolvedModel || 'llama3.2';

  const minRev = Math.max(1, parseInt(minRevisions, 10) || 1);
  const maxRev = Math.max(minRev, parseInt(maxRevisions, 10) || 3);
  const maxRes = Math.max(1, parseInt(maxResults, 10) || 5);

  try {
    db.prepare(`
      INSERT INTO deep_researches (
        id, topic, status, model, min_revisions, max_revisions, max_results, summary, report, logs, sources
      ) VALUES (
        @id, @topic, 'in_progress', @model, @min_revisions, @max_revisions, @max_results, '', '', '[]', '[]'
      )
    `).run({
      id,
      topic: topic.trim(),
      model: resolvedModel,
      min_revisions: minRev,
      max_revisions: maxRev,
      max_results: maxRes,
    });

    // Start background research pipeline asynchronously
    setImmediate(() => {
      engine.startResearchPipeline(id);
    });

    const item = engine.getResearch(id);
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/research/:id/cancel
 * Cancel an ongoing research run.
 */
router.post('/:id/cancel', (req, res) => {
  try {
    const item = engine.cancelResearch(req.params.id);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/research/:id
 * Delete a research record.
 */
router.delete('/:id', (req, res) => {
  try {
    engine.cancelResearch(req.params.id);
    db.prepare('DELETE FROM deep_researches WHERE id = ?').run(req.params.id);
    res.json({ deleted: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
