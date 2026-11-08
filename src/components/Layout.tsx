import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { useAuth } from '@/lib/sync';
import { useNewDriveCount } from '@/lib/driveHistory';
import { Button, Toast, toast } from '@heroui/react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { usePwa } from '@/hooks/usePwa';
import { useLibrary } from '@/hooks/useLibrary';
import { useProgress } from '@/lib/progress';
import { load, save } from '@/lib/storage';
import { Icon, SearchInput } from './ui';
import { Confetti } from './art';
import { Button as AriaButton, Header, Menu, MenuItem, MenuSection, MenuTrigger, Popover, Separator } from 'react-aria-components';

const links = [
  { to: '/', name: 'Home', icon: 'home' },
  { to: '/library', name: 'Library', icon: 'library' },
  { to: '/practice', name: 'Practice', icon: 'practice' },
  { to: '/difficult', name: 'Difficult Words', icon: 'star' },
  { to: '/progress', name: 'Analytics', icon: 'progress' },
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
  const { toggle, theme, setTheme } = useTheme();
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
  // which bottom tab is active (a passage page belongs to Library; Search/Progress have no tab)
  const activeTab = mobileLinks.findIndex((l) => (l.to === '/' ? pathname === '/' : pathname === l.to || pathname.startsWith(`${l.to}/`)))
    >= 0 ? mobileLinks.findIndex((l) => (l.to === '/' ? pathname === '/' : pathname === l.to || pathname.startsWith(`${l.to}/`)))
    : /^\/\d+-T\d+/.test(pathname) ? 1 : -1;
  const unseen = index ? Math.max(0, index.length - seen) : 0;
  const openBell = () => {
    if (!index) return;
    toast(unseen ? `${unseen} new passage${unseen > 1 ? 's' : ''} added to your library` : 'No new passages since your last visit');
    save('seenCount', index.length); setSeen(index.length);
  };
  const submitSearch = (e: FormEvent) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(q.trim())}`); };

  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  const { user, signOut, isAdmin } = useAuth();
  const newDrive = useNewDriveCount(isAdmin);
  const initials = name.trim().split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase() || 'L';
  const Brand = <Link to="/" className="brand"><img className="brand-mark" src="brand-icon.svg" alt="" width={32} height={32}/><span className="brand-text"><strong>Vocabs Master</strong><small>IELTS Book Vocab</small></span>{isAdmin && <span className="admin-badge">Admin</span>}</Link>;
  const Stats = <div className="top-stats">
    <span className="stat-pill flame" title="Day streak"><Icon name="flame" size={22} filled/>{streak}</span>
    <span className="stat-pill gem" title="XP"><Icon name="gem" size={22} filled/>{xp.toLocaleString()}</span>
    <Button isIconOnly variant="outline" aria-label={unseen ? `Notifications, ${unseen} new` : 'Notifications'} onPress={openBell} className="bell">
      <Icon name="bell"/>{unseen > 0 && <span className="dot"/>}
    </Button>
    <Button isIconOnly variant="outline" className="top-theme" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onPress={toggle}><Icon name={theme === 'light' ? 'moon' : 'sun'}/></Button>
  </div>;

  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="topbar">
      <div className="topbar-brand">{Brand}</div>
      <form className="topbar-search" onSubmit={submitSearch} role="search">
        <SearchInput value={q} onChange={setQ} placeholder="Search words, passages…"/>
      </form>
      <Link to="/search" className="topbar-search-icon" aria-label="Search"><Icon name="search" size={24}/></Link>
      {Stats}
    </header>
    <aside className="sidebar" aria-label="Sidebar">
      <div className="theme-seg" role="group" aria-label="Theme">
        <Button isIconOnly size="sm" variant="ghost" className="theme-opt" aria-label="Light theme" aria-pressed={theme === 'light'} onPress={() => setTheme('light')}><Icon name="sun" size={20} filled={theme === 'light'}/></Button>
        <Button isIconOnly size="sm" variant="ghost" className="theme-opt" aria-label="Dark theme" aria-pressed={theme === 'dark'} onPress={() => setTheme('dark')}><Icon name="moon" size={20} filled={theme === 'dark'}/></Button>
      </div>
      <nav aria-label="Main navigation" className="sidebar-nav">{[...links, ...(isAdmin ? [{ to: '/admin', name: 'Admin Features', icon: 'admin_panel_settings' }] : [])].map((l) => <NavLink key={l.to} to={l.to} end={l.to === '/'} title={l.name} aria-label={l.name}><Icon name={l.icon} size={22}/><span className="nav-label">{l.name}</span>{l.to === '/admin' && newDrive > 0 && <span className="nav-dot" role="status" aria-label={`${newDrive} new files in Drive`}/>}</NavLink>)}</nav>
      <div className="sidebar-foot">
        <button type="button" className="rail-btn" title={standalone ? 'Installed — works offline' : pwa.canInstall ? 'Install the app' : pwa.showIosHint ? 'Install: tap Share, then Add to Home Screen' : 'Install: use your browser menu, then Install app'}
          aria-label={standalone ? 'App installed, works offline' : 'Install the app'} onClick={() => (pwa.canInstall ? void pwa.install() : navigate('/settings'))}><Icon name={standalone ? 'offline' : 'phone'} size={22}/></button>
        <Link to="/settings" className="rail-btn" title="Settings" aria-label="Settings"><Icon name="settings" size={22}/></Link>
        <MenuTrigger>
          <AriaButton className="avatar" aria-label={`Account menu: ${name}, level ${level}`}>{user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="avatar-img"/> : initials}</AriaButton>
          <Popover placement="right bottom" offset={12} className="account-popover">
            <Menu className="account-menu" aria-label="Account" onAction={(key) => { if (key === 'settings') navigate('/settings'); if (key === 'signout') void signOut(); }}>
              <MenuSection>
                <Header className="account-menu-head">{user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer"/> : <span className="avatar">{initials}</span>}<div><strong>{user?.displayName || name}</strong>{user?.email && <small>{user.email}</small>}<small>Level {level} · {xp.toLocaleString()} XP</small></div></Header>
              </MenuSection>
              <Separator className="account-menu-sep"/>
              <MenuItem id="settings" className="account-menu-item"><Icon name="settings" size={20}/>Profile &amp; settings</MenuItem>
              {user && <MenuItem id="signout" className="account-menu-item danger"><Icon name="logout" size={20}/>Sign out</MenuItem>}
            </Menu>
          </Popover>
        </MenuTrigger>
      </div>
    </aside>
    <div className="app-content">
      {!pwa.online && <div className="offline-pill" role="status">Offline – showing saved words</div>}
      {pwa.needRefresh && <div className="notice" role="status">Update available. <Button size="sm" onPress={pwa.reloadForUpdate}>Reload</Button></div>}
      <main id="main" className="main-container"><Outlet context={{ theme, toggleTheme: toggle, pwa }}/></main>
    </div>
    <nav className="mobile-nav" aria-label="Mobile navigation" data-active={activeTab < 0 ? 'none' : 'on'} style={{ '--i': Math.max(activeTab, 0) } as CSSProperties}>
      <div className="mn-bar" aria-hidden="true"/>
      <span className="mn-bubble" aria-hidden="true"><Icon name={mobileLinks[Math.max(activeTab, 0)].icon} size={26} filled/></span>
      {mobileLinks.map((l, i) => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive || i === activeTab ? 'active' : '')}><Icon name={l.icon} size={24}/><span>{l.name}</span></NavLink>)}
    </nav>
    <Toast.Provider/>
    <Confetti/>
  </div>;
}
