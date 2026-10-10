# Skill: `task-manager`

The `task-manager` skill allows the agent to create, list, and manage persistent task items stored in SQLite.

---

## 1. Capabilities & Triggers

### When to Activate
- Tracking user to-dos, action items, and project milestones.
- Managing multi-step project tasks with priority ratings.
- Listing remaining tasks to inform the next steps of an execution plan.

### Underlying Tools
- [`create_task`](../tools/task-management.md)
- [`list_tasks`](../tools/task-management.md)

---

## 2. Invocation Patterns

### Creating a High-Priority Task
```json
{
  "name": "create_task",
  "arguments": {
    "title": "Update KaTeX security override",
    "description": "Ensure mermaid and root resolve to katex >= 0.18.2.",
    "priority": "high"
  }
}
```

### Listing Pending Tasks
```json
{
  "name": "list_tasks",
  "arguments": {
    "status": "pending"
  }
}
```

---

## 3. Best Practices & Safety

- Use descriptive task titles that can be understood at a glance.
- Set realistic priority levels (`low`, `medium`, `high`) to help users organize their backlog.
- Query tasks using `list_tasks` before creating new ones to prevent duplicate entries.
