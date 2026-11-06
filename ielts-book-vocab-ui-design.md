# UI Design Spec: IELTS Book Vocab

Use this together with the main build prompt (`ielts-book-vocab-prompt.md`). That file covers the data and features. **This file covers how every screen should look.** If the two disagree on layout or visuals, follow this file.

The look I want is a bright, friendly, gamified learning dashboard, in the style of modern language-learning apps such as Duolingo or a "Lingora"-style dashboard. I'm attaching a reference screenshot. Match its layout, spacing, softness and colour feel as closely as possible, but with **my own content and my own mascot**, not copied artwork or branding.

Built with **React + HeroUI + Tailwind**. Light mode is the default.

---

## 1. Overall visual style

| Element | Spec |
|---|---|
| Page background | Very light sky blue `#EEF5FF`, with an optional soft radial gradient toward white in the top-left |
| Cards | White `#FFFFFF`, radius 20–24px, very soft shadow (`0 4px 20px rgba(30,80,160,0.06)`), no hard borders (or a 1px `#E6EEF8` border) |
| Primary colour | Bright blue `#1A73F5` (buttons, active nav, progress, links) |
| Text | Headings `#0F1B3D` (near-black navy), body `#4A5878`, muted `#8A97B2` |
| Accent colours (skill tiles) | Purple `#8B5CF6`, red/coral `#F05252`, green `#22C55E`, orange `#F59E0B`. Each tile uses a pale tint of its colour as background (e.g. `#F3EEFF`) and a solid circle icon |
| Gamification colours | Streak flame orange `#FF8A00`, XP gem blue `#3B82F6`, gold `#FBBF24` |
| Font | **Inter** (or Plus Jakarta Sans) for English, **Noto Sans Bengali** for Bangla. Headings 600–700 weight, body 400–500 |
| Big greeting | 32–36px, bold, two lines. Second line (the name) in primary blue, followed by a 👋 emoji |
| Buttons | Fully rounded (pill) primary buttons with a → arrow icon. Secondary buttons are white with a blue label |
| Icons | Lucide icons (outline, 1.75 stroke) in the sidebar. Filled colourful round icons in skill tiles |
| Spacing | Generous: 24px gaps between cards, 20–24px padding inside cards |
| Motion | Subtle: cards fade/slide up 8px on load, buttons scale 0.97 on press, progress bars animate from 0 |

**Dark mode** (secondary, via toggle): page `#0B1220`, cards `#131C2E`, borders `#1F2A40`, primary `#4C8DFF`, text `#E6ECF7` / muted `#8B97AE`. Keep the same tinted skill tiles, but use darker tints (e.g. purple tile `#221A3D`).

---

## 2. Desktop / tablet layout (≥ 1024px)

Three columns, inside a rounded app frame:

```
┌──────────┬────────────────────────────────────┬──────────────┐
│ SIDEBAR  │  TOP BAR (search · streak · XP · 🔔) │              │
│ (240px)  ├────────────────────────────────────┤  RIGHT RAIL  │
│          │  HERO CARD                          │  (300px)     │
│ Logo     │                                     │  Daily Goal  │
│ Nav      │  Continue Learning                  │  Top Books / │
│          │  Study Modes (4 tiles)              │  Hard Words  │
│ Install  │  Your Books (chip row)              │  Milestone   │
│ card     │                                     │  card        │
│ Profile  │                                     │              │
└──────────┴────────────────────────────────────┴──────────────┘
```

### 2.1 Left sidebar

- **Logo block (top):** my own mascot icon (small) + "**IELTS Book Vocab**" in bold, with the tagline "Learn • Practice • Remember" in tiny muted text below.
- **Navigation** (icon + label; the active item has a pale blue pill background `#E3EEFF` and blue text):
  1. Home
  2. Library (all books, tests and passages, with filters)
  3. Practice (flashcards and quiz)
  4. Difficult Words ★
  5. Progress
  6. Search
- **Install card** (where "Lingora Plus" is in the reference): pale blue card with a 📱 icon, title "**Get the App**", text "Install on your phone and study offline", and a full-width blue pill button "**Install**". If the app is already installed, show instead "**Study offline** ✓ All saved passages work without internet".
- **Profile row (bottom):** avatar circle (initials), name, "Level N" (see the XP rules in section 6), and a ⚙️ settings icon that opens Settings (theme toggle, daily goal, reset progress).

### 2.2 Top bar

- **Left:** large rounded search input "Search words, passages…" with a magnifier icon. It searches all words and opens Search results.
- **Right:** 🔥 **streak days**, 💎 **XP total**, 🔔 bell (notification dot when a new passage was added to the sheet since the last visit), and a ☀️/🌙 theme toggle.

### 2.3 Hero card (main column, top)

- Large card, radius 24px, a **light blue gradient** background (`#DCEBFF → #F4F9FF`) with soft clouds or a subtle illustrated scene on the right.
- **Left side:**
  - "Good morning," / "Good afternoon," / "Good evening," based on local time
  - **Name** on the next line, in blue, with 👋 (name is set in Settings; default "Learner")
  - Subtitle: "One passage closer to your Band 8!" (rotate a few short motivational lines)
  - Blue pill button "**Continue Learning →**", which opens the last passage I studied, in the same mode
- **Right side:** my own **original mascot**. Make a cute, simple SVG character, e.g. a friendly owl or book character wearing a graduation cap, with a few London-themed landmarks behind it (Big Ben, a red bus, a red phone box), since IELTS is British. Do not copy the reference bird. Keep it a separate SVG component so I can replace it later.
- **Top-right pill:** "📘 **IELTS 21 Academic** ›", the currently selected book. Clicking opens a dropdown to switch book; this sets the default book filter everywhere.

### 2.4 "Continue Learning" section

- Section header: "**Continue Learning**" on the left, "**See All**" link on the right (goes to Library).
- One wide card (pale blue background `#EAF3FF`):
  - Left: a thumbnail. Generate a coloured gradient tile with the book number big ("21") and "T3 · P1" small, so every passage gets a nice image without uploads.
  - Middle: title "**Passage 1 — 21 T3**" (if the Main tab has a passage title column, use the title), subtitle "IELTS 21 Academic • Test 3", progress bar with "**60%**" (learned / total words).
  - Right: blue pill button "▶ **Start**" (or "Resume").
- If nothing has been started yet, show the first passage with "Start".

### 2.5 "Study Modes" section (replaces "Build Your Skills")

Four tinted tiles in a row, each with a round coloured icon, a title, a count, and a → arrow:

| Tile | Colour | Icon | Subtitle | Opens |
|---|---|---|---|---|
| **Word List** | Purple | 📖 book-open | "{N} words" | List mode of the current passage |
| **Flashcards** | Red/coral | 🃏 layers | "{N} cards" | Flashcard mode |
| **Quiz** | Green | ✅ check-circle | "{N} questions" | Quiz mode |
| **Difficult** | Orange | ★ star | "{N} starred" | Difficult words page |

### 2.6 "Your Books" section (replaces "Popular Languages")

- Header "**Your Books**" + "See All".
- A horizontal scrollable row of white chips/cards. Each shows a small coloured badge with the book number (like the flags in the reference), the book name ("IELTS 21 Academic"), and "{learned}/{total} words" or a ⭐ completion %.
- A circular › arrow button at the end scrolls the row.
- Clicking a book opens the Library, filtered to that book.

### 2.7 Right rail

**a) Daily Goal card** (matches "Your Daily Goal")
- Title "**Your Daily Goal**" + "Edit ›" (opens a small modal to set the goal: 10 / 20 / 30 / 50 words a day).
- A big **circular progress ring** (blue on a pale track) with 🔥 above, "**15 / 20 words**" in the centre, and "Today" below.
- To the right: "**Great job!**" / "Keep going!" and "You're on a **4 day streak** 🔥".
- Below: **7 day dots Mon–Sun**. A filled blue circle with a white ✓ means the goal was met that day; an empty outlined circle means it wasn't (or the day is still to come).
- A "word reviewed today" counts whenever I flip a flashcard, answer a quiz question, or mark a word as learned. Store daily counts in localStorage.

**b) Top Books card** (replaces "Leaderboard", since there's no backend for real users)
- Title "**Top Books**" + a dropdown "**This Week** ▾" (This Week / All Time).
- A ranked list 1–5: a rank badge (gold, silver and bronze for 1–3, then plain numbers), the book or passage name, and "**{N} words**" learned in that period on the right.
- Highlight the row for the currently selected book with a pale blue background, like the "You" row in the reference.
- Option for the dropdown: also offer "**Hardest Words**", which lists the 5 words I got wrong most often in quizzes, with their error counts.

**c) Milestone card** (matches the gift card)
- Pale blue card with a 🎁 gift icon (with small sparkles) on the left.
- Text: "Learn **5 more words** to reach **Level 4**!" or "Finish **2 more passages** to complete **Test 3**!". Pick the closest upcoming milestone.
- A progress bar with "3 / 5" and a round › button that opens the relevant passage.
- When a milestone is reached: a confetti burst and a small HeroUI toast "🎉 Level up!".

---

## 3. Library page with filters (important)

This is where I can find any passage by book, test or passage.

**Filter bar** (sticky under the top bar, in one white rounded card):

| Filter | Type | Options |
|---|---|---|
| **Book** | HeroUI Select (multi) | All books from the Main tab, e.g. "IELTS 21 Academic 2026" |
| **Test** | Select or segmented chips | Test 1, 2, 3, 4 (only tests that exist for the selected books) |
| **Passage** | Chips | P1, P2, P3 |
| **Status** | Chips | All · Not started · In progress · Completed |
| **Words** | Chips | All · Learned · Difficult ★ · New |
| **Sort** | Select | Book order · Most recent · Least progress · Most difficult |
| Search | Input | Filter by passage name or word |

- Filters are **dependent**: choosing Book 21 updates the Test options to only Book 21's tests.
- Active filters show as removable chips below the bar ("Book 21 ✕", "Test 3 ✕"), plus a "**Clear all**" link.
- Show a result count: "**6 passages · 184 words**".
- Save the filters in the URL (`#/library?book=21&test=3&p=1`) so the view can be shared and Back works. Also remember the last-used filters in localStorage.
- **On mobile:** collapse the filter bar into a "**⚙ Filters (2)**" button that opens a bottom sheet (HeroUI Drawer/Modal from the bottom) with the same controls, plus "Apply" and "Reset" buttons.

**Results** (below the filter bar), grouped by book → test:

- A group header per book ("IELTS 21 Academic 2026"), then a sub-header per test ("Test 3").
- **Passage cards** in a grid (3 columns on desktop, 2 on tablet, 1 on mobile), styled like the "Continue Learning" card:
  - gradient thumbnail with the book number,
  - "Passage 1", word count, a progress bar with %,
  - a status chip: Not started (grey), In progress (blue), Completed ✓ (green),
  - a "★ {N}" difficult-word count if there are any,
  - a ▶ Start/Resume button, plus three small icon buttons for List / Flashcards / Quiz.
- Toggle between **Grid view** and **Table view**. The table has columns Book | Test | Passage | Words | Learned | Difficult | Progress | ▶.
- **Word-level filtering:** when the Words filter is Learned, Difficult or New, show a **word list** for the matching passages (word cards like List mode, each tagged with "21 · T3 · P1"), not passage cards.

Use the **same filter component** on the Practice page (to build a flashcard deck or quiz from any combination, e.g. "Book 21 + Test 3 + only Difficult words") and on the Search results page.

---

## 4. Passage screen

- **Header:** back arrow, breadcrumb "IELTS 21 › Test 3 › **Passage 1**", the word count, and a progress ring.
- **HeroUI Tabs** (pill style): **List · Flashcards · Quiz**.
- **List mode:** word cards in a grid (white, radius 20px). The word is big and blue, with the part-of-speech chip next to it and a 🔊 round button. Meaning, Bangla meaning (Noto Sans Bengali), example in italics, and synonyms as small chips. ✓ Learned and ★ Difficult toggle icons in the card's top-right. A "Hide meanings" switch at the top blurs the details.
- **Flashcards:** one large centred card (~420×520px on desktop, nearly full width on mobile) with a 3D flip animation. A pale gradient front shows the word big, plus 🔊. The back shows the fields. Below: ◀ Prev · counter "5 / 30" · Next ▶, and Shuffle. Below those, "I knew it ✓" (green) and "Still learning ★" (orange) pill buttons that mark the word and go to the next card.
- **Quiz:** a progress bar at the top ("Question 4 of 10"), the word in a big card, and 4 answer buttons as large rounded tiles. The correct answer turns green; a wrong pick turns red and the right answer shakes into green. The end screen shows a big score ring, "8/10", XP earned, and "Retry wrong answers" / "Back to passage" buttons. Light confetti for ≥ 80%.

---

## 5. Mobile layout (< 768px): must feel like a native app

- **No sidebar.** Instead, a **bottom tab bar** (fixed, white, rounded top corners, soft shadow, safe-area padding) with 5 items: Home · Library · Practice · Difficult · Profile. The active item shows a blue icon, a label, and a small pill highlight.
- **Top bar:** mascot logo on the left, then 🔥 streak, 💎 XP and 🔔 on the right. Search becomes a 🔍 icon that opens a full-screen search.
- **Home order (single column):**
  1. Hero card (shorter; mascot smaller, on the right)
  2. Daily Goal card (ring + week dots), moved up from the right rail
  3. Continue Learning
  4. Study Modes as a **2×2 grid**
  5. Your Books (horizontal scroll)
  6. Milestone card
  7. Top Books
- The Install card moves to the Profile tab, plus a small one-time banner on Home.
- Flashcards support **swipe** left/right, and tap to flip.
- All tap targets ≥ 44px, and no horizontal page scroll.
- **Tablet (768–1023px):** the sidebar collapses to icons only (72px), and the right-rail cards move under the main content in a 2-column grid.

---

## 6. Gamification rules (no backend; everything in localStorage)

- **XP:** +2 per flashcard reviewed, +5 per correct quiz answer, +10 per word marked Learned, +50 for completing a passage (all words learned).
- **Level:** every 250 XP = 1 level. Show it in the profile row and on the Progress page.
- **Streak:** consecutive days on which the daily goal was met. Missing a day resets it to 0.
- **Progress page:** a big stats row (total words, learned, difficult, streak, XP), a 30-day bar chart of words reviewed per day, per-book progress bars, and a GitHub-style calendar heatmap.

---

## 7. Empty, loading and error states

- **Loading:** HeroUI Skeletons shaped exactly like each card (the hero, the ring, the tiles), not a generic spinner.
- **Empty:** a friendly mascot illustration with a short message, e.g. "No difficult words yet, star a word while studying ★", and a button to go to the Library.
- **Errors:** the mascot looking confused + a clear message (the missing tab name, or the sheet sharing setting) + a "Try again" button.
- **Offline:** a small amber pill at the top: "Offline – showing saved words".

---

## 8. Checklist before you finish

- [ ] The home screen matches the reference layout: sidebar, top bar, hero with mascot, Continue Learning, 4 tinted tiles, chip row, and a right rail with goal ring + ranked list + milestone card.
- [ ] Everything uses my sheet data. Nothing is hardcoded except the sample greeting text.
- [ ] Library filters work: Book → Test → Passage are dependent, plus status and word filters, saved in the URL, with a bottom-sheet version on mobile.
- [ ] Light mode is the default; dark mode looks equally polished.
- [ ] On a phone it looks and feels like a native app (bottom tabs, swipe, installable, offline).
- [ ] The mascot and all artwork are original SVGs, not copied from the reference.
