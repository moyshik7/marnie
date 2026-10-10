# Tool: `api_call`

Makes raw HTTP/REST network requests with custom methods, headers, query parameters, and payload data using Axios.

---

## 1. Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `url` | `string` | **Yes** | Full HTTP or HTTPS endpoint URL. |
| `method` | `string` | No | HTTP verb: `'GET'`, `'POST'`, `'PUT'`, `'PATCH'`, `'DELETE'`, `'HEAD'`. Defaults to `'GET'`. |
| `headers` | `object` | No | Key-value dictionary of custom HTTP request headers. |
| `params` | `object` | No | Key-value dictionary of URL search query parameters. |
| `data` | `object` / `string` | No | Body payload (JSON object, string, or array) for mutation requests. |
| `timeout` | `number` | No | Request timeout in milliseconds. Defaults to 15,000 (15s). |

---

## 2. Capabilities

- Useful for testing webhook endpoints, querying third-party JSON APIs, fetching raw payloads, or interacting with self-hosted services on the local network.
- Automatically handles JSON response parsing.
- Captures status code, headers, latency, and response data.
- Gracefully catches HTTP error status codes (4xx/5xx) and network connectivity errors without crashing the agent.

---

## 3. Example Invocation

```json
{
  "name": "api_call",
  "arguments": {
    "url": "https://httpbin.org/post",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "X-Custom-Header": "Marnie"
    },
    "data": {
      "status": "active",
      "count": 42
    }
  }
}
```

---

## 4. Return Format

```json
{
  "status": 200,
  "statusText": "OK",
  "data": {
    "json": {
      "status": "active",
      "count": 42
    }
  },
  "headers": {
    "content-type": "application/json"
  }
}
```
