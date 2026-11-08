import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/sync';
import { lastSeen, useDriveHistory, useMarkSeen, type HistoryItem } from '@/lib/driveHistory';
import { KIND_ICON, guessKind } from '@/components/adminBits';
import { Icon, Loading } from '@/components/ui';
import { SKILLS, useStarterResources } from './AdminPage';

const when = (t: number) => {
  const d = new Date(t);
  const days = Math.floor((Date.now() - t) / 86_400_000);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return days <= 0 ? `Today, ${time}` : days === 1 ? `Yesterday, ${time}` : `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}, ${time}`;
};
const typeUrl = (it: HistoryItem) =>
  it.type === 'folder' ? `https://drive.google.com/drive/folders/${it.id}`
    : it.type === 'doc' ? `https://docs.google.com/document/d/${it.id}/edit`
    : it.type === 'sheet' ? `https://docs.google.com/spreadsheets/d/${it.id}/edit`
    : it.type === 'slides' ? `https://docs.google.com/presentation/d/${it.id}/edit`
    : `https://drive.google.com/file/d/${it.id}/view`;

/** Admin only: everything that was added to the linked Drive folders, newest first. */
export default function AdminHistoryPage() {
  const { loading, isAdmin } = useAuth();
  const history = useDriveHistory();
  const markSeen = useMarkSeen();
  // remember what was new when the page opened, so it stays highlighted during this visit
  const [seenAtOpen] = useState(lastSeen);
  useStarterResources(isAdmin);
  useEffect(() => { if (history) markSeen(); }, [history, markSeen]);

  if (loading || (isAdmin && !history)) return <Loading/>;
  if (!isAdmin) return <Navigate to="/" replace/>;
  const entries = history?.entries ?? [];
  const since = history?.since ? new Date(history.since).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  return <div className="admin-page">
    <div className="page-title"><nav className="crumbs" aria-label="Breadcrumb"><Link to="/admin">Admin Features</Link><Icon name="chevron" size={16}/><strong>What’s new</strong></nav>
      <h1>What’s new in Drive</h1><p>New files and folders found in your linked Drive folders{since ? `, tracked since ${since}` : ''}. Checked every 3 hours.</p></div>

    {entries.length === 0 ? <div className="setup-note"><strong>Nothing new yet</strong><span>When someone uploads to a linked Drive folder, it shows up here with the date and where it was added.</span></div>
      : entries.map((e) => <section key={e.at} className="wf-section hist-entry" aria-label={when(e.at)}>
        <h2 className="wf-title">{when(e.at)}<span className="count-pill">{e.files} new {e.files === 1 ? 'file' : 'files'}</span>
          {e.at > Math.max(seenAtOpen, history?.since ?? 0) && <span className="new-pill">New</span>}</h2>
        <ul className="hist-list">{e.added.map((it) => {
          const skill = SKILLS.find((s) => s.id === it.skill);
          const trail = it.type === 'folder' ? [...it.path, { id: it.id, name: it.name }] : it.path;
          const dest = it.type === 'folder' ? it.id : it.in;
          return <li key={it.id} className="hist-item">
            <span className={`file-icon ${it.type === 'folder' ? '' : guessKind(it.name)}`}><Icon name={it.type === 'folder' ? 'folder' : KIND_ICON[guessKind(it.name)]} size={20} filled/></span>
            <div className="hist-main">
              <strong>{it.name}</strong>
              <span className="hist-path">{skill?.name ?? 'Others'}{it.path.length ? ` › ${it.path.map((p) => p.name).join(' › ')}` : ''}</span>
            </div>
            <div className="res-tools">
              {skill && <Link className="tbl-link" to={`/admin/${skill.id}/d/${dest}`} state={{ trail }}>{it.type === 'folder' ? 'Open folder' : 'See in folder'}</Link>}
              <a className="tbl-link file-open" href={typeUrl(it)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${it.name} in Drive`}>Drive<Icon name="external" size={14}/></a>
            </div>
          </li>;
        })}</ul>
        {e.more > 0 && <p className="muted">…and {e.more} more.</p>}
        {e.removed > 0 && <p className="muted">{e.removed} {e.removed === 1 ? 'item was' : 'items were'} removed or moved.</p>}
      </section>)}
  </div>;
}
