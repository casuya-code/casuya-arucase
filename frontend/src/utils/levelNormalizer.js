/**
 * Utility function to normalize form level from URL format to database format
 * Converts "form-i" -> "FORM I" (uppercase with space)
 */
export const normalizeFormLevel = (formLevel) => {
  if (!formLevel) return '';
  return formLevel.split('-').map(w => w.toUpperCase()).join(' ');
};

/**
 * Utility function to convert database format to URL format
 * Converts "FORM I" -> "form-i" (lowercase with hyphen)
 */
export const formLevelToUrl = (level) => {
  if (!level) return '';
  return level.split(' ').map(w => w.toLowerCase()).join('-');
};

