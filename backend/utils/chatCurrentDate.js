/**
 * Authoritative "today" for public chatbot (Africa/Dar_es_Salaam).
 * LLMs often guess wrong dates from training data — inject server time instead.
 */

const TZ = 'Africa/Dar_es_Salaam';

const SWAHILI_MONTHS = [
  'Januari',
  'Februari',
  'Machi',
  'Aprili',
  'Mei',
  'Juni',
  'Julai',
  'Agosti',
  'Septemba',
  'Oktoba',
  'Novemba',
  'Desemba',
];

function getTzDateTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    hour12: false,
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';

  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: get('hour'),
    minute: get('minute'),
    weekdayEn: get('weekday'),
  };
}

function getCurrentDateInfo(date = new Date()) {
  const p = getTzDateTimeParts(date);
  const iso = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  const time = `${p.hour}:${p.minute}`;
  const swahiliDate = `${p.day} ${SWAHILI_MONTHS[p.month - 1]} ${p.year}`;
  let weekdaySw = '';
  try {
    weekdaySw = new Intl.DateTimeFormat('sw-TZ', {
      timeZone: TZ,
      weekday: 'long',
    }).format(date);
  } catch {
    weekdaySw = p.weekdayEn;
  }
  const englishDate = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);

  return {
    timezone: TZ,
    iso,
    time,
    swahiliDate,
    weekdaySw,
    englishDate,
    year: p.year,
    month: p.month,
    day: p.day,
  };
}

function getCurrentDateContextBlock() {
  const d = getCurrentDateInfo();
  return (
    'CURRENT DATE AND TIME (authoritative — use ONLY this for "today", "leo", tarehe ya leo, current year/month/day; never guess from training data):\n' +
    `- Timezone: ${d.timezone} (Tanzania)\n` +
    `- Today (English): ${d.englishDate}\n` +
    `- Leo (Kiswahili): ${d.weekdaySw}, ${d.swahiliDate}\n` +
    `- Time now: ${d.time}\n` +
    `- ISO date: ${d.iso}`
  );
}

const TODAY_DATE_QUESTION_RE =
  /\b(leo\s+ni\s+)?tarehe\s+(ya\s+)?(leo|ngapi|gani|nini)\b|\bleo\s+ni\s+(siku|tarehe)\b|\btarehe\s+ya\s+leo\b|\btoday'?s?\s+date\b|\bwhat\s+(?:is\s+)?(?:the\s+)?(?:today'?s?\s+)?date\b|\bwhat\s+date\s+is\s+it\b|\bcurrent\s+date\b|\bwhat\s+day\s+is\s+it\b|\bni\s+siku\s+gani\b/i;

function isTodayDateQuestion(message) {
  return TODAY_DATE_QUESTION_RE.test(String(message || '').trim());
}

function prefersSwahili(message) {
  const m = String(message || '').toLowerCase();
  return /leo|tarehe|siku|habari|asubuhi|mchana|jioni|ngapi|gani|nini|karibu|uliza/.test(m);
}

function buildTodayDateReply(message) {
  const d = getCurrentDateInfo();
  if (prefersSwahili(message)) {
    return `Leo ni ${d.weekdaySw}, ${d.swahiliDate} (saa ${d.time}, Tanzania — ${d.timezone}).`;
  }
  return `Today is ${d.englishDate} (${d.time}, Tanzania — ${d.timezone}).`;
}

module.exports = {
  TZ,
  getCurrentDateInfo,
  getCurrentDateContextBlock,
  isTodayDateQuestion,
  buildTodayDateReply,
};
