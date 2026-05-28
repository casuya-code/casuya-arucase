const cheerio = require('cheerio');
const { resolvePublicPageSlug } = require('./publicPageSlugs');

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
- /privacy-policy — Privacy policy`;

function htmlToPlain(html, maxLen = 80000) {
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

/** Compact fees block so ada/malipo questions hit exact TZS amounts (from /school-fee + AI Matters). */
async function buildFeesHighlightSection(query) {
  const parts = [];

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
    'Example from official data: Form One tuition TZS 1,800,000 per year; Pre-Form One TZS 250,000.\n' +
    parts.join('\n\n')
  ).slice(0, 28000);
}

async function buildDocumentsSection(query) {
  const { buildAiMattersDocumentsSection } = require('./aiMattersDocuments');
  return buildAiMattersDocumentsSection(query, {
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

async function buildPublicChatContext(query, { nectaSummary = '' } = {}) {
  const feesHighlight = await buildFeesHighlightSection(query);
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

  sections.unshift(PUBLIC_SITE_GUIDE);
  if (feesHighlight) sections.splice(1, 0, feesHighlight);

  if (nectaSummary) {
    sections.push(`NECTA results summary (/necta-results):\n${nectaSummary}`);
  }

  return sections.filter(Boolean).join('\n\n');
}

module.exports = {
  buildPublicChatContext,
  buildFeesHighlightSection,
  PAGE_PATHS,
  PUBLIC_SITE_GUIDE,
};
