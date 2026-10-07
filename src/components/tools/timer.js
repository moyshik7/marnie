'use strict';

const discord = require('./discord');

// In-memory registry of active timers
const activeTimers = new Map();

/**
 * Parse human duration (e.g. 60, "30s", "5m", "1h", "90 seconds") into seconds.
 */
function parseDurationToSeconds(val) {
  if (typeof val === 'number') {
    return Math.max(1, Math.round(val));
  }
  if (!val || typeof val !== 'string') {
    return null;
  }

  const str = val.trim().toLowerCase();

  // Pure digits: "60"
  if (/^\d+(\.\d+)?$/.test(str)) {
    return Math.max(1, Math.round(parseFloat(str)));
  }

  // Matching patterns like "5m", "10s", "2h", "5 min", "1 hour"
  const match = str.match(/^(\d+(?:\.\d+)?)\s*(s|sec|seconds?|m|min|minutes?|h|hr|hours?)$/i);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit.startsWith('s')) return Math.max(1, Math.round(num));
    if (unit.startsWith('m')) return Math.max(1, Math.round(num * 60));
    if (unit.startsWith('h')) return Math.max(1, Math.round(num * 3600));
  }

  return null;
}

/**
 * Set a timer that sends a Discord notification when expired.
 * @param {object} opts
 * @param {number} [opts.seconds]   - Duration in seconds
 * @param {string|number} [opts.duration]  - Duration string ("5m", "30s", "1h") or number
 * @param {number} [opts.minutes]   - Duration in minutes
 * @param {string} opts.message     - Message content to alert on Discord
 * @param {string} [opts.title]     - Title for Discord embed
 * @param {string} [opts.webhookUrl]- Optional override Discord webhook URL
 */
async function setTimer({ seconds, duration, minutes, message, title, webhookUrl } = {}) {
  // Determine duration in seconds
  let totalSeconds = null;

  if (seconds !== undefined && seconds !== null) {
    totalSeconds = parseDurationToSeconds(seconds);
  } else if (duration !== undefined && duration !== null) {
    totalSeconds = parseDurationToSeconds(duration);
  } else if (minutes !== undefined && minutes !== null) {
    totalSeconds = parseDurationToSeconds(minutes * 60);
  }

  if (!totalSeconds || totalSeconds <= 0 || isNaN(totalSeconds)) {
    throw Object.assign(
      new Error('Invalid timer duration. Please specify duration in seconds (e.g. 60) or duration string (e.g. "5m", "30s", "1h").'),
      { status: 400 }
    );
  }

  const cleanMessage = message ? String(message).trim() : 'Timer finished!';
  const timerTitle = title ? String(title).trim() : 'Timer Alert';
  const id = `timer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const delayMs = totalSeconds * 1000;
  const createdAt = new Date();
  const fireAt = new Date(Date.now() + delayMs);

  const timeoutHandle = setTimeout(async () => {
    activeTimers.delete(id);
    try {
      await discord.sendAlert({
        webhookUrl,
        title: timerTitle,
        message: cleanMessage,
        level: 'info',
      });
      console.log(`[TIMER] Alert successfully sent to Discord for timer "${id}": "${cleanMessage}"`);
    } catch (err) {
      console.error(`[TIMER ERROR] Failed to send Discord alert for timer "${id}":`, err.message);
    }
  }, delayMs);

  // Store in active timers map
  activeTimers.set(id, {
    id,
    durationSeconds: totalSeconds,
    message: cleanMessage,
    title: timerTitle,
    createdAt: createdAt.toISOString(),
    fireAt: fireAt.toISOString(),
    timeoutHandle,
  });

  return {
    success: true,
    timer_id: id,
    duration_seconds: totalSeconds,
    created_at: createdAt.toISOString(),
    fire_at: fireAt.toISOString(),
    message: cleanMessage,
    status: `Timer set for ${totalSeconds} second${totalSeconds === 1 ? '' : 's'}. A Discord alert will be sent at ${fireAt.toLocaleTimeString()}.`,
  };
}

/**
 * List currently active timers.
 */
function listTimers() {
  const result = [];
  const now = Date.now();
  for (const [id, timer] of activeTimers.entries()) {
    const fireTime = new Date(timer.fireAt).getTime();
    const remainingSeconds = Math.max(0, Math.round((fireTime - now) / 1000));
    result.push({
      id,
      duration_seconds: timer.durationSeconds,
      remaining_seconds: remainingSeconds,
      message: timer.message,
      title: timer.title,
      fire_at: timer.fireAt,
      created_at: timer.createdAt,
    });
  }
  return result;
}

/**
 * Cancel an active timer by ID.
 */
function cancelTimer(id) {
  const timer = activeTimers.get(id);
  if (!timer) {
    return { cancelled: false, message: `Timer with ID "${id}" not found or already fired.` };
  }
  clearTimeout(timer.timeoutHandle);
  activeTimers.delete(id);
  return { cancelled: true, message: `Timer "${id}" successfully cancelled.` };
}

module.exports = {
  setTimer,
  listTimers,
  cancelTimer,
};
