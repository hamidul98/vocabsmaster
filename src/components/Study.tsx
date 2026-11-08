import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Label, Switch, Tabs } from '@heroui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import type { Word } from '@/lib/types';
import { buildQuiz } from '@/lib/quiz';
import type { Question } from '@/lib/quiz';
import { shuffle } from '@/lib/util';
import { load, save } from '@/lib/storage';
import { speak } from '@/lib/speech';
import { useProgress, XP } from '@/lib/progress';
import WordCard, { WordDetails, WordRow } from './WordCard';
import { MARK_COLORS, type MarkColor } from '@/lib/colors';
import { SortableWordList } from './SortableWordList';
import type { CSSProperties } from 'react';
import { Empty, Icon, Meter, SearchInput } from './ui';
import { Mascot, Ring } from './art';

export function PreferenceSwitch({ label, selected, onChange }: { label: string; selected: boolean; onChange: (v:boolean)=>void }) {
  return <Switch isSelected={selected} onChange={onChange} className="preference-switch"><Switch.Content><Switch.Control><Switch.Thumb/></Switch.Control><Label className="switch-label">{label}</Label></Switch.Content></Switch>;
}
/** `orderKey` enables drag-to-reorder in list view and saves the order under that key (e.g. the passage slug). */
export function Study({ words: sheetWords, mode, base, orderKey }: { words:Word[]; mode:string; base:string; orderKey?: string }) {
  const navigate=useNavigate();
  const { search }=useLocation(); // keep ?filters when switching tabs (Practice)
  const [query,setQuery]=useState('');
  const [hide,setHide]=useState(()=>load('hideMeanings',false));
  const [page,setPage]=useState(1);
  const [view,setView]=useState<'cards'|'list'>(()=>load('wordView','cards'));
  const [colorFilter,setColorFilter]=useState<MarkColor|'any'|null>(null);
  const { colors, order, setOrder } = useProgress();
  const saved = orderKey ? order[orderKey] : undefined;
  // Saved order first; words not in the saved list (e.g. newly added to the sheet) keep their sheet position after them.
  const words = useMemo(() => {
    if (!saved?.length) return sheetWords;
    const pos = new Map(saved.map((id, i) => [id, i]));
    return sheetWords.map((w, i) => ({ w, k: pos.get(w.id) ?? saved.length + i })).sort((a, b) => a.k - b.k).map((x) => x.w);
  }, [sheetWords, saved]);
  const active=['list','flashcards','quiz'].includes(mode)?mode:'list';
  const filtered=words.filter(w=>[w.word,...w.fields.map(f=>f.value)].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase()))
    .filter(w=>colorFilter===null||(colorFilter==='any'?!!colors[w.id]:colors[w.id]===colorFilter));
  const colorCount=(c:MarkColor)=>words.filter(w=>colors[w.id]===c).length;
  const markedCount=words.filter(w=>colors[w.id]).length;
  const shown=filtered.slice(0,page*24);
  const canDrag=view==='list'&&!!orderKey&&!query&&colorFilter===null;
  return <Tabs selectedKey={active} onSelectionChange={key=>navigate(`${base}/${key}${search}`)} className="study-tabs">
    <div className="study-toolbar"><Tabs.ListContainer><Tabs.List aria-label="Study mode">{['list','flashcards','quiz'].map(m=><Tabs.Tab key={m} id={m}>{m==='list'?'List':m==='flashcards'?'Flashcards':'Quiz'}<Tabs.Indicator/></Tabs.Tab>)}</Tabs.List></Tabs.ListContainer><span className="muted">{words.length} words</span></div>
    <Tabs.Panel id="list">
      <div className="list-toolbar"><SearchInput value={query} onChange={v=>{setQuery(v);setPage(1);}} placeholder="Search this collection…"/>
        <div className="list-prefs">
          <div className="view-toggle" role="group" aria-label="Word layout">{(['cards','list'] as const).map(v=><button key={v} type="button" aria-pressed={view===v} className={view===v?'active':''} onClick={()=>{setView(v);save('wordView',v);}}><Icon name={v==='cards'?'grid':'table'} size={18}/>{v==='cards'?'Cards':'List'}</button>)}</div>
          <PreferenceSwitch label="Hide meanings" selected={hide} onChange={v=>{setHide(v);save('hideMeanings',v);}}/>
        </div>
      </div>
      <div className="color-filter" role="group" aria-label="Filter by focus colour">
        <span className="muted">Focus:</span>
        <button type="button" className={`cf-chip ${colorFilter===null?'active':''}`} aria-pressed={colorFilter===null} onClick={()=>{setColorFilter(null);setPage(1);}}>All</button>
        <button type="button" className={`cf-chip ${colorFilter==='any'?'active':''}`} aria-pressed={colorFilter==='any'} onClick={()=>{setColorFilter('any');setPage(1);}}>Any colour <span className="cf-count">{markedCount}</span></button>
        {MARK_COLORS.map(c=><button key={c.key} type="button" className={`cf-chip ${colorFilter===c.key?'active':''}`} style={{'--mark':c.hex} as CSSProperties} aria-pressed={colorFilter===c.key} aria-label={`${c.label} (${colorCount(c.key)})`} onClick={()=>{setColorFilter(colorFilter===c.key?null:c.key);setPage(1);}}><span className="color-dot"/><span className="cf-count">{colorCount(c.key)}</span></button>)}
      </div>
      {view==='list'&&orderKey&&<div className="order-bar">
        <span className="muted"><Icon name="drag_indicator" size={18}/>{canDrag?'Drag the handle to put words in your own order.':'Clear the search and colour filter to reorder words.'}</span>
        {saved&&<button type="button" className="auth-link" onClick={()=>setOrder(orderKey,null)}><Icon name="restart_alt" size={18}/>Reset to sheet order</button>}
      </div>}
      {filtered.length?<>
        {view==='cards'
          ?<div className="word-grid">{shown.map(w=><WordCard key={w.id} word={w} hideMeanings={hide}/>)}</div>
          :canDrag
            ?<SortableWordList ordered={words} shown={shown} hideMeanings={hide} onReorder={ids=>setOrder(orderKey!, ids)}/>
            :<ul className="word-list">{shown.map((w,i)=><WordRow key={w.id} word={w} hideMeanings={hide} index={i}/>)}</ul>}
        {filtered.length>page*24&&<div className="load-more"><Button variant="secondary" onPress={()=>setPage(p=>p+1)}>Show more words ({filtered.length-page*24} left)</Button></div>}
      </>:<Empty title="No words found">{colorFilter!==null?'No words have this focus colour yet. Tap the palette icon on a word to add one.':'Try a different spelling or search term.'}</Empty>}
    </Tabs.Panel>
    <Tabs.Panel id="flashcards"><Flashcards words={words}/></Tabs.Panel>
    <Tabs.Panel id="quiz"><Quiz words={words} onBack={()=>navigate(`${base}/list${search}`)}/></Tabs.Panel>
  </Tabs>;
}

export function Flashcards({ words }: { words:Word[] }) {
  const { toggle, statusOf, reviewCard } = useProgress();
  const [deck,setDeck]=useState(words);
  const [index,setIndex]=useState(0);
  const [flipped,setFlipped]=useState(false);
  const reviewed=useRef(new Set<string>());
  const touch=useRef<number | null>(null);
  const reduced=useReducedMotion();
  useEffect(()=>{setDeck(words);setIndex(0);setFlipped(false);},[words]);
  const word=deck[index];
  const move=(n:number)=>{setIndex(i=>(i+n+deck.length)%deck.length);setFlipped(false);};
  const flip=()=>{
    if(!flipped&&word&&!reviewed.current.has(word.id)){reviewed.current.add(word.id);reviewCard();} // +2 XP per new card
    setFlipped(v=>!v);
  };
  const mark=(status:'learned'|'difficult')=>{
    if(!word)return;
    // only set (never clear) so the button always ends in the chosen state
    if(statusOf(word.id)!==status) toggle(word.id,status);
    move(1);
  };
  if(!word) return <Empty title="No flashcards yet">Add some words to this collection to practise.</Empty>;
  return <section className="flashcard-section" aria-label="Flashcard practice">
    <div className="flashcard-top"><span className="muted"><strong>{index+1}</strong> / {deck.length}</span><Button variant="secondary" size="sm" onPress={()=>{setDeck(shuffle(words));setIndex(0);setFlipped(false);}}><Icon name="shuffle" size={17}/>Shuffle</Button></div>
    <motion.div key={word.id} initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.2}}>
      <div className={`flip ${flipped?'flipped':''}`} onTouchStart={e=>{touch.current=e.touches[0].clientX;}} onTouchEnd={e=>{if(touch.current!==null){const d=touch.current-e.changedTouches[0].clientX;if(Math.abs(d)>60)move(d>0?1:-1);touch.current=null;}}}>
        <div className="flip-inner">
          <div role="button" tabIndex={0} className="flip-face front" aria-label="Flip to reveal meaning" aria-hidden={flipped} onClick={flip}
            onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();flip();}if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);}}>
            <span className="eyebrow">DO YOU KNOW THIS WORD?</span>
            <h2>{word.word}</h2>
            <Button isIconOnly variant="outline" aria-label={`Pronounce ${word.word}`} onPress={()=>speak(word.word)} onClick={e=>e.stopPropagation()}><Icon name="sound" size={24}/></Button>
            <p>Tap the card or press Space to flip</p>
          </div>
          <div role="button" tabIndex={flipped?0:-1} className="flip-face back" aria-label="Flip back to the word" aria-hidden={!flipped} onClick={flip}
            onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();flip();}if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);}}>
            <h3>{word.word}</h3><WordDetails word={word}/>
          </div>
        </div>
      </div>
    </motion.div>
    <div className="flashcard-controls"><Button isIconOnly variant="secondary" aria-label="Previous card" onPress={()=>move(-1)}><Icon name="back"/></Button><span aria-live="polite">{index+1} / {deck.length}</span><Button isIconOnly variant="secondary" aria-label="Next card" onPress={()=>move(1)}><Icon name="arrow"/></Button></div>
    <div className="knew-row"><Button className="pill knew" onPress={()=>mark('learned')}><Icon name="check" size={18} filled/>I knew it</Button><Button className="pill still" onPress={()=>mark('difficult')}><Icon name="star" size={18} filled/>Still learning</Button></div>
    <p className="keyboard-hint">Space flips · arrow keys move · swipe on mobile</p>
  </section>;
}

export function Quiz({ words, onBack }: { words:Word[]; onBack?: ()=>void }) {
  const { answerQuiz } = useProgress();
  const [reverse,setReverse]=useState(false);
  const [questions,setQuestions]=useState<Question[]>(()=>buildQuiz(words));
  const [index,setIndex]=useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  const [wrong,setWrong]=useState<Word[]>([]);
  const [score,setScore]=useState(0);
  const start=(pool:Word[],rev=reverse)=>{const ids=new Set(pool.map(w=>w.id));setQuestions(buildQuiz(words,rev).filter(q=>ids.has(q.word.id)));setIndex(0);setSelected(null);setWrong([]);setScore(0);};
  useEffect(()=>{start(words);},[words]); // reset when the collection changes
  const q=questions[index];
  const finished=questions.length>0&&!q;
  useEffect(()=>{if(finished&&score/questions.length>=0.8)window.dispatchEvent(new CustomEvent('ibv:confetti'));},[finished]); // eslint-disable-line react-hooks/exhaustive-deps
  const choose=(option:string)=>{
    if(selected!==null)return;
    setSelected(option);
    const ok=option===q.answer;
    answerQuiz(q.word,ok);
    if(ok)setScore(s=>s+1);else setWrong(w=>[...w,q.word]);
  };
  if(!questions.length) return <Empty title="Not enough quiz words yet">This collection needs at least two different meanings before you can practise.</Empty>;
  if(finished){
    const pct=score/questions.length;
    return <Card className="quiz-result"><Mascot size={90} mood={pct>=0.5?'happy':'confused'}/>
      <Ring value={pct} size={160} stroke={14} label={`Score ${score} of ${questions.length}`}><strong className="score">{score}/{questions.length}</strong><small>correct</small></Ring>
      <h2>{pct>=0.8?'Excellent work!':pct>=0.5?'Good effort!':'Keep practising!'}</h2>
      <p>+{score*XP.quiz} XP earned{wrong.length?` · ${wrong.length} word${wrong.length>1?'s':''} to revisit`:' · every answer right'}</p>
      <div className="result-actions">{wrong.length>0&&<Button className="pill" onPress={()=>start(wrong)}>Retry wrong answers</Button>}<Button className="pill" variant={wrong.length?'secondary':'primary'} onPress={()=>start(words)}>Practise again</Button>{onBack&&<Button className="pill" variant="secondary" onPress={onBack}>Back to passage</Button>}</div></Card>;
  }
  return <section className="quiz-section"><div className="quiz-top"><span>Question {index+1} of {questions.length}</span><label className="rev"><PreferenceSwitch label="Reverse quiz" selected={reverse} onChange={v=>{setReverse(v);start(words,v);}}/></label></div><Meter value={index/questions.length*100} label="Quiz progress"/>
    <Card className="quiz-card"><Card.Content><span className="eyebrow">{reverse?'WHICH WORD MATCHES THIS MEANING?':'CHOOSE THE CORRECT MEANING'}</span><h2 className="font-bangla">{q.prompt}</h2>
      <div className="quiz-options">{q.options.map((o,i)=><Button key={i} variant="secondary" isDisabled={selected!==null} onPress={()=>choose(o)} className={`quiz-option font-bangla ${selected!==null?(o===q.answer?(selected===q.answer?'correct':'correct shake'):o===selected?'incorrect':''):''}`}><span className="option-letter">{String.fromCharCode(65+i)}</span>{o}{selected!==null&&o===q.answer&&<Icon name="check" filled/>}</Button>)}</div>
      {selected!==null&&<div className="quiz-feedback" aria-live="polite"><p>{selected===q.answer?'That’s right! One more word, a little more confidence.':`Not quite. The correct answer is: ${q.answer}`}</p><Button className="pill" onPress={()=>{setIndex(i=>i+1);setSelected(null);}}>{index===questions.length-1?'See results':'Next question'}<Icon name="arrow" size={18}/></Button></div>}</Card.Content></Card></section>;
}
