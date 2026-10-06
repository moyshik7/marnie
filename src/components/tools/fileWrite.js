'use strict';

const fs = require('fs');
const path = require('path');
const { read } = require('./fileRead');

/**
 * Write or patch a local file.
 *
 * Modes:
 *  - `overwrite`  : Replace the entire file content (default when no line range given).
 *  - `line-range` : Replace lines [startLine..endLine] (1-based, inclusive) with newContent.
 *  - `append`     : Append content to end of file.
 *
 * IMPORTANT: When using line-range mode the current file is always read first
 * (via fileRead) so that the caller knows the existing content before writing.
 *
 * @param {object} opts
 * @param {string} opts.filePath     - Path to the file
 * @param {string} opts.content      - New content to write / insert
 * @param {number} [opts.startLine]  - 1-based start line to replace
 * @param {number} [opts.endLine]    - 1-based end line to replace (inclusive)
 * @param {boolean} [opts.append]    - Append to file instead of overwriting
 * @returns {{ path:string, totalLines:number, previousContent:string|null }}
 */
function write({ filePath, content, startLine, endLine, append = false }) {
  const resolved = path.resolve(filePath);

  // Ensure parent directory exists
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // ── Append mode ──────────────────────────────────────────────
  if (append) {
    fs.appendFileSync(resolved, content, 'utf8');
    const result = read({ filePath: resolved });
    return { path: resolved, totalLines: result.totalLines, previousContent: null };
  }

  // ── Line-range replace ────────────────────────────────────────
  if (startLine !== undefined || endLine !== undefined) {
    // Read existing content first
    const existing = read({ filePath: resolved });
    const lines = existing.content.split('\n');
    const from = (startLine ?? 1) - 1;         // 0-based
    const to   = (endLine   ?? lines.length);  // exclusive

    const newLines = content.split('\n');
    lines.splice(from, to - from, ...newLines);
    const newContent = lines.join('\n');

    fs.writeFileSync(resolved, newContent, 'utf8');
    return {
      path: resolved,
      totalLines: lines.length,
      previousContent: existing.content,
    };
  }

  // ── Full overwrite ────────────────────────────────────────────
  let previous = null;
  if (fs.existsSync(resolved)) {
    previous = fs.readFileSync(resolved, 'utf8');
  }
  fs.writeFileSync(resolved, content, 'utf8');
  const finalLines = content.split('\n').length;
  return { path: resolved, totalLines: finalLines, previousContent: previous };
}

module.exports = { write };
