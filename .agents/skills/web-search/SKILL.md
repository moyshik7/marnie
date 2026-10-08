---
name: web-search
description: >-
  Search the live web using DuckDuckGo or self-hosted SearXNG with automatic link content scraping.
  Use when answering current events, retrieving documentation, looking up recent libraries,
  or finding up-to-date facts.
---

# Web Search Skill

Performs live search queries across the web using DuckDuckGo (HTML POST, Lite, and Instant Answer fallbacks) or self-hosted SearXNG. Automatically scrapes and extracts clean body text for top search results using Cheerio.

## Key Guidelines
- **Keep Queries Short**: For optimal search results, use concise keywords (strictly 2 to 5 words, e.g. `"latest nodejs release"`, `"deepseek r1 architecture"`, `"tailwindcss v4 changes"`).
- **Avoid Conversational Queries**: Do not send full conversational sentences or questions as search terms.
- **Automatic Content Scraping**: Each returned search result item includes pre-scraped body text in `item.content` capped to avoid exceeding LLM context limits.

## Tool Invocation

```json
<tool_call>
{
  "name": "web_search",
  "arguments": {
    "query": "nodejs lts releases",
    "max_results": 5
  }
}
</tool_call>
```

### Parameters
- `query` (string, required): Short 2-5 keyword search query.
- `max_results` (number, optional): Max results to retrieve (default: 5).
- `provider` (string, optional): Override provider (`'duckduckgo'` or `'searxng'`).

### Aliases
`search`, `duckduckgo`, `duckduckgo_search`, `ddg`, `searxng`, `searxng_search`, `google`
