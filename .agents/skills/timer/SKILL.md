---
name: timer
description: >-
  Set one-off countdown timers that notify Discord when expired.
  Use for reminders, tea/pomodoro timers, waiting periods, and alert countdowns.
---

# Countdown Timer Skill

Sets countdown timers that run in the background and dispatch a Discord embed notification when the elapsed duration is reached.

## When to Use
- Setting countdown timers (e.g. "Remind me in 10 minutes", "Set a timer for 45 seconds").
- Automated reminders for build completion or pomodoro cycles.

## Tool Invocation

```json
<tool_call>
{
  "name": "set_timer",
  "arguments": {
    "duration": "10m",
    "message": "Time to stand up and stretch!",
    "title": "Health Reminder"
  }
}
</tool_call>
```

### Parameters
- `seconds` (number, optional): Duration in seconds (e.g. `60`).
- `duration` (string, optional): Duration string (e.g. `'30s'`, `'5m'`, `'2h'`) if `seconds` is not provided.
- `message` (string, required): The alert message to send when the timer finishes.
- `title` (string, optional): Title for the alert embed (default: `'Timer Alert'`).

### Aliases
`timer`, `create_timer`, `countdown`
