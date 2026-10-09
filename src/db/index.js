'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/marnie.db';
const dbDir = path.dirname(path.resolve(DB_PATH));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(path.resolve(DB_PATH));

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ────────────────────────────────────────
// Schema bootstrap
// ────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id          TEXT PRIMARY KEY,
    title       TEXT,
    model       TEXT NOT NULL,
    provider    TEXT NOT NULL DEFAULT 'ollama',
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id              TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK(role IN ('system','user','assistant','tool')),
    content         TEXT NOT NULL,
    tool_calls      TEXT,
    tool_call_id    TEXT,
    created_at      INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done','cancelled')),
    priority    TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
    due_at      INTEGER,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS cron_jobs (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    expression  TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_data TEXT NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    last_run    INTEGER,
    created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL,
    updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS deep_researches (
    id            TEXT PRIMARY KEY,
    topic         TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('pending','in_progress','completed','failed','cancelled')),
    model         TEXT,
    min_revisions INTEGER NOT NULL DEFAULT 1,
    max_revisions INTEGER NOT NULL DEFAULT 3,
    max_results   INTEGER NOT NULL DEFAULT 5,
    summary       TEXT,
    report        TEXT,
    logs          TEXT,
    sources       TEXT,
    error         TEXT,
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at    INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`);

try { db.exec("ALTER TABLE deep_researches ADD COLUMN image TEXT;"); } catch (_) {}
try { db.exec("ALTER TABLE deep_researches ADD COLUMN duration TEXT;"); } catch (_) {}
try { db.exec("ALTER TABLE deep_researches ADD COLUMN rounds INTEGER;"); } catch (_) {}
try { db.exec("ALTER TABLE deep_researches ADD COLUMN queries INTEGER;"); } catch (_) {}
try { db.exec("ALTER TABLE deep_researches ADD COLUMN urls_analyzed INTEGER;"); } catch (_) {}
try { db.exec("ALTER TABLE deep_researches ADD COLUMN slug TEXT;"); } catch (_) {}

// Seed default settings if not exists
const seedStmt = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);
seedStmt.run('ollama_base_url', process.env.OLLAMA_BASE_URL || 'http://localhost:11434');
seedStmt.run('default_model', process.env.DEFAULT_MODEL || 'llama3.2');
seedStmt.run('discord_webhook_url', process.env.DISCORD_WEBHOOK_URL || '');
seedStmt.run('searxng_url', process.env.SEARXNG_URL || 'http://localhost:8080');
seedStmt.run('search_provider', process.env.SEARCH_PROVIDER || 'duckduckgo');
seedStmt.run('deep_research_enabled', 'false');
seedStmt.run('agent_mode_enabled', 'true');
seedStmt.run('brain_enabled', 'true');
seedStmt.run('system_prompt', 'You are Marnie, an autonomous self-hosted AI workspace assistant (like Odysseus). You operate in a real environment with direct access to bash commands, Node.js code runner, filesystem search, file editing, SQLite tasks, web search, and Discord alerts. Never refuse execution by saying you are an AI without access to an environment; always execute user requests using your tools. When searching the web, keep search terms short and concise (strictly 2 to 5 words) for optimal results, and always use the retrieved results to deliver a complete answer. Use less emojis: do not use any emojis unless strictly necessary or explicitly requested. Provide clear mermaid diagrams enclosed in ```mermaid code blocks whenever illustrating workflows, architectures, processes, or systems. You can keep important things, user preferences, tasks, and working directives in workspace/NOTES.md using update_notes (or edit_notes), and fetch_notes can be used to fetch notes whenever you need additional context.');

module.exports = db;
