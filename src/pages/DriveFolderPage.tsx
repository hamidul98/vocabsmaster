import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Button } from '@heroui/react';
import { driveEnabled, useDriveFolder } from '@/lib/drive';
import { useProgress } from '@/lib/progress';
import { useAuth } from '@/lib/sync';
import { FileRow } from '@/components/adminBits';
import { Icon, Loading, SearchInput } from '@/components/ui';
import { SKILLS, useStarterResources } from './AdminPage';

interface Crumb { id: string; name: string }
const PAGE = 120;
const TONES = ['lavender', 'sky', 'peach', 'mint', 'rose'] as const;

/** A linked Google Drive folder, read live: sub-folders open in place and new uploads appear without any import. */
export default function DriveFolderPage() {
  const { skill: param, folderId } = useParams();
  const { state } = useLocation() as { state: { trail?: Crumb[] } | null };
  const { loading, isAdmin } = useAuth();
  const { resources } = useProgress();
  const { items, error, loading: busy, at, saved, refresh } = useDriveFolder(folderId);
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(PAGE);
  useStarterResources(isAdmin);

  const skill = SKILLS.find((s) => s.id === param);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (items ?? []).filter((e) => !t || e.name.toLowerCase().includes(t));
  }, [items, q]);

  if (loading) return <Loading/>;
  if (!isAdmin) return <Navigate to="/" replace/>;
  if (!skill || !folderId) return <Navigate to="/admin" replace/>;

  // trail comes from navigation; after a reload we fall back to the linked folder's own name
  const root = (resources[skill.id] ?? []).find((r) => r.driveId === folderId);
  const trail: Crumb[] = state?.trail?.length ? state.trail : [{ id: folderId, name: root?.title ?? 'Drive folder' }];
  const here = trail[trail.length - 1];
  const folders = shown.filter((e) => e.folder);
  const files = shown.filter((e) => !e.folder);

  return <div className="admin-page">
    <div className="page-title"><nav className="crumbs" aria-label="Breadcrumb"><Link to="/admin">Admin Features</Link><Icon name="chevron" size={16}/><Link to={`/admin/${skill.id}`}>{skill.name}</Link>
      {trail.map((c, i) => <span key={`${c.id}-${i}`} className="crumb-part"><Icon name="chevron" size={16}/>{i === trail.length - 1 ? <strong>{c.name}</strong>
        : <Link to={`/admin/${skill.id}/d/${c.id}`} state={{ trail: trail.slice(0, i + 1) }}>{c.name}</Link>}</span>)}</nav>
      <h1>{here.name}</h1><p>Read live from Google Drive · new uploads appear automatically</p></div>

    {!driveEnabled && !items && <div className="setup-note" role="note">
      <strong>Connect Google Drive to see the files here</strong>
      <ol>
        <li>In Google Cloud Console, enable <b>Google Drive API</b> and create an <b>API key</b> (restrict it to this website).</li>
        <li>Put it in <code>.env.local</code> as <code>VITE_DRIVE_API_KEY=your-key</code> and restart.</li>
        <li>Make sure the folder is shared as <b>Anyone with the link</b>.</li>
      </ol>
      <a href={`https://drive.google.com/drive/folders/${folderId}`} target="_blank" rel="noopener noreferrer" className="tbl-link admin-link">Open this folder in Drive<Icon name="external" size={14}/></a>
    </div>}

    {saved && <p className="muted" role="note">Saved copy from {new Date(at).toLocaleDateString()}. To see newer uploads run <code>npm run sync:drive</code>, or add a Drive API key for live updates.</p>}

    {(driveEnabled || !!items) && <div className="drive-bar">
      <SearchInput value={q} onChange={(v) => { setQ(v); setLimit(PAGE); }} placeholder="Search in this folder…"/>
      {driveEnabled && <Button size="sm" variant="secondary" isDisabled={busy} onPress={() => void refresh()}><Icon name="refresh" size={18}/>{busy ? 'Syncing…' : 'Sync now'}</Button>}
      <a href={`https://drive.google.com/drive/folders/${folderId}`} target="_blank" rel="noopener noreferrer" className="tbl-link admin-link">Open in Drive<Icon name="external" size={14}/></a>
      {at > 0 && !saved && <span className="muted">Updated {new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
    </div>}

    {error && <div className="setup-note" role="alert"><strong>Could not load this folder</strong><span>{error}</span></div>}
    {!items && busy && <Loading/>}

    {items && <>
      {folders.length > 0 && <section className="wf-section" aria-labelledby="sub-h">
        <h2 id="sub-h" className="wf-title">Folders <span className="count-pill">{folders.length}</span></h2>
        <ul className="folder-grid">{folders.slice(0, limit).map((f, i) => <li key={f.id} className={`folder-card tone-${TONES[i % TONES.length]}`}>
          <Link to={`/admin/${skill.id}/d/${f.id}`} state={{ trail: [...trail, { id: f.id, name: f.name }] }} className="folder-link" aria-label={f.name}>
            <span className="folder-name">{f.name}</span>
            <span className="folder-foot"><span className="folder-ico"><Icon name="folder" size={18} filled/></span><span>Open</span></span>
          </Link></li>)}</ul>
      </section>}

      <section className="wf-section" aria-labelledby="files-h">
        <h2 id="files-h" className="wf-title">Files <span className="count-pill">{files.length}</span></h2>
        {files.length ? <ul className="file-list" aria-label="Files">{files.slice(0, limit).map((f) => <FileRow key={f.id} item={{ title: f.name, url: f.url, kind: f.kind, preview: f.preview }}/>)}</ul>
          : <p className="muted">{q ? 'No match in this folder.' : folders.length ? 'No files here, only folders.' : 'This folder is empty.'}</p>}
        {Math.max(folders.length, files.length) > limit && <div className="admin-actions"><Button variant="secondary" onPress={() => setLimit((n) => n + PAGE)}>Show more</Button></div>}
      </section>
    </>}
  </div>;
}
