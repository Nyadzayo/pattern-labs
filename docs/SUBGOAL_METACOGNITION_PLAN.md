# Phase 5.7 — Subgoal & Metacognition

Durable design for the self-generated subgoal-labeling feature plus two metacognition riders
(productive failure, confidence calibration). Read this before touching subgoal/calibration code.

## Why

The app under-trains **transfer to novel problems** — mapping a worked solution's *structure* onto a
new prompt. The best-evidenced lever is **self-generated subgoal labeling**: learners gain more when
they *generate* purpose-labels for chunks of a solution and get feedback than when *given* labels.

**Non-negotiable interaction shape:** generate-then-reveal. The learner types their own label per
chunk *first*; only after submitting do we reveal the canonical label + feedback. Showing the labels
to read is the easier build and the weaker product. Do not "simplify" this away.

## Data model

`Subgoal` (`src/content/types.ts`): `{ lineRange: [number, number] (1-based inclusive into the
solution code string); referenceLabel: string (short, imperative, context-free); acceptableKeywords:
string[] (concept keywords for lenient grading); misconception?: string }`.

- Reference solutions: optional `subgoals?: Subgoal[]` on `ReferenceSolution`
  (`module.problems[i].solution.code` is one multi-line string; ranges index into it).
- Primitives: a new **`label` rung** between `roles` and `write` in the 7-rung ladder.
  `LabelRung = { kind:'label'; subgoals: Subgoal[] }`; ranges index into the sibling
  `WriteRung.solution` so the solution stays single-sourced.

Labels are **abstract/context-free** (describe the role — "restore window validity", not "move `lo`
past `nums[i]`") because context-free subgoals transfer best. All original writing.

## Pure reducers (no Date / Math.random / judge inside — unit-tested)

- `src/lib/subgoalGrade.ts`: `gradeLabel(typed, acceptableKeywords) → {score 0..1, matched}` (lenient
  normalized token/substring overlap — reward role understanding, not exact wording);
  `bestChunkMatch(typed, allChunks) → chunkIndex` (drives misconception feedback when a label fits a
  *different* chunk); `labelingComplete(scores, threshold)`.
- `src/lib/calibration.ts`: `calibrationReport(entries) → { byConfidence[], overconfidenceByModule[],
  topOverconfident }`.

## State (`src/lib/storage.ts`)

- `subgoals: Record<string, SubgoalProgress>` keyed `moduleId/problemId` or `primitive:<id>`
  (`{perChunk, understood (sticky), attempts}`). `understood` feeds SM-2 via `applyGrade`.
- `calibration: CalibrationEntry[]` (`{at, surface, moduleId?, confidence 0..3, correct}`, last 200).
- `productiveFailure: Record<moduleId, {attemptCode, attemptedAt, skipped}>` + `attemptFirst: boolean`
  (default true).
- Writers (mutators may stamp `Date` like the rest of storage): `recordSubgoalAttempt`,
  `recordCalibration`, `recordFirstAttempt`, `setAttemptFirst`.

## Components

- `components/subgoals/SubgoalLabeler.tsx` — the one core renderer (Practice tab + the `label` rung
  via a thin `LabelRungView.tsx`). Pre-chunked solution with dividers; one input per chunk; a
  pre-submission context-free **hint** per chunk; on submit, lenient grade → reveal `referenceLabel`
  beside the attempt → feedback. **Hint XOR feedback per chunk per attempt.**
- `components/calibration/ConfidencePrompt.tsx` — 1-tap Guessing/Unsure/Confident/Certain (0..3),
  shown *before* the reveal/submit; resolves a Promise the gate awaits.
- `components/calibration/CalibrationCard.tsx` — Dashboard predicted-vs-actual + overconfidence call-out.
- `components/practice/FirstAttemptGate.tsx` — productive-failure attempt screen ("failure is the
  point"), capture attempt, always-present "skip, just teach me" escape.

## Integration points

- Confidence capture at the existing single gates: `QuizTab.choose()`, `ProblemPage.revealSolution()`,
  `KataPage.runBlank()`, and the new subgoal submit.
- Productive failure: first module open gates one representative problem before Learn unlocks; Learn
  then shows an attempt-vs-worked diff (reuse `diffChars` from `kataDiff.ts`). Never blocks.
- Visualizers: optional `subgoal?: string` on `Frame`; surface as a phase chip (2–3 canonical viz).
- Parsons (`OrderRungView`/`FadeRungView`): optional per-block label mode, reusing `gradeLabel`.
- Flashcards: auto "what are the N subgoals of the <pattern> template, in order?" merged in `dueCards()`.
- Mock report: a "structure check" panel — did the submission follow the subgoal skeleton?
- Cheat-sheet: render templates as labeled subgoal skeletons.

## The `label`-rung ladder ripple (keep in lockstep)

`primitives/types.ts` (RungKind union, `LabelRung`, 7-tuple, JSDoc) · `katas.ts` (`rungs[5]`→`[6]`) ·
`drillEngine.ts` (`RungNumber` 1..7) · `drills.ts` (clamp/ladder length 7) · `DrillSession.tsx`
(RUNG_LABELS + `case 'label'`) · the primitives validator (a `label` case) · all 40
`content/primitives/items/*.ts` (a `LabelRung` before each `write`).

## Build order & scope

Steps 0–5 build + wire everything and annotate the first 3 modules + all 40 primitives. Annotating
the 16 remaining modules (~144 solutions) is a deferred, resumable workflow (Step 6) — Phase 6 is
already done, so it is *not* folded into a content pass. Authoring contracts: repo-local
`.claude/skills/write-module` (modules) and user-global `write-primitive` (primitives) document
emitting `subgoals`. Commit per verified step; `npx tsc -b --noEmit` after every change set.
