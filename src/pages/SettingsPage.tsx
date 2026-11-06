import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Button, Card, Input, Label, TextField } from '@heroui/react';
import { PreferenceSwitch } from '@/components/Study';
import { Mascot } from '@/components/art';
import { Icon } from '@/components/ui';
import { load, save } from '@/lib/storage';
import { useProgress } from '@/lib/progress';
import type { usePwa } from '@/hooks/usePwa';

export default function SettingsPage() {
  const { theme, toggleTheme, pwa } = useOutletContext<{ theme: string; toggleTheme: () => void; pwa: ReturnType<typeof usePwa> }>();
  const [hide, setHide] = useState(() => load('hideMeanings', false));
  const [confirm, setConfirm] = useState(false);
  const { reset, name, setName, goal, setGoal, level, xp } = useProgress();
  return <div className="settings-page">
    <div className="profile-head"><Mascot size={84} /><div><h1>{name || 'Learner'}</h1><p className="muted">Level {level} · {xp.toLocaleString()} XP</p></div></div>
    <div className="settings-grid">
      <Card className="settings-card"><Card.Header><Icon name="profile" /><h2>Profile</h2></Card.Header><Card.Content>
        <TextField value={name} onChange={setName} className="name-field"><Label>Your name</Label><Input placeholder="Learner" maxLength={24} /></TextField>
        <div className="setting-row"><div><h3>Daily goal</h3><p>Words reviewed per day</p></div>
          <div className="goal-options">{[10, 20, 30, 50].map((n) => <Button key={n} size="sm" className="pill" variant={goal === n ? 'primary' : 'secondary'} onPress={() => setGoal(n)}>{n}</Button>)}</div></div>
      </Card.Content></Card>

      <Card className="settings-card"><Card.Header><Icon name="settings" /><h2>Study preferences</h2></Card.Header><Card.Content>
        <div className="setting-row"><div><h3>Dark mode</h3><p>A softer screen for evening study.</p></div><PreferenceSwitch label="Dark mode" selected={theme === 'dark'} onChange={toggleTheme} /></div>
        <div className="setting-row"><div><h3>Hide meanings by default</h3><p>Recall the meaning before you reveal it.</p></div><PreferenceSwitch label="Hide meanings" selected={hide} onChange={(v) => { setHide(v); save('hideMeanings', v); }} /></div>
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
        <p>Clear learned words, difficult words, XP and streak on this device.</p>
        {confirm ? <div className="reset-confirm"><p>This will clear all your progress. Continue?</p><Button variant="danger" onPress={() => { reset(); setConfirm(false); }}>Yes, reset</Button><Button variant="tertiary" onPress={() => setConfirm(false)}>Cancel</Button></div>
          : <Button variant="secondary" onPress={() => setConfirm(true)}>Reset progress</Button>}
      </Card.Content></Card>
    </div>
  </div>;
}
