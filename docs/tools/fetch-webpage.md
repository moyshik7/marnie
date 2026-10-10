# Tool: `fetch_webpage`

Lightweight webpage scraper that retrieves and extracts the core textual body content of any public URL.

---

## 1. Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `url` | `string` | **Yes** | The absolute HTTP or HTTPS URL of the webpage to scrape. |
| `max_length` | `number` | No | Maximum number of text characters to return. Defaults to 2,000. |

---

## 2. Scraping Engine & Cleaning Pipeline

- **HTTP Client**: Uses Axios with custom User-Agent headers and a 10-second request timeout.
- **HTML Parsing**: Uses Cheerio to parse the DOM tree without requiring headless browser overhead (like Puppeteer or Playwright).
- **DOM Stripping**: Automatically removes noisy and irrelevant elements prior to text extraction:
  - `<script>` and `<style>` blocks
  - `<noscript>` and `<iframe>` tags
  - Navigation menus (`<nav>`, `<header>`, `<footer>`)
  - Advertisement containers, popups, and sidebars
- **Whitespace Normalization**: Compresses multiple newlines, tabs, and spaces into clean, readable text.

---

## 3. Example Invocation

```json
{
  "name": "fetch_webpage",
  "arguments": {
    "url": "https://example.com/article",
    "max_length": 3000
  }
}
```

---

## 4. Return Format

```json
{
  "url": "https://example.com/article",
  "content": "Article title and cleaned body text extracted from the document..."
}
```
