# Skill: `cron-scheduler`

The `cron-scheduler` skill enables the agent to configure, inspect, and manage persistent recurring background jobs stored in SQLite.

---

## 1. Capabilities & Triggers

### When to Activate
- The user requests recurring background execution (e.g., "Run this every day at 8 AM", "Check system disk space every 30 minutes").
- Scheduling automated Discord status alerts or standup pings.
- Setting up recurring webhook triggers or API polling tasks.

### Underlying Tool
- [`create_cron`](../tools/create-cron.md)

---

## 2. Invocation Patterns

### Scheduling a Daily Discord Notification
```json
{
  "name": "create_cron",
  "arguments": {
    "name": "Daily Standup Reminder",
    "expression": "0 9 * * 1-5",
    "action_type": "discord",
    "action_data": {
      "title": "Daily Standup",
      "message": "Time for the morning standup meeting!",
      "level": "info"
    }
  }
}
```

### Scheduling a Periodic Bash Command
```json
{
  "name": "create_cron",
  "arguments": {
    "name": "Workspace Git Fetch",
    "expression": "0 */4 * * *",
    "action_type": "bash",
    "action_data": {
      "command": "git fetch --all",
      "cwd": "workspace"
    }
  }
}
```

---

## 3. Best Practices & Safety

- Verify the 5-field cron expression syntax (`minute hour day-of-month month day-of-week`).
- Ensure commands run by cron jobs are idempotent and safe for repeated execution.
