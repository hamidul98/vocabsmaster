import { useEffect, useMemo } from 'react';
import { useLibrary } from './useLibrary';
import { useProgress, WEIGHT } from '@/lib/progress';
import { load, save } from '@/lib/storage';
import type { Passage, PassageRef, Word } from '@/lib/types';

export type PassageStatus = 'new' | 'progress' | 'done';

export interface PassageStat {
  ref: PassageRef;
  passage?: Passage;
  loaded: boolean;
  count: number;
  learned: number;
  difficult: number;
  /** Learned share, 0-100 (what "Completed" is based on). */
  percent: number;
  /** Words interacted with or starred, but not learned. */
  engaged: number;
  /** Weighted coverage 0-100: learned 100%, engaged 60%. Scrolling alone never counts. Always >= percent. */
  progress: number;
  status: PassageStatus;
}

/** "IELTS 21 Academic 2026" -> "IELTS 21 Academic" */
export const shortBook = (name: string) => name.replace(/\s+\d{4}$/, '');

/** Word ids are `${tabName}::${word}`, so progress can be counted before a passage is loaded. */
const idPrefix = (ref: PassageRef) => `${ref.tabName}::`;

/** Per-passage progress for every passage in the Main tab (words appear as passages load). */
export function usePassageStats() {
  const { index, passages } = useLibrary();
  const { marks, seen, colors } = useProgress();

  // remember each passage's word count so it is known before the passage is opened again
  useEffect(() => {
    const cached = load<Record<string, number>>('counts', {});
    let changed = false;
    for (const [slug, p] of Object.entries(passages)) {
      if (cached[slug] !== p.words.length) { cached[slug] = p.words.length; changed = true; }
    }
    if (changed) save('counts', cached);
  }, [passages]);

  return useMemo<PassageStat[]>(() => {
    const cached = load<Record<string, number>>('counts', {});
    const byPrefix = (ids: string[]) => (ref: PassageRef) => ids.filter((id) => id.startsWith(idPrefix(ref)));
    const markIds = Object.keys(marks), seenIds = [...new Set([...Object.keys(seen), ...Object.keys(colors)])];
    // a focus colour counts as engagement, just like opening or flipping a card
    const lvl = (id: string) => (colors[id] ? 2 : seen[id] ?? 0);
    return (index ?? []).map((ref) => {
      const passage = passages[ref.slug];
      let learned: number, difficult: number, engaged: number;
      if (passage) {
        const w = passage.words;
        learned = w.filter((x) => marks[x.id] === 'learned').length;
        difficult = w.filter((x) => marks[x.id] === 'difficult').length;
        engaged = w.filter((x) => marks[x.id] !== 'learned' && (marks[x.id] === 'difficult' || lvl(x.id) === 2)).length;
      } else {
        const m = byPrefix(markIds)(ref), s = byPrefix(seenIds)(ref);
        learned = m.filter((id) => marks[id] === 'learned').length;
        difficult = m.filter((id) => marks[id] === 'difficult').length;
        engaged = difficult + s.filter((id) => !marks[id] && lvl(id) === 2).length;
      }
      const count = passage ? passage.words.length : cached[ref.slug] ?? 0;
      const pct = (n: number) => (count ? Math.min(100, Math.round((n / count) * 100)) : 0);
      return {
        ref, passage, loaded: !!passage, count, learned, difficult, engaged,
        percent: pct(learned),
        progress: pct(learned * WEIGHT.learned + engaged * WEIGHT.engaged),
        status: !learned ? 'new' : learned >= count && count ? 'done' : 'progress',
      };
    });
  }, [index, passages, marks, seen, colors]);
}

/** Words of the passages that match; each word is paired with its source ref. */
export const wordsOf = (stats: PassageStat[]): { word: Word; ref: PassageRef }[] =>
  stats.flatMap((s) => (s.passage?.words ?? []).map((word) => ({ word, ref: s.ref })));
