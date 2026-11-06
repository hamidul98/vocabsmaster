import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Button } from '@heroui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useLibrary } from '@/hooks/useLibrary';
import { useFilters } from '@/hooks/useFilters';
import { usePassageStats, shortBook } from '@/hooks/useStats';
import { useProgress } from '@/lib/progress';
import { activeCount, applyFilters } from '@/lib/filters';
import { load, save } from '@/lib/storage';
import FilterBar from '@/components/FilterBar';
import SheetNotices from '@/components/SheetNotices';
import PassageCard from '@/components/PassageCard';
import WordCard from '@/components/WordCard';
import { Empty, Failure, Icon, Loading } from '@/components/ui';

const phone = window.matchMedia('(max-width: 767px)');
/** True on phones: the wide table doesn't fit there, so cards are always used. */
const useIsPhone = () => useSyncExternalStore(
  (cb) => { phone.addEventListener('change', cb); return () => phone.removeEventListener('change', cb); },
  () => phone.matches,
);

export default function LibraryPage() {
  const { index, indexError, loadAll, loadingAll, reload } = useLibrary();
  const { marks, learnedAt } = useProgress();
  const stats = usePassageStats();
  const { filters, set, clear } = useFilters('library');
  const [savedView, setView] = useState<'grid' | 'table'>(() => load('libraryView', 'grid'));
  const [limit, setLimit] = useState(24);
  const isPhone = useIsPhone();
  const view = isPhone ? 'grid' : savedView;
  const navigate = useNavigate();
  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => setLimit(24), [filters]);

  const applied = useMemo(() => applyFilters(stats, filters, marks, learnedAt), [stats, filters, marks, learnedAt]);
  const wordTotal = applied.passages.reduce((n, s) => n + s.count, 0);

  // group by book -> test (only when sorted by book order; other sorts are a flat list)
  const groups = useMemo(() => {
    if (filters.sort !== 'book') return [{ key: 'all', book: '', test: 0, items: applied.passages }];
    const out: { key: string; book: string; test: number; items: typeof applied.passages }[] = [];
    applied.passages.forEach((s) => {
      const key = `${s.ref.bookNumber}:${s.ref.testNumber}`;
      const g = out.find((x) => x.key === key);
      if (g) g.items.push(s);
      else out.push({ key, book: shortBook(s.ref.bookName), test: s.ref.testNumber, items: [s] });
    });
    return out;
  }, [applied, filters.sort]);

  if (indexError) return <Failure message={indexError.message} retry={reload}/>;
  if (!index) return <Loading/>;

  return <div className="library-page">
    <div className="page-title"><h1>Library</h1><p>Find any passage by book, test or passage.</p></div>
    <SheetNotices/>
    <div className="sticky-filters"><FilterBar index={index} value={filters} onChange={set} summary={applied.wordMode ? `${applied.words.length} words · ${applied.passages.length} passages` : `${applied.passages.length} passages · ${wordTotal} words`}/></div>

    <div className="result-bar hide-on-phone">
      <strong>{applied.wordMode ? `${applied.words.length} words · ${applied.passages.length} passages` : `${applied.passages.length} passages · ${wordTotal} words`}</strong>
      {loadingAll && <span className="muted" role="status">Loading words…</span>}
      {!isPhone && <div className="view-toggle" role="group" aria-label="View">
        <Button isIconOnly size="sm" variant={view === 'grid' ? 'primary' : 'secondary'} aria-label="Grid view" aria-pressed={view === 'grid'} onPress={() => { setView('grid'); save('libraryView', 'grid'); }}><Icon name="grid" size={18}/></Button>
        <Button isIconOnly size="sm" variant={view === 'table' ? 'primary' : 'secondary'} aria-label="Table view" aria-pressed={view === 'table'} onPress={() => { setView('table'); save('libraryView', 'table'); }}><Icon name="table" size={18}/></Button>
      </div>}
    </div>

    {applied.wordMode ? (
      applied.words.length ? <>
        <div className="word-grid">{applied.words.slice(0, limit).map(({ word, ref }) => <WordCard key={word.id} word={word}
          source={<Link to={`/${ref.slug}/list`}>{ref.bookNumber} · T{ref.testNumber} · P{ref.passageNumber}</Link>}/>)}</div>
        {applied.words.length > limit && <div className="load-more"><Button variant="secondary" onPress={() => setLimit((n) => n + 24)}>Show more words ({applied.words.length - limit} left)</Button></div>}
      </> : loadingAll ? <Loading/> : <Empty title="No matching words" action={<Button onPress={clear}>Clear filters</Button>}>Try changing the Words filter or the passages selected.</Empty>
    ) : !applied.passages.length ? (
      <Empty title={activeCount(filters) ? 'No passages match' : 'No passages yet'} action={activeCount(filters) ? <Button onPress={clear}>Clear all filters</Button> : undefined}>
        {activeCount(filters) ? 'Try removing a filter.' : 'Add a row to the Main tab of your Google Sheet.'}</Empty>
    ) : view === 'grid' ? groups.map((g) => <section key={g.key} className="lib-group">
        {g.book && <h2 className="lib-book">{g.book} <span>Test {g.test}</span></h2>}
        <div className="passage-grid">{g.items.map((s) => <PassageCard key={s.ref.slug} stat={s}/>)}</div>
      </section>) : (
      <div className="table-wrap"><table className="lib-table">
        <thead><tr><th>Book</th><th>Test</th><th>Passage</th><th>Words</th><th>Learned</th><th>Difficult</th><th>Progress</th><th><span className="sr-only">Open</span></th></tr></thead>
        <tbody>{applied.passages.map((s) => <tr key={s.ref.slug} onClick={() => navigate(`/${s.ref.slug}/list`)}>
          <td>{shortBook(s.ref.bookName)}</td><td>{s.ref.testNumber}</td><td>{s.ref.passageNumber}</td><td>{s.count || '…'}</td><td>{s.learned}</td><td>{s.difficult}</td>
          <td><div className="tbl-progress"><div style={{ width: `${s.percent}%` }}/></div> {s.percent}%</td>
          <td><Button isIconOnly size="sm" aria-label={`Open passage ${s.ref.passageNumber}`} onPress={() => navigate(`/${s.ref.slug}/list`)}><Icon name="play" size={18} filled/></Button></td></tr>)}</tbody>
      </table></div>
    )}
  </div>;
}
