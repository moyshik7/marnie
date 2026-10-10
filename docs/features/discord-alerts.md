# Discord Alerts & Notifications

Marnie provides out-of-the-box Discord webhook integration for sending real-time notifications, countdown alerts, and cron status updates directly to external Discord channels.

---

## 1. Webhook Configuration

Discord alerts require a valid webhook URL configured either via environment variable:
```bash
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```
Or set dynamically at runtime in the **Settings** modal, which saves the URL to the SQLite `settings` table (`discord_webhook_url`).

---

## 2. Rich Embed Formatting

Alerts are sent as Discord embeds with standardized color indicators:

| Level | Color Hex | Use Case |
| :--- | :--- | :--- |
| `info` | `#5865F2` (Blurple) | Standard updates, general notifications, countdown timers |
| `success` | `#57F287` (Green) | Successful builds, completed deep research runs |
| `warning` | `#FEE75C` (Yellow) | Deprecation notices, high resource warnings |
| `error` | `#ED4245` (Red) | Failed cron actions, command errors, network timeouts |

Every embed includes a title, timestamp, message body, and a footer indicating `Marnie Workspace Alert`.

---

## 3. API Endpoints

- `POST /api/alerts/send`: Dispatches an alert with message, title, and level:
  ```json
  {
    "message": "Deployment complete",
    "title": "Build Status",
    "level": "success"
  }
  ```
- `POST /api/settings/test-discord`: Validates the currently configured webhook URL by sending a test ping.
