import { SheetError, type FieldKind, type Passage, type PassageRef, type Word } from "./types";

// ---- Reuse the app with another sheet by changing these two constants ----
export const SHEET_ID = "1Ph7Ml5KwrkyfNE_zGNDEWhbzHAAyuMoNnaCSmSuSf7Q";
export const MAIN_TAB = "Main";
// --------------------------------------------------------------------------

interface GvizCell {
  v: unknown;
  f?: string | null;
}
interface GvizTable {
  cols: { label: string }[];
  rows: { c: (GvizCell | null)[] }[];
}

const cellText = (c: GvizCell | null | undefined): string => {
  if (!c) return "";
  const raw = c.f ?? c.v;
  return raw == null ? "" : String(raw).trim();
};

/** Fetch a tab as a 2D string array. Row 0 = headers. Empty rows removed. */
async function fetchTab(tab: string): Promise<string[][]> {
  const url =
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1` +
    `&sheet=${encodeURIComponent(tab)}`;
  let text: string;
  try {
    // Stable URLs let the production service worker find saved data offline.
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    text = await res.text();
  } catch {
    throw new SheetError(
      'Could not reach the Google Sheet. Make sure it is shared as "Anyone with the link – Viewer".',
      "unreachable",
      tab,
    );
  }
  let table: GvizTable;
  try {
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    if (json.status === "error" || !json.table) throw new Error("gviz error");
    table = json.table;
  } catch {
    // gviz returns an error payload (or an HTML login page) for missing tabs / private sheets
    throw new SheetError(
      `Tab "${tab}" was not found in the sheet (or the sheet is not public).`,
      "tab-not-found",
      tab,
    );
  }

  const labels = table.cols.map((c) => (c.label ?? "").trim());
  const body = table.rows.map((r) => table.cols.map((_, i) => cellText(r.c[i])));
  // gviz sometimes fails to detect the header row and returns empty labels: use first row then.
  const rows = labels.every((l) => !l) ? body : [labels, ...body];
  return rows.filter((r) => r.some((c) => c !== ""));
}

const num = (s: string) => Number(/\d+/.exec(s)?.[0] ?? NaN);

/** A Main-tab row that can't be turned into a tab name yet (e.g. a new book with no test/passage). */
export interface IncompleteRow { bookName: string; missing: string[] }

export async function fetchIndexReport(): Promise<{ refs: PassageRef[]; incomplete: IncompleteRow[] }> {
  const [header, ...rows] = await fetchTab(MAIN_TAB);
  if (!header) return { refs: [], incomplete: [] };
  const col = (name: string) => header.findIndex((h) => h.toUpperCase().includes(name));
  const iName = col("IELTS NAME"),
    iTest = col("TEST"),
    iPass = col("PASSAGE"),
    iLink = col("LINK");
  const refs: PassageRef[] = [];
  const incomplete: IncompleteRow[] = [];
  for (const r of rows) {
    const bookName = r[iName] ?? "";
    const bookNumber = num(bookName),
      testNumber = num(r[iTest] ?? ""),
      passageNumber = num(r[iPass] ?? "");
    const missing = [
      Number.isNaN(bookNumber) && "a number in IELTS NAME",
      Number.isNaN(testNumber) && "TEST NO",
      Number.isNaN(passageNumber) && "PASSAGE NUMBER",
    ].filter(Boolean) as string[];
    if (missing.length) {
      incomplete.push({ bookName: bookName || "(row without a name)", missing });
      continue;
    }
    refs.push({
      bookName,
      bookNumber,
      testNumber,
      passageNumber,
      link: r[iLink] ?? "",
      tabName: `${bookNumber}- T${testNumber}-P${passageNumber}`,
      slug: `${bookNumber}-T${testNumber}-P${passageNumber}`,
    });
  }
  return { refs, incomplete };
}

export const fetchIndex = async () => (await fetchIndexReport()).refs;

export function fieldKind(label: string): FieldKind {
  const l = label.toLowerCase();
  if (/bangla|\bbn\b|bengali|[\u0980-\u09ff]/.test(l)) return "bangla";
  if (l.includes("meaning")) return "meaning";
  if (/example|sentence/.test(l)) return "example";
  if (l.includes("synonym")) return "synonym";
  if (l.includes("antonym")) return "antonym";
  if (/part of speech|\bpos\b/.test(l)) return "pos";
  return "other";
}

/** The word column = header containing "vocab" or "word"; falls back to the first column. */
const wordColumn = (headers: string[]) => {
  const i = headers.findIndex((h) => /vocab|word/i.test(h));
  return i === -1 ? 0 : i;
};

/** Index/helper columns that are not worth showing (e.g. "No.", "#"). */
const isHiddenHeader = (h: string) => !h || /^(no\.?|#|sl\.?|serial)$/i.test(h);

export async function fetchPassage(ref: PassageRef): Promise<Passage> {
  const [headers = [], ...rows] = await fetchTab(ref.tabName);
  const wi = wordColumn(headers);
  // id = `${tab}::${word}`; a word that appears twice in one tab gets "#2", "#3"… so marks never collide
  const seen = new Map<string, number>();
  const words: Word[] = rows
    .filter((r) => r[wi])
    .map((r) => {
      const n = (seen.get(r[wi]) ?? 0) + 1;
      seen.set(r[wi], n);
      return {
        id: `${ref.tabName}::${r[wi]}${n > 1 ? `#${n}` : ""}`,
        tabName: ref.tabName,
        word: r[wi],
        fields: headers
          .map((label, i) => ({ label, value: r[i] ?? "", kind: fieldKind(label), i }))
          .filter((f) => f.i !== wi && !isHiddenHeader(f.label) && f.value)
          .map(({ label, value, kind }) => ({ label, value, kind })),
      };
    });
  return { ref, headers, words };
}
