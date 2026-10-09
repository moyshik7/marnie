'use strict';

const fs = require('fs');
const path = require('path');
const { resolveReadPath } = require('../../utils/workspace');

/**
 * Read a local file, optionally slicing a line range.
 * Prioritizes workspace files and restricts reading to inside the repo.
 * @param {object} opts
 * @param {string} opts.filePath    - Path to the file
 * @param {number} [opts.startLine] - 1-based start line (inclusive)
 * @param {number} [opts.endLine]   - 1-based end line (inclusive)
 * @returns {{ path:string, relativePath:string, name:string, content:string, totalLines:number, startLine:number|null, endLine:number|null }}
 */
function read({ filePath, startLine, endLine }) {
  const { resolved, relativePath } = resolveReadPath(filePath);

  if (!fs.existsSync(resolved)) {
    throw Object.assign(new Error(`File not found: ${relativePath || filePath}`), { status: 404 });
  }

  const raw = fs.readFileSync(resolved, 'utf8');
  const lines = raw.split('\n');
  const totalLines = lines.length;

  if (startLine !== undefined || endLine !== undefined) {
    const from = (startLine ?? 1) - 1;        // 0-based
    const to   = (endLine   ?? totalLines);   // exclusive upper bound
    const slice = lines.slice(from, to).join('\n');
    return {
      path: resolved,
      relativePath,
      name: path.basename(resolved),
      content: slice,
      totalLines,
      startLine: from + 1,
      endLine: Math.min(to, totalLines),
    };
  }

  return {
    path: resolved,
    relativePath,
    name: path.basename(resolved),
    content: raw,
    totalLines,
    startLine: null,
    endLine: null,
  };
}

module.exports = { read };
