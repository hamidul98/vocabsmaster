/** Butterflies (projapoti) that flutter around the hero banner. Pure CSS motion: wings flap, bodies drift on looping paths. */
function Butterfly({ className }: { className: string }) {
  return <span className={`bf ${className}`} aria-hidden="true">
    <svg viewBox="0 0 40 32" width="100%" height="100%">
      <g className="wing wl">
        <path d="M20 15C13 1 2 2 3 11c1 6 9 7 17 5Z"/>
        <path d="M20 17C13 17 6 19 8 25c2 6 10 1 12-6Z" className="low"/>
        <circle cx="10" cy="9.5" r="2.6" className="dot"/>
      </g>
      <g className="wing wr">
        <path d="M20 15C27 1 38 2 37 11c-1 6-9 7-17 5Z"/>
        <path d="M20 17C27 17 34 19 32 25c-2 6-10 1-12-6Z" className="low"/>
        <circle cx="30" cy="9.5" r="2.6" className="dot"/>
      </g>
      <ellipse cx="20" cy="17" rx="1.5" ry="7" className="body"/>
      <path d="M19.4 10.5C18 6.8 16.3 5.5 15 5.4M20.6 10.5C22 6.8 23.7 5.5 25 5.4" className="feeler"/>
    </svg>
  </span>;
}

export default function Butterflies() {
  return <>
    <div className="hero-fly" aria-hidden="true">
      <Butterfly className="bf1"/><Butterfly className="bf2"/><Butterfly className="bf3"/>
    </div>
    <div className="hero-fly front" aria-hidden="true"><Butterfly className="bf4"/></div>
  </>;
}
