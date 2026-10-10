'use strict';

const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { WORKSPACE_DIR, resolveWorkspacePath } = require('../../utils/workspace');

/**
 * Helper to get clean MIME type for preview and raw browser serving
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html':
    case '.htm':
      return 'text/html; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.js':
    case '.mjs':
      return 'application/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.md':
      return 'text/markdown; charset=utf-8';
    case '.xml':
      return 'application/xml; charset=utf-8';
    case '.csv':
      return 'text/csv; charset=utf-8';
    case '.py':
      return 'text/x-python; charset=utf-8';
    case '.sh':
      return 'text/x-sh; charset=utf-8';
    case '.txt':
    default:
      return 'text/plain; charset=utf-8';
  }
}

/**
 * Recursively collect files in workspace
 */
function collectWorkspaceFiles(dir, baseDir = WORKSPACE_DIR) {
  let results = [];
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.name.startsWith('.git') || entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);
    const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      results.push({
        name: entry.name,
        path: rel,
        isDirectory: true,
      });
      results = results.concat(collectWorkspaceFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      try {
        const stats = fs.statSync(fullPath);
        results.push({
          name: entry.name,
          path: rel,
          isDirectory: false,
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          extension: path.extname(entry.name).toLowerCase(),
          mimeType: getMimeType(entry.name),
        });
      } catch {}
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/workspace/files
// List all files in the workspace directory
// ═══════════════════════════════════════════════════════════════════════════
router.get('/files', (_req, res) => {
  try {
    const items = collectWorkspaceFiles(WORKSPACE_DIR);
    res.json({
      workspaceDir: WORKSPACE_DIR,
      files: items,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/workspace/file?path=...
// Get content and metadata for a specific workspace file
// ═══════════════════════════════════════════════════════════════════════════
router.get('/file', (req, res) => {
  const reqPath = req.query.path;
  if (!reqPath) return res.status(400).json({ error: '`path` query parameter is required' });

  try {
    const { resolved, relativePath } = resolveWorkspacePath(reqPath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: `File not found: ${relativePath}` });
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return res.status(400).json({ error: `Path is a directory: ${relativePath}` });
    }

    const content = fs.readFileSync(resolved, 'utf8');
    const ext = path.extname(resolved).toLowerCase();

    res.json({
      path: relativePath.replace(/\\/g, '/'),
      name: path.basename(resolved),
      extension: ext,
      mimeType: getMimeType(resolved),
      content,
      size: stat.size,
      mtime: stat.mtime.toISOString(),
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PUT /api/workspace/file
// Save or update file content in the workspace
// ═══════════════════════════════════════════════════════════════════════════
router.put('/file', (req, res) => {
  const { path: reqPath, content } = req.body;
  if (!reqPath) return res.status(400).json({ error: '`path` is required' });
  if (content === undefined || content === null) {
    return res.status(400).json({ error: '`content` is required' });
  }

  try {
    const { resolved, relativePath } = resolveWorkspacePath(reqPath);
    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolved, content, 'utf8');
    const stat = fs.statSync(resolved);

    res.json({
      success: true,
      path: relativePath.replace(/\\/g, '/'),
      name: path.basename(resolved),
      size: stat.size,
      mtime: stat.mtime.toISOString(),
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/workspace/file
// Create a new file in workspace
// ═══════════════════════════════════════════════════════════════════════════
router.post('/file', (req, res) => {
  const { path: reqPath, content = '', overwrite = false } = req.body;
  if (!reqPath) return res.status(400).json({ error: '`path` is required' });

  try {
    const { resolved, relativePath } = resolveWorkspacePath(reqPath);
    if (fs.existsSync(resolved) && !overwrite) {
      return res.status(409).json({ error: `File already exists: ${relativePath}` });
    }

    const dir = path.dirname(resolved);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(resolved, content, 'utf8');
    const stat = fs.statSync(resolved);

    res.status(201).json({
      success: true,
      path: relativePath.replace(/\\/g, '/'),
      name: path.basename(resolved),
      size: stat.size,
      mtime: stat.mtime.toISOString(),
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// DELETE /api/workspace/file?path=...
// Delete a file in workspace
// ═══════════════════════════════════════════════════════════════════════════
router.delete('/file', (req, res) => {
  const reqPath = req.query.path || req.body?.path;
  if (!reqPath) return res.status(400).json({ error: '`path` parameter is required' });

  try {
    const { resolved, relativePath } = resolveWorkspacePath(reqPath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: `File not found: ${relativePath}` });
    }

    fs.unlinkSync(resolved);
    res.json({ success: true, deleted: relativePath.replace(/\\/g, '/') });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/workspace/raw/:filepath(*) or GET /api/workspace/raw?path=...
// Serve raw file for direct browser opening and in-app preview iframes
// ═══════════════════════════════════════════════════════════════════════════
const serveRawFile = (req, res) => {
  let target = req.params.filepath || req.params[0] || req.query.path;
  if (Array.isArray(target)) {
    target = target.join('/');
  }
  if (!target) return res.status(400).send('Path required');

  try {
    const { resolved } = resolveWorkspacePath(target);
    if (!fs.existsSync(resolved)) {
      return res.status(404).send('File not found in workspace');
    }

    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return res.status(400).send('Cannot render directory directly');
    }

    res.setHeader('Content-Type', getMimeType(resolved));
    res.removeHeader('X-Frame-Options');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send file
    res.sendFile(resolved);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).send(err.message);
  }
};

router.get('/raw', serveRawFile);
router.get('/raw/*filepath', serveRawFile);

module.exports = router;
