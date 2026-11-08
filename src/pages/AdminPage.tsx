import { Link, Navigate } from 'react-router-dom';
import { Button, Card, toast } from '@heroui/react';
import { useLibrary } from '@/hooks/useLibrary';
import { usePassageStats } from '@/hooks/useStats';
import { useProgress } from '@/lib/progress';
import { useAuth } from '@/lib/sync';
import { Icon, Loading } from '@/components/ui';

const STATUS_TEXT = { off: 'Not syncing', syncing: 'Syncing…', synced: 'Synced', error: 'Sync error' } as const;

/** Admin-only tools. The sidebar link and this route are hidden from everyone else. */
export default function AdminPage() {
  const { user, loading, isAdmin, status } = useAuth();
  const { index, incomplete, errors, passages, refresh, loadAll, loadingAll } = useLibrary();
  const { syncData } = useProgress();
  const stats = usePassageStats();

  if (loading) return <Loading/>;
  if (!isAdmin) return <Navigate to="/" replace/>;

  const loaded = Object.keys(passages).length;
  const words = stats.reduce((n, s) => n + s.count, 0);
  const failed = Object.entries(errors);

  const doRefresh = async () => {
    const r = await refresh();
    toast(r.ok ? `Sheet refreshed: ${r.passages} passages${r.added ? `, ${r.added} new` : ''}.` : 'Could not reach the sheet.');
  };
  const exportProgress = () => {
    const blob = new Blob([JSON.stringify(syncData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vocabs-master-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const facts = [
    { l: 'Signed in as', v: user?.email ?? '—' },
    { l: 'Cloud sync', v: STATUS_TEXT[status] },
    { l: 'Passages in sheet', v: index?.length ?? '…' },
    { l: 'Passages loaded', v: `${loaded} / ${index?.length ?? 0}` },
    { l: 'Words (loaded)', v: words.toLocaleString() },
    { l: 'Sheet rows with problems', v: incomplete.length + failed.length },
  ];

  return <div className="admin-page">
    <div className="page-title"><h1>Admin Features <span className="admin-badge">Admin</span></h1><p>Only you can see this page.</p></div>

    <div className="kpi-row">{facts.map((f) => <div key={f.l} className="kpi"><strong className="kpi-sm">{f.v}</strong><small>{f.l}</small></div>)}</div>

    <div className="two-col even">
      <Card className="chart-card"><h2>Sheet tools</h2>
        <p className="muted">Re-read the Google Sheet or preload every passage to check them all.</p>
        <div className="admin-actions">
          <Button className="pill" onPress={() => void doRefresh()}><Icon name="refresh" size={18}/>Refresh sheet</Button>
          <Button variant="secondary" isDisabled={loadingAll} onPress={loadAll}><Icon name="download" size={18}/>{loadingAll ? 'Loading…' : 'Load all passages'}</Button>
        </div>
      </Card>
      <Card className="chart-card"><h2>Data &amp; shortcuts</h2>
        <p className="muted">Back up your own progress, or open pages that are not in the menu.</p>
        <div className="admin-actions">
          <Button variant="secondary" onPress={exportProgress}><Icon name="file" size={18}/>Export my progress (JSON)</Button>
          <Link to="/cover-templates" className="tbl-link admin-link"><Icon name="palette" size={18}/>Cover templates</Link>
        </div>
      </Card>
    </div>

    <Card className="chart-card"><h2>Sheet problems</h2>
      {incomplete.length + failed.length === 0 ? <p className="muted">No problems found. Every row in the Main tab is complete and every loaded passage opened fine.</p> : <div className="table-wrap flat"><table className="lib-table">
        <thead><tr><th>Where</th><th>Problem</th></tr></thead>
        <tbody>
          {incomplete.map((r, i) => <tr key={`i${i}`}><td>{r.bookName || '(no name)'}</td><td>Missing {r.missing.join(', ')}</td></tr>)}
          {failed.map(([slug, e]) => <tr key={slug}><td>{slug}</td><td>{e.message}</td></tr>)}
        </tbody></table></div>}
    </Card>
  </div>;
}
