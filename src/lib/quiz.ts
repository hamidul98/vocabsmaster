import type { Word } from "./types";
import { shuffle } from "./util";

export interface Question {
  word: Word;
  prompt: string;
  options: string[];
  answer: string;
}

/** Quiz "meaning": an English meaning column if present, else the Bangla one, else the first field. */
export const meaningOf = (w: Word) =>
  (w.fields.find((f) => f.kind === "meaning") ?? w.fields.find((f) => f.kind === "bangla") ?? w.fields[0])?.value ?? "";

/** reverse=false: show word, pick meaning. reverse=true: show meaning, pick word. */
export function buildQuiz(words: Word[], reverse = false): Question[] {
  const usable = words.filter((w) => meaningOf(w));
  return shuffle(usable).map((w) => {
    const answer = reverse ? w.word : meaningOf(w);
    const alternatives = [...new Set(usable.filter(o => o.id !== w.id).map(o => reverse ? o.word : meaningOf(o)))].filter(option => option !== answer);
    return {
      word: w,
      prompt: reverse ? meaningOf(w) : w.word,
      answer,
      options: shuffle([answer, ...shuffle(alternatives).slice(0, 3)]),
    };
  }).filter(q => q.options.length > 1);
}
