import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useProgress, type ResourceItem, type Skill } from '@/lib/progress';
import { useAuth } from '@/lib/sync';
import { load, save } from '@/lib/storage';
import { DRIVE_SOURCES } from '@/lib/driveSources';
import { Icon, Loading } from '@/components/ui';

export const SKILLS: { id: Skill; name: string; icon: string; tone: string; hint: string }[] = [
  { id: 'pre-ielts', name: 'Pre-IELTS', icon: 'school', tone: 'orange', hint: 'Foundation grammar, vocabulary, basics' },
  { id: 'reading', name: 'Reading', icon: 'menu_book', tone: 'purple', hint: 'Passages, strategies, practice sets' },
  { id: 'writing', name: 'Writing', icon: 'edit_note', tone: 'coral', hint: 'Task 1 & 2 samples, templates, feedback' },
  { id: 'speaking', name: 'Speaking', icon: 'record_voice_over', tone: 'green', hint: 'Cue cards, part 1-3 questions, videos' },
  { id: 'listening', name: 'Listening', icon: 'headphones', tone: 'blue', hint: 'Audio, transcripts, practice tests' },
  { id: 'vocabulary', name: 'Vocabulary', icon: 'abc', tone: 'sky', hint: 'Topic word lists, collocations, paraphrasing' },
  { id: 'others', name: 'Others', icon: 'folder_open', tone: 'rose', hint: 'Outlines, orientation, mock tests, everything else' },
];

const drive = (id: string) => `https://drive.google.com/file/d/${id}/view?usp=drive_web`;
const FOLDER = 'https://drive.google.com/drive/folders/1BaZwV7och1OGU3J_mme4xHmgVbjcXhKB';

/** Resources added for the admin once (and filled in with their files), the first time they open Admin Features. */
const STARTER: { skill: Skill; title: string; url: string; note: string; items: ResourceItem[] }[] = [
  { skill: 'pre-ielts', title: 'Subject Verb Agreement', url: FOLDER, note: 'Google Drive folder: lesson, homework and answer key.', items: [
    { title: 'SVA 2.pdf', kind: 'pdf', url: drive('16x6zAdO1o7vCourVr2S2t1jP1d0eu51-') },
    { title: 'HW on SVA.pdf', kind: 'pdf', url: drive('1rWPJopcS1WoW6Tq2i8Z-83ykyDzC-gLw') },
    { title: 'Answer keys to HW on SVA.pdf', kind: 'pdf', url: drive('17blyEt4RVBIjisQtaAfVqoh0JgPfeX1n') },
    { title: 'Video lesson (video1899703958.mp4)', kind: 'video', url: drive('1pHg3TF1a8lrGJ3JKXmuzvQw3c990S6Uj') },
  ] },
];

export function useStarterResources(enabled: boolean) {
  const { resources, addResource, updateResource } = useProgress();
  useEffect(() => {
    if (!enabled) return;
    const done = load<string[]>('starterResources', []);
    const next = [...done];
    for (const { skill, ...r } of STARTER) {
      const have = (resources[skill] ?? []).find((x) => x.url === r.url);
      if (have) { if (!have.items?.length) updateResource(skill, have.id, { title: have.title, url: have.url, note: have.note, items: r.items }); }
      else if (!done.includes(r.url)) addResource(skill, r);
      if (!next.includes(r.url)) next.push(r.url);
    }
    if (next.length !== done.length) save('starterResources', next);
    // linked Drive folders: added once; delete one and it stays deleted
    const doneDrive = load<string[]>('seededDrive', []);
    const fresh = DRIVE_SOURCES.filter((d) => !doneDrive.includes(d.id));
    if (fresh.length) {
      [...fresh].reverse().forEach((d) => {
        if (!(resources[d.skill] ?? []).some((r) => r.driveId === d.id)) addResource(d.skill, { title: d.name, url: '', note: '', driveId: d.id });
      });
      save('seededDrive', [...doneDrive, ...fresh.map((d) => d.id)]);
    }
  }, [enabled, resources, addResource, updateResource]);
}

/** Admin-only area. The sidebar link and these routes are hidden from everyone else. */
export default function AdminPage() {
  const { loading, isAdmin } = useAuth();
  const { resources } = useProgress();
  useStarterResources(isAdmin);
  if (loading) return <Loading/>;
  if (!isAdmin) return <Navigate to="/" replace/>;

  return <div className="admin-page">
    <div className="page-title"><h1>Admin Features <span className="admin-badge">Admin</span></h1><p>Only you can see this. Open a skill to add your resources.</p></div>
    <div className="skill-grid">{SKILLS.map((s) => {
      const n = resources[s.id]?.length ?? 0;
      return <Link key={s.id} to={`/admin/${s.id}`} className={`skill-card ${s.tone}`}>
        <span className="skill-icon"><Icon name={s.icon} size={30} filled/></span>
        <span className="skill-text"><strong>{s.name}</strong><small>{s.hint}</small></span>
        <span className="skill-count">{n} {n === 1 ? 'resource' : 'resources'}<Icon name="arrow" size={18}/></span>
      </Link>;
    })}</div>
  </div>;
}
