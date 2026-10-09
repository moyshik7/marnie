'use strict';

const fs = require('fs');
const path = require('path');
const { resolveWorkspacePath } = require('../../utils/workspace');

/**
 * Create a new local file with initial content.
 * Enforces that created files are restricted to the workspace directory.
 * Intermediate directories are created automatically.
 * Throws if the file already exists and `overwrite` is not set.
 *
 * @param {object} opts
 * @param {string} opts.filePath   - Path to the new file (must be inside workspace)
 * @param {string} [opts.content]  - Initial file content (default empty string)
 * @param {boolean} [opts.overwrite] - If true, overwrite existing file
 * @returns {{ path: string, relativePath: string, name: string, created: boolean }}
 */
function create({ filePath, content = '', overwrite = false }) {
  const { resolved, relativePath } = resolveWorkspacePath(filePath);
  const dir = path.dirname(resolved);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(resolved) && !overwrite) {
    throw Object.assign(new Error(`File already exists: ${relativePath}`), { status: 409 });
  }

  fs.writeFileSync(resolved, content, 'utf8');
  return {
    path: resolved,
    relativePath,
    name: path.basename(resolved),
    created: true,
  };
}

module.exports = { create };
