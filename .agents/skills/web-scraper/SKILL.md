---
name: web-scraper
description: >-
  Lightweight webpage text extraction and scraping tool using Cheerio and Axios.
  Use when needing to fetch, extract, clean, and summarize text content from any public webpage URL
  without using heavy headless browsers like Puppeteer.
---

# Web Scraper Skill

This skill provides fast, lightweight HTML fetching and textual extraction using `axios` and `cheerio`.
It strips away scripts, CSS styling, navigation headers, footers, and tracking tags to extract pure readable content suitable for LLM context windows.

## Core Features
- **Zero Headless Overhead**: Uses HTTP GET requests with custom browser User-Agents instead of resource-heavy headless browsers.
- **Semantic Text Extraction**: Identifies primary content wrappers (`article`, `main`, `[role="main"]`, `#content`, `.post-content`) and falls back to `body`.
- **Context-Safe Truncation**: Enforces length caps (default 1,800 to 2,000 characters) so extracted text fits cleanly within the LLM context.
- **Clean Formatting**: Normalizes excess whitespace and double-linebreaks.

## Usage in Marnie

### 1. Via Agent Tool Call
To fetch and extract content from a specific URL:

```json
<tool_call>
{
  "name": "fetch_webpage",
  "arguments": {
    "url": "https://example.com/article",
    "max_length": 2000
  }
}
</tool_call>
```

Aliases supported:
- `fetch_webpage`
- `scrape_webpage`
- `scrape_url`
- `fetch_url`

### 2. Programmatic Usage in Code

```javascript
const { fetchPageContent } = require('./src/components/tools/webSearch');

// Fetch clean textual content
const content = await fetchPageContent('https://example.com', 1800);
console.log(content);
```

### 3. Integrated Web Search Scraper
Whenever `web_search` is invoked, Marnie concurrently scrapes the top 5 returned links in parallel using `Promise.allSettled`, attaching the scraped content to each result item under `item.content`.
