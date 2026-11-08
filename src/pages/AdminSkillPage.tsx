import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button, Card, toast } from '@heroui/react';
import { useProgress, type Resource } from '@/lib/progress';
import { useAuth } from '@/lib/sync';
import { Icon, Loading } from '@/components/ui';
import { SKILLS } from './AdminPage';

/** Only http(s) links are allowed, so a saved resource can never run script. */
const cleanUrl = (raw: string): string | null => {
  const t = raw.trim();
  if (!t) return '';
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch { return null; }
};

export default function AdminSkillPage() {
  const { skill: param } = useParams();
  const { loading, isAdmin } = useAuth();
  const { resources, addResource, updateResource, removeResource } = useProgress();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [editing, setEditing] = useState<string | null>(null);

  const skill = SKILLS.find((s) => s.id === param);
  if (loading) return <Loading/>;
  if (!isAdmin || !skill) return <Navigate to={isAdmin ? '/admin' : '/'} replace/>;
  const list: Resource[] = resources[skill.id] ?? [];

  const reset = () => { setTitle(''); setUrl(''); setNote(''); setEditing(null); };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const link = cleanUrl(url);
    if (!title.trim()) return void toast('Give the resource a title.');
    if (link === null) return void toast('That link is not valid. Use a normal http(s) address.');
    const data = { title: title.trim().slice(0, 120), url: link, note: note.trim().slice(0, 600) };
    if (editing) updateResource(skill.id, editing, data); else addResource(skill.id, data);
    reset();
  };
  const edit = (r: Resource) => { setEditing(r.id); setTitle(r.title); setUrl(r.url); setNote(r.note); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <div className="admin-page">
    <div className="page-title"><nav className="crumbs" aria-label="Breadcrumb"><Link to="/admin">Admin Features</Link><Icon name="chevron" size={16}/><strong>{skill.name}</strong></nav>
      <h1>{skill.name} resources</h1><p>{list.length} saved · visible only to you</p></div>

    <Card className="chart-card">
      <h2>{editing ? 'Edit resource' : 'Add a resource'}</h2>
      <form className="res-form" onSubmit={submit}>
        <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Cambridge 18 Test 2 audio"/></label>
        <label>Link <small>(optional)</small><input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://…"/></label>
        <label>Note <small>(optional)</small><textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={600} rows={3} placeholder="Anything to remember about it"/></label>
        <div className="admin-actions"><Button type="submit" className="pill"><Icon name={editing ? 'check' : 'add'} size={18}/>{editing ? 'Save changes' : 'Add resource'}</Button>
          {editing && <Button variant="secondary" onPress={reset}>Cancel</Button>}</div>
      </form>
    </Card>

    <Card className="chart-card"><h2>Saved resources</h2>
      {list.length ? <ul className="res-list">{list.map((r) => <li key={r.id}>
        <div className="res-main"><strong>{r.title}</strong>{r.note && <p>{r.note}</p>}
          {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="tbl-link">{new URL(r.url).hostname}<Icon name="external" size={14}/></a>}</div>
        <div className="res-tools">
          <Button isIconOnly size="sm" variant="secondary" aria-label={`Edit ${r.title}`} onPress={() => edit(r)}><Icon name="edit" size={18}/></Button>
          <Button isIconOnly size="sm" variant="secondary" aria-label={`Delete ${r.title}`} onPress={() => { if (window.confirm(`Delete “${r.title}”?`)) { removeResource(skill.id, r.id); if (editing === r.id) reset(); } }}><Icon name="delete" size={18}/></Button>
        </div></li>)}</ul>
        : <p className="muted">Nothing here yet. Add your first {skill.name.toLowerCase()} resource above.</p>}
    </Card>
  </div>;
}
