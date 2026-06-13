# Plan: Checkpoint + Primitives Lab (Phase 5.5)

## Context

Pattern Lab is built through Phase 6 (19 modules live, validated, committed) plus an
in-flight "expand to 9 problems per module" pass. That expand pass is **17/19 done but
entirely uncommitted**; only `two-pointers` and `math-geometry` are still at 4 problems
(their writer agents died on socket errors). Separately, the user wants a new top-level
section — **Primitives Lab** (Phase 5.5) — a Brilliant-style faded-scaffolding drill
environment for ~40 recurring micro-patterns.

The conversation has grown very large and is burning tokens on every turn. Decision: do a
**durable checkpoint to disk + commit**, so the user can `/clear` and a fresh session
resumes cheaply from files instead of from ~200k tokens of transcript. Then build Primitives
Lab in the cleared session using this plan.

This plan therefore has two parts: **(A) the checkpoint to do now**, and **(B) the
Primitives Lab design/build for the resumed session**.

---

## Part A — Checkpoint (do now, this session, then user runs /clear)

1. **Finish the 2 missing modules** — write 5 new original problems each for
   `src/content/modules/two-pointers.ts` and `math-geometry.ts` (append to `problems[]`,
   don't touch concept/quiz/flashcards). Do this **directly, no workflow** (2 files, cheaper
   inline). Two-pointers facets: triplet-closest, merge two sorted, stable partition,
   smallest cross-array pair, squares-of-sorted. Math-geo facets: in-place transpose/reflect,
   digit-process cycle, base-26 column labels both ways, max collinear points (small n),
   clock/lattice geometry.
2. **Gate**: `npm run validate-content` (all 19 → 0 errors, executes every reference
   solution via python3) → `npx tsc -b --noEmit` → `npm run build`.
3. **Write `PROGRESS.md`** at repo root — the durable resume artifact (see template below).
4. **Refresh `CLAUDE.md`** — add Phase 5.5 (Primitives Lab) to the build plan, the
   resilient-workflow conventions, and a pointer to PROGRESS.md.
5. **Commit** everything (expand pass + 2 new modules + checkpoint docs) as one
   "Expand to 9 problems/module + checkpoint" commit. Optionally rebuild the Tauri bundle.
6. Tell the user they can `/clear` and resume with: *"Read PROGRESS.md and continue with
   Primitives Lab."*

`PROGRESS.md` template (sections): Phases 1–6 status (done) · the expand pass (done) ·
Primitives Lab = next, with a one-paragraph spec digest and a pointer to this plan file path ·
the resilient-workflow conventions · key file map (content schema, judge, sm2, storage
whitelist line) · how to run/verify.

---

## Part B — Primitives Lab (resumed session)

### B0. Catalog manifest (author FIRST, before any primitive)

Pin the exact ~40-primitive list in `src/content/primitives/manifest.ts` as
`{ id, name, category, moduleTags }[]` — this is the authoring work-list and the coverage
spec, derived from the addendum's enumerated catalog:
loops (5: forward-index, reverse-index, nested i/j with j=i+1, while-compound-condition,
loop-and-a-half/early-exit) · state (5: accumulator-init sum/max/min identities, best-so-far,
swap, multi-assign pointer update, visited-set) · two-pointers (3: opposite-ends-converge,
reader/writer same-direction, fast/slow-advance) · sliding-window (4: expand-right,
shrink-while-invalid-left, window-length-math, freq-map add/remove) · hashing (3: count-with-
get-default, seen-set membership, complement-lookup) · binary-search (4: lo/hi-init-variants,
overflow-safe-mid, `lo<hi` vs `lo<=hi` boundary, insertion-point) · stack-queue (3: push-pop-
match, monotonic-stack pop-while, BFS-queue level-size) · recursion (2: DFS base/recurse/combine,
backtracking choose/explore/unchoose) · dp (3: table-dims-and-init, fill-order, transition-ref) ·
arrays (3: prefix-sum-build, in-place-reverse, k-rotation). ≈39; round to ~40 as facets demand.

The validator (B5) reads this manifest and **fails if any module has zero tagged primitives**
(satisfies the spec's "extend Phase 6 to include drills per module") and if any authored
primitive id is absent from the manifest (or vice-versa).

### B1. Content schema — `src/content/primitives/types.ts`

```ts
type RungKind = 'predict'|'order'|'fade'|'cloze'|'roles'|'write'  // rungs 1..6 in this order

interface Misconception { id: string; label: string; feedback: string }

interface PredictRung { kind:'predict'; markedLine:number; prompt:string;
  choices:string[]; correctIndex:number; distractorMisconceptions:(string|null)[];
  verify:{ setup?:string; mode:'stdout'|{expr:string} } }   // validator runs snippet(+setup); result must == choices[correctIndex]
interface OrderRung { kind:'order'; lines:{text:string;indent:number}[];          // correct order = array order; indent in 4-space units
  distractors:{text:string;indent:number;misconceptionId:string}[] }              // 1–2 trap lines
interface FadeRung { kind:'fade'; lines:{text:string;indent:number}[];
  distractors:{text:string;indent:number;misconceptionId:string}[];
  blanks:{lineIndex:number;token:string;options:string[];misconceptionByOption?:Record<string,string>}[] }
interface ClozeRung { kind:'cloze'; lines:string[];
  blanks:{lineIndex:number;accept:string[];misconceptionByInput?:Record<string,string>;placeholder?:string}[] }
interface RolesRung { kind:'roles'; lines:string[];                                // slot markers like ⟦s1⟧
  slots:{id:string;correctRole:string}[]; roleBank:string[] }                      // bank = correct + distractor roles
interface WriteRung { kind:'write'; functionName:string; starterCode:string;
  testCases:TestCase[]; parSeconds:number; solution:string }                       // reuse content TestCase

type Rung = PredictRung|OrderRung|FadeRung|ClozeRung|RolesRung|WriteRung
interface Primitive { id:string; name:string;
  category:'loops'|'state'|'two-pointers'|'sliding-window'|'hashing'|'binary-search'|'stack-queue'|'recursion'|'dp'|'arrays';
  snippet:string; why:string; misconceptions:Misconception[]; moduleTags:ModuleId[];
  rungs:[PredictRung,OrderRung,FadeRung,ClozeRung,RolesRung,WriteRung] }
```

Registry mirrors `src/content/registry.ts`: `primitives/registry.ts` + `primitives/index.ts`
self-registering each primitive file. Files live in `src/content/primitives/items/<id>.ts`.

**`snippet` is the single source of truth.** Every Order / Fade / Cloze rung must reconstruct
(lines in correct order, correct tokens filled in) to the canonical `snippet`, and the validator
**enforces this by reconstructing + executing** (B5). This is what makes drill answer-keys
machine-proven correct — the ladder can never teach code that drifts from the primitive it claims
to drill, and a wrong "correct" token fails the build the same way a wrong reference solution does.

### B2. Pure engine — `src/lib/drillEngine.ts` + `src/lib/drillCheckers.ts`

**Checkers are pure, one per rung kind**, each returning
`CheckResult = { correct:boolean; misconceptionId?:string; perBlank?:boolean[]; message:string }`:
`checkPredict`, `checkOrder`, `checkFade`, `checkCloze` (normalize=trim+collapse-space, match
against `accept[]`, else look up `misconceptionByInput`), `checkRoles`. Rung 6 has no pure
checker — the UI runs `runJudge` (src/lib/judge.ts) and constructs a `CheckResult`.

**Reducer is pure and async-free.** The UI computes a `CheckResult` (sync checker for 1–5,
judge for 6) and dispatches it — the reducer never calls the judge, `Date.now`, or `Math.random`:
```ts
interface DrillItem { primitiveId:string; rung:1|2|3|4|5|6 }
interface SessionState { queue:DrillItem[]; current:DrillItem|null; phase:'prompt'|'feedback'|'done';
  lastResult:CheckResult|null; revealed:boolean; streak:number; reviewed:number; requeued:number;
  attempts:Record<string,number> }                            // key `${primitiveId}:${rung}` → wrong-count this session
type Action =
  | { type:'submit'; result:CheckResult }   // see re-queue/cap rule below; right → streak++, advance eligible
  | { type:'next' }                          // advance to queue head; done when empty
  | { type:'skipUp' }                        // promote current item rung +1 (cap 6), replace current
```
**Re-queue with a termination cap (deterministic):** on a wrong `submit`, increment
`attempts[key]`. If `attempts[key] < 3`, show misconception feedback and insert the failed item
`min(3, queue.length)` positions ahead (append if near end). On the **3rd** wrong attempt, set
`revealed:true` (the renderer shows the worked answer) and **force-advance** — do NOT re-queue, so
a stuck learner is never trapped in a loop. The item still counts as failed for SM-2 (demote).
Streak: +1 on first-try correct, reset to 0 on any wrong. Shuffles for order/fade/roles
use a seeded `mulberry32(seed)`; `seed` and any `today` ISO are passed in at session init / via
action payloads — never generated inside the reducer.

### B3. SM-2 scheduling — extend `src/lib/sm2.ts` + storage

New AppState key `drills: Record<primitiveId, DrillProgress>` where
`DrillProgress = { rung:1..6; schedule:CardSchedule; rung6PassDates:string[]; mastered:boolean }`.
Pure `applyDrillResult(prev,{passed,rung,today})`: pass → promote rung (cap 6) +
`applyGrade(schedule,'good')`; if rung 6, add `today` to `rung6PassDates` (dedupe by date),
`mastered = distinct dates ≥ 2`. fail → demote rung (floor 1) + `applyGrade(schedule,'again')`.
**Add `drills` to `defaultState()` and the sanitizeState whitelist loop (storage.ts line ~103).**

### B4. UI

- `src/components/drills/` — one renderer per rung (tap/drag for 1–3 & 5, typing for 4 & 6),
  reusing QuizTab's lock→emerald/red→explanation pattern and a shake on wrong. `DrillSession.tsx`
  drives the reducer (mirrors CardReviewSession's queue loop).
- `src/pages/DrillsPage.tsx` at `/drills` (+ `/drills/:primitiveId`). Dashboard gets a **Daily
  Drill** card: collect due primitives (`schedule.due <= today`), **interleave so consecutive items
  differ in module first, then category** (round-robin over the due primitives' `moduleTags`,
  breaking ties by `category`) — satisfies the spec's "interleave across different modules", cap ~10.
- Module **Learn tab**: "Primitives used in this pattern" strip = primitives whose `moduleTags`
  include the module → links to their drills. Module-complete → soft banner prompting a drill session.
- **Mock report — v1 decision (code-derived, per the spec's intent):** capture last-submitted code
  per problem in `ProblemRun` (MockInterviewPage). **Primary signal = a small curated, HIGH-PRECISION
  regex tell-set** (e.g. `while\s+True` with no `break`, boundary `lo\s*<=\s*hi`, `(lo\s*\+\s*hi)\s*/`
  unsafe mid), each mapped to a primitive id that must exist in the manifest — this is the spec's
  "wrong mid calculation" case. **Fallback** when no tell fires: lowest-rung drill among the
  module-tags of *failed* mock problems. Tells must be precision-first (a false "you got this wrong"
  is worse than silence); one-tap link to drill each surfaced primitive.

### B5. Validator — `scripts/validate-primitives.ts` + npm `validate-primitives`

**Static checks:** schema shape; unique ids; exactly 6 rungs in order; `markedLine` in snippet
bounds; predict `correctIndex` in range & `distractorMisconceptions` length == choices; order/fade
distractor `misconceptionId`s exist; cloze `lineIndex` valid + `accept` non-empty +
`misconceptionByInput` values are valid ids; roles every slot's `correctRole` ∈ roleBank & bank
has distractors.

**Execution checks (this is what makes answer-keys trustworthy — reuse `PY_HARNESS` /
system python3 from validate-content.ts):**
- **Write rung**: reference `solution` passes its `testCases` (as today's module validator does).
- **Predict rung**: run `snippet` (prefixed by `verify.setup` if present); for `mode:'stdout'`
  the captured stdout (stripped) must equal `choices[correctIndex]`; for `mode:{expr}` evaluate
  `expr` after the snippet and its `str()`/`repr()` must equal `choices[correctIndex]`. A wrong
  answer-key fails the build.
- **Order / Fade / Cloze rungs — reconstruct & compare**: rebuild the code from the *correct*
  answer (Order: `lines` in array order with their indents; Fade: same, with each blank filled by
  its correct option; Cloze: `lines` with each blank filled by `accept[0]`), then assert the
  reconstruction, **normalized (whitespace), equals the canonical `snippet`**, and that it
  `compile()`s. This closes both "is the correct token actually correct?" and "does the ladder
  match the snippet it claims to teach?" in one check.

**Coverage checks:** every misconception id is referenced by ≥1 rung of its primitive (spec's hard
requirement); **every module has ≥1 primitive whose `moduleTags` include it**; the set of authored
primitive ids equals the manifest (no orphans, no missing).

### B6. Build order (commit after each; authoring in resumable batches)

1. **Catalog manifest (B0) first**, then schema + reducer + checkers + rungs 1–2 + DrillSession
   shell + `/drills` route + Daily Drill (stub pool) + **vitest** unit tests + the
   `validate-primitives` script (incl. its execution checks) — stand the validator up early so
   every primitive authored after this is machine-verified. Author **5 primitives** by hand
   (passing the validator); end-to-end working.
2. Rungs 3–5 (fade, cloze, roles) renderers.
3. Rung 6 via Pyodide judge + par timer.
4. SM-2 integration + Daily Drill interleaving + module Learn-tab strips + completion prompt +
   mock-report weakest-primitive line.
5. Author remaining ~35 primitives via a new **`/write-primitive`** skill (mirrors write-module),
   run in **batches of ~6 per workflow** (each batch self-validates against `validate-primitives`;
   reviews are a separate optional pass).
6. Coverage validation green; full build; browser sweep; final commit.

Add `vitest` as a devDep in step 1 (`npm run test`). Unit tests (highest value): reducer
correct-advances / wrong-requeues-at-+3 / **3rd-wrong reveals+force-advances (no infinite loop)** /
skipUp-promotes / done-on-empty / streak inc+reset; each checker incl. cloze alternative-accept +
misconception mapping; `applyDrillResult` promote/demote/mastered-after-2-distinct-dates;
module-first interleaver (consecutive items differ in module where possible); mulberry32 determinism.

---

## Resilient-workflow conventions (apply to all future fan-outs)

- **Batches ≤ ~6 agents-worth per workflow run**; a quota wall then loses little and each run
  is independently resumable via `resumeFromRunId`.
- **Decouple correctness from enhancement**: the write/author step self-validates (runs the
  Python validator), so a completed write is known-good even if its review never runs. Run
  reviews as a *separate* pass.
- **Terse returns**: workflows write detail to a file and return only `{id, ok, count}` so
  task-notification blobs stay small (this is a primary token sink).
- File-ownership-per-agent stays one-file-per-agent (idempotent).

## Verification

- Checkpoint: `npm run validate-content` (19 modules, 0 errors) · `tsc -b --noEmit` · `npm run build` · git log shows the commit.
- Primitives, per step: `npm run validate-primitives` green · `npm run test` (vitest) green ·
  `tsc -b --noEmit` · browser sweep of `/drills` (one primitive through all 6 rungs: predict
  wrong→misconception feedback+shake+requeue, order/fade/roles interactions, cloze per-blank,
  write judged) · Daily Drill interleaves categories · SM-2 promote/demote persists in localStorage.
