'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('../../db/index');

// ─── Prepared statements ─────────────────────────────────────────────────────
const stmtCreate = db.prepare(`
  INSERT INTO tasks (id, title, description, status, priority, due_at)
  VALUES (@id, @title, @description, @status, @priority, @due_at)
`);

const stmtList = db.prepare(`
  SELECT * FROM tasks ORDER BY
    CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
    COALESCE(due_at, 9999999999)
`);

const stmtGet = db.prepare('SELECT * FROM tasks WHERE id = ?');

const stmtUpdate = db.prepare(`
  UPDATE tasks
  SET title=@title, description=@description, status=@status,
      priority=@priority, due_at=@due_at,
      updated_at=strftime('%s','now')
  WHERE id=@id
`);

const stmtDelete = db.prepare('DELETE FROM tasks WHERE id = ?');

const stmtFilter = db.prepare(
  'SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC'
);

// ─── Functions ────────────────────────────────────────────────────────────────

function createTask({ title, description = '', status = 'pending', priority = 'medium', due_at = null }) {
  const id = uuidv4();
  stmtCreate.run({ id, title, description, status, priority, due_at });
  return stmtGet.get(id);
}

function listTasks({ status } = {}) {
  if (status) return stmtFilter.all(status);
  return stmtList.all();
}

function getTask(id) {
  const task = stmtGet.get(id);
  if (!task) throw Object.assign(new Error(`Task not found: ${id}`), { status: 404 });
  return task;
}

function updateTask(id, fields) {
  const existing = getTask(id); // throws 404 if missing
  const merged = {
    title:       fields.title       ?? existing.title,
    description: fields.description ?? existing.description,
    status:      fields.status      ?? existing.status,
    priority:    fields.priority    ?? existing.priority,
    due_at:      fields.due_at      !== undefined ? fields.due_at : existing.due_at,
    id,
  };
  stmtUpdate.run(merged);
  return stmtGet.get(id);
}

function deleteTask(id) {
  getTask(id); // ensure exists
  stmtDelete.run(id);
  return { deleted: id };
}

module.exports = { createTask, listTasks, getTask, updateTask, deleteTask };
