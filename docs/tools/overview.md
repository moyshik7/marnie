# Tool Calling System Overview

Marnie equips local LLMs with native execution tools. Unlike cloud assistants that simulate actions in text, Marnie executes tools directly in the backend and returns real outputs (stdout, stderr, JSON objects) back to the agent for synthesis.

---

## 1. Tool Call Protocols

Marnie supports dual tool-call invocation protocols:

### A. Ollama Native Function Calling
When models support native tool calling (e.g., Llama 3.1+, Mistral Large, Qwen 2.5), Marnie passes standard JSON Schema tool definitions (`OLLAMA_TOOLS` in `src/components/tools/registry.js`). The model emits structured `tool_calls` objects which are executed automatically.

### B. Inline Block Fallback Parsing
For models that do not support native function calling or when function calling is disabled, the system prompt instructs the model to emit tool call blocks in either of these formats:

```xml
<tool_call>
{"name": "run_bash", "arguments": {"command": "uptime"}}
</tool_call>
```

or

```json
```tool_call
{
  "name": "read_file",
  "arguments": {
    "filePath": "index.html"
  }
}
```
```

The backend parser (`parseToolCalls()`) extracts these blocks, executes the requested tool, and injects the output as a role `tool` response before generating the final reply.

---

## 2. Tool Normalization & Alias Mapping

To ensure reliability across diverse model vocabularies, `src/components/tools/registry.js` maps common tool aliases to canonical tool names:

| Canonical Tool | Supported Aliases |
| :--- | :--- |
| `run_bash` | `bash`, `terminal` |
| `run_javascript` | `javascript`, `js`, `code_run` |
| `search_filesystem` | `search_file`, `search_files`, `find_files` |
| `create_file` | `file_create` |
| `read_file` | `file_read` |
| `write_file` | `file_write` |
| `create_task` | `task_create` |
| `list_tasks` | `task_list` |
| `create_cron` | `cron_create` |
| `send_alert` | `discord_alert` |
| `set_timer` | `timer`, `create_timer`, `countdown` |
| `web_search` | `search`, `duckduckgo`, `searxng`, `google` |
| `fetch_webpage` | `scrape_webpage`, `scrape_url`, `fetch_url`, `scrape` |
| `api_call` | `api`, `http_request`, `curl`, `http`, `fetch`, `request` |
| `read_brain_memory` | `read_brain`, `read_memory`, `get_brain`, `get_memory` |
| `update_brain_memory` | `update_brain`, `save_brain`, `save_memory`, `write_brain` |
| `fetch_notes` | `get_notes`, `read_notes`, `notes`, `notes_read`, `notes_fetch` |
| `edit_notes` | `notes_edit`, `add_note`, `add_notes` |
| `update_notes` | `save_notes`, `append_notes`, `write_notes`, `notes_update` |
| `retrieve_expanded_capacity` | `expanded_capacity`, `query_expanded_capacity`, `search_expanded_capacity`, `retrieve_capacity`, `capacity_search`, `rag_search` |

---

## 3. Directory of Tools

| Tool Name | Primary Purpose |
| :--- | :--- |
| [`run_bash`](run-bash.md) | Execute host terminal commands in bash/sh |
| [`run_javascript`](run-javascript.md) | Execute JavaScript code in an isolated Node.js child process |
| [`create_file`](file-operations.md) | Create a new file strictly inside the workspace directory |
| [`read_file`](file-operations.md) | Read local workspace or repository file contents |
| [`write_file`](file-operations.md) | Write, overwrite, replace lines, or append to workspace files |
| [`search_filesystem`](search-filesystem.md) | Recursively search files and directories matching regex/patterns |
| [`web_search`](web-search.md) | Live internet search via DuckDuckGo or SearXNG |
| [`fetch_webpage`](fetch-webpage.md) | Lightweight text scraping from a given URL using Cheerio |
| [`api_call`](api-call.md) | Make raw HTTP/REST calls with custom headers and body |
| [`read_brain_memory`](brain-memory.md) | Read persistent user memory from `workspace/BRAIN.md` |
| [`update_brain_memory`](brain-memory.md) | Update persistent user memory in `workspace/BRAIN.md` |
| [`fetch_notes`](notes.md) | Fetch user notes and checklists from `workspace/NOTES.md` |
| [`edit_notes`](notes.md) | Edit, append, or modify tasks in `workspace/NOTES.md` |
| [`update_notes`](notes.md) | Overwrite or append information in `workspace/NOTES.md` |
| [`retrieve_expanded_capacity`](retrieve-expanded-capacity.md) | Query and retrieve reference documents from local RAG |
| [`create_task`](task-management.md) | Create a persistent task in SQLite |
| [`list_tasks`](task-management.md) | List persistent tasks filtered by status |
| [`create_cron`](create-cron.md) | Register a persistent recurring cron schedule |
| [`set_timer`](timer-and-alerts.md) | Set a countdown timer that notifies Discord on expiration |
| [`send_alert`](timer-and-alerts.md) | Send an immediate Discord alert embed |
