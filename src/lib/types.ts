export interface PassageRef {
  /** Main tab row, e.g. "IELTS 21 Academic 2026" */
  bookName: string;
  bookNumber: number;
  testNumber: number;
  passageNumber: number;
  link: string;
  /** Sheet tab name, e.g. "21- T3-P1" */
  tabName: string;
  /** URL-safe id used in routes, e.g. "21-T3-P1" */
  slug: string;
}

export type FieldKind = "meaning" | "bangla" | "example" | "synonym" | "antonym" | "pos" | "other";

export interface Word {
  /** Stable key: `${tabName}::${word}` — used for localStorage progress */
  id: string;
  tabName: string;
  word: string;
  /** All other columns, in sheet order. Labels come from the header row. */
  fields: { label: string; value: string; kind: FieldKind }[];
}

export interface Passage {
  ref: PassageRef;
  headers: string[];
  words: Word[];
}

export class SheetError extends Error {
  constructor(
    message: string,
    public kind: "unreachable" | "tab-not-found" | "parse",
    public tabName?: string,
  ) {
    super(message);
  }
}
