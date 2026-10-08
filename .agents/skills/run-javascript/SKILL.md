---
name: run-javascript
description: >-
  Execute JavaScript/Node.js code snippets in a fresh, isolated Node.js child process.
  Use for running calculations, quick scripting, data transformations, algorithmic validation,
  or testing logic without affecting the host server process.
---

# Run JavaScript Skill

Executes arbitrary JavaScript code in an isolated child Node.js process with access to standard Node.js built-ins (`fs`, `path`, `crypto`, `os`, etc.).

## When to Use
- Running data transformations, sorting, or formatting logic.
- Testing Node.js functions and algorithms in isolation.
- Computing complex mathematical results and string operations.

## Tool Invocation

### Format

```json
<tool_call>
{
  "name": "run_javascript",
  "arguments": {
    "code": "const crypto = require('crypto'); console.log(crypto.randomUUID());",
    "timeout": 15000
  }
}
</tool_call>
```

### Parameters
- `code` (string, required): JavaScript source code to execute.
- `timeout` (number, optional): Execution timeout in milliseconds (default: 15,000ms).

### Aliases
`javascript`, `js`, `code_run`

## Programmatic Usage

```javascript
const codeRunner = require('./src/components/tools/codeRunner');

const result = await codeRunner.runJS({
  code: 'console.log("Hello from sandbox");',
  timeout: 10000,
});
console.log(result.stdout, result.exitCode);
```
