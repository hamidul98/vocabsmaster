import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { usePassage, useLibrary } from '@/hooks/useLibrary';
import { shortBook } from '@/hooks/useStats';
import { useProgress } from '@/lib/progress';
import { Study } from '@/components/Study';
import { Ring } from '@/components/art';
import { Failure, Icon, Loading } from '@/components/ui';

export default function PassagePage() {
  const { slug, mode = 'list' } = useParams();
  const { pathname } = useLocation();
  const { ref, passage, error, unknown } = usePassage(slug);
  const { indexError, reload } = useLibrary();
  const { marks, setLastStudied, completePassage } = useProgress();
  const total = passage?.words.length ?? 0;
  const learned = passage ? passage.words.filter((w) => marks[w.id] === 'learned').length : 0;

  // "Continue Learning" reopens the last passage in the same mode
  useEffect(() => { if (slug && passage) setLastStudied(pathname, slug); }, [slug, passage, pathname, setLastStudied]);
  // +50 XP once when every word is learned
  useEffect(() => { if (slug && total > 0 && learned === total) completePassage(slug); }, [slug, total, learned, completePassage]);

  if (indexError || error) return <Failure message={`${(indexError || error)?.message}${error && ref ? ` · Sheet tab: "${ref.tabName}"` : ''}`} retry={reload} />;
  if (unknown) return <Failure message={`Passage “${slug}” is not listed in the Main tab.`} />;
  if (!ref || !passage) return <Loading />;
  return <>
    <div className="passage-head">
      <Link to="/library" className="back-btn" aria-label="Back to library"><Icon name="back" size={22} /></Link>
      <div>
        <nav className="crumbs" aria-label="Breadcrumb"><Link to={`/library?book=${ref.bookNumber}`}>{shortBook(ref.bookName).replace(/ Academic$/, '')}</Link><Icon name="chevron" size={16} /><Link to={`/library?book=${ref.bookNumber}&test=${ref.testNumber}`}>Test {ref.testNumber}</Link><Icon name="chevron" size={16} /><strong>Passage {ref.passageNumber}</strong></nav>
        <p className="muted">{total} words · {learned} learned</p>
      </div>
      <Ring value={total ? learned / total : 0} size={64} stroke={7} label={`${learned} of ${total} learned`}><small className="ring-pct">{total ? Math.round((learned / total) * 100) : 0}%</small></Ring>
    </div>
    <Study key={slug} words={passage.words} mode={mode} base={`/${slug}`} orderKey={slug} />
  </>;
}
