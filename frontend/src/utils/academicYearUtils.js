/**
 * Academic Year Utilities for Form V and Form VI
 * Handles special academic year logic for Form 5 & 6 streams (combinations / intake).
 */

/** A-Level combination streams (single source of truth for UI lists). */
export const FORM_V_VI_STREAMS = [
  { code: 'PCB', name: 'Physics, Chemistry, Biology' },
  { code: 'PCM', name: 'Physics, Chemistry, Mathematics' },
  { code: 'CBG', name: 'Chemistry, Biology, Geography' },
  { code: 'HGL', name: 'History, Geography, Literature' },
  { code: 'HKL', name: 'History, Kiswahili, Literature' },
  { code: 'EGM', name: 'Economics, Geography, Mathematics' },
  { code: 'HGE', name: 'History, Geography, Economics' },
  { code: 'PGM', name: 'Physics, Geography, Advanced Mathematics' },
];

export const FORM_V_VI_STREAM_CODES = FORM_V_VI_STREAMS.map((s) => s.code);

/** Earliest calendar year used in school year pickers (O-Level and A-Level). */
export const FORM_V_VI_MIN_YEAR = 2025;

/** Alias for Form I–IV year selection pages. */
export const O_LEVEL_MIN_YEAR = FORM_V_VI_MIN_YEAR;

/** Calendar years after today still shown in pickers (e.g. 1 = next year only). */
export const SCHOOL_YEAR_PICKER_AHEAD = 1;

/** Calendar year for “current year” highlights on year picker cards. */
export const getCurrentCalendarYear = () => new Date().getFullYear();

/**
 * Calendar years in O-Level pickers: from {@link O_LEVEL_MIN_YEAR} through current + ahead (newest first).
 * @returns {number[]}
 */
export const getSchoolYearOptions = () => {
  const currentYear = getCurrentCalendarYear();
  const maxYear = currentYear + SCHOOL_YEAR_PICKER_AHEAD;
  const years = [];
  for (let y = O_LEVEL_MIN_YEAR; y <= maxYear; y++) {
    years.push(y);
  }
  return years.reverse();
};

/** URL path segment per form level (shared across admin modules). */
export const FORM_PATH_SLUGS = {
  'FORM I': 'form-i',
  'FORM II': 'form-ii',
  'FORM III': 'form-iii',
  'FORM IV': 'form-iv',
  'FORM V': 'form-v',
  'FORM VI': 'form-vi',
};

/** URL segment for form level (FORM V → form-v). */
export const formLevelToPathSlug = (formLevel) => {
  const L = normalizeFormLevel(formLevel);
  return FORM_PATH_SLUGS[L] || '';
};

/**
 * Determines if a form level requires special academic year logic
 * @param {string} formLevel - The form level (e.g., 'FORM V', 'FORM VI')
 * @returns {boolean} - True if the form requires special logic
 */
export const requiresSpecialAcademicYearLogic = (formLevel) => {
  if (!formLevel) return false;
  const L = String(formLevel).trim().toUpperCase();
  return L === 'FORM V' || L === 'FORM VI';
};

export const normalizeFormLevel = (formLevel) => {
  if (!formLevel) return '';
  return String(formLevel)
    .split('-')
    .map((w) => w.toUpperCase())
    .join(' ');
};

/**
 * Gets the academic year range for Form V and VI based on a given year
 * For Form V/VI, students stay in the same academic year across both terms
 * @param {number} year - The base year (represents the academic year start)
 * @returns {object} - Object containing startYear, endYear, and display range
 */
export const getAcademicYearRange = (year) => {
  // For Form V/VI, the academic year runs from July to June
  // Students who start in July 2025 (First Term) continue through June 2026 (Second Term)
  const startYear = year;
  const endYear = year + 1;

  return {
    startYear,
    endYear,
    displayRange: `${startYear} - ${endYear}`,
    fullDisplay: `July ${startYear} to June ${endYear}`,
    firstTerm: `July ${startYear} to December ${startYear}`,
    secondTerm: `January ${endYear} to June ${endYear}`
  };
};

/**
 * Form V/VI year cards from {@link FORM_V_VI_MIN_YEAR} through current + {@link SCHOOL_YEAR_PICKER_AHEAD}.
 * Each cohort adds a start-year card (Jul–Dec) and end-year card (Jan–Jun) when in range.
 * @returns {Array} - Array of available academic year objects
 */
export const getFormVVIYears = () => {
  const currentYear = getCurrentCalendarYear();
  const maxDisplayYear = currentYear + SCHOOL_YEAR_PICKER_AHEAD;
  const years = [];
  const seen = new Set();

  for (let startYear = FORM_V_VI_MIN_YEAR; startYear <= maxDisplayYear; startYear++) {
    const academicYear = getAcademicYearRange(startYear);
    const endYear = startYear + 1;

    if (!seen.has(startYear)) {
      years.push({
        year: startYear,
        ...academicYear,
        cohortStartYear: startYear,
        isEndYear: false,
        role: 'cohort-start',
        displayLabel: `${startYear} (${academicYear.displayRange})`,
      });
      seen.add(startYear);
    }

    if (!seen.has(endYear) && endYear <= maxDisplayYear) {
      years.push({
        year: endYear,
        ...academicYear,
        cohortStartYear: startYear,
        isEndYear: true,
        role: 'cohort-end',
        displayLabel: `${endYear} (${academicYear.displayRange})`,
      });
      seen.add(endYear);
    }
  }

  return years.sort((a, b) => b.year - a.year);
};

/**
 * Determines the current term based on date
 * @param {Date} date - The date to check (defaults to current date)
 * @returns {object} - Object containing term info
 */
export const getCurrentTerm = (date = new Date()) => {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();

  // July to December = First Term
  // January to June = Second Term
  if (month >= 7 && month <= 12) {
    return {
      term: 'First Term',
      termNumber: 1,
      academicYearStart: year,
      academicYearEnd: year + 1,
      displayRange: `${year} - ${year + 1}`,
      description: `July ${year} to December ${year} (First Term)`,
      period: `July ${year} - December ${year}`,
      academicYear: year // Students in this term belong to academic year starting this year
    };
  } else {
    return {
      term: 'Second Term',
      termNumber: 2,
      academicYearStart: year - 1,
      academicYearEnd: year,
      displayRange: `${year - 1} - ${year}`,
      description: `January ${year} to June ${year} (Second Term)`,
      period: `January ${year} - June ${year}`,
      academicYear: year - 1 // Students in this term belong to academic year starting last year
    };
  }
};

/**
 * Lookup a year card from getFormVVIYears() by calendar year.
 * @param {number} displayYear
 * @returns {object|undefined}
 */
export const getFormVVICardByYear = (displayYear) => {
  const y = parseInt(displayYear, 10);
  if (isNaN(y)) return undefined;
  return getFormVVIYears().find((card) => card.year === y);
};

/**
 * API/student queries use the calendar year from the URL as stored in the database.
 * (e.g. 2025 + First Term, 2026 + Second Term for cohort 2025–2026)
 */
export const resolveFormVVIClassParams = (displayYear, term, formLevel) => {
  const year = parseInt(displayYear, 10);
  if (!requiresSpecialAcademicYearLogic(formLevel) || isNaN(year)) {
    return { year: displayYear, term };
  }
  return { year, term };
};

/**
 * Filter year cards by user class_permissions years.
 */
export const filterFormVVIYearsByPermission = (
  yearOptions,
  className,
  getAllowedYearsForClass,
  moduleId
) => {
  const allowed = getAllowedYearsForClass(
    className,
    moduleId ? { moduleId } : {}
  );
  if (allowed === null) return yearOptions;
  if (allowed.length === 0) return [];
  return yearOptions.filter((o) => allowed.includes(o.year));
};

export const getFormVVIYearSelectionHelpText = () => {
  const y = getCurrentCalendarYear();
  return (
    `Form V & VI: years from ${FORM_V_VI_MIN_YEAR} through ${y + SCHOOL_YEAR_PICKER_AHEAD}. ` +
    'Pick the calendar year on the card, then the term. ' +
    'Jul–Dec intake uses First Term (year Y). Jan–Jun uses Second Term (year Y). ' +
    `Example: ${y} + First Term and ${y + 1} + Second Term are the same ${y}–${y + 1} cohort.`
  );
};

/**
 * Term choices for Form V/VI after a year card is selected.
 * @param {number} displayYear - URL / card year
 * @returns {Array<{ term: string, title: string, subtitle: string, description: string, recommended: boolean }>}
 */
/** Normalize URL/DB term labels for Form V/VI validation. */
export const normalizeFormVVITerm = (term) => {
  const t = term != null ? String(term).trim() : '';
  if (/^Term\s+I$/i.test(t) || /^Term\s+1$/i.test(t) || /^First\s+Term$/i.test(t)) {
    return 'First Term';
  }
  if (/^Term\s+II$/i.test(t) || /^Term\s+2$/i.test(t) || /^Second\s+Term$/i.test(t)) {
    return 'Second Term';
  }
  return t;
};

/**
 * Valid DB pairs: cohort-start year + First Term, cohort-end year + Second Term.
 * e.g. 2025 + First Term, 2026 + Second Term — not 2026 + First Term.
 */
export const isValidFormVVITermPair = (displayYear, term) => {
  const y = parseInt(displayYear, 10);
  const normalized = normalizeFormVVITerm(term);
  if (isNaN(y) || !normalized) return false;
  const card = getFormVVICardByYear(y);
  if (!card) return false;
  if (card.isEndYear) return normalized === 'Second Term';
  return normalized === 'First Term';
};

export const getFormVVITermInvalidReason = (displayYear, term) => {
  const y = parseInt(displayYear, 10);
  const normalized = normalizeFormVVITerm(term);
  const card = getFormVVICardByYear(y);
  if (isNaN(y) || !card) {
    return `Year ${displayYear} is not a valid Form V/VI year.`;
  }
  if (card.isEndYear && normalized !== 'Second Term') {
    return (
      `Year ${y} is the Jan–Jun calendar year for cohort ${card.displayRange}. ` +
      `Choose Second Term (not ${normalized || term || 'this term'}).`
    );
  }
  if (!card.isEndYear && normalized !== 'First Term') {
    return (
      `Year ${y} is the Jul–Dec calendar year for cohort ${card.displayRange}. ` +
      `Choose First Term (not ${normalized || term || 'this term'}).`
    );
  }
  return '';
};

export const getFormVVITermChoices = (displayYear) => {
  const y = parseInt(displayYear, 10);
  const card = getFormVVICardByYear(y);
  const cohortStart = card?.cohortStartYear ?? (card?.isEndYear ? y - 1 : y);
  const cohortRange = `${cohortStart} - ${cohortStart + 1}`;

  const first = {
    term: 'First Term',
    title: 'First Term',
    subtitle: `July – December ${y}`,
    description: card?.isEndYear
      ? `Not used for year ${y} — intake Term I is Jul–Dec ${cohortStart}`
      : `Cohort ${cohortRange} · Term I (Jul – Dec ${y})`,
    recommended: !card?.isEndYear,
    valid: !card?.isEndYear,
    invalidReason: card?.isEndYear
      ? getFormVVITermInvalidReason(y, 'First Term')
      : '',
  };

  const second = {
    term: 'Second Term',
    title: 'Second Term',
    subtitle: `January – June ${y}`,
    description: card?.isEndYear
      ? `Cohort ${cohortRange} · Term II (Jan – Jun ${y})`
      : `Not used for year ${y} — Term II for this cohort is under year ${y + 1}`,
    recommended: !!card?.isEndYear,
    valid: !!card?.isEndYear,
    invalidReason: !card?.isEndYear
      ? getFormVVITermInvalidReason(y, 'Second Term')
      : '',
  };

  return [first, second];
};

/**
 * Hint when registration list is empty for Form V/VI.
 */
export const getFormVVIEmptyClassHint = (displayYear, term, stream) => {
  const choices = getFormVVITermChoices(displayYear);
  const recommended = choices.find((c) => c.recommended);
  const other = choices.find((c) => c.term !== term);
  return (
    `No students for year ${displayYear}, ${term}${stream ? `, ${stream}` : ''}. ` +
    (recommended && recommended.term !== term
      ? `Try ${recommended.term} (${recommended.subtitle}) for this year card, or pick another year.`
      : other
        ? `Try ${other.term} or another year card.`
        : 'Try another year card.')
  );
};
