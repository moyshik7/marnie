'use strict';

const fs = require('fs');
const path = require('path');
const { resolveWorkspacePath } = require('../../utils/workspace');
const { read } = require('./fileRead');

/**
 * Write or patch a local file.
 * Strictly restricted to the workspace directory.
 *
 * Modes:
 *  - `overwrite`  : Replace the entire file content (default when no line range given).
 *  - `line-range` : Replace lines [startLine..endLine] (1-based, inclusive) with newContent.
 *  - `append`     : Append content to end of file.
 *
 * @param {object} opts
 * @param {string} opts.filePath     - Path to the file (within workspace)
 * @param {string} opts.content      - New content to write / insert
 * @param {number} [opts.startLine]  - 1-based start line to replace
 * @param {number} [opts.endLine]    - 1-based end line to replace (inclusive)
 * @param {boolean} [opts.append]    - Append to file instead of overwriting
 * @returns {{ path:string, relativePath:string, name:string, totalLines:number, previousContent:string|null }}
 */
function write({ filePath, content, startLine, endLine, append = false }) {
  const { resolved, relativePath } = resolveWorkspacePath(filePath);
  const name = path.basename(resolved);

  // Ensure parent directory exists
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // ── Append mode ──────────────────────────────────────────────
  if (append) {
    fs.appendFileSync(resolved, content, 'utf8');
    const result = read({ filePath: resolved });
    return {
      path: resolved,
      relativePath,
      name,
      totalLines: result.totalLines,
      previousContent: null,
    };
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
      relativePath,
      name,
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
  return {
    path: resolved,
    relativePath,
    name,
    totalLines: finalLines,
    previousContent: previous,
  };
}

module.exports = { write };
