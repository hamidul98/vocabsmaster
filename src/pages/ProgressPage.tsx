import { useEffect, useMemo } from 'react';
import { Card } from '@heroui/react';
import { useLibrary } from '@/hooks/useLibrary';
import { usePassageStats, shortBook } from '@/hooks/useStats';
import { dayKey, useProgress, XP_PER_LEVEL } from '@/lib/progress';
import { Failure, Icon, Loading, Meter } from '@/components/ui';

const back = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

export default function ProgressPage() {
  const { index, indexError, loadAll, reload } = useLibrary();
  const stats = usePassageStats();
  const { daily, goal, streak, xp, level, xpIntoLevel } = useProgress();
  useEffect(() => { loadAll(); }, [loadAll]);

  const total = stats.reduce((n, s) => n + s.count, 0);
  const learned = stats.reduce((n, s) => n + s.learned, 0);
  const difficult = stats.reduce((n, s) => n + s.difficult, 0);

  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => { const d = back(29 - i); return { d, key: dayKey(d), n: daily[dayKey(d)] ?? 0 }; }), [daily]);
  const max = Math.max(goal, ...days.map((x) => x.n), 1);

  // GitHub-style calendar: 26 weeks, Sunday-first columns ending on this week
  const weeks = useMemo(() => {
    const today = new Date();
    const start = new Date(today); start.setDate(today.getDate() - today.getDay() - 25 * 7);
    return Array.from({ length: 26 }, (_, w) => Array.from({ length: 7 }, (_, d) => {
      const x = new Date(start); x.setDate(start.getDate() + w * 7 + d);
      return { key: dayKey(x), n: daily[dayKey(x)] ?? 0, future: x > today };
    }));
  }, [daily]);
  const level4 = (n: number) => (n === 0 ? 0 : n < goal * 0.4 ? 1 : n < goal * 0.8 ? 2 : n < goal ? 3 : 4);

  const books = useMemo(() => {
    const m = new Map<string, { name: string; total: number; learned: number }>();
    stats.forEach((s) => {
      const k = String(s.ref.bookNumber);
      const b = m.get(k) ?? { name: shortBook(s.ref.bookName), total: 0, learned: 0 };
      b.total += s.count; b.learned += s.learned; m.set(k, b);
    });
    return [...m.values()];
  }, [stats]);

  if (indexError) return <Failure message={indexError.message} retry={reload} />;
  if (!index) return <Loading />;
  const tiles = [
    { icon: 'book', tone: 'purple', v: total.toLocaleString(), l: 'Total words' },
    { icon: 'check', tone: 'green', v: learned.toLocaleString(), l: 'Learned' },
    { icon: 'star', tone: 'orange', v: difficult.toLocaleString(), l: 'Difficult' },
    { icon: 'flame', tone: 'coral', v: streak, l: 'Day streak' },
    { icon: 'gem', tone: 'blue', v: xp.toLocaleString(), l: `XP · Level ${level}` },
  ];
  return <div className="progress-page">
    <div className="page-title"><h1>Progress</h1><p>Level {level} · {xpIntoLevel} / {XP_PER_LEVEL} XP to Level {level + 1}</p></div>
    <div className="stat-row">{tiles.map((t) => <div key={t.l} className={`mode-tile static ${t.tone}`}><span className="mode-icon"><Icon name={t.icon} size={24} filled /></span><span className="mode-text"><strong>{t.v}</strong><small>{t.l}</small></span></div>)}</div>

    <Card className="chart-card"><h2>Words reviewed · last 30 days</h2>
      <div className="bars" role="img" aria-label="Bar chart of words reviewed per day for the last 30 days">
        <div className="goal-line" style={{ bottom: `${(goal / max) * 100}%` }}><span>Goal {goal}</span></div>
        {days.map((x) => <div key={x.key} className="bar-col" title={`${x.d.toLocaleDateString()}: ${x.n} words`}><div className={`bar ${x.n >= goal ? 'met' : ''}`} style={{ height: `${(x.n / max) * 100}%` }} /></div>)}
      </div>
      <div className="bar-axis"><span>{days[0].d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span><span>Today</span></div>
    </Card>

    <div className="two-col">
      <Card className="chart-card"><h2>Books</h2>
        {books.length ? books.map((b) => <div key={b.name} className="book-progress"><div><strong>{b.name}</strong><span>{b.learned} / {b.total} words</span></div><Meter value={b.total ? (b.learned / b.total) * 100 : 0} label={`${b.name} progress`} /></div>) : <p className="muted">Books appear once your sheet loads.</p>}
      </Card>
      <Card className="chart-card"><h2>Activity</h2>
        <div className="heatmap" role="img" aria-label="Calendar heatmap of daily activity">{weeks.map((w, i) => <div key={i} className="heat-week">{w.map((c) => <i key={c.key} className={`heat l${c.future ? 'f' : level4(c.n)}`} title={`${c.key}: ${c.n} words`} />)}</div>)}</div>
        <div className="heat-legend"><span>Less</span>{[0, 1, 2, 3, 4].map((l) => <i key={l} className={`heat l${l}`} />)}<span>More</span></div>
      </Card>
    </div>
  </div>;
}
