import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getFormVVIYears,
  filterFormVVIYearsByPermission,
  getFormVVIYearSelectionHelpText,
  FORM_V_VI_STREAM_CODES,
} from '../utils/academicYearUtils';

/**
 * Form V/VI year list with optional class permission filter.
 * @param {string} formLevel - e.g. 'FORM V', 'FORM VI'
 * @param {string} [stream] - combination code e.g. 'PCB'
 * @param {{ moduleId?: string }} [options]
 */
export function useFormVVIYearOptions(formLevel, stream, options = {}) {
  const { getAllowedYearsForClass } = useAuth();
  const availableYears = useMemo(() => getFormVVIYears(), []);

  const className = stream ? `${formLevel} ${stream}` : formLevel;

  const years = useMemo(
    () =>
      filterFormVVIYearsByPermission(
        availableYears,
        className,
        getAllowedYearsForClass,
        options.moduleId
      ),
    [availableYears, className, getAllowedYearsForClass, options.moduleId]
  );

  const helpText = getFormVVIYearSelectionHelpText();

  return { years, helpText, className };
}

/** Union of year cards allowed across any allocated stream (score entry “together” mode). */
export function useFormVVITogetherYearOptions(formLevel) {
  const { getAllowedYearsForClass, isAdminLike } = useAuth();
  const availableYears = useMemo(() => getFormVVIYears(), []);

  const years = useMemo(() => {
    if (isAdminLike()) return availableYears;
    const allowedYears = new Set();
    let anyUnrestricted = false;
    for (const code of FORM_V_VI_STREAM_CODES) {
      const allowed = getAllowedYearsForClass(`${formLevel} ${code}`);
      if (allowed === null) {
        anyUnrestricted = true;
        break;
      }
      allowed.forEach((y) => allowedYears.add(y));
    }
    if (anyUnrestricted) return availableYears;
    return availableYears.filter((o) => allowedYears.has(o.year));
  }, [availableYears, formLevel, getAllowedYearsForClass, isAdminLike]);

  return { years, helpText: getFormVVIYearSelectionHelpText() };
}
