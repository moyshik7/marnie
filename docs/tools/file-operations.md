# Tools: File Operations (`create_file`, `read_file`, `write_file`)

Marnie provides granular tools for interacting with files on disk while enforcing strict confinement to prevent modifying files outside the workspace directory.

---

## 1. `create_file`

Creates a new local file strictly in the `workspace/` directory with initial content. If parent subdirectories do not exist, they are created automatically.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `filePath` | `string` | **Yes** | Relative path to the file within workspace (e.g. `index.html`, `src/app.js`). |
| `content` | `string` | No | Initial file content. Defaults to empty string. |
| `overwrite` | `boolean` | No | If `true`, overwrites existing file. Defaults to `false` (throws an error if file exists). |

### Example
```json
{
  "name": "create_file",
  "arguments": {
    "filePath": "app.js",
    "content": "console.log('Hello Marnie!');",
    "overwrite": true
  }
}
```

---

## 2. `read_file`

Reads content from a local file in the workspace or repository. Supports reading either the complete file or a specific 1-based line range.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `filePath` | `string` | **Yes** | Relative path to the file to inspect. |
| `startLine` | `number` | No | 1-based start line number. |
| `endLine` | `number` | No | 1-based end line number (inclusive). |

### Example
```json
{
  "name": "read_file",
  "arguments": {
    "filePath": "NOTES.md",
    "startLine": 1,
    "endLine": 25
  }
}
```

---

## 3. `write_file`

Writes, appends, or patches specific line ranges in an existing workspace file. Strictly restricted to `workspace/`.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `filePath` | `string` | **Yes** | Relative path to the target file. |
| `content` | `string` | **Yes** | Content to write, append, or replace. |
| `startLine` | `number` | No | 1-based line number where replacement starts. |
| `endLine` | `number` | No | 1-based line number where replacement ends (inclusive). |
| `append` | `boolean` | No | If `true`, appends `content` to the end of the file. |

### Operational Modes

1. **Full Overwrite Mode** (default when `startLine`, `endLine`, and `append` are omitted):
   Replaces the entire file content.
2. **Line Range Replacement Mode** (`startLine` and `endLine` provided):
   Slices out lines `[startLine..endLine]` and inserts `content` in their place, preserving the remainder of the file.
3. **Append Mode** (`append: true`):
   Appends `content` to the end of the file.

---

## 4. Security Enforcement

All write and creation operations must resolve strictly within `workspace/`. Any path containing escape sequences such as `../` that resolves outside `WORKSPACE_DIR` triggers a `403 Forbidden` exception:
```json
{ "error": "Access denied: Path escapes workspace directory" }
```
