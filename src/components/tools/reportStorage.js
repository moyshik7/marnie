'use strict';

const fs = require('fs');
const path = require('path');

function getResearchDir() {
  const dir = path.resolve(process.env.WORKSPACE_DIR || './workspace', 'research');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Generate a clean, URL-safe slug from a topic or title.
 */
function slugify(text) {
  if (!text || typeof text !== 'string') return `report-${Date.now()}`;
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base ? base.slice(0, 80) : `report-${Date.now()}`;
}

/**
 * Parse YAML frontmatter and body from a markdown file.
 */
function parseFrontmatter(rawContent) {
  if (!rawContent || typeof rawContent !== 'string') {
    return { metadata: {}, content: '' };
  }

  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { metadata: {}, content: rawContent.trim() };
  }

  const yamlStr = match[1];
  const body = match[2];
  const metadata = {};

  const lines = yamlStr.split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let val = line.slice(colonIdx + 1).trim();

    if (!key) continue;

    // Handle string quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }

    // Try parsing arrays or JSON objects (e.g. ["a", "b"] or {"a", "b"})
    if ((val.startsWith('[') && val.endsWith(']')) || (val.startsWith('{') && val.endsWith('}')) || (val.startsWith('[') && val.endsWith(']'))) {
      try {
        // Fix potential curly brace set syntax like {"keywords", "example"] to valid JSON
        let jsonCandidate = val;
        if (jsonCandidate.startsWith('{') && jsonCandidate.endsWith(']')) {
          jsonCandidate = '[' + jsonCandidate.slice(1);
        } else if (jsonCandidate.startsWith('{') && jsonCandidate.endsWith('}')) {
          jsonCandidate = '[' + jsonCandidate.slice(1, -1) + ']';
        }
        metadata[key] = JSON.parse(jsonCandidate);
        continue;
      } catch {}
    }

    metadata[key] = val;
  }

  return { metadata, content: body.trim() };
}

/**
 * Serialize metadata and markdown body into frontmatter format.
 */
function serializeFrontmatter(metadata, body) {
  const lines = ['---'];
  if (metadata.title) {
    lines.push(`title: ${JSON.stringify(metadata.title)}`);
  }
  if (metadata.keywords) {
    const kw = Array.isArray(metadata.keywords) ? metadata.keywords : [String(metadata.keywords)];
    lines.push(`keywords: ${JSON.stringify(kw)}`);
  }
  if (metadata.prompt) {
    lines.push(`prompt: ${JSON.stringify(metadata.prompt)}`);
  }
  if (metadata.sources) {
    const src = Array.isArray(metadata.sources) ? metadata.sources : [String(metadata.sources)];
    lines.push(`sources: ${JSON.stringify(src)}`);
  }
  if (metadata.time) {
    lines.push(`time: ${JSON.stringify(metadata.time)}`);
  } else {
    lines.push(`time: ${JSON.stringify(new Date().toISOString())}`);
  }
  lines.push('---');
  lines.push('');
  lines.push(body ? body.trim() : '');
  lines.push('');
  return lines.join('\n');
}

/**
 * Save report to workspace/research/<slug>.md
 */
function saveReport(slug, metadata, content) {
  const dir = getResearchDir();
  const safeSlug = slug.endsWith('.md') ? slug : `${slug}.md`;
  const filePath = path.join(dir, safeSlug);
  const data = serializeFrontmatter(metadata, content);
  fs.writeFileSync(filePath, data, 'utf8');
  return safeSlug;
}

/**
 * Read report by slug or filename.
 */
function readReport(slug) {
  const dir = getResearchDir();
  const safeSlug = slug.endsWith('.md') ? slug : `${slug}.md`;
  const filePath = path.join(dir, safeSlug);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf8');
  const stat = fs.statSync(filePath);
  const { metadata, content } = parseFrontmatter(raw);

  return {
    slug: safeSlug,
    title: metadata.title || safeSlug.replace(/\.md$/, '').replace(/-/g, ' '),
    keywords: Array.isArray(metadata.keywords) ? metadata.keywords : [],
    prompt: metadata.prompt || '',
    sources: Array.isArray(metadata.sources) ? metadata.sources : [],
    time: metadata.time || stat.mtime.toISOString(),
    content,
    raw,
  };
}

/**
 * List all report markdown files in workspace/research/
 */
function listReports() {
  const dir = getResearchDir();
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const reports = [];

  for (const file of files) {
    try {
      const rep = readReport(file);
      if (rep) {
        reports.push({
          slug: rep.slug,
          title: rep.title,
          keywords: rep.keywords,
          prompt: rep.prompt,
          sources: rep.sources,
          time: rep.time,
          summary: rep.content ? rep.content.slice(0, 300) + '...' : '',
        });
      }
    } catch {}
  }

  // Sort descending by time
  reports.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  return reports;
}

/**
 * Delete a report markdown file.
 */
function deleteReport(slug) {
  const dir = getResearchDir();
  const safeSlug = slug.endsWith('.md') ? slug : `${slug}.md`;
  const filePath = path.join(dir, safeSlug);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

module.exports = {
  getResearchDir,
  slugify,
  parseFrontmatter,
  serializeFrontmatter,
  saveReport,
  readReport,
  listReports,
  deleteReport,
};
