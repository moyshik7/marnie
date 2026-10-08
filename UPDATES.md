### Automatic Meta Image Extraction & Markdown Header Storage

- Created metaImageFetcher.js to extract OpenGraph (og:image), Twitter cards (twitter:image), or prominent article images from discovered source websites.
- Saved into the YAML frontmatter of workspace/research/<slug>.md

```md
---
title: "Bangladesh Low-Investment Business Opportunities: 2025-2026 Market Analysis"
keywords: ["Bangladesh", "SMEs", "Low Investment"]
prompt: "Find me 10 business ideas to start in bangladesh..."
sources: ["https://example.com/..."]
image: "https://www.99businessideas.com/wp-content/uploads/2021/02/businessideasinbangladesh.jpg"
duration: "533.4s"
rounds: 3
queries: 7
urls_analyzed: 13
model: "qwen3.5:9b"
search_engine: "duckduckgo"
time: "2026-10-08T20:16:35.704Z"
---
```


