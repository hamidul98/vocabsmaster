# Prompt: IELTS Book Vocab — Web App + Installable Mobile App (PWA)

Build me a complete, polished app for learning IELTS vocabulary. All the data comes live from my Google Sheet. It must work **both as a normal website and as an installable mobile app** (a Progressive Web App) that students can add to their phone's home screen and open full-screen like a native app.

**Tech stack**

- **React + Vite + TypeScript**
- **HeroUI** (latest version, heroui.com) for all UI components: Card, Button, Tabs, Input, Navbar, Progress, Chip, Switch, Skeleton, Modal, etc. Follow HeroUI's current official setup guide (Tailwind CSS + HeroUI provider/theme). Use HeroUI components wherever possible instead of custom ones.
- **Tailwind CSS** (as required by HeroUI)
- **vite-plugin-pwa** for the installable app
- No backend, no database, no API keys. It must deploy as a static site (Netlify, Vercel or GitHub Pages).

---

## 1. Data source (Google Sheet)

- **Sheet ID:** `1Ph7Ml5KwrkyfNE_zGNDEWhbzHAAyuMoNnaCSmSuSf7Q`
- **Sheet link:** https://docs.google.com/spreadsheets/d/1Ph7Ml5KwrkyfNE_zGNDEWhbzHAAyuMoNnaCSmSuSf7Q/edit?usp=sharing
- **Sharing:** "Anyone with the link – Viewer" (public, read-only)

Read each tab with the Google Visualization endpoint (no API key needed):

```
https://docs.google.com/spreadsheets/d/SHEET_ID/gviz/tq?tqx=out:json&headers=1&sheet=TAB_NAME
```

- The response is wrapped JS. Strip everything before the first `{` and after the last `}`, then `JSON.parse`.
- Use `cell.f` (formatted value) if present, otherwise `cell.v`.
- Skip completely empty rows.
- Add a cache-busting param (`&t=timestamp`) so new words show up after a refresh.
- Put all sheet-reading code in one module (e.g. `src/lib/sheet.ts`) with `SHEET_ID` and `MAIN_TAB` as constants at the top, so I can reuse the app with another sheet.

### Sheet structure

**Tab "Main"**: an index of passages.

| IELTS NAME | TEST NO | PASSAGE NUMBER | LINK |
|---|---|---|---|
| IELTS 21 Academic 2026 | TEST - 3 | 1 | (link) |

**One tab per passage**, named in this pattern:

```
{bookNumber}- T{testNumber}-P{passageNumber}
```

Examples: `21- T3-P1`, `21- T3-P2`, `21- T3-P3`

Build the tab name from each Main row: take the number from IELTS NAME (21), the number from TEST NO (3), and the PASSAGE NUMBER (1).

**Inside each passage tab:**

- Row 1 is headers, and the **first column is always the word**.
- My header row looks like this: `Word | ______ | ______ | ______ | ______` *(fill in from your sheet)*
- Other columns may vary between tabs, so **do NOT hardcode column names**. Detect them from the header row and display them dynamically, using the header names as labels.
- Style fields by header keyword:
  - "meaning" → main definition, prominent
  - "bangla" / "bn" → Bangla meaning, use a font that renders Bangla well (e.g. Noto Sans Bengali)
  - "example" / "sentence" → italics
  - "synonym" / "antonym" → HeroUI Chips
  - "part of speech" / "pos" → small Chip next to the word

New books, tests and passages will keep being added. The app must pick them up automatically from the Main tab.

---

## 2. Features

### Home / Library

- Books grouped as HeroUI Cards (e.g. "IELTS 21 Academic 2026"), tests under each book, passages as buttons.
- Each passage shows its word count and my progress (e.g. "12/30 learned" with a HeroUI Progress bar).
- An overall stats strip at the top: total words, learned, difficult, current daily streak.
- "Word of the day" card, picked from all words using the date as a seed.

### Passage view: three modes as HeroUI Tabs

1. **List mode:** word cards in a responsive grid, all fields visible. Search box filters live.
2. **Flashcard mode:** one big card at a time, word on the front and details on the back. Tap/click or Space to flip; arrow keys or swipe for next/prev; Shuffle button; card counter (5/30).
3. **Quiz mode:** multiple choice. Show a word and 4 options taken from the meaning column (the second column), with 3 wrong options drawn from other words in the same passage. Also a reverse mode (show meaning, pick the word). Instant right/wrong feedback, score at the end, and a "Retry wrong answers" button.

### On every word

- 🔊 Pronounce button using the browser's `speechSynthesis` (en-GB voice if available, since IELTS is British).
- Mark as **Learned ✓** or **Difficult ★**. Save in `localStorage`, keyed by tab name + word.
- "Hide meanings" toggle for self-testing: details are blurred until you tap the card.

### Global

- Global search across ALL passages (load tabs in the background); results show which book/test/passage each word comes from.
- "Difficult words" page: every word I starred, from all passages, playable as flashcards or a quiz.
- Routing with React Router (hash routes, e.g. `#/21-T3-P1/flashcards`) so Back/Refresh works, links can be shared, and it works on GitHub Pages without server config.

---

## 3. Light + Dark mode

- **Light mode is the default/primary theme.** The app always opens in light mode on first visit, even if the phone is set to dark.
- A sun/moon toggle (HeroUI Switch or icon Button) in the header switches to dark mode.
- Remember the user's choice in `localStorage`.
- Use HeroUI's built-in light and dark themes, customised with my accent colour, so every component looks right in both modes. Check contrast in both.

---

## 4. Mobile-first + works like a mobile app (PWA)

**Responsive layout**

- Design for phones first (360–430px wide), then tablet and desktop.
- **On mobile:** a bottom navigation bar like a native app (Home · Search · Difficult · Settings), big tap targets (at least 44px), swipe gestures for flashcards, no horizontal scrolling.
- **On desktop:** a top HeroUI Navbar instead of the bottom bar, wider multi-column grid, centered content with a max width.
- Respect phone safe areas (notch / home indicator) with `env(safe-area-inset-*)`.

**Installable app (PWA)**

- Use `vite-plugin-pwa` with a full web app manifest: name "IELTS Book Vocab", short name "Book Vocab", `display: standalone`, theme colour, background colour, and app icons (192px, 512px, and a maskable icon). Generate simple placeholder icons I can replace later.
- Add iOS support: `apple-touch-icon`, `apple-mobile-web-app-capable`, and a status-bar style.
- Show a friendly "Install app" button/banner when the browser allows it (`beforeinstallprompt` on Android/Chrome). On iPhone, show a small hint: "Tap Share → Add to Home Screen".
- **Offline support:** a service worker caches the app shell, and caches sheet data after it loads, so previously opened passages still work without internet. Show a small "Offline – showing saved words" notice when offline.
- When a new version of the app is deployed, show a "Update available – Reload" toast.

---

## 5. Design

- Clean, modern, calm study-app feel. Generous spacing, rounded cards, soft shadows, one strong accent colour (deep blue or teal), good typography (Inter for English, Noto Sans Bengali for Bangla).
- Smooth but subtle animations (card flip, page fade-ins, using Framer Motion, which HeroUI already uses). Nothing flashy.
- App title: **"IELTS Book Vocab"**.

---

## 6. Robustness

- HeroUI Skeleton loaders while data loads.
- Friendly error messages: if a passage tab isn't found, show the exact tab name it looked for, so I can fix the naming in the sheet.
- If the sheet can't be reached at all, explain that it must be shared as "Anyone with the link – Viewer".
- Never inject raw sheet content as HTML (no `dangerouslySetInnerHTML`); render it as text.
- Clean folder structure: `components/`, `pages/`, `lib/`, `hooks/`.

---

## 7. Deliverable

- The complete project with every file in full (`package.json`, `vite.config.ts`, Tailwind/HeroUI config, `index.html`, all `src/` files, PWA manifest and icons).
- Then short instructions:
  - how to install and run it locally (`npm install`, `npm run dev`),
  - how to build and deploy it free on Netlify, Vercel or GitHub Pages,
  - how to install it on a phone (Android and iPhone),
  - the rules I must follow when adding new books/passages to the sheet.
