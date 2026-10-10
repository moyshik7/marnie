# Tools: Brain Memory (`read_brain_memory`, `update_brain_memory`)

Tools that allow the AI assistant to inspect or directly update its persistent long-term memory in `workspace/BRAIN.md`.

---

## 1. `read_brain_memory`

Reads the complete, current markdown text from `workspace/BRAIN.md`.

### Parameters
Takes no parameters (`{}`).

### Return Format
```json
{
  "filePath": "workspace/BRAIN.md",
  "content": "# User Memory & Context\n\n## User Profile\n- Name: Sayuri..."
}
```

---

## 2. `update_brain_memory`

Updates or appends new facts, preferences, or technical context about the user to the persistent `workspace/BRAIN.md` file.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `content` | `string` | **Yes** | The updated markdown memory content to store. |

### Example Invocation
```json
{
  "name": "update_brain_memory",
  "arguments": {
    "content": "# User Memory & Context\n\n## Preferences\n- Prefers TypeScript and strict linting rules."
  }
}
```

### Return Format
```json
{
  "success": true,
  "filePath": "workspace/BRAIN.md",
  "message": "Persistent memory updated successfully."
}
```
