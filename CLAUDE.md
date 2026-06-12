# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pattern Lab** — a fully offline, single-user interactive study app for coding interview patterns (19 modules). Premium "interactive book" style: animated step-through visualizers, in-browser Python execution, quizzes, SM-2 spaced repetition. No backend, no auth, no network calls except the Pyodide CDN load.

## Stack

- React 18 + Vite 5 + TypeScript (strict), React Router with **hash routing** (must work from `file://` and Tauri)
- Tailwind CSS 3.4 — dark mode default (`class` strategy), theme via CSS variables in `src/index.css`
- CodeMirror 6 for the Python editor
- **Pyodide from CDN inside a Web Worker** for the code judge (5-second timeout per run; UI must never freeze)
- Framer Motion for visualizer transitions
- All user state in localStorage behind `src/lib/storage.ts` (single key `pattern-lab:v1`, export/import JSON)
- Node 18 on this machine — do not upgrade Vite/Tailwind to versions requiring Node 20+

## Commands

```bash
npm run dev                # Vite dev server
npm run build              # tsc -b && vite build (the phase-gate verification)
npm run typecheck          # tsc -b --noEmit
npm run validate-content   # schema-check all content files + execute reference
                           # solutions against their test cases via system python3
npx tsx scripts/validate-content.ts <module-id>   # validate one module
```

## Architecture

### Content layer (`src/content/`)

- `types.ts` — **the content schema** (`ModuleContent`). Source of truth for what a module file must contain. Read it before writing content.
- `registry.ts` — metadata for all 19 modules (always present) + a runtime registry. Module content files default-export a `ModuleContent`; `src/content/index.ts` imports each file and calls `registerModule()`. A module without a registered content file renders as "coming soon".
- `modules/<module-id>.ts` — one file per module, written from scratch (see standing rules).

### Judge semantics (validator and Pyodide worker must stay in sync)

Test case `input` is positional args to `functionName`; comparison is JSON round-trip with 1e-6 float tolerance, strict booleans, optional `unordered: true` multiset compare for top-level arrays. Inputs/expected must be JSON-safe (no tuples). ≥2 visible and ≥2 hidden cases per problem.

### Visualizers (`src/components/visualizers/`)

Step-engine contract in `engine.ts`: each visualizer is a **pure function** `input → Frame[]` (data snapshot + caption + pseudocode line), rendered by `StepPlayer.tsx` (play/pause/step/scrub/speed). Frames are precomputed and immutable — deterministic and step-reversible, never timers mutating state. `viz/two-pointers.tsx` is the canonical example; `VisualizerHost.tsx` lazy-loads by `VisualizerId`.

### State

`src/lib/storage.ts` (debounced persistence, sanitizing import), `useAppState.ts` (useSyncExternalStore hook), `progress.ts` (module/overall progress weighting), `sm2.ts` (spaced-repetition scheduler).

## Build Plan (7 phases — verify each before starting the next)

1. **Skeleton & shell** — scaffold, sidebar + progress rings, dashboard, settings ✅ verified
2. **Content engine & reader** — schema, markdown renderer (complexity chips), module tabs, first 3 modules (Two Pointers, Hash Maps & Sets, Sliding Windows) ✅ verified
3. **Interactive visualizers** — step engine + 15 visualizers, editable inputs
4. **Practice arena** — CodeMirror + Pyodide worker judge, hints gate, solution reveal (solved-with-help vs solved-clean), draft autosave
5. **Quiz, flashcards, mock interview** — instant-feedback quiz + sparkline history, SM-2 review deck, 45-min mock with report
6. **Full content pass** — remaining 16 modules, validated module by module
7. **Polish & package** — keyboard shortcuts, printable cheat sheets, decision-tree page, Tauri desktop build, README

## Standing Rules

1. **Run `npx tsc -b --noEmit` after every change set.** Fix all TypeScript errors before moving on.
2. **All explanations, problem statements, solutions, hints, quiz questions, and flashcards must be original writing.** Never reproduce text from published books, courses, or websites. Classic problems may be referenced by name only in `furtherPractice`. (A copyrighted interview-prep PDF sits in this directory — do not read or reproduce it; it is gitignored.)
3. **Commit with a descriptive message at the end of each verified phase.**
4. Content changes must pass `npm run validate-content` before a phase is considered done.
