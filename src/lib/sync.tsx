import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, signOut as fbSignOut, updateProfile, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from '@heroui/react';
import { auth, db, firebaseEnabled } from './firebase';
import { useProgress, type SyncData } from './progress';

/** Shown as "Admin" in the greeting. Display only: it grants no extra access. */
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.toLowerCase() || 'hamidulhaquetitas@gmail.com';

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error';

interface AuthCtx {
  /** False when Firebase isn't configured (.env.local missing). */
  enabled: boolean;
  user: User | null;
  /** True until Firebase reports the initial sign-in state. */
  loading: boolean;
  status: SyncStatus;
  /** Email/password users must confirm their email before using the app. */
  verified: boolean;
  /** Signed in (and verified) with the admin email. */
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (name: string, email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  /** Re-check whether the email link has been clicked. Returns true when verified. */
  checkVerified: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

/** Friendly text for Firebase auth error codes. */
export function authMessage(e: unknown): string {
  const code = (e as { code?: string }).code ?? '';
  switch (code) {
    case 'auth/invalid-credential': case 'auth/wrong-password': case 'auth/user-not-found': case 'auth/invalid-login-credentials':
      return 'Email or password is incorrect.';
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/invalid-email': return 'Enter a valid email address.';
    case 'auth/missing-email': return 'Enter your email address first.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a minute and try again.';
    case 'auth/network-request-failed': return 'No internet connection. Check your network and try again.';
    case 'auth/operation-not-allowed': return 'This sign-in method isn’t enabled yet.';
    case 'auth/unauthorized-domain': return 'This website isn’t allowed to sign in yet (add it in Firebase → Authorized domains).';
    default: return 'Something went wrong. Please try again.';
  }
}

const EMPTY: SyncData = { marks: {}, learnedAt: {}, daily: {}, xp: 0, goal: 20, name: 'Learner', book: '', wrong: {}, bonus: [], last: null, colors: {}, order: {}, seen: {} };

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

const isEmpty = (d: SyncData) => !Object.keys(d.marks).length && !Object.keys(d.colors).length && !Object.keys(d.order ?? {}).length && !d.xp && !Object.keys(d.daily).length;

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
    order: { ...(remote.order ?? {}), ...local.order },
    seen: maxMerge(remote.seen ?? {}, local.seen ?? {}) as SyncData['seen'],
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
  const [verified, setVerified] = useState(false);
  const dataRef = useRef(syncData);
  dataRef.current = syncData;
  const lastJson = useRef<string | null>(null);
  const ready = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (u) => { setUser(u); setVerified(!!u?.emailVerified); setLoading(false); });
  }, []);

  // On sign-in: pull, merge, push, then listen for changes from other devices.
  useEffect(() => {
    if (!user || !verified || !db) { ready.current = false; setStatus('off'); return; }
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
  }, [user, verified, applySync]);

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
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      // Popups are often blocked in installed apps / some mobile browsers.
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(auth, provider);
      else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') { console.error(e); throw e; }
    }
  }, []);

  const signInEmail = useCallback(async (email: string, password: string) => {
    if (!auth) return;
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUpEmail = useCallback(async (displayName: string, email: string, password: string) => {
    if (!auth) return;
    const { user: u } = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName.trim()) await updateProfile(u, { displayName: displayName.trim() });
    await sendEmailVerification(u);
    setUser(auth.currentUser);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    if (!auth) return;
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const resendVerification = useCallback(async () => {
    if (auth?.currentUser) await sendEmailVerification(auth.currentUser);
  }, []);

  const checkVerified = useCallback(async () => {
    const u = auth?.currentUser;
    if (!u) return false;
    await u.reload();
    if (u.emailVerified) await u.getIdToken(true); // refresh token so the database sees the new state
    setVerified(u.emailVerified);
    return u.emailVerified;
  }, []);

  const signOut = useCallback(async () => {
    if (!auth) return;
    await fbSignOut(auth);
    applySync(EMPTY); // don't leave this account's progress for the next person on this device
    toast('Signed out.');
  }, [applySync]);

  const isAdmin = verified && user?.email?.toLowerCase() === ADMIN_EMAIL;
  const value = useMemo<AuthCtx>(() => ({ enabled: firebaseEnabled, user, loading, status, verified, isAdmin, signIn, signInEmail, signUpEmail, resetPassword, resendVerification, checkVerified, signOut }),
    [user, loading, status, verified, isAdmin, signIn, signInEmail, signUpEmail, resetPassword, resendVerification, checkVerified, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthProvider');
  return c;
};
