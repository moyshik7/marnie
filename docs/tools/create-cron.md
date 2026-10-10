# Tool: `create_cron`

Schedules a persistent, recurring background cron job saved in the SQLite database.

---

## 1. Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | Human-readable name or label for the job. |
| `expression` | `string` | **Yes** | 5-field cron expression string (e.g., `'0 9 * * *'`, `'*/30 * * * *'`). |
| `action_type` | `string` | **Yes** | Type of action to trigger: `'bash'`, `'discord'`, or `'http'`. |
| `action_data` | `object` | **Yes** | Configuration object corresponding to the chosen action type. |

---

## 2. Action Data Configurations

### A. Bash Action (`action_type: "bash"`)
```json
{
  "command": "npm test",
  "cwd": "."
}
```

### B. Discord Action (`action_type: "discord"`)
```json
{
  "message": "Daily database backup complete",
  "title": "Backup Notification",
  "level": "success"
}
```

### C. HTTP Action (`action_type: "http"`)
```json
{
  "url": "https://api.example.com/heartbeat",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token"
  }
}
```

---

## 3. Example Invocation

```json
{
  "name": "create_cron",
  "arguments": {
    "name": "Hourly Health Check",
    "expression": "0 * * * *",
    "action_type": "discord",
    "action_data": {
      "message": "Hourly automated system health check OK.",
      "level": "info"
    }
  }
}
```

---

## 4. Return Format

```json
{
  "id": "c8a4f109-...",
  "name": "Hourly Health Check",
  "expression": "0 * * * *",
  "action_type": "discord",
  "enabled": 1,
  "created_at": 1728581000
}
```
