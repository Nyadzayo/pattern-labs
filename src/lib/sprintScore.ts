/**
 * Pattern Sprint — pure, deterministic scoring + option assembly.
 *
 * Nothing here calls `Date`, `Math.random`, or any async work: card timing and
 * the per-stem seed are passed in, so every function is unit-testable. The UI
 * owns the wall-clock countdown and feeds `elapsedMs` to `cardPoints`.
 */
import type { ModuleId } from '@/content'
import { mulberry32, shuffle } from './drillEngine'

export type SprintRoundKind = 'warmup' | 'sprint' | 'sudden-death'

/** Number of options shown per card (correct + look-alikes + fillers). */
export const GRID_SIZE = 6

/** Per-card timer for the timed rounds, in milliseconds. */
export const DEFAULT_TIMER_MS = 10_000

export interface CardScoreInput {
  correct: boolean
  /** Time taken to answer, ms. Ignored when `timerMs` is 0 (untimed warmup). */
  elapsedMs: number
  /** Card timer, ms. 0 = untimed (no speed bonus). */
  timerMs: number
  /** Streak going into this card. */
  streak: number
}

export interface CardScore {
  points: number
  newStreak: number
}

/** Fraction of the timer still remaining, clamped to [0, 1]. 0 when untimed. */
export function speedFraction(elapsedMs: number, timerMs: number): number {
  if (timerMs <= 0) return 0
  const frac = (timerMs - elapsedMs) / timerMs
  return Math.max(0, Math.min(1, frac))
}

/**
 * Score one card. Correct → 50–100 base points scaled by remaining time, then
 * multiplied by the new streak (score = streak × speed). Wrong/timeout → 0
 * points and the streak resets.
 */
export function cardPoints(input: CardScoreInput): CardScore {
  if (!input.correct) return { points: 0, newStreak: 0 }
  const newStreak = input.streak + 1
  const base = 50 + Math.round(50 * speedFraction(input.elapsedMs, input.timerMs))
  return { points: base * newStreak, newStreak }
}

/** In Sudden Death a single wrong/timeout answer ends the round. */
export function endsRound(round: SprintRoundKind, correct: boolean): boolean {
  return round === 'sudden-death' && !correct
}

/** Stable non-negative seed from a stem id (FNV-1a). Deterministic per stem. */
export function seedFromId(id: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export interface OptionStem {
  pattern: ModuleId
  lookalikes: ModuleId[]
}

/**
 * Build the 6-option answer grid for a stem: the correct pattern + its tagged
 * look-alikes + deterministic fillers drawn from the remaining patterns, the
 * whole set shuffled by a stem-seeded RNG. Distractors are never random — the
 * look-alikes always appear so the learner must discriminate.
 */
export function buildOptions(
  stem: OptionStem,
  allPatterns: readonly ModuleId[],
  seed: number,
): ModuleId[] {
  const rng = mulberry32(seed)
  const chosen = new Set<ModuleId>([stem.pattern, ...stem.lookalikes])
  const fillerPool = allPatterns.filter((p) => !chosen.has(p))
  const fillers = shuffle(fillerPool, rng).slice(0, Math.max(0, GRID_SIZE - chosen.size))
  return shuffle([...chosen, ...fillers], rng)
}
