---
name: filesystem-search
description: >-
  Recursively search files and directories matching a pattern, substring, or regular expression.
  Use when exploring codebase structure, finding specific file extensions, locating configuration files,
  or inspecting workspace trees.
---

# Filesystem Search Skill

Recursively traverses directories to locate files matching names, extensions, or patterns.

## When to Use
- Locating specific files (e.g. `*.jsx`, `*.json`, `config.js`).
- Discovering folder hierarchy within a specified directory depth.
- Finding files matching substrings across large projects without invoking heavy shell tools.

## Tool Invocation

```json
<tool_call>
{
  "name": "search_filesystem",
  "arguments": {
    "directory": ".",
    "pattern": ".jsx"
  }
}
</tool_call>
```

### Parameters
- `directory` (string, required): Directory path to search within.
- `pattern` (string, optional): Filename substring or regex pattern to filter files.

### Aliases
`search_file`, `search_files`, `find_files`

## Programmatic Usage

```javascript
const filesystem = require('./src/components/tools/filesystem');

const matches = filesystem.search({
  directory: './src',
  pattern: 'route',
  maxDepth: 5,
});
console.log(matches);
```
