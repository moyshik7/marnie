# Skill: `file-operations`

The `file-operations` skill allows the agent to inspect, create, update, and patch local files within the sandboxed `workspace/` directory.

---

## 1. Capabilities & Triggers

### When to Activate
- Inspecting code or configuration files in the workspace or repo.
- Creating new source code files, web apps, or Markdown documents.
- Appending content or patching specific line ranges in existing files.
- Modifying files that will be previewed or edited in the Artifact Panel.

### Underlying Tools
- [`create_file`](../tools/file-operations.md)
- [`read_file`](../tools/file-operations.md)
- [`write_file`](../tools/file-operations.md)

---

## 2. Invocation Patterns

### Creating a New File
```json
{
  "name": "create_file",
  "arguments": {
    "filePath": "src/index.html",
    "content": "<!DOCTYPE html><html><body><h1>Hello Marnie</h1></body></html>",
    "overwrite": true
  }
}
```

### Reading Line Ranges
```json
{
  "name": "read_file",
  "arguments": {
    "filePath": "src/main.js",
    "startLine": 1,
    "endLine": 30
  }
}
```

### Patching Specific Lines
```json
{
  "name": "write_file",
  "arguments": {
    "filePath": "src/main.js",
    "content": "const PORT = process.env.PORT || 3000;",
    "startLine": 12,
    "endLine": 12
  }
}
```

---

## 3. Best Practices & Safety

- Always read an existing file before writing to it to understand current structure and line numbering.
- File creations and writes must strictly target paths within `workspace/`.
- Use line-range replacements rather than full-file overwrites when making surgical edits.
