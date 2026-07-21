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
 * A calendar year (e.g. 2026) can appear twice: as the end-year of one cohort
 * (2025–2026, Second Term) and as the start-year of the next cohort (2026–2027, First Term).
 * @returns {Array} - Array of available academic year objects
 */
export const getFormVVIYears = () => {
  const currentYear = getCurrentCalendarYear();
  const maxDisplayYear = currentYear + SCHOOL_YEAR_PICKER_AHEAD;
  const years = [];

  for (let startYear = FORM_V_VI_MIN_YEAR; startYear <= maxDisplayYear; startYear++) {
    const academicYear = getAcademicYearRange(startYear);
    const endYear = startYear + 1;

    years.push({
      year: startYear,
      ...academicYear,
      cohortStartYear: startYear,
      isEndYear: false,
      role: 'cohort-start',
      displayLabel: `${startYear} (${academicYear.displayRange})`,
    });

    if (endYear <= maxDisplayYear) {
      years.push({
        year: endYear,
        ...academicYear,
        cohortStartYear: startYear,
        isEndYear: true,
        role: 'cohort-end',
        displayLabel: `${endYear} (${academicYear.displayRange})`,
      });
    }
  }

  return years.sort((a, b) => b.year - a.year || (a.isEndYear ? 1 : -1));
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
 * When a year has two cards (e.g. 2026 as cohort-end AND cohort-start),
 * returns the card matching the current term (Jul–Dec → start, Jan–Jun → end).
 * @param {number} displayYear
 * @returns {object|undefined}
 */
export const getFormVVICardByYear = (displayYear) => {
  const y = parseInt(displayYear, 10);
  if (isNaN(y)) return undefined;
  const cards = getFormVVIYears().filter((card) => card.year === y);
  if (cards.length === 0) return undefined;
  if (cards.length === 1) return cards[0];
  // Multiple cards — prefer the one matching current term
  const currentTerm = getCurrentTerm();
  for (const card of cards) {
    if (currentTerm.term === 'First Term' && !card.isEndYear) return card;
    if (currentTerm.term === 'Second Term' && card.isEndYear) return card;
  }
  return cards[0];
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
 * A year may have both roles (e.g. 2026 is end of 2025–2026 + start of 2026–2027),
 * in which case both term pairs are valid.
 */
export const isValidFormVVITermPair = (displayYear, term) => {
  const y = parseInt(displayYear, 10);
  const normalized = normalizeFormVVITerm(term);
  if (isNaN(y) || !normalized) return false;
  const cards = getFormVVIYears().filter((card) => card.year === y);
  if (cards.length === 0) return false;
  return cards.some((card) => {
    if (card.isEndYear) return normalized === 'Second Term';
    return normalized === 'First Term';
  });
};

export const getFormVVITermInvalidReason = (displayYear, term) => {
  const y = parseInt(displayYear, 10);
  const normalized = normalizeFormVVITerm(term);
  const cards = getFormVVIYears().filter((card) => card.year === y);
  if (isNaN(y) || cards.length === 0) {
    return `Year ${displayYear} is not a valid Form V/VI year.`;
  }
  // If ANY card accepts this pair, it's valid
  if (cards.some((card) => {
    if (card.isEndYear) return normalized === 'Second Term';
    return normalized === 'First Term';
  })) return '';
  // All cards reject — show rejection from the first card's perspective
  const card = cards[0];
  if (card.isEndYear) {
    return (
      `Year ${y} is the Jan–Jun calendar year for cohort ${card.displayRange}. ` +
      `For this cohort, Jul–Dec ${y} would be Form VI, not Form V. Choose Second Term.`
    );
  }
  return (
    `Year ${y} is the Jul–Dec calendar year for cohort ${card.displayRange}. ` +
    `For this cohort, Jan–Jun ${y + 1} would be Second Term. Choose First Term.`
  );
};

export const getFormVVITermChoices = (displayYear) => {
  const y = parseInt(displayYear, 10);
  const cards = getFormVVIYears().filter((card) => card.year === y);
  const hasEndYearCard = cards.some((c) => c.isEndYear);
  const hasStartYearCard = cards.some((c) => !c.isEndYear);

  const currentTerm = getCurrentTerm();
  const isFirstTermCurr = currentTerm.term === 'First Term' && y === currentTerm.academicYearStart;
  const isSecondTermCurr = currentTerm.term === 'Second Term' && y === currentTerm.academicYearEnd;

  const first = {
    term: 'First Term',
    title: 'First Term',
    subtitle: `July – December ${y}`,
    description: hasEndYearCard
      ? `First Term for the new ${y}–${y + 1} cohort (Form VI / new Form V)`
      : `Cohort ${y} - ${y + 1} · Term I (Jul – Dec ${y})`,
    recommended: isFirstTermCurr || (!hasEndYearCard && !isSecondTermCurr),
    valid: hasStartYearCard || isFirstTermCurr,
    invalidReason: (hasStartYearCard || isFirstTermCurr)
      ? ''
      : getFormVVITermInvalidReason(y, 'First Term'),
  };

  const second = {
    term: 'Second Term',
    title: 'Second Term',
    subtitle: `January – June ${y}`,
    description: hasEndYearCard
      ? `Cohort ${y - 1} - ${y} · Term II (Jan – Jun ${y})`
      : `Second Term is under year ${y + 1} for this cohort`,
    recommended: isSecondTermCurr || (hasEndYearCard && !isFirstTermCurr),
    valid: hasEndYearCard || isSecondTermCurr,
    invalidReason: (hasEndYearCard || isSecondTermCurr)
      ? ''
      : getFormVVITermInvalidReason(y, 'Second Term'),
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
