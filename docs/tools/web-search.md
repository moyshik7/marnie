# Tool: `web_search`

Searches the live web for up-to-date information, technical documentation, news, or answers using DuckDuckGo or self-hosted SearXNG.

---

## 1. Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `query` | `string` | **Yes** | Search keywords. Keep concise (strictly 2 to 5 words). Long conversational sentences or questions degrade search quality. |
| `max_results` | `number` | No | Maximum number of results to return. Defaults to 5. |
| `provider` | `string` | No | Provider override: `'duckduckgo'` or `'searxng'`. If omitted, uses system setting. |

---

## 2. Supported Search Providers

1. **DuckDuckGo (Default)**:
   - Queries DuckDuckGo's HTML search interface without requiring an API key.
   - Parses organic search result cards (title, target URL, and snippet).
2. **SearXNG**:
   - Queries a self-hosted SearXNG instance configured via `SEARXNG_URL` or the Settings panel.
   - Returns structured JSON results across aggregated engines.

---

## 3. Query Best Practices

| Recommended (2-5 Keywords) | Not Recommended |
| :--- | :--- |
| `express 5 path to regexp changes` | `Can you tell me how path to regexp changed when upgrading express to version 5?` |
| `qwen 2.5 benchmarks llama` | `What are the benchmark scores comparing Qwen 2.5 against Llama 3?` |
| `better sqlite3 wal mode performance` | `How does WAL mode improve the write performance in better-sqlite3?` |

---

## 4. Return Format

```json
{
  "query": "express 5 path to regexp",
  "provider": "duckduckgo",
  "results": [
    {
      "title": "Migrating to Express 5",
      "url": "https://expressjs.com/en/guide/migrating-5.html",
      "snippet": "Path route matching syntax changes in Express 5 using path-to-regexp v8..."
    }
  ]
}
```
