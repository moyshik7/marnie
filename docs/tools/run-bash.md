# Tool: `run_bash`

Executes terminal shell commands (bash/sh) directly on the host system.

---

## 1. Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `command` | `string` | **Yes** | The shell command string to execute. |
| `cwd` | `string` | No | Working directory path. Defaults to `workspace/`. Strictly restricted from operating outside the repository root. |

---

## 2. Safety & Boundary Enforcement

The `run_bash` tool enforces working directory boundaries via `resolveCwd()` in `src/utils/workspace.js`:
- If `cwd` is omitted, execution defaults to the `/workspace` directory.
- If a custom `cwd` is specified, it must resolve to a location within the repository root (`REPO_ROOT`).
- Commands cannot execute with a working directory outside the repository (e.g., `/etc`, `/tmp`, `/home`), throwing a `403 Forbidden` error.
- Commands run with a default timeout of 30,000 milliseconds (30 seconds) to prevent frozen processes.

---

## 3. Example Invocations

### Listing workspace contents
```json
{
  "name": "run_bash",
  "arguments": {
    "command": "ls -la"
  }
}
```

### Checking Git status
```json
{
  "name": "run_bash",
  "arguments": {
    "command": "git status -s",
    "cwd": "."
  }
}
```

---

## 4. Return Format

```json
{
  "stdout": "total 4\n-rw-r--r-- 1 sayuri sayuri 123 Oct 10 20:00 index.html\n",
  "stderr": "",
  "exitCode": 0
}
```
