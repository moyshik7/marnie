# Cron Scheduling & Timers

Marnie includes a background job scheduler powered by `node-cron` and SQLite persistence, enabling autonomous recurring tasks and one-off countdown timers.

---

## 1. Recurring Cron Jobs

Cron jobs persist across application restarts in the `cron_jobs` table. When the Marnie server boots, all active jobs are registered with the runtime scheduler.

### Supported Action Types

1. **`bash`**: Executes a shell command string on the host system.
   ```json
   {
     "command": "git status",
     "cwd": "workspace"
   }
   ```
2. **`discord`**: Dispatches a scheduled message or embed to the configured Discord webhook.
   ```json
   {
     "message": "Daily project standup reminder",
     "level": "info"
   }
   ```
3. **`http`**: Triggers a scheduled HTTP/REST webhook request.
   ```json
   {
     "url": "https://api.example.com/sync",
     "method": "POST",
     "headers": { "Authorization": "Bearer token" }
   }
   ```

### Standard Cron Expressions

Jobs use standard 5-field cron syntax (`minute hour day-of-month month day-of-week`):
- `0 9 * * *`: Every morning at 09:00.
- `*/15 * * * *`: Every 15 minutes.
- `0 0 * * 1`: Every Monday at midnight.

---

## 2. Countdown Timers

In addition to recurring cron expressions, Marnie provides temporary countdown timers (`set_timer`):
- Parses human-readable durations (e.g., `30s`, `5m`, `1h`, `90 seconds`).
- When the timer expires, an alert notification is automatically dispatched to the user's Discord channel.
- Timers can be listed via `GET /api/tools/timer` and cancelled before expiry via `DELETE /api/tools/timer/:id`.

---

## 3. API Endpoints

- `GET /api/cron`: List all registered cron jobs with their current state, expression, and last run time.
- `POST /api/cron`: Register a new cron job `{ name, expression, action_type, action_data }`.
- `GET /api/cron/:id`: Retrieve job details.
- `PATCH /api/cron/:id`: Modify schedule expression or action configuration.
- `POST /api/cron/:id/pause`: Pause execution without deleting the job.
- `POST /api/cron/:id/resume`: Re-enable a paused job.
- `DELETE /api/cron/:id`: Permanently delete a cron schedule.
