import { useEffect } from 'react';
import { Button, Card, Chip } from '@heroui/react';
import { Link } from 'react-router-dom';
import { BookCover, COVER_STYLES, setCoverStyle, useCoverStyle } from '@/components/BookCover';
import PassageCard from '@/components/PassageCard';
import { Icon } from '@/components/ui';
import { useLibrary } from '@/hooks/useLibrary';
import { usePassageStats, type PassageStat } from '@/hooks/useStats';

const sample: PassageStat = {
  ref: { bookName: 'IELTS 21 Academic 2026', bookNumber: 21, testNumber: 3, passageNumber: 1, slug: '21-T3-P1', tabName: '21- T3-P1', link: '' },
  loaded: true, count: 251, learned: 0, difficult: 0, percent: 0, engaged: 0, progress: 0, status: 'new',
};

export default function CoverTemplatesPage() {
  const selected = useCoverStyle();
  const { loadAll } = useLibrary();
  const stats = usePassageStats();
  useEffect(() => { loadAll(); }, [loadAll]);
  const passage = stats.find(s => s.loaded) ?? sample;
  return <div className="cover-templates-page">
    <div className="page-title"><div className="cover-kicker">THREE WAYS TO BOOK YOUR NEXT CHAPTER</div><h1>A familiar cover.<br/><span>A fresh little format.</span></h1><p>Inspired by your IELTS reference. Designed for your passage cards.</p></div>
    <div className="cover-template-grid">{COVER_STYLES.map((style, i) => <Card className={`cover-option ${selected === style.id ? 'is-selected' : ''}`} key={style.id}>
      <Card.Header className="cover-option-header"><span>0{i + 1} / {style.name}</span>{selected === style.id && <Chip size="sm" variant="soft" color="success">In use</Chip>}</Card.Header>
      <Card.Content className="cover-option-body"><div className={`cover-stage stage-${style.id}`}><BookCover book={passage.ref.bookNumber} small={`T${passage.ref.testNumber} · P${passage.ref.passageNumber}`} size={135} variant={style.id}/></div><h2>{style.name}</h2><p>{style.description}</p><div className="cover-preview-label">IN YOUR PASSAGE CARD</div><PassageCard stat={passage} coverVariant={style.id}/><div className="cover-preview-label">ONE TEMPLATE, EVERY BOOK</div><div className="cover-book-family">{[19,20,21].map(book => <BookCover key={book} book={book} size={48} variant={style.id}/>)}</div></Card.Content>
      <Card.Footer><Button fullWidth className="pill" variant={selected === style.id ? 'secondary' : 'primary'} aria-pressed={selected === style.id} onPress={() => setCoverStyle(style.id)}>{selected === style.id ? <><Icon name="check" size={17}/>Currently selected</> : 'Use this style'}</Button></Card.Footer>
    </Card>)}</div>
    <div className="cover-template-footer"><p>Book 19: red · Book 20: blue · Book 21: green. New books get their own colour automatically. Your template choice is saved on this device.</p><Link to="/library">Open your library <Icon name="arrow" size={18}/></Link></div>
  </div>;
}
