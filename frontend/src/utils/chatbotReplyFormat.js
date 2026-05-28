/**
 * Convert AI Markdown replies to plain text for the public chat bubble.
 */
export function stripMarkdownForChat(text) {
  if (text == null) return '';
  let s = String(text);

  // [label](url) → label
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // **bold** / __bold__
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  // *italic* (single asterisks, not list bullets at line start)
  s = s.replace(/(?<![*\n])\*([^*\n]+)\*(?![*])/g, '$1');
  // `code`
  s = s.replace(/`([^`]+)`/g, '$1');
  // # headings
  s = s.replace(/^#{1,6}\s+/gm, '');
  // decorative link emoji
  s = s.replace(/🔗\s*/g, '');

  return s.trim();
}
