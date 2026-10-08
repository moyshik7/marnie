---
name: task-manager
description: >-
  Create, list, and manage persistent task items stored in SQLite.
  Use for tracking user todos, task checklists, project milestones, and action items.
---

# Task Manager Skill

Provides persistent task tracking stored in SQLite with title, description, priority levels, and status states (`pending`, `in_progress`, `done`, `cancelled`).

## Tools Included

### 1. `create_task`
Creates a persistent task record.

```json
<tool_call>
{
  "name": "create_task",
  "arguments": {
    "title": "Build new landing component",
    "description": "Implement responsive layout with tailwind/css",
    "priority": "high"
  }
}
</tool_call>
```
Aliases: `task_create`

### 2. `list_tasks`
Lists all active or filtered tasks from SQLite.

```json
<tool_call>
{
  "name": "list_tasks",
  "arguments": {
    "status": "pending"
  }
}
</tool_call>
```
Aliases: `task_list`

## Programmatic Usage

```javascript
const tasks = require('./src/components/tools/tasks');

const created = tasks.createTask({
  title: 'Review pull request',
  priority: 'medium',
});

const activeTasks = tasks.listTasks({ status: 'pending' });
```
