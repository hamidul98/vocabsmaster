# IELTS Book Vocab — handoff to the UI agent

Spec: `ielts-book-vocab-prompt.md` (read it for features/design). This repo is the **scaffold + data layer**; the **UI is yours to build**.

## Stack (versions installed)
React 19 · Vite 8 · TypeScript · **HeroUI v3** (`@heroui/react`, `@heroui/styles`) · Tailwind CSS 4 · react-router-dom 7 (HashRouter) · vite-plugin-pwa 2 · framer-motion.

> HeroUI **v3** differs from v2: no `HeroUIProvider`, Tailwind 4 (`@import "@heroui/styles"` in `src/index.css`), compound components (`Card.Header`, …). Check https://heroui.com/docs for current component APIs (some v2 parts such as `Navbar` may not exist — build with Tailwind if so).

## Done (don't rewrite, just use)
| File | Purpose |
|---|---|
| `src/lib/sheet.ts` | Google Sheet reader. `SHEET_ID`/`MAIN_TAB` constants on top. `fetchIndex()`, `fetchPassage(ref)` |
| `src/lib/types.ts` | `PassageRef`, `Word`, `Passage`, `SheetError` |
| `src/lib/progress.tsx` | `useProgress()` → `marks`, `toggle(wordId, "learned"\|"difficult")`, `statusOf`, `streak` (localStorage) |
| `src/lib/quiz.ts` | `buildQuiz(words, reverse)` → questions with 4 options |
| `src/lib/speech.ts` | `speak(text)` en-GB |
| `src/lib/util.ts` | `shuffle`, `pickByDate` (word of the day) |
| `src/hooks/useLibrary.tsx` | `useLibrary()` (index, passages, loadAll…) and `usePassage(slug)` |
| `src/hooks/useTheme.ts` | light default, `dark` class on `<html>`, persisted |
| `src/hooks/usePwa.ts` | `online`, `canInstall/install`, `showIosHint`, `needRefresh/reloadForUpdate` |
| `src/App.tsx`, `main.tsx` | Routes + providers |
| `vite.config.ts`, `index.html`, `public/` | PWA manifest, caching, iOS meta, placeholder icons |

## TODO (UI) — every stub has a `TODO(UI agent)` comment describing what to build
`components/Layout.tsx` (navbar + mobile bottom nav, theme toggle, offline notice, update toast, install button) ·
`pages/Home.tsx` · `pages/PassagePage.tsx` (list / flashcards / quiz tabs) · `pages/SearchPage.tsx` ·
`pages/DifficultPage.tsx` · `pages/SettingsPage.tsx`. Add reusable `WordCard`, `Flashcards`, `Quiz` in `components/`.
Also: accent colour theme in `index.css`, "Hide meanings" setting, README with deploy/install instructions.

## Real sheet differs from the prompt (already handled in `sheet.ts`)
Passage tabs have headers: `No. | Paragraph | English Vocabulary | বাংলা অর্থ | Part of Speech | Sentence | (blank columns…)`.
- The word column is detected by header (`vocab`/`word`), not "first column".
- `No.` and blank-header columns are dropped; `Paragraph` shows as an "other" field.
- Bangla column is detected by Bengali script in the header → `kind: "bangla"` (use `.font-bangla`).
- There is **no English meaning column**, so quizzes use the Bangla meaning (`meaningOf` in `quiz.ts`).
- Tab name pattern verified: `21- T3-P1` (note the space after the dash). Passages can have ~250 words; consider virtualizing/paging the list.
- Main tab's LINK column currently holds text ("IELTS book based Vocabs"), not a URL.

## Commands
`npm run dev` · `npm run build` (typecheck + build, currently passes) · `npm run preview`
