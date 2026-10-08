---
name: run-bash
description: >-
  Execute terminal and shell commands (bash/sh) directly on the host system.
  Use for running git, system inspection, package management, checking service statuses,
  and executing host automation commands.
---

# Run Bash Skill

Executes terminal commands on the host machine shell (`bash` / `sh`) and captures standard output, standard error, and exit codes.

## When to Use
- Running shell commands, scripts, builds, or tests.
- Checking system status (`uname`, `df`, `free`, `ps`, `uptime`).
- Managing Git repositories, checking status, branches, or logs.
- Installing and managing system or project packages (`npm`, `apt`, `cargo`, etc.).

## Tool Invocation

### Format

```json
<tool_call>
{
  "name": "run_bash",
  "arguments": {
    "command": "git status",
    "cwd": "/home/sayuri/code/marnie"
  }
}
</tool_call>
```

### Parameters
- `command` (string, required): The shell command line string to execute.
- `cwd` (string, optional): Working directory for the command. Defaults to the workspace directory.

### Aliases
`bash`, `terminal`

## Programmatic Usage

```javascript
const bash = require('./src/components/tools/bash');

const result = await bash.run({
  command: 'uname -a',
  cwd: process.cwd(),
  timeout: 30000,
});
console.log(result.stdout, result.exitCode);
```
