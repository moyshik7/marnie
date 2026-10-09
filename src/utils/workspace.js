'use strict';

const path = require('path');
const fs = require('fs');

// Repository root directory
const REPO_ROOT = path.resolve(__dirname, '../../');

// Workspace directory (defaults to ./workspace in repo root)
const WORKSPACE_DIR = path.resolve(
  process.env.WORKSPACE_DIR
    ? path.resolve(REPO_ROOT, process.env.WORKSPACE_DIR)
    : path.join(REPO_ROOT, 'workspace')
);

// Ensure workspace directory exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

/**
 * Normalize and strictly resolve a user/AI file path to ensure it is INSIDE WORKSPACE_DIR.
 * Throws 403 Forbidden if the path attempts to escape WORKSPACE_DIR.
 *
 * @param {string} userPath - Relative or absolute path
 * @returns {{ resolved: string, relativePath: string }}
 */
function resolveWorkspacePath(userPath) {
  if (!userPath || typeof userPath !== 'string') {
    throw Object.assign(new Error('A valid file path is required'), { status: 400 });
  }

  let clean = userPath.trim();

  // Strip redundant workspace prefixes if provided by user or AI
  if (clean.startsWith('workspace/') || clean.startsWith('workspace\\')) {
    clean = clean.slice(10);
  } else if (clean.startsWith('./workspace/') || clean.startsWith('.\\workspace\\')) {
    clean = clean.slice(12);
  } else if (clean.startsWith('/workspace/') || clean.startsWith('\\workspace\\')) {
    clean = clean.slice(11);
  }

  // Resolve target path
  let target;
  if (path.isAbsolute(clean)) {
    target = path.normalize(clean);
  } else {
    target = path.resolve(WORKSPACE_DIR, clean);
  }

  // Security containment check
  const rel = path.relative(WORKSPACE_DIR, target);
  const isOutside = rel.startsWith('..') || path.isAbsolute(rel);

  if (isOutside) {
    throw Object.assign(
      new Error(`Security Violation: Path "${userPath}" is outside the designated workspace directory. All created and edited files must be strictly inside the workspace.`),
      { status: 403 }
    );
  }

  return {
    resolved: target,
    relativePath: rel || path.basename(target),
  };
}

/**
 * Resolve a read path. Prioritizes WORKSPACE_DIR, but allows reading repo files if needed.
 * Strictly blocks reading any file outside REPO_ROOT.
 *
 * @param {string} userPath
 * @returns {{ resolved: string, relativePath: string, inWorkspace: boolean }}
 */
function resolveReadPath(userPath) {
  if (!userPath || typeof userPath !== 'string') {
    throw Object.assign(new Error('A valid file path is required'), { status: 400 });
  }

  let clean = userPath.trim();

  // 1. Try workspace first
  try {
    const ws = resolveWorkspacePath(clean);
    if (fs.existsSync(ws.resolved)) {
      return { ...ws, inWorkspace: true };
    }
  } catch {}

  // 2. Check if inside workspace directly
  const inWorkspace = path.resolve(WORKSPACE_DIR, clean);
  const relWs = path.relative(WORKSPACE_DIR, inWorkspace);
  if (!relWs.startsWith('..') && !path.isAbsolute(relWs)) {
    return { resolved: inWorkspace, relativePath: relWs, inWorkspace: true };
  }

  // 3. Fallback: check within REPO_ROOT
  const inRepo = path.resolve(REPO_ROOT, clean);
  const relRepo = path.relative(REPO_ROOT, inRepo);
  if (relRepo.startsWith('..') || path.isAbsolute(relRepo)) {
    throw Object.assign(
      new Error(`Security Violation: Path "${userPath}" is outside the repository. AI is prohibited from accessing files outside the repository.`),
      { status: 403 }
    );
  }

  return { resolved: inRepo, relativePath: relRepo, inWorkspace: false };
}

/**
 * Validate and resolve a safe working directory for shell commands.
 * Defaults to WORKSPACE_DIR and strictly prevents operating outside REPO_ROOT.
 *
 * @param {string} [cwd]
 * @returns {string} Safe absolute path
 */
function resolveSafeCwd(cwd) {
  if (!cwd) return WORKSPACE_DIR;

  const target = path.resolve(WORKSPACE_DIR, cwd);
  const relRepo = path.relative(REPO_ROOT, target);
  if (relRepo.startsWith('..') || path.isAbsolute(relRepo)) {
    throw Object.assign(
      new Error(`Security Violation: Working directory "${cwd}" is outside the repository. AI cannot execute commands outside the repository.`),
      { status: 403 }
    );
  }

  return target;
}

module.exports = {
  REPO_ROOT,
  WORKSPACE_DIR,
  resolveWorkspacePath,
  resolveReadPath,
  resolveSafeCwd,
};
