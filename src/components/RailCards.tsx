import { useMemo, useState } from 'react';
import { Button, Card, Modal, useOverlayState } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { useProgress, XP, XP_PER_LEVEL } from '@/lib/progress';
import { usePassageStats, shortBook, type PassageStat } from '@/hooks/useStats';
import { useLibrary } from '@/hooks/useLibrary';
import { Icon, Meter, FilterSelect } from './ui';
import { Ring } from './art';

export function DailyGoalCard() {
  const { todayCount, goal, setGoal, streak, week } = useProgress();
  const edit = useOverlayState();
  const done = todayCount >= goal;
  return <Card className="goal-card rail-goal">
    <div className="rail-head"><h2>Your Daily Goal</h2><Button size="sm" variant="ghost" onPress={edit.open}>Edit <Icon name="chevron" size={16}/></Button></div>
    <div className="goal-body">
      <Ring value={goal ? todayCount / goal : 0} size={132} stroke={12} label={`${todayCount} of ${goal} words today`}>
        <Icon name="flame" size={26} filled/><strong>{todayCount} / {goal}</strong><small>words · Today</small>
      </Ring>
      <div className="goal-text">
        <strong>{done ? 'Goal reached!' : 'Keep going!'}</strong>
        <p>{done ? 'Great job today.' : `${goal - todayCount} more to hit your goal.`}</p>
        <p>You're on a <b>{streak} day</b> streak <Icon name="flame" size={16} filled/></p>
      </div>
    </div>
    <ol className="week-dots" aria-label="This week">{week.map((d) => <li key={d.key} className={`${d.met ? 'met' : ''} ${d.today ? 'today' : ''}`}>
      <span className="dot" aria-label={d.met ? `${d.label}: goal met` : `${d.label}: goal not met`}>{d.met && <Icon name="check" size={16} filled/>}</span><small>{d.label}</small></li>)}</ol>
    <Modal state={edit}><Modal.Backdrop><Modal.Container><Modal.Dialog>
      <Modal.Header><Modal.Heading>Daily goal</Modal.Heading></Modal.Header>
      <Modal.Body><p className="muted">How many words do you want to review each day?</p>
        <div className="goal-options">{[10, 20, 30, 50].map((n) => <Button key={n} variant={goal === n ? 'primary' : 'secondary'} className="pill" onPress={() => { setGoal(n); edit.close(); }}>{n} words</Button>)}</div></Modal.Body>
    </Modal.Dialog></Modal.Container></Modal.Backdrop></Modal>
  </Card>;
}

type Period = 'week' | 'all' | 'hard';
export function TopBooksCard() {
  const stats = usePassageStats();
  const { passages } = useLibrary();
  const { learnedAt, wrong, book } = useProgress();
  const [period, setPeriod] = useState<Period>('week');
  const navigate = useNavigate();
  const rows = useMemo(() => {
    if (period === 'hard') {
      const byId = new Map(Object.values(passages).flatMap((p) => p.words.map((w) => [w.id, w] as const)));
      return Object.entries(wrong).filter(([id]) => byId.has(id)).sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([id, n]) => ({ key: id, label: byId.get(id)!.word, value: `${n} error${n > 1 ? 's' : ''}`, book: '' }));
    }
    const since = Date.now() - 7 * 864e5;
    return stats.map((s) => ({
      s, n: (s.passage?.words ?? []).filter((w) => { const t = learnedAt[w.id]; return t && (period === 'all' || t >= since); }).length,
    })).filter((r) => r.n > 0).sort((a, b) => b.n - a.n).slice(0, 5)
      .map(({ s, n }) => ({ key: s.ref.slug, label: `${shortBook(s.ref.bookName)} · T${s.ref.testNumber} · P${s.ref.passageNumber}`, value: `${n} words`, book: String(s.ref.bookNumber), slug: s.ref.slug }));
  }, [period, stats, passages, learnedAt, wrong]);
  const medal = ['gold', 'silver', 'bronze'];
  return <Card className="top-card">
    <div className="rail-head"><h2>Top Books</h2>
      <FilterSelect label="Period" value={period} onChange={(v) => setPeriod(v as Period)} options={[{ id: 'week', label: 'This Week' }, { id: 'all', label: 'All Time' }, { id: 'hard', label: 'Hardest Words' }]}/></div>
    {rows.length ? <ol className="rank-list">{rows.map((r, i) => <li key={r.key} className={r.book && r.book === book ? 'me' : ''}>
      <button type="button" className="rank-row" onClick={() => 'slug' in r && r.slug ? navigate(`/${r.slug}/list`) : undefined}>
        <span className={`rank ${medal[i] ?? ''}`}>{i + 1}</span><span className="rank-label">{r.label}</span><strong>{r.value}</strong>
      </button></li>)}</ol>
      : <p className="muted rail-empty">{period === 'hard' ? 'Answer quiz questions — the words you miss most will show up here.' : 'Learn some words to see your ranking.'}</p>}
  </Card>;
}

/** Closest upcoming milestone: next level, or finishing the nearest-to-complete test. */
export function MilestoneCard({ current }: { current?: PassageStat }) {
  const stats = usePassageStats();
  const { xpIntoLevel, level } = useProgress();
  const navigate = useNavigate();
  const m = useMemo(() => {
    const levelFrac = xpIntoLevel / XP_PER_LEVEL;
    const wordsLeft = Math.ceil((XP_PER_LEVEL - xpIntoLevel) / XP.learned);
    let best = { frac: levelFrac, text: <>Learn <b>{wordsLeft} more words</b> to reach <b>Level {level + 1}</b>!</>, bar: xpIntoLevel, max: XP_PER_LEVEL, unit: ' XP', slug: current?.ref.slug };
    const tests = new Map<string, PassageStat[]>();
    stats.forEach((s) => { const k = `${s.ref.bookNumber}:${s.ref.testNumber}`; tests.set(k, [...(tests.get(k) ?? []), s]); });
    tests.forEach((list) => {
      const done = list.filter((s) => s.status === 'done').length;
      if (done === list.length || !list.every((s) => s.loaded)) return;
      const frac = done / list.length;
      if (frac > best.frac) best = { frac, text: <>Finish <b>{list.length - done} more passage{list.length - done > 1 ? 's' : ''}</b> to complete <b>Test {list[0].ref.testNumber}</b>!</>, bar: done, max: list.length, unit: '', slug: list.find((s) => s.status !== 'done')?.ref.slug };
    });
    return best;
  }, [stats, xpIntoLevel, level, current]);
  return <Card className="milestone-card"><div className="ms-gift"><Icon name="gift" size={44} filled/><span className="spark"><Icon name="sparkle" size={16} filled/></span></div>
    <div className="ms-body"><p>{m.text}</p>
      <div className="ms-bar"><Meter value={m.max ? (m.bar / m.max) * 100 : 0} label="Milestone progress"/><span>{m.bar} / {m.max}{m.unit}</span></div></div>
    <Button isIconOnly variant="secondary" className="round" aria-label="Open passage" isDisabled={!m.slug} onPress={() => m.slug && navigate(`/${m.slug}/list`)}><Icon name="chevron"/></Button>
  </Card>;
}
