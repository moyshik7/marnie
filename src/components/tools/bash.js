'use strict';

const { execFile, spawn } = require('child_process');
const os = require('os');

/**
 * Execute a bash command string.
 * @param {object} opts
 * @param {string} opts.command   - Shell command to run
 * @param {string} [opts.cwd]     - Working directory (defaults to process.cwd)
 * @param {number} [opts.timeout] - Timeout in ms (default 30 000)
 * @param {object} [opts.env]     - Extra environment variables
 * @returns {Promise<{stdout:string, stderr:string, exitCode:number}>}
 */
function run({ command, cwd, timeout = 30_000, env = {} }) {
  return new Promise((resolve) => {
    const shell = os.platform() === 'win32' ? 'cmd.exe' : '/bin/bash';
    const args  = os.platform() === 'win32' ? ['/c', command] : ['-c', command];

    let stdout = '';
    let stderr = '';

    const child = spawn(shell, args, {
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...env },
      timeout,
    });

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? -1 });
    });

    child.on('error', (err) => {
      resolve({ stdout, stderr: err.message, exitCode: -1 });
    });
  });
}

module.exports = { run };
