import { useCallback, useState } from 'react';

/**
 * Wraps an async handler with a pending flag for LoadingButton / busy UI.
 */
export function useAsyncAction(action) {
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (...args) => {
      if (pending) return;
      setPending(true);
      try {
        return await action(...args);
      } finally {
        setPending(false);
      }
    },
    [action, pending]
  );

  return [run, pending];
}
