'use strict';

const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/index');
const engine = require('../../components/tools/deepResearchEngine');
const reportStorage = require('../../components/tools/reportStorage');

/**
 * GET /api/research
 * List all deep research runs.
 */
router.get('/', (_req, res) => {
  try {
    const dbList = engine.listResearches();
    const existingSlugs = new Set();
    const list = dbList.map((r) => {
      let resolvedSlug = r.slug || (r.error && r.error.endsWith('.md') ? r.error : null);
      let resolvedImage = r.image || null;
      let resolvedDuration = r.duration || null;
      let resolvedRounds = r.rounds || null;
      let resolvedQueries = r.queries || null;
      let resolvedUrls = r.urls_analyzed || null;

      if (resolvedSlug) {
        existingSlugs.add(resolvedSlug);
        try {
          const rep = reportStorage.readReport(resolvedSlug);
          if (rep) {
            if (!resolvedImage && rep.image) resolvedImage = rep.image;
            if (!resolvedDuration && rep.duration) resolvedDuration = rep.duration;
            if (!resolvedRounds && rep.rounds) resolvedRounds = rep.rounds;
            if (!resolvedQueries && rep.queries) resolvedQueries = rep.queries;
            if (!resolvedUrls && rep.urls_analyzed) resolvedUrls = rep.urls_analyzed;
          }
        } catch {}
      }

      return {
        ...r,
        slug: resolvedSlug,
        image: resolvedImage,
        duration: resolvedDuration,
        rounds: resolvedRounds,
        queries: resolvedQueries,
        urls_analyzed: resolvedUrls,
      };
    });

    // Also include any markdown reports from workspace/research that are not tracked in DB
    try {
      const diskReports = reportStorage.listReports();
      for (const rep of diskReports) {
        if (!existingSlugs.has(rep.slug)) {
          list.push({
            id: 'file-' + rep.slug,
            topic: rep.prompt || rep.title,
            status: 'completed',
            model: rep.model || 'qwen3.5:9b',
            slug: rep.slug,
            image: rep.image || null,
            duration: rep.duration || null,
            rounds: rep.rounds || 3,
            queries: rep.queries || null,
            urls_analyzed: rep.urls_analyzed || (rep.sources ? rep.sources.length : 0),
            summary: rep.summary || '',
            report: '',
            sources: (rep.sources || []).map((s) => (typeof s === 'string' ? { url: s, title: s } : s)),
            created_at: Math.floor(new Date(rep.time || Date.now()).getTime() / 1000),
          });
        }
      }
    } catch {}

    list.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
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
 * GET /api/research/reports
 * List all saved markdown reports in workspace/research/
 */
router.get('/reports', (_req, res) => {
  try {
    const reports = reportStorage.listReports();
    res.json({ reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/research/reports/:slug
 * Get a specific markdown report by slug (e.g. slug.md or slug)
 */
router.get('/reports/:slug', (req, res) => {
  try {
    const report = reportStorage.readReport(req.params.slug);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/research/reports/:slug
 * Delete a markdown report from workspace/research/
 */
router.delete('/reports/:slug', (req, res) => {
  try {
    const success = reportStorage.deleteReport(req.params.slug);
    if (!success) return res.status(404).json({ error: 'Report not found' });
    res.json({ deleted: req.params.slug });
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
 * DELETE /api/research
 * Clear all research runs.
 */
router.delete('/', (_req, res) => {
  try {
    const all = engine.listResearches();
    for (const r of all) {
      engine.cancelResearch(r.id);
    }
    db.prepare('DELETE FROM deep_researches').run();
    res.json({ cleared: true, count: all.length });
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
