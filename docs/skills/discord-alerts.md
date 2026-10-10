# Skill: `discord-alerts`

The `discord-alerts` skill enables the agent to dispatch formatted rich embed notifications to the user's configured Discord webhook.

---

## 1. Capabilities & Triggers

### When to Activate
- Sending immediate notifications about completed tasks, test results, or build outcomes.
- Reporting critical errors or warnings that require user attention.
- Broadcasting informational status updates to an external channel.

### Underlying Tool
- [`send_alert`](../tools/timer-and-alerts.md)

---

## 2. Invocation Patterns

### Success Alert
```json
{
  "name": "send_alert",
  "arguments": {
    "title": "Build Succeeded",
    "message": "Frontend bundle compiled in 18.4s with 0 warnings.",
    "level": "success"
  }
}
```

### Warning or Error Alert
```json
{
  "name": "send_alert",
  "arguments": {
    "title": "Disk Space Warning",
    "message": "Workspace disk usage exceeded 85% capacity.",
    "level": "warning"
  }
}
```

---

## 3. Best Practices & Safety

- Match the `level` property (`info`, `success`, `warning`, `error`) to the context for accurate color-coding in Discord.
- Ensure messages are concise and actionable.
- Verify webhook URL connectivity before sending critical broadcasts.
