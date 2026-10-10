# Tool: `search_filesystem`

Recursively searches files and subdirectories matching a filename substring or regular expression pattern.

---

## 1. Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `directory` | `string` | **Yes** | Target directory path to start recursive traversal (e.g. `workspace`, `src`). |
| `pattern` | `string` | No | Substring or regex pattern to match against file paths and names. If omitted, lists all files. |

---

## 2. Behavior & Filtering

- **Recursion**: Scans the target directory recursively up to a safe depth limit.
- **Ignored Directories**: Automatically skips heavy build and package directories:
  - `node_modules`
  - `.git`
  - `dist`
  - `coverage`
- **Output Capping**: Limits the returned results array to 500 entries to prevent memory exhaustion and excessive context bloat.

---

## 3. Example Invocation

```json
{
  "name": "search_filesystem",
  "arguments": {
    "directory": "workspace",
    "pattern": "\\.md$"
  }
}
```

---

## 4. Return Format

```json
{
  "directory": "workspace",
  "pattern": "\\.md$",
  "matches": [
    "workspace/BRAIN.md",
    "workspace/NOTES.md",
    "workspace/research/summary.md"
  ],
  "totalMatches": 3
}
```
