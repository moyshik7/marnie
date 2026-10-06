'use strict';

const router = require('express').Router();
const cronManager = require('../../components/tools/cronManager');

function wrap(fn) {
  return async (req, res, next) => {
    try { await fn(req, res, next); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };
}

/**
 * GET /api/cron
 * List all cron jobs.
 */
router.get('/', wrap((_req, res) => {
  res.json(cronManager.listJobs());
}));

/**
 * POST /api/cron
 * Create a new cron job.
 * Body: {
 *   name,
 *   expression,        // standard 5-field cron expression
 *   action_type,       // "bash" | "discord" | "http"
 *   action_data        // object: { command, cwd? } | { message, webhookUrl?, level? } | { url, method?, body?, headers? }
 * }
 */
router.post('/', wrap((req, res) => {
  const { name, expression, action_type, action_data } = req.body;
  if (!name)        return res.status(400).json({ error: '`name` is required' });
  if (!expression)  return res.status(400).json({ error: '`expression` is required' });
  if (!action_type) return res.status(400).json({ error: '`action_type` is required' });
  if (!action_data) return res.status(400).json({ error: '`action_data` is required' });

  const job = cronManager.createJob({ name, expression, action_type, action_data });
  res.status(201).json(job);
}));

/**
 * GET /api/cron/:id
 */
router.get('/:id', wrap((req, res) => {
  res.json(cronManager.getJob(req.params.id));
}));

/**
 * PATCH /api/cron/:id
 * Update a cron job.
 */
router.patch('/:id', wrap((req, res) => {
  const updated = cronManager.updateJob(req.params.id, req.body);
  res.json(updated);
}));

/**
 * DELETE /api/cron/:id
 */
router.delete('/:id', wrap((req, res) => {
  res.json(cronManager.deleteJob(req.params.id));
}));

/**
 * POST /api/cron/:id/pause
 */
router.post('/:id/pause', wrap((req, res) => {
  res.json(cronManager.pauseJob(req.params.id));
}));

/**
 * POST /api/cron/:id/resume
 */
router.post('/:id/resume', wrap((req, res) => {
  res.json(cronManager.resumeJob(req.params.id));
}));

module.exports = router;
