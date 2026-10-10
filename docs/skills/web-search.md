# Skill: `web-search`

The `web-search` skill searches the live web for up-to-date facts, current events, documentation, and answers using DuckDuckGo or self-hosted SearXNG.

---

## 1. Capabilities & Triggers

### When to Activate
- Finding recent news, current events, library releases, or benchmarks.
- Searching for technical documentation, error solutions, or API specifications.
- Discovering URLs and sources across the public internet.

### Underlying Tool
- [`web_search`](../tools/web-search.md)

---

## 2. Invocation Patterns

### Basic Search Query
```json
{
  "name": "web_search",
  "arguments": {
    "query": "nodejs 24 release notes",
    "max_results": 5
  }
}
```

### Search with Provider Override
```json
{
  "name": "web_search",
  "arguments": {
    "query": "ollama tool calling support",
    "provider": "searxng"
  }
}
```

---

## 3. Best Practices & Safety

- **Query Optimization**: Keep queries short and concise (strictly 2 to 5 words). Long conversational sentences produce lower quality search results.
- **Synthesizing Results**: After executing `web_search`, synthesize the returned information into a structured, helpful answer citing relevant links.
