'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Create a new local file with initial content.
 * Intermediate directories are created automatically.
 * Throws if the file already exists and `overwrite` is not set.
 *
 * @param {object} opts
 * @param {string} opts.filePath   - Absolute or relative path to the new file
 * @param {string} [opts.content]  - Initial file content (default empty string)
 * @param {boolean} [opts.overwrite] - If true, overwrite existing file
 * @returns {{ path: string, created: boolean }}
 */
function create({ filePath, content = '', overwrite = false }) {
  const resolved = path.resolve(filePath);
  const dir = path.dirname(resolved);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(resolved) && !overwrite) {
    throw Object.assign(new Error(`File already exists: ${resolved}`), { status: 409 });
  }

  fs.writeFileSync(resolved, content, 'utf8');
  return { path: resolved, created: true };
}

module.exports = { create };
