import { useState } from 'react';
import { Button, Card, toast } from '@heroui/react';
import { useLibrary } from '@/hooks/useLibrary';
import { MAIN_TAB } from '@/lib/sheet';
import { Icon } from './ui';

/**
 * Tells you exactly what to fix in the Google Sheet:
 *  - Main-tab rows without TEST NO / PASSAGE NUMBER (they can't be shown yet)
 *  - Main-tab rows whose passage tab doesn't exist (shows the exact tab name to create)
 */
export default function SheetNotices() {
  const { incomplete, index, errors, refresh } = useLibrary();
  const [busy, setBusy] = useState(false);
  const check = async () => {
    setBusy(true);
    const r = await refresh();
    setBusy(false);
    if (!r.ok) toast.danger('Could not reach the Google Sheet. Check your internet and that it is shared as "Anyone with the link – Viewer".');
    else if (r.added) toast.success(`Found ${r.added} new passage${r.added > 1 ? 's' : ''}.`);
    else if (r.incomplete) toast(`Checked the sheet. ${r.incomplete} row${r.incomplete > 1 ? 's are' : ' is'} still incomplete. Google can take a minute to publish edits, so try again shortly.`);
    else toast.success('Checked the sheet. Everything is up to date.');
  };
  const missingTabs = (index ?? []).filter((r) => errors[r.slug]).map((r) => r.tabName);
  if (!incomplete.length && !missingTabs.length) return null;
  return <Card className="sheet-notice" role="status">
    <span className="sheet-notice-icon"><Icon name="info" size={22} filled/></span>
    <div className="sheet-notice-body">
      <strong>Some items in your Google Sheet need attention</strong>
      <ul>
        {incomplete.map((r, i) => <li key={`i${i}`}><b>{r.bookName}</b> is in the “{MAIN_TAB}” tab but is missing <b>{r.missing.join(' and ')}</b>. Fill in the {r.missing.length > 1 ? 'cells' : 'cell'} to show it here.</li>)}
        {missingTabs.map((t) => <li key={t}>No tab named <b>“{t}”</b> was found. Create a tab with exactly this name (the words go inside it).</li>)}
      </ul>
    </div>
    <Button size="sm" variant="secondary" className="pill" isDisabled={busy} onPress={check}><Icon name="refresh" size={16}/>{busy ? 'Checking…' : 'Refresh'}</Button>
  </Card>;
}
