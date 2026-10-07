'use strict';

const router = require('express').Router();
const bash       = require('../../components/tools/bash');
const filesystem = require('../../components/tools/filesystem');
const codeRunner = require('../../components/tools/codeRunner');
const fileCreate = require('../../components/tools/fileCreate');
const fileRead   = require('../../components/tools/fileRead');
const fileWrite  = require('../../components/tools/fileWrite');

// ─── Helper ────────────────────────────────────────────────────────────────
function wrap(fn) {
  return async (req, res, next) => {
    try { await fn(req, res, next); }
    catch (err) {
      const status = err.status || 500;
      res.status(status).json({ error: err.message });
    }
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/tools/bash
// Body: { command, cwd?, timeout?, env? }
// ═══════════════════════════════════════════════════════════════════════════
router.post('/bash', wrap(async (req, res) => {
  const { command, cwd, timeout, env } = req.body;
  if (!command) return res.status(400).json({ error: '`command` is required' });

  const result = await bash.run({ command, cwd, timeout, env });
  res.json(result);
}));

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/tools/filesystem/search
// Body: { directory, pattern?, useRegex?, maxDepth?, maxResults? }
// ═══════════════════════════════════════════════════════════════════════════
router.post('/filesystem/search', wrap((req, res) => {
  const { directory, pattern, useRegex, maxDepth, maxResults } = req.body;
  if (!directory) return res.status(400).json({ error: '`directory` is required' });

  const result = filesystem.search({ directory, pattern, useRegex, maxDepth, maxResults });
  res.json(result);
}));

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/tools/filesystem/stat
// Body: { path }
// ═══════════════════════════════════════════════════════════════════════════
router.post('/filesystem/stat', wrap((req, res) => {
  const { path: targetPath } = req.body;
  if (!targetPath) return res.status(400).json({ error: '`path` is required' });
  res.json(filesystem.stat(targetPath));
}));

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/tools/code/run
// Body: { code, timeout?, env? }
// ═══════════════════════════════════════════════════════════════════════════
router.post('/code/run', wrap(async (req, res) => {
  const { code, timeout, env } = req.body;
  if (!code) return res.status(400).json({ error: '`code` (JS source string) is required' });

  const result = await codeRunner.runJS({ code, timeout, env });
  res.json(result);
}));

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/tools/file/create
// Body: { filePath, content?, overwrite? }
// ═══════════════════════════════════════════════════════════════════════════
router.post('/file/create', wrap((req, res) => {
  const { filePath, content, overwrite } = req.body;
  if (!filePath) return res.status(400).json({ error: '`filePath` is required' });

  const result = fileCreate.create({ filePath, content, overwrite });
  res.status(201).json(result);
}));

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/tools/file/read
// Body: { filePath, startLine?, endLine? }
// ═══════════════════════════════════════════════════════════════════════════
router.post('/file/read', wrap((req, res) => {
  const { filePath, startLine, endLine } = req.body;
  if (!filePath) return res.status(400).json({ error: '`filePath` is required' });

  res.json(fileRead.read({ filePath, startLine, endLine }));
}));

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/tools/file/write
// Body: { filePath, content, startLine?, endLine?, append? }
//
// The endpoint always reads the file before a line-range write so the
// response includes `previousContent` for reference.
// ═══════════════════════════════════════════════════════════════════════════
router.post('/file/write', wrap((req, res) => {
  const { filePath, content, startLine, endLine, append } = req.body;
  if (!filePath) return res.status(400).json({ error: '`filePath` is required' });
  if (content === undefined) return res.status(400).json({ error: '`content` is required' });

  const result = fileWrite.write({ filePath, content, startLine, endLine, append });
  res.json(result);
}));

// ═══════════════════════════════════════════════════════════════════════════
// Timer endpoints
// POST /api/tools/timer
// GET /api/tools/timer
// DELETE /api/tools/timer/:id
// ═══════════════════════════════════════════════════════════════════════════
const timer = require('../../components/tools/timer');

router.post('/timer', wrap(async (req, res) => {
  const { seconds, duration, minutes, message, title } = req.body;
  const result = await timer.setTimer({ seconds, duration, minutes, message, title });
  res.status(201).json(result);
}));

router.get('/timer', wrap((_req, res) => {
  res.json({ timers: timer.listTimers() });
}));

router.delete('/timer/:id', wrap((req, res) => {
  const result = timer.cancelTimer(req.params.id);
  res.json(result);
}));

module.exports = router;
