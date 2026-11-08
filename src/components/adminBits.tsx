import { useState } from 'react';
import { Button } from '@heroui/react';
import type { ResourceItem } from '@/lib/progress';
import { Icon } from './ui';

/** Only http(s) links are allowed, so a saved resource can never run script. */
export const cleanUrl = (raw: string): string | null => {
  const t = raw.trim();
  if (!t) return '';
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch { return null; }
};

export const KIND_ICON: Record<ResourceItem['kind'], string> = { pdf: 'picture_as_pdf', video: 'play_circle', audio: 'headphones', file: 'description' };

/** Google Drive files can be shown inside the page via their /preview address. */
const previewUrl = (u: string) => (/^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\//.test(u) ? u.replace(/\/view.*$/, '/preview') : null);

/** Guess the file type from its name or link. */
export const guessKind = (text: string): ResourceItem['kind'] =>
  /\.pdf\b/i.test(text) ? 'pdf' : /\.(mp4|mov|webm|mkv)\b|youtu/i.test(text) ? 'video' : /\.(mp3|wav|m4a|ogg)\b/i.test(text) ? 'audio' : 'file';

export function FileRow({ item, onDelete }: { item: ResourceItem; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);
  const preview = item.preview ?? previewUrl(item.url);
  return <li className="file-row">
    <div className="file-line">
      <span className={`file-icon ${item.kind}`}><Icon name={KIND_ICON[item.kind]} size={22} filled/></span>
      <span className="file-name">{item.title}</span>
      <div className="res-tools">
        {preview && <Button size="sm" variant="secondary" aria-expanded={open} onPress={() => setOpen((o) => !o)}>{open ? 'Close' : item.kind === 'video' ? 'Play' : 'Preview'}</Button>}
        {onDelete && <Button isIconOnly size="sm" variant="secondary" aria-label={`Remove ${item.title}`} onPress={onDelete}><Icon name="delete" size={18}/></Button>}
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="tbl-link file-open" aria-label={`Open ${item.title} in a new tab`}>Open<Icon name="external" size={14}/></a>
      </div>
    </div>
    {open && preview && <iframe className="file-frame" src={preview} title={item.title} sandbox="allow-scripts allow-same-origin allow-popups" allow="autoplay; fullscreen" loading="lazy"/>}
  </li>;
}
