'use strict';

const router = require('express').Router();
const capacityDb = require('../../db/capacity');

/**
 * GET /api/capacity/documents
 * List all documents stored in Expanded Capacity.
 */
router.get('/documents', (_req, res) => {
  try {
    const documents = capacityDb.listDocuments();
    res.json({ success: true, documents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/capacity/documents/:id
 * Get full document content by ID.
 */
router.get('/documents/:id', (req, res) => {
  try {
    const doc = capacityDb.getDocumentById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/capacity/documents
 * Add one or multiple documents into Expanded Capacity.
 * Body: { name, content, type?, category? } OR [ { name, content, ... }, ... ]
 */
router.post('/documents', (req, res) => {
  try {
    const payload = req.body;
    if (Array.isArray(payload)) {
      if (payload.length === 0) {
        return res.status(400).json({ error: 'Array of documents cannot be empty' });
      }
      const added = [];
      for (const item of payload) {
        if (!item.name || item.content === undefined) continue;
        const doc = capacityDb.addDocument({
          name: item.name,
          content: item.content,
          type: item.type,
          category: item.category || 'General',
        });
        added.push(doc);
      }
      return res.status(201).json({ success: true, count: added.length, documents: added });
    }

    if (!payload || !payload.name || payload.content === undefined) {
      return res.status(400).json({ error: '`name` and `content` are required' });
    }

    const doc = capacityDb.addDocument({
      name: payload.name,
      content: payload.content,
      type: payload.type,
      category: payload.category || 'General',
    });

    res.status(201).json({ success: true, document: doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/capacity/documents/:id
 * Delete document from Expanded Capacity.
 */
router.delete('/documents/:id', (req, res) => {
  try {
    const deleted = capacityDb.deleteDocument(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/capacity/search
 * Search across documents. Query param: `q`, `limit`
 */
router.get('/search', (req, res) => {
  try {
    const query = req.query.q || '';
    const limit = parseInt(req.query.limit, 10) || 5;
    const results = capacityDb.searchDocuments(query, { limit });
    res.json({ success: true, query, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
