'use strict';

require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');

// Bootstrap DB on startup
require('./db/index');

// Bootstrap workspace directory
const WORKSPACE_DIR = path.resolve(process.env.WORKSPACE_DIR || './workspace');
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

// Bootstrap cron jobs from DB
const cronManager = require('./components/tools/cronManager');
cronManager.restoreFromDB();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── CORS & Request headers ──────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ── Request logger ──────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ───────────────────────────────────────────────
app.use('/api/chat',     require('./api/routes/chat'));
app.use('/api/tools',    require('./api/routes/tools'));
app.use('/api/tasks',    require('./api/routes/tasks'));
app.use('/api/cron',     require('./api/routes/cron'));
app.use('/api/alerts',   require('./api/routes/alerts'));
app.use('/api/settings', require('./api/routes/settings'));

// ── Health check ─────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Static frontend serving (if built) ────────────────────
const FRONTEND_DIST = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') return next();
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// ── 404 handler ──────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ─────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`\nMarnie running on http://localhost:${PORT}`);
  console.log(`   Workspace dir : ${WORKSPACE_DIR}`);
  console.log(`   DB path       : ${path.resolve(process.env.DB_PATH || './data/marnie.db')}\n`);
});

module.exports = app;
