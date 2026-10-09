---
name: edit-notes
description: >-
  Edit, update, and append tasks, checklists, directives, and working notes in workspace/NOTES.md.
  Use when persisting important context, user preferences, multi-step progress, checklists, or reference information.
---

# Edit Notes Skill

Provides persistent write and update capabilities for the dedicated AI and user notebook stored at `workspace/NOTES.md`.

Unlike `BRAIN.md` (which is automatically injected into prompts and consolidated every 5 conversation messages), `NOTES.md` is a larger working notebook that is NOT injected into prompts by default. The AI agent uses `update_notes` (or `edit_notes`) to proactively save important items, checklists, and reference context, and uses `fetch_notes` to retrieve them on demand.

## Tools Included

### 1. `edit_notes` / `update_notes`
Edit, replace, or append markdown content to `workspace/NOTES.md`.

#### Parameters
- `content` (*string*, optional): Full markdown document to replace the contents of `workspace/NOTES.md`.
- `text` (*string*, optional): Single note, task item, or checklist line to append to `workspace/NOTES.md`.
- `append` (*boolean*, optional): Whether to append to notes instead of overwriting. Defaults to `true` if `text` is provided and `content` is omitted.
- `section` (*string*, optional): Section header under which appended text should be placed (e.g. `"Active Tasks & Checklist"`).

#### Tool Aliases Supported
- `edit_notes`
- `update_notes`
- `notes_edit`
- `notes_update`
- `add_note`
- `add_notes`
- `save_notes`
- `append_notes`
- `write_notes`

---

## Usage Examples

### Appending a Task to the Checklist
```json
<tool_call>
{
  "name": "edit_notes",
  "arguments": {
    "text": "- [ ] Refactor API client error handling",
    "section": "Active Tasks & Checklist",
    "append": true
  }
}
</tool_call>
```

### Appending Multiple Notes or Findings
```json
<tool_call>
{
  "name": "update_notes",
  "arguments": {
    "text": "User prefers Node.js ESM format and Tailwind CSS for styling.",
    "append": true
  }
}
</tool_call>
```

### Overwriting Full Notes Document
```json
<tool_call>
{
  "name": "edit_notes",
  "arguments": {
    "content": "# AI NOTES & TASKS\n\n## Active Tasks & Checklist\n- [ ] Task 1\n- [x] Task 2\n\n## Project Directives\n- Keep models configured to llama3.2 by default.\n"
  }
}
</tool_call>
```

---

## Related Skills
- [fetch-notes](../fetch-notes/SKILL.md) - Retrieve notes and task lists on demand.
- [notes](../notes/SKILL.md) - Notes management overview.
