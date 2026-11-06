import { useEffect, useMemo, useRef } from 'react';
import { Button, Card } from '@heroui/react';
import { Link, useNavigate } from 'react-router-dom';
import { useLibrary } from '@/hooks/useLibrary';
import { usePassageStats, shortBook } from '@/hooks/useStats';
import { useProgress } from '@/lib/progress';
import { Failure, FilterSelect, HomeSkeleton, Icon } from '@/components/ui';
import { BookThumb, LondonScene, Mascot } from '@/components/art';
import PassageCard from '@/components/PassageCard';
import SheetNotices from '@/components/SheetNotices';
import { DailyGoalCard, MilestoneCard, TopBooksCard } from '@/components/RailCards';

const LINES = [
  'One passage closer to your Band 8!',
  'A few new words today go a long way.',
  'Small steps. Big IELTS score.',
  'Your next band starts with one word.',
];
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,'; };

export default function Home() {
  const { index, indexError, loadAll, reload } = useLibrary();
  const { name, book, setBook, lastStudied } = useProgress();
  const stats = usePassageStats();
  const navigate = useNavigate();
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => { loadAll(); }, [loadAll]);

  const books = useMemo(() => [...new Map((index ?? []).map((r) => [String(r.bookNumber), r.bookName])).entries()], [index]);
  const inBook = stats.filter((s) => !book || String(s.ref.bookNumber) === book);
  // Continue: last studied passage → any started-but-unfinished → first passage
  const cur = stats.find((s) => s.ref.slug === lastStudied?.slug) ?? inBook.find((s) => s.status === 'progress') ?? inBook[0] ?? stats[0];
  const starred = stats.reduce((n, s) => n + s.difficult, 0);
  const subtitle = LINES[new Date().getDate() % LINES.length];

  if (indexError) return <Failure message={indexError.message} retry={reload}/>;
  if (!index) return <HomeSkeleton/>;

  const modes = [
    { tone: 'purple', icon: 'book', title: 'Word List', sub: `${cur?.count ?? 0} words`, to: cur && `/${cur.ref.slug}/list` },
    { tone: 'coral', icon: 'cards', title: 'Flashcards', sub: `${cur?.count ?? 0} cards`, to: cur && `/${cur.ref.slug}/flashcards` },
    { tone: 'green', icon: 'quiz', title: 'Quiz', sub: `${cur?.count ?? 0} questions`, to: cur && `/${cur.ref.slug}/quiz` },
    { tone: 'orange', icon: 'star', title: 'Difficult', sub: `${starred} starred`, to: '/difficult' },
  ];

  return <div className="home-grid">
    <div className="home-col">
      <section className="hero-card">
        <div className="hero-copy">
          <h1>{greeting()}<br/><span>{name}!</span> <span className="wave"><Icon name="wave" size={40} filled/></span></h1>
          <p>{subtitle}</p>
          <Button className="pill cta" onPress={() => navigate(lastStudied?.path ?? (cur ? `/${cur.ref.slug}/list` : '/library'))}>Continue Learning <Icon name="arrow" size={20}/></Button>
        </div>
        <div className="hero-art"><LondonScene/><div className="hero-mascot"><Mascot size={170}/></div></div>
        <div className="hero-book"><Icon name="book" size={20} filled/>
          <FilterSelect label="Book" value={book || 'all'} onChange={(v) => setBook(v === 'all' ? '' : v)}
            options={[{ id: 'all', label: 'All books' }, ...books.map(([id, n]) => ({ id, label: shortBook(n) }))]}/></div>
      </section>

      <SheetNotices/>

      <section className="block b-cont">
        <div className="block-head"><h2>Continue Learning</h2><Link to="/library">See All</Link></div>
        {cur ? <PassageCard stat={cur} wide/> : <Card className="empty"><Mascot size={100} mood="sleepy"/><h2>No passages yet</h2><p>Add a row to the Main tab of your Google Sheet.</p></Card>}
      </section>

      <section className="block b-modes">
        <div className="block-head"><h2>Study Modes</h2></div>
        <div className="mode-grid">{modes.map((m) => <button key={m.title} type="button" className={`mode-tile ${m.tone}`} disabled={!m.to} onClick={() => m.to && navigate(m.to)}>
          <span className="mode-icon"><Icon name={m.icon} size={26} filled/></span><span className="mode-text"><strong>{m.title}</strong><small>{m.sub}</small></span><Icon name="arrow" size={20}/></button>)}</div>
      </section>

      <section className="block b-books">
        <div className="block-head"><h2>Your Books</h2><Link to="/library">See All</Link></div>
        <div className="books-wrap"><div className="books-row" ref={row}>{books.map(([id, n]) => {
          const list = stats.filter((s) => String(s.ref.bookNumber) === id);
          const total = list.reduce((a, s) => a + s.count, 0), learned = list.reduce((a, s) => a + s.learned, 0);
          return <Link key={id} to={`/library?book=${id}`} className="book-chip"><BookThumb book={Number(id)} size={44}/><span><strong>{shortBook(n)}</strong><small>{total ? `${learned}/${total} words` : 'Loading…'}</small></span></Link>;
        })}</div>
        <Button isIconOnly variant="outline" className="round" aria-label="Scroll books" onPress={() => row.current?.scrollBy({ left: 240, behavior: 'smooth' })}><Icon name="chevron"/></Button></div>
      </section>
    </div>

    <div className="home-rail">
      <div className="rail-goal-wrap"><DailyGoalCard/></div>
      <div className="rail-ms-wrap"><MilestoneCard current={cur}/></div>
      <div className="rail-top-wrap"><TopBooksCard/></div>
    </div>
  </div>;
}
