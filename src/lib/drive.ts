import { useCallback, useEffect, useState } from 'react';
import { load, save } from './storage';
import type { ResourceItem } from './progress';

/**
 * Live view of Google Drive folders (read-only). Uses the Drive API with a browser API key, so any file added to a
 * linked folder shows up automatically. Folders must be shared as "Anyone with the link".
 * Create the key in Google Cloud (Drive API on, key restricted to this site) and put it in VITE_DRIVE_API_KEY.
 */
const KEY = import.meta.env.VITE_DRIVE_API_KEY as string | undefined;
export const driveEnabled = !!KEY;

export interface DriveEntry {
  id: string;
  name: string;
  folder: boolean;
  kind: ResourceItem['kind'];
  url: string;
  preview?: string;
  modified: string;
}

/** Folders whose names match are never listed (other people's recordings and homework). */
const HIDDEN_FOLDER = /^students['’]?\s/i;
const TTL_MS = 5 * 60_000;
const FOLDER_MIME = 'application/vnd.google-apps.folder';

const kindOf = (mime: string): ResourceItem['kind'] =>
  mime === 'application/pdf' ? 'pdf' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'file';

const previewOf = (id: string, mime: string): string | undefined => {
  if (mime === 'application/vnd.google-apps.document') return `https://docs.google.com/document/d/${id}/preview`;
  if (mime === 'application/vnd.google-apps.spreadsheet') return `https://docs.google.com/spreadsheets/d/${id}/preview`;
  if (mime === 'application/vnd.google-apps.presentation') return `https://docs.google.com/presentation/d/${id}/preview`;
  if (mime.startsWith('application/vnd.google-apps.')) return undefined;
  return `https://drive.google.com/file/d/${id}/preview`;
};

interface ApiFile { id: string; name: string; mimeType: string; modifiedTime?: string; webViewLink?: string; shortcutDetails?: { targetId: string; targetMimeType: string } }

async function fetchFolder(id: string): Promise<DriveEntry[]> {
  const out: DriveEntry[] = [];
  let page = '';
  do {
    const params = new URLSearchParams({
      q: `'${id}' in parents and trashed=false`,
      fields: 'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,shortcutDetails)',
      pageSize: '1000', orderBy: 'folder,name_natural', key: KEY ?? '', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true',
    });
    if (page) params.set('pageToken', page);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`);
    if (!res.ok) {
      const msg = ((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message;
      throw new Error(res.status === 404 ? 'This folder was not found or is not shared with "Anyone with the link".' : msg ?? `Google Drive error (${res.status})`);
    }
    const data = (await res.json()) as { files?: ApiFile[]; nextPageToken?: string };
    for (const f of data.files ?? []) {
      const target = f.shortcutDetails && f.mimeType === 'application/vnd.google-apps.shortcut' ? { id: f.shortcutDetails.targetId, mime: f.shortcutDetails.targetMimeType } : { id: f.id, mime: f.mimeType };
      const folder = target.mime === FOLDER_MIME;
      if (folder && HIDDEN_FOLDER.test(f.name)) continue;
      out.push({
        id: target.id, name: f.name, folder, kind: kindOf(target.mime), modified: f.modifiedTime ?? '',
        url: folder ? `https://drive.google.com/drive/folders/${target.id}` : f.webViewLink ?? `https://drive.google.com/file/d/${target.id}/view`,
        preview: folder ? undefined : previewOf(target.id, target.mime),
      });
    }
    page = data.nextPageToken ?? '';
  } while (page);
  return out;
}

/** Saved copy made by `npm run sync:drive` (used when there is no API key, or the live request fails). */
interface Snapshot { at: number; folders: Record<string, { i: string; n: string; t: 'folder' | 'doc' | 'sheet' | 'slides' | 'file' }[]> }
let snapshotP: Promise<Snapshot> | null = null;
const snapshot = () => (snapshotP ??= import('./driveSnapshot.json').then((m) => m.default as unknown as Snapshot));

const fromSnapshot = (s: Snapshot, id: string): DriveEntry[] | null => {
  const list = s.folders[id];
  if (!list) return null;
  return list.map(({ i, n, t }) => {
    const folder = t === 'folder';
    const guess = /\.pdf$/i.test(n) ? 'pdf' : /\.(mp4|mov|webm|mkv)$/i.test(n) ? 'video' : /\.(mp3|wav|m4a|ogg)$/i.test(n) ? 'audio' : 'file';
    const base = t === 'doc' ? `https://docs.google.com/document/d/${i}` : t === 'sheet' ? `https://docs.google.com/spreadsheets/d/${i}` : t === 'slides' ? `https://docs.google.com/presentation/d/${i}` : '';
    return {
      id: i, name: n, folder, kind: folder ? 'file' : guess, modified: '',
      url: folder ? `https://drive.google.com/drive/folders/${i}` : base ? `${base}/edit` : `https://drive.google.com/file/d/${i}/view`,
      preview: folder ? undefined : base ? `${base}/preview` : `https://drive.google.com/file/d/${i}/preview`,
    } satisfies DriveEntry;
  });
};

interface Cached { t: number; items: DriveEntry[] }
const cacheKey = (id: string) => `drive:${id}`;

/** Folder contents: shows the saved copy at once, then refreshes it when it is older than 5 minutes. */
export function useDriveFolder(id: string | undefined) {
  const [state, setState] = useState<{ items: DriveEntry[] | null; error: string; loading: boolean; at: number; saved: boolean }>({ items: null, error: '', loading: false, at: 0, saved: false });

  const run = useCallback(async (force: boolean) => {
    if (!id) return;
    const cached = load<Cached | null>(cacheKey(id), null);
    const useSaved = async (reason = '') => {
      const snap = await snapshot().catch(() => null);
      const items = snap && fromSnapshot(snap, id);
      if (items) { setState({ items, error: '', loading: false, at: snap.at, saved: true }); return true; }
      if (reason) setState((s) => ({ ...s, loading: false, error: reason }));
      return false;
    };
    if (!driveEnabled) { await useSaved(); return; }
    if (cached) setState((s) => ({ ...s, items: cached.items, at: cached.t, saved: false }));
    if (!force && cached && Date.now() - cached.t < TTL_MS) return;
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const items = await fetchFolder(id);
      const t = Date.now();
      save(cacheKey(id), { t, items } satisfies Cached);
      setState({ items, error: '', loading: false, at: t, saved: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load this folder.';
      if (!(await useSaved())) setState((s) => ({ ...s, loading: false, error: msg }));
    }
  }, [id]);

  useEffect(() => { void run(false); }, [run]);
  return { ...state, refresh: () => run(true) };
}

/** Pulls the folder id out of a Drive folder link (or accepts a bare id). */
export function parseDriveFolderId(input: string): string | null {
  const t = input.trim();
  const m = t.match(/\/folders\/([\w-]{10,})/) ?? t.match(/[?&]id=([\w-]{10,})/);
  if (m) return m[1];
  return /^[\w-]{20,}$/.test(t) ? t : null;
}
