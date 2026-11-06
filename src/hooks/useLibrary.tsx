import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchIndexReport, fetchPassage, type IncompleteRow } from "@/lib/sheet";
import type { Passage, PassageRef } from "@/lib/types";

export interface RefreshResult { ok: boolean; passages: number; added: number; incomplete: number }

interface LibraryCtx {
  index: PassageRef[] | null;
  /** Main-tab rows that are missing TEST NO / PASSAGE NUMBER, so they can't be shown yet */
  incomplete: IncompleteRow[];
  indexError: Error | null;
  /** Loaded passages by slug. Missing = not loaded yet. */
  passages: Record<string, Passage>;
  errors: Record<string, Error>;
  loadPassage: (ref: PassageRef) => Promise<Passage | undefined>;
  /** Load every passage in the background (for global search / difficult words). */
  loadAll: () => void;
  loadingAll: boolean;
  reload: () => void;
  /** Quietly re-read the sheet (no loading flash). Runs automatically when you come back to the tab. */
  refresh: () => Promise<RefreshResult>;
}

const Ctx = createContext<LibraryCtx | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState<PassageRef[] | null>(null);
  const [incomplete, setIncomplete] = useState<IncompleteRow[]>([]);
  const [indexError, setIndexError] = useState<Error | null>(null);
  const [passages, setPassages] = useState<Record<string, Passage>>({});
  const [errors, setErrors] = useState<Record<string, Error>>({});
  const [loadingAll, setLoadingAll] = useState(false);
  const inflight = useRef<Record<string, Promise<Passage | undefined>>>({});

  const reload = useCallback(() => {
    setIndexError(null);
    setIndex(null);
    setErrors({});
    inflight.current = {};
    fetchIndexReport().then((r) => { setIndex(r.refs); setIncomplete(r.incomplete); }, setIndexError);
  }, []);
  useEffect(reload, [reload]);

  const passagesRef = useRef(passages);
  passagesRef.current = passages;
  const indexRef = useRef(index);
  indexRef.current = index;
  const lastRefresh = useRef(Date.now());
  const refresh = useCallback(async (): Promise<RefreshResult> => {
    lastRefresh.current = Date.now();
    try {
      const r = await fetchIndexReport();
      const before = indexRef.current?.length ?? 0;
      // only touch state when something changed, so screens don't flicker
      if (JSON.stringify(r.refs) !== JSON.stringify(indexRef.current)) setIndex(r.refs);
      setIncomplete((old) => (JSON.stringify(old) === JSON.stringify(r.incomplete) ? old : r.incomplete));
      setErrors({});
      inflight.current = Object.fromEntries(Object.entries(inflight.current).filter(([slug]) => passagesRef.current[slug]));
      // re-read passages that are already open so new/edited words show up
      await Promise.all(r.refs.filter((ref) => passagesRef.current[ref.slug]).map((ref) =>
        fetchPassage(ref).then((p) => {
          const old = passagesRef.current[ref.slug];
          if (!old || JSON.stringify(old.words) !== JSON.stringify(p.words)) setPassages((s) => ({ ...s, [ref.slug]: p }));
        }, () => undefined)));
      return { ok: true, passages: r.refs.length, added: Math.max(0, r.refs.length - before), incomplete: r.incomplete.length };
    } catch {
      return { ok: false, passages: 0, added: 0, incomplete: 0 };
    }
  }, []);
  useEffect(() => {
    const again = () => { if (document.visibilityState === "visible" && Date.now() - lastRefresh.current > 30_000) void refresh(); };
    const onOnline = () => void refresh();
    document.addEventListener("visibilitychange", again);
    window.addEventListener("online", onOnline);
    return () => { document.removeEventListener("visibilitychange", again); window.removeEventListener("online", onOnline); };
  }, [refresh]);

  const loadPassage = useCallback((ref: PassageRef) => {
    inflight.current[ref.slug] ??= fetchPassage(ref).then(
      (p) => {
        setPassages((s) => ({ ...s, [ref.slug]: p }));
        return p;
      },
      (e: Error) => {
        setErrors((s) => ({ ...s, [ref.slug]: e }));
        return undefined;
      },
    );
    return inflight.current[ref.slug];
  }, []);

  const loadAll = useCallback(() => {
    if (!index) return;
    setLoadingAll(true);
    Promise.all(index.map(loadPassage)).finally(() => setLoadingAll(false));
  }, [index, loadPassage]);

  const value = useMemo(
    () => ({ index, incomplete, indexError, passages, errors, loadPassage, loadAll, loadingAll, reload, refresh }),
    [index, incomplete, indexError, passages, errors, loadPassage, loadAll, loadingAll, reload, refresh],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useLibrary = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useLibrary outside LibraryProvider");
  return c;
};

/** Load one passage by slug and return its state (ref / passage / error / unknown). */
export function usePassage(slug: string | undefined) {
  const { index, passages, errors, loadPassage } = useLibrary();
  const ref = index?.find((r) => r.slug === slug);
  useEffect(() => {
    if (ref && !passages[ref.slug]) void loadPassage(ref);
  }, [ref, passages, loadPassage]);
  return {
    ref,
    passage: slug ? passages[slug] : undefined,
    error: slug ? errors[slug] : undefined,
    /** index loaded but this slug isn't listed in Main */
    unknown: index != null && !ref,
  };
}
