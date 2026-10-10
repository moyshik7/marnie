'use strict';

const capacityDb = require('../../db/capacity');

/**
 * Retrieve or search documents from the local Expanded Capacity database.
 *
 * @param {object} params
 * @param {string} [params.query] - Search term, question, or keyword to find relevant document excerpts
 * @param {string} [params.document_name] - Name of a specific document to retrieve in full
 * @param {string} [params.id] - ID of a specific document to retrieve in full
 * @param {boolean} [params.list_only] - Set to true to list all documents available in Expanded Capacity
 * @param {number} [params.limit] - Maximum search results to return (default 5)
 */
async function retrieveCapacity({ query, document_name, id, list_only, limit = 5 } = {}) {
  try {
    // 1. Direct document retrieval by ID or document_name
    if (id || document_name) {
      let doc = null;
      if (id) {
        doc = capacityDb.getDocumentById(id);
      }
      if (!doc && document_name) {
        doc = capacityDb.getDocumentByName(document_name);
      }
      if (doc) {
        return {
          success: true,
          found: true,
          document: {
            id: doc.id,
            name: doc.name,
            size: doc.size,
            type: doc.type,
            category: doc.category,
            wordCount: doc.word_count,
            content: doc.content,
          },
          message: `Retrieved full document "${doc.name}" from Expanded Capacity.`,
        };
      }
      return {
        success: false,
        found: false,
        message: `Document "${document_name || id}" not found in Expanded Capacity.`,
      };
    }

    // 2. Listing documents only
    if (list_only || (!query && !document_name && !id)) {
      const docs = capacityDb.listDocuments();
      return {
        success: true,
        count: docs.length,
        documents: docs.map((d) => ({
          id: d.id,
          name: d.name,
          size: d.size,
          type: d.type,
          category: d.category,
          wordCount: d.word_count,
          snippet: d.snippet,
        })),
        message: docs.length === 0
          ? 'Expanded Capacity currently has no uploaded documents.'
          : `Expanded Capacity contains ${docs.length} reference document(s).`,
      };
    }

    // 3. Search query retrieval
    const results = capacityDb.searchDocuments(query, { limit: limit || 5 });
    return {
      success: true,
      query,
      count: results.length,
      results: results.map((r) => {
        const textContent = r.content || '';
        // If content is very long, provide up to 3500 chars to avoid blowing up the context window
        const contentSnippet = textContent.length > 3500
          ? textContent.slice(0, 3500) + '\n... (content truncated for context window)'
          : textContent;

        return {
          id: r.id,
          name: r.name,
          category: r.category,
          wordCount: r.word_count,
          matchSnippet: r.match_snippet,
          content: contentSnippet,
        };
      }),
      message: results.length === 0
        ? `No documents in Expanded Capacity matched the query "${query}".`
        : `Found ${results.length} relevant document(s) matching "${query}" in Expanded Capacity.`,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

module.exports = {
  retrieveCapacity,
};
