import { useState, type CSSProperties } from 'react';
import { Button, Card, Chip } from '@heroui/react';
import { Button as AriaButton, Dialog, DialogTrigger, Popover } from 'react-aria-components';
import type { Word } from '@/lib/types';
import { useProgress } from '@/lib/progress';
import { MARK_COLORS, colorHex, colorLabel } from '@/lib/colors';
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

/** Palette button that opens a swatch popover for the word's focus colour. */
export function ColorPicker({ word }: { word: Word }) {
  const { colors, setColor } = useProgress();
  const current = colors[word.id];
  const hex = colorHex(current);
  return <DialogTrigger>
    <AriaButton className={`color-trigger ${current ? 'is-set' : ''}`} style={hex ? { '--mark': hex } as CSSProperties : undefined}
      aria-label={current ? `Focus colour: ${colorLabel(current)} (change)` : 'Add a focus colour'}>
      {current ? <span className="color-dot" /> : <Icon name="palette" size={20} />}
    </AriaButton>
    <Popover placement="bottom end" offset={6} className="color-popover">
      <Dialog aria-label={`Focus colour for ${word.word}`} className="color-dialog">
        {({ close }) => <>
          <div className="swatches">{MARK_COLORS.map(c => <button key={c.key} type="button" className={`swatch ${current === c.key ? 'selected' : ''}`}
            style={{ '--mark': c.hex } as CSSProperties} aria-label={c.label} aria-pressed={current === c.key}
            onClick={() => { setColor(word.id, current === c.key ? null : c.key); close(); }}>{current === c.key && <Icon name="check" size={16} />}</button>)}</div>
          {current && <button type="button" className="swatch-clear" onClick={() => { setColor(word.id, null); close(); }}><Icon name="close" size={16} />Remove colour</button>}
        </>}
      </Dialog>
    </Popover>
  </DialogTrigger>;
}

const markStyle = (hex?: string) => hex ? { '--mark': hex } as CSSProperties : undefined;

export default function WordCard({ word, hideMeanings=false, source }: { word: Word; hideMeanings?: boolean; source?: React.ReactNode }) {
  const [revealed,setRevealed]=useState(false);
  const { colors, markSeen } = useProgress();
  const hex = colorHex(colors[word.id]);
  const say = () => { markSeen(word.id, 2); speak(word.word); };
  return <Card className={`word-card ${hex ? 'has-mark' : ''}`} style={markStyle(hex)}><Card.Header>
    <div><h3>{word.word}</h3><div className="chips">{word.fields.filter(f=>f.kind==='pos' && f.value).map((f,i)=><Chip key={i} size="sm" variant="soft">{f.value}</Chip>)}</div></div>
    <div className="card-tools"><Button isIconOnly size="sm" variant="outline" className="round" aria-label={`Pronounce ${word.word}`} onPress={say}><Icon name="sound"/></Button><WordActions word={word}/><ColorPicker word={word}/></div>
  </Card.Header>
  <Card.Content>{hideMeanings&&!revealed?<Button variant="secondary" fullWidth className="reveal-button" onPress={()=>{setRevealed(true);markSeen(word.id,2);}}>Tap to reveal meaning</Button>:<WordDetails word={word}/>}</Card.Content>
  {source && <Card.Footer><div className="word-source">{source}</div></Card.Footer>}</Card>;
}

/** Compact one-line list row; click the row to expand full details. */
export interface RowDrag {
  ref: (el: HTMLElement | null) => void;
  style?: CSSProperties;
  /** The ⠿ handle (receives the drag listeners). */
  handle: React.ReactNode;
  dragging?: boolean;
}

export function WordRow({ word, hideMeanings=false, index, drag }: { word: Word; hideMeanings?: boolean; index?: number; drag?: RowDrag }) {
  const [open,setOpen]=useState(false);
  const [revealed,setRevealed]=useState(false);
  const { colors, markSeen } = useProgress();
  const hex = colorHex(colors[word.id]);
  const say = () => { markSeen(word.id, 2); speak(word.word); };
  const pos = word.fields.find(f=>f.kind==='pos' && f.value)?.value;
  const bangla = word.fields.find(f=>f.kind==='bangla' && f.value)?.value ?? word.fields.find(f=>f.kind==='meaning' && f.value)?.value;
  const hidden = hideMeanings && !revealed;
  return <li ref={drag?.ref} className={`word-row ${hex ? 'has-mark' : ''} ${open ? 'open' : ''} ${drag?.dragging ? 'dragging' : ''}`} style={{ ...markStyle(hex), ...drag?.style }}>
    <div className="row-main">
      {drag?.handle}
      <button type="button" className="row-toggle" aria-expanded={open} onClick={()=>{setOpen(o=>!o); setRevealed(true); markSeen(word.id,2);}}>
        {index!==undefined && <span className="row-num">{index+1}</span>}
        <span className="row-word">{word.word}</span>
        {pos && <span className="row-pos">{pos}</span>}
        <span className={`row-meaning font-bangla ${hidden ? 'is-hidden' : ''}`}>{hidden ? 'Tap to reveal' : bangla}</span>
        <Icon name="down" size={20} />
      </button>
      <div className="row-tools"><Button isIconOnly size="sm" variant="outline" className="round" aria-label={`Pronounce ${word.word}`} onPress={say}><Icon name="sound" size={18}/></Button><WordActions word={word}/><ColorPicker word={word}/></div>
    </div>
    {open && <div className="row-details"><WordDetails word={word}/></div>}
  </li>;
}
