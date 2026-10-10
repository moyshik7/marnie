# Skill: `expanded-capacity`

The `expanded-capacity` skill allows the agent to search, query, and retrieve reference documents from Marnie's local RAG knowledge base (`./data/capacity.db`).

---

## 1. Capabilities & Triggers

### When to Activate
- The user asks questions about their uploaded reference files, manuals, or notes.
- Verifying code specifications, design documents, or API definitions against uploaded knowledge.
- Searching for specific keywords or concepts across the local document repository.
- Retrieving the full content of a known uploaded file by name.

### Underlying Tool
- [`retrieve_expanded_capacity`](../tools/retrieve-expanded-capacity.md)

---

## 2. Invocation Patterns

### Full-Text RAG Search
```json
{
  "name": "retrieve_expanded_capacity",
  "arguments": {
    "query": "rate limiting configuration",
    "limit": 3
  }
}
```

### Retrieving a Document by Name
```json
{
  "name": "retrieve_expanded_capacity",
  "arguments": {
    "document_name": "api-spec.md"
  }
}
```

### Listing Available Documents
```json
{
  "name": "retrieve_expanded_capacity",
  "arguments": {
    "list_only": true
  }
}
```

---

## 3. Best Practices & Safety

- Synthesize retrieved facts directly into your answer rather than merely dumping raw excerpts.
- Always cite the document name when referencing information from Expanded Capacity.
- Use `list_only: true` first if you are unsure which documents exist in the knowledge base.
