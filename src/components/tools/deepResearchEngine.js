'use strict';

const db = require('../../db/index');
const ollama = require('../providers/ollama/interact');
const { searchWeb } = require('./webSearch');
const reportStorage = require('./reportStorage');
const { findFirstSourceImage } = require('./metaImageFetcher');

// In-memory set of running research worker cancel tokens
const runningControllers = new Map();

function getResearch(id) {
  const row = db.prepare('SELECT * FROM deep_researches WHERE id = ?').get(id);
  if (!row) return null;
  return {
    ...row,
    logs: row.logs ? JSON.parse(row.logs) : [],
    sources: row.sources ? JSON.parse(row.sources) : [],
  };
}

function listResearches() {
  const rows = db.prepare('SELECT * FROM deep_researches ORDER BY created_at DESC').all();
  return rows.map((r) => ({
    ...r,
    logs: r.logs ? JSON.parse(r.logs) : [],
    sources: r.sources ? JSON.parse(r.sources) : [],
  }));
}

function updateResearch(id, fields) {
  const allowed = [
    'status',
    'summary',
    'report',
    'logs',
    'sources',
    'error',
    'image',
    'duration',
    'rounds',
    'queries',
    'urls_analyzed',
    'slug',
  ];
  const sets = [];
  const vals = { id };

  for (const [k, v] of Object.entries(fields)) {
    if (allowed.includes(k)) {
      sets.push(`${k} = @${k}`);
      vals[k] = (k === 'logs' || k === 'sources') && typeof v !== 'string' ? JSON.stringify(v) : v;
    }
  }

  if (sets.length === 0) return getResearch(id);
  sets.push("updated_at = strftime('%s','now')");

  db.prepare(`UPDATE deep_researches SET ${sets.join(', ')} WHERE id = @id`).run(vals);
  return getResearch(id);
}

function appendLog(id, message, stage = 'info') {
  try {
    const r = getResearch(id);
    if (!r) return;
    const logs = Array.isArray(r.logs) ? r.logs : [];
    logs.push({
      timestamp: Date.now(),
      stage,
      message,
    });
    db.prepare("UPDATE deep_researches SET logs = ?, updated_at = strftime('%s','now') WHERE id = ?")
      .run(JSON.stringify(logs), id);
  } catch (err) {
    console.error(`[deepResearch] Error appending log to ${id}:`, err.message);
  }
}

/**
 * Start iterative multi-step Deep Research execution.
 */
async function startResearchPipeline(researchId) {
  const research = getResearch(researchId);
  if (!research) return;

  const controller = new AbortController();
  runningControllers.set(researchId, controller);
  const startTime = Date.now();
  let previewImage = null;

  try {
    appendLog(researchId, `Initiating Deep Research on topic: "${research.topic}"`, 'start');

    // 1. Initial Research Plan and Sub-Queries
    appendLog(researchId, 'Generating research breakdown, perspectives, and targeted queries...', 'planning');
    
    let subQueries = [research.topic];
    try {
      const planPrompt = `You are a Principal Research Scientist. Break down this research query into 2 to 4 distinct, highly targeted web search queries that cover background, current state, key challenges, and technical nuances.
CRITICAL SEARCH INSTRUCTION: Each search query MUST be short, concise keywords strictly 2 to 5 words long (e.g. "small reasoning models architecture", "qwen test time compute", "deepseek r1 efficiency"). Never write long sentences, questions, or conversational phrases. Short queries ensure optimal search engine results.
Topic: "${research.topic}"
Output strictly valid JSON with an array of string queries:
{"queries": ["query 1", "query 2"]}`;

      const planRes = await ollama.chat({
        model: research.model,
        messages: [{ role: 'user', content: planPrompt }],
        options: { temperature: 0.2 },
      });

      const raw = planRes.message?.content || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.queries) && parsed.queries.length > 0) {
          subQueries = parsed.queries.slice(0, 4);
        }
      }
    } catch (err) {
      appendLog(researchId, `Sub-query planner fallback: ${err.message}`, 'warning');
    }

    // Clean and ensure queries are kept short (strictly 2 to 5 words)
    subQueries = subQueries
      .map((sq) => {
        if (!sq || typeof sq !== 'string') return '';
        let clean = sq.trim().replace(/^["'`]+|["'`]+$/g, '').trim();
        const words = clean.split(/\s+/);
        if (words.length > 5) {
          clean = words.slice(0, 5).join(' ');
        }
        return clean;
      })
      .filter(Boolean);
    if (subQueries.length === 0) {
      subQueries = [research.topic.split(/\s+/).slice(0, 5).join(' ')];
    }

    if (controller.signal.aborted) return;

    // 2. Multi-Source Web Exploration
    appendLog(researchId, `Executing search across ${subQueries.length} distinct angles using active search engine...`, 'searching');
    const gatheredSources = [];
    const sourceUrls = new Set();

    for (const q of subQueries) {
      if (controller.signal.aborted) return;
      appendLog(researchId, `Querying: "${q}"`, 'search_step');
      try {
        const searchRes = await searchWeb(q, { maxResults: research.max_results || 5 });
        if (searchRes.results && searchRes.results.length > 0) {
          for (const item of searchRes.results) {
            if (!sourceUrls.has(item.url)) {
              sourceUrls.add(item.url);
              gatheredSources.push({
                query: q,
                title: item.title,
                url: item.url,
                snippet: item.snippet,
                content: item.content || '',
              });
            }
          }
        }
      } catch (err) {
        appendLog(researchId, `Search error on "${q}": ${err.message}`, 'search_error');
      }
    }

    // Save gathered sources
    db.prepare('UPDATE deep_researches SET sources = ? WHERE id = ?')
      .run(JSON.stringify(gatheredSources), researchId);

    appendLog(researchId, `Gathered ${gatheredSources.length} verified web sources.`, 'sources_ready');

    // Extract meta image from sources
    try {
      appendLog(researchId, 'Checking source websites for preview banner image...', 'meta_image');
      previewImage = await findFirstSourceImage(gatheredSources);
      if (previewImage) {
        updateResearch(researchId, { image: previewImage });
        appendLog(researchId, `Retrieved source preview image.`, 'image_found');
      }
    } catch (imgErr) {
      appendLog(researchId, `Source image check note: ${imgErr.message}`, 'notice');
    }

    if (controller.signal.aborted) return;

    // 3. Iterative Revisions & Deep Synthesis
    const minRev = Math.max(1, research.min_revisions || 1);
    const maxRev = Math.max(minRev, research.max_revisions || 3);
    let currentDraft = '';

    // Initial Draft Formulation
    appendLog(researchId, `Formulating Initial Research Thesis (Revision 1 of ${maxRev})...`, 'drafting');
    
    const sourcesSummary = gatheredSources.map((s, idx) => {
      let entry = `[Source ${idx + 1}] ${s.title}\nURL: ${s.url}\nExcerpt: ${s.snippet}`;
      if (s.content) {
        entry += `\nPage Content: ${s.content}`;
      }
      return entry;
    }).join('\n\n');

    const draftPrompt = `You are a Senior Research Fellow producing an exhaustive, structured Deep Research Dossier.
Topic: "${research.topic}"

Gathered Web Evidence:
${sourcesSummary || 'No external sources found. Rely on verified facts.'}

Produce a comprehensive research report:
- Executive Summary & Core Thesis
- Detailed Technical/Domain Analysis
- Key Methodologies, Findings & Nuances
- Critical Perspectives & Trade-offs
- Future Outlook & Concrete Takeaways
- References & Cited Links

Formatting & Mathematical Instructions:
1. Provide mermaid diagrams in \`\`\`mermaid code blocks for architectures, workflows, timelines, and systems.
2. Provide LaTeX math enclosed in $...$ for inline equations and $$...$$ for block formulas whenever discussing quantitative details, metrics, formulas, or statistical concepts.
3. Write in high-density, authoritative markdown. Avoid em dashes (use regular dashes).`;

    const draftRes = await ollama.chat({
      model: research.model,
      messages: [{ role: 'user', content: draftPrompt }],
      options: { temperature: 0.3 },
    });

    currentDraft = draftRes.message?.content || 'Initial draft generated.';
    updateResearch(researchId, { report: currentDraft, summary: currentDraft.slice(0, 300) + '...' });
    appendLog(researchId, `Completed initial comprehensive draft (${currentDraft.split(' ').length} words).`, 'draft_complete');

    // Subsequent Review & Refinement Iterations
    for (let revision = 2; revision <= maxRev; revision++) {
      if (controller.signal.aborted) return;
      appendLog(researchId, `Conducting Deep Revision & Fact-Checking ${revision} of ${maxRev}...`, 'revision');

      const reviewPrompt = `You are a Critical Peer Reviewer and Technical Editor.
Topic: "${research.topic}"

Current Draft:
${currentDraft}

Review this research report critically:
1. Verify clarity, analytical depth, and precision.
2. Ensure counter-arguments, caveats, and citations are robust.
3. Enhance explanations, code/data examples, or structural flow.
4. Include LaTeX math expressions ($...$, $$...$$) and Mermaid flowcharts (\`\`\`mermaid) where helpful for clarity.

Provide the improved, definitive revised version in markdown. Avoid em dashes (use regular dashes).`;

      const reviewRes = await ollama.chat({
        model: research.model,
        messages: [{ role: 'user', content: reviewPrompt }],
        options: { temperature: 0.25 },
      });

      if (reviewRes.message?.content) {
        currentDraft = reviewRes.message.content;
        updateResearch(researchId, { report: currentDraft, summary: currentDraft.slice(0, 300) + '...' });
        appendLog(researchId, `Revision ${revision} concluded with enhanced analytical depth.`, 'revision_complete');
      }
    }

    // Mark as completed in memory / DB
    updateResearch(researchId, {
      status: 'completed',
      report: currentDraft,
      summary: currentDraft.slice(0, 350) + '...',
    });
    appendLog(researchId, 'Generating report metadata and publishing standalone markdown dossier...', 'metadata');

    // 4. Generate Frontmatter Metadata with AI model
    let metaTitle = research.topic;
    let metaKeywords = [];
    const metaSources = gatheredSources.map((s) => s.url).filter(Boolean);

    try {
      const metaPrompt = `You are a Research Archivist. Analyze this research report and generate structured metadata for publishing.
Report Topic: "${research.topic}"

Report Excerpt:
${currentDraft.slice(0, 2500)}

Generate strictly valid JSON with this exact schema:
{
  "title": "A concise, engaging title for the report",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"]
}
Do not include any commentary or extra text. Output strictly JSON.`;

      const metaRes = await ollama.chat({
        model: research.model,
        messages: [{ role: 'user', content: metaPrompt }],
        options: { temperature: 0.2 },
      });

      const rawMeta = metaRes.message?.content || '';
      const match = rawMeta.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.title) metaTitle = parsed.title;
        if (Array.isArray(parsed.keywords)) metaKeywords = parsed.keywords;
      }
    } catch (metaErr) {
      appendLog(researchId, `Metadata extraction notice: ${metaErr.message}`, 'notice');
    }

    if (metaKeywords.length === 0) {
      metaKeywords = research.topic.split(/\s+/).slice(0, 5);
    }

    // 5. Save as individual markdown file under workspace/research/slug.md
    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(1) + 's';
    const baseSlug = reportStorage.slugify(metaTitle || research.topic);
    const slug = `${baseSlug}.md`;

    const savedFile = reportStorage.saveReport(slug, {
      title: metaTitle,
      keywords: metaKeywords,
      prompt: research.topic,
      sources: metaSources,
      image: previewImage || '',
      duration: durationSeconds,
      rounds: maxRev,
      queries: subQueries.length,
      urls_analyzed: gatheredSources.length,
      model: research.model,
      search_engine: 'duckduckgo',
      time: new Date().toISOString(),
    }, currentDraft);

    updateResearch(researchId, {
      summary: currentDraft.slice(0, 350) + '...',
      error: savedFile, // store saved file name for reference
      slug: savedFile,
      image: previewImage || null,
      duration: durationSeconds,
      rounds: maxRev,
      queries: subQueries.length,
      urls_analyzed: gatheredSources.length,
    });

    appendLog(researchId, `Deep Research published to workspace/research/${savedFile} (URL: /report/${savedFile})`, 'finished');
  } catch (err) {
    if (controller.signal.aborted) {
      appendLog(researchId, 'Deep Research cancelled by user.', 'cancelled');
      updateResearch(researchId, { status: 'cancelled' });
    } else {
      console.error(`[deepResearch] Execution error for ${researchId}:`, err);
      appendLog(researchId, `Error encountered: ${err.message}`, 'error');
      updateResearch(researchId, { status: 'failed', error: err.message });
    }
  } finally {
    runningControllers.delete(researchId);
  }
}

function cancelResearch(researchId) {
  const ctrl = runningControllers.get(researchId);
  if (ctrl) {
    ctrl.abort();
    runningControllers.delete(researchId);
  }
  updateResearch(researchId, { status: 'cancelled' });
  appendLog(researchId, 'Research stopped by user.', 'cancelled');
  return getResearch(researchId);
}

function hasOngoingResearch() {
  const row = db.prepare("SELECT COUNT(*) as count FROM deep_researches WHERE status = 'in_progress'").get();
  return (row?.count || 0) > 0;
}

module.exports = {
  getResearch,
  listResearches,
  updateResearch,
  startResearchPipeline,
  cancelResearch,
  hasOngoingResearch,
};
