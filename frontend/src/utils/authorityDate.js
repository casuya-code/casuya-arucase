/**
 * Authorization date helpers for authority data (admin form → reports → PDFs).
 *
 * Admins type the authorization date as DD.MM.YYYY or DD/MM/YYYY and the day
 * and month may have one or two digits (2.5.2026, 02.05.2025, 02/05/2026).
 * JavaScript's `new Date('02.05.2025')` reads that as 5 February 2025
 * (month first), so every read of the stored value must go through these
 * helpers instead: parse day-first, validate the calendar day, and always
 * render a zero-padded DD-first string.
 *
 * Keep this file in sync with backend/utils/authorityDate.js.
 */

/** Day-first date, e.g. 2.5.2026 / 02.05.2026 / 02/05/2026 / 02-05-2026. */
const DAY_FIRST_PATTERN = /^(\d{1,2})([./-])(\d{1,2})\2(\d{4})$/;
/** Legacy ISO value (YYYY-MM-DD) saved by older versions. */
const ISO_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

/** Short, user-facing description of the accepted formats. */
export const AUTHORITY_DATE_HINT = 'DD.MM.YYYY or DD/MM/YYYY (e.g. 02.05.2025)';

const pad2 = (n) => String(n).padStart(2, '0');

/**
 * Split an authorization date into numeric parts, day first.
 * @param {*} value raw value typed by the admin or read from the database
 * @returns {{day: number, month: number, year: number, separator: string}|null}
 *   null when the value is empty or not a real calendar date
 */
export function parseAuthorityDateParts(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  let day;
  let month;
  let year;
  let separator = '/';

  const dayFirst = DAY_FIRST_PATTERN.exec(raw);
  if (dayFirst) {
    day = Number(dayFirst[1]);
    separator = dayFirst[2];
    month = Number(dayFirst[3]);
    year = Number(dayFirst[4]);
  } else {
    const iso = ISO_PATTERN.exec(raw);
    if (!iso) return null;
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  }

  if (year < 1900 || year > 2999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  // Reject impossible days such as 31.02.2025 and avoid the timezone shift of
  // `new Date(isoString)` (UTC midnight can land on the previous local day).
  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return null;
  }

  return { day, month, year, separator };
}

/**
 * Real Date (local time, no timezone shift) for an authorization date.
 * @param {*} value
 * @returns {Date|null}
 */
export function parseAuthorityDate(value) {
  const parts = parseAuthorityDateParts(value);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day);
}

/**
 * Value to persist: zero-padded day/month, keeping the separator the admin
 * used, so 2.5.2026 becomes 02.05.2026 and 02/05/2026 stays as typed.
 * Legacy YYYY-MM-DD values are converted to DD/MM/YYYY.
 * @param {*} value
 * @returns {string|null} '' when empty, null when the value is not a valid date
 */
export function normalizeAuthorityDate(value) {
  const parts = parseAuthorityDateParts(value);
  if (!parts) {
    const raw = value === null || value === undefined ? '' : String(value).trim();
    return raw ? null : '';
  }
  return `${pad2(parts.day)}${parts.separator}${pad2(parts.month)}${parts.separator}${parts.year}`;
}

/**
 * Value shown on the individual report, the bulk report and the downloaded
 * PDFs (all three must stay identical). Falls back to today when nothing is
 * stored, and to the raw text when a legacy value cannot be recognised.
 * @param {*} value stored authority date
 * @param {{fallbackToToday?: boolean}} [options]
 * @returns {string}
 */
export function formatAuthorityDate(value, options = {}) {
  const fallbackToToday = options.fallbackToToday !== false;
  const raw = value === null || value === undefined ? '' : String(value).trim();

  if (!raw) {
    if (!fallbackToToday) return '';
    const today = new Date();
    return `${pad2(today.getDate())}/${pad2(today.getMonth() + 1)}/${today.getFullYear()}`;
  }

  return normalizeAuthorityDate(raw) || raw;
}

/**
 * Validation for the admin form and the save route.
 * @param {*} value
 * @returns {{valid: boolean, empty: boolean, value: string, message: string}}
 *   value is the normalized string to persist ('' when the field is left blank)
 */
export function validateAuthorityDateInput(value) {
  const raw = value === null || value === undefined ? '' : String(value).trim();
  if (!raw) return { valid: true, empty: true, value: '', message: '' };

  const normalized = normalizeAuthorityDate(raw);
  if (normalized === null) {
    return {
      valid: false,
      empty: false,
      value: raw,
      message: `Enter a valid date as ${AUTHORITY_DATE_HINT}`,
    };
  }
  return { valid: true, empty: false, value: normalized, message: '' };
}
