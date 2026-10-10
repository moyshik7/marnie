# Tool: `run_javascript`

Executes arbitrary JavaScript/Node.js code snippets in a fresh, isolated Node.js child process.

---

## 1. Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `code` | `string` | **Yes** | The JavaScript code snippet to execute. |
| `timeout` | `number` | No | Maximum execution time in milliseconds. Defaults to 15,000 (15s). |

---

## 2. Execution Environment

- Runs using `node -e <code_base64>` in a spawned child process.
- The child process has access to standard built-in Node.js modules (`fs`, `path`, `crypto`, `http`, etc.).
- Execution takes place inside `workspace/`, keeping any temporary files created by the script isolated.
- If execution exceeds the specified timeout, the child process is terminated with `SIGTERM` / `SIGKILL`.

---

## 3. Example Invocation

```json
{
  "name": "run_javascript",
  "arguments": {
    "code": "const crypto = require('crypto'); console.log(crypto.randomUUID());"
  }
}
```

---

## 4. Return Format

```json
{
  "stdout": "7d9b5e3c-8a12-4f9e-bc43-2a91f861e389\n",
  "stderr": "",
  "exitCode": 0
}
```
