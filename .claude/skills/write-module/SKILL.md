---
name: write-module
description: Use when writing or rewriting a Pattern Lab content module (concept, problems, quiz, flashcards) for a named interview pattern, e.g. "write the Tries module" or during the Phase 6 content pass.
---

# Write a Pattern Lab Content Module

## Overview

Produce one complete, schema-valid content file at `src/content/modules/<module-id>.ts` for a given pattern name, then validate until clean. The validator is the gate: it schema-checks the file AND executes every reference solution against its test cases with real Python.

## Inputs

- A pattern name (e.g. "Tries"). Map it to its `module-id` and `visualizer` via `MODULES` in `src/content/registry.ts`.

## Steps

1. **Read the contract first**: `src/content/types.ts` (the `ModuleContent` schema) and skim `scripts/validate-content.ts` for the machine checks. An existing module file (e.g. `src/content/modules/two-pointers.ts`) is the style reference.
2. **Write `src/content/modules/<module-id>.ts`**: `import type { ModuleContent } from '../types'`, build the object, `export default`.
3. **Validate and fix until clean** — both must pass:
   ```bash
   npx tsx scripts/validate-content.ts <module-id>   # must end "0 error(s)"
   npx tsc -p tsconfig.app.json --noEmit
   ```
   If the validator reports a failing reference solution, decide whether the solution or the test case is wrong — fix that one, don't fudge the other.
4. **Register it**: add the import + `registerModule()` call in `src/content/index.ts`.
   **Exception:** when running as one of several parallel agents, do NOT touch `index.ts` (the orchestrator registers all modules to avoid write conflicts).

## Content requirements

Counts are enforced by the validator; quality rules are on you:

| Field | Requirement |
|---|---|
| `concept` | 600–1000 words of markdown: vivid intuition → mechanics (with a short Python sketch) → "when to reach for it" signals → complexity (inline `O(n)` chips) → pitfalls. Voice: sharp, friendly senior engineer. |
| `realWorldUses` | 2–3 real production appearances of the pattern |
| `problems` | 9 (3–10 allowed). Each: original statement with its own domain story, 2–4 examples, constraints, exactly 3 progressive hints (nudge → approach → near-spoiler), snake_case `functionName`, starter stub `def <functionName>(...)` with `pass`, fully-commented solution + markdown commentary + complexity line, 6–10 JSON-safe test cases (≥2 visible, ≥2 `hidden: true`, include edge cases). Difficulty mix: ≥2 easy, ≥3 medium, ≥2 hard. Each problem must exercise a different facet of the pattern. **Optionally** add `solution.subgoals` (see below). |
| `solution.subgoals` (optional) | Subgoal annotation for the self-generated-labeling exercise. An array chunking `solution.code` into 3–6 **contiguous, non-overlapping** groups covering **every line** (chunk 1 starts at line 1; each start = prev end + 1; last ends at the final line). Each `{ lineRange: [start,end] (1-based into `solution.code`), referenceLabel, acceptableKeywords[], hint?, misconception? }`. `referenceLabel` is short, imperative, **context-free** (the role, not the variable names); `acceptableKeywords` ~4 lowercase concept phrases for lenient grading; `hint` a pre-submission nudge (not the answer); `misconception` the confusion when this chunk's role is mistaken. Validated by `validate-content` (coverage, bounds, label + keywords present). |
| `quiz` | exactly 8 questions, 4 choices each: ≥2 conceptual, ≥2 complexity, ≥2 scenario ("which pattern fits?" with a tempting wrong pattern as a distractor). Explanations say why right is right and the tempting distractor wrong. **Re-derive each answer independently and check `correctIndex`.** |
| `flashcards` | exactly 10: crisp front, 1–3 sentence back; cover signals, complexity, template moves, pitfalls |
| `cheatSheet` | one-paragraph `tldr`, ≥3 "reach for this when…" `signals`, canonical Python `template`, one-line `complexity` |

## Hard rules

- **Original writing only.** Never reproduce text from books, courses, or websites. Classics by name only in `furtherPractice` (e.g. `{ name: "LeetCode 206. Reverse Linked List" }`).
- **Deterministic outputs.** Statements must specify ordering for collection outputs ("return indices in ascending order"); `unordered: true` only when unavoidable.
- **JSON-safe test data.** Lists not tuples; numbers/strings/booleans/null/arrays/plain objects only. Linked-list/tree problems take and return plain lists (convert inside the solution).
- Solutions are `exec`'d standalone — stdlib imports fine, no I/O, no randomness.

## Common mistakes

- `correctIndex` pointing at a plausible-but-wrong choice — re-derive every quiz answer before finishing.
- First hint that gives away the approach — hint 1 should only reorient attention.
- Reference solution failing its own edge-case tests (empty input, single element, all-equal) — the validator catches this; fix the real bug.
- Statement constraints contradicting test cases (e.g. "nums is non-empty" but a test passes `[]`).
