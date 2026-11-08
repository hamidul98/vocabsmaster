// Saves a copy of every linked Google Drive folder's contents to src/lib/driveSnapshot.json and records what was
// added or removed since the last run in src/lib/driveHistory.json (shown in Admin Features > What's new).
// Needs no API key (reads the public "embedded folder" view). Run it any time: npm run sync:drive
import { readFile, writeFile } from 'node:fs/promises';

const sourcesUrl = new URL('../src/lib/driveSources.json', import.meta.url);
const snapshotUrl = new URL('../src/lib/driveSnapshot.json', import.meta.url);
const historyUrl = new URL('../src/lib/driveHistory.json', import.meta.url);
const sources = JSON.parse(await readFile(sourcesUrl, 'utf8'));

// Folders whose NEW sub-folders are placed automatically (by name) into the right Admin Features card.
const WATCHED = ['1BwR-7fY6F6-d9zYlRAtYvjJXkhVe-a_m', '1y90ovhHPHKHUg4nJTGd6r38h7S47cbAR', '15w0Cp3AuHd2v-nszYJ2-JrCvsvKDHB81'];
const SKIP = new Set(['1y90ovhHPHKHUg4nJTGd6r38h7S47cbAR']); // "IELTS Classes" is a container, not a topic
const skillFor = (name) => /vocab|word/i.test(name) ? 'vocabulary' : /listen/i.test(name) ? 'listening' : /read|passage/i.test(name) ? 'reading'
  : /speak|spoken|cue ?card/i.test(name) ? 'speaking' : /writ|essay|task ?[12]/i.test(name) ? 'writing' : /basic|pre-?ielts|grammar/i.test(name) ? 'pre-ielts' : 'others';
const HIDDEN = /^students['’]?\s/i; // other people's recordings and homework
const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const MAX_ENTRIES = 100; // history keeps the latest 100 syncs that found changes
const MAX_LISTED = 200; // per sync, how many added items are listed by name

async function list(id, attempt = 1) {
  try {
    const res = await fetch(`https://drive.google.com/embeddedfolderview?id=${id}#list`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const out = [];
    for (const m of html.matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const title = m[2].match(/flip-entry-title">([^<]*)</);
      if (!title) continue;
      const href = decode(m[1]);
      const idm = href.match(/\/(?:folders|file\/d|document\/d|spreadsheets\/d|presentation\/d)\/([\w-]+)/);
      if (!idm) continue;
      const folder = href.includes('/folders/');
      const name = decode(title[1]).trim();
      if (folder && HIDDEN.test(name)) continue;
      // t: type of file, used for the in-page preview address
      const t = folder ? 'folder' : href.includes('/document/') ? 'doc' : href.includes('/spreadsheets/') ? 'sheet' : href.includes('/presentation/') ? 'slides' : 'file';
      out.push({ i: idm[1], n: name, t });
    }
    return out;
  } catch (e) {
    if (attempt < 3) { await new Promise((r) => setTimeout(r, 800 * attempt)); return list(id, attempt + 1); }
    console.warn(`  ! could not read ${id}: ${e.message}`);
    return null;
  }
}

// pick up folders added next to the ones already linked
const known = new Set([...sources.map((x) => x.id), ...SKIP]);
let added = 0;
for (const parent of WATCHED) {
  for (const it of (await list(parent)) ?? []) {
    if (it.t !== 'folder' || known.has(it.i)) continue;
    known.add(it.i);
    sources.push({ skill: skillFor(it.n), name: it.n, id: it.i });
    console.log(`  + new folder "${it.n}" -> ${sources[sources.length - 1].skill}`);
    added++;
  }
}
if (added) await writeFile(sourcesUrl, JSON.stringify(sources, null, 1) + '\n');

const folders = {};
const queue = sources.map((s) => s.id);
let done = 0;
while (queue.length) {
  const id = queue.shift();
  if (id in folders) continue;
  const items = await list(id);
  if (!items) continue;
  folders[id] = items;
  for (const it of items) if (it.t === 'folder' && !(it.i in folders)) queue.push(it.i);
  if (++done % 10 === 0) console.log(`  ${done} folders…`);
}

const files = Object.values(folders).reduce((n, l) => n + l.filter((x) => x.t !== 'folder').length, 0);
let before = null;
try { before = JSON.parse(await readFile(snapshotUrl, 'utf8')); } catch { /* first run */ }
// only rewrite files when something really changed, so scheduled runs do not create empty commits
if (before && JSON.stringify(before.folders) === JSON.stringify(folders)) {
  console.log(`No changes (${Object.keys(folders).length} folders, ${files} files).`);
  process.exit(0);
}

// ---- what changed? (skipped on the very first run: there is nothing to compare with) ----
const flat = (f) => new Map(Object.entries(f).flatMap(([parent, items]) => items.map((it) => [it.i, { ...it, parent }])));
if (before && Object.keys(before.folders).length) {
  const oldAll = flat(before.folders);
  const newAll = flat(folders);

  // where every item sits: path of folders from its linked source, and the card (skill) it belongs to
  // sources on specific cards win over the catch-all "Others" ones (e.g. "Everything")
  const place = new Map(); // folder id -> { skill, path: [{ id, name }] }
  const ordered = [...sources].sort((a, b) => (a.skill === 'others') - (b.skill === 'others'));
  for (const s of ordered) {
    const stack = [[s.id, { skill: s.skill, path: [{ id: s.id, name: s.name }] }]];
    while (stack.length) {
      const [fid, info] = stack.pop();
      if (place.has(fid)) continue;
      place.set(fid, info);
      for (const it of folders[fid] ?? []) if (it.t === 'folder') stack.push([it.i, { skill: info.skill, path: [...info.path, { id: it.i, name: it.n }] }]);
    }
  }

  const addedItems = [...newAll.values()].filter((it) => !oldAll.has(it.i));
  const removed = [...oldAll.keys()].filter((k) => !newAll.has(k)).length;
  if (addedItems.length || removed) {
    // a folder that is new as a whole is listed once, not file by file
    const newFolderIds = new Set(addedItems.filter((it) => it.t === 'folder').map((it) => it.i));
    const top = addedItems.filter((it) => !newFolderIds.has(it.parent));
    const entry = {
      at: Date.now(),
      files: addedItems.filter((it) => it.t !== 'folder').length,
      removed,
      added: top.slice(0, MAX_LISTED).map((it) => {
        const p = place.get(it.parent);
        return { id: it.i, name: it.n, type: it.t, skill: p?.skill ?? 'others', path: p?.path ?? [], in: it.parent };
      }),
      more: Math.max(0, top.length - MAX_LISTED),
    };
    let history = { since: before.at, entries: [] };
    try { history = JSON.parse(await readFile(historyUrl, 'utf8')); } catch { /* first run */ }
    history.entries = [entry, ...history.entries].slice(0, MAX_ENTRIES);
    await writeFile(historyUrl, JSON.stringify(history));
    console.log(`  history: ${entry.files} new files, ${removed} removed.`);
  }
}

await writeFile(snapshotUrl, JSON.stringify({ at: Date.now(), folders }));
console.log(`Saved ${Object.keys(folders).length} folders and ${files} files.`);
