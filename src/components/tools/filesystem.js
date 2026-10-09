'use strict';

const fs = require('fs');
const path = require('path');
const { WORKSPACE_DIR, REPO_ROOT } = require('../../utils/workspace');

/**
 * Recursively search a directory for files matching a pattern.
 * @param {object} opts
 * @param {string} [opts.directory] - Root directory to search from (defaults to workspace)
 * @param {string} [opts.pattern]   - Glob-like substring or regex string to match filenames
 * @param {boolean} [opts.useRegex] - If true, treat `pattern` as a regular expression
 * @param {number} [opts.maxDepth]  - Max recursion depth (default 10)
 * @param {number} [opts.maxResults]- Max number of results (default 200)
 * @returns {{ matches: string[], truncated: boolean }}
 */
function search({ directory, pattern = '', useRegex = false, maxDepth = 10, maxResults = 200 }) {
  const root = directory ? path.resolve(WORKSPACE_DIR, directory) : WORKSPACE_DIR;
  const relRepo = path.relative(REPO_ROOT, root);
  if (relRepo.startsWith('..') || path.isAbsolute(relRepo)) {
    throw Object.assign(new Error('Security Error: Search directory is outside the repository.'), { status: 403 });
  }
  const results = [];
  let truncated = false;

  const regex = useRegex
    ? new RegExp(pattern)
    : null;

  function walk(dir, depth) {
    if (depth > maxDepth || results.length >= maxResults) return;

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxResults) {
        truncated = true;
        return;
      }

      const fullPath = path.join(dir, entry.name);
      const matches = regex
        ? regex.test(entry.name)
        : entry.name.includes(pattern);

      if (matches) results.push(fullPath);

      if (entry.isDirectory()) {
        walk(fullPath, depth + 1);
      }
    }
  }

  walk(root, 0);
  return { matches: results, truncated };
}

/**
 * Stat a path (file or directory info).
 */
function stat(targetPath) {
  const root = targetPath ? path.resolve(WORKSPACE_DIR, targetPath) : WORKSPACE_DIR;
  const relRepo = path.relative(REPO_ROOT, root);
  if (relRepo.startsWith('..') || path.isAbsolute(relRepo)) {
    throw Object.assign(new Error('Security Error: Path is outside the repository.'), { status: 403 });
  }
  const s = fs.statSync(root);
  return {
    path: root,
    isFile: s.isFile(),
    isDirectory: s.isDirectory(),
    size: s.size,
    mtime: s.mtime.toISOString(),
    ctime: s.ctime.toISOString(),
  };
}

module.exports = { search, stat };
