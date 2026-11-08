import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@heroui/react';
import { useLibrary } from '@/hooks/useLibrary';
import { usePassageStats, shortBook, type PassageStat } from '@/hooks/useStats';
import { dayKey, useProgress, XP_PER_LEVEL } from '@/lib/progress';
import { BarChart, Donut, LineChart, StackedRows } from '@/components/charts';
import { Failure, Icon, Loading } from '@/components/ui';

const RANGES = [7, 30, 90] as const;
const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const daysBack = (n: number) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - n); return d; };

type SortKey = 'name' | 'count' | 'learned' | 'difficult' | 'progress';
const GREEN = 'var(--c-green)', ORANGE = 'var(--c-orange)', BLUE = 'var(--accent)', GREY = 'var(--track)';
const SOFT = 'color-mix(in srgb, var(--accent) 45%, transparent)';

const sortValue = (s: PassageStat, key: SortKey) =>
  key === 'name' ? s.ref.bookNumber * 1000 + s.ref.testNumber * 10 + s.ref.passageNumber : s[key];

export default function AnalyticsPage() {
  const { index, indexError, passages, loadAll, reload } = useLibrary();
  const stats = usePassageStats();
  const { daily, goal, streak, xp, level, xpIntoLevel, learnedAt, marks, wrong } = useProgress();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [bookFilter, setBookFilter] = useState('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 });
  useEffect(() => { loadAll(); }, [loadAll]);

  // ---- totals ----
  const total = stats.reduce((n, s) => n + s.count, 0);
  const learned = stats.reduce((n, s) => n + s.learned, 0);
  const difficult = stats.reduce((n, s) => n + s.difficult, 0);
  const working = Math.max(0, stats.reduce((n, s) => n + s.engaged, 0) - difficult);
  const untouched = Math.max(0, total - learned - difficult - working);

  // ---- time series ----
  const series = useMemo(() => Array.from({ length: range }, (_, i) => { const d = daysBack(range - 1 - i); return { d, key: dayKey(d), n: daily[dayKey(d)] ?? 0 }; }), [daily, range]);
  const reviewed = series.map((x) => ({ label: fmt(x.d), value: x.n }));

  const cumulative = useMemo(() => {
    const learnedNow = Object.keys(marks).filter((id) => marks[id] === 'learned');
    const stamps = learnedNow.map((id) => learnedAt[id]).filter((t): t is number => typeof t === 'number');
    const undated = learnedNow.length - stamps.length; // learned before dates were recorded
    return series.map((x) => {
      const end = new Date(x.d); end.setHours(23, 59, 59, 999);
      return { label: fmt(x.d), value: undated + stamps.filter((t) => t <= end.getTime()).length };
    });
  }, [series, marks, learnedAt]);

  const insights = useMemo(() => {
    const sum = series.reduce((n, x) => n + x.n, 0);
    const active = series.filter((x) => x.n > 0).length;
    const best = series.reduce((b, x) => (x.n > b.n ? x : b), series[0]);
    const week = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => daily[dayKey(daysBack(from + i))] ?? 0).reduce((a, b) => a + b, 0);
    return { avg: Math.round((sum / range) * 10) / 10, active, best, thisW: week(0, 7), lastW: week(7, 14), goalDays: series.filter((x) => x.n >= goal).length };
  }, [series, daily, range, goal]);

  // ---- books ----
  const books = useMemo(() => {
    const m = new Map<string, { name: string; total: number; learned: number; working: number }>();
    stats.forEach((s) => {
      const k = String(s.ref.bookNumber);
      const b = m.get(k) ?? { name: shortBook(s.ref.bookName), total: 0, learned: 0, working: 0 };
      b.total += s.count; b.learned += s.learned; b.working += s.engaged; m.set(k, b);
    });
    return [...m.entries()].map(([id, b]) => ({ id, ...b }));
  }, [stats]);

  // ---- passage table ----
  const rows = useMemo(() => {
    const list = stats.filter((s) => bookFilter === 'all' || String(s.ref.bookNumber) === bookFilter);
    return [...list].sort((a, b) => (sortValue(a, sort.key) - sortValue(b, sort.key)) * sort.dir);
  }, [stats, bookFilter, sort]);
  const head = (key: SortKey, text: string) => <th aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
    <button type="button" className="th-btn" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }))}>
      {text}{sort.key === key && <Icon name={sort.dir === 1 ? 'north' : 'south'} size={14}/>}</button></th>;

  // ---- most missed words ----
  const missed = useMemo(() => {
    const byId = new Map<string, { word: string; slug: string; where: string }>();
    Object.values(passages).forEach((p) => p.words.forEach((w) => byId.set(w.id, { word: w.word, slug: p.ref.slug, where: `${p.ref.bookNumber} · T${p.ref.testNumber} · P${p.ref.passageNumber}` })));
    return Object.entries(wrong).sort((a, b) => b[1] - a[1]).slice(0, 8).flatMap(([id, n]) => { const w = byId.get(id); return w ? [{ id, n, ...w }] : []; });
  }, [wrong, passages]);

  if (indexError) return <Failure message={indexError.message} retry={reload}/>;
  if (!index) return <Loading/>;

  const tiles = [
    { icon: 'book', tone: 'purple', v: total.toLocaleString(), l: 'Total words' },
    { icon: 'check', tone: 'green', v: learned.toLocaleString(), l: `Learned${total ? ` · ${Math.round((learned / total) * 100)}%` : ''}` },
    { icon: 'star', tone: 'orange', v: difficult.toLocaleString(), l: 'Difficult' },
    { icon: 'flame', tone: 'coral', v: streak, l: 'Day streak' },
    { icon: 'gem', tone: 'blue', v: xp.toLocaleString(), l: `XP · Level ${level}` },
  ];
  const delta = insights.thisW - insights.lastW;
  const kpis = [
    { v: insights.avg, l: 'Avg words / day' },
    { v: `${insights.active} / ${range}`, l: 'Active days' },
    { v: insights.goalDays, l: `Days goal met (${goal})` },
    { v: insights.best?.n ? insights.best.n : '—', l: insights.best?.n ? `Best day · ${fmt(insights.best.d)}` : 'Best day' },
    { v: insights.thisW, l: delta === 0 ? 'This week' : `This week · ${delta > 0 ? '+' : ''}${delta} vs last` },
  ];

  return <div className="analytics-page">
    <div className="page-title analytics-head">
      <div><h1>Analytics</h1><p>Level {level} · {xpIntoLevel} / {XP_PER_LEVEL} XP to Level {level + 1}</p></div>
      <div className="range-toggle" role="group" aria-label="Time range">{RANGES.map((r) => <button key={r} type="button" aria-pressed={range === r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r}d</button>)}</div>
    </div>

    <div className="stat-row">{tiles.map((t) => <div key={t.l} className={`mode-tile static ${t.tone}`}><span className="mode-icon"><Icon name={t.icon} size={24} filled/></span><span className="mode-text"><strong>{t.v}</strong><small>{t.l}</small></span></div>)}</div>

    <div className="kpi-row">{kpis.map((k) => <div key={k.l} className="kpi"><strong>{k.v}</strong><small>{k.l}</small></div>)}</div>

    <div className="two-col even">
      <Card className="chart-card"><h2>Words learned over time</h2><LineChart points={cumulative} color={GREEN} label={`Line chart of total learned words over the last ${range} days`}/></Card>
      <Card className="chart-card"><h2>Words reviewed per day</h2><BarChart points={reviewed} goal={goal} label={`Bar chart of words reviewed per day over the last ${range} days`}/></Card>
    </div>

    <div className="two-col even">
      <Card className="chart-card"><h2>Vocabulary status</h2>
        <Donut label="Share of words by status" center={total ? `${Math.round((learned / total) * 100)}%` : '—'} slices={[
          { label: 'Learned', value: learned, color: GREEN }, { label: 'Difficult', value: difficult, color: ORANGE },
          { label: 'Worked on', value: working, color: BLUE }, { label: 'Not started', value: untouched, color: GREY }]}/>
      </Card>
      <Card className="chart-card"><h2>Books</h2>
        {books.length ? <>
          <StackedRows rows={books.map((b) => ({ name: b.name, total: b.total, parts: [
            { label: 'learned', value: b.learned, color: GREEN }, { label: 'worked on', value: Math.max(0, b.working), color: SOFT }] }))}/>
          <div className="legend-inline"><span><i style={{ background: GREEN }}/>Learned</span><span><i style={{ background: SOFT }}/>Worked on</span></div>
        </> : <p className="muted">Books appear once your sheet loads.</p>}
      </Card>
    </div>

    <Card className="chart-card">
      <div className="card-head"><h2>Passages</h2>
        <select className="mini-select" aria-label="Filter by book" value={bookFilter} onChange={(e) => setBookFilter(e.target.value)}>
          <option value="all">All books</option>{books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
      <div className="table-wrap flat"><table className="lib-table">
        <thead><tr>{head('name', 'Passage')}{head('count', 'Words')}{head('learned', 'Learned')}{head('difficult', 'Difficult')}{head('progress', 'Progress')}<th><span className="sr-only">Open</span></th></tr></thead>
        <tbody>{rows.map((s) => <tr key={s.ref.slug}>
          <td>{shortBook(s.ref.bookName)} · T{s.ref.testNumber} · P{s.ref.passageNumber}</td><td>{s.count || '…'}</td><td>{s.learned}</td><td>{s.difficult}</td>
          <td><div className="tbl-progress"><div style={{ width: `${s.progress}%` }}/></div>{s.progress}%</td>
          <td><Link className="tbl-link" to={`/${s.ref.slug}/list`}>{s.status === 'new' ? 'Start' : s.status === 'done' ? 'Review' : 'Resume'}</Link></td></tr>)}</tbody>
      </table></div>
    </Card>

    <Card className="chart-card"><h2>Most missed in quizzes</h2>
      {missed.length ? <div className="table-wrap flat"><table className="lib-table">
        <thead><tr><th>Word</th><th>Passage</th><th>Wrong answers</th></tr></thead>
        <tbody>{missed.map((m) => <tr key={m.id}><td><strong>{m.word}</strong></td><td><Link className="tbl-link" to={`/${m.slug}/list`}>{m.where}</Link></td><td>{m.n}</td></tr>)}</tbody></table></div>
        : <p className="muted">No wrong quiz answers yet. Words you miss will show up here.</p>}
    </Card>
  </div>;
}
