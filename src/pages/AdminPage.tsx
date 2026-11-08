import { Link, Navigate } from 'react-router-dom';
import { useProgress, type Skill } from '@/lib/progress';
import { useAuth } from '@/lib/sync';
import { Icon, Loading } from '@/components/ui';

export const SKILLS: { id: Skill; name: string; icon: string; tone: string; hint: string }[] = [
  { id: 'pre-ielts', name: 'Pre-IELTS', icon: 'school', tone: 'orange', hint: 'Foundation grammar, vocabulary, basics' },
  { id: 'reading', name: 'Reading', icon: 'menu_book', tone: 'purple', hint: 'Passages, strategies, practice sets' },
  { id: 'writing', name: 'Writing', icon: 'edit_note', tone: 'coral', hint: 'Task 1 & 2 samples, templates, feedback' },
  { id: 'speaking', name: 'Speaking', icon: 'record_voice_over', tone: 'green', hint: 'Cue cards, part 1-3 questions, videos' },
  { id: 'listening', name: 'Listening', icon: 'headphones', tone: 'blue', hint: 'Audio, transcripts, practice tests' },
];

/** Admin-only area. The sidebar link and these routes are hidden from everyone else. */
export default function AdminPage() {
  const { loading, isAdmin } = useAuth();
  const { resources } = useProgress();
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
