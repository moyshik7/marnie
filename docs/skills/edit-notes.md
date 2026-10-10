# Skill: `edit-notes`

The `edit-notes` skill allows the agent to edit, update, or append notes, tasks, directives, and checklist items in `workspace/NOTES.md`.

---

## 1. Capabilities & Triggers

### When to Activate
- Persisting important findings, decisions, or user instructions so they survive across turns.
- Updating multi-step execution plans and marking checklist items as completed.
- Adding technical notes or scratchpad references to `workspace/NOTES.md`.

### Underlying Tool
- [`edit_notes`](../tools/notes.md)

---

## 2. Invocation Patterns

### Appending to a Specific Section
```json
{
  "name": "edit_notes",
  "arguments": {
    "text": "- [x] Migrate Express 5 wildcard routes",
    "section": "Active Tasks & Checklist",
    "append": true
  }
}
```

### Overwriting Full Notes Content
```json
{
  "name": "edit_notes",
  "arguments": {
    "content": "# Marnie Workspace Notes\n\n## Active Tasks\n- [ ] Configure database backups\n"
  }
}
```

---

## 3. Best Practices & Safety

- Use `append: true` with a target `section` to avoid unintentionally overwriting the user's existing notes.
- Use standard Markdown checklist syntax (`- [ ]` and `- [x]`) for tasks.
- Keep headings organized and consistent with the existing `NOTES.md` structure.
