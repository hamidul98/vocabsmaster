import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Button, Card, Input, Label, TextField } from '@heroui/react';
import { PreferenceSwitch } from '@/components/Study';
import { Mascot } from '@/components/art';
import { Icon } from '@/components/ui';
import { load, save } from '@/lib/storage';
import { useProgress } from '@/lib/progress';
import { useAuth } from '@/lib/sync';
import type { usePwa } from '@/hooks/usePwa';

export default function SettingsPage() {
  const { theme, toggleTheme, pwa } = useOutletContext<{ theme: string; toggleTheme: () => void; pwa: ReturnType<typeof usePwa> }>();
  const [hide, setHide] = useState(() => load('hideMeanings', false));
  const [confirm, setConfirm] = useState(false);
  const { enabled, user, loading, status, signIn, signOut } = useAuth();
  const { reset, name, setName, goal, setGoal, level, xp } = useProgress();
  return <div className="settings-page">
    <div className="profile-head"><Mascot size={84} /><div><h1>{name || 'Learner'}</h1><p className="muted">Level {level} · {xp.toLocaleString()} XP</p></div></div>
    <div className="settings-grid">
      <Card className="settings-card account-card"><Card.Header><Icon name="cloud_sync" /><h2>Account &amp; sync</h2></Card.Header><Card.Content>
        {!enabled ? <p>Google sign-in isn’t set up yet. Your progress is saved on this device only.</p>
          : loading ? <p className="muted">Checking sign-in…</p>
          : user ? <>
            <div className="account-row">{user.photoURL && <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="account-photo" />}<div><h3>{user.displayName}</h3><p className="muted">{user.email}</p></div></div>
            <p className={`sync-status ${status}`} role="status"><Icon name={status === 'error' ? 'sync_problem' : status === 'syncing' ? 'sync' : 'cloud_done'} size={18} />{status === 'error' ? 'Couldn’t sync. Check your internet; changes are kept on this device.' : status === 'syncing' ? 'Syncing…' : 'Synced. Learned words, difficult words, colour marks and XP are the same on every device.'}</p>
            <Button variant="secondary" onPress={signOut}>Sign out</Button>
          </> : <>
            <p>Sign in with Google to keep your learned words, difficult words, colour marks and XP the same on every phone, PC and browser.</p>
            <Button className="google-btn" onPress={() => { signIn().catch(() => {}); }}><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Continue with Google</Button>
          </>}
      </Card.Content></Card>

      <Card className="settings-card"><Card.Header><Icon name="profile" /><h2>Profile</h2></Card.Header><Card.Content>
        <TextField value={name} onChange={setName} className="name-field"><Label>Your name</Label><Input placeholder="Learner" maxLength={24} /></TextField>
        <div className="setting-row"><div><h3>Daily goal</h3><p>Words reviewed per day</p></div>
          <div className="goal-options">{[10, 20, 30, 50].map((n) => <Button key={n} size="sm" className="pill" variant={goal === n ? 'primary' : 'secondary'} onPress={() => setGoal(n)}>{n}</Button>)}</div></div>
      </Card.Content></Card>

      <Card className="settings-card"><Card.Header><Icon name="settings" /><h2>Study preferences</h2></Card.Header><Card.Content>
        <div className="setting-row"><div><h3>Dark mode</h3><p>A softer screen for evening study.</p></div><PreferenceSwitch label="Dark mode" selected={theme === 'dark'} onChange={toggleTheme} /></div>
        <div className="setting-row"><div><h3>Hide meanings by default</h3><p>Recall the meaning before you reveal it.</p></div><PreferenceSwitch label="Hide meanings" selected={hide} onChange={(v) => { setHide(v); save('hideMeanings', v); }} /></div>
        <div className="setting-row"><div><h3>Book cover style</h3><p>Choose from three reusable IELTS cover templates.</p></div><Link className="text-link" to="/cover-templates">Compare styles <Icon name="arrow" size={17}/></Link></div>
      </Card.Content></Card>

      <Card className="settings-card"><Card.Header><Icon name="phone" /><h2>Get the App</h2></Card.Header><Card.Content>
        <p>Install on your phone and study offline. Passages you have opened stay available without internet.</p>
        {pwa.canInstall ? <Button className="pill" onPress={pwa.install}>Install</Button> : <p className="install-hint">{pwa.showIosHint ? 'On iPhone: tap Share, then Add to Home Screen.' : 'Use your browser menu, then Install app (or Add to Home Screen).'}</p>}
      </Card.Content></Card>

      <Card className="settings-card"><Card.Header><Icon name="file" /><h2>Vocabulary source</h2></Card.Header><Card.Content>
        <p>Your library comes from the connected Google Sheet. New books and passages appear when you refresh.</p>
        <a className="text-link" href="https://docs.google.com/spreadsheets/d/1Ph7Ml5KwrkyfNE_zGNDEWhbzHAAyuMoNnaCSmSuSf7Q/edit" target="_blank" rel="noreferrer">Open vocabulary sheet <Icon name="arrow" size={17} /></a>
      </Card.Content></Card>

      <Card className="settings-card"><Card.Header><Icon name="back" /><h2>Reset progress</h2></Card.Header><Card.Content>
        <p>Clear learned words, difficult words, colour marks, XP and streak{user ? ' on all your signed-in devices' : ' on this device'}.</p>
        {confirm ? <div className="reset-confirm"><p>This will clear all your progress. Continue?</p><Button variant="danger" onPress={() => { reset(); setConfirm(false); }}>Yes, reset</Button><Button variant="tertiary" onPress={() => setConfirm(false)}>Cancel</Button></div>
          : <Button variant="secondary" onPress={() => setConfirm(true)}>Reset progress</Button>}
      </Card.Content></Card>
    </div>
  </div>;
}
