/**
 * useGoBack hook
 * Navigates back using the actual route history the user entered (history-aware),
 * falling back to a supplied path when there is no browser history to go back to.
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useGoBack = (fallbackPath = '/admin') => {
  const navigate = useNavigate();

  return useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  }, [navigate, fallbackPath]);
};

export default useGoBack;