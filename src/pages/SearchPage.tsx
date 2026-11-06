import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { useLibrary } from '@/hooks/useLibrary';
import { usePassageStats } from '@/hooks/useStats';
import { useFilters } from '@/hooks/useFilters';
import { useProgress } from '@/lib/progress';
import { EMPTY_FILTERS } from '@/lib/filters';
import FilterBar from '@/components/FilterBar';
import WordCard from '@/components/WordCard';
import { Empty, Failure, Icon, Loading } from '@/components/ui';

const text = (w: { word: string; fields: { value: string }[] }) => [w.word, ...w.fields.map((f) => f.value)].join(' ').toLocaleLowerCase();

/** Global search across every passage. `?q=` comes from the top-bar search; the same filter bar narrows results. */
export default function SearchPage() {
  const { index, indexError, errors, loadingAll, loadAll, reload } = useLibrary();
  const { marks } = useProgress();
  const stats = usePassageStats();
  const [sp] = useSearchParams();
  const { filters, set, patch, clear } = useFilters('search');
  const [limit, setLimit] = useState(24);
  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => setLimit(24), [filters]);
  const q = filters.q.trim().toLocaleLowerCase();

  const results = useMemo(() => stats.flatMap((s) => {
    const r = s.ref;
    if (filters.books.length && !filters.books.includes(String(r.bookNumber))) return [];
    if (filters.test && String(r.testNumber) !== filters.test) return [];
    return (s.passage?.words ?? [])
      .filter((w) => (!q || text(w).includes(q))
        && (filters.words === 'all' || (filters.words === 'new' ? !marks[w.id] : marks[w.id] === filters.words)))
      .map((word) => ({ word, ref: r }));
  }), [stats, filters, q, marks]);

  if (indexError) return <Failure message={indexError.message} retry={reload} />;
  if (!index) return <Loading />;
  return <div className="search-page">
    <div className="page-title"><h1>Search</h1><p>Search in English or Bangla across every passage.</p></div>
    <div className="sticky-filters"><FilterBar index={index} value={{ ...EMPTY_FILTERS, ...filters }} onChange={set} fields={['q', 'book', 'test', 'words']} placeholder="Search a word, meaning or example…" /></div>
    <div className="result-bar"><strong>{q || filters.words !== 'all' ? `${results.length} matching words` : 'Type to search your vocabulary'}</strong>{loadingAll && <span className="muted" role="status">Loading passages…</span>}</div>
    {Object.keys(errors).length > 0 && <p className="notice">Some passages couldn’t load, so results may be incomplete. <Button size="sm" onPress={reload}>Retry</Button></p>}
    {!q && filters.words === 'all' && !sp.get('q')
      ? <Empty title="Curiosity starts here">Type a word or its Bangla meaning to find it in your library.</Empty>
      : results.length ? <>
        <div className="word-grid">{results.slice(0, limit).map(({ word, ref }) => <WordCard key={word.id} word={word} source={<Link to={`/${ref.slug}/list`}>IELTS {ref.bookNumber} · Test {ref.testNumber} · Passage {ref.passageNumber} <Icon name="external" size={14}/></Link>} />)}</div>
        {results.length > limit && <div className="load-more"><Button variant="secondary" onPress={() => setLimit((n) => n + 24)}>Show more results</Button></div>}
      </> : loadingAll ? <Loading /> : <Empty title="No matching words" action={<Button onPress={() => { clear(); patch({ q: '' }); }}>Clear filters</Button>}>Try another spelling or search in Bangla.</Empty>}
  </div>;
}
