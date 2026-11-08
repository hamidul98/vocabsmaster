import { Button, Card, Chip } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { shortBook, type PassageStat } from '@/hooks/useStats';
import { BookThumb } from './art';
import type { CoverVariant } from './BookCover';
import { Icon, StackedMeter } from './ui';

export const passageTitle = (s: PassageStat) => `Passage ${s.ref.passageNumber} — ${s.ref.bookNumber} T${s.ref.testNumber}`;
export const passageCrumb = (s: PassageStat) => `${shortBook(s.ref.bookName)} • Test ${s.ref.testNumber}`;

const STATUS = {
  new: { label: 'Not started', cls: 'st-new' },
  progress: { label: 'In progress', cls: 'st-progress' },
  done: { label: <>Completed <Icon name="check" size={14} filled/></>, cls: 'st-done' },
} as const;

/** `wide` = the "Continue Learning" layout; default = grid card used in Library. */
export default function PassageCard({ stat, wide = false, coverVariant }: { stat: PassageStat; wide?: boolean; coverVariant?: CoverVariant }) {
  const navigate = useNavigate();
  const go = (mode: string) => navigate(`/${stat.ref.slug}/${mode}`);
  const st = STATUS[stat.status];
  const cta = stat.status === 'progress' ? 'Resume' : 'Start';
  const thumb = <BookThumb book={stat.ref.bookNumber} small={`T${stat.ref.testNumber} · P${stat.ref.passageNumber}`} size={wide ? 88 : 64} variant={coverVariant}/>;
  return <Card className={`passage-card ${wide ? 'wide' : ''}`}>
    <div className="pc-main">
      {thumb}
      <div className="pc-info">
        <h3>{wide ? passageTitle(stat) : `Passage ${stat.ref.passageNumber}`}</h3>
        <p>{wide ? passageCrumb(stat) : stat.loaded ? `${stat.count} words` : 'Loading…'}</p>
        <div className="pc-progress"><StackedMeter learned={stat.percent} covered={stat.progress} label={`${stat.percent}% learned, ${stat.progress}% covered`}/><span>{stat.progress}%</span></div>
        <p className="pc-count">{stat.count ? `${stat.learned} / ${stat.count} learned` : 'Open to load words'}{stat.engaged > 0 && ` · ${stat.engaged} worked on`}</p>
        {!wide && <div className="pc-meta">
          <Chip size="sm" variant="soft" className={st.cls}>{st.label}</Chip>
          {stat.difficult > 0 && <Chip size="sm" variant="soft" className="st-star"><Icon name="star" size={14} filled/> {stat.difficult}</Chip>}
        </div>}
      </div>
    </div>
    <div className="pc-actions">
      <Button className="pill" onPress={() => go('list')}><Icon name="play" size={18} filled/>{cta}</Button>
      {!wide && <div className="pc-modes">
        <Button isIconOnly size="sm" variant="secondary" aria-label="Word list" onPress={() => go('list')}><Icon name="book" size={18}/></Button>
        <Button isIconOnly size="sm" variant="secondary" aria-label="Flashcards" onPress={() => go('flashcards')}><Icon name="cards" size={18}/></Button>
        <Button isIconOnly size="sm" variant="secondary" aria-label="Quiz" onPress={() => go('quiz')}><Icon name="quiz" size={18}/></Button>
      </div>}
    </div>
  </Card>;
}
