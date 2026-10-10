# Agent Skills Architecture & Specification

Marnie implements an autonomous Agent Skills framework located under [`.agents/skills/`](../../.agents/skills/). Each skill packages behavioral directives, tool execution patterns, and operational guardrails to guide agents through complex workflows.

---

## 1. Skill Folder Structure

Every skill is structured as a self-contained folder under `.agents/skills/<skill-name>/`:

```
.agents/skills/<skill-name>/
├── SKILL.md            # Mandatory specification file with YAML frontmatter
├── scripts/            # (Optional) Helper automation scripts
├── examples/           # (Optional) Sample prompts and invocation patterns
└── references/         # (Optional) Supplemental API guides or schemas
```

---

## 2. YAML Frontmatter Specification

Every `SKILL.md` must start with structured metadata:

```yaml
---
name: skill-identifier
description: Concise, multi-line summary detailing the skill's capabilities, triggers, and usage context.
---
```

- **`name`**: Unique kebab-case identifier matching the directory name.
- **`description`**: Clear summary used by autonomous agent routers to determine when the skill should be activated.

---

## 3. Directory of Available Skills

| Skill | Description | Primary Underlying Tool |
| :--- | :--- | :--- |
| [`api-caller`](api-caller.md) | Raw HTTP/REST API calls (GET, POST, PUT, PATCH, DELETE) via Axios | `api_call` |
| [`cron-scheduler`](cron-scheduler.md) | Persistent background cron jobs with Bash, Discord, or webhook actions | `create_cron` |
| [`deep-research`](deep-research.md) | Multi-turn autonomous web research, citation synthesis, and revisions | Deep Research Engine |
| [`discord-alerts`](discord-alerts.md) | Rich embed alert notifications dispatched to Discord webhooks | `send_alert` |
| [`edit-notes`](edit-notes.md) | Edit, append, and organize tasks and directives in `NOTES.md` | `edit_notes` |
| [`expanded-capacity`](expanded-capacity.md) | Query and retrieve reference documents from local SQLite FTS5 RAG | `retrieve_expanded_capacity` |
| [`fetch-notes`](fetch-notes.md) | Retrieve on-demand user notes and task checklists from `NOTES.md` | `fetch_notes` |
| [`file-operations`](file-operations.md) | Read, create, write, and patch files in the sandboxed workspace | `create_file`, `read_file`, `write_file` |
| [`filesystem-search`](filesystem-search.md) | Recursive pattern and regex discovery across directories | `search_filesystem` |
| [`notes`](notes.md) | Full lifecycle management of the persistent user notebook | `fetch_notes`, `update_notes` |
| [`run-bash`](run-bash.md) | Execute terminal commands on the host system within workspace/repo | `run_bash` |
| [`run-javascript`](run-javascript.md) | Execute JavaScript code in an isolated Node.js child process | `run_javascript` |
| [`task-manager`](task-manager.md) | Persistent task checklists with priorities and status updates | `create_task`, `list_tasks` |
| [`timer`](timer.md) | Countdown timers that alert Discord upon completion | `set_timer` |
| [`web-scraper`](web-scraper.md) | Lightweight HTML scraping and readable body text extraction | `fetch_webpage` |
| [`web-search`](web-search.md) | Live web search via DuckDuckGo or SearXNG with automatic scraping | `web_search` |
