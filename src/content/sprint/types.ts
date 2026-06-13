/**
 * Pattern Sprint — content schema.
 *
 * A *stem* is a short, original problem statement (1–3 sentences) whose only job
 * is to make the learner decide WHICH pattern applies. Each stem is tagged with:
 *   - `pattern`    — the one correct module,
 *   - `lookalikes` — 2–3 modules the stem superficially resembles (the hard
 *                    distractors; never random),
 *   - `tell`       — the one-line signal that should have triggered `pattern`
 *                    (shown as "the tell was…" after a wrong/timed-out answer).
 *
 * The 6-option answer grid for a card is built from `pattern` + `lookalikes` +
 * a couple of fillers, shuffled deterministically (see `src/lib/sprintScore.ts`).
 * The validator (`scripts/validate-sprint.ts`) enforces every invariant below.
 */
import type { ModuleId } from '../types'

export interface SprintStem {
  /** Globally-unique kebab id, conventionally `<pattern>-NN`. */
  id: string
  /** The problem statement the learner reads. 1–3 sentences, original writing. */
  text: string
  /** The single correct pattern. */
  pattern: ModuleId
  /** 2–3 tempting-but-wrong patterns this stem resembles. Must exclude `pattern`. */
  lookalikes: ModuleId[]
  /** One-line "the tell was…" — names the discriminating signal. */
  tell: string
}
