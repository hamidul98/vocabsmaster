import { useSyncExternalStore } from 'react';
import { load, save } from '@/lib/storage';

export type CoverVariant = 'classic' | 'editorial' | 'midnight';
export const COVER_STYLES: { id: CoverVariant; name: string; description: string }[] = [
  { id: 'classic', name: 'Classic cover', description: 'The closest to your reference. Bold IELTS lettering and folded steps, with a distinct colour for each book.' },
  { id: 'editorial', name: 'Editorial white', description: 'An airy white cover with a coloured title band and an oversized number. Each book has its own accent.' },
  { id: 'midnight', name: 'Midnight edition', description: 'Deep navy with a book-coloured number panel and quiet geometric details. A more premium, compact look.' },
];

/** Book identity stays consistent across every cover style and passage. */
export function bookCoverPalette(book: number) {
  const hue = book === 19 ? 347 : book === 20 ? 217 : book === 21 ? 153 : ((book - 22) * 137.508 + 266 + 3600) % 360;
  const colour = (s: number, l: number) => `hsl(${hue.toFixed(2)} ${s}% ${l}%)`;
  return {
    main: colour(82, 43), dark: colour(77, 28), deep: colour(68, 22), step: colour(80, 36),
    pale: colour(60, 90), soft: colour(55, 83), tint: colour(50, 76), ink: colour(65, 28),
  };
}
const eventName = 'ibv:cover-style';
const snapshot = (): CoverVariant => {
  const saved = load<string>('coverStyle', 'classic');
  return COVER_STYLES.some(s => s.id === saved) ? saved as CoverVariant : 'classic';
};
const subscribe = (cb: () => void) => {
  window.addEventListener(eventName, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(eventName, cb); window.removeEventListener('storage', cb); };
};
export const useCoverStyle = () => useSyncExternalStore(subscribe, snapshot, () => 'classic' as CoverVariant);
export function setCoverStyle(style: CoverVariant) {
  save('coverStyle', style);
  window.dispatchEvent(new Event(eventName));
}

/** Reusable vector cover: legible at card size, sharp at any resolution. */
export function BookCover({ book, small = '', size = 72, variant }: { book: number; small?: string; size?: number; variant?: CoverVariant }) {
  const preferred = useCoverStyle();
  const style = variant ?? preferred;
  const classic = style === 'classic', editorial = style === 'editorial';
  const palette = bookCoverPalette(book);
  const steps = <g>
    <path d="M0 111H22V93H45V75H68V57H100V128H0Z" fill={editorial ? palette.pale : classic ? palette.dark : '#29375a'}/>
    <path d="m0 111 17 17h28L22 93v18Zm45-36 46 53h9V96L68 57v18Z" fill={editorial ? palette.soft : classic ? palette.deep : '#344570'}/>
    <path d="m22 93 31 35h28L45 75v18Zm46-36 32 39V69L87 57Z" fill={editorial ? palette.tint : classic ? palette.step : '#41537f'}/>
  </g>;
  return <svg className={`book-cover book-cover-${style}`} width={size} height={Math.round(size * 1.28)} viewBox="0 0 100 128" role="img" aria-label={`IELTS Academic ${book}${small ? `, ${small}` : ''}`}>
    <rect width="100" height="128" fill={classic ? palette.main : editorial ? '#fffaf5' : '#162340'}/>
    {steps}
    <rect width="3" height="128" fill="#000" opacity=".12"/>
    {classic ? <>
      <text x="8" y="31" fontSize="29" fontWeight="900" letterSpacing="-1.7" fill="white">IELTS</text>
      <text x="9" y="42" fontSize="7.4" fontWeight="600" fill="white">Academic</text>
      <text x="91" y="70" textAnchor="end" fontSize="35" fontWeight="650" letterSpacing="-2" fill="white">{book}</text>
      <text x="9" y="85" fontSize="5.1" fontWeight="600" fill="white">VOCABULARY</text>
      <text x="9" y="93" fontSize="5.1" fill="white">Practice collection</text>
    </> : editorial ? <>
      <rect x="3" width="97" height="34" fill={palette.main}/>
      <text x="10" y="25" fontSize="25" fontWeight="850" letterSpacing="-1.4" fill="white">IELTS</text>
      <text x="10" y="47" fontSize="7" fontWeight="600" fill={palette.ink}>ACADEMIC</text>
      <text x="8" y="90" fontSize="48" fontWeight="750" letterSpacing="-3" fill={palette.main}>{book}</text>
      <text x="11" y="102" fontSize="5.5" fontWeight="650" fill={palette.ink}>Vocabulary practice</text>
    </> : <>
      <text x="10" y="25" fontSize="24" fontWeight="850" letterSpacing="-1.5" fill="white">IELTS</text>
      <text x="11" y="38" fontSize="7" fill="#c7d3ed">ACADEMIC</text>
      <rect x="10" y="48" width="59" height="46" rx="3" fill={palette.main}/>
      <text x="39.5" y="84" textAnchor="middle" fontSize="36" fontWeight="750" letterSpacing="-2" fill="white">{book}</text>
      <text x="11" y="104" fontSize="5.1" fontWeight="600" fill="#e3eaf9">VOCABULARY PRACTICE</text>
    </>}
    <rect x="3" y="113" width="97" height="15" fill={editorial ? palette.dark : '#000'} opacity={editorial ? 1 : .2}/>
    <text x="10" y="122.5" fontSize="6.1" fontWeight="650" letterSpacing=".15" fill="white">{small || 'BOOK VOCAB'}</text>
  </svg>;
}
