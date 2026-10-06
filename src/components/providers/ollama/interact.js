'use strict';

const axios = require('axios');
const db = require('../../../db/index');

const getSetting = (key, fallback) => {
  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return (row && row.value) ? row.value : fallback;
  } catch {
    return fallback;
  }
};

const BASE_URL = () => getSetting('ollama_base_url', process.env.OLLAMA_BASE_URL || 'http://localhost:11434');
const DEFAULT_MODEL = () => getSetting('default_model', process.env.DEFAULT_MODEL || 'llama3.2');

/**
 * List available models from Ollama.
 * @returns {Promise<string[]>} Array of model names.
 */
async function listModels() {
  try {
    const res = await axios.get(`${BASE_URL()}/api/tags`, { timeout: 6000 });
    return (res.data.models || []).map((m) => m.name);
  } catch (err) {
    console.warn('[ollama] Error fetching models:', err.message);
    return [];
  }
}

/**
 * Resolve which model to use. If requested model is given, use it.
 * Otherwise fallback to DB default or first available model in Ollama.
 */
async function resolveModel(requestedModel) {
  if (requestedModel && typeof requestedModel === 'string' && requestedModel.trim()) {
    return requestedModel.trim();
  }
  const configured = DEFAULT_MODEL();
  try {
    const models = await listModels();
    if (models.includes(configured)) return configured;
    if (models.length > 0) return models[0];
  } catch {}
  return configured;
}

/**
 * Non-streaming chat completion.
 */
async function chat({ model, messages, options = {}, tools = [] }) {
  const chosenModel = await resolveModel(model);
  const payload = {
    model: chosenModel,
    messages,
    stream: false,
    options,
  };
  if (tools.length > 0) payload.tools = tools;

  const res = await axios.post(`${BASE_URL()}/api/chat`, payload);
  return res.data;
}

/**
 * Streaming chat completion. Calls onChunk for each streamed token.
 */
async function chatStream({ model, messages, options = {}, onChunk, onDone }) {
  const chosenModel = await resolveModel(model);
  const payload = {
    model: chosenModel,
    messages,
    stream: true,
    options,
  };

  const res = await axios.post(`${BASE_URL()}/api/chat`, payload, {
    responseType: 'stream',
  });

  return new Promise((resolve, reject) => {
    let buffer = '';
    res.data.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete last line
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          onChunk(parsed);
          if (parsed.done && onDone) onDone(parsed);
        } catch (e) {
          // ignore malformed chunks
        }
      }
    });
    res.data.on('end', resolve);
    res.data.on('error', reject);
  });
}

/**
 * Raw generate (completion, not chat).
 * @param {object} opts
 * @param {string} [opts.model]
 * @param {string} opts.prompt
 * @param {object} [opts.options]
 * @returns {Promise<object>}
 */
async function generate({ model, prompt, options = {} }) {
  const res = await axios.post(`${BASE_URL()}/api/generate`, {
    model: model || DEFAULT_MODEL(),
    prompt,
    stream: false,
    options,
  });
  return res.data;
}

module.exports = { listModels, chat, chatStream, generate };
