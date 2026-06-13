/**
 * Primitives Lab — pure session reducer.
 *
 * The reducer is deterministic and async-free: it never calls the judge,
 * `Date.now`, or `Math.random`. The UI computes a {@link CheckResult} (sync
 * checker for rungs 1–5, Pyodide judge for rung 6) and dispatches it.
 *
 * Re-queue with a termination cap: a wrong `submit` increments the per-item
 * attempt count. While `attempts < MAX_ATTEMPTS` the failed item is re-inserted
 * a few slots ahead so it returns later in the session. On the MAX-th wrong
 * attempt the worked answer is `revealed` and the item is force-advanced (never
 * re-queued) so a stuck learner is never trapped in a loop.
 */
import type { CheckResult } from './drillCheckers'

export type RungNumber = 1 | 2 | 3 | 4 | 5 | 6

export interface DrillItem {
  primitiveId: string
  rung: RungNumber
}

export type DrillPhase = 'prompt' | 'feedback' | 'done'

export interface SessionState {
  queue: DrillItem[]
  current: DrillItem | null
  phase: DrillPhase
  lastResult: CheckResult | null
  revealed: boolean
  streak: number
  /** Number of graded submissions so far this session. */
  reviewed: number
  /** Number of times an item was pushed back into the queue. */
  requeued: number
  /** `${primitiveId}:${rung}` → wrong-attempt count this session. */
  attempts: Record<string, number>
}

export type Action =
  | { type: 'submit'; result: CheckResult }
  | { type: 'next' }
  | { type: 'skipUp' }

/** Wrong attempts before the answer is revealed and the item is force-advanced. */
export const MAX_ATTEMPTS = 3
/** How many slots ahead a failed item is re-inserted. */
const REQUEUE_AHEAD = 3

export function attemptKey(item: DrillItem): string {
  return `${item.primitiveId}:${item.rung}`
}

export function initSession(items: DrillItem[]): SessionState {
  return {
    queue: items.slice(1),
    current: items[0] ?? null,
    phase: items.length > 0 ? 'prompt' : 'done',
    lastResult: null,
    revealed: false,
    streak: 0,
    reviewed: 0,
    requeued: 0,
    attempts: {},
  }
}

/**
 * Does this `submit` finalize the current item (for SM-2 grading)? Mirrors the
 * reducer's branching so the UI can grade an item exactly once, at resolution.
 * A wrong submit that re-queues is NOT a resolution.
 */
export function resolutionForSubmit(
  state: SessionState,
  result: CheckResult,
): { resolved: boolean; passed: boolean } {
  if (!state.current || state.phase !== 'prompt') return { resolved: false, passed: false }
  if (result.correct) return { resolved: true, passed: true }
  const wrong = (state.attempts[attemptKey(state.current)] ?? 0) + 1
  if (wrong >= MAX_ATTEMPTS) return { resolved: true, passed: false }
  return { resolved: false, passed: false }
}

export function drillReducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case 'submit': {
      if (!state.current || state.phase !== 'prompt') return state
      const item = state.current
      const key = attemptKey(item)
      const priorWrong = state.attempts[key] ?? 0

      if (action.result.correct) {
        const firstTry = priorWrong === 0
        return {
          ...state,
          phase: 'feedback',
          lastResult: action.result,
          revealed: false,
          streak: firstTry ? state.streak + 1 : state.streak,
          reviewed: state.reviewed + 1,
        }
      }

      const wrongCount = priorWrong + 1
      const attempts = { ...state.attempts, [key]: wrongCount }

      if (wrongCount >= MAX_ATTEMPTS) {
        // Terminal fail: reveal the worked answer and force-advance (no re-queue).
        return {
          ...state,
          phase: 'feedback',
          lastResult: action.result,
          revealed: true,
          streak: 0,
          reviewed: state.reviewed + 1,
          attempts,
        }
      }

      // Re-queue a few slots ahead (append if the queue is short).
      const pos = Math.min(REQUEUE_AHEAD, state.queue.length)
      const queue = [...state.queue.slice(0, pos), item, ...state.queue.slice(pos)]
      return {
        ...state,
        phase: 'feedback',
        lastResult: action.result,
        revealed: false,
        streak: 0,
        reviewed: state.reviewed + 1,
        requeued: state.requeued + 1,
        attempts,
        queue,
      }
    }

    case 'next': {
      if (state.queue.length === 0) {
        return { ...state, current: null, phase: 'done', lastResult: null, revealed: false }
      }
      return {
        ...state,
        current: state.queue[0],
        queue: state.queue.slice(1),
        phase: 'prompt',
        lastResult: null,
        revealed: false,
      }
    }

    case 'skipUp': {
      if (!state.current) return state
      const rung = Math.min(6, state.current.rung + 1) as RungNumber
      return {
        ...state,
        current: { ...state.current, rung },
        phase: 'prompt',
        lastResult: null,
        revealed: false,
      }
    }

    default:
      return state
  }
}

// ── Seeded RNG (for shuffling Parsons lines / role banks in the UI) ──────────
// Kept here so it's covered by the engine's unit tests. Seeds are generated in
// the UI and passed in; the reducer itself never calls these.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates using a seeded rng; returns a new array, input untouched. */
export function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Interleave items so consecutive entries differ in their `primary` group where
 * possible, breaking ties by `secondary`. Used for the Daily Drill (module
 * first, then category). Greedy: always draw from the largest remaining group
 * that isn't the one just drawn; within a group prefer a different secondary.
 * Deterministic — input order is the only tiebreak, so no RNG is needed.
 */
export function interleave<T>(
  items: readonly T[],
  primary: (t: T) => string,
  secondary: (t: T) => string,
): T[] {
  const buckets = new Map<string, T[]>()
  for (const it of items) {
    const k = primary(it)
    const b = buckets.get(k)
    if (b) b.push(it)
    else buckets.set(k, [it])
  }

  const result: T[] = []
  let lastPrimary: string | null = null
  let lastSecondary: string | null = null

  while (result.length < items.length) {
    const live = [...buckets.entries()].filter(([, v]) => v.length > 0)
    const others = live.filter(([k]) => k !== lastPrimary)
    const pool = others.length > 0 ? others : live
    // Largest remaining bucket first (stable: keeps insertion order on ties).
    pool.sort((a, b) => b[1].length - a[1].length)
    const [key, arr] = pool[0]

    let idx = arr.findIndex((it) => secondary(it) !== lastSecondary)
    if (idx === -1) idx = 0
    const picked = arr.splice(idx, 1)[0]

    result.push(picked)
    lastPrimary = key
    lastSecondary = secondary(picked)
  }
  return result
}
