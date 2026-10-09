'use strict';

const fs = require('fs');
const path = require('path');
const { WORKSPACE_DIR, resolveWorkspacePath } = require('../../utils/workspace');

const NOTES_FILE_PATH = path.join(WORKSPACE_DIR, 'NOTES.md');

const INITIAL_NOTES_TEMPLATE = `# AI NOTES & TASKS

This file serves as a dedicated working notebook, task list, and long-term reference store for Marnie AI.
Unlike BRAIN.md, this file is not injected into the system prompt by default. The AI agent can consult and update these notes on-demand using the \`fetch_notes\` and \`update_notes\` skills.

## Active Tasks & Checklist
- [ ] Review current workspace status and ongoing goals
- [ ] Maintain user-specific reference details and detailed checklists

## Project Notes & Reference Data
- Store long-form technical requirements, architectural decisions, and API details here.
- Detailed project milestones and notes that are too large for standard prompt injection.

## Scratchpad & Working Memory
- Multi-step reasoning drafts, task decomposition, and scratchpad context.
`;

/**
 * Ensure workspace/NOTES.md exists with initial template if missing.
 */
function ensureNotesFile() {
  if (!fs.existsSync(WORKSPACE_DIR)) {
    fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
  }
  if (!fs.existsSync(NOTES_FILE_PATH)) {
    try {
      fs.writeFileSync(NOTES_FILE_PATH, INITIAL_NOTES_TEMPLATE, 'utf8');
    } catch (err) {
      console.warn('[notes] Failed to create initial NOTES.md:', err.message);
    }
  }
}

/**
 * Read current NOTES.md content.
 * @returns {string}
 */
function getNotesContent() {
  try {
    if (!fs.existsSync(NOTES_FILE_PATH)) {
      ensureNotesFile();
    }
    return fs.readFileSync(NOTES_FILE_PATH, 'utf8');
  } catch (err) {
    console.warn('[notes] Error reading NOTES.md:', err.message);
    return '';
  }
}

/**
 * Write updated content to NOTES.md.
 * @param {string} content
 * @returns {boolean}
 */
function saveNotesContent(content) {
  try {
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }
    fs.writeFileSync(NOTES_FILE_PATH, content, 'utf8');
    return true;
  } catch (err) {
    console.error('[notes] Error writing to NOTES.md:', err.message);
    return false;
  }
}

/**
 * Append text or a new task to NOTES.md.
 * @param {string} text
 * @param {string} [section]
 * @returns {boolean}
 */
function appendNotesContent(text, section = '') {
  try {
    let current = getNotesContent();
    if (section && current.includes(section)) {
      // Insert right after the section header
      const idx = current.indexOf(section) + section.length;
      current = current.slice(0, idx) + '\n' + text + current.slice(idx);
    } else {
      current = current.trimEnd() + '\n\n' + text + '\n';
    }
    return saveNotesContent(current);
  } catch (err) {
    console.error('[notes] Error appending to NOTES.md:', err.message);
    return false;
  }
}

/**
 * Get file stats and metadata for NOTES.md.
 */
function getNotesMetadata() {
  try {
    ensureNotesFile();
    const stat = fs.statSync(NOTES_FILE_PATH);
    const content = getNotesContent();
    const lines = content.split('\n').length;
    return {
      filePath: 'workspace/NOTES.md',
      absolutePath: NOTES_FILE_PATH,
      sizeBytes: stat.size,
      lines,
      characterCount: content.length,
      lastModified: stat.mtime.toISOString(),
      exists: true,
    };
  } catch (err) {
    return {
      filePath: 'workspace/NOTES.md',
      absolutePath: NOTES_FILE_PATH,
      sizeBytes: 0,
      lines: 0,
      characterCount: 0,
      lastModified: null,
      exists: false,
    };
  }
}

// Ensure NOTES.md exists on load
ensureNotesFile();

module.exports = {
  NOTES_FILE_PATH,
  ensureNotesFile,
  getNotesContent,
  saveNotesContent,
  appendNotesContent,
  getNotesMetadata,
};
