# Tool: `retrieve_expanded_capacity`

Retrieves or searches reference documents from the local Expanded Capacity database (`./data/capacity.db`) using SQLite FTS5 full-text indexing.

---

## 1. Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `query` | `string` | No | Search keywords, terms, or questions to look up across all indexed documents. |
| `document_name` | `string` | No | Specific filename to fetch in full (e.g., `"api.md"`, `"notes.txt"`). Case-insensitive. |
| `list_only` | `boolean` | No | If `true`, returns a high-level inventory list of all documents stored in the database. |
| `limit` | `number` | No | Maximum number of matching results to return. Defaults to 5. |

---

## 2. Operation Modes

1. **Document Inventory Mode (`list_only: true`)**:
   Returns an array of all uploaded files with their names, word counts, and categories.
2. **Specific Document Retrieval (`document_name: "name"`)**:
   Fetches the complete full text of the named document.
3. **Full-Text RAG Search (`query: "keywords"`)**:
   Performs sub-millisecond FTS5 search across document titles and contents, returning ranked snippets.

---

## 3. Example Invocations

### Searching for architectural topics
```json
{
  "name": "retrieve_expanded_capacity",
  "arguments": {
    "query": "authentication bearer token",
    "limit": 3
  }
}
```

### Listing all reference documents
```json
{
  "name": "retrieve_expanded_capacity",
  "arguments": {
    "list_only": true
  }
}
```

---

## 4. Return Format

```json
{
  "type": "search_results",
  "query": "authentication bearer token",
  "count": 1,
  "results": [
    {
      "id": "e9a0f7c2-...",
      "name": "security-architecture.md",
      "category": "Architecture",
      "snippet": "...uses standard Authorization headers formatted as Bearer token...",
      "word_count": 1420
    }
  ]
}
```
