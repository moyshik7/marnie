'use strict';

const router = require('express').Router();
const tasksTool = require('../../components/tools/tasks');

function wrap(fn) {
  return async (req, res, next) => {
    try { await fn(req, res, next); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };
}

/**
 * GET /api/tasks
 * Query params: ?status=pending|in_progress|done|cancelled
 */
router.get('/', wrap((req, res) => {
  const tasks = tasksTool.listTasks({ status: req.query.status });
  res.json(tasks);
}));

/**
 * POST /api/tasks
 * Body: { title, description?, status?, priority?, due_at? }
 */
router.post('/', wrap((req, res) => {
  const { title, description, status, priority, due_at } = req.body;
  if (!title) return res.status(400).json({ error: '`title` is required' });

  const task = tasksTool.createTask({ title, description, status, priority, due_at });
  res.status(201).json(task);
}));

/**
 * GET /api/tasks/:id
 */
router.get('/:id', wrap((req, res) => {
  res.json(tasksTool.getTask(req.params.id));
}));

/**
 * PATCH /api/tasks/:id
 * Body: { title?, description?, status?, priority?, due_at? }
 */
router.patch('/:id', wrap((req, res) => {
  const updated = tasksTool.updateTask(req.params.id, req.body);
  res.json(updated);
}));

/**
 * DELETE /api/tasks/:id
 */
router.delete('/:id', wrap((req, res) => {
  res.json(tasksTool.deleteTask(req.params.id));
}));

module.exports = router;
