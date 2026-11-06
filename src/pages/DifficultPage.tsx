import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLibrary } from '@/hooks/useLibrary';
import { useProgress } from '@/lib/progress';
import { Study } from '@/components/Study';
import { Empty, Failure, Loading } from '@/components/ui';
export default function DifficultPage(){
  const {mode='list'}=useParams();
  const {passages,index,indexError,errors,loadAll,loadingAll,reload}=useLibrary();
  const {marks}=useProgress();
  useEffect(()=>{loadAll();},[loadAll]);
  const words=useMemo(()=>Object.values(passages).flatMap(p=>p.words).filter(w=>marks[w.id]==='difficult'),[passages,marks]);
  return <><div className="page-heading"><div className="eyebrow">YOUR PERSONAL PRACTICE COLLECTION</div><h1>Tricky today.<span> Familiar tomorrow.</span></h1><p>A little extra attention for the words that need it.</p></div>{indexError?<Failure message={indexError.message} retry={reload}/>:<>{Object.keys(errors).length>0&&<Failure message="Some passages couldn’t load. Your collection may be incomplete." retry={reload}/>}<div role="status">{loadingAll&&<p className="muted">Checking your library for difficult words…</p>}</div>{words.length?<Study words={words} mode={mode} base="/difficult"/>:loadingAll||!index?<Loading/>:<Empty title="A clean slate">Tap the star on any word to save it here. Then come back for flashcards and a quick quiz.</Empty>}</>}</>;
}

