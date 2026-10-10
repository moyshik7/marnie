---
name: expanded-capacity
description: >-
  Retrieve and search reference documents from the local Expanded Capacity database (local RAG system).
  Use when querying user notebook files, markdown documents, and text references, retrieving full files by name,
  or listing available knowledge stored in SQLite.
---

# Expanded Capacity Skill (Local RAG)

Expanded Capacity provides a dedicated local Retrieval-Augmented Generation (RAG) system powered by a dedicated SQLite database (`data/capacity.db`) with full-text search (FTS5). Users upload markdown (`.md`) and plain text (`.txt`) files into notebook reference cards, and this skill empowers the AI agent to search, inspect, and retrieve information on-demand.

## When to Use

- Answering questions about files, documents, or knowledge uploaded into the Expanded Capacity notebook.
- Searching for specific keywords, concepts, code snippets, or sections across all uploaded notebook files.
- Retrieving the full content of a specific reference document by its filename or ID.
- Listing all available notebook documents to discover what references exist.

## Tool Invocation

### 1. Search by Query or Topic

```json
<tool_call>
{
  "name": "retrieve_expanded_capacity",
  "arguments": {
    "query": "authentication flow and jwt tokens",
    "limit": 5
  }
}
</tool_call>
```

### 2. Retrieve Specific Document Content

```json
<tool_call>
{
  "name": "retrieve_expanded_capacity",
  "arguments": {
    "document_name": "api_spec.md"
  }
}
</tool_call>
```

### 3. List All Available Documents

```json
<tool_call>
{
  "name": "retrieve_expanded_capacity",
  "arguments": {
    "list_only": true
  }
}
</tool_call>
```

## Parameters

- `query` (string, optional): Search keyword, question, or topic to search across notebook documents.
- `document_name` (string, optional): Specific filename to retrieve in full (e.g. `notes.txt`, `architecture.md`).
- `id` (string, optional): Specific document ID to retrieve in full.
- `list_only` (boolean, optional): If `true`, lists all documents in Expanded Capacity with metadata and summary snippets.
- `limit` (number, optional): Maximum matching search results to return (default: `5`).

## Aliases

`expanded_capacity`, `query_expanded_capacity`, `search_expanded_capacity`, `retrieve_capacity`, `capacity_search`, `capacity_query`, `rag_query`, `rag_search`

## Programmatic Backend API

```javascript
const capacityDb = require('./src/db/capacity');

// Search documents
const matches = capacityDb.searchDocuments('database schema', { limit: 5 });

// Retrieve by name
const doc = capacityDb.getDocumentByName('schema.md');

// List all documents
const allDocs = capacityDb.listDocuments();
```
