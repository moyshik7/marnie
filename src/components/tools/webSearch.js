'use strict';

const axios = require('axios');
const db = require('../../db/index');

function decodeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+)/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-fA-F]+)/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Perform web search using DuckDuckGo (HTML endpoint with actual destination URL extraction).
 */
async function searchDuckDuckGo(query, maxResults = 5) {
  const res = await axios.get('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    timeout: 12000,
  });

  const html = res.data;
  const results = [];
  const blocks = html.split(/class=\"[^\"]*web-result[^\"]*\"/);

  for (let i = 1; i < blocks.length && results.length < maxResults; i++) {
    const block = blocks[i];
    const titleMatch = block.match(/<a[^>]*class=\"[^\"]*result__a[^\"]*\"[^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/i);
    const snippetMatch = block.match(/<a[^>]*class=\"[^\"]*result__snippet[^\"]*\"[^>]*>([\s\S]*?)<\/a>/i);

    if (titleMatch) {
      let rawUrl = titleMatch[1];
      let url = rawUrl;
      const uddg = rawUrl.match(/[?&]uddg=([^&]+)/);
      if (uddg) {
        url = decodeURIComponent(uddg[1]);
      } else if (rawUrl.startsWith('//')) {
        url = 'https:' + rawUrl;
      }

      const title = decodeHtml(titleMatch[2].replace(/<[^>]+>/g, '').trim());
      const snippet = snippetMatch ? decodeHtml(snippetMatch[1].replace(/<[^>]+>/g, '').trim()) : '';

      results.push({ title, url, snippet });
    }
  }

  return results;
}

/**
 * Perform web search using a self-hosted SearXNG instance.
 */
async function searchSearXNG(query, maxResults = 5, customUrl) {
  let endpoint = customUrl;
  if (!endpoint) {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'searxng_url'").get();
      if (row && row.value) endpoint = row.value.trim();
    } catch {}
  }
  endpoint = (endpoint || process.env.SEARXNG_URL || 'http://localhost:8080').replace(/\/+$/, '');

  const res = await axios.get(`${endpoint}/search`, {
    params: {
      q: query,
      format: 'json',
    },
    timeout: 10000,
  });

  const rawResults = res.data?.results || [];
  return rawResults.slice(0, maxResults).map((item) => ({
    title: item.title || '',
    url: item.url || '',
    snippet: item.content || item.snippet || '',
  }));
}

/**
 * Unified web search tool.
 * Provider can be 'duckduckgo' or 'searxng' (defaults to search_provider setting in DB).
 */
async function search(arg1, arg2) {
  let query;
  let maxResults = 5;
  let provider;

  if (typeof arg1 === 'string') {
    query = arg1;
    if (typeof arg2 === 'object' && arg2 !== null) {
      if (arg2.maxResults !== undefined) maxResults = arg2.maxResults;
      if (arg2.provider !== undefined) provider = arg2.provider;
    } else if (typeof arg2 === 'number') {
      maxResults = arg2;
    }
  } else if (typeof arg1 === 'object' && arg1 !== null) {
    query = arg1.query;
    if (arg1.maxResults !== undefined) maxResults = arg1.maxResults;
    if (arg1.provider !== undefined) provider = arg1.provider;
  }

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw Object.assign(new Error('`query` parameter is required for web search.'), { status: 400 });
  }

  const cleanQuery = query.trim();
  const limit = Math.min(10, Math.max(1, parseInt(maxResults, 10) || 5));

  // Determine provider
  let activeProvider = provider;
  if (!activeProvider) {
    try {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'search_provider'").get();
      if (row && row.value) activeProvider = row.value.trim().toLowerCase();
    } catch {}
  }
  if (!activeProvider) activeProvider = 'duckduckgo';

  let results = [];
  let usedProvider = activeProvider;

  if (activeProvider === 'searxng') {
    try {
      results = await searchSearXNG(cleanQuery, limit);
    } catch (err) {
      console.warn(`[SearXNG Error] Failed to query SearXNG (${err.message}), falling back to DuckDuckGo...`);
      results = await searchDuckDuckGo(cleanQuery, limit);
      usedProvider = 'duckduckgo (fallback)';
    }
  } else {
    results = await searchDuckDuckGo(cleanQuery, limit);
    usedProvider = 'duckduckgo';
  }

  return {
    query: cleanQuery,
    provider: usedProvider,
    count: results.length,
    results,
  };
}

module.exports = {
  search,
  searchWeb: search,
  searchDuckDuckGo,
  searchSearXNG,
};
