'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

/**
 * Execute a JavaScript code snippet in a fresh child Node.js process.
 * The code has access to standard Node.js built-ins.
 * @param {object} opts
 * @param {string} opts.code        - JS source code to execute
 * @param {number} [opts.timeout]   - Timeout in ms (default 15 000)
 * @param {object} [opts.env]       - Extra environment variables for the child
 * @returns {Promise<{stdout:string, stderr:string, exitCode:number}>}
 */
function runJS({ code, timeout = 15_000, env = {} }) {
  return new Promise((resolve) => {
    // Write code to a temp file so we avoid shell-escaping issues
    const tmpFile = path.join(os.tmpdir(), `marnie_run_${uuidv4()}.js`);
    fs.writeFileSync(tmpFile, code, 'utf8');

    let stdout = '';
    let stderr = '';

    const child = spawn(process.execPath, [tmpFile], {
      env: { ...process.env, ...env },
      timeout,
    });

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (exitCode) => {
      // Clean up temp file
      try { fs.unlinkSync(tmpFile); } catch {}
      resolve({ stdout, stderr, exitCode: exitCode ?? -1 });
    });

    child.on('error', (err) => {
      try { fs.unlinkSync(tmpFile); } catch {}
      resolve({ stdout, stderr: err.message, exitCode: -1 });
    });
  });
}

module.exports = { runJS };
