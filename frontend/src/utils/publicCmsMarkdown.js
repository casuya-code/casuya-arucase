/**
 * Shared markdown parsing for public CMS pages (no DOM / DOMPurify).
 */

export function escapeHtml(text) {
  if (text == null) return '';
  const s = String(text);
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return s.replace(/[&<>"']/g, (ch) => map[ch] || ch);
}

export function applyBoldMarkers(safeLine) {
  return safeLine.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export function looksLikeMarkdownPlain(s) {
  if (!s || typeof s !== 'string') return false;
  const t = s.trim();
  if (!t) return false;
  if (/<[a-z][\s\S]*?>/i.test(t)) return false;
  return /^#{2,3}\s/m.test(t);
}

export function hasRealHtml(s) {
  return s && /<[a-z][\s\S]*?>/i.test(String(s).trim());
}

/**
 * @param {string} markdown
 * @param {{ splitH3?: boolean }} options
 */
export function parseMarkdownSections(markdown, { splitH3 = true } = {}) {
  const sections = [];
  let current = null;

  for (const raw of String(markdown || '').split(/\r?\n/)) {
    const h2 = raw.match(/^##\s+(.+)$/);
    const h3 = raw.match(/^###\s+(.+)$/);
    if (h2 || (h3 && splitH3)) {
      if (current) sections.push(current);
      current = { title: (h2 || h3)[1].trim(), level: h2 ? 2 : 3, bodyLines: [] };
      continue;
    }
    if (h3 && !splitH3 && current) {
      current.bodyLines.push(raw);
      continue;
    }
    if (!current) {
      if (raw.trim()) current = { title: '', level: 2, bodyLines: [raw], preamble: true };
      continue;
    }
    current.bodyLines.push(raw);
  }
  if (current) sections.push(current);
  return sections;
}

/**
 * @param {string} body
 * @param {{
 *   listClass: string,
 *   textClass: string,
 *   h3Class?: string,
 *   orderedListClass?: string,
 *   listVariant?: 'default' | 'timeline' | 'steps' | 'contact',
 * }} classes
 */
export function bodyMarkdownToHtml(body, classes) {
  const b = String(body || '').trim();
  if (!b) return '';

  const lines = b.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let html = '';
  let inUl = false;
  let inOl = false;
  let stepNum = 0;

  const closeUl = () => {
    if (inUl) {
      html += classes.listVariant === 'timeline' ? '</div>' : '</ul>';
      inUl = false;
    }
  };

  const closeOl = () => {
    if (inOl) {
      html += '</ol>';
      inOl = false;
      stepNum = 0;
    }
  };

  const closeLists = () => {
    closeUl();
    closeOl();
  };

  const openBulletList = () => {
    if (classes.listVariant === 'timeline') {
      html += `<div class="${classes.listClass}">`;
    } else {
      html += `<ul class="${classes.listClass}">`;
    }
    inUl = true;
  };

  for (const line of lines) {
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      closeLists();
      html += `<h3 class="${classes.h3Class || 'policy-chunk__h3'}">${applyBoldMarkers(escapeHtml(h3[1].trim()))}</h3>`;
      continue;
    }

    const ordered = line.match(/^(\d+)\.\s+(.+)$/);
    if (ordered) {
      closeUl();
      if (!inOl) {
        html += `<ol class="${classes.orderedListClass || 'admissions-steps'}">`;
        inOl = true;
        stepNum = 0;
      }
      stepNum += 1;
      const itemHtml = applyBoldMarkers(escapeHtml(ordered[2].trim()));
      if (classes.listVariant === 'steps' || classes.orderedListClass === 'admissions-steps') {
        html += `<li><span class="admissions-steps__num" aria-hidden="true">${stepNum}</span><span>${itemHtml}</span></li>`;
      } else {
        html += `<li>${itemHtml}</li>`;
      }
      continue;
    }

    if (line.startsWith('- ')) {
      closeOl();
      const bullet = line.slice(2).trim();
      if (!inUl) openBulletList();

      if (classes.listVariant === 'timeline') {
        const timeline = bullet.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
        const tl = classes.timelineClass || 'admissions-timeline';
        if (timeline) {
          html +=
            `<div class="${tl}__item">` +
            `<span class="${tl}__label">${escapeHtml(timeline[1].trim())}</span>` +
            `<span class="${tl}__value">${applyBoldMarkers(escapeHtml(timeline[2].trim()))}</span>` +
            `</div>`;
          continue;
        }
      }

      if (classes.listVariant === 'contact') {
        const contact = bullet.match(/^\*\*([^*]+)\*\*:\s*(.+)$/);
        if (contact) {
          const key = escapeHtml(contact[1].trim());
          const value = contact[2].trim();
          const keyClass = `${classes.listClass}__key`;
          const linkClass = `${classes.listClass}__link contact-link`;
          const emailMatch = value.match(/^[\w.+-]+@[\w.-]+\.\w+$/);
          const phoneMatch = value.match(/^\+?[\d\s()-]+$/);
          let valueHtml;
          if (emailMatch) {
            valueHtml = `<a class="${linkClass}" href="mailto:${escapeHtml(value)}">${escapeHtml(value)}</a>`;
          } else if (phoneMatch) {
            valueHtml = `<a class="${linkClass}" href="tel:${escapeHtml(value.replace(/\s/g, ''))}">${escapeHtml(value)}</a>`;
          } else {
            valueHtml = `<span class="${classes.listClass}__value">${applyBoldMarkers(escapeHtml(value))}</span>`;
          }
          html += `<li><span class="${keyClass}">${key}</span>${valueHtml}</li>`;
          continue;
        }
      }

      html += `<li>${applyBoldMarkers(escapeHtml(bullet))}</li>`;
      continue;
    }

    closeLists();
    html += `<p class="${classes.textClass}">${applyBoldMarkers(escapeHtml(line))}</p>`;
  }

  closeLists();
  return html;
}
