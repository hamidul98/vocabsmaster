import { useState } from 'react';

/** Small dependency-free SVG charts that follow the app theme (CSS variables). */

const W = 640, H = 220, PAD = { l: 34, r: 10, t: 12, b: 24 };
const niceMax = (n: number) => { if (n <= 5) return 5; const p = 10 ** Math.floor(Math.log10(n)); return Math.ceil(n / p) * p; };

export interface Point { label: string; value: number }

function Axes({ max, labels }: { max: number; labels: [string, string] }) {
  const ticks = [0, 0.5, 1].map((t) => ({ y: PAD.t + (1 - t) * (H - PAD.t - PAD.b), v: Math.round(max * t) }));
  return <>
    {ticks.map((t) => <g key={t.v}><line x1={PAD.l} x2={W - PAD.r} y1={t.y} y2={t.y} stroke="var(--border)" strokeDasharray={t.v ? '3 4' : undefined}/><text x={PAD.l - 6} y={t.y + 4} textAnchor="end" className="ch-tick">{t.v}</text></g>)}
    <text x={PAD.l} y={H - 6} className="ch-tick">{labels[0]}</text>
    <text x={W - PAD.r} y={H - 6} textAnchor="end" className="ch-tick">{labels[1]}</text>
  </>;
}

/** Line chart with an area fill and a hover readout. */
export function LineChart({ points, label, color = 'var(--accent)' }: { points: Point[]; label: string; color?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value), 1));
  const x = (i: number) => PAD.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const h = hover != null ? points[hover] : null;
  return <div className="ch-wrap">
    <div className="ch-readout" aria-live="polite">{h ? <><b>{h.value}</b> · {h.label}</> : <span>Hover or tap the chart for exact values</span>}</div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="ch-svg"
      onPointerLeave={() => setHover(null)}
      onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setHover(Math.max(0, Math.min(points.length - 1, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (points.length - 1))))); }}>
      <Axes max={max} labels={[points[0]?.label ?? '', points[points.length - 1]?.label ?? '']}/>
      <path d={area} fill={color} opacity=".12"/>
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
      {hover != null && <g><line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} stroke={color} opacity=".35"/><circle cx={x(hover)} cy={y(points[hover].value)} r="5" fill="var(--surface)" stroke={color} strokeWidth="2.5"/></g>}
    </svg>
  </div>;
}

/** Bar chart with an optional dashed goal line; bars at/above the goal use the accent colour. */
export function BarChart({ points, label, goal }: { points: Point[]; label: string; goal?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(...points.map((p) => p.value), goal ?? 0, 1));
  const slot = (W - PAD.l - PAD.r) / points.length, bw = Math.max(2, slot * 0.68);
  const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
  const h = hover != null ? points[hover] : null;
  return <div className="ch-wrap">
    <div className="ch-readout" aria-live="polite">{h ? <><b>{h.value}</b> · {h.label}</> : <span>Hover or tap a bar for exact values</span>}</div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="ch-svg" onPointerLeave={() => setHover(null)}>
      <Axes max={max} labels={[points[0]?.label ?? '', points[points.length - 1]?.label ?? '']}/>
      {goal ? <g><line x1={PAD.l} x2={W - PAD.r} y1={y(goal)} y2={y(goal)} stroke="var(--c-orange)" strokeDasharray="5 4" strokeWidth="1.5"/><text x={W - PAD.r} y={y(goal) - 5} textAnchor="end" className="ch-goal">Goal {goal}</text></g> : null}
      {points.map((p, i) => <g key={i} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
        <rect x={PAD.l + i * slot} y={PAD.t} width={slot} height={H - PAD.t - PAD.b} fill="transparent"/>
        <rect x={PAD.l + i * slot + (slot - bw) / 2} y={y(p.value)} width={bw} height={Math.max(0, y(0) - y(p.value))} rx="3"
          fill={goal && p.value >= goal ? 'var(--accent)' : 'color-mix(in srgb, var(--accent) 40%, transparent)'} opacity={hover == null || hover === i ? 1 : 0.55}/>
      </g>)}
    </svg>
  </div>;
}

export interface Slice { label: string; value: number; color: string }

/** Donut with a legend (values and shares are listed as text too). */
export function Donut({ slices, label, center }: { slices: Slice[]; label: string; center: string }) {
  const total = slices.reduce((n, s) => n + s.value, 0) || 1;
  const R = 52, C = 2 * Math.PI * R;
  let off = 0;
  return <div className="donut">
    <svg viewBox="0 0 140 140" role="img" aria-label={label} width="150" height="150">
      <circle cx="70" cy="70" r={R} fill="none" stroke="var(--track)" strokeWidth="16"/>
      {slices.filter((s) => s.value > 0).map((s) => { const len = (s.value / total) * C; const el = <circle key={s.label} cx="70" cy="70" r={R} fill="none" stroke={s.color} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} transform="rotate(-90 70 70)"/>; off += len; return el; })}
      <text x="70" y="75" textAnchor="middle" className="donut-center">{center}</text>
    </svg>
    <ul className="legend">{slices.map((s) => <li key={s.label}><i style={{ background: s.color }}/>{s.label}<b>{s.value.toLocaleString()}</b><small>{Math.round((s.value / total) * 100)}%</small></li>)}</ul>
  </div>;
}

/** Horizontal stacked bars: one row per item. The first part is shown as the "learned" count. */
export function StackedRows({ rows }: { rows: { name: string; parts: { value: number; color: string; label: string }[]; total: number }[] }) {
  return <div className="stk">{rows.map((r) => <div key={r.name} className="stk-row">
    <div className="stk-head"><strong>{r.name}</strong><span>{r.parts[0]?.value ?? 0} / {r.total} learned</span></div>
    <div className="stk-bar" role="img" aria-label={`${r.name}: ${r.parts.map((p) => `${p.value} ${p.label}`).join(', ')} of ${r.total}`}>
      {r.parts.map((p) => <i key={p.label} title={`${p.label}: ${p.value}`} style={{ width: `${r.total ? (p.value / r.total) * 100 : 0}%`, background: p.color }}/>)}
    </div>
  </div>)}</div>;
}
