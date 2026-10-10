# Skill: `timer`

The `timer` skill enables the agent to configure countdown timers that notify Discord when expired.

---

## 1. Capabilities & Triggers

### When to Activate
- Setting reminders, tea or Pomodoro timers, and waiting periods.
- Alerting users after background jobs, long downloads, or deployment intervals finish.
- Dispatched when the user asks: "Remind me in 10 minutes", "Set a timer for 1 hour", etc.

### Underlying Tool
- [`set_timer`](../tools/timer-and-alerts.md)

---

## 2. Invocation Patterns

### Setting a 15-Minute Timer
```json
{
  "name": "set_timer",
  "arguments": {
    "duration": "15m",
    "message": "15 minutes are up! Check your build logs.",
    "title": "Build Timer"
  }
}
```

### Setting a 60-Second Timer
```json
{
  "name": "set_timer",
  "arguments": {
    "seconds": 60,
    "message": "1 minute timer complete.",
    "title": "Quick Alert"
  }
}
```

---

## 3. Best Practices & Safety

- Use duration strings (`"30s"`, `"5m"`, `"1h"`) or direct seconds.
- Ensure the Discord webhook is configured in Settings so the user receives the notification.
- Include a descriptive message explaining why the timer was set.
