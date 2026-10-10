# Skill: `filesystem-search`

The `filesystem-search` skill enables recursive directory searching using filename substrings or regular expressions.

---

## 1. Capabilities & Triggers

### When to Activate
- Exploring codebase structure and directory layouts.
- Finding files with specific extensions (e.g., `.jsx`, `.sql`, `.env`).
- Locating configuration files, test suites, or documentation.
- Inspecting workspace trees before running modifications.

### Underlying Tool
- [`search_filesystem`](../tools/search-filesystem.md)

---

## 2. Invocation Patterns

### Finding All Markdown Files in Workspace
```json
{
  "name": "search_filesystem",
  "arguments": {
    "directory": "workspace",
    "pattern": "\\.md$"
  }
}
```

### Searching by Filename Substring
```json
{
  "name": "search_filesystem",
  "arguments": {
    "directory": "src",
    "pattern": "route"
  }
}
```

---

## 3. Best Practices & Safety

- Use focused search directories rather than searching the entire filesystem root.
- Heavy folders like `node_modules`, `.git`, and `dist` are automatically excluded.
- Results are capped at 500 matches to prevent excessive context consumption.
