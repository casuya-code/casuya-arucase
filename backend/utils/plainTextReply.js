/** Strip common Markdown from AI replies (chat UI shows plain text). */
function toPlainTextReply(text) {
  if (!text) return '';
  let s = String(text);

  // Links: [label](url) → label, and bare "🔗 " decoration
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  s = s.replace(/🔗\s*/g, '');

  // Emphasis / code / headings
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/\*([^*\n]+)\*/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/^#{1,6}\s+/gm, '');

  // Tidy whitespace so replies read like a person wrote them
  s = s.replace(/\r\n?/g, '\n');
  s = s.replace(/\t/g, ' ');
  s = s.replace(/[ \u00a0]+$/gm, '');
  s = s.replace(/^[ \u00a0]+/gm, '');
  s = s.replace(/\n{3,}/g, '\n\n');

  return s.trim();
}

module.exports = { toPlainTextReply };
