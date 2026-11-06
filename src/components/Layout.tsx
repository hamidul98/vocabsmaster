import { useEffect, useState, type FormEvent } from 'react';
import { Button, Toast, toast } from '@heroui/react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { usePwa } from '@/hooks/usePwa';
import { useLibrary } from '@/hooks/useLibrary';
import { useProgress } from '@/lib/progress';
import { load, save } from '@/lib/storage';
import { Icon, SearchInput } from './ui';
import { Confetti } from './art';

const links = [
  { to: '/', name: 'Home', icon: 'home' },
  { to: '/library', name: 'Library', icon: 'library' },
  { to: '/practice', name: 'Practice', icon: 'practice' },
  { to: '/difficult', name: 'Difficult Words', icon: 'star' },
  { to: '/progress', name: 'Progress', icon: 'progress' },
  { to: '/search', name: 'Search', icon: 'search' },
];
const mobileLinks = [
  { to: '/', name: 'Home', icon: 'home' },
  { to: '/library', name: 'Library', icon: 'library' },
  { to: '/practice', name: 'Practice', icon: 'practice' },
  { to: '/difficult', name: 'Difficult', icon: 'star' },
  { to: '/settings', name: 'Profile', icon: 'profile' },
];

export default function Layout() {
  const { toggle, theme } = useTheme();
  const pwa = usePwa();
  const { index } = useLibrary();
  const { streak, xp, level, name } = useProgress();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [seen, setSeen] = useState<number>(() => load('seenCount', 0));
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);

  // First visit: don't flag everything as new.
  useEffect(() => { if (index && load<number | null>('seenCount', null) === null) { save('seenCount', index.length); setSeen(index.length); } }, [index]);
  const unseen = index ? Math.max(0, index.length - seen) : 0;
  const openBell = () => {
    if (!index) return;
    toast(unseen ? `${unseen} new passage${unseen > 1 ? 's' : ''} added to your library` : 'No new passages since your last visit');
    save('seenCount', index.length); setSeen(index.length);
  };
  const submitSearch = (e: FormEvent) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(q.trim())}`); };

  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const initials = name.trim().split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase() || 'L';
  const Brand = <Link to="/" className="brand"><img className="brand-mark" src="brand-icon.svg" alt="" width={32} height={32}/><span className="brand-text"><strong>Vocabs Master</strong><small>IELTS Book Vocab</small></span></Link>;
  const Stats = <div className="top-stats">
    <span className="stat-pill flame" title="Day streak"><Icon name="flame" size={22} filled/>{streak}</span>
    <span className="stat-pill gem" title="XP"><Icon name="gem" size={22} filled/>{xp.toLocaleString()}</span>
    <Button isIconOnly variant="outline" aria-label={unseen ? `Notifications, ${unseen} new` : 'Notifications'} onPress={openBell} className="bell">
      <Icon name="bell"/>{unseen > 0 && <span className="dot"/>}
    </Button>
    <Button isIconOnly variant="outline" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onPress={toggle}><Icon name={theme === 'light' ? 'moon' : 'sun'}/></Button>
  </div>;

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      {Brand}
      <nav aria-label="Main navigation" className="sidebar-nav">{links.map((l) => <NavLink key={l.to} to={l.to} end={l.to === '/'} title={l.name}><Icon name={l.icon} size={22}/><span className="nav-label">{l.name}</span></NavLink>)}</nav>
      <div className="sidebar-foot">
        <div className="install-card">
          <span className="install-icon"><Icon name={standalone ? 'offline' : 'phone'} size={24}/></span>
          {standalone
            ? <><strong>Study offline <Icon name="check" size={16} filled/></strong><p>All saved passages work without internet.</p></>
            : <><strong>Get the App</strong><p>Install on your phone and study offline.</p>
              {pwa.canInstall
                ? <Button fullWidth className="pill" onPress={pwa.install}>Install</Button>
                : <p className="install-note">{pwa.showIosHint ? 'Tap Share, then Add to Home Screen' : 'Use your browser menu, then Install app'}</p>}</>}
        </div>
        <div className="profile-row">
          <span className="avatar" aria-hidden="true">{initials}</span>
          <div><strong>{name}</strong><small>Level {level}</small></div>
          <Link to="/settings" aria-label="Settings" className="gear"><Icon name="settings"/></Link>
        </div>
      </div>
    </aside>
    <div className="app-content">
      <header className="topbar">
        <div className="topbar-brand">{Brand}</div>
        <form className="topbar-search" onSubmit={submitSearch} role="search">
          <SearchInput value={q} onChange={setQ} placeholder="Search words, passages…"/>
        </form>
        <Link to="/search" className="topbar-search-icon" aria-label="Search"><Icon name="search" size={24}/></Link>
        {Stats}
      </header>
      {!pwa.online && <div className="offline-pill" role="status">Offline – showing saved words</div>}
      {pwa.needRefresh && <div className="notice" role="status">Update available. <Button size="sm" onPress={pwa.reloadForUpdate}>Reload</Button></div>}
      <main id="main" className="main-container"><Outlet context={{ theme, toggleTheme: toggle, pwa }}/></main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation">{mobileLinks.map((l) => <NavLink key={l.to} to={l.to} end={l.to === '/'}><Icon name={l.icon} size={24}/><span>{l.name}</span></NavLink>)}</nav>
    <Toast.Provider/>
    <Confetti/>
  </div>;
}
