# Marnie Documentation Directory

Welcome to the comprehensive technical documentation for **Marnie** — the local AI workspace with built-in tools, autonomous multi-step deep research, local RAG (Expanded Capacity), sandboxed workspace execution, and Discord automation.

---

## Table of Contents

- [1. Architecture & Core Features](#1-architecture--core-features)
- [2. Built-in Tools](#2-built-in-tools)
- [3. Autonomous Agent Skills](#3-autonomous-agent-skills)
- [4. REST API & Integration Guides](#4-rest-api--integration-guides)

---

## 1. Architecture & Core Features

Explore the foundational subsystems and capabilities powering Marnie:

| Guide | Description |
| :--- | :--- |
| **[`features/overview.md`](features/overview.md)** | High-level system architecture, component topology, and security boundaries. |
| **[`features/brain-memory.md`](features/brain-memory.md)** | Persistent long-term memory in `workspace/BRAIN.md` with automatic 5-turn LLM consolidation. |
| **[`features/notes.md`](features/notes.md)** | Persistent on-demand working notebook and task checklists in `workspace/NOTES.md`. |
| **[`features/expanded-capacity.md`](features/expanded-capacity.md)** | Local RAG knowledge base backed by SQLite FTS5 for drag-and-drop document indexing. |
| **[`features/deep-research.md`](features/deep-research.md)** | Multi-turn autonomous web investigation, evidence gathering, drafting, and revisions. |
| **[`features/artifact-panel.md`](features/artifact-panel.md)** | In-app Claude-style live preview and code editor for HTML, JS, CSS, SVG, LaTeX, and Mermaid. |
| **[`features/chat-and-completions.md`](features/chat-and-completions.md)** | Streaming completions, conversation branching, full-text history search, and slash commands. |
| **[`features/task-manager.md`](features/task-manager.md)** | Persistent SQLite task management with priority levels and lifecycle states. |
| **[`features/cron-scheduler.md`](features/cron-scheduler.md)** | Background job scheduler for recurring Bash commands, Discord alerts, and webhooks. |
| **[`features/discord-alerts.md`](features/discord-alerts.md)** | Discord webhook alert system featuring rich embeds and color-coded severity levels. |

---

## 2. Built-in Tools

Marnie provides native execution tools that run locally on the backend:

| Tool Guide | Canonical Name | Description |
| :--- | :--- | :--- |
| **[`tools/overview.md`](tools/overview.md)** | *Tool System* | Architecture, invocation protocols (native vs fallback XML), and normalization alias map. |
| **[`tools/run-bash.md`](tools/run-bash.md)** | `run_bash` | Execute shell commands in bash/sh with repo and workspace boundary enforcement. |
| **[`tools/run-javascript.md`](tools/run-javascript.md)** | `run_javascript` | Execute JavaScript/Node.js snippets in isolated child processes with timeouts. |
| **[`tools/file-operations.md`](tools/file-operations.md)** | `create_file`, `read_file`, `write_file` | Read, create, overwrite, append, and patch line ranges inside the workspace directory. |
| **[`tools/search-filesystem.md`](tools/search-filesystem.md)** | `search_filesystem` | Recursively traverse directories matching filename substrings or regex patterns. |
| **[`tools/web-search.md`](tools/web-search.md)** | `web_search` | Search the live internet via DuckDuckGo or self-hosted SearXNG. |
| **[`tools/fetch-webpage.md`](tools/fetch-webpage.md)** | `fetch_webpage` | Scrape and clean textual body content from any public URL using Cheerio. |
| **[`tools/api-call.md`](tools/api-call.md)** | `api_call` | Perform raw HTTP/REST calls (GET, POST, PUT, PATCH, DELETE) using Axios. |
| **[`tools/brain-memory.md`](tools/brain-memory.md)** | `read_brain_memory`, `update_brain_memory` | Read and update persistent user memory in `workspace/BRAIN.md`. |
| **[`tools/notes.md`](tools/notes.md)** | `fetch_notes`, `edit_notes`, `update_notes` | Read, append, or overwrite sections in `workspace/NOTES.md`. |
| **[`tools/retrieve-expanded-capacity.md`](tools/retrieve-expanded-capacity.md)** | `retrieve_expanded_capacity` | Search or fetch full text of indexed documents in the local RAG database. |
| **[`tools/task-management.md`](tools/task-management.md)** | `create_task`, `list_tasks` | Create and filter persistent tasks in SQLite. |
| **[`tools/create-cron.md`](tools/create-cron.md)** | `create_cron` | Schedule persistent recurring background jobs using standard cron syntax. |
| **[`tools/timer-and-alerts.md`](tools/timer-and-alerts.md)** | `set_timer`, `send_alert` | Set countdown alert timers and dispatch immediate Discord embeds. |

---

## 3. Autonomous Agent Skills

High-level specifications under [`.agents/skills/`](../.agents/skills/) guiding autonomous agents through complex workflows:

| Skill Guide | Identifier | Primary Purpose |
| :--- | :--- | :--- |
| **[`skills/overview.md`](skills/overview.md)** | *Skills Framework* | Agent skill directory structure, YAML frontmatter specification, and discovery. |
| **[`skills/api-caller.md`](skills/api-caller.md)** | `api-caller` | Make custom HTTP/REST network requests with headers and payloads. |
| **[`skills/cron-scheduler.md`](skills/cron-scheduler.md)** | `cron-scheduler` | Schedule persistent background cron jobs. |
| **[`skills/deep-research.md`](skills/deep-research.md)** | `deep-research` | Multi-turn web research, citation synthesis, and iterative report writing. |
| **[`skills/discord-alerts.md`](skills/discord-alerts.md)** | `discord-alerts` | Dispatch rich embed notifications to configured Discord webhook channels. |
| **[`skills/edit-notes.md`](skills/edit-notes.md)** | `edit-notes` | Edit, update, and append tasks and working notes in `NOTES.md`. |
| **[`skills/expanded-capacity.md`](skills/expanded-capacity.md)** | `expanded-capacity` | Query reference files from the local SQLite FTS5 knowledge base. |
| **[`skills/fetch-notes.md`](skills/fetch-notes.md)** | `fetch-notes` | Retrieve on-demand user notes and task checklists from `NOTES.md`. |
| **[`skills/file-operations.md`](skills/file-operations.md)** | `file-operations` | Read, create, write, and patch local files within the workspace. |
| **[`skills/filesystem-search.md`](skills/filesystem-search.md)** | `filesystem-search` | Recursively search files and directories matching patterns. |
| **[`skills/notes.md`](skills/notes.md)** | `notes` | Lifecycle management of persistent user notebook documentation. |
| **[`skills/run-bash.md`](skills/run-bash.md)** | `run-bash` | Execute terminal commands on the host shell. |
| **[`skills/run-javascript.md`](skills/run-javascript.md)** | `run-javascript` | Run JavaScript snippets in isolated Node.js child processes. |
| **[`skills/task-manager.md`](skills/task-manager.md)** | `task-manager` | Create, list, and manage persistent tasks in SQLite. |
| **[`skills/timer.md`](skills/timer.md)** | `timer` | Set countdown timers that send notifications to Discord when expired. |
| **[`skills/web-scraper.md`](skills/web-scraper.md)** | `web-scraper` | Lightweight webpage text extraction and scraping tool using Cheerio. |
| **[`skills/web-search.md`](skills/web-search.md)** | `web-search` | Search the live web via DuckDuckGo or SearXNG. |

---

## 4. REST API & Integration Guides

- **[`API.md`](API.md)**: Exhaustive REST API reference detailing all endpoints, request bodies, query parameters, response structures, and error codes.
