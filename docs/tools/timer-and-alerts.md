# Tools: Timers & Alerts (`set_timer`, `send_alert`)

Tools that dispatch immediate Discord webhook embeds or schedule one-off countdown timers.

---

## 1. `send_alert`

Dispatches an immediate alert notification embed to the user's configured Discord webhook.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `message` | `string` | **Yes** | Alert message text. |
| `title` | `string` | No | Title of the embed card. Defaults to `'Marnie Alert'`. |
| `level` | `string` | No | Severity level: `'info'`, `'success'`, `'warning'`, `'error'`. Defaults to `'info'`. |

### Example Invocation
```json
{
  "name": "send_alert",
  "arguments": {
    "title": "Pipeline Succeeded",
    "message": "All unit tests and frontend builds passed without error.",
    "level": "success"
  }
}
```

---

## 2. `set_timer`

Sets a one-off countdown timer that notifies Discord when the specified duration has elapsed.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `seconds` | `number` | No* | Countdown duration in seconds (e.g., 60). |
| `duration` | `string` | No* | Human-readable duration string (e.g., `'30s'`, `'5m'`, `'1h'`) if `seconds` is omitted. |
| `message` | `string` | **Yes** | Message to send to Discord upon timer expiration. |
| `title` | `string` | No | Title for the Discord embed card. Defaults to `'Timer Alert'`. |

*\*Either `seconds` or `duration` must be provided.*

### Example Invocation
```json
{
  "name": "set_timer",
  "arguments": {
    "duration": "10m",
    "message": "10 minute deep work timer is up! Take a break.",
    "title": "Pomodoro Alert"
  }
}
```

### Return Format
```json
{
  "id": "timer-1728582000-abc12",
  "durationSeconds": 600,
  "expiresAt": "2026-10-10T15:42:00.000Z",
  "message": "10 minute deep work timer is up! Take a break."
}
```
