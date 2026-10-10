# Skill: `fetch-notes`

The `fetch-notes` skill retrieves persistent user notes, task lists, and reference information stored in `workspace/NOTES.md` on demand.

---

## 1. Capabilities & Triggers

### When to Activate
- Retrieving additional context, working memory, or task checklists not injected into the base prompt.
- Checking existing project tasks before starting new work.
- Reading user directives or scratchpad notes from `workspace/NOTES.md`.

### Underlying Tool
- [`fetch_notes`](../tools/notes.md)

---

## 2. Invocation Patterns

### Fetching a Specific Section
```json
{
  "name": "fetch_notes",
  "arguments": {
    "section": "Active Tasks & Checklist"
  }
}
```

### Fetching the Entire Notes File
```json
{
  "name": "fetch_notes",
  "arguments": {}
}
```

---

## 3. Best Practices & Safety

- Prefer fetching specific sections (e.g. `section: "Active Tasks"`) when you only need a portion of the notes, conserving context window space.
- Fetch notes before proposing new tasks to avoid duplicating existing checklist items.
