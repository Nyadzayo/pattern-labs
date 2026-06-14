# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Resuming work?** Read `PROGRESS.md` first — it's the live checkpoint of what's done and
> what's next. All 7 phases plus Phase 5.5 (Primitives Lab), Phase 5.6 (Mastery & Recall), and
> Phase 5.7 (Subgoal & Metacognition) are in progress/complete. Detailed designs:
> `docs/PRIMITIVES_LAB_PLAN.md`, `docs/MASTERY_RECALL_PLAN.md`, `docs/SUBGOAL_METACOGNITION_PLAN.md`.

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
npm run validate-primitives        # validate all authored Primitives-Lab primitives
npm run validate-primitives:full   # + enforce full manifest & per-module coverage
npm run validate-sprint            # schema-check all Pattern-Sprint stems (pattern/look-alike invariants)
npm run validate-katas             # check every Code-Kata entry resolves to a primitive write rung
npm run test                       # vitest (pure reducer, checkers, SM-2, tells, kata-diff, sprint-score)
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
3. **Interactive visualizers** — step engine + 15 visualizers, editable inputs ✅ verified
4. **Practice arena** — CodeMirror + Pyodide worker judge, hints gate, solution reveal (solved-with-help vs solved-clean), draft autosave ✅ verified
5. **Quiz, flashcards, mock interview** — instant-feedback quiz + sparkline history, SM-2 review deck, 45-min mock with report ✅ verified
5.5 **Primitives Lab** — Brilliant-style faded-scaffolding drills (**40** micro-pattern primitives, 6-rung ladder: predict→order→fade→cloze→roles→write), pure reducer engine, SM-2 per primitive, Daily Drill, Learn-tab strips, mock-report tells. ✅ verified (34 vitest, `validate-primitives:full` 0 errors). Design in `docs/PRIMITIVES_LAB_PLAN.md`; authoring contract in the `write-primitive` skill.
5.6 **Mastery & Recall** — two skills the rest of the app under-trains: motor memory and pattern recognition. **Code Katas** (timed typing of the 40 primitive write-rung solutions — guided / fading / blank-page recall, char-level diff, hesitation map, WPM trend, "automatic" badge) + **Pattern Sprint** (timed recognition game over ~80 original problem-stem cards: Warmup / Sprint / Sudden-Death, 6-option discriminator grid from each stem's tagged look-alikes, SM-2 per stem) + a mixed **Daily Warm-up**. Pure deterministic diff/score reducers. Design in `docs/MASTERY_RECALL_PLAN.md`; stem-authoring contract in the `write-sprint-card` skill. ✅ verified (61 vitest, validate-sprint --full + validate-katas 0 errors, browser-swept)
5.7 **Subgoal & Metacognition** — the transfer-to-novel-problems gap. Core: **self-generated subgoal labeling** — solutions chunked into purpose-labeled steps; the learner types their *own* label per chunk (lenient keyword grading), then the canonical label is revealed for comparison with misconception feedback (**generate-then-reveal, never read-the-labels**). A new **`label` rung** sits between Roles and Write in the Primitives-Lab ladder (now 7 rungs: predict→order→fade→cloze→roles→label→write). Plus **productive failure** (attempt-first before instruction unlocks, with an attempt-vs-worked diff) and **confidence calibration** (1-tap predict-then-check before each reveal/submit → Dashboard Calibration card flagging overconfidence by module). Integrations: visualizer subgoal captions, auto subgoal flashcards, mock-report structure check, cheat-sheet skeletons (Parsons label-mode deferred as redundant with the label rung). Pure unit-tested `subgoalGrade`/`calibration` reducers. ✅ verified (80 vitest, all validators 0 errors, browser-swept). All 40 primitives + first 3 modules annotated; the other 16 modules are a deferred resumable annotation workflow. Design in `docs/SUBGOAL_METACOGNITION_PLAN.md`.
6. **Full content pass** — all 19 modules, expanded to 9 problems each, validated ✅ verified
7. **Polish & package** — keyboard shortcuts, printable cheat sheets, decision-tree page, Tauri desktop build, README ✅ verified

## Standing Rules

1. **Run `npx tsc -b --noEmit` after every change set.** Fix all TypeScript errors before moving on.
2. **All explanations, problem statements, solutions, hints, quiz questions, drills, and flashcards must be original writing.** Never reproduce text from published books, courses, or websites. Classic problems may be referenced by name only in `furtherPractice`. (A copyrighted interview-prep PDF sits in this directory — do not read or reproduce it; it is gitignored.)
3. **Commit with a descriptive message at the end of each verified phase.**
4. Content changes must pass `npm run validate-content` before a phase is considered done.
5. **Mastery & Recall (Phase 5.6) invariants:** kata diff and sprint scoring are **pure, deterministic, unit-tested reducers** (no `Date`/`Math.random`/judge inside — pass timestamps and seeds in). **Disable paste in kata editors** — typing is the point. The keystroke timer feeding the hesitation map **must not drop events under fast typing** (capture per input event; paste is off so one char per event). Pattern-Sprint stems are **original writing** and must pass `npm run validate-sprint`; kata entries must pass `npm run validate-katas`.
6. **Subgoal & Metacognition (Phase 5.7) invariants:** the labeling exercise is **generate-then-reveal** — the learner types their own label *before* any reference label is shown; never render the canonical labels as readable text up front. Per chunk, show **a hint OR feedback, never both in the same attempt** (hint is pre-submission only, reference/feedback post-submission only). `subgoalGrade` (lenient keyword match + which-chunk-it-matched) and `calibration` (predicted-vs-actual aggregation) are **pure, deterministic, unit-tested reducers** (no `Date`/`Math.random` inside). Subgoal labels are **abstract/context-free** (role, not variable names) and **original writing**; every chunk needs `lineRange` + `referenceLabel` + non-empty `acceptableKeywords`, ranges contiguous/non-overlapping/in-bounds — enforced by `validate-content` / `validate-primitives`. Confidence capture fires **before** the reveal/submit it measures.

## Multi-agent workflow conventions (learned from quota-wall failures)

- **Small resumable batches**: ≤ ~6 agents per workflow run; resume dead agents with `resumeFromRunId` (completed agents return from cache). A large fan-out that hits a session limit mid-run leaves a messy partial state.
- **Writes self-validate**: authoring agents run the python3 validator themselves, so a completed write is known-good even if its review never runs. Treat reviews as a *separate, optional* pass — never block correctness on them.
- **Terse workflow returns**: write detail to a file, return only `{id, ok, count}`. Giant result blobs land in the main context permanently and are a primary token sink.
- **One file per agent** (idempotent ownership); the orchestrator owns shared wiring (`index.ts`, `App.tsx`).
