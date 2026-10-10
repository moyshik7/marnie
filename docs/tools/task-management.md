# Tools: Task Management (`create_task`, `list_tasks`)

Tools that allow the AI assistant to log, track, and inspect persistent tasks in the SQLite database.

---

## 1. `create_task`

Creates a new task saved persistently in SQLite.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | `string` | **Yes** | Summary title of the task. |
| `description` | `string` | No | Additional details, execution steps, or specifications. |
| `priority` | `string` | No | Task priority: `'low'`, `'medium'`, or `'high'`. Defaults to `'medium'`. |

### Example Invocation
```json
{
  "name": "create_task",
  "arguments": {
    "title": "Migrate Express 5 wildcards",
    "description": "Rename /raw/* to /raw/*filepath and handle array path arguments.",
    "priority": "high"
  }
}
```

### Return Format
```json
{
  "id": "b18c0e27-...",
  "title": "Migrate Express 5 wildcards",
  "status": "pending",
  "priority": "high",
  "created_at": 1728580000
}
```

---

## 2. `list_tasks`

Lists existing tasks from SQLite storage with optional status filtering.

### Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | No | Optional status filter: `'pending'`, `'in_progress'`, `'done'`, or `'cancelled'`. If omitted, lists all tasks. |

### Example Invocation
```json
{
  "name": "list_tasks",
  "arguments": {
    "status": "pending"
  }
}
```
