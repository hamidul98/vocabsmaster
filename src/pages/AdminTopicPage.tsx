import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button, Card, toast } from '@heroui/react';
import { useProgress } from '@/lib/progress';
import { useAuth } from '@/lib/sync';
import { FileRow, cleanUrl, guessKind } from '@/components/adminBits';
import { Icon, Loading } from '@/components/ui';
import { SKILLS, useStarterResources } from './AdminPage';

/** One topic inside a skill (e.g. Pre-IELTS > Subject Verb Agreement): its files, with preview and add/remove. */
export default function AdminTopicPage() {
  const { skill: param, rid } = useParams();
  const { loading, isAdmin } = useAuth();
  const { resources, updateResource } = useProgress();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  useStarterResources(isAdmin);

  const skill = SKILLS.find((s) => s.id === param);
  if (loading) return <Loading/>;
  if (!isAdmin) return <Navigate to="/" replace/>;
  if (!skill) return <Navigate to="/admin" replace/>;
  const topic = (resources[skill.id] ?? []).find((r) => r.id === rid);
  if (!topic) return <Navigate to={`/admin/${skill.id}`} replace/>;
  const items = topic.items ?? [];
  const save = (next: typeof items) => updateResource(skill.id, topic.id, { title: topic.title, url: topic.url, note: topic.note, items: next });

  const add = (e: FormEvent) => {
    e.preventDefault();
    const link = cleanUrl(url);
    if (!title.trim()) return void toast('Give the file a name.');
    if (!link) return void toast('Paste a valid http(s) link for the file.');
    save([...items, { title: title.trim().slice(0, 120), url: link, kind: guessKind(`${title} ${link}`) }]);
    setTitle(''); setUrl('');
  };

  return <div className="admin-page">
    <div className="page-title"><nav className="crumbs" aria-label="Breadcrumb"><Link to="/admin">Admin Features</Link><Icon name="chevron" size={16}/><Link to={`/admin/${skill.id}`}>{skill.name}</Link><Icon name="chevron" size={16}/><strong>{topic.title}</strong></nav>
      <h1>{topic.title}</h1><p>{topic.note || `${items.length} ${items.length === 1 ? 'file' : 'files'}`}</p>
      {topic.url && <a href={topic.url} target="_blank" rel="noopener noreferrer" className="tbl-link admin-link">Open original folder<Icon name="external" size={14}/></a>}</div>

    <Card className="chart-card"><h2>Files</h2>
      {items.length ? <ul className="file-list" aria-label={`Files in ${topic.title}`}>{items.map((it, i) =>
        <FileRow key={`${it.url}${i}`} item={it} onDelete={() => { if (window.confirm(`Remove “${it.title}” from this topic?`)) save(items.filter((_, k) => k !== i)); }}/>)}</ul>
        : <p className="muted">No files yet. Add the first one below.</p>}
    </Card>

    <Card className="chart-card"><h2>Add a file</h2>
      <form className="res-form" onSubmit={add}>
        <label>File name<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Practice test.pdf"/></label>
        <label>Link<input value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://drive.google.com/file/d/…"/></label>
        <div className="admin-actions"><Button type="submit" className="pill"><Icon name="add" size={18}/>Add file</Button></div>
      </form>
    </Card>
  </div>;
}
