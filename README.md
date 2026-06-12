# Pattern Lab

A fully offline, single-user interactive study app for coding interview patterns — in the style of premium "interactive book" apps. Nineteen pattern modules, each with an original concept explainer, an animated step-through visualizer, practice problems judged by in-browser Python, quizzes, and SM-2 spaced-repetition flashcards.

All content is original. Classic problems are referenced by name only as "further practice" pointers.

## Features

- **19 curriculum modules** — Two Pointers through Math & Geometry, each with a 600–1000-word concept explainer, 4 original practice problems (3 progressive hints, commented reference solution, 6–10 judge test cases), an 8-question quiz, and 10 flashcards
- **16 interactive visualizers** — pure-function frame engines with play/pause/step/scrub/speed controls, synced pseudocode highlighting, and editable inputs; deterministic and fully step-reversible
- **Practice arena** — CodeMirror editor, Run (visible cases) / Submit (all cases) judged by **Pyodide in a Web Worker** with a 5-second timeout; per-case expected-vs-actual diffs; clean solves tracked separately from solved-with-help
- **Spaced repetition** — SM-2 scheduler, per-module decks plus a global "due today" deck
- **Mock interview mode** — two problems weighted toward your weak modules, 45-minute clock, hints hidden, end-of-session report
- **Extras** — printable per-module cheat sheets, an interactive "Which pattern do I use?" decision tree, a `/gallery` QA page for every visualizer, dark/light themes, JSON export/import of all progress
- **No backend, no auth, no telemetry.** The only network call ever made is loading Pyodide from its CDN (cached afterward).

## Running — web

```bash
npm install
npm run dev        # development server
npm run build      # production build (tsc + vite) → dist/
npm run preview    # serve the production build locally
```

Requires Node 18+. The build uses hash routing, so `dist/` also works served from any static host or opened via `file://`.

## Running — desktop (Tauri)

Requires the [Rust toolchain](https://rustup.rs).

```bash
npm run tauri dev      # desktop app against the dev server
npm run tauri build    # installable desktop bundle for the current OS
```

Bundles land in `src-tauri/target/release/bundle/`.

## Useful commands

```bash
npm run typecheck                                  # strict TS across app + scripts
npm run validate-content                           # schema-check every module AND execute
                                                   # all reference solutions against their
                                                   # test cases with system python3
npx tsx scripts/validate-content.ts <module-id>    # validate one module
```

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `j` / `k` | next / previous module |
| `space` | play/pause the visible visualizer |
| `⌘↵` / `Ctrl+↵` | run code in the practice editor |

## Architecture notes

- `src/content/` — typed content layer; one file per module conforming to `ModuleContent` (`types.ts`), registered in `index.ts`
- `src/components/visualizers/` — step-engine contract (`engine.ts`), shared player (`StepPlayer.tsx`), one file per visualizer in `viz/`
- `src/worker/pyJudge.worker.ts` — Pyodide judge; comparison semantics (JSON round-trip, 1e-6 float tolerance, optional multiset compare) mirror `scripts/validate-content.ts`
- `src/lib/storage.ts` — all user state in one localStorage key with debounced writes, sanitizing import, and JSON backup

Progress, drafts, quiz history, and card schedules live entirely in your browser's localStorage — export a backup from Settings before clearing browser data.
