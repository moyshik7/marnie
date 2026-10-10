# Skill: `web-scraper`

The `web-scraper` skill enables lightweight HTML extraction and text scraping using Cheerio and Axios.

---

## 1. Capabilities & Triggers

### When to Activate
- Extracting readable body text from an external blog post, documentation page, or news article.
- Fetching specific URLs cited in search results to verify details.
- Cleaning noisy HTML (removing scripts, ads, headers, footers, stylesheets) into plain text without requiring heavy headless browsers like Puppeteer.

### Underlying Tool
- [`fetch_webpage`](../tools/fetch-webpage.md)

---

## 2. Invocation Patterns

### Scraping a Technical Article
```json
{
  "name": "fetch_webpage",
  "arguments": {
    "url": "https://nodejs.org/en/about",
    "max_length": 2500
  }
}
```

---

## 3. Best Practices & Safety

- Provide absolute URLs starting with `http://` or `https://`.
- Adjust `max_length` depending on how much text is needed (default is 2,000 characters).
- Useful when you know the exact URL; for finding new URLs on a topic, use [`web-search`](web-search.md) first.
