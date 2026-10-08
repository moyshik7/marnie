---
name: file-operations
description: >-
  Read, create, write, and patch local files on disk.
  Use when inspecting code files, creating new components, writing configurations,
  appending lines, or replacing line ranges.
---

# File Operations Skill

Provides precise file operations for reading file contents, creating new files, and making edits or line-range replacements.

## Tools Included

### 1. `read_file`
Read whole files or specific line ranges (1-indexed).

```json
<tool_call>
{
  "name": "read_file",
  "arguments": {
    "filePath": "/home/sayuri/code/marnie/package.json",
    "startLine": 1,
    "endLine": 30
  }
}
</tool_call>
```
Aliases: `file_read`

### 2. `create_file`
Create a brand new file with initial content.

```json
<tool_call>
{
  "name": "create_file",
  "arguments": {
    "filePath": "/home/sayuri/code/marnie/notes.txt",
    "content": "Initial notes content",
    "overwrite": false
  }
}
</tool_call>
```
Aliases: `file_create`

### 3. `write_file`
Overwrite, append, or replace specific line numbers in an existing file. Reads current file content before modification.

```json
<tool_call>
{
  "name": "write_file",
  "arguments": {
    "filePath": "/home/sayuri/code/marnie/notes.txt",
    "content": "Updated notes line\n",
    "append": true
  }
}
</tool_call>
```
Aliases: `file_write`
