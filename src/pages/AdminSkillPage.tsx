import { useState, type CSSProperties, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button, toast } from '@heroui/react';
import { Button as AriaButton, Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { useProgress, type Resource } from '@/lib/progress';
import { useAuth } from '@/lib/sync';
import { KIND_ICON, cleanUrl, guessKind } from '@/components/adminBits';
import { driveEnabled, parseDriveFolderId } from '@/lib/drive';
import { Icon, Loading } from '@/components/ui';
import { SKILLS, useStarterResources } from './AdminPage';

/** Pastel tones for folders and file cards; they repeat in order. */
const TONES = ['lavender', 'sky', 'peach', 'mint', 'rose'] as const;
type Tone = (typeof TONES)[number];
const TONE_LABEL: Record<Tone, string> = { lavender: 'Lavender', sky: 'Sky blue', peach: 'Peach', mint: 'Mint', rose: 'Rose' };
const toneOf = (saved: string | undefined, i: number): Tone => (TONES.find((t) => t === saved) ?? TONES[i % TONES.length]);

/** Name + colour form, used to create and to edit a folder. */
function FolderForm({ initialName = '', initialTone, submitLabel, onSubmit, onCancel }:
  { initialName?: string; initialTone: Tone; submitLabel: string; onSubmit: (name: string, tone: Tone) => void; onCancel: () => void }) {
  const [name, setName] = useState(initialName);
  const [tone, setTone] = useState<Tone>(initialTone);
  return <form className="new-folder-form" onSubmit={(e) => { e.preventDefault(); onSubmit(name, tone); }}>
    <label>Folder name<input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Subject Verb Agreement"/></label>
    <div role="radiogroup" aria-label="Folder colour" className="tone-picker">
      {TONES.map((t) => <button key={t} type="button" role="radio" aria-checked={tone === t} aria-label={TONE_LABEL[t]} title={TONE_LABEL[t]}
        className={`tone-swatch tone-${t} ${tone === t ? 'on' : ''}`} onClick={() => setTone(t)}>{tone === t && <Icon name="check" size={16}/>}</button>)}
    </div>
    <div className="admin-actions"><Button type="submit" size="sm" className="pill">{submitLabel}</Button><Button size="sm" variant="secondary" onPress={onCancel}>Cancel</Button></div>
  </form>;
}

const KIND_LABEL ={ pdf: 'PDF', video: 'Video', audio: 'Audio', file: 'Link' } as const;

const ago = (t: number) => {
  const d = Math.floor((Date.now() - t) / 86_400_000);
  return d <= 0 ? 'Today' : d === 1 ? '1 day ago' : d < 30 ? `${d} days ago` : new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function Kebab({ label, onRename, onDelete, deleteLabel = 'Delete' }: { label: string; onRename?: () => void; onDelete: () => void; deleteLabel?: string }) {
  return <MenuTrigger>
    <AriaButton className="kebab" aria-label={`${label}: more actions`}><Icon name="more_vert" size={18}/></AriaButton>
    <Popover placement="bottom end" className="account-popover kebab-popover">
      <Menu className="account-menu" aria-label={label} onAction={(k) => { if (k === 'rename') onRename?.(); if (k === 'delete') onDelete(); }}>
        {onRename && <MenuItem id="rename" className="account-menu-item"><Icon name="edit" size={20}/>Edit</MenuItem>}
        <MenuItem id="delete" className="account-menu-item danger"><Icon name="delete" size={20}/>{deleteLabel}</MenuItem>
      </Menu>
    </Popover>
  </MenuTrigger>;
}

/** A skill's folders (pastel folder cards) and single resources (file cards). */
export default function AdminSkillPage() {
  const { skill: param } = useParams();
  const { loading, isAdmin } = useAuth();
  const { resources, addResource, updateResource, removeResource } = useProgress();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [driveName, setDriveName] = useState('');
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  useStarterResources(isAdmin);

  const skill = SKILLS.find((s) => s.id === param);
  if (loading) return <Loading/>;
  if (!isAdmin || !skill) return <Navigate to={isAdmin ? '/admin' : '/'} replace/>;
  const all = resources[skill.id] ?? [];
  // a folder is an entry that has a files list (even an empty one); anything else is a single resource
  const folders = all.filter((r) => Array.isArray(r.items) || r.driveId);
  const loose = all.filter((r) => !Array.isArray(r.items) && !r.driveId);

  const createFolder = (name: string, tone: Tone) => {
    const n = name.trim().slice(0, 80);
    if (!n) return void toast('Give the folder a name.');
    addResource(skill.id, { title: n, url: '', note: '', items: [], tone });
    setCreating(false);
  };
  const linkDrive = (e: FormEvent) => {
    e.preventDefault();
    const id = parseDriveFolderId(driveLink);
    if (!id) return void toast('Paste a Google Drive folder link.');
    if (all.some((r) => r.driveId === id)) return void toast('That folder is already linked here.');
    addResource(skill.id, { title: driveName.trim().slice(0, 80) || 'Drive folder', url: '', note: '', driveId: id });
    setDriveLink(''); setDriveName(''); setLinking(false);
  };
  const saveFolder = (f: Resource, name: string, tone: Tone) => {
    const n = name.trim().slice(0, 80);
    if (!n) return void toast('Give the folder a name.');
    updateResource(skill.id, f.id, { title: n, url: f.url, note: f.note, items: f.items, tone, driveId: f.driveId });
    setEditing(null);
  };
  const deleteFolder = (f: Resource) => { if (f.driveId) { if (window.confirm(`Unlink “${f.title}”? Your Drive files are not touched.`)) removeResource(skill.id, f.id); return; } if (window.confirm(`Delete the folder “${f.title}” and its ${f.items?.length ?? 0} files?`)) removeResource(skill.id, f.id); };
  const addLoose = (e: FormEvent) => {
    e.preventDefault();
    const link = cleanUrl(url);
    if (!title.trim()) return void toast('Give the resource a name.');
    if (!link) return void toast('Paste a valid http(s) link.');
    addResource(skill.id, { title: title.trim().slice(0, 120), url: link, note: '' });
    setTitle(''); setUrl(''); setAdding(false);
  };

  return <div className="admin-page">
    <div className="page-title"><nav className="crumbs" aria-label="Breadcrumb"><Link to="/admin">Admin Features</Link><Icon name="chevron" size={16}/><strong>{skill.name}</strong></nav>
      <h1>{skill.name}</h1><p>Visible only to you</p></div>

    <section className="wf-section" aria-labelledby="folders-h">
      <h2 id="folders-h" className="wf-title">Folders <span className="count-pill">{folders.length}</span></h2>
      <ul className="folder-grid">
        {folders.map((f, i) => {
          const n = f.items?.length ?? 0;
          const tone = toneOf(f.tone, i);
          const href = f.driveId ? `/admin/${skill.id}/d/${f.driveId}` : `/admin/${skill.id}/${f.id}`;
          if (editing === f.id) return <li key={f.id} className="folder-new"><FolderForm initialName={f.title} initialTone={tone} submitLabel="Save" onSubmit={(name, t) => saveFolder(f, name, t)} onCancel={() => setEditing(null)}/></li>;
          return <li key={f.id} className={`folder-card tone-${tone}`}>
            <Link to={href} state={f.driveId ? { trail: [{ id: f.driveId, name: f.title }] } : undefined} className="folder-link" aria-label={f.driveId ? `${f.title}, Google Drive folder` : `${f.title}, ${n} ${n === 1 ? 'item' : 'items'}`}>
              <span className="folder-name">{f.title}</span>
              <span className="folder-foot"><span className="folder-ico"><Icon name={f.driveId ? 'cloud_sync' : skill.icon} size={18} filled/></span>{f.driveId ? <span className="drive-chip">Synced from Drive</span> : <span>{n} {n === 1 ? 'item' : 'items'}</span>}</span>
            </Link>
            <Kebab label={f.title} onRename={() => setEditing(f.id)} onDelete={() => deleteFolder(f)} deleteLabel={f.driveId ? 'Unlink' : 'Delete'}/>
          </li>;
        })}
        <li className="folder-new">
          {creating ? <FolderForm initialTone={TONES[folders.length % TONES.length]} submitLabel="Create" onSubmit={createFolder} onCancel={() => setCreating(false)}/>
            : <button type="button" className="new-folder-btn" onClick={() => setCreating(true)}><Icon name="add" size={26}/><strong>New folder</strong></button>}
        </li>
        <li className="folder-new">
          {linking ? <form className="new-folder-form" onSubmit={linkDrive}>
            <label>Google Drive folder link<input autoFocus value={driveLink} onChange={(e) => setDriveLink(e.target.value)} inputMode="url" placeholder="https://drive.google.com/drive/folders/…"/></label>
            <label>Name <small>(optional)</small><input value={driveName} onChange={(e) => setDriveName(e.target.value)} maxLength={80} placeholder="e.g. Reading October"/></label>
            {!driveEnabled && <small className="muted">The Drive API key is not set yet, so files will show once it is.</small>}
            <div className="admin-actions"><Button type="submit" size="sm" className="pill">Link</Button><Button size="sm" variant="secondary" onPress={() => { setLinking(false); setDriveLink(''); setDriveName(''); }}>Cancel</Button></div>
          </form>
            : <button type="button" className="new-folder-btn" onClick={() => setLinking(true)}><Icon name="add_to_drive" size={26}/><strong>Link Drive folder</strong></button>}
        </li>
      </ul>
    </section>

    <section className="wf-section" aria-labelledby="res-h">
      <div className="wf-head"><h2 id="res-h" className="wf-title">Resources <span className="count-pill">{loose.length}</span></h2>
        {!adding && <Button size="sm" variant="secondary" onPress={() => setAdding(true)}><Icon name="add" size={18}/>Add resource</Button>}</div>
      {adding && <form className="res-form inline-add" onSubmit={addLoose}>
        <label>Name<input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Cambridge 18 Test 2 audio"/></label>
        <label>Link<input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://…"/></label>
        <div className="admin-actions"><Button type="submit" className="pill"><Icon name="add" size={18}/>Add</Button><Button variant="secondary" onPress={() => { setAdding(false); setTitle(''); setUrl(''); }}>Cancel</Button></div>
      </form>}
      {loose.length ? <ul className="file-grid">{loose.map((r, i) => {
        const kind = guessKind(`${r.title} ${r.url}`);
        return <li key={r.id} className={`file-card tone-${TONES[(i + 2) % TONES.length]}`} style={{ '--n': i } as CSSProperties}>
          <div className="file-card-top"><Icon name={KIND_ICON[kind]} size={34} filled/></div>
          <Kebab label={r.title} onDelete={() => { if (window.confirm(`Delete “${r.title}”?`)) removeResource(skill.id, r.id); }}/>
          <div className="file-card-body">
            <span className="file-meta">{ago(r.addedAt)} <i>•</i> {KIND_LABEL[kind]}</span>
            <strong>{r.title}</strong>
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="tbl-link file-card-open">Open<Icon name="external" size={14}/></a>
          </div>
        </li>;
      })}</ul> : !adding && <p className="muted">No single resources yet. Create a folder above, or add a link here.</p>}
    </section>
  </div>;
}
