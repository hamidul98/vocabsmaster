import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { useLibrary } from '@/hooks/useLibrary';
import { useFilters } from '@/hooks/useFilters';
import { usePassageStats } from '@/hooks/useStats';
import { useProgress } from '@/lib/progress';
import { applyFilters, EMPTY_FILTERS } from '@/lib/filters';
import FilterBar from '@/components/FilterBar';
import { Study } from '@/components/Study';
import { Empty, Failure, Loading } from '@/components/ui';

/** Build a flashcard deck or quiz from any combination, e.g. "Book 21 + Test 3 + only Difficult words". */
export default function PracticePage() {
  const { mode = 'flashcards' } = useParams();
  const { index, indexError, loadAll, loadingAll, reload } = useLibrary();
  const { marks, learnedAt } = useProgress();
  const stats = usePassageStats();
  const { filters, set, clear } = useFilters('practice', { words: 'all' });
  useEffect(() => { loadAll(); }, [loadAll]);

  const deck = useMemo(() => {
    // Practice always works on words: with Words = All use every word of the matching passages
    const a = applyFilters(stats, { ...filters, q: '' }, marks, learnedAt);
    if (a.wordMode) return a.words.map((x) => x.word);
    return a.passages.flatMap((s) => s.passage?.words ?? []);
  }, [stats, filters, marks, learnedAt]);

  if (indexError) return <Failure message={indexError.message} retry={reload} />;
  if (!index) return <Loading />;
  return <div className="practice-page">
    <div className="page-title"><h1>Practice</h1><p>Pick what to practise, then study it as flashcards or a quiz.</p></div>
    <div className="sticky-filters"><FilterBar index={index} value={{ ...EMPTY_FILTERS, ...filters }} onChange={set} fields={['book', 'test', 'passage', 'words']} /></div>
    <div className="result-bar"><strong>{deck.length} words in this deck</strong>{loadingAll && <span className="muted" role="status">Loading words…</span>}</div>
    {deck.length ? <Study key={JSON.stringify(filters)} words={deck} mode={mode} base="/practice" />
      : loadingAll ? <Loading /> : <Empty title="Nothing to practise yet" action={<Button onPress={clear}>Clear filters</Button>}>No words match these filters. Try a different book, test or Words filter.</Empty>}
  </div>;
}
