# Mastery & Recall — Phase 5.6 Design

> Durable design doc for the **Mastery & Recall** section (Code Katas + Pattern Sprint + Daily
> Warm-up). Read alongside `PROGRESS.md` and `docs/PRIMITIVES_LAB_PLAN.md`.

## Why

Pattern Lab already trains *understanding* (reader, visualizers), *application* (practice arena),
and *retention* (quizzes, SM-2 flashcards, Primitives Lab ladder). Two interview-decisive skills are
still under-trained:

1. **Motor / muscle memory** — typing the core idioms fluently from memory, hands not eyes.
2. **Fast pattern recognition** — reading a stem and knowing *which* pattern applies before writing
   anything, especially discriminating look-alikes (sliding-window vs two-pointers, DFS vs backtracking).

Phase 5.6 adds **Code Katas** (typing) and **Pattern Sprint** (recognition), plus a mixed **Daily
Warm-up** that interleaves one item of each training type into a 5–10 min session. Interleaving across
types beats blocking; a daily cap makes consistency beat cramming.

## Confirmed decisions

- **Kata source = primitive write-rung `solution`.** Each of the 40 primitives already ships a clean,
  self-contained function with `functionName`, visible+hidden `testCases`, and `parSeconds`. All three
  kata modes type this one runnable function; blank-page recall validates it through the existing
  Pyodide judge (`runJudge`). **No new code authoring** — a `katas` index just lists eligible ids.
- **Sprint grid = 6-option discriminator.** Each card shows the correct pattern + its 2–3 tagged
  look-alikes + fillers → 6 options, shuffled deterministically per card (seeded by stem id).
- **Kata scope = all 40 primitives.**

## Feature 1 — Code Katas

A timed, repetition-based typing mode. Three modes per kata:

1. **Guided type** — reference shown above the editor; type it exactly. Live char-level diff (correct /
   mistyped / cursor). Cannot finish until it matches.
2. **Fading recall** — reference visible for a 5s countdown, then hidden; type from memory.
   Reveal-on-demand costs a time penalty.
3. **Blank-page recall** — only the kata's name + one-line intent (`primitive.why`) shown; reproduce the
   whole function, validated by running against its `testCases` via the Pyodide worker.

**Feedback & metrics**
- Per attempt: elapsed vs personal best vs par, accuracy %, and a **hesitation map** — keystrokes are
  timestamped, then the tokens with the longest pre-typing pause are highlighted (the not-yet-automatic
  spots to drill next).
- WPM-on-code + accuracy tracked over time per kata, shown as a small sparkline.
- **"Automatic" badge** once blank-page recall passes under par at 100% accuracy on **two distinct days**.
- **Paste disabled** in kata editors.

**Interaction**
- One kata per screen, big timer, minimal chrome (typing-test feel).
- Wrong char is marked but doesn't block; end screen shows the corrected diff.
- "Run it again" is one tap.
- Keyboard-first: Enter to start, Esc to bail, Tab inserts 4 spaces (no focus change).

## Feature 2 — Pattern Sprint

A fast recognition game. ~80 original problem-stem cards (1–3 sentences), each tagged with the correct
pattern (one of the 19 modules) + 2–3 "tempting but wrong" look-alikes that become the hard distractors.

**Gameplay**
- A stem flashes; tap the pattern from a 6-option grid before a per-card timer (default 10s).
- Correct → streak++ and time bonus. Wrong/timeout → show the right pattern + a one-line **"the tell
  was…"** (the signal that should have triggered it).
- Three rounds: **Warmup** (no timer, learn the tells), **Sprint** (10s timer, score = streak × speed),
  **Sudden Death** (one wrong ends it; high-score chase).
- Adaptive: wrong cards resurface more often, mastered cards fade — wired into SM-2 per stem.
- Distractors come from the stem's tagged look-alikes, **never random**, so the learning is discrimination.

## Architecture

### Pure reducers (no `Date`/`Math.random`/judge inside — timestamps & seeds passed in)
- `src/lib/kataDiff.ts` — `diffChars`, `isComplete`, `accuracy`, `codeWpm`, `hesitationMap(reference,
  keystrokes)`. `Keystroke {t, len}` is stamped per input event (paste off ⇒ one char/event ⇒ no drops);
  keystrokes are bucketed into reference token spans and tokens ranked by max intra-token gap.
- `src/lib/sprintScore.ts` — `scoreCard`, sudden-death game-over, and `buildOptions(stem, allPatterns,
  seed)` (correct + look-alikes + fillers → 6, shuffled via `mulberry32` seeded from the stem id).
  Reuses `mulberry32`/`shuffle` from `drillEngine.ts`.

### Selectors (mirror `drills.ts`)
- `src/lib/sprint.ts` — due stems, adaptive ordering (recently-wrong first via SM-2), round assembly,
  optional `focus` pair.
- `src/lib/katas.ts` — resolve `KataEntry → ResolvedKata`; `kataStatus`; automatic check.
- `src/lib/warmup.ts` — `dailyWarmup(state)`: one sprint card + one kata + one due primitive drill + one
  due flashcard, capped at one set/day.

### Content
- `src/content/sprint/` — `types.ts` (`SprintStem {id, text, pattern, lookalikes[2..3], tell}`),
  `registry.ts`, `index.ts` (self-register), `stems/<moduleId>.ts` (~4–5 original stems each; ~80 total).
- `src/content/katas/index.ts` — `KataEntry[]` of all 40 primitive ids (+ optional par override).

### Storage (`storage.ts` — `AppState`, `defaultState()`, and the `sanitizeState` whitelist)
- `sprint: Record<stemId, CardSchedule>` (SM-2; reuse `applyGrade`).
- `sprintStats: { bestSprint, bestSuddenDeath }`.
- `katas: Record<primitiveId, KataProgress>` (`bestSeconds`, trimmed `attempts[]`, `automaticDates[]`,
  `automatic`). Hesitation map is ephemeral (end-screen only). Streak is the existing shared `state.streak`.

### Pages / routes (`App.tsx`) + Sidebar (top group)
- `/sprint` (`SprintPage`) — round select → card loop → end screen; `?focus=<pattern>,<guess>` deep-link.
- `/katas` (`KatasPage`) — catalog with par / best / automatic badge / sparkline.
- `/katas/:id` (`KataPage`) — mode select → typing surface → end screen.
- `/warmup` (`WarmupSession`) — the 4 mixed items in sequence.

### Components
- `src/components/katas/` — `KataTypingSurface` (controlled `<textarea>` + synced styled `<pre>` diff
  overlay; paste off; Tab→spaces; Esc→bail; `performance.now()` keystroke capture), `KataEndScreen`,
  `KataModeSelect`. Textarea-overlay rather than CodeMirror: char-diff + paste-lock + keystroke capture
  are simpler and fully controllable; CodeMirror stays the practice-arena editor.
- `src/components/sprint/` — `SprintCard` (stem + 6-option grid + countdown ring), `SprintRound`,
  `SprintEndScreen`, `SprintRoundSelect`.

### Integration
- **Dashboard:** a **Daily Warm-up** card (links `/warmup`, today done/available) + Sprint/Kata chips;
  keep the existing Daily Drill link.
- **Mock report:** existing `weakPrimitiveIds` also link to the matching kata; each `patternCorrect ===
  false` problem adds a "Pattern Sprint: practice X vs Y" link to `/sprint?focus=<correct>,<guess>`.

### Skills & validation
- `~/.claude/skills/write-sprint-card/SKILL.md` — stem-authoring contract (mirrors `write-primitive`).
- `scripts/validate-sprint.ts` — schema + invariants (pattern ∈ 19 modules; 2–3 look-alikes ⊆ modules,
  exclude pattern; non-empty text/tell; unique ids). Authoring agents self-validate.
- `scripts/validate-katas.ts` — every entry resolves to a primitive with a write rung.
- vitest: `kataDiff.test.ts`, `sprintScore.test.ts`, `sprint.test.ts`, `warmup.test.ts`.

## Build order (commit per verified step)

0. **Docs/scaffolding** — this doc, CLAUDE.md, PROGRESS.md, storage keys + sanitize, npm scripts.
1. **Pattern Sprint MVP** — schema/registry + ~20 hand-authored stems; `sprintScore` + `sprint` +
   `buildOptions`; validator + vitest; Warmup + Sprint rounds + end screen; route + sidebar.
2. **Sudden Death + SM-2 + remaining stems** — sudden-death; SM-2 per card + adaptive resurfacing;
   `write-sprint-card` skill; workflow batches (≤6 agents) author the remaining ~14 module stem files.
3. **Code Katas guided** — `katas/index.ts` + `validate-katas`; `kataDiff` + tests; catalog + guided
   mode + typing surface + end screen (diff, hesitation map, metrics).
4. **Fading + Blank-page recall** — 5s reveal-then-hide; blank-page judged via `runJudge`; automatic badge.
5. **Metrics + Daily Warm-up + mock links** — WPM/accuracy sparkline + attempts persistence; warm-up
   session + Dashboard card; mock-report kata + confused-pair Sprint links.

## Verify
```bash
npx tsc -b --noEmit
npm run test
npm run validate-sprint
npm run validate-katas
npm run build
```
