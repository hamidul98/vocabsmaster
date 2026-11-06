import { useEffect, useState } from 'react';

/** Original mascot: an owl in a graduation cap. Swap this component to change the mascot. */
export function Mascot({ size = 140, mood = 'happy' }: { size?: number; mood?: 'happy' | 'confused' | 'sleepy' }) {
  const eye = mood === 'sleepy' ? <path d="M-9 0h18" stroke="#0F1B3D" strokeWidth="3" strokeLinecap="round"/> : <><circle r="9" fill="#fff"/><circle r="5" cy="1" fill="#0F1B3D"/><circle r="1.8" cx="-1.5" cy="-1" fill="#fff"/></>;
  return <svg width={size} height={size} viewBox="0 0 160 160" role="img" aria-label="Owl mascot">
    <ellipse cx="80" cy="150" rx="40" ry="5" fill="#1A73F5" opacity=".12"/>
    <path d="M38 78c-14 8-20 28-10 46 6-4 12-14 14-24z" fill="#1559C7"/>
    <path d="M122 78c14 8 20 28 10 46-6-4-12-14-14-24z" fill="#1559C7"/>
    <ellipse cx="80" cy="96" rx="44" ry="50" fill="#2F86FF"/>
    <ellipse cx="80" cy="108" rx="28" ry="34" fill="#DCEBFF"/>
    <g fill="#BCD6FF"><path d="M64 100q4 6 8 0M80 112q4 6 8 0M72 124q4 6 8 0M90 98q4 6 8 0"/></g>
    <circle cx="62" cy="76" r="17" fill="#fff"/><circle cx="98" cy="76" r="17" fill="#fff"/>
    <g transform="translate(62 76)">{eye}</g><g transform="translate(98 76)">{eye}</g>
    <path d="M74 88l6 10 6-10z" fill="#FBBF24"/>
    {mood === 'confused' && <path d="M52 62q10-6 20 0M88 62q10 6 20 0" stroke="#0F1B3D" strokeWidth="3" fill="none" strokeLinecap="round"/>}
    <path d="M80 28L36 46l44 18 44-18z" fill="#0F1B3D"/>
    <path d="M56 56v14q24 12 48 0V56l-24 10z" fill="#1E2B52"/>
    <path d="M124 46v22" stroke="#FBBF24" strokeWidth="3"/><circle cx="124" cy="72" r="4" fill="#FBBF24"/>
    <path d="M66 140l-6 10M94 140l6 10" stroke="#FBBF24" strokeWidth="5" strokeLinecap="round"/>
  </svg>;
}

/** Soft London-themed scene (Big Ben, red bus, phone box) drawn behind the mascot. */
export function LondonScene() {
  return <svg className="london-scene" viewBox="0 0 420 220" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <g fill="#fff" opacity=".85"><ellipse cx="90" cy="46" rx="42" ry="14"/><ellipse cx="120" cy="38" rx="26" ry="12"/><ellipse cx="330" cy="30" rx="36" ry="12"/></g>
    <path d="M0 200q90-30 180-10t240-14v44H0z" fill="#BFD9FF"/>
    <g transform="translate(250 40)">
      <rect x="0" y="40" width="34" height="130" fill="#E8C98A"/><rect x="-3" y="30" width="40" height="14" fill="#D9B069"/>
      <path d="M-2 30L17 0l19 30z" fill="#A98443"/><circle cx="17" cy="62" r="11" fill="#fff" stroke="#8A6A2E" strokeWidth="2"/>
      <path d="M17 62v-6M17 62l5 3" stroke="#0F1B3D" strokeWidth="1.8" strokeLinecap="round"/>
      <g fill="#C79F55"><rect x="6" y="90" width="6" height="22" rx="3"/><rect x="22" y="90" width="6" height="22" rx="3"/><rect x="6" y="122" width="6" height="22" rx="3"/><rect x="22" y="122" width="6" height="22" rx="3"/></g>
    </g>
    <g transform="translate(300 160)"><rect width="84" height="34" rx="6" fill="#E5383B"/><rect y="-22" width="84" height="26" rx="6" fill="#E5383B"/>
      <g fill="#DCEBFF"><rect x="6" y="-16" width="14" height="12" rx="2"/><rect x="24" y="-16" width="14" height="12" rx="2"/><rect x="42" y="-16" width="14" height="12" rx="2"/><rect x="60" y="-16" width="14" height="12" rx="2"/><rect x="6" y="6" width="14" height="12" rx="2"/><rect x="24" y="6" width="14" height="12" rx="2"/><rect x="42" y="6" width="14" height="12" rx="2"/></g>
      <circle cx="18" cy="36" r="8" fill="#0F1B3D"/><circle cx="66" cy="36" r="8" fill="#0F1B3D"/></g>
    <g transform="translate(212 150)"><rect width="22" height="44" rx="3" fill="#E5383B"/><rect x="4" y="6" width="14" height="30" rx="1" fill="#DCEBFF"/><path d="M0 0h22" stroke="#B02A2D" strokeWidth="3"/></g>
  </svg>;
}

const GRADIENTS = [
  ['#1A73F5', '#6AA8FF'], ['#8B5CF6', '#B79CFF'], ['#F05252', '#FF9A8B'], ['#22C55E', '#7EE2A3'], ['#F59E0B', '#FFD27A'], ['#0EA5E9', '#7DD3FC'],
];
/** Gradient tile showing the book number — gives every passage a thumbnail with no image upload. */
export function BookThumb({ book, small = '', size = 72 }: { book: number; small?: string; size?: number }) {
  const [a, b] = GRADIENTS[book % GRADIENTS.length];
  return <div className="book-thumb" style={{ width: size, height: size, background: `linear-gradient(135deg, ${a}, ${b})` }} aria-hidden="true">
    <strong style={{ fontSize: size * 0.4 }}>{book}</strong>{small && <span style={{ fontSize: Math.max(9, size * 0.14) }}>{small}</span>}
  </div>;
}
export const bookColor = (book: number) => GRADIENTS[book % GRADIENTS.length][0];

export function Ring({ value, size = 150, stroke = 14, children, label }: { value: number; size?: number; stroke?: number; children?: React.ReactNode; label: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, pct = Math.max(0, Math.min(1, value));
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = requestAnimationFrame(() => setShown(pct)); return () => cancelAnimationFrame(t); }, [pct]);
  return <div className="progress-ring" style={{ width: size, height: size }} role="img" aria-label={label}>
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke}/>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - shown)} style={{ transition: 'stroke-dashoffset .9s ease' }}/>
    </svg>
    <div className="ring-center">{children}</div>
  </div>;
}

/** Confetti burst: listens for the `ibv:confetti` window event (fired on level up / goal reached) or the `fire` prop. */
export function Confetti({ fire }: { fire?: number }) {
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    const on = () => setBurst((n) => n + 1);
    window.addEventListener('ibv:confetti', on);
    return () => window.removeEventListener('ibv:confetti', on);
  }, []);
  useEffect(() => { if (fire) setBurst((n) => n + 1); }, [fire]);
  useEffect(() => { if (!burst) return; const t = setTimeout(() => setBurst(0), 2600); return () => clearTimeout(t); }, [burst]);
  if (!burst || matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  const colors = ['#1A73F5', '#8B5CF6', '#F05252', '#22C55E', '#F59E0B', '#FBBF24'];
  return <div className="confetti" aria-hidden="true" key={burst}>{Array.from({ length: 48 }, (_, i) => <i key={i} style={{
    left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 12) * 0.05}s`,
    animationDuration: `${1.6 + (i % 5) * 0.2}s`, transform: `rotate(${i * 29}deg)`,
  }}/>)}</div>;
}
