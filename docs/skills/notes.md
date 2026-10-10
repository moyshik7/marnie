# Skill: `notes`

The `notes` skill provides comprehensive lifecycle management for the persistent working notebook located at `workspace/NOTES.md`.

---

## 1. Capabilities & Triggers

### When to Activate
- Inspecting, fetching, updating, or rewriting the user's workspace notes.
- Managing project checklists and action items.
- Recording technical architecture decisions and scratchpad references.

### Underlying Tools
- [`fetch_notes`](../tools/notes.md)
- [`update_notes`](../tools/notes.md)
- [`edit_notes`](../tools/notes.md)

---

## 2. Invocation Patterns

### Reading Notes with Section Filtering
```json
{
  "name": "fetch_notes",
  "arguments": {
    "section": "Active Tasks"
  }
}
```

### Appending Items to a Checklist
```json
{
  "name": "update_notes",
  "arguments": {
    "text": "- [x] Finished documentation rewrite",
    "section": "Active Tasks",
    "append": true
  }
}
```

---

## 3. Best Practices & Safety

- `NOTES.md` is not injected into every prompt by default, which preserves model context space.
- Proactively use `fetch_notes` when resuming work on ongoing projects to regain historical context.
- Use `update_notes` to record important user preferences or decisions made during the session.
