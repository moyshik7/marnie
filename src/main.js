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


app.use((req, res, next) => {
  	res.header('Access-Control-Allow-Origin', '*');
  	res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  	res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  	if (req.method === 'OPTIONS') {
    	return res.sendStatus(200);
  	}
  	next();
});

/*
// ── Request logger ──────────────────────────────────────
app.use((req, _res, next) => {
  	console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  	next();
});
*/


app.use('/api/chat',      require('./api/routes/chat'));
app.use('/api/tools',     require('./api/routes/tools'));
app.use('/api/tasks',     require('./api/routes/tasks'));
app.use('/api/cron',      require('./api/routes/cron'));
app.use('/api/alerts',    require('./api/routes/alerts'));
app.use('/api/settings',  require('./api/routes/settings'));
app.use('/api/research',  require('./api/routes/research'));
app.use('/api/workspace', require('./api/routes/workspace'));
app.use('/api/brain',     require('./api/routes/brain'));
app.use('/api/notes',     require('./api/routes/notes'));
app.use('/api/capacity',  require('./api/routes/capacity'));


app.get('/health', (_req, res) => {
  	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


const FRONTEND_DIST = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIST)) {
  	app.use(express.static(FRONTEND_DIST));
  	app.get('{*splat}', (req, res, next) => {
    	if (req.path.startsWith('/api/') || req.path === '/health') return next();
    	res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  	});
}


app.use((_req, res) => {
  	res.status(404).json({ error: 'Not found' });
});


app.use((err, _req, res, _next) => {
  	console.error('[ERROR]', err);
  	res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});


function startServer(port) {
  	const server = app.listen(port, () => {
    	const actualPort = server.address().port;
    	console.log(`\nMarnie running on http://localhost:${actualPort}`);
    	console.log(`   Workspace dir : ${WORKSPACE_DIR}`);
  	});

  	server.on('error', (err) => {
    	if (err.code === 'EADDRINUSE') {
      		console.warn(`Port ${port} is in use, trying ${port + 1}...`);
      		startServer(port + 1);
    	} else {
      		console.error('[ERROR] Server failed to start:', err);
      		process.exit(1);
    	}
  	});

  	return server;
}

const PORT = parseInt(process.env.PORT || '3000', 10);
startServer(PORT);

module.exports = app;
