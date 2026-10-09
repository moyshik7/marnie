'use strict';

/**
 * Filter out em dashes (—, \u2014) and horizontal bars (\u2015) in prose,
 * replacing them with normal dashes (-), while strictly PRESERVING code blocks
 * (```...```) and inline code (`...`) so code syntax is never corrupted.
 *
 * @param {string} text - Raw content
 * @returns {string} Text with em dashes converted to standard hyphens/dashes outside code
 */
function filterEmDashes(text) {
  if (!text || typeof text !== 'string') return text;

  // Split by code blocks: ```...``` and inline code: `...`
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g);

  return parts
    .map((part) => {
      // If this part starts with a backtick, it's code - keep completely untouched
      if (part.startsWith('`')) {
        return part;
      }
      // Replace em dash (—) and en dash (–) in normal text
      return part
        .replace(/[\u2014\u2015]/g, ' - ') // em dash and horizontal bar
        .replace(/\s*–\s*/g, ' - ')        // en dash
        .replace(/[ ]{2,}/g, ' ');         // collapse multiple spaces into one
    })
    .join('');
}

// Unicode Extended Pictographic and emoji modifiers regex
const EMOJI_REGEX = /[\p{Extended_Pictographic}\uFE0F\uFE0E\u200D]+/gu;

/**
 * Filter out decorative emojis in prose while strictly preserving code blocks
 * (```...```) and inline code (`...`) so code syntax is never corrupted.
 *
 * @param {string} text - Raw content
 * @returns {string} Text with emojis stripped outside code
 */
function filterEmojis(text) {
  if (!text || typeof text !== 'string') return text;
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/g);

  return parts
    .map((part) => {
      if (part.startsWith('`')) return part;
      return part
        .replace(EMOJI_REGEX, '')
        .replace(/[ ]{2,}/g, ' ');
    })
    .join('');
}

/**
 * Filter both em dashes and unwanted decorative emojis in assistant output
 */
function normalizeAssistantText(text) {
  if (!text || typeof text !== 'string') return text;
  return filterEmojis(filterEmDashes(text));
}

module.exports = {
  filterEmDashes,
  filterEmojis,
  normalizeAssistantText,
};
