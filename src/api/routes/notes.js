'use strict';

const router = require('express').Router();
const notesManager = require('../../components/tools/notesManager');

/**
 * GET /api/notes
 * Fetch current NOTES.md content and metadata
 */
router.get('/', (_req, res) => {
  try {
    const content = notesManager.getNotesContent();
    const meta = notesManager.getNotesMetadata();

    res.json({
      content,
      filePath: meta.filePath,
      sizeBytes: meta.sizeBytes,
      lines: meta.lines,
      characterCount: meta.characterCount,
      lastModified: meta.lastModified,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/notes
 * Overwrite NOTES.md content
 * Body: { content }
 */
router.put('/', (req, res) => {
  const { content } = req.body;
  if (content === undefined || content === null || typeof content !== 'string') {
    return res.status(400).json({ error: '`content` (string) is required' });
  }

  try {
    const success = notesManager.saveNotesContent(content);
    if (!success) throw new Error('Failed to save NOTES.md');

    const meta = notesManager.getNotesMetadata();
    res.json({
      success: true,
      content,
      lastModified: meta.lastModified,
      lines: meta.lines,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notes/append
 * Append a note or task to NOTES.md
 * Body: { text, section? }
 */
router.post('/append', (req, res) => {
  const { text, section } = req.body;
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: '`text` (string) is required' });
  }

  try {
    const success = notesManager.appendNotesContent(text, section);
    if (!success) throw new Error('Failed to append to NOTES.md');

    const content = notesManager.getNotesContent();
    const meta = notesManager.getNotesMetadata();
    res.json({
      success: true,
      content,
      lastModified: meta.lastModified,
      lines: meta.lines,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
