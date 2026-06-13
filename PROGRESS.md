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
| **5.5** | **Primitives Lab** (faded-scaffolding drills) | ⏳ **NEXT — not started** |
| 7 | Polish & package (cheat sheets, decision tree, shortcuts, Tauri) | ✅ done (revisit after 5.5) |

Content now: 19 modules × **9 problems** (171 total), 8 quiz Qs each, 10 flashcards each.
`npm run validate-content` = 19 modules, 0 errors (executes every reference solution in python3).

## NEXT: Primitives Lab (Phase 5.5)

A Brilliant-style drill section for ~40 recurring micro-patterns (loop idioms, pointer
setups, window mechanics, search skeletons, traversal templates). Each primitive is drilled
on a **6-rung fading ladder**: 1 Predict (MC) · 2 Order (Parsons) · 3 Fade (Parsons+blanks) ·
4 Cloze (typed blanks) · 5 Roles (assign variable roles) · 6 Write (from scratch, Pyodide-judged).
Wrong answers give **misconception-specific feedback** + shake + **re-queue later in the session**.
A "this is easy" button skips a primitive up a rung. SM-2 schedules each primitive (pass→promote
rung, fail→demote; mastered = rung 6 passed on 2 different days). Dashboard gets an interleaved
**Daily Drill**; module Learn tabs get a "primitives used here" strip; mock report flags weakest
primitives. **Drill engine must be a pure, unit-tested reducer** (answer→feedback→next).

→ Full schema, reducer/checker design, SM-2 transitions, validator spec, and the 6-step build
order are in `docs/PRIMITIVES_LAB_PLAN.md` (Part B). Build it in resumable
batches per the conventions below.

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
