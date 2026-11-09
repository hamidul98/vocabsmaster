/**
 * Vocabs Master MCP server (read-only, admin only).
 *
 * Lets Claude / ChatGPT answer questions like "what's new in Drive?" or "what's inside the Writing card?".
 * Runs as a Vercel function at /api/mcp (also /mcp/<key>). Every request must carry the secret from the
 * MCP_SECRET environment variable, either as ?key=… in the URL or as "Authorization: Bearer …".
 *
 * Data:
 *  - Google Drive folders linked to Admin Features: src/lib/driveSources.json + driveSnapshot.json
 *    (refreshed every 3 hours by the sync-drive GitHub Action) and driveHistory.json ("What's new").
 *    Folder listings and file contents are read live from public Drive links when possible.
 *  - Resources the admin added by hand in the app (optional): read from Firestore when
 *    FIREBASE_SERVICE_ACCOUNT (service-account JSON) is set.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, timingSafeEqual } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod';

// ---------------------------------------------------------------- data

type Skill = 'pre-ielts' | 'reading' | 'writing' | 'speaking' | 'listening' | 'vocabulary' | 'others';
type Kind = 'folder' | 'doc' | 'sheet' | 'slides' | 'file';
interface Source { skill: Skill; name: string; id: string }
interface SnapItem { i: string; n: string; t: Kind }
interface Snapshot { at: number; folders: Record<string, SnapItem[]> }
interface HistoryItem { id: string; name: string; type: Kind; skill: Skill; path: { id: string; name: string }[]; in: string }
interface History { since: number; entries: { at: number; files: number; removed: number; added: HistoryItem[]; more: number }[] }
interface Resource { id: string; title: string; url: string; note: string; addedAt: number; items?: { title: string; url: string; kind: string }[]; driveId?: string }

const SKILL_NAMES: Record<Skill, string> = {
  'pre-ielts': 'Pre-IELTS', reading: 'Reading', writing: 'Writing', speaking: 'Speaking', listening: 'Listening', vocabulary: 'Vocabulary', others: 'Others',
};
const SKILLS = Object.keys(SKILL_NAMES) as Skill[];
const ADMIN_EMAIL = (process.env.VITE_ADMIN_EMAIL || 'hamidulhaquetitas@gmail.com').toLowerCase();
const HIDDEN = /^students['’]?\s/i; // other people's recordings and homework are never listed

const readJson = <T,>(name: string, fallback: T): T => {
  try { return JSON.parse(readFileSync(join(process.cwd(), 'src/lib', name), 'utf8')) as T; } catch { return fallback; }
};

interface Place { skill: Skill; path: { id: string; name: string }[] }
interface Indexed { item: SnapItem; parent: string }

/** Loaded once per function instance. */
const data = (() => {
  const sources = readJson<Source[]>('driveSources.json', []);
  const snapshot = readJson<Snapshot>('driveSnapshot.json', { at: 0, folders: {} });
  const history = readJson<History>('driveHistory.json', { since: 0, entries: [] });
  // where every folder sits: its card (skill) and the path from the linked source (specific cards win over "Others")
  const place = new Map<string, Place>();
  const ordered = [...sources].sort((a, b) => Number(a.skill === 'others') - Number(b.skill === 'others'));
  for (const s of ordered) {
    const stack: [string, Place][] = [[s.id, { skill: s.skill, path: [{ id: s.id, name: s.name }] }]];
    while (stack.length) {
      const [fid, info] = stack.pop()!;
      if (place.has(fid)) continue;
      place.set(fid, info);
      for (const it of snapshot.folders[fid] ?? []) if (it.t === 'folder') stack.push([it.i, { skill: info.skill, path: [...info.path, { id: it.i, name: it.n }] }]);
    }
  }
  const items = new Map<string, Indexed>();
  for (const [parent, list] of Object.entries(snapshot.folders)) for (const it of list) if (!items.has(it.i)) items.set(it.i, { item: it, parent });
  return { sources, snapshot, history, place, items };
})();

const typeOf = (it: SnapItem): string => {
  if (it.t !== 'file') return it.t;
  const ext = it.n.toLowerCase().match(/\.([a-z0-9]{2,4})$/)?.[1] ?? '';
  return ext === 'pdf' ? 'pdf' : ['mp4', 'mov', 'webm', 'mkv'].includes(ext) ? 'video' : ['mp3', 'wav', 'm4a', 'ogg'].includes(ext) ? 'audio'
    : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'image' : ['docx', 'doc', 'odt'].includes(ext) ? 'word' : ext === 'txt' ? 'text' : 'file';
};
const linkOf = (id: string, t: Kind) =>
  t === 'folder' ? `https://drive.google.com/drive/folders/${id}` : t === 'doc' ? `https://docs.google.com/document/d/${id}/edit`
    : t === 'sheet' ? `https://docs.google.com/spreadsheets/d/${id}/edit` : t === 'slides' ? `https://docs.google.com/presentation/d/${id}/edit`
      : `https://drive.google.com/file/d/${id}/view`;
const pathText = (p: { name: string }[]) => p.map((x) => x.name).join(' / ');
const placeOfItem = (id: string): Place | undefined => {
  const idx = data.items.get(id);
  return idx ? data.place.get(idx.parent) : data.place.get(id);
};
/** Total files and sub-folders below a folder (from the saved copy). */
function countBelow(id: string, seen = new Set<string>()): { files: number; folders: number } {
  if (seen.has(id)) return { files: 0, folders: 0 };
  seen.add(id);
  let files = 0, folders = 0;
  for (const it of data.snapshot.folders[id] ?? []) {
    if (it.t === 'folder') { folders++; const c = countBelow(it.i, seen); files += c.files; folders += c.folders; } else files++;
  }
  return { files, folders };
}
const when = (ms: number) => (ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'unknown');
const parseId = (input: string): string | null => {
  const t = input.trim();
  const m = t.match(/\/(?:folders|file\/d|document\/d|spreadsheets\/d|presentation\/d)\/([\w-]{10,})/) ?? t.match(/[?&]id=([\w-]{10,})/);
  if (m) return m[1];
  return /^[\w-]{15,}$/.test(t) ? t : null;
};

// ---------------------------------------------------------------- live Drive (public links, no API key)

const decode = (s: string) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function listLive(id: string): Promise<SnapItem[] | null> {
  try {
    const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#list`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const html = await res.text();
    const out: SnapItem[] = [];
    for (const m of html.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const title = m[2].match(/flip-entry-title">([^<]*)</);
      if (!title) continue;
      const href = decode(m[1]);
      const idm = href.match(/\/(?:folders|file\/d|document\/d|spreadsheets\/d|presentation\/d)\/([\w-]+)/);
      if (!idm) continue;
      const folder = href.includes('/folders/');
      const name = decode(title[1]).trim();
      if (folder && HIDDEN.test(name)) continue;
      out.push({ i: idm[1], n: name, t: folder ? 'folder' : href.includes('/document/') ? 'doc' : href.includes('/spreadsheets/') ? 'sheet' : href.includes('/presentation/') ? 'slides' : 'file' });
    }
    return out;
  } catch { return null; }
}

const MAX_BYTES = 25 * 1024 * 1024;

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow', signal: AbortSignal.timeout(40_000) });
  if (!res.ok) throw new Error(res.status === 404 ? 'File not found or not shared with "Anyone with the link".' : `Google Drive returned HTTP ${res.status}.`);
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > MAX_BYTES) throw new Error(`File is too large to read here (${Math.round(len / 1048576)} MB).`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) throw new Error('File is too large to read here.');
  return buf;
}

/** Plain text of a Drive file: Google Docs/Sheets/Slides, PDF, Word (.docx) or .txt. */
async function readText(id: string, t: Kind | undefined, name: string): Promise<string> {
  if (t === 'doc') return new TextDecoder().decode(await download(`https://docs.google.com/document/d/${id}/export?format=txt`));
  if (t === 'sheet') return new TextDecoder().decode(await download(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv`));
  if (t === 'slides') return new TextDecoder().decode(await download(`https://docs.google.com/presentation/d/${id}/export/txt`));
  if (/\.(mp4|mov|webm|mkv|mp3|wav|m4a|ogg|jpe?g|png|gif|webp)$/i.test(name)) throw new Error('This is a video/audio/image file, so there is no text to read. Open the link to view it.');
  const buf = await download(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`);
  const head = new TextDecoder().decode(buf.slice(0, 8));
  if (head.startsWith('%PDF')) {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(buf);
    const { text, totalPages } = await extractText(pdf, { mergePages: false });
    const pages = (text as string[]).map((p, i) => `--- Page ${i + 1} ---\n${p.trim()}`).join('\n\n');
    return pages.replace(/\s+\n/g, '\n').trim() || `(This PDF has ${totalPages} page(s) but no selectable text; it is probably scanned images.)`;
  }
  if (buf[0] === 0x50 && buf[1] === 0x4b) { // zip → .docx
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
    return value.trim();
  }
  if (/^\s*<(!doctype|html)/i.test(head)) throw new Error('Google Drive did not allow a direct download (the file may be private or too large).');
  return new TextDecoder().decode(buf).trim();
}

// ---------------------------------------------------------------- admin's own resources (optional, Firestore)

let resourcesCache: { at: number; value: Partial<Record<Skill, Resource[]>> | null; error?: string } | null = null;

async function adminResources(): Promise<{ value: Partial<Record<Skill, Resource[]>> | null; error?: string }> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return { value: null, error: 'not configured (FIREBASE_SERVICE_ACCOUNT is not set), so only Drive folders are shown' };
  if (resourcesCache && Date.now() - resourcesCache.at < 60_000) return resourcesCache;
  try {
    const { cert, getApps, initializeApp } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');
    const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(raw)) });
    const user = await getAuth(app).getUserByEmail(ADMIN_EMAIL);
    const doc = await getFirestore(app).doc(`users/${user.uid}`).get();
    const parsed = doc.exists ? JSON.parse(String(doc.get('data') ?? '{}')) as { resources?: Partial<Record<Skill, Resource[]>> } : {};
    resourcesCache = { at: Date.now(), value: parsed.resources ?? {} };
  } catch (e) {
    resourcesCache = { at: Date.now(), value: null, error: `could not be read (${e instanceof Error ? e.message : 'unknown error'})` };
  }
  return resourcesCache;
}

// ---------------------------------------------------------------- tools

const text = (s: string) => ({ content: [{ type: 'text' as const, text: s }] });
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const skillEnum = z.enum(SKILLS as [Skill, ...Skill[]]);

function buildServer() {
  const server = new McpServer(
    { name: 'vocabs-master-admin', version: '1.0.0' },
    { instructions: 'Read-only access to the Vocabs Master admin area: the IELTS skill cards (Pre-IELTS, Reading, Writing, Speaking, Listening, Vocabulary, Others), the Google Drive folders and files linked to them, recently added files, and file contents. Start with admin_overview or whats_new; use search_files to find a file, browse_folder to look inside a folder, and read_file to read a document. Always share the Drive link with the user.' },
  );

  server.registerTool('whats_new', {
    title: "What's new in Drive",
    description: 'Files and folders recently added to the Google Drive folders linked to Admin Features, newest first, with the skill card and folder path of each. The Drive copy is checked every 3 hours.',
    inputSchema: { days: z.number().int().min(1).max(365).default(14).describe('How many days back to look (default 14).') },
    annotations: READ_ONLY,
  }, async ({ days }) => {
    const from = Date.now() - days * 86_400_000;
    const entries = data.history.entries.filter((e) => e.at >= from).sort((a, b) => b.at - a.at);
    const lines: string[] = [`Drive last checked: ${when(data.snapshot.at)}. History recorded since ${when(data.history.since)}.`];
    if (!entries.length) lines.push(`Nothing new in the last ${days} day(s).`);
    for (const e of entries) {
      lines.push('', `## ${when(e.at)} — ${e.files} new file(s)${e.removed ? `, ${e.removed} removed` : ''}`);
      for (const a of e.added) {
        const below = a.type === 'folder' ? countBelow(a.id) : null;
        lines.push(`- [${SKILL_NAMES[a.skill] ?? a.skill}] ${a.type === 'folder' ? '📁' : '📄'} ${a.name}${below ? ` (${below.files} files inside)` : ''}\n  in: ${pathText(a.path) || '—'}\n  id: ${a.id} · ${linkOf(a.id, a.type)}`);
      }
      if (e.more) lines.push(`- …and ${e.more} more`);
    }
    return text(lines.join('\n'));
  });

  server.registerTool('admin_overview', {
    title: 'Admin Features overview',
    description: 'Everything in the Admin Features area, card by card: linked Google Drive folders (with file counts) and resources the admin added by hand (title, link, note).',
    inputSchema: { skill: skillEnum.optional().describe('Only show this card.') },
    annotations: READ_ONLY,
  }, async ({ skill }) => {
    const res = await adminResources();
    const lines: string[] = [`Drive last checked: ${when(data.snapshot.at)}.`, `Admin's own resources: ${res.value ? 'included' : res.error}.`];
    for (const s of skill ? [skill] : SKILLS) {
      const linked = data.sources.filter((x) => x.skill === s);
      const own = res.value?.[s] ?? [];
      lines.push('', `## ${SKILL_NAMES[s]}`);
      if (!linked.length && !own.length) { lines.push('(empty)'); continue; }
      for (const src of linked) {
        const c = countBelow(src.id);
        lines.push(`- 📁 ${src.name} — ${c.files} files, ${c.folders} sub-folders · id: ${src.id}`);
      }
      for (const r of own) {
        const drive = r.driveId && !linked.some((x) => x.id === r.driveId) ? ` (linked Drive folder, id: ${r.driveId})` : '';
        lines.push(`- ${r.driveId ? '📁' : '🔗'} ${r.title}${drive}${r.url ? ` · ${r.url}` : ''}${r.note ? `\n  note: ${r.note}` : ''}${r.items?.length ? `\n  ${r.items.length} item(s): ${r.items.slice(0, 15).map((i) => i.title).join('; ')}${r.items.length > 15 ? '; …' : ''}` : ''}`);
      }
    }
    return text(lines.join('\n'));
  });

  server.registerTool('browse_folder', {
    title: 'Browse a Drive folder',
    description: 'List what is inside a Google Drive folder (sub-folders and files with type and link). Accepts a folder id, a Drive folder link, or part of a folder name.',
    inputSchema: { folder: z.string().min(2).describe('Folder id, Drive link, or (part of) the folder name.') },
    annotations: READ_ONLY,
  }, async ({ folder }) => {
    let id = parseId(folder);
    if (!id || (!data.snapshot.folders[id] && !data.sources.some((s) => s.id === id) && !folder.includes('/'))) {
      const q = folder.toLowerCase();
      const hits = [...data.sources.map((s) => ({ i: s.id, n: s.name })), ...[...data.items.values()].filter((x) => x.item.t === 'folder').map((x) => x.item)]
        .filter((f) => f.n.toLowerCase().includes(q));
      if (!hits.length && !id) return text(`No folder matching "${folder}". Try search_files or admin_overview.`);
      if (hits.length > 1 && !hits.some((h) => h.n.toLowerCase() === q)) {
        return text(`Several folders match "${folder}" — pick one by id:\n${hits.slice(0, 25).map((h) => `- ${h.n} · ${pathText(data.place.get(h.i)?.path ?? [])} · id: ${h.i}`).join('\n')}`);
      }
      if (hits.length) id = (hits.find((h) => h.n.toLowerCase() === q) ?? hits[0]).i;
    }
    const live = await listLive(id!);
    const list = live ?? data.snapshot.folders[id!];
    if (!list) return text('This folder could not be opened. It may not be shared with "Anyone with the link".');
    const p = data.place.get(id!);
    const lines = [`# ${p ? pathText(p.path) : id}${p ? ` [${SKILL_NAMES[p.skill]}]` : ''}`, live ? '(live from Google Drive)' : `(saved copy from ${when(data.snapshot.at)})`, ''];
    const folders = list.filter((x) => x.t === 'folder'), files = list.filter((x) => x.t !== 'folder');
    if (!list.length) lines.push('(empty)');
    for (const f of folders) { const c = countBelow(f.i); lines.push(`- 📁 ${f.n} (${c.files} files) · id: ${f.i}`); }
    for (const f of files) lines.push(`- 📄 ${f.n} [${typeOf(f)}] · id: ${f.i} · ${linkOf(f.i, f.t)}`);
    return text(lines.join('\n'));
  });

  server.registerTool('search_files', {
    title: 'Search Admin Features files',
    description: 'Find files and folders by name across every Drive folder linked to Admin Features (and the admin\'s own resources). All words must match; case-insensitive.',
    inputSchema: {
      query: z.string().min(1).describe('Words to look for in the name, e.g. "task 2 opinion" or "cue card".'),
      skill: skillEnum.optional().describe('Only search this card.'),
      type: z.enum(['folder', 'pdf', 'word', 'doc', 'video', 'audio', 'image', 'any']).default('any'),
      limit: z.number().int().min(1).max(100).default(30),
    },
    annotations: READ_ONLY,
  }, async ({ query, skill, type, limit }) => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const match = (s: string) => { const l = s.toLowerCase(); return words.every((w) => l.includes(w)); };
    const hits: string[] = [];
    let total = 0;
    for (const { item } of data.items.values()) {
      if (!match(item.n)) continue;
      const p = placeOfItem(item.i);
      if (skill && p?.skill !== skill) continue;
      const t = typeOf(item);
      if (type !== 'any' && t !== type) continue;
      total++;
      if (hits.length < limit) hits.push(`- ${item.t === 'folder' ? '📁' : '📄'} ${item.n} [${t}] — ${p ? `${SKILL_NAMES[p.skill]}: ${pathText(p.path)}` : ''}\n  id: ${item.i} · ${linkOf(item.i, item.t)}`);
    }
    const res = await adminResources();
    for (const s of skill ? [skill] : SKILLS) for (const r of res.value?.[s] ?? []) {
      if (!match(`${r.title} ${r.note} ${(r.items ?? []).map((i) => i.title).join(' ')}`)) continue;
      total++;
      if (hits.length < limit) hits.push(`- 🔗 ${r.title} — ${SKILL_NAMES[s]} (added by admin)${r.url ? `\n  ${r.url}` : ''}${r.note ? `\n  note: ${r.note}` : ''}`);
    }
    return text(total ? `${total} match(es)${total > hits.length ? `, showing ${hits.length}` : ''}:\n${hits.join('\n')}` : `Nothing named like "${query}". Try fewer or different words.`);
  });

  server.registerTool('read_file', {
    title: 'Read a file',
    description: 'Read the text inside a file from the linked Drive folders: Google Docs/Sheets/Slides, PDF, Word (.docx) or .txt. Videos, audio and images have no text. Use search_files or browse_folder first to get the id.',
    inputSchema: {
      file: z.string().min(10).describe('File id or Drive link.'),
      max_chars: z.number().int().min(1000).max(100_000).default(40_000).describe('Cut the text after this many characters.'),
    },
    annotations: READ_ONLY,
  }, async ({ file, max_chars }) => {
    const id = parseId(file);
    if (!id) return text('That does not look like a Drive file id or link.');
    const known = data.items.get(id)?.item;
    const p = placeOfItem(id);
    try {
      let body = (await readText(id, known?.t, known?.n ?? '')).replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
      const cut = body.length > max_chars;
      if (cut) body = body.slice(0, max_chars);
      const header = `# ${known?.n ?? id}${p ? `\n${SKILL_NAMES[p.skill]}: ${pathText(p.path)}` : ''}\n${linkOf(id, known?.t ?? 'file')}\n`;
      return text(`${header}\n${body || '(no text found)'}${cut ? `\n\n[…cut at ${max_chars} characters; ask for more with a larger max_chars]` : ''}`);
    } catch (e) {
      return { ...text(`Could not read "${known?.n ?? id}": ${e instanceof Error ? e.message : 'unknown error'}\nLink: ${linkOf(id, known?.t ?? 'file')}`), isError: true };
    }
  });

  return server;
}

// ---------------------------------------------------------------- HTTP (Vercel function)

const digest = (s: string) => createHash('sha256').update(s).digest();
function authorized(req: Request): boolean {
  const secret = process.env.MCP_SECRET;
  if (!secret || secret.length < 16) return false;
  const url = new URL(req.url);
  const given = url.searchParams.get('key') ?? req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  return timingSafeEqual(digest(given), digest(secret));
}

async function handle(req: Request): Promise<Response> {
  if (!process.env.MCP_SECRET) return Response.json({ error: 'MCP is not set up: add MCP_SECRET in the Vercel environment variables.' }, { status: 503 });
  if (!authorized(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  return transport.handleRequest(req);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
