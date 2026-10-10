'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const CAPACITY_DB_PATH = process.env.CAPACITY_DB_PATH || './data/capacity.db';
const dbDir = path.dirname(path.resolve(CAPACITY_DB_PATH));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(CAPACITY_DB_PATH));

// Enable WAL mode for high concurrency & performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ────────────────────────────────────────
// Schema bootstrap for Expanded Capacity
// ────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    content     TEXT NOT NULL,
    size        INTEGER NOT NULL,
    type        TEXT NOT NULL,
    category    TEXT DEFAULT 'General',
    word_count  INTEGER DEFAULT 0,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
    name,
    content,
    content='documents',
    content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
    INSERT INTO documents_fts(rowid, name, content) VALUES (new.rowid, new.name, new.content);
  END;

  CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, name, content) VALUES('delete', old.rowid, old.name, old.content);
  END;

  CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
    INSERT INTO documents_fts(documents_fts, rowid, name, content) VALUES('delete', old.rowid, old.name, old.content);
    INSERT INTO documents_fts(rowid, name, content) VALUES (new.rowid, new.name, new.content);
  END;
`);

// Prepared statements
const stmtInsert = db.prepare(`
  INSERT INTO documents (id, name, content, size, type, category, word_count, created_at, updated_at)
  VALUES (@id, @name, @content, @size, @type, @category, @word_count, strftime('%s','now'), strftime('%s','now'))
`);

const stmtList = db.prepare(`
  SELECT id, name, size, type, category, word_count, created_at, updated_at,
         substr(content, 1, 200) AS snippet
  FROM documents
  ORDER BY created_at DESC
`);

const stmtGetById = db.prepare(`
  SELECT * FROM documents WHERE id = ?
`);

const stmtGetByName = db.prepare(`
  SELECT * FROM documents WHERE name = ? COLLATE NOCASE LIMIT 1
`);

const stmtDelete = db.prepare(`
  DELETE FROM documents WHERE id = ?
`);

const stmtCount = db.prepare(`
  SELECT count(*) as count FROM documents
`);

function calculateWordCount(text) {
  if (!text || typeof text !== 'string') return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Add a new document to the Expanded Capacity database.
 */
function addDocument({ name, content, type, category = 'General' }) {
  if (!name || typeof name !== 'string') throw new Error('Document name is required');
  if (content === undefined || content === null) throw new Error('Document content is required');

  const id = uuidv4();
  const stringContent = String(content);
  const size = Buffer.byteLength(stringContent, 'utf8');
  const fileExt = path.extname(name).replace(/^\./, '').toLowerCase() || type || 'txt';
  const word_count = calculateWordCount(stringContent);

  stmtInsert.run({
    id,
    name: name.trim(),
    content: stringContent,
    size,
    type: fileExt,
    category: category || 'General',
    word_count,
  });

  return stmtGetById.get(id);
}

/**
 * List all documents metadata.
 */
function listDocuments() {
  return stmtList.all();
}

/**
 * Get single document by ID.
 */
function getDocumentById(id) {
  return stmtGetById.get(id);
}

/**
 * Get single document by Name.
 */
function getDocumentByName(name) {
  return stmtGetByName.get(name);
}

/**
 * Delete document by ID.
 */
function deleteDocument(id) {
  const existing = stmtGetById.get(id);
  if (!existing) return false;
  stmtDelete.run(id);
  return true;
}

/**
 * Full-Text and semantic search across documents.
 */
function searchDocuments(query, { limit = 5 } = {}) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return listDocuments().slice(0, limit);
  }

  const cleanQuery = query.trim();

  // Try FTS5 first
  try {
    // Escape double quotes and prepare query tokens
    const ftsQuery = cleanQuery
      .replace(/[^\w\s-]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `"${term}"*`)
      .join(' OR ');

    if (ftsQuery) {
      const ftsStmt = db.prepare(`
        SELECT d.id, d.name, d.size, d.type, d.category, d.word_count, d.created_at,
               snippet(documents_fts, 1, '«', '»', '...', 25) AS match_snippet,
               d.content
        FROM documents_fts f
        JOIN documents d ON f.rowid = d.rowid
        WHERE documents_fts MATCH @ftsQuery
        ORDER BY rank
        LIMIT @limit
      `);
      const results = ftsStmt.all({ ftsQuery, limit: limit || 5 });
      if (results && results.length > 0) {
        return results;
      }
    }
  } catch (err) {
    // If FTS fails on special query characters, gracefully fall back to LIKE
  }

  // Fallback to substring LIKE query
  const likeStmt = db.prepare(`
    SELECT id, name, size, type, category, word_count, created_at, content,
           substr(content, 1, 300) AS match_snippet
    FROM documents
    WHERE name LIKE '%' || @query || '%' OR content LIKE '%' || @query || '%'
    ORDER BY created_at DESC
    LIMIT @limit
  `);

  return likeStmt.all({ query: cleanQuery, limit: limit || 5 });
}

module.exports = {
  db,
  addDocument,
  listDocuments,
  getDocumentById,
  getDocumentByName,
  deleteDocument,
  searchDocuments,
  calculateWordCount,
};
