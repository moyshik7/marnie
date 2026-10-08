/**
 * API Client for Marnie Backend
 * Connects to Express endpoints with configurable base URL and SSE streaming support.
 */

const getApiBase = () => {
  return localStorage.getItem('marnie_api_base') || '/api';
};

export const setCustomApiBase = (url) => {
  if (!url || url.trim() === '') {
    localStorage.removeItem('marnie_api_base');
  } else {
    localStorage.setItem('marnie_api_base', url.replace(/\/+$/, ''));
  }
};

export const getCustomApiBase = () => {
  return localStorage.getItem('marnie_api_base') || '';
};

async function request(endpoint, options = {}) {
  const base = getApiBase();
  const url = `${base}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorDetail = '';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.error || res.statusText;
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail || `HTTP error ${res.status}`);
  }

  return res.json();
}

// ── Conversations ───────────────────────────────────────────
export async function listConversations() {
  return request('/chat/conversations');
}

export async function createConversation(title = 'New conversation', model = '') {
  return request('/chat/conversations', {
    method: 'POST',
    body: JSON.stringify({ title, model: model || undefined }),
  });
}

export async function getConversation(id) {
  return request(`/chat/conversations/${id}`);
}

export async function updateConversation(id, fields) {
  return request(`/chat/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export async function renameConversation(id, title) {
  return updateConversation(id, { title });
}

export async function deleteConversation(id) {
  return request(`/chat/conversations/${id}`, {
    method: 'DELETE',
  });
}

// ── Models ──────────────────────────────────────────────────
export async function listModels() {
  try {
    const data = await request('/chat/models');
    return data.models || [];
  } catch (err) {
    console.warn('Failed to load Ollama models:', err.message);
    return [];
  }
}

// ── Streaming & Non-streaming Chat ──────────────────────────
export async function sendMessageStream({
  conversationId,
  message,
  model,
  system,
  onChunk,
  onDone,
  signal,
}) {
  const base = getApiBase();
  const url = `${base}/chat/conversations/${conversationId}/complete`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      model: model || undefined,
      system: system || undefined,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorData.detail || errorData.error || 'Chat request failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullAccumulated = '';
  let fullThinking = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep trailing partial line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');
      if (!dataStr) continue;

      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.thinking) {
          fullThinking += parsed.thinking;
        }
        if (parsed.token) {
          fullAccumulated += parsed.token;
        }
        if (parsed.token || parsed.thinking) {
          onChunk(parsed.token || '', fullAccumulated, parsed.thinking || '', fullThinking);
        }
        if (parsed.done) {
          if (onDone) onDone(fullAccumulated, fullThinking);
          return { content: fullAccumulated, thinking: fullThinking };
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  if (onDone) onDone(fullAccumulated, fullThinking);
  return { content: fullAccumulated, thinking: fullThinking };
}

// ── Settings ────────────────────────────────────────────────
export async function getSettings() {
  return request('/settings');
}

export async function updateSettings(updates) {
  return request('/settings', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function testOllamaConnection(url) {
  return request('/settings/test-ollama', {
    method: 'POST',
    body: JSON.stringify({ url: url || undefined }),
  });
}

export async function testDiscordAlert(webhookUrl) {
  return request('/settings/test-discord', {
    method: 'POST',
    body: JSON.stringify({ webhookUrl: webhookUrl || undefined }),
  });
}

// ── Tools ───────────────────────────────────────────────────
export async function runBash(command, cwd) {
  return request('/tools/bash', {
    method: 'POST',
    body: JSON.stringify({ command, cwd }),
  });
}

export async function runCode(code) {
  return request('/tools/code/run', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function searchFiles(directory, pattern, useRegex = false) {
  return request('/tools/filesystem/search', {
    method: 'POST',
    body: JSON.stringify({ directory, pattern, useRegex }),
  });
}

export async function callApiTool({ url, method, headers, params, data, timeout }) {
  return request('/tools/api-call', {
    method: 'POST',
    body: JSON.stringify({ url, method, headers, params, data, timeout }),
  });
}

export async function scrapeWebpage(url, maxLength = 2000) {
  return request('/tools/scrape', {
    method: 'POST',
    body: JSON.stringify({ url, maxLength }),
  });
}

// ── Tasks ───────────────────────────────────────────────────
export async function listTasks(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request(`/tasks${query}`);
}

export async function createTask(task) {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export async function updateTask(id, fields) {
  return request(`/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export async function deleteTask(id) {
  return request(`/tasks/${id}`, { method: 'DELETE' });
}

// ── Cron Jobs ───────────────────────────────────────────────
export async function listCronJobs() {
  return request('/cron');
}

export async function createCronJob(job) {
  return request('/cron', {
    method: 'POST',
    body: JSON.stringify(job),
  });
}

export async function pauseCronJob(id) {
  return request(`/cron/${id}/pause`, { method: 'POST' });
}

export async function resumeCronJob(id) {
  return request(`/cron/${id}/resume`, { method: 'POST' });
}

export async function deleteCronJob(id) {
  return request(`/cron/${id}`, { method: 'DELETE' });
}

// ── Timers ──────────────────────────────────────────────────
export async function setTimer({ seconds, duration, message, title }) {
  return request('/tools/timer', {
    method: 'POST',
    body: JSON.stringify({ seconds, duration, message, title }),
  });
}

export async function listTimers() {
  return request('/tools/timer');
}

export async function cancelTimer(id) {
  return request(`/tools/timer/${id}`, { method: 'DELETE' });
}

// ── Deep Research ───────────────────────────────────────────
export async function listResearches() {
  return request('/research');
}

export async function checkOngoingResearch() {
  return request('/research/status/ongoing');
}

export async function getResearch(id) {
  return request(`/research/${id}`);
}

export async function startDeepResearch(params) {
  return request('/research', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function cancelDeepResearch(id) {
  return request(`/research/${id}/cancel`, { method: 'POST' });
}

export async function deleteDeepResearch(id) {
  return request(`/research/${id}`, { method: 'DELETE' });
}

export async function clearAllResearches() {
  return request('/research', { method: 'DELETE' });
}

// ── Markdown Research Reports ────────────────────────────────
export async function listMarkdownReports() {
  return request('/research/reports');
}

export async function getReportBySlug(slug) {
  return request(`/research/reports/${encodeURIComponent(slug)}`);
}

export async function deleteMarkdownReport(slug) {
  return request(`/research/reports/${encodeURIComponent(slug)}`, { method: 'DELETE' });
}

