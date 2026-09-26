/**
 * Report language dictionary for the individual student report.
 *
 * Mirrors `backend/utils/reportLang.js` so the on-screen report and the printed
 * PDF say exactly the same thing. The layout, codes (901-911), month
 * abbreviations (Jrb1/Robo/Jrb2/Nusu/Muh) and grading letters are identical in
 * every language - only the wording changes.
 */

export const REPORT_LANGUAGES = ['sw', 'en'];

export function normalizeReportLanguage(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'sw';
  if (raw === 'en' || raw === 'eng' || raw === 'english' || raw === 'kiingereza') return 'en';
  return 'sw';
}

const MONTH_ABBREVIATIONS = {
  February: 'Jrb1',
  August: 'Jrb1',
  March: 'Robo',
  September: 'Robo',
  April: 'Jrb2',
  October: 'Jrb2',
  May: 'Nusu',
  November: 'Nusu',
};

/** The trait codes 901-911 and their order never change between languages. */
export const REPORT_TRAIT_CODES = {
  left: ['901', '902', '903', '904', '905', '906'],
  right: ['907', '908', '909', '910', '911'],
};

const SWAHILI = {
  sectionA: 'A. TAARIFA YA MAENDELEO YA MWANAFUNZI',
  sectionB: 'B. UFANISI WA MWANAFUNZI KITAALUMA NA MASOMO',
  sectionC: 'C. TABIA NA MWENENDO',
  sectionD: 'D. MAONI KATIKA TAALUMA',
  academicSummary: 'MAJUMUISHO YA KITAALUMA',
  generalComments: 'MAONI',
  notes: 'MAMBO YA KUFAHAMU',

  fullName: 'JINA KAMILI',
  sex: 'JINSIA',
  classLevel: 'KIDATO',
  term: 'MUHULA',
  month: 'MWEZI',
  year: 'MWAKA',
  parish: 'PAROKIA YA',
  parishMissing: 'Not specified',

  subject: 'SOMO',
  assessmentMarks: 'ALAMA ZA UFAULU',
  total: 'JUMLA',
  grade: 'DARAJA',
  position: 'NAFASI',
  comments: 'MAONI',
  teacherSignatureTop: 'SAHIHI YA',
  teacherSignatureBottom: 'MWALIMU',

  monthKey:
    'Jrb1 = Jaribio 1, Robo = Robo Muhula, Jrb2 = Jaribio 2, Nusu = Nusu Muhula, Muh = Muhula',

  totalMarks: 'JUMLA KUU KATIKA MASOMO NI:',
  average: 'WASTANI',
  division: 'DIVISION',
  points: 'POINTI',
  positionOf: 'NAFASI YA:',
  amongStudents: 'KATI YA WANAFUNZI',

  subjectTeacher: 'Mwalimu wa Taaluma:',
  headTeacherComments: 'Maoni ya Mkuu wa Shule:',
  headTeacherSignature: 'SAHIHI YA MKUU WA SHULE:',
  date: 'TAREHE:',
  dateShort: 'Tarehe',

  no: 'NA',
  item: 'KIPENGELE',
  marksKey: 'ALAMA:',
  conductKey: 'TABIA:',
  conductLegend: 'A, Vizuri Sana, B, Vizuri, C, Wastani, D, Dhaifu, F, Mbaya',

  studies: 'TAALUMA:',
  service: 'HUDUMA:',
  sports: 'MICHEZO:',
  conduct: 'TABIA:',
  health: 'SALA:',
  feesDue: 'FEDHA ANAYODAIWA:',

  noAnnouncements: 'Hakuna matangazo ya ada yaliyowekwa kwa darasa hili.',

  gradeComments: {
    A: 'Bora Sana',
    B: 'Vizuri Sana',
    C: 'Vizuri',
    D: 'Dhaifu',
    E: 'Wastani',
    S: 'Feli',
    F: 'Feli',
  },
  gradeCommentsALevel: {
    E: 'Dhaifu sana',
  },

  traits: {
    901: 'Kufanya kazi kwa bidii',
    902: 'Ubora wa kazi',
    903: 'Kuheshimu kazi',
    904: 'Utunzaji wa mali ya shule / binafsi',
    905: 'Ushirikiano na wenzake',
    906: 'Heshima kwa wenzake / walimu / wafanyakazi',
    907: 'Sifa za uongozi',
    908: 'Kutii na kufuata maagizo',
    909: 'Uaminifu',
    910: 'Usafi binafsi',
    911: 'Kushiriki katika Utamaduni / Michezo',
  },

  marksLegendFormsIV: 'A = 85 – 100, Bora Sana, B = 70 – 84, Vizuri Sana, C = 50 – 69, Vizuri, D = 40 – 49, Dhaifu, F = 0 – 39, Feli',
  marksLegendFormsVVI:
    'A = 85+, Bora Sana, B = 75+, Vizuri Sana, C = 65+, Vizuri, D = 55+, Dhaifu, E = 45+, Dhaifu sana, S = 40+, Feli, F = 0 – 39, Feli',

  pageTitle: 'Individual Student Report',
  breadcrumbSeparator: '&gt;',
  downloadPdf: 'Download PDF Report',
  downloadEnglish: 'Download English Report',
  downloadingPdf: 'Downloading PDF...',
  downloadingEnglish: 'Downloading English Report...',
  languageLabel: 'Report Language',
  languageSwahili: 'Kiswahili',
  languageEnglish: 'English',
};

const ENGLISH = {
  sectionA: 'A. STUDENT PROGRESS INFORMATION',
  sectionB: 'B. STUDENT ACADEMIC AND SUBJECT PERFORMANCE',
  sectionC: 'C. BEHAVIOUR AND CONDUCT',
  sectionD: 'D. COMMENTS ON STUDIES',
  academicSummary: 'ACADEMIC SUMMARY',
  generalComments: 'COMMENTS',
  notes: 'THINGS TO NOTE',

  fullName: 'FULL NAME',
  sex: 'SEX',
  classLevel: 'CLASS',
  term: 'TERM',
  month: 'MONTH',
  year: 'YEAR',
  parish: 'PARISH',
  parishMissing: 'Not specified',

  subject: 'SUBJECT',
  assessmentMarks: 'MARKS',
  total: 'TOTAL',
  grade: 'GRADE',
  position: 'POSITION',
  comments: 'COMMENTS',
  teacherSignatureTop: "TEACHER'S",
  teacherSignatureBottom: 'SIGNATURE',

  monthKey:
    'Jrb1 = Test 1, Robo = Mid-term, Jrb2 = Test 2, Nusu = Half-term, Muh = Term-end',

  totalMarks: 'TOTAL MARKS IN ALL SUBJECTS:',
  average: 'AVERAGE',
  division: 'DIVISION',
  points: 'POINTS',
  positionOf: 'POSITION:',
  amongStudents: 'AMONG STUDENTS',

  subjectTeacher: 'Subject Teacher:',
  headTeacherComments: "Head Teacher's Comments:",
  headTeacherSignature: "HEAD TEACHER'S SIGNATURE:",
  date: 'DATE:',
  dateShort: 'Date',

  no: 'NO.',
  item: 'ITEM',
  marksKey: 'MARKS:',
  conductKey: 'CONDUCT:',
  conductLegend: 'A, Very Good, B, Good, C, Average, D, Weak, F, Poor',

  studies: 'STUDIES:',
  service: 'SERVICE:',
  sports: 'SPORTS:',
  conduct: 'CONDUCT:',
  health: 'HEALTH:',
  feesDue: 'FEES DUE:',

  noAnnouncements: 'No class fee announcements have been set for this class.',

  gradeComments: {
    A: 'Excellent',
    B: 'Very Good',
    C: 'Good',
    D: 'Weak',
    E: 'Average',
    S: 'Fail',
    F: 'Fail',
  },
  gradeCommentsALevel: {
    E: 'Very Weak',
  },

  traits: {
    901: 'Diligent in work',
    902: 'Quality of work',
    903: 'Respect for work',
    904: 'Care of school / personal property',
    905: 'Cooperation with peers',
    906: 'Respect for peers / teachers / staff',
    907: 'Leadership qualities',
    908: 'Obedience and following instructions',
    909: 'Honesty',
    910: 'Personal cleanliness',
    911: 'Participation in culture / games',
  },

  marksLegendFormsIV: 'A = 85 – 100, Excellent, B = 70 – 84, Very Good, C = 50 – 69, Good, D = 40 – 49, Weak, F = 0 – 39, Fail',
  marksLegendFormsVVI:
    'A = 85+, Excellent, B = 75+, Very Good, C = 65+, Good, D = 55+, Weak, E = 45+, Average, S = 40+, Fail, F = 0 – 39, Fail',

  pageTitle: 'Individual Student Report',
  breadcrumbSeparator: '&gt;',
  downloadPdf: 'Download PDF Report',
  downloadEnglish: 'Download English Report',
  downloadingPdf: 'Downloading PDF...',
  downloadingEnglish: 'Downloading English Report...',
  languageLabel: 'Report Language',
  languageSwahili: 'Kiswahili',
  languageEnglish: 'English',
};

const DICTIONARIES = { sw: SWAHILI, en: ENGLISH };

export function getReportDictionary(lang) {
  return DICTIONARIES[normalizeReportLanguage(lang)];
}

/** Shared month abbreviation: 'Jrb1' | 'Robo' | 'Jrb2' | 'Nusu' | 'Muh' | fallback. */
export function getMonthAbbreviation(month, isForm5Or6 = false) {
  if (month === 'May') return isForm5Or6 ? 'Muh' : 'Nusu';
  if (month === 'November') return isForm5Or6 ? 'Nusu' : 'Muh';
  return MONTH_ABBREVIATIONS[month] || `${month} Test`;
}

export function getGradeComment(lang, grade, { isALevel = false } = {}) {
  const dict = getReportDictionary(lang);
  if (isALevel && dict.gradeCommentsALevel[grade]) return dict.gradeCommentsALevel[grade];
  return dict.gradeComments[grade] || dict.gradeComments.F;
}

export function getTraitDescription(lang, code) {
  const dict = getReportDictionary(lang);
  return dict.traits[String(code)] || '';
}

export function getMarksLegend(lang, isForm5Or6) {
  const dict = getReportDictionary(lang);
  return isForm5Or6 ? dict.marksLegendFormsVVI : dict.marksLegendFormsIV;
}

export function isALevelForm(form) {
  const normalized = String(form || '').trim().toUpperCase();
  return normalized.includes('FORM V') || normalized.includes('FORM VI');
}
