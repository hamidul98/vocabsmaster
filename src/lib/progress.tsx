import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "@heroui/react";
import { load, save } from "./storage";
import type { Word } from "./types";
import type { MarkColor } from "./colors";

export type Status = "learned" | "difficult";
/** How far a word has been explored: 2 = interacted with (level 1 is legacy and ignored). */
export type SeenLevel = 1 | 2;
export type Skill = "pre-ielts" | "reading" | "writing" | "speaking" | "listening";
/** An admin-added study resource (kept in the admin's own synced data, so no one else can see it). */
export interface Resource { id: string; title: string; url: string; note: string; addedAt: number }

/** Share of a word counted as "covered": learned 100%, engaged/difficult 60%. */
export const WEIGHT = { learned: 1, engaged: 0.6 } as const;
type Marks = Record<string, Status>; // key = Word.id

export const XP_PER_LEVEL = 250;
export const XP = { flashcard: 2, quiz: 5, learned: 10, passage: 50 } as const;

/** Local-time YYYY-MM-DD (toISOString would use UTC and break streaks near midnight). */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Persisted state with a ref mirror so callbacks always see the latest value. */
function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => load(key, initial));
  const ref = useRef(value);
  const set = useCallback((next: T | ((p: T) => T)) => {
    const v = typeof next === "function" ? (next as (p: T) => T)(ref.current) : next;
    ref.current = v;
    save(key, v);
    setValue(v);
  }, [key]);
  return [value, set, ref] as const;
}

/** Everything that is synced to the cloud when signed in. */
export interface SyncData {
  marks: Marks;
  learnedAt: Record<string, number>;
  daily: Record<string, number>;
  xp: number;
  goal: number;
  name: string;
  book: string;
  wrong: Record<string, number>;
  bonus: string[];
  last: { path: string; slug: string } | null;
  colors: Record<string, MarkColor>;
  /** Custom word order per collection (e.g. passage slug -> word ids). */
  order: Record<string, string[]>;
  /** Word id -> how far it was explored (see SeenLevel). */
  seen: Record<string, SeenLevel>;
  /** Admin-only study resources per IELTS skill. */
  resources: Partial<Record<Skill, Resource[]>>;
}

export interface WeekDay { label: string; key: string; met: boolean; today: boolean; future: boolean }

interface ProgressCtx {
  marks: Marks;
  /** Toggle: setting the same status again clears it. */
  toggle: (wordId: string, status: Status) => void;
  statusOf: (wordId: string) => Status | undefined;
  /** Focus colour per word (independent of learned/difficult). */
  colors: Record<string, MarkColor>;
  /** Set a word's focus colour; null clears it. */
  setColor: (wordId: string, color: MarkColor | null) => void;
  order: Record<string, string[]>;
  /** Save a custom word order for a collection; null restores the sheet order. */
  setOrder: (key: string, ids: string[] | null) => void;
  learnedAt: Record<string, number>;
  seen: Record<string, SeenLevel>;
  /** Record that a word was interacted with (2). Never lowers the level. */
  markSeen: (wordId: string, level: SeenLevel) => void;
  resources: Partial<Record<Skill, Resource[]>>;
  addResource: (skill: Skill, r: Omit<Resource, "id" | "addedAt">) => void;
  updateResource: (skill: Skill, id: string, r: Omit<Resource, "id" | "addedAt">) => void;
  removeResource: (skill: Skill, id: string) => void;
  /** Consecutive days the daily goal was met. */
  streak: number;
  xp: number;
  level: number;
  xpIntoLevel: number;
  goal: number;
  setGoal: (n: number) => void;
  daily: Record<string, number>;
  todayCount: number;
  week: WeekDay[];
  name: string;
  setName: (s: string) => void;
  /** Default book filter (bookNumber as string) or "" for all */
  book: string;
  setBook: (s: string) => void;
  lastStudied: { path: string; slug: string } | null;
  setLastStudied: (path: string, slug: string) => void;
  wrong: Record<string, number>;
  reviewCard: () => void;
  answerQuiz: (word: Word, correct: boolean) => void;
  completePassage: (slug: string) => void;
  reset: () => void;
  /** Current synced state (new object whenever any part changes). */
  syncData: SyncData;
  /** Replace all synced state (used when cloud data arrives). */
  applySync: (d: Partial<SyncData>) => void;
}

const Ctx = createContext<ProgressCtx | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [marks, setMarks, marksRef] = usePersisted<Marks>("marks", {});
  const [learnedAt, setLearnedAt] = usePersisted<Record<string, number>>("learnedAt", {});
  const [daily, setDaily, dailyRef] = usePersisted<Record<string, number>>("daily", {});
  const [xp, setXp, xpRef] = usePersisted<number>("xp", 0);
  const [goal, setGoal, goalRef] = usePersisted<number>("goal", 20);
  const [name, setName] = usePersisted<string>("name", "Learner");
  const [book, setBook] = usePersisted<string>("book", "");
  const [wrong, setWrong] = usePersisted<Record<string, number>>("wrong", {});
  const [bonus, setBonus] = usePersisted<string[]>("bonus", []);
  const [colors, setColors, colorsRef] = usePersisted<Record<string, MarkColor>>("colors", {});
  const [order, setOrderAll, orderRef] = usePersisted<Record<string, string[]>>("order", {});
  const [seen, setSeen, seenRef] = usePersisted<Record<string, SeenLevel>>("seen", {});
  const [resources, setResources, resourcesRef] = usePersisted<Partial<Record<Skill, Resource[]>>>("resources", {});
  const [lastStudied, setLast] = usePersisted<{ path: string; slug: string } | null>("last", null);

  const addXp = useCallback((n: number) => {
    const before = Math.floor(xpRef.current / XP_PER_LEVEL);
    const next = xpRef.current + n;
    setXp(next);
    const after = Math.floor(next / XP_PER_LEVEL);
    if (after > before) {
      toast.success(`Level up! You reached Level ${after + 1}`);
      window.dispatchEvent(new CustomEvent("ibv:confetti"));
    }
  }, [setXp, xpRef]);

  const countReview = useCallback((n = 1) => {
    const k = dayKey();
    const prev = dailyRef.current[k] ?? 0;
    setDaily({ ...dailyRef.current, [k]: prev + n });
    if (prev < goalRef.current && prev + n >= goalRef.current) {
      toast.success("Daily goal reached!");
      window.dispatchEvent(new CustomEvent("ibv:confetti"));
    }
  }, [dailyRef, goalRef, setDaily]);

  const addResource = useCallback((skill: Skill, r: Omit<Resource, "id" | "addedAt">) => {
    const item: Resource = { ...r, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, addedAt: Date.now() };
    setResources({ ...resourcesRef.current, [skill]: [item, ...(resourcesRef.current[skill] ?? [])] });
  }, [resourcesRef, setResources]);
  const updateResource = useCallback((skill: Skill, id: string, r: Omit<Resource, "id" | "addedAt">) => {
    setResources({ ...resourcesRef.current, [skill]: (resourcesRef.current[skill] ?? []).map((x) => (x.id === id ? { ...x, ...r } : x)) });
  }, [resourcesRef, setResources]);
  const removeResource = useCallback((skill: Skill, id: string) => {
    setResources({ ...resourcesRef.current, [skill]: (resourcesRef.current[skill] ?? []).filter((x) => x.id !== id) });
  }, [resourcesRef, setResources]);

  const markSeen = useCallback((id: string, level: SeenLevel) => {
    if ((seenRef.current[id] ?? 0) >= level) return;
    setSeen({ ...seenRef.current, [id]: level });
  }, [seenRef, setSeen]);

  const toggle = useCallback((id: string, status: Status) => {
    markSeen(id, 2);
    const next = { ...marksRef.current };
    const clearing = next[id] === status;
    if (clearing) delete next[id];
    else next[id] = status;
    setMarks(next);
    setLearnedAt((m) => {
      const c = { ...m };
      if (!clearing && status === "learned") c[id] = Date.now();
      else if (status === "learned" || next[id] !== "learned") delete c[id];
      return c;
    });
    if (!clearing && status === "learned") {
      addXp(XP.learned);
      countReview();
    }
  }, [addXp, countReview, markSeen, marksRef, setLearnedAt, setMarks]);

  const setColor = useCallback((id: string, color: MarkColor | null) => {
    const next = { ...colorsRef.current };
    if (color) {
      // first time a word is touched today's goal counts it once (re-colouring does not)
      if (!next[id] && (seenRef.current[id] ?? 0) < 2) countReview();
      next[id] = color;
      markSeen(id, 2);
    }
    else delete next[id];
    setColors(next);
  }, [colorsRef, countReview, markSeen, seenRef, setColors]);

  const setOrder = useCallback((key: string, ids: string[] | null) => {
    const next = { ...orderRef.current };
    if (ids) next[key] = ids;
    else delete next[key];
    setOrderAll(next);
  }, [orderRef, setOrderAll]);

  const reviewCard = useCallback(() => { addXp(XP.flashcard); countReview(); }, [addXp, countReview]);

  const answerQuiz = useCallback((word: Word, correct: boolean) => {
    markSeen(word.id, 2);
    countReview();
    if (correct) addXp(XP.quiz);
    else setWrong((w) => ({ ...w, [word.id]: (w[word.id] ?? 0) + 1 }));
  }, [addXp, countReview, markSeen, setWrong]);

  const completePassage = useCallback((slug: string) => {
    setBonus((b) => {
      if (b.includes(slug)) return b;
      addXp(XP.passage);
      toast.success("Passage completed! +50 XP");
      return [...b, slug];
    });
  }, [addXp, setBonus]);

  const setLastStudied = useCallback((path: string, slug: string) => setLast({ path, slug }), [setLast]);

  const reset = useCallback(() => {
    setMarks({}); setLearnedAt({}); setDaily({}); setXp(0); setWrong({}); setBonus([]); setLast(null); setColors({}); setOrderAll({}); setSeen({});
  }, [setMarks, setLearnedAt, setDaily, setXp, setWrong, setBonus, setLast, setColors, setOrderAll, setSeen]);

  const syncData = useMemo<SyncData>(() => ({ marks, learnedAt, daily, xp, goal, name, book, wrong, bonus, last: lastStudied, colors, order, seen, resources }),
    [marks, learnedAt, daily, xp, goal, name, book, wrong, bonus, lastStudied, colors, order, seen, resources]);

  const applySync = useCallback((d: Partial<SyncData>) => {
    if (d.marks) setMarks(d.marks);
    if (d.learnedAt) setLearnedAt(d.learnedAt);
    if (d.daily) setDaily(d.daily);
    if (typeof d.xp === "number") setXp(d.xp);
    if (typeof d.goal === "number") setGoal(d.goal);
    if (typeof d.name === "string") setName(d.name);
    if (typeof d.book === "string") setBook(d.book);
    if (d.wrong) setWrong(d.wrong);
    if (d.bonus) setBonus(d.bonus);
    if (d.last !== undefined) setLast(d.last);
    if (d.colors) setColors(d.colors);
    if (d.order) setOrderAll(d.order);
    if (d.seen) setSeen(d.seen);
    if (d.resources) setResources(d.resources);
  }, [setMarks, setLearnedAt, setDaily, setXp, setGoal, setName, setBook, setWrong, setBonus, setLast, setColors, setOrderAll, setSeen, setResources]);

  // streak = consecutive days with daily >= goal, ending today (or yesterday if today isn't done yet)
  const streak = useMemo(() => {
    let d = new Date();
    if ((daily[dayKey(d)] ?? 0) < goal) d = addDays(d, -1);
    let n = 0;
    while ((daily[dayKey(d)] ?? 0) >= goal && goal > 0) { n++; d = addDays(d, -1); }
    return n;
  }, [daily, goal]);

  const week = useMemo<WeekDay[]>(() => {
    const now = new Date();
    const monday = addDays(now, -((now.getDay() + 6) % 7));
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => {
      const d = addDays(monday, i);
      const key = dayKey(d);
      return { label, key, met: (daily[key] ?? 0) >= goal, today: key === dayKey(now), future: d > now && key !== dayKey(now) };
    });
  }, [daily, goal]);

  // keep value fresh across midnight
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60_000); return () => clearInterval(t); }, []);

  const value = useMemo<ProgressCtx>(() => ({
    marks, toggle, statusOf: (id) => marks[id], colors, setColor, order, setOrder, learnedAt, seen, markSeen, resources, addResource, updateResource, removeResource, streak, xp,
    level: Math.floor(xp / XP_PER_LEVEL) + 1, xpIntoLevel: xp % XP_PER_LEVEL,
    goal, setGoal, daily, todayCount: daily[dayKey()] ?? 0, week, name, setName, book, setBook,
    lastStudied, setLastStudied, wrong, reviewCard, answerQuiz, completePassage, reset, syncData, applySync,
  }), [syncData, applySync, marks, toggle, colors, setColor, order, setOrder, learnedAt, seen, markSeen, resources, addResource, updateResource, removeResource, streak, xp, goal, setGoal, daily, week, name, setName, book, setBook, lastStudied, setLastStudied, wrong, reviewCard, answerQuiz, completePassage, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useProgress = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useProgress outside ProgressProvider");
  return c;
};
