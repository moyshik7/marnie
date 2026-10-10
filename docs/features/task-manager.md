# Task Management

Marnie includes a persistent task checklist engine backed by SQLite. Tasks can be created, updated, and tracked both by the user via the UI Tools Panel and by the AI agent during multi-step workflows.

---

## 1. Schema & Model

Tasks are stored in the `tasks` table of `./data/marnie.db`:

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done','cancelled')),
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
  due_at      INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at  INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
```

---

## 2. Status Transitions & Priority

- **Statuses**:
  - `pending`: Newly created task awaiting action.
  - `in_progress`: Task actively being worked on.
  - `done`: Completed task.
  - `cancelled`: Aborted or obsolete task.
- **Priorities**:
  - `low`: Informational or non-blocking items.
  - `medium`: Standard workflow tasks (default).
  - `high`: Critical, blocking, or immediate-action requirements.

---

## 3. UI and Agent Integration

- **Tools Panel**: View active tasks filtered by status, toggle completion with a checkbox, or create new tasks directly.
- **Agent Tools (`create_task` & `list_tasks`)**: The AI agent can inspect remaining tasks or log action items as it completes work.
- **REST API Endpoints**:
  - `GET /api/tasks`: List tasks (optional `?status=` filter).
  - `POST /api/tasks`: Create a new task `{ title, description, priority, due_at }`.
  - `GET /api/tasks/:id`: Retrieve task details.
  - `PATCH /api/tasks/:id`: Update status, title, description, or priority.
  - `DELETE /api/tasks/:id`: Delete a task.
