'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Read a local file, optionally slicing a line range.
 * @param {object} opts
 * @param {string} opts.filePath    - Path to the file
 * @param {number} [opts.startLine] - 1-based start line (inclusive)
 * @param {number} [opts.endLine]   - 1-based end line (inclusive)
 * @returns {{ path:string, content:string, totalLines:number, startLine:number|null, endLine:number|null }}
 */
function read({ filePath, startLine, endLine }) {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw Object.assign(new Error(`File not found: ${resolved}`), { status: 404 });
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
      content: slice,
      totalLines,
      startLine: from + 1,
      endLine: Math.min(to, totalLines),
    };
  }

  return { path: resolved, content: raw, totalLines, startLine: null, endLine: null };
}

module.exports = { read };
