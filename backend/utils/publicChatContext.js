const cheerio = require('cheerio');
const { resolvePublicPageSlug } = require('./publicPageSlugs');
const { getPublicSiteUrl } = require('./chatFallback');

/** Canonical slug → public URL path */
const PAGE_PATHS = {
  homepage: '/',
  about: '/about',
  admissions: '/admissions',
  staff: '/staff',
  'student-life': '/student-life',
  student_life: '/student-life',
  student_report: '/student-report',
  'school-fee': '/school-fee',
  fees: '/school-fee',
  contact: '/contact',
  privacy: '/privacy-policy',
};

const PUBLIC_SITE_GUIDE = `Public website — pages visitors can use (suggest the best link when answering):
- / — Homepage (branding, tagline, leadership preview, news, gallery preview)
- /about — About the seminary
- /admissions — Requirements and process; online application: /admissions/apply
- /staff — Staff directory (intro + staff profiles)
- /student-life — Student life
- /student-report — Parents/students check reports (admission number lookup)
- /school-fee — School fees and payment info
- /contact — Contact, visit, map, department emails
- /gallery — Photo gallery
- /announcements — News and announcements
- /necta-results — NECTA exam results
- /privacy-policy — Privacy policy
Official website URL: ${getPublicSiteUrl()}`;

const CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_KNOWLEDGE_BASE_CHARS = 100000;
const PAGE_TEXT_MAX = 6000;
const DOC_TEXT_MAX = 8000;
const DOC_LIMIT = 10;

let contextCache = { text: '', expiresAt: 0 };

function htmlToPlain(html, maxLen = PAGE_TEXT_MAX) {
  const $ = cheerio.load(html || '');
  const text = ($('body').length ? $('body').text() : $.root().text()).replace(/\s+/g, ' ').trim();
  return text.slice(0, maxLen);
}

function formatSettingsRow(key, value) {
  const label = key.replace(/_/g, ' ');
  return `${label}: ${String(value).trim()}`;
}

const FEE_LINE_RE =
  /ada|fee|fees|tuition|tzs|malipo|form\s*(one|two|three|four|five|vi|i{1,3}v?)|pre-?form|kidato|mwaka|akaunti|benki|nbc|crdb|mpesa|muhula|awamu|construction|ujenzi|shule/i;

function extractFeeRelatedLines(text, maxLines = 150) {
  const seen = new Set();
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || !FEE_LINE_RE.test(line)) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
    if (out.length >= maxLines) break;
  }
  return out;
}

/** Admin → Fees announcements (per class/term; also printed on student reports). */
async function buildFeesAnnouncementsSection(query) {
  try {
    const yearResult = await query(
      `SELECT MAX(year) AS max_year FROM fees_announcements
       WHERE announcement_text IS NOT NULL AND TRIM(announcement_text) != ''`
    );
    const maxYear = Number(yearResult.rows[0]?.max_year) || 0;
    if (!maxYear) return '';

    const minYear = maxYear - 1;
    const result = await query(
      `SELECT level, stream, year, term, announcement_index, announcement_text
       FROM fees_announcements
       WHERE year >= $1
         AND announcement_text IS NOT NULL AND TRIM(announcement_text) != ''
       ORDER BY year DESC, level, stream, term,
         CASE WHEN announcement_index ~ '^[0-9]+$' THEN announcement_index::int ELSE 999 END`,
      [minYear]
    );

    const rows = result.rows || [];
    if (!rows.length) return '';

    const groups = new Map();
    for (const row of rows) {
      const key = `${row.level}|${row.stream}|${row.year}|${row.term || 'Term I'}`;
      if (!groups.has(key)) {
        groups.set(key, {
          level: row.level,
          stream: row.stream,
          year: row.year,
          term: row.term || 'Term I',
          items: [],
        });
      }
      const text = String(row.announcement_text || '').trim();
      if (!text) continue;
      groups.get(key).items.push({
        index: row.announcement_index,
        text: text.slice(0, 600),
      });
    }

    const blocks = [];
    let totalChars = 0;
    const maxChars = 14000;

    for (const group of groups.values()) {
      const seen = new Set();
      const lines = [];
      for (const item of group.items) {
        if (seen.has(item.text)) continue;
        seen.add(item.text);
        const n = item.index ? `${item.index}. ` : '- ';
        lines.push(`${n}${item.text}`);
      }
      if (!lines.length) continue;

      const header = `${group.level} / Stream ${group.stream} / ${group.year} / ${group.term}:`;
      const block = `${header}\n${lines.join('\n')}`;
      if (totalChars + block.length > maxChars) break;
      blocks.push(block);
      totalChars += block.length;
    }

    if (!blocks.length) return '';

    return (
      '=== FEES ANNOUNCEMENTS (Admin → Fees — official class fee/payment instructions) ===\n' +
      'Use for ada, malipo, deadlines, bank accounts, and term-specific fee notes. Prefer the latest year/term.\n' +
      blocks.join('\n\n')
    );
  } catch (e) {
    console.error('Fees announcements context error:', e.message);
    return '';
  }
}

/** Compact fees block so ada/malipo questions hit exact TZS amounts (from /school-fee + AI Matters). */
async function buildFeesHighlightSection(query) {
  const parts = [];

  try {
    const feesAnnouncements = await buildFeesAnnouncementsSection(query);
    if (feesAnnouncements) parts.push(feesAnnouncements);
  } catch (e) {
    console.error('Fees highlight: announcements error:', e.message);
  }

  try {
    const page = await query(
      `SELECT title, html_content FROM public_pages
       WHERE page_name IN ('school-fee', 'fees')
         AND html_content IS NOT NULL AND TRIM(html_content) != ''
       ORDER BY CASE WHEN page_name = 'school-fee' THEN 0 ELSE 1 END
       LIMIT 1`
    );
    const row = page.rows[0];
    if (row) {
      const text = htmlToPlain(row.html_content, 12000);
      if (text) parts.push(`Public page /school-fee (${row.title || 'Ada ya Shule'}):\n${text}`);
    }
  } catch (e) {
    console.error('Fees highlight: public page error:', e.message);
  }

  try {
    const { ensureAiMattersTable } = require('./aiMattersDocuments');
    await ensureAiMattersTable(query);
    const docs = await query(
      `SELECT name, extracted_text FROM ai_matters_documents
       WHERE extracted_text IS NOT NULL AND TRIM(extracted_text) != ''
       ORDER BY created_at DESC`
    );
    for (const d of docs.rows || []) {
      const feeLines = extractFeeRelatedLines(d.extracted_text);
      if (!feeLines.length) continue;
      parts.push(
        `AI Matters file "${d.name}" (fee-related rows):\n${feeLines.join('\n')}`
      );
    }
  } catch (e) {
    console.error('Fees highlight: documents error:', e.message);
  }

  if (!parts.length) return '';

  return (
    '=== SCHOOL FEES — use this first for ada, malipo, TZS, Form One/Five, Pre-Form One ===\n' +
    'Sources: Admin Fees Announcements (per class/term), public page /school-fee, and AI Matters documents.\n' +
    'Example from official data: Form One tuition TZS 1,800,000 per year; Pre-Form One TZS 250,000.\n' +
    parts.join('\n\n')
  ).slice(0, 32000);
}

const ADMISSION_LINE_RE =
  /udahili|admission|apply|pre-?form|form\s*one|darasa la saba|kidato|nafasi|mahitaji|tarehe|interview|usajili|omba/i;

function extractAdmissionRelatedLines(text, maxLines = 80) {
  const seen = new Set();
  const out = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || !ADMISSION_LINE_RE.test(line)) continue;
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
    if (out.length >= maxLines) break;
  }
  return out;
}

async function buildSiteContactHighlightSection(query) {
  const siteUrl = getPublicSiteUrl();
  const parts = [`Official public website: ${siteUrl}`];

  try {
    const result = await query('SELECT * FROM website_settings WHERE id = 1');
    const row = result.rows[0];
    if (row) {
      const fields = [
        ['contact_address', 'Address'],
        ['contact_phone', 'Phone'],
        ['contact_whatsapp', 'WhatsApp'],
        ['contact_email', 'Email'],
        ['admissions_email', 'Admissions email'],
        ['office_weekdays', 'Office hours (weekdays)'],
        ['office_saturday', 'Office hours (Saturday)'],
      ];
      for (const [key, label] of fields) {
        const val = row[key];
        if (val != null && String(val).trim()) parts.push(`${label}: ${String(val).trim()}`);
      }
    }
  } catch (e) {
    console.error('Contact highlight error:', e.message);
  }

  return `=== CONTACT & WEBSITE — use for URL, simu, barua pepe, mawasiliano ===\n${parts.join('\n')}`;
}

async function buildAdmissionsHighlightSection(query) {
  const parts = [];
  const siteUrl = getPublicSiteUrl();

  try {
    const page = await query(
      `SELECT title, html_content FROM public_pages
       WHERE page_name IN ('admissions', 'homepage', 'about')
         AND html_content IS NOT NULL AND TRIM(html_content) != ''
       ORDER BY CASE page_name WHEN 'admissions' THEN 0 WHEN 'homepage' THEN 1 ELSE 2 END
       LIMIT 3`
    );
    for (const row of page.rows || []) {
      const text = htmlToPlain(row.html_content, 10000);
      if (text.length >= 40) {
        parts.push(`${row.title || 'Admissions'} (${siteUrl}/admissions):\n${text}`);
      }
    }
  } catch (e) {
    console.error('Admissions highlight: page error:', e.message);
  }

  try {
    const ann = await query(
      `SELECT title, content, created_at FROM public_announcements
       WHERE active = TRUE
       ORDER BY created_at DESC LIMIT 20`
    );
    for (const a of ann.rows || []) {
      const body = htmlToPlain(a.content, 1200);
      const combined = `${a.title || ''}\n${body}`;
      const lines = extractAdmissionRelatedLines(combined, 12);
      if (!lines.length) continue;
      const date = a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : '';
      parts.push(`Announcement [${date}] ${a.title}:\n${lines.join('\n')}`);
    }
  } catch (e) {
    console.error('Admissions highlight: announcements error:', e.message);
  }

  try {
    const { ensureAiMattersTable } = require('./aiMattersDocuments');
    await ensureAiMattersTable(query);
    const docs = await query(
      `SELECT name, extracted_text FROM ai_matters_documents
       WHERE extracted_text IS NOT NULL AND TRIM(extracted_text) != ''
       ORDER BY created_at DESC LIMIT ${DOC_LIMIT}`
    );
    for (const d of docs.rows || []) {
      const lines = extractAdmissionRelatedLines(d.extracted_text);
      if (!lines.length) continue;
      parts.push(`AI Matters "${d.name}" (admissions-related):\n${lines.join('\n')}`);
    }
  } catch (e) {
    console.error('Admissions highlight: documents error:', e.message);
  }

  if (!parts.length) {
    return (
      '=== ADMISSIONS — darasa la saba, Form One, Pre-Form One ===\n' +
      `Online application: ${siteUrl}/admissions/apply\n` +
      `Requirements and process: ${siteUrl}/admissions\n` +
      `Announcements (dates): ${siteUrl}/announcements`
    );
  }

  return (
    '=== ADMISSIONS — use for darasa la saba, Form One, Pre-Form One, nafasi, tarehe ===\n' +
    `Apply online: ${siteUrl}/admissions/apply\n` +
    parts.join('\n\n')
  ).slice(0, 22000);
}

async function buildDocumentsSection(query) {
  const { buildAiMattersDocumentsSection } = require('./aiMattersDocuments');
  return buildAiMattersDocumentsSection(query, {
    maxPerDoc: DOC_TEXT_MAX,
    docLimit: DOC_LIMIT,
    heading:
      'School documents (uploaded in Admin → AI Matters — fees, policies, letters, schedules)',
  });
}

async function buildFaqSection(query) {
  try {
    const faqsResult = await query(
      'SELECT question, answer, category FROM faqs WHERE active = TRUE ORDER BY display_order, created_at'
    );
    const faqList = (faqsResult.rows || [])
      .map((f) => {
        const cat = f.category ? ` [${f.category}]` : '';
        return `Q${cat}: ${f.question}\nA: ${f.answer}`;
      })
      .join('\n\n');
    return faqList ? `FAQs (also on homepage and /announcements area):\n${faqList}` : '';
  } catch {
    return '';
  }
}

async function buildPublicPagesSection(query) {
  const pagesResult = await query(
    `SELECT page_name, title, html_content FROM public_pages
     WHERE html_content IS NOT NULL AND TRIM(html_content) != ''
     ORDER BY page_name`
  );
  const blocks = (pagesResult.rows || [])
    .map((p) => {
      const canonical = resolvePublicPageSlug(p.page_name);
      const path = PAGE_PATHS[canonical] || PAGE_PATHS[p.page_name] || `/${canonical || p.page_name}`;
      const text = htmlToPlain(p.html_content);
      if (text.length < 20) return '';
      return `--- ${p.title || canonical || p.page_name} (${path}) ---\n${text}`;
    })
    .filter(Boolean);
  return blocks.length
    ? `Public Pages CMS (full page content visitors see on each route):\n${blocks.join('\n\n')}`
    : '';
}

async function buildSchoolBrandingSection(query) {
  const result = await query('SELECT * FROM website_settings WHERE id = 1');
  const row = result.rows[0];
  if (!row) return '';

  const skip = new Set([
    'id',
    'school_logo',
    'patron_saint_image',
    'login_background_image',
    'patron_saint_cloudinary_public_id',
    'updated_at',
  ]);
  const lines = Object.entries(row)
    .filter(([k, v]) => !skip.has(k) && v != null && String(v).trim())
    .map(([k, v]) => formatSettingsRow(k, v));

  return lines.length
    ? `School branding & site settings (homepage hero, footer, social links, office hours, department emails):\n${lines.join('\n')}`
    : '';
}

async function buildAdministratorsSection(query) {
  const result = await query(
    `SELECT name, title, year_started FROM administrators
     WHERE active = TRUE ORDER BY display_order, created_at`
  );
  const lines = (result.rows || []).map((a) => {
    const yrs = a.year_started ? ` (since ${a.year_started})` : '';
    return `- ${a.name} — ${a.title}${yrs}`;
  });
  return lines.length ? `Leadership / administrators (homepage & public site):\n${lines.join('\n')}` : '';
}

async function buildStaffSection(query) {
  const result = await query(
    `SELECT full_name, role_title, profile_summary, is_teaching,
            professional_subjects, subjects_teaching, class_teacher_for,
            other_duties, contact_phone, contact_email
     FROM staff_profiles WHERE active = TRUE
     ORDER BY is_teaching DESC, display_order ASC LIMIT 80`
  );
  const lines = (result.rows || []).map((s) => {
    const parts = [`${s.full_name} — ${s.role_title || 'Staff'}`];
    if (s.is_teaching === false) parts.push('(non-teaching)');
    if (s.subjects_teaching) parts.push(`Teaches: ${s.subjects_teaching}`);
    if (s.professional_subjects) parts.push(`Subjects: ${s.professional_subjects}`);
    if (s.class_teacher_for) parts.push(`Class teacher: ${s.class_teacher_for}`);
    if (s.other_duties) parts.push(`Duties: ${String(s.other_duties).slice(0, 150)}`);
    if (s.profile_summary) parts.push(String(s.profile_summary).slice(0, 350));
    if (s.contact_phone) parts.push(`Tel: ${s.contact_phone}`);
    if (s.contact_email) parts.push(`Email: ${s.contact_email}`);
    return `- ${parts.join(' | ')}`;
  });
  return lines.length ? `Staff directory (/staff):\n${lines.join('\n')}` : '';
}

async function buildAnnouncementsSection(query) {
  const result = await query(
    `SELECT title, content, created_at FROM public_announcements
     WHERE active = TRUE ORDER BY created_at DESC LIMIT 15`
  );
  const lines = (result.rows || []).map((a) => {
    const body = htmlToPlain(a.content, 900);
    const date = a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : '';
    return `- [${date}] ${a.title}${body ? `\n  ${body}` : ''}`;
  });
  return lines.length ? `Announcements & news (/announcements):\n${lines.join('\n\n')}` : '';
}

async function buildGallerySection(query) {
  const result = await query(
    `SELECT category, caption, date FROM gallery_photos
     ORDER BY created_at DESC LIMIT 25`
  );
  const lines = (result.rows || [])
    .map((p) => {
      const cap = (p.caption || '').trim() || '(photo)';
      const cat = p.category ? ` [${p.category}]` : '';
      const dt = p.date ? ` (${p.date})` : '';
      return `- ${cap}${cat}${dt}`;
    })
    .filter(Boolean);
  return lines.length ? `Gallery highlights (/gallery — captions & categories):\n${lines.join('\n')}` : '';
}

async function buildAlumniSection(query) {
  const result = await query(
    `SELECT official_names, year_start, year_end, class_level, current_position, philosophy
     FROM alumni WHERE status = 'approved'
     ORDER BY created_at DESC LIMIT 25`
  );
  const lines = (result.rows || []).map((a) => {
    const years = `${a.year_start || '?'}-${a.year_end || '?'}`;
    const cls = a.class_level ? `, ${a.class_level}` : '';
    const pos = a.current_position ? ` — ${a.current_position}` : '';
    const phil = a.philosophy ? ` — "${String(a.philosophy).slice(0, 120)}"` : '';
    return `- ${a.official_names} (${years}${cls})${pos}${phil}`;
  });
  return lines.length ? `Featured alumni (approved profiles):\n${lines.join('\n')}` : '';
}

function capKnowledgeBase(sections) {
  const priority = [];
  const secondary = [];
  for (const section of sections) {
    if (!section) continue;
    if (
      section.startsWith('Public website —') ||
      section.startsWith('=== CONTACT & WEBSITE') ||
      section.startsWith('=== ADMISSIONS') ||
      section.startsWith('=== SCHOOL FEES') ||
      section.startsWith('=== FEES ANNOUNCEMENTS') ||
      section.startsWith('FAQs') ||
      section.startsWith('School branding') ||
      section.startsWith('Leadership / administrators')
    ) {
      priority.push(section);
    } else {
      secondary.push(section);
    }
  }

  let result = priority.join('\n\n');
  for (const section of secondary) {
    const next = result ? `${result}\n\n${section}` : section;
    if (next.length > MAX_KNOWLEDGE_BASE_CHARS) {
      const remaining = MAX_KNOWLEDGE_BASE_CHARS - result.length - 80;
      if (remaining > 500) {
        result += `\n\n${section.slice(0, remaining)}\n[... section trimmed ...]`;
      }
      break;
    }
    result = next;
  }
  return result;
}

async function buildPublicChatContext(query, { nectaSummary = '', bypassCache = false } = {}) {
  const now = Date.now();
  if (!bypassCache && !nectaSummary && contextCache.text && contextCache.expiresAt > now) {
    return contextCache.text;
  }

  const feesHighlight = await buildFeesHighlightSection(query);
  const contactHighlight = await buildSiteContactHighlightSection(query);
  const admissionsHighlight = await buildAdmissionsHighlightSection(query);

  const sections = await Promise.all([
    buildDocumentsSection(query),
    buildPublicPagesSection(query),
    buildFaqSection(query),
    buildSchoolBrandingSection(query),
    buildAdministratorsSection(query),
    buildStaffSection(query),
    buildAnnouncementsSection(query),
    buildGallerySection(query),
    buildAlumniSection(query),
  ]);

  const ordered = [PUBLIC_SITE_GUIDE, contactHighlight, admissionsHighlight];
  if (feesHighlight) ordered.push(feesHighlight);
  ordered.push(...sections.filter(Boolean));

  if (nectaSummary) {
    ordered.push(`NECTA results summary (/necta-results):\n${nectaSummary.slice(0, 8000)}`);
  }

  const knowledgeBase = capKnowledgeBase(ordered);

  if (!nectaSummary) {
    contextCache = { text: knowledgeBase, expiresAt: now + CONTEXT_CACHE_TTL_MS };
  }

  return knowledgeBase;
}

module.exports = {
  buildPublicChatContext,
  buildFeesHighlightSection,
  buildFeesAnnouncementsSection,
  buildAdmissionsHighlightSection,
  buildSiteContactHighlightSection,
  PAGE_PATHS,
  PUBLIC_SITE_GUIDE,
};
