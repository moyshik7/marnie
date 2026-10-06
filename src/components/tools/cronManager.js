'use strict';

const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db/index');

// Runtime registry of active cron instances: id -> ScheduledTask
const registry = new Map();

// ─── DB helpers ───────────────────────────────────────────────────────────────
const stmtCreate = db.prepare(`
  INSERT INTO cron_jobs (id, name, expression, action_type, action_data, enabled)
  VALUES (@id, @name, @expression, @action_type, @action_data, @enabled)
`);
const stmtList   = db.prepare('SELECT * FROM cron_jobs ORDER BY created_at DESC');
const stmtGet    = db.prepare('SELECT * FROM cron_jobs WHERE id = ?');
const stmtUpdate = db.prepare(`
  UPDATE cron_jobs SET name=@name, expression=@expression,
    action_type=@action_type, action_data=@action_data, enabled=@enabled
  WHERE id=@id
`);
const stmtDelete     = db.prepare('DELETE FROM cron_jobs WHERE id = ?');
const stmtUpdateRun  = db.prepare(`UPDATE cron_jobs SET last_run=strftime('%s','now') WHERE id=?`);

// ─── Action executor ─────────────────────────────────────────────────────────
async function executeAction(job) {
  const data = JSON.parse(job.action_data);

  switch (job.action_type) {
    case 'bash': {
      const bash = require('./bash');
      const result = await bash.run({ command: data.command, cwd: data.cwd });
      console.log(`[cron:${job.id}] bash finished. exit=${result.exitCode}`);
      break;
    }
    case 'discord': {
      const discord = require('./discord');
      await discord.sendAlert(data);
      console.log(`[cron:${job.id}] discord alert sent.`);
      break;
    }
    case 'http': {
      const axios = require('axios');
      await axios({ method: data.method || 'GET', url: data.url, data: data.body, headers: data.headers });
      console.log(`[cron:${job.id}] http request sent.`);
      break;
    }
    default:
      console.warn(`[cron:${job.id}] Unknown action_type: ${job.action_type}`);
  }

  stmtUpdateRun.run(job.id);
}

// ─── Internal: start a cron task ─────────────────────────────────────────────
function _startTask(job) {
  if (!cron.validate(job.expression)) {
    throw new Error(`Invalid cron expression: ${job.expression}`);
  }
  const task = cron.schedule(job.expression, () => executeAction(job), { scheduled: true });
  registry.set(job.id, task);
  return task;
}

// ─── Public API ───────────────────────────────────────────────────────────────

function createJob({ name, expression, action_type, action_data }) {
  if (!cron.validate(expression)) {
    throw Object.assign(new Error(`Invalid cron expression: ${expression}`), { status: 400 });
  }
  const id = uuidv4();
  const job = { id, name, expression, action_type, action_data: JSON.stringify(action_data), enabled: 1 };
  stmtCreate.run(job);
  _startTask({ ...job });
  return stmtGet.get(id);
}

function listJobs() {
  return stmtList.all();
}

function getJob(id) {
  const job = stmtGet.get(id);
  if (!job) throw Object.assign(new Error(`Cron job not found: ${id}`), { status: 404 });
  return job;
}

function updateJob(id, fields) {
  const existing = getJob(id);
  const merged = {
    id,
    name:        fields.name        ?? existing.name,
    expression:  fields.expression  ?? existing.expression,
    action_type: fields.action_type ?? existing.action_type,
    action_data: fields.action_data !== undefined
      ? JSON.stringify(fields.action_data)
      : existing.action_data,
    enabled: fields.enabled !== undefined ? (fields.enabled ? 1 : 0) : existing.enabled,
  };
  stmtUpdate.run(merged);

  // Restart task with new settings
  if (registry.has(id)) {
    registry.get(id).stop();
    registry.delete(id);
  }
  if (merged.enabled) _startTask(merged);
  return stmtGet.get(id);
}

function deleteJob(id) {
  getJob(id);
  if (registry.has(id)) {
    registry.get(id).stop();
    registry.delete(id);
  }
  stmtDelete.run(id);
  return { deleted: id };
}

function pauseJob(id) {
  getJob(id);
  const task = registry.get(id);
  if (task) task.stop();
  db.prepare('UPDATE cron_jobs SET enabled=0 WHERE id=?').run(id);
  return stmtGet.get(id);
}

function resumeJob(id) {
  const job = getJob(id);
  db.prepare('UPDATE cron_jobs SET enabled=1 WHERE id=?').run(id);
  if (!registry.has(id)) _startTask(job);
  else registry.get(id).start();
  return stmtGet.get(id);
}

/** Restore persisted enabled jobs on server start. */
function restoreFromDB() {
  const jobs = db.prepare('SELECT * FROM cron_jobs WHERE enabled=1').all();
  let restored = 0;
  for (const job of jobs) {
    try {
      _startTask(job);
      restored++;
    } catch (err) {
      console.warn(`[cron] Failed to restore job ${job.id}: ${err.message}`);
    }
  }
  if (restored > 0) console.log(`[cron] Restored ${restored} cron job(s) from database.`);
}

module.exports = { createJob, listJobs, getJob, updateJob, deleteJob, pauseJob, resumeJob, restoreFromDB };
