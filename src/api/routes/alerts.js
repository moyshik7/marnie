'use strict';

const router = require('express').Router();
const discord = require('../../components/tools/discord');

function wrap(fn) {
  return async (req, res, next) => {
    try { await fn(req, res, next); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  };
}

/**
 * POST /api/alerts/send
 * Send a raw Discord alert.
 * Body: {
 *   message,
 *   webhookUrl?,   // overrides env DISCORD_WEBHOOK_URL
 *   username?,
 *   avatarUrl?,
 *   embeds?,
 *   level?         // "info" | "success" | "warning" | "error"
 * }
 */
router.post('/send', wrap(async (req, res) => {
  const { message, webhookUrl, username, avatarUrl, embeds, level } = req.body;
  if (!message && !embeds) {
    return res.status(400).json({ error: '`message` or `embeds` is required' });
  }

  const result = await discord.sendAlert({ message, webhookUrl, username, avatarUrl, embeds, level });
  res.json(result);
}));

/**
 * POST /api/alerts/notify
 * Send a titled notification embed to Discord.
 * Body: {
 *   title,
 *   body,
 *   level?,        // "info" | "success" | "warning" | "error"
 *   webhookUrl?,
 *   username?
 * }
 */
router.post('/notify', wrap(async (req, res) => {
  const { title, body, level, webhookUrl, username } = req.body;
  if (!title) return res.status(400).json({ error: '`title` is required' });
  if (!body)  return res.status(400).json({ error: '`body` is required' });

  const result = await discord.sendNotification({ title, body, level, webhookUrl, username });
  res.json(result);
}));

module.exports = router;
