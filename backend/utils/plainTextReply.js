/** Strip common Markdown from AI replies (chat UI shows plain text). */
function toPlainTextReply(text) {
  if (!text) return '';
  let s = String(text);
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/\*([^*\n]+)\*/g, '$1');
  s = s.replace(/`([^`]+)`/g, '$1');
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/🔗\s*/g, '');
  return s.trim();
}

module.exports = { toPlainTextReply };
