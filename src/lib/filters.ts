import type { PassageStat } from '@/hooks/useStats';
import { shortBook } from '@/hooks/useStats';
import type { PassageRef, Word } from './types';

export type StatusF = 'all' | 'new' | 'progress' | 'done';
export type WordsF = 'all' | 'learned' | 'difficult' | 'new';
export type SortF = 'book' | 'recent' | 'least' | 'difficult';

export interface Filters {
  /** book numbers as strings, empty = all */
  books: string[];
  test: string;
  passage: string;
  status: StatusF;
  words: WordsF;
  sort: SortF;
  q: string;
}

export const EMPTY_FILTERS: Filters = { books: [], test: '', passage: '', status: 'all', words: 'all', sort: 'book', q: '' };

export const fromParams = (sp: URLSearchParams): Filters => ({
  books: sp.get('book')?.split(',').filter(Boolean) ?? [],
  test: sp.get('test') ?? '',
  passage: sp.get('p') ?? '',
  status: (sp.get('status') as StatusF) || 'all',
  words: (sp.get('words') as WordsF) || 'all',
  sort: (sp.get('sort') as SortF) || 'book',
  q: sp.get('q') ?? '',
});

/** Only non-default values go in the URL. */
export const toParams = (f: Filters): Record<string, string> => {
  const o: Record<string, string> = {};
  if (f.books.length) o.book = f.books.join(',');
  if (f.test) o.test = f.test;
  if (f.passage) o.p = f.passage;
  if (f.status !== 'all') o.status = f.status;
  if (f.words !== 'all') o.words = f.words;
  if (f.sort !== 'book') o.sort = f.sort;
  if (f.q) o.q = f.q;
  return o;
};

/** Number of active filters (sort doesn't count). */
export const activeCount = (f: Filters) =>
  (f.books.length ? 1 : 0) + (f.test ? 1 : 0) + (f.passage ? 1 : 0) + (f.status !== 'all' ? 1 : 0) + (f.words !== 'all' ? 1 : 0) + (f.q ? 1 : 0);

const wordText = (w: Word) => [w.word, ...w.fields.map((x) => x.value)].join(' ').toLocaleLowerCase();

/** Dependent options: tests of the selected books, passages of those tests. */
export function optionsFor(index: PassageRef[], f: Filters) {
  const inBooks = index.filter((r) => !f.books.length || f.books.includes(String(r.bookNumber)));
  const tests = [...new Set(inBooks.map((r) => r.testNumber))].sort((a, b) => a - b);
  const inTest = inBooks.filter((r) => !f.test || String(r.testNumber) === f.test);
  const passages = [...new Set(inTest.map((r) => r.passageNumber))].sort((a, b) => a - b);
  return { tests, passages };
}

export interface Applied {
  passages: PassageStat[];
  /** true when the Words filter (learned / difficult / new) is on: show word cards instead of passage cards */
  wordMode: boolean;
  words: { word: Word; ref: PassageRef }[];
}

export function applyFilters(
  stats: PassageStat[], f: Filters, marks: Record<string, string>, learnedAt: Record<string, number>,
): Applied {
  const q = f.q.trim().toLocaleLowerCase();
  const wordMode = f.words !== 'all';
  let passages = stats.filter((s) => {
    const r = s.ref;
    if (f.books.length && !f.books.includes(String(r.bookNumber))) return false;
    if (f.test && String(r.testNumber) !== f.test) return false;
    if (f.passage && String(r.passageNumber) !== f.passage) return false;
    if (f.status !== 'all' && s.status !== f.status) return false;
    if (q && !wordMode) {
      const name = `${shortBook(r.bookName)} test ${r.testNumber} passage ${r.passageNumber}`.toLocaleLowerCase();
      if (!name.includes(q) && !(s.passage?.words.some((w) => wordText(w).includes(q)))) return false;
    }
    return true;
  });

  const recent = (s: PassageStat) => Math.max(0, ...(s.passage?.words.map((w) => learnedAt[w.id] ?? 0) ?? []));
  const sorters: Record<SortF, (a: PassageStat, b: PassageStat) => number> = {
    book: () => 0,
    recent: (a, b) => recent(b) - recent(a),
    least: (a, b) => a.percent - b.percent,
    difficult: (a, b) => b.difficult - a.difficult,
  };
  passages = [...passages].sort(sorters[f.sort]); // stable: ties keep Main-tab order

  const words = wordMode
    ? passages.flatMap((s) => (s.passage?.words ?? []).filter((w) => {
        const m = marks[w.id];
        if (f.words === 'learned' && m !== 'learned') return false;
        if (f.words === 'difficult' && m !== 'difficult') return false;
        if (f.words === 'new' && m) return false;
        return !q || wordText(w).includes(q);
      }).map((word) => ({ word, ref: s.ref })))
    : [];
  return { passages, wordMode, words };
}
