import { useCallback, useEffect, useState } from 'react';
import { load, save } from './storage';

/** What `npm run sync:drive` (and the scheduled GitHub Action) found each time something changed in Drive. */
export interface HistoryItem {
  id: string;
  name: string;
  type: 'folder' | 'doc' | 'sheet' | 'slides' | 'file';
  /** Admin Features card the item belongs to. */
  skill: string;
  /** Folders from the linked folder down to where the item sits. */
  path: { id: string; name: string }[];
  /** Id of the folder that directly contains it. */
  in: string;
}
export interface HistoryEntry { at: number; files: number; removed: number; added: HistoryItem[]; more: number }
export interface History { since: number; entries: HistoryEntry[] }

const SEEN_KEY = 'driveHistorySeen';
let cache: Promise<History> | null = null;
const loadHistory = () => (cache ??= import('./driveHistory.json').then((m) => m.default as unknown as History));

/** The saved history (null while loading). */
export function useDriveHistory() {
  const [history, setHistory] = useState<History | null>(null);
  useEffect(() => { void loadHistory().then(setHistory, () => setHistory({ since: 0, entries: [] })); }, []);
  return history;
}

/** Time the admin last opened "What's new" (0 = never). */
export const lastSeen = () => load<number>(SEEN_KEY, 0);
export const markHistorySeen = () => save(SEEN_KEY, Date.now());

/** How many files were added since the admin last looked. Only loads the history for the admin. */
export function useNewDriveCount(enabled: boolean) {
  const history = useDriveHistory2(enabled);
  const [seen, setSeen] = useState(lastSeen);
  useEffect(() => {
    const on = () => setSeen(lastSeen());
    window.addEventListener('ibv:drive-seen', on);
    return () => window.removeEventListener('ibv:drive-seen', on);
  }, []);
  if (!history) return 0;
  const since = Math.max(seen, history.since);
  return history.entries.filter((e) => e.at > since).reduce((n, e) => n + e.files, 0);
}

function useDriveHistory2(enabled: boolean) {
  const [history, setHistory] = useState<History | null>(null);
  useEffect(() => { if (enabled) void loadHistory().then(setHistory, () => undefined); }, [enabled]);
  return history;
}

/** Call when the admin has looked at the list. */
export const useMarkSeen = () => useCallback(() => { markHistorySeen(); window.dispatchEvent(new Event('ibv:drive-seen')); }, []);
