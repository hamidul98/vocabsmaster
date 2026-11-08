import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as fbSignOut, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from '@heroui/react';
import { auth, db, firebaseEnabled } from './firebase';
import { useProgress, type SyncData } from './progress';

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error';

interface AuthCtx {
  /** False when Firebase isn't configured (.env.local missing). */
  enabled: boolean;
  user: User | null;
  /** True until Firebase reports the initial sign-in state. */
  loading: boolean;
  status: SyncStatus;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

/** JSON with sorted keys, so equal data always gives the same string. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

const maxMerge = (a: Record<string, number>, b: Record<string, number>) => {
  const out = { ...a };
  for (const [k, n] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, n);
  return out;
};

const isEmpty = (d: SyncData) => !Object.keys(d.marks).length && !Object.keys(d.colors).length && !d.xp && !Object.keys(d.daily).length;

/**
 * First sign-in on a device: combine this device's data with the cloud copy so nothing is lost.
 * After that the cloud copy is the source of truth and changes flow both ways.
 */
function merge(local: SyncData, remote: Partial<SyncData>): SyncData {
  const r: SyncData = { ...local, ...remote } as SyncData;
  if (isEmpty(local)) return r;
  const marks = { ...(remote.marks ?? {}), ...local.marks };
  const learnedAt = Object.fromEntries(Object.entries({ ...(remote.learnedAt ?? {}), ...local.learnedAt }).filter(([id]) => marks[id] === 'learned'));
  return {
    marks,
    learnedAt,
    daily: maxMerge(remote.daily ?? {}, local.daily),
    xp: Math.max(remote.xp ?? 0, local.xp),
    goal: remote.goal ?? local.goal,
    name: remote.name && remote.name !== 'Learner' ? remote.name : local.name,
    book: remote.book ?? local.book,
    wrong: maxMerge(remote.wrong ?? {}, local.wrong),
    bonus: [...new Set([...(remote.bonus ?? []), ...local.bonus])],
    last: local.last ?? remote.last ?? null,
    colors: { ...(remote.colors ?? {}), ...local.colors },
  };
}

const parse = (raw: unknown): Partial<SyncData> | null => {
  try { return typeof raw === 'string' ? JSON.parse(raw) : null; } catch { return null; }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const { syncData, applySync, name, setName } = useProgress();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseEnabled);
  const [status, setStatus] = useState<SyncStatus>('off');
  const dataRef = useRef(syncData);
  dataRef.current = syncData;
  const lastJson = useRef<string | null>(null);
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
  }, []);

  // On sign-in: pull, merge, push, then listen for changes from other devices.
  useEffect(() => {
    if (!user || !db) { ready.current = false; setStatus('off'); return; }
    const ref = doc(db, 'users', user.uid);
    let unsub: (() => void) | undefined;
    let cancelled = false;
    setStatus('syncing');
    (async () => {
      try {
        const snap = await getDoc(ref);
        const remote = snap.exists() ? parse(snap.data().data) : null;
        const merged = remote ? merge(dataRef.current, remote) : dataRef.current;
        if (cancelled) return;
        lastJson.current = stable(merged);
        applySync(merged);
        await setDoc(ref, { data: JSON.stringify(merged), updatedAt: serverTimestamp() });
        if (cancelled) return;
        ready.current = true;
        setStatus('synced');
        unsub = onSnapshot(ref, (s) => {
          if (s.metadata.hasPendingWrites || !s.exists()) return;
          const d = parse(s.data().data);
          if (!d) return;
          const j = stable(d);
          if (j === lastJson.current || j === stable(dataRef.current)) return;
          lastJson.current = j;
          applySync(d);
        }, () => setStatus('error'));
      } catch (e) {
        console.error('Sync failed', e);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; unsub?.(); ready.current = false; clearTimeout(timer.current); };
  }, [user, applySync]);

  // Push local changes (debounced).
  useEffect(() => {
    if (!ready.current || !user || !db) return;
    const j = stable(syncData);
    if (j === lastJson.current) return;
    clearTimeout(timer.current);
    const ref = doc(db, 'users', user.uid);
    timer.current = setTimeout(() => {
      lastJson.current = j;
      setStatus('syncing');
      setDoc(ref, { data: JSON.stringify(syncData), updatedAt: serverTimestamp() })
        .then(() => setStatus('synced'))
        .catch((e) => { console.error('Sync failed', e); setStatus('error'); });
    }, 700);
  }, [syncData, user]);

  // Use the Google name for a brand-new profile.
  useEffect(() => {
    if (user?.displayName && (!name || name === 'Learner')) setName(user.displayName.split(' ')[0].slice(0, 24));
  }, [user, name, setName]);

  const signIn = useCallback(async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
      toast.success('Signed in. Your progress now syncs across devices.');
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      // Popups are often blocked in installed apps / some mobile browsers.
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(auth, provider);
      else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') { console.error(e); toast.danger('Sign-in failed. Please try again.'); }
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await fbSignOut(auth);
    toast('Signed out. Progress stays saved on this device.');
  }, []);

  const value = useMemo<AuthCtx>(() => ({ enabled: firebaseEnabled, user, loading, status, signIn, signOut }), [user, loading, status, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};
