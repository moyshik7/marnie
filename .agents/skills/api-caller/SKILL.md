---
name: api-caller
description: >-
  Make raw HTTP/REST API calls (GET, POST, PUT, PATCH, DELETE) with custom headers, params, and body data using Axios.
  Use when interacting with external REST APIs, testing webhook endpoints, querying JSON APIs,
  or sending raw network payloads.
---

# API Caller Skill

Makes raw HTTP requests to any accessible REST API or endpoint with full control over HTTP methods, custom headers, query parameters, payloads, and timeouts.

## When to Use
- Querying third-party REST APIs (GitHub, weather, crypto, custom services).
- Testing internal API routes and endpoints.
- Sending webhooks, POST JSON payloads, or bearer token requests.

## Tool Invocation

```json
<tool_call>
{
  "name": "api_call",
  "arguments": {
    "url": "https://api.github.com/repos/nodejs/node/releases/latest",
    "method": "GET",
    "headers": {
      "Accept": "application/vnd.github.v3+json"
    }
  }
}
</tool_call>
```

### Parameters
- `url` (string, required): Full HTTP/HTTPS URL.
- `method` (string, optional): HTTP method (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`). Default `GET`.
- `headers` (object, optional): Custom headers key-value map.
- `params` (object, optional): URL query parameters key-value map.
- `data` / `body` (object/string/array, optional): Request body payload.
- `timeout` (number, optional): Request timeout in ms (default: 15,000ms).

### Aliases
`api`, `http_request`, `curl`, `http`, `fetch`, `request`
