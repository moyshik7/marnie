# Skill: `run-bash`

The `run-bash` skill enables the agent to execute shell and terminal commands (bash/sh) directly on the host operating system.

---

## 1. Capabilities & Triggers

### When to Activate
- Running Git commands (`git status`, `git diff`, `git log`, `git checkout`).
- Running system inspection commands (`uname -a`, `df -h`, `free -m`).
- Package management and project builds (`npm test`, `npm run build`, `pip list`).
- Starting or checking local background services and host automation tasks.

### Underlying Tool
- [`run_bash`](../tools/run-bash.md)

---

## 2. Invocation Patterns

### Inspecting Git Status
```json
{
  "name": "run_bash",
  "arguments": {
    "command": "git status -s",
    "cwd": "."
  }
}
```

### Checking Node.js Version and Dependencies
```json
{
  "name": "run_bash",
  "arguments": {
    "command": "node --version && npm list --depth=0"
  }
}
```

---

## 3. Best Practices & Safety

- Working directories outside the repository root are strictly blocked (`403 Forbidden`).
- Do not run interactive commands that block awaiting user input (e.g. interactive `sudo` prompts or editors like `nano` / `vim`).
- Commands automatically time out after 30 seconds.
