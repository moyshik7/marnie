'use strict';

const axios = require('axios');
const db = require('../../db/index');

function getWebhookUrl(explicitUrl) {
  if (explicitUrl) return explicitUrl;
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'discord_webhook_url'").get();
    if (row && row.value && row.value.trim()) return row.value.trim();
  } catch {}
  return process.env.DISCORD_WEBHOOK_URL;
}

/**
 * Send an alert / notification to a Discord channel via a webhook.
 * @param {object} opts
 * @param {string} [opts.webhookUrl]   - Discord webhook URL (falls back to env DISCORD_WEBHOOK_URL)
 * @param {string} opts.message        - Plain-text message content
 * @param {string} [opts.username]     - Override webhook bot username
 * @param {string} [opts.avatarUrl]    - Override webhook bot avatar
 * @param {Array<object>} [opts.embeds]- Discord rich embeds
 * @param {string} [opts.level]        - 'info' | 'success' | 'warning' | 'error' (affects embed colour)
 * @returns {Promise<{ sent: boolean }>}
 */
function stripEmojis(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/[\p{Extended_Pictographic}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').replace(/\s{2,}/g, ' ').trim();
}

async function sendAlert({ webhookUrl, message, title, username = 'Marnie', avatarUrl, embeds, level = 'info' }) {
  const url = getWebhookUrl(webhookUrl);
  if (!url) {
    throw Object.assign(
      new Error('No Discord webhook URL configured. Configure in Settings, set DISCORD_WEBHOOK_URL, or pass webhookUrl.'),
      { status: 400 }
    );
  }

  const cleanMessage = stripEmojis(message);
  const cleanTitle = stripEmojis(title);

  const colorMap = { info: 0x5865f2, success: 0x57f287, warning: 0xfee75c, error: 0xed4245 };
  const color = colorMap[level] ?? colorMap.info;

  // Ensure ALL messages are sent as rich embeds
  let resolvedEmbeds = embeds;
  if (!resolvedEmbeds || resolvedEmbeds.length === 0) {
    const embedObj = {
      color,
      description: cleanMessage || '',
      timestamp: new Date().toISOString(),
    };
    if (cleanTitle) embedObj.title = cleanTitle;
    resolvedEmbeds = [embedObj];
  } else {
    resolvedEmbeds = resolvedEmbeds.map((e) => ({
      color: e.color ?? color,
      timestamp: e.timestamp ?? new Date().toISOString(),
      ...e,
      description: e.description ? stripEmojis(e.description) : undefined,
      title: e.title ? stripEmojis(e.title) : undefined,
    }));
  }

  const body = {
    username,
    embeds: resolvedEmbeds,
  };
  if (avatarUrl) body.avatar_url = avatarUrl;

  await axios.post(url, body);
  return { sent: true };
}

/**
 * Send a simple notification with title + body as an embed.
 */
async function sendNotification({ webhookUrl, title, body, level = 'info', username }) {
  return sendAlert({
    webhookUrl,
    username,
    level,
    message: '',
    embeds: [
      {
        title,
        description: body,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

module.exports = { sendAlert, sendNotification };
