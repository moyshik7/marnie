# Marnie API Documentation

> **Base URL**: `http://localhost:3000`  
> **Content-Type**: `application/json` (all requests and responses)  
> **Version**: 0.1.0

---

## Table of Contents

1. [Health Check](#health-check)
2. [Chat & Completions](#chat--completions)
   - [List Models](#list-models)
   - [Conversations](#conversations)
   - [Messages](#messages)
   - [Completions](#completions)
3. [Tools](#tools)
   - [Bash (Terminal)](#bash-terminal)
   - [Filesystem Search](#filesystem-search)
   - [Filesystem Stat](#filesystem-stat)
   - [Code Runner (JavaScript)](#code-runner-javascript)
   - [File Create](#file-create)
   - [File Read](#file-read)
   - [File Write](#file-write)
4. [Tasks](#tasks)
5. [Cron Jobs](#cron-jobs)
6. [Alerts & Notifications](#alerts--notifications)
7. [Error Format](#error-format)
8. [Environment Variables](#environment-variables)

---

## Health Check

### `GET /health`

Verifies the server is running.

**Response**
```json
{
  "status": "ok",
  "timestamp": "2026-10-06T16:00:00.000Z"
}
```

---

## Chat & Completions

All conversational AI endpoints are under `/api/chat`.

### List Models

#### `GET /api/chat/models`

Fetches the list of models available in the configured Ollama instance.

**Response**
```json
{
  "models": ["llama3.2", "mistral", "phi3"]
}
```

**Error** (Ollama unreachable)
```json
{ "error": "Could not reach Ollama", "detail": "connect ECONNREFUSED 127.0.0.1:11434" }
```

---

### Conversations

Conversations store the full message history and model binding.

#### `GET /api/chat/conversations`

List all conversations, newest first.

**Response**
```json
[
  {
    "id": "3b1c9f24-...",
    "title": "My project",
    "model": "llama3.2",
    "provider": "ollama",
    "created_at": 1728230400,
    "updated_at": 1728230800
  }
]
```

---

#### `POST /api/chat/conversations`

Create a new conversation.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string | no | `"New conversation"` | Human-readable title |
| `model` | string | no | `DEFAULT_MODEL` env | Ollama model to use |
| `provider` | string | no | `"ollama"` | LLM provider identifier |

**Example Request**
```json
{
  "title": "Code review session",
  "model": "llama3.2"
}
```

**Response** `201 Created`
```json
{
  "id": "3b1c9f24-1234-...",
  "title": "Code review session",
  "model": "llama3.2",
  "provider": "ollama",
  "created_at": 1728230400,
  "updated_at": 1728230400
}
```

---

#### `GET /api/chat/conversations/:id`

Fetch a single conversation including its full message history.

**Response**
```json
{
  "id": "3b1c9f24-...",
  "title": "Code review session",
  "model": "llama3.2",
  "provider": "ollama",
  "created_at": 1728230400,
  "updated_at": 1728230800,
  "messages": [
    {
      "id": "msg-uuid",
      "conversation_id": "3b1c9f24-...",
      "role": "user",
      "content": "Hello!",
      "tool_calls": null,
      "tool_call_id": null,
      "created_at": 1728230401
    },
    {
      "id": "msg-uuid-2",
      "conversation_id": "3b1c9f24-...",
      "role": "assistant",
      "content": "Hi! How can I help you today?",
      "tool_calls": null,
      "tool_call_id": null,
      "created_at": 1728230402
    }
  ]
}
```

---

#### `PATCH /api/chat/conversations/:id`

Update conversation title.

**Request Body**
```json
{ "title": "Renamed conversation" }
```

**Response** — Updated conversation object.

---

#### `DELETE /api/chat/conversations/:id`

Delete a conversation and all its messages (cascade).

**Response**
```json
{ "deleted": "3b1c9f24-..." }
```

---

### Messages

#### `GET /api/chat/conversations/:id/messages`

Fetch all messages for a conversation in chronological order.

**Response** — Array of message objects (same schema as above).

---

### Completions

#### `POST /api/chat/conversations/:id/complete`

Send a user message and receive an AI response. The message is persisted to the conversation history automatically.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `message` | string | **yes** | — | The user message to send |
| `system` | string | no | — | System prompt (prepended, not persisted) |
| `model` | string | no | conversation model | Override model for this turn |
| `options` | object | no | `{}` | Ollama generation options (temperature, top_p, etc.) |
| `stream` | boolean | no | `false` | Enable SSE streaming |

**Example Request**
```json
{
  "message": "Explain recursion in simple terms.",
  "options": { "temperature": 0.7 }
}
```

**Response (non-streaming)** `200 OK`
```json
{
  "message": {
    "id": "msg-uuid",
    "conversation_id": "3b1c9f24-...",
    "role": "assistant",
    "content": "Recursion is when a function calls itself...",
    "tool_calls": null,
    "tool_call_id": null,
    "created_at": 1728230402
  },
  "usage": {
    "eval_count": 128,
    "prompt_eval_count": 32
  }
}
```

**Response (streaming, `stream: true`)** — `Content-Type: text/event-stream`

Each server-sent event is a JSON object:
```
data: {"token":"Recursion","done":false}
data: {"token":" is","done":false}
data: {"token":" when","done":false}
...
data: {"done":true}
```

---

#### `POST /api/chat/complete`

Stateless single-turn completion — no conversation is created or persisted.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `messages` | array | **yes** | — | Array of `{role, content}` message objects |
| `model` | string | no | `DEFAULT_MODEL` | Model name |
| `options` | object | no | `{}` | Ollama generation options |
| `stream` | boolean | no | `false` | Enable SSE streaming |

**Example Request**
```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user",   "content": "What is 2+2?" }
  ]
}
```

**Response**
```json
{
  "message": { "role": "assistant", "content": "4" },
  "usage": { ... }
}
```

---

## Tools

All tool endpoints are under `/api/tools`. Tools can be called directly from the API or invoked by the AI during agentic workflows.

---

### Bash (Terminal)

#### `POST /api/tools/bash`

Execute a shell command and return stdout, stderr, and the exit code.

> **Warning**: This endpoint executes arbitrary shell commands. Restrict access appropriately.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `command` | string | **yes** | — | Shell command to execute |
| `cwd` | string | no | process cwd | Working directory |
| `timeout` | number | no | `30000` | Timeout in milliseconds |
| `env` | object | no | `{}` | Additional environment variables |

**Example Request**
```json
{
  "command": "ls -la /tmp",
  "cwd": "/home/user",
  "timeout": 5000
}
```

**Response**
```json
{
  "stdout": "total 48\n...",
  "stderr": "",
  "exitCode": 0
}
```

**Response (error / non-zero exit)**
```json
{
  "stdout": "",
  "stderr": "ls: cannot access '/nonexistent': No such file or directory",
  "exitCode": 2
}
```

---

### Filesystem Search

#### `POST /api/tools/filesystem/search`

Recursively search a directory for files matching a pattern.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `directory` | string | **yes** | — | Root directory to search |
| `pattern` | string | no | `""` | Substring or regex pattern to match filenames |
| `useRegex` | boolean | no | `false` | Treat `pattern` as a regular expression |
| `maxDepth` | number | no | `10` | Max directory traversal depth |
| `maxResults` | number | no | `200` | Max number of results to return |

**Example Request**
```json
{
  "directory": "/home/user/project",
  "pattern": ".ts",
  "maxDepth": 5
}
```

**Response**
```json
{
  "matches": [
    "/home/user/project/src/index.ts",
    "/home/user/project/src/utils.ts"
  ],
  "truncated": false
}
```

**Regex Example**
```json
{
  "directory": "/home/user",
  "pattern": "^config\\.(json|yaml)$",
  "useRegex": true
}
```

---

### Filesystem Stat

#### `POST /api/tools/filesystem/stat`

Get metadata about a file or directory.

**Request Body**
```json
{ "path": "/home/user/project/README.md" }
```

**Response**
```json
{
  "path": "/home/user/project/README.md",
  "isFile": true,
  "isDirectory": false,
  "size": 2048,
  "mtime": "2026-10-06T12:00:00.000Z",
  "ctime": "2026-10-01T09:00:00.000Z"
}
```

---

### Code Runner (JavaScript)

#### `POST /api/tools/code/run`

Execute a JavaScript snippet in a sandboxed child Node.js process. The process is isolated and cannot affect the main server.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `code` | string | **yes** | — | JavaScript source code to execute |
| `timeout` | number | no | `15000` | Timeout in milliseconds |
| `env` | object | no | `{}` | Additional environment variables |

**Example Request**
```json
{
  "code": "const arr = [1,2,3]; console.log(arr.reduce((a,b) => a+b, 0));"
}
```

**Response**
```json
{
  "stdout": "6\n",
  "stderr": "",
  "exitCode": 0
}
```

**Error Example**
```json
{
  "stdout": "",
  "stderr": "ReferenceError: foo is not defined\n    at ...",
  "exitCode": 1
}
```

---

### File Create

#### `POST /api/tools/file/create`

Create a new local file with optional initial content. Parent directories are created automatically.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `filePath` | string | **yes** | — | Absolute or relative path for the new file |
| `content` | string | no | `""` | Initial file content |
| `overwrite` | boolean | no | `false` | Overwrite if file already exists |

**Example Request**
```json
{
  "filePath": "/workspace/notes/hello.txt",
  "content": "Hello, world!\n"
}
```

**Response** `201 Created`
```json
{
  "path": "/workspace/notes/hello.txt",
  "created": true
}
```

**Error** `409 Conflict` (file exists, `overwrite` not set)
```json
{ "error": "File already exists: /workspace/notes/hello.txt" }
```

---

### File Read

#### `POST /api/tools/file/read`

Read the full content of a file, or a specific line range (1-based, inclusive).

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `filePath` | string | **yes** | — | Path to the file |
| `startLine` | number | no | `1` | First line to return (1-based) |
| `endLine` | number | no | last line | Last line to return (inclusive) |

**Example: Full read**
```json
{ "filePath": "/workspace/notes/hello.txt" }
```

**Response**
```json
{
  "path": "/workspace/notes/hello.txt",
  "content": "Hello, world!\n",
  "totalLines": 2,
  "startLine": null,
  "endLine": null
}
```

**Example: Line range (lines 10–20)**
```json
{
  "filePath": "/workspace/src/app.js",
  "startLine": 10,
  "endLine": 20
}
```

**Response**
```json
{
  "path": "/workspace/src/app.js",
  "content": "// lines 10 to 20 here...",
  "totalLines": 200,
  "startLine": 10,
  "endLine": 20
}
```

---

### File Write

#### `POST /api/tools/file/write`

Write content to a file. Supports three modes:

| Mode | When to use |
|---|---|
| **Full overwrite** | No `startLine`/`endLine`, `append: false` |
| **Line-range replace** | `startLine` and/or `endLine` provided — reads existing file first |
| **Append** | `append: true` — content is appended to end of file |

> **Note**: For line-range mode, the API always reads the current file before writing. The previous content is returned in the response so you can verify what changed.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `filePath` | string | **yes** | — | Path to the file |
| `content` | string | **yes** | — | Content to write |
| `startLine` | number | no | — | First line to replace (1-based) |
| `endLine` | number | no | — | Last line to replace (1-based, inclusive) |
| `append` | boolean | no | `false` | Append to end of file |

**Example: Full overwrite**
```json
{
  "filePath": "/workspace/notes/hello.txt",
  "content": "New content entirely.\n"
}
```

**Response**
```json
{
  "path": "/workspace/notes/hello.txt",
  "totalLines": 2,
  "previousContent": "Hello, world!\n"
}
```

**Example: Replace lines 5–7**
```json
{
  "filePath": "/workspace/src/app.js",
  "content": "// replaced line 5\n// replaced line 6",
  "startLine": 5,
  "endLine": 7
}
```

**Response**
```json
{
  "path": "/workspace/src/app.js",
  "totalLines": 201,
  "previousContent": "// old line 5\n// old line 6\n// old line 7"
}
```

**Example: Append**
```json
{
  "filePath": "/workspace/log.txt",
  "content": "\n[2026-10-06] Event logged.",
  "append": true
}
```

**Response**
```json
{
  "path": "/workspace/log.txt",
  "totalLines": 50,
  "previousContent": null
}
```

---

## Tasks

Task management endpoints are under `/api/tasks`.

### Task Object

```json
{
  "id": "uuid",
  "title": "Fix the login bug",
  "description": "Users can't log in with special characters in their password.",
  "status": "pending",
  "priority": "high",
  "due_at": 1728230400,
  "created_at": 1728144000,
  "updated_at": 1728144000
}
```

**Status values**: `pending` | `in_progress` | `done` | `cancelled`  
**Priority values**: `low` | `medium` | `high`

---

#### `GET /api/tasks`

List all tasks, sorted by priority then due date.

**Query Parameters**

| Parameter | Description |
|---|---|
| `status` | Filter by status: `pending`, `in_progress`, `done`, `cancelled` |

**Example**
```
GET /api/tasks?status=pending
```

**Response** — Array of task objects.

---

#### `POST /api/tasks`

Create a new task.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string | **yes** | — | Task title |
| `description` | string | no | `""` | Detailed description |
| `status` | string | no | `"pending"` | Initial status |
| `priority` | string | no | `"medium"` | Priority level |
| `due_at` | number | no | `null` | Unix timestamp deadline |

**Example Request**
```json
{
  "title": "Write API tests",
  "description": "Cover all /api/tools endpoints",
  "priority": "high",
  "due_at": 1728403200
}
```

**Response** `201 Created` — Created task object.

---

#### `GET /api/tasks/:id`

Get a single task by ID.

**Response** — Task object or `404`.

---

#### `PATCH /api/tasks/:id`

Partially update a task. All fields are optional; omitted fields are unchanged.

**Request Body**
```json
{ "status": "in_progress", "priority": "high" }
```

**Response** — Updated task object.

---

#### `DELETE /api/tasks/:id`

Delete a task permanently.

**Response**
```json
{ "deleted": "task-uuid" }
```

---

## Cron Jobs

Scheduled job management under `/api/cron`. Jobs persist across server restarts.

### Cron Job Object

```json
{
  "id": "uuid",
  "name": "Daily report",
  "expression": "0 9 * * *",
  "action_type": "discord",
  "action_data": "{\"message\":\"Good morning! Daily standup time.\"}",
  "enabled": 1,
  "last_run": 1728230400,
  "created_at": 1728144000
}
```

**Action Types**

| `action_type` | `action_data` fields |
|---|---|
| `bash` | `{ command, cwd? }` |
| `discord` | `{ message, webhookUrl?, level?, username? }` |
| `http` | `{ url, method?, body?, headers? }` |

---

#### `GET /api/cron`

List all cron jobs.

---

#### `POST /api/cron`

Create a new cron job.

**Request Body**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **yes** | Human-readable job name |
| `expression` | string | **yes** | Standard 5-field cron expression |
| `action_type` | string | **yes** | `bash` \| `discord` \| `http` |
| `action_data` | object | **yes** | Action-specific parameters |

**Example: Discord reminder every day at 9am**
```json
{
  "name": "Morning standup reminder",
  "expression": "0 9 * * *",
  "action_type": "discord",
  "action_data": {
    "message": "@here Time for the daily standup!",
    "level": "info"
  }
}
```

**Example: Run backup script every 6 hours**
```json
{
  "name": "Database backup",
  "expression": "0 */6 * * *",
  "action_type": "bash",
  "action_data": {
    "command": "/scripts/backup.sh",
    "cwd": "/opt/app"
  }
}
```

**Response** `201 Created` — Created cron job object.

---

#### `GET /api/cron/:id`

Get a single cron job by ID.

---

#### `PATCH /api/cron/:id`

Update a cron job. Updating restarts the active scheduler with the new settings.

**Request Body** — Any subset of `name`, `expression`, `action_type`, `action_data`, `enabled`.

---

#### `DELETE /api/cron/:id`

Delete a cron job and stop it immediately.

**Response**
```json
{ "deleted": "cron-uuid" }
```

---

#### `POST /api/cron/:id/pause`

Pause a running cron job without deleting it.

**Response** — Updated cron job object with `enabled: 0`.

---

#### `POST /api/cron/:id/resume`

Resume a paused cron job.

**Response** — Updated cron job object with `enabled: 1`.

---

## Alerts & Notifications

Send alerts to Discord via webhooks. Configure a default webhook in the `DISCORD_WEBHOOK_URL` environment variable, or pass `webhookUrl` per request.

---

#### `POST /api/alerts/send`

Send a raw Discord message or embed.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `message` | string | yes* | — | Plain-text message content |
| `embeds` | array | yes* | — | Discord embed objects (overrides plain text) |
| `webhookUrl` | string | no | env var | Discord webhook URL |
| `username` | string | no | `"Marnie"` | Bot display name |
| `avatarUrl` | string | no | — | Bot avatar image URL |
| `level` | string | no | `"info"` | Colour theme: `info` \| `success` \| `warning` \| `error` |

*At least one of `message` or `embeds` is required.

**Level → Embed colour mapping**

| Level | Colour |
|---|---|
| `info` | Blue `#5865F2` |
| `success` | Green `#57F287` |
| `warning` | Yellow `#FEE75C` |
| `error` | Red `#ED4245` |

**Example: Plain message**
```json
{
  "message": "Deployment to production completed successfully.",
  "level": "success"
}
```

**Example: Custom embed**
```json
{
  "message": "",
  "embeds": [
    {
      "title": "Build Failed",
      "description": "The CI pipeline failed on step `npm test`.",
      "fields": [
        { "name": "Branch", "value": "main", "inline": true },
        { "name": "Commit", "value": "abc1234", "inline": true }
      ]
    }
  ],
  "level": "error"
}
```

**Response**
```json
{ "sent": true }
```

---

#### `POST /api/alerts/notify`

Send a structured notification with a title and body as a Discord embed.

**Request Body**

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | string | **yes** | — | Embed title |
| `body` | string | **yes** | — | Embed description |
| `level` | string | no | `"info"` | Colour theme |
| `webhookUrl` | string | no | env var | Override webhook URL |
| `username` | string | no | `"Marnie"` | Bot display name |

**Example Request**
```json
{
  "title": "Task Completed",
  "body": "The nightly data export finished processing 12,400 records.",
  "level": "success"
}
```

**Response**
```json
{ "sent": true }
```

---

## Settings & Workspace Configuration

Settings endpoints are under `/api/settings`. All values are persisted in the SQLite `settings` table.

#### `GET /api/settings`

Retrieve all current workspace settings.

**Response**
```json
{
  "settings": {
    "ollama_base_url": "http://localhost:11434",
    "default_model": "llama3.2",
    "discord_webhook_url": "https://discord.com/api/webhooks/...",
    "searxng_url": "http://localhost:8080",
    "deep_research_enabled": "false",
    "agent_mode_enabled": "true",
    "system_prompt": "You are Marnie, an intelligent AI workspace assistant..."
  },
  "updated_at": 1728230400
}
```

---

#### `PATCH /api/settings`

Update one or more settings in the SQLite database.

**Request Body**
```json
{
  "ollama_base_url": "http://192.168.1.50:11434",
  "default_model": "llama3.2",
  "discord_webhook_url": "https://discord.com/api/webhooks/1234/token",
  "searxng_url": "http://localhost:8080",
  "deep_research_enabled": "true",
  "agent_mode_enabled": "true"
}
```

**Response** `200 OK`
```json
{
  "success": true,
  "updatedKeys": ["ollama_base_url", "default_model"],
  "settings": { ... }
}
```

---

#### `POST /api/settings/test-ollama`

Verify connectivity to an Ollama server and list available models.

**Request Body** (optional `url`, defaults to configured setting)
```json
{
  "url": "http://localhost:11434"
}
```

**Response**
```json
{
  "ok": true,
  "url": "http://localhost:11434",
  "models": ["llama3.2", "mistral", "codellama"],
  "message": "Connected to Ollama! Found 3 model(s)."
}
```

---

#### `POST /api/settings/test-discord`

Send a test verification notification to a Discord webhook.

**Request Body** (optional `webhookUrl`, defaults to configured setting)
```json
{
  "webhookUrl": "https://discord.com/api/webhooks/..."
}
```

**Response**
```json
{
  "ok": true,
  "message": "Test alert sent successfully to Discord!"
}
```

---

## React Frontend

The React frontend provides a Claude-inspired UI (ivory/warm charcoal palette, serif editorial headings, collapsible history sidebar, and streaming chat card).

### Features
- **Claude Web Theme**: Warm parchment (`#FAF9F5`) and warm dark mode (`#1F1E1C`) with terracotta accents.
- **Persistent Chat Memory**: Conversations and full message histories are stored and retrieved from SQLite (`better-sqlite3`).
- **Interactive Settings Modal**: Test and configure Ollama base routes, select models, test Discord webhooks with live test pings, and customize system prompts.
- **Future Roadmap Controls**: Toggles and settings for SearXNG private search, Deep Research, and Sub-Agent spawning modes.
- **System Tools & Tasks Drawer**: Direct interaction with tasks, recurring crons, bash command runner, JS child-process sandbox, and filesystem search.
- **Unified Serving**: The built frontend in `frontend/dist` is served directly by the Express backend on `http://localhost:3000/`.

### Development
```bash
# Start frontend in Vite dev mode (with API proxy)
npm run frontend:dev

# Build production frontend bundle
npm run frontend:build
```

---

## Error Format

All errors follow a consistent JSON format:

```json
{
  "error": "Human-readable error message"
}
```

Some errors include additional detail:

```json
{
  "error": "LLM provider error",
  "detail": "connect ECONNREFUSED 127.0.0.1:11434"
}
```

**Common HTTP status codes**

| Code | Meaning |
|---|---|
| `200` | Success |
| `201` | Created |
| `400` | Bad Request — missing or invalid fields |
| `404` | Not Found — resource does not exist |
| `409` | Conflict — e.g. file already exists |
| `500` | Internal Server Error |
| `502` | Bad Gateway — upstream provider (Ollama) error |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port the server listens on |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API base URL |
| `DEFAULT_MODEL` | `llama3.2` | Default LLM model name |
| `DISCORD_WEBHOOK_URL` | — | Default Discord webhook URL for alerts |
| `WORKSPACE_DIR` | `./workspace` | Root directory for file tool operations |
| `DB_PATH` | `./data/marnie.db` | SQLite database file path |

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

---

*Marnie v0.1.0 — Self-Hosted AI Workspace Backend*
