import { useMemo } from 'react';
import { useLibrary } from './useLibrary';
import { useProgress } from '@/lib/progress';
import type { Passage, PassageRef, Word } from '@/lib/types';

export type PassageStatus = 'new' | 'progress' | 'done';

export interface PassageStat {
  ref: PassageRef;
  passage?: Passage;
  loaded: boolean;
  count: number;
  learned: number;
  difficult: number;
  percent: number;
  status: PassageStatus;
}

/** "IELTS 21 Academic 2026" -> "IELTS 21 Academic" */
export const shortBook = (name: string) => name.replace(/\s+\d{4}$/, '');

/** Per-passage progress for every passage in the Main tab (words appear as passages load). */
export function usePassageStats() {
  const { index, passages } = useLibrary();
  const { marks } = useProgress();
  return useMemo<PassageStat[]>(() => (index ?? []).map((ref) => {
    const passage = passages[ref.slug];
    const words = passage?.words ?? [];
    const learned = words.filter((w) => marks[w.id] === 'learned').length;
    const difficult = words.filter((w) => marks[w.id] === 'difficult').length;
    const count = words.length;
    return {
      ref, passage, loaded: !!passage, count, learned, difficult,
      percent: count ? Math.round((learned / count) * 100) : 0,
      status: !learned ? 'new' : learned >= count && count ? 'done' : 'progress',
    };
  }), [index, passages, marks]);
}

/** Words of the passages that match; each word is paired with its source ref. */
export const wordsOf = (stats: PassageStat[]): { word: Word; ref: PassageRef }[] =>
  stats.flatMap((s) => (s.passage?.words ?? []).map((word) => ({ word, ref: s.ref })));
