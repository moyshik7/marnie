# Skill: `run-javascript`

The `run-javascript` skill executes JavaScript/Node.js snippets in a fresh, isolated Node.js child process.

---

## 1. Capabilities & Triggers

### When to Activate
- Performing mathematical calculations or data structure transformations.
- Testing JavaScript algorithms, regex evaluations, or logic snippets.
- Validating API response parsing or JSON schemas.
- Running quick calculations without affecting the host server process.

### Underlying Tool
- [`run_javascript`](../tools/run-javascript.md)

---

## 2. Invocation Patterns

### Validating a Regular Expression
```json
{
  "name": "run_javascript",
  "arguments": {
    "code": "const regex = /^([a-z0-9_.-]+)@([\\da-z.-]+)\\.([a-z.]{2,6})$/;\nconsole.log(regex.test('test@example.com'));"
  }
}
```

### Performing Complex Date Math
```json
{
  "name": "run_javascript",
  "arguments": {
    "code": "const d = new Date(); d.setDate(d.getDate() + 30); console.log(d.toISOString());"
  }
}
```

---

## 3. Best Practices & Safety

- Code is run with an isolated timeout of 15 seconds.
- Print results with `console.log()` so they are captured in `stdout`.
- Standard built-in Node.js modules are available.
