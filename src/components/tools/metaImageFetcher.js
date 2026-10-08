'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function isIgnoredImage(src) {
  if (!src || typeof src !== 'string') return true;
  const lower = src.toLowerCase();
  if (lower.startsWith('data:')) return true;
  if (lower.endsWith('.svg') || lower.endsWith('.ico')) return true;
  if (
    lower.includes('shackle') ||
    lower.includes('pixel') ||
    lower.includes('spacer') ||
    lower.includes('1x1') ||
    lower.includes('badge') ||
    lower.includes('tracking') ||
    lower.includes('/icon') ||
    lower.includes('icon-') ||
    lower.includes('favicon')
  ) {
    return true;
  }
  return false;
}

/**
 * Extract OpenGraph / Twitter or featured meta image from a given webpage URL.
 *
 * @param {string} url - Webpage URL to inspect
 * @returns {Promise<string|null>} Absolute image URL or null
 */
async function extractMetaImage(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return null;

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 4500,
      maxContentLength: 4 * 1024 * 1024,
      responseType: 'text',
      validateStatus: (status) => status >= 200 && status < 400,
    });

    if (!res.data || typeof res.data !== 'string') return null;

    const $ = cheerio.load(res.data);

    // 1. Check primary Open Graph / Twitter meta tags
    const candidates = [
      $('meta[property="og:image"]').attr('content'),
      $('meta[property="og:image:url"]').attr('content'),
      $('meta[property="og:image:secure_url"]').attr('content'),
      $('meta[name="twitter:image"]').attr('content'),
      $('meta[name="twitter:image:src"]').attr('content'),
      $('meta[itemprop="image"]').attr('content'),
      $('link[rel="image_src"]').attr('href'),
    ];

    for (const cand of candidates) {
      if (cand && !isIgnoredImage(cand)) {
        try {
          const resolved = new URL(cand.trim(), url).href;
          if (resolved.startsWith('http')) return resolved;
        } catch {}
      }
    }

    // 2. Check prominent article or featured images
    let foundImg = null;
    $('article img, main img, .post-thumbnail img, .featured-image img, figure img, img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-original');
      if (src && !isIgnoredImage(src)) {
        try {
          const resolved = new URL(src.trim(), url).href;
          if (resolved.startsWith('http')) {
            foundImg = resolved;
            return false; // Break loop
          }
        } catch {}
      }
    });

    return foundImg;
  } catch {
    return null;
  }
}

/**
 * Scan gathered sources to find the first available meta preview image.
 *
 * @param {Array<{url: string}>|Array<string>} sources - List of source objects or URLs
 * @returns {Promise<string|null>} The first resolved meta image URL
 */
async function findFirstSourceImage(sources) {
  if (!Array.isArray(sources) || sources.length === 0) return null;

  const urls = sources
    .map((s) => (typeof s === 'string' ? s : s?.url))
    .filter((u) => u && typeof u === 'string' && u.startsWith('http'))
    .slice(0, 8); // Check up to top 8 sources

  for (const url of urls) {
    const img = await extractMetaImage(url);
    if (img) return img;
  }

  return null;
}

module.exports = {
  extractMetaImage,
  findFirstSourceImage,
};
