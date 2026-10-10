# Skill: `api-caller`

The `api-caller` skill enables an autonomous agent to execute arbitrary HTTP/REST API calls (GET, POST, PUT, PATCH, DELETE) with custom headers, query parameters, and body payloads.

---

## 1. Capabilities & Triggers

### When to Activate
- Interacting with external or self-hosted REST API endpoints.
- Verifying HTTP webhooks, local server routes, and health pings.
- Inspecting JSON responses, authentication headers, or status codes.
- Triggering network webhooks without invoking full bash curl processes.

### Underlying Tool
- [`api_call`](../tools/api-call.md)

---

## 2. Invocation Patterns

### Fetching a Remote JSON Resource
```json
{
  "name": "api_call",
  "arguments": {
    "url": "https://jsonplaceholder.typicode.com/posts/1",
    "method": "GET"
  }
}
```

### Sending an Authenticated Webhook Payload
```json
{
  "name": "api_call",
  "arguments": {
    "url": "https://api.example.com/v1/events",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer s3cr3t-t0k3n",
      "Content-Type": "application/json"
    },
    "data": {
      "event": "build_success",
      "timestamp": "2026-10-10T21:00:00Z"
    }
  }
}
```

---

## 3. Best Practices & Safety

- Always provide a descriptive User-Agent or Authorization header when required by the target API.
- Keep timeouts reasonable (default is 15s) to avoid blocking the conversation loop.
- Sensitive authentication tokens passed through the tool should be handled responsibly.
