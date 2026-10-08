---
name: cron-scheduler
description: >-
  Schedule and manage recurring background cron jobs stored persistently in SQLite.
  Supports executing bash commands, sending Discord notifications, or triggering HTTP webhooks.
---

# Cron Scheduler Skill

Schedules persistent background cron jobs using standard 5-field cron expressions (e.g. `*/5 * * * *`, `0 9 * * *`).

## When to Use
- Scheduling recurring server tasks (health checks, database backups, cache pruning).
- Setting up automated periodic Discord alerts or morning briefings.
- Recurring HTTP webhook pings.

## Tool Invocation

```json
<tool_call>
{
  "name": "create_cron",
  "arguments": {
    "name": "Daily Health Check",
    "expression": "0 9 * * *",
    "action_type": "bash",
    "action_data": {
      "command": "uptime"
    }
  }
}
</tool_call>
```

### Supported `action_type` values:
- `bash`: Runs `{ "command": "..." }`
- `discord`: Sends `{ "message": "...", "title": "..." }`
- `http`: Pings `{ "url": "...", "method": "POST" }`

### Aliases
`cron_create`
