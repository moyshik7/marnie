'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
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

function extractUrl(rawUrl) {
  if (!rawUrl) return '';
  const uddg = rawUrl.match(/[?&]uddg=([^&]+)/);
  if (uddg) {
    try {
      return decodeURIComponent(uddg[1]);
    } catch {}
  }
  if (rawUrl.startsWith('//')) {
    return 'https:' + rawUrl;
  }
  return rawUrl;
}

const SAFARI_UAS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
];

function getRandomUserAgent() {
  return SAFARI_UAS[Math.floor(Math.random() * SAFARI_UAS.length)];
}

// Global sequential request queue to prevent rapid burst 202 blocks on search endpoints
let queuePromise = Promise.resolve();
function throttledRequest(fn, delayMs = 650) {
  const next = queuePromise.then(async () => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fn();
  });
  queuePromise = next.catch(() => {});
  return next;
}

/**
 * Clean and normalize search query.
 * Strips surrounding quotes, conversational prefixes, and restricts overly long queries.
 */
function normalizeQuery(rawQuery) {
  if (!rawQuery || typeof rawQuery !== 'string') return '';
  let q = rawQuery.trim();
  // Strip outer quotes
  q = q.replace(/^["'`]+|["'`]+$/g, '').trim();
  // Strip common conversational prefixes if present
  q = q.replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:search\s+(?:the\s+web\s+)?(?:for\s+)?|look\s+up\s+|find\s+information\s+(?:about|on)\s+)/i, '').trim();
  return q;
}

/**
 * Fetch and extract core text content from a web page using Cheerio and Axios.
 * Strips scripts, styles, navigation, footers, and limits length to avoid overflowing LLM context.
 *
 * @param {string} url - Target webpage URL
 * @param {number} [maxLength=1800] - Maximum character length of extracted text
 * @returns {Promise<string|null>} Cleaned textual content or null on error
 */
async function fetchPageContent(url, maxLength = 1800) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 5500,
      maxContentLength: 4 * 1024 * 1024,
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (!res.data || typeof res.data !== 'string') return null;

    const $ = cheerio.load(res.data);

    // Remove boilerplate, script, styling, and navigation elements
    $('script, style, noscript, svg, iframe, nav, footer, header, aside, form, link, meta, select, button').remove();

    // Prefer semantic content wrappers if present
    let text = '';
    const candidates = [
      'article',
      'main',
      '[role="main"]',
      '#main',
      '#content',
      '.content',
      '.post-content',
      '.article-content',
      '.entry-content',
      'body',
    ];

    for (const selector of candidates) {
      const el = $(selector);
      if (el.length > 0) {
        const candidateText = el.text().trim();
        if (candidateText.length > 80) {
          text = candidateText;
          break;
        }
      }
    }

    if (!text) {
      text = $('body').text().trim();
    }

    // Clean up excessive whitespace and blank lines
    text = text
      .replace(/[ \t]+/g, ' ')
      .replace(/\r\n|\r/g, '\n')
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      .trim();

    if (text.length > maxLength) {
      text = text.slice(0, maxLength).trim() + '...';
    }

    return text || null;
  } catch (err) {
    // Unreachable, timeout, SSL error or blocked by site - return null gracefully
    return null;
  }
}

/**
 * Perform web search using DuckDuckGo HTML endpoint via HTTP POST.
 */
async function searchDuckDuckGoHtml(query, maxResults = 5) {
  return throttledRequest(async () => {
    const ua = getRandomUserAgent();
    const res = await axios.post('https://html.duckduckgo.com/html/', 'q=' + encodeURIComponent(query), {
      headers: {
        'User-Agent': ua,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://html.duckduckgo.com/',
        'Origin': 'https://html.duckduckgo.com',
      },
      timeout: 10000,
    });

    if (res.status === 202 || (typeof res.data === 'string' && res.data.includes('anomaly-modal'))) {
      return [];
    }

    const html = res.data;
    const results = [];
    const blocks = html.split(/class=\"[^\"]*web-result[^\"]*\"/);

    for (let i = 1; i < blocks.length && results.length < maxResults; i++) {
      const block = blocks[i];
      const titleMatch = block.match(/<a[^>]*class=\"[^\"]*result__a[^\"]*\"[^>]*href=\"([^\"]+)\"[^>]*>([\s\S]*?)<\/a>/i);
      const snippetMatch = block.match(/<a[^>]*class=\"[^\"]*result__snippet[^\"]*\"[^>]*>([\s\S]*?)<\/a>/i);

      if (titleMatch) {
        const url = extractUrl(titleMatch[1]);
        const title = decodeHtml(titleMatch[2].replace(/<[^>]+>/g, '').trim());
        const snippet = snippetMatch ? decodeHtml(snippetMatch[1].replace(/<[^>]+>/g, '').trim()) : '';

        if (title && url) {
          results.push({ title, url, snippet });
        }
      }
    }

    return results;
  }, 650);
}

/**
 * Perform web search using DuckDuckGo Lite endpoint via HTTP POST (fallback).
 */
async function searchDuckDuckGoLite(query, maxResults = 5) {
  return throttledRequest(async () => {
    const ua = getRandomUserAgent();
    const res = await axios.post('https://lite.duckduckgo.com/lite/', 'q=' + encodeURIComponent(query), {
      headers: {
        'User-Agent': ua,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://lite.duckduckgo.com/',
        'Origin': 'https://lite.duckduckgo.com',
      },
      timeout: 10000,
    });

    if (res.status === 202 || (typeof res.data === 'string' && res.data.includes('anomaly-modal'))) {
      return [];
    }

    const html = res.data;
    const results = [];
    const linkRegex = /<a[^>]*href=[\"']([^\"']+)[\"'][^>]*class=[\"']result-link[\"'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null && results.length < maxResults) {
      const url = extractUrl(match[1]);
      const title = decodeHtml(match[2].replace(/<[^>]+>/g, '').trim());
      const remaining = html.slice(match.index);
      const snippetMatch = remaining.match(/class=[\"']result-snippet[\"'][^>]*>([\s\S]*?)<\/td>/i);
      const snippet = snippetMatch ? decodeHtml(snippetMatch[1].replace(/<[^>]+>/g, '').trim()) : '';

      if (title && url) {
        results.push({ title, url, snippet });
      }
    }

    return results;
  }, 650);
}

/**
 * Perform web search using DuckDuckGo Instant Answer API (last-resort fallback).
 */
async function searchDuckDuckGoInstant(query, maxResults = 5) {
  try {
    const res = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1,
        skip_disambig: 0,
      },
      timeout: 8000,
    });
    const data = res.data;
    const results = [];

    if (data.Abstract && data.AbstractURL) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL,
        snippet: data.Abstract,
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (results.length >= maxResults) break;
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 50),
            url: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Robust DuckDuckGo search with automated fallback across HTML, Lite, and Instant API.
 */
async function searchDuckDuckGo(rawQuery, maxResults = 5) {
  const query = normalizeQuery(rawQuery);
  if (!query) return [];

  // 1. Primary: HTML POST with Safari UA
  try {
    const htmlResults = await searchDuckDuckGoHtml(query, maxResults);
    if (htmlResults && htmlResults.length > 0) {
      return htmlResults;
    }
  } catch (err) {
    // continue to fallback
  }

  // 2. Secondary: Lite POST
  try {
    const liteResults = await searchDuckDuckGoLite(query, maxResults);
    if (liteResults && liteResults.length > 0) {
      return liteResults;
    }
  } catch (err) {
    // continue to fallback
  }

  // 3. If query was very long, try shortening to first 4 words
  const words = query.split(/\s+/);
  if (words.length > 4) {
    const shortened = words.slice(0, 4).join(' ');
    try {
      const shortResults = await searchDuckDuckGoHtml(shortened, maxResults);
      if (shortResults && shortResults.length > 0) {
        return shortResults;
      }
    } catch {}
  }

  // 4. Final: Instant Answer API
  return searchDuckDuckGoInstant(query, maxResults);
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
 * Unified web search tool with automatic Cheerio link content scraping.
 * Provider can be 'duckduckgo' or 'searxng' (defaults to search_provider setting in DB).
 */
async function search(arg1, arg2) {
  let query;
  let maxResults = 5;
  let provider;
  let scrapeContent = true;
  let maxContentLength = 1800;

  if (typeof arg1 === 'string') {
    query = arg1;
    if (typeof arg2 === 'object' && arg2 !== null) {
      if (arg2.maxResults !== undefined) maxResults = arg2.maxResults;
      if (arg2.max_results !== undefined) maxResults = arg2.max_results;
      if (arg2.provider !== undefined) provider = arg2.provider;
      if (arg2.scrapeContent !== undefined) scrapeContent = arg2.scrapeContent;
      if (arg2.scrape_content !== undefined) scrapeContent = arg2.scrape_content;
      if (arg2.maxContentLength !== undefined) maxContentLength = arg2.maxContentLength;
      if (arg2.max_content_length !== undefined) maxContentLength = arg2.max_content_length;
    } else if (typeof arg2 === 'number') {
      maxResults = arg2;
    }
  } else if (typeof arg1 === 'object' && arg1 !== null) {
    query = arg1.query;
    if (arg1.maxResults !== undefined) maxResults = arg1.maxResults;
    if (arg1.max_results !== undefined) maxResults = arg1.max_results;
    if (arg1.provider !== undefined) provider = arg1.provider;
    if (arg1.scrapeContent !== undefined) scrapeContent = arg1.scrapeContent;
    if (arg1.scrape_content !== undefined) scrapeContent = arg1.scrape_content;
    if (arg1.maxContentLength !== undefined) maxContentLength = arg1.maxContentLength;
    if (arg1.max_content_length !== undefined) maxContentLength = arg1.max_content_length;
  }

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw Object.assign(new Error('`query` parameter is required for web search.'), { status: 400 });
  }

  const cleanQuery = normalizeQuery(query);
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

  // Scrape content of found links concurrently using Cheerio to enrich results
  if (scrapeContent !== false && Array.isArray(results) && results.length > 0) {
    const toScrape = results.slice(0, Math.min(results.length, 5));
    await Promise.allSettled(
      toScrape.map(async (item) => {
        if (item.url) {
          const content = await fetchPageContent(item.url, maxContentLength || 1800);
          if (content) {
            item.content = content;
          }
        }
      })
    );
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
  fetchPageContent,
  scrapeUrl: fetchPageContent,
};
