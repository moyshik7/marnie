# Tools: Notes (`fetch_notes`, `edit_notes`, `update_notes`)

Tools that manage the persistent working notebook and checklist stored at `workspace/NOTES.md`.

---

## 1. `fetch_notes`

Retrieves user notes, checklists, and reference data from `workspace/NOTES.md`. Supports extracting specific sections via heading matching to minimize context usage.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `section` | `string` | No | Target section header to extract (e.g., `"Active Tasks"`, `"Architecture Decisions"`). If omitted, returns entire note file. |

### Example
```json
{
  "name": "fetch_notes",
  "arguments": {
    "section": "Active Tasks"
  }
}
```

---

## 2. `edit_notes` / `update_notes`

Updates, appends, or edits notes, checklists, and reference information in `workspace/NOTES.md`.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `content` | `string` | No | Complete markdown content to overwrite the entire file with. |
| `text` | `string` | No | Specific text note or task bullet point to append. |
| `append` | `boolean` | No | If `true`, appends text instead of overwriting. (Defaults to `true` if `text` is provided). |
| `section` | `string` | No | Target section header under which to append the item. |

### Example Invocation
```json
{
  "name": "edit_notes",
  "arguments": {
    "text": "- [ ] Validate SQLite FTS5 index performance",
    "section": "Active Tasks",
    "append": true
  }
}
```

### Return Format
```json
{
  "success": true,
  "filePath": "workspace/NOTES.md",
  "totalLines": 42,
  "message": "Notes updated successfully in workspace/NOTES.md."
}
```
