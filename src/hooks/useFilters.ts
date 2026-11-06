import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EMPTY_FILTERS, fromParams, toParams, type Filters } from '@/lib/filters';
import { load, save } from '@/lib/storage';

/**
 * Filters live in the URL (`#/library?book=21&test=3&p=1`) so views are shareable and Back works.
 * When the URL has no filters we restore the last-used ones from localStorage.
 */
export function useFilters(storageKey: string, defaults: Partial<Filters> = {}) {
  const [sp, setSp] = useSearchParams();
  const hasUrl = sp.size > 0;
  const filters = useMemo<Filters>(() => ({ ...EMPTY_FILTERS, ...defaults, ...fromParams(sp) }), [sp]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (hasUrl) return;
    const saved = load<Record<string, string> | null>(`filters:${storageKey}`, null);
    if (saved && Object.keys(saved).length) setSp(saved, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = useCallback((next: Filters) => {
    const p = toParams(next);
    save(`filters:${storageKey}`, p);
    setSp(p, { replace: true });
  }, [setSp, storageKey]);

  const patch = useCallback((part: Partial<Filters>) => set({ ...filters, ...part }), [filters, set]);
  const clear = useCallback(() => set({ ...EMPTY_FILTERS }), [set]);
  return { filters, set, patch, clear };
}
