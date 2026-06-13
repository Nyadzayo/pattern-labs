# Pattern Lab — Progress & Resume Checkpoint

> Durable state so a fresh session can continue without replaying the build transcript.
> Read this, then `CLAUDE.md`, then the relevant files. Detailed Primitives Lab design
> lives in the plan file: `docs/PRIMITIVES_LAB_PLAN.md`.

## Status

| Phase | What | State |
|---|---|---|
| 1 | Skeleton & shell (sidebar, dashboard, settings, storage, schema) | ✅ committed |
| 2 | Content engine & reader (markdown renderer, module tabs) | ✅ committed |
| 3 | 15 step-engine visualizers + `/gallery` QA route | ✅ committed |
| 4 | Practice arena (Pyodide worker judge, CodeMirror, hints/solution gates) | ✅ committed |
| 5 | Quiz + flashcards (SM-2) + mock interview | ✅ committed |
| 6 | Full content: all 19 modules | ✅ committed |
| — | Expand every module to **9 problems** (was 4) | ✅ committed (this checkpoint) |
| **5.5** | **Primitives Lab** (40 primitives, 6-rung ladder) | ✅ **committed** |
| **5.6** | **Mastery & Recall** (Code Katas + Pattern Sprint + Daily Warm-up) | ✅ **committed** |
| 7 | Polish & package (cheat sheets, decision tree, shortcuts, Tauri) | ✅ done |

Content now: 19 modules × **9 problems** (171 total), 8 quiz Qs each, 10 flashcards each.
`npm run validate-content` = 19 modules, 0 errors (executes every reference solution in python3).
Primitives Lab: **40 primitives** × 6 rungs. `npm run validate-primitives:full` = 0 errors,
0 warnings (executes predict keys, write solutions, and reconstructs order/fade/cloze to snippet).

## DONE: Primitives Lab (Phase 5.5)

Brilliant-style drills for **40 recurring micro-patterns** on a **6-rung fading ladder**:
1 Predict (MC) · 2 Order (Parsons) · 3 Fade (Parsons+blanks) · 4 Cloze (typed blanks) ·
5 Roles (assign variable roles) · 6 Write (from scratch, Pyodide-judged). Wrong answers give
misconception-specific feedback + shake + re-queue (3-attempt cap then reveal). SM-2 schedules
each primitive (pass→promote rung, fail→demote; mastered = rung 6 on 2 distinct days). Dashboard
Daily Drill (module-first interleave); module Learn tabs show a "primitives used here" strip;
mock report flags weakest primitives via a precision-first code tell-set.

Built in 6 steps (all committed): engine+validator+5 hand-authored → fade/cloze/roles renderers →
write/judge → SM-2/Daily-Drill/Learn-strip/mock-tells → 35 primitives via workflow batches →
coverage + browser sweep. The pure reducer, checkers, SM-2, interleaver, and mock tells are
unit-tested (**34 vitest**). Design lives in `docs/PRIMITIVES_LAB_PLAN.md` (Part B); the
authoring contract is the `write-primitive` skill.

### Key Primitives Lab files
- Schema `src/content/primitives/types.ts` · manifest `…/manifest.ts` · items `…/items/<id>.ts` ·
  registry `…/registry.ts` · self-registration `…/index.ts`.
- Engine `src/lib/drillEngine.ts` (reducer, mulberry32, interleave) + `src/lib/drillCheckers.ts`.
- SM-2 `src/lib/sm2.ts` (`applyDrillResult`, `gradeDrill`) · selectors `src/lib/drills.ts` ·
  mock tells `src/lib/primitiveTells.ts`. State key `drills` in `storage.ts` (whitelisted).
- UI `src/components/drills/*` (one view per rung + `DrillSession`) · page `src/pages/DrillsPage.tsx`.
- Validator `scripts/validate-primitives.ts` (`--full` enforces coverage).

## DONE: Mastery & Recall (Phase 5.6)

Two trainers for the skills the rest of the app under-trains — motor memory and pattern recognition —
plus a mixed Daily Warm-up. Design: `docs/MASTERY_RECALL_PLAN.md`. Built in 6 committed steps
(0 scaffolding → A Sprint MVP → B Sudden-Death/SM-2/stems → C Katas guided → D fading/blank-page →
E metrics/warm-up/mock-links), each browser-verified. **90 sprint stems** (validate-sprint --full 0/0),
**40 katas** (validate-katas 0/0), **61 vitest** (sprintScore, kataDiff, warmup + prior suites);
tsc/build green; validate-content 19/0 and validate-primitives:full 40/0 unchanged.

- **Code Katas** — type the 40 primitive **write-rung solutions** from memory. Three modes: guided
  (reference shown, char-level diff), fading (5s reveal then hidden), blank-page (name+intent only,
  judged via the existing Pyodide `runJudge` against the primitive's `testCases`). Hesitation map from
  timestamped keystrokes, WPM/accuracy sparkline, "automatic" badge (blank-page under par @100% on 2
  distinct days). Paste disabled. Catalog `src/content/katas/index.ts`; resolver `src/lib/katas.ts`;
  pure diff `src/lib/kataDiff.ts`.
- **Pattern Sprint** — ~80 original problem-stem cards, each tagged with its correct pattern + 2–3
  look-alikes. Warmup / Sprint / Sudden-Death rounds; 6-option discriminator grid (correct + look-alikes
  + fillers, deterministically shuffled); "the tell was…" feedback; SM-2 per stem with adaptive
  resurfacing. Content `src/content/sprint/`; scoring `src/lib/sprintScore.ts`; selectors `src/lib/sprint.ts`.
- **Integration** — Dashboard Daily Warm-up (`src/lib/warmup.ts`, one of each type, capped/day),
  shared streak, mock-report links to katas + confused-pair Sprint cards.

Build steps (commit per step): 0 docs/scaffolding → 1 Sprint MVP → 2 Sudden-Death+SM-2+stems →
3 Katas guided → 4 fading+blank-page → 5 metrics+warm-up+mock-links. New state keys `sprint`,
`sprintStats`, `katas` (whitelisted in `sanitizeState`). New validators `validate-sprint`,
`validate-katas`. Stem-authoring contract: the `write-sprint-card` skill.

## Resilient-workflow conventions (learned the hard way — quota walls killed mid-runs)

- **Batches ≤ ~6 agents per workflow run**; resume dead agents via `resumeFromRunId`.
- **Writes self-validate** (run the python3 validator), so a completed write is known-good even
  if its review agent never runs. Reviews are a *separate, optional* pass.
- **Terse workflow returns** — write detail to a file, return `{id, ok, count}`; giant result
  blobs in task-notifications are a primary token sink.
- One file per agent (idempotent ownership).

## Key file map

- Content schema: `src/content/types.ts` · per-module files `src/content/modules/<id>.ts` ·
  registry `src/content/registry.ts` · self-registration `src/content/index.ts`.
- Judge: `src/lib/judge.ts` (`runJudge(code, fn, cases)`, 5s timeout, respawn) + worker
  `src/worker/pyJudge.worker.ts`. Comparison semantics mirror `scripts/validate-content.ts`.
- SM-2: `src/lib/sm2.ts` (`applyGrade`, `gradeCard`, `CardSchedule`).
- Storage: `src/lib/storage.ts` — single localStorage key; **new top-level state keys must be
  added to `defaultState()` AND the `sanitizeState` whitelist loop (~line 103)**.
- Visualizer pattern: `src/components/visualizers/engine.ts` + `StepPlayer.tsx` +
  exemplar `viz/two-pointers.tsx`; lazy host `VisualizerHost.tsx`.
- Reusable UX: `src/components/quiz/QuizTab.tsx` (lock→feedback→next) ·
  `src/components/flashcards/CardReviewSession.tsx` (queue session loop).
- Skills: `.claude/skills/write-module/SKILL.md` (clone to `write-primitive` for Phase 5.5).

## Verify

```bash
npm run validate-content      # 19 modules, 0 errors
npx tsc -b --noEmit           # clean
npm run build                 # vite build passes
npm run dev                   # web app on :5173 (or pass --port)
npm run tauri build           # desktop bundle (Cargo.lock pins time=0.3.47 — do not bump)
```
