import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../utils/toast';
import {
  isValidFormVVITermPair,
  getFormVVITermInvalidReason,
  normalizeFormVVITerm,
} from '../utils/academicYearUtils';

/**
 * Redirects when Form V/VI URL has an invalid year + term pair (e.g. 2026 + First Term).
 * @param {{ enabled: boolean, displayYear: string|number, term?: string, redirectTo: string }} opts
 */
export function useFormVVITermGuard({ enabled, displayYear, term, redirectTo }) {
  const navigate = useNavigate();
  const decoded = term ? decodeURIComponent(String(term)) : '';
  const normalizedTerm = normalizeFormVVITerm(decoded);
  const valid =
    !enabled || !term || isValidFormVVITermPair(displayYear, normalizedTerm);
  const reason = valid ? '' : getFormVVITermInvalidReason(displayYear, normalizedTerm);

  useEffect(() => {
    if (!enabled || !term || valid || !redirectTo) return;
    toast.error(reason);
    navigate(redirectTo, { replace: true });
  }, [enabled, term, valid, redirectTo, reason, navigate]);

  return { valid, reason, normalizedTerm };
}
