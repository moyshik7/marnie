---
name: discord-alerts
description: >-
  Dispatch rich embed alert notifications to configured Discord webhook channels.
  Use for sending immediate system notifications, error reports, status summaries, or broadcast alerts.
---

# Discord Alerts Skill

Sends formatted message embeds to the Discord webhook URL configured in Marnie's settings.

## When to Use
- Sending notifications, reminders, build results, or urgent alerts to Discord.
- Broadcasting updates from automated workflows or cron jobs.

## Tool Invocation

```json
<tool_call>
{
  "name": "send_alert",
  "arguments": {
    "title": "Build Passed",
    "message": "All integration tests compiled and passed successfully.",
    "level": "success"
  }
}
</tool_call>
```

### Parameters
- `message` (string, required): Message text body for the Discord embed.
- `title` (string, optional): Title for the embed card.
- `level` (string, optional): Level styling (`'info'`, `'success'`, `'warning'`, `'error'`). Default `'info'`.

### Aliases
`discord_alert`
