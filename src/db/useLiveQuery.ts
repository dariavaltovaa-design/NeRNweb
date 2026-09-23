import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

/**
 * Reads from IndexedDB and re-renders whenever the data changes.
 * Returns `undefined` while loading; queries return `null` for "nothing there".
 */
export function useLiveQuery<T>(
  query: () => Promise<T>,
  deps: readonly unknown[] = [],
): T | undefined {
  const [value, setValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    const subscription = liveQuery(query).subscribe({
      next: setValue,
      error: (error: unknown) => {
        // A failed read must not look like "no data": keep the loading state and report it.
        reportError(error);
      },
    });
    return () => subscription.unsubscribe();
    // The query closure changes every render; `deps` says when it really changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
