import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { FORM_V_VI_STREAMS } from '../utils/academicYearUtils';

/**
 * Form V/VI combination streams, optionally filtered by user class allocation.
 */
export function useFormVVIStreams(formLevel, { requireAllocation = true, moduleId } = {}) {
  const { hasClass, isAdminLike } = useAuth();
  const classOpts = moduleId ? { moduleId } : {};

  return useMemo(() => {
    if (!requireAllocation || isAdminLike()) {
      return FORM_V_VI_STREAMS;
    }
    return FORM_V_VI_STREAMS.filter((s) => hasClass(`${formLevel} ${s.code}`, classOpts));
  }, [formLevel, requireAllocation, moduleId, hasClass, isAdminLike]);
}
