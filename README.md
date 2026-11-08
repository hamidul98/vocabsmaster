# IELTS Book Vocab

A responsive vocabulary study app built with React, TypeScript, and HeroUI v3.

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Vite. Use `npm run build` to typecheck and build the production app; `npm run preview` serves the result.

## Interface

- Library dashboard with real sheet totals, passage progress, daily vocabulary, and streak.
- Word lists with Bangla meanings, pronunciation, learned/difficult marks, and meaning reveal.
- Keyboard-accessible flashcards (Space/Enter flips; left/right arrows move when focused), swipe navigation, and shuffle.
- Meaning and reverse quizzes with feedback, scores, and retries for wrong answers.
- English/Bangla global search, a difficult-word collection, and persisted study preferences.
- Light/dark themes, desktop navigation, mobile bottom navigation, installation guidance, and update/offline notices.
- Long word lists load 24 cards at a time.

Progress and preferences are saved in the current browser on this device. Learned and difficult are mutually exclusive statuses.

## Vocabulary sheet

The public Google Sheet is configured in `src/lib/sheet.ts`. Keep the sheet shared as **Anyone with the link – Viewer**.

Add books/tests/passages in the Main tab using the existing headers. A passage tab must follow the exact format `21- T3-P1` (including the space after the hyphen). The word header must include “word” or “vocab”. Other headers become dynamic fields; Bengali headers and Bangla/bn/Bengali are recognized as Bangla meanings, part of speech becomes a badge, and sentence/example becomes italic text. Empty rows and unlabelled columns are ignored.

## Google sign-in and sync (optional)

Without setup, progress stays in the current browser. To sync learned/difficult words, colour marks, XP and streak across devices:

1. Create a project at https://console.firebase.google.com (free Spark plan is enough).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable.**
3. **Build → Firestore Database → Create database** (production mode), then paste `firestore.rules` into the **Rules** tab and publish.
4. **Project settings → Your apps → Web (`</>`)** to register a web app, and copy its config.
5. Copy `.env.example` to `.env.local`, fill in the four values, and restart `npm run dev`.
6. When you deploy, add your site's domain under **Authentication → Settings → Authorized domains** and set the same `VITE_FIREBASE_*` variables in Netlify/Vercel.

Data is stored per Google account in `users/{uid}`; the rules allow each user to access only their own document.

## Deploy

Build with `npm run build`, then publish `dist/` as a static site:
- Netlify or Vercel: build command `npm run build`, output directory `dist`.
- GitHub Pages: publish the contents of `dist` using a Pages workflow. Hash routing and relative asset paths support project subpaths.

Use HTTPS in production for service workers and installation. On Android/Chrome, use the install button when offered or the browser menu. On iPhone, choose **Share → Add to Home Screen**. Previously visited vocabulary is cached by the production service worker. Browser storage can be cleared by the user or the browser.

## Styling

HeroUI Card, Button, Chip, TextField, Input, Tabs, Switch, ProgressBar, and Skeleton provide the shared component foundation. Theme tokens and responsive layouts are in `src/index.css`. No API keys or backend are required.

