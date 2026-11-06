import { useState } from 'react';
import { Button, Card, Chip } from '@heroui/react';
import type { Word } from '@/lib/types';
import { useProgress } from '@/lib/progress';
import { speak } from '@/lib/speech';
import { Icon } from './ui';

export function WordDetails({ word }: { word: Word }) {
  return <div className="word-details">{word.fields.filter(f=>f.kind!=='pos' && f.value).map((f,i)=><div key={i} className={`field field-${f.kind}`}>
    {f.kind==='other' && <small>{f.label}</small>}
    {f.kind==='synonym'||f.kind==='antonym'?<><small>{f.label}</small><div className="chips">{f.value.split(/[,;،]/).filter(Boolean).map((v,j)=><Chip key={j} size="sm" variant="soft">{v.trim()}</Chip>)}</div></>:<p className={f.kind==='bangla'?'font-bangla':''}>{f.value}</p>}
  </div>)}</div>;
}
/** ✓ Learned and ★ Difficult toggle icons. */
export function WordActions({ word }: { word: Word }) {
  const { statusOf, toggle } = useProgress();
  const status=statusOf(word.id);
  return <div className="word-actions">
    <Button isIconOnly size="sm" variant={status==='learned'?'primary':'secondary'} aria-label={status==='learned'?'Learned (tap to undo)':'Mark as learned'} aria-pressed={status==='learned'} className="mark learned" onPress={()=>toggle(word.id,'learned')}><Icon name="check" size={20} filled={status==='learned'}/></Button>
    <Button isIconOnly size="sm" variant={status==='difficult'?'primary':'secondary'} aria-label={status==='difficult'?'Difficult (tap to undo)':'Mark as difficult'} aria-pressed={status==='difficult'} className="mark difficult" onPress={()=>toggle(word.id,'difficult')}><Icon name="star" size={20} filled={status==='difficult'}/></Button>
  </div>;
}
export default function WordCard({ word, hideMeanings=false, source }: { word: Word; hideMeanings?: boolean; source?: React.ReactNode }) {
  const [revealed,setRevealed]=useState(false);
  return <Card className="word-card"><Card.Header>
    <div><h3>{word.word}</h3><div className="chips">{word.fields.filter(f=>f.kind==='pos' && f.value).map((f,i)=><Chip key={i} size="sm" variant="soft">{f.value}</Chip>)}</div></div>
    <div className="card-tools"><Button isIconOnly size="sm" variant="outline" className="round" aria-label={`Pronounce ${word.word}`} onPress={()=>speak(word.word)}><Icon name="sound"/></Button><WordActions word={word}/></div>
  </Card.Header>
  <Card.Content>{hideMeanings&&!revealed?<Button variant="secondary" fullWidth className="reveal-button" onPress={()=>setRevealed(true)}>Tap to reveal meaning</Button>:<WordDetails word={word}/>}</Card.Content>
  {source && <Card.Footer><div className="word-source">{source}</div></Card.Footer>}</Card>;
}
