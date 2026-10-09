---
name: fetch-notes
description: >-
  Fetch and update persistent user notes, task checklists, and reference information stored in workspace/NOTES.md.
  Use when needing additional context, working memory, or user task lists that are not injected into the prompt by default.
---

# Fetch Notes Skill

Provides on-demand access to the dedicated user and AI working notebook stored at `workspace/NOTES.md`.

Unlike `BRAIN.md` (which is small and auto-injected with every prompt), `NOTES.md` is designed to be larger and holds detailed task checklists, project specifications, architectural decisions, and working scratchpad data. It is retrieved by the AI agent on-demand via this skill.

## Tools Included

### 1. `fetch_notes`
Fetch current notes, task lists, or a specific section from `workspace/NOTES.md`.

```json
<tool_call>
{
  "name": "fetch_notes",
  "arguments": {
    "section": "Active Tasks"
  }
}
</tool_call>
```

Aliases supported:
- `fetch_notes`
- `get_notes`
- `read_notes`
- `notes`
- `notes_fetch`

### 2. `update_notes`
Overwrite or append tasks and notes into `workspace/NOTES.md`.

Append a task to the checklist:
```json
<tool_call>
{
  "name": "update_notes",
  "arguments": {
    "text": "- [ ] Implement dark mode support for Notes viewer",
    "append": true
  }
}
</tool_call>
```

Overwrite with updated notes document:
```json
<tool_call>
{
  "name": "update_notes",
  "arguments": {
    "content": "# AI NOTES & TASKS\n\n## Active Tasks\n- [x] Complete task\n"
  }
}
</tool_call>
```

Aliases supported:
- `update_notes`
- `save_notes`
- `append_notes`
- `write_notes`

## Storage & In-App UI
- **Location:** `workspace/NOTES.md`
- **UI:** Visible and editable in real-time in the Marnie UI via the left sidebar **Notes** button (above Deep Research) or in the Claude-style Artifact panel.
- **API Endpoints:** `GET /api/notes`, `PUT /api/notes`, `POST /api/notes/append`.
