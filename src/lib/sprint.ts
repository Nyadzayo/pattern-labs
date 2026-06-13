/**
 * App-level Pattern Sprint selectors: which stems are due, how a round's deck is
 * ordered (adaptive: recently-missed resurface first), and SM-2 grading per stem.
 * Combines the runtime stem registry with persisted SM-2 progress. Mirrors
 * `src/lib/drills.ts`.
 */
import { allStems } from '@/content/sprint/registry'
import type { SprintStem } from '@/content/sprint/types'
import type { ModuleId } from '@/content'
import type { AppState, CardSchedule } from './storage'
import { setState, todayISO } from './storage'
import { applyGrade } from './sm2'
import type { SprintRoundKind } from './sprintScore'

/** Stems due today (never seen = due immediately), in registry order. */
export function dueStems(state: AppState): SprintStem[] {
  const today = todayISO()
  return allStems().filter((s) => {
    const sched = state.sprint[s.id]
    return !sched || sched.due <= today
  })
}

export function dueStemCount(state: AppState): number {
  return dueStems(state).length
}

/**
 * Adaptive ordering: due stems first (most-lapsed, then soonest-due), then the
 * rest. Deterministic — no RNG, so the order is stable for a given state. A stem
 * the learner keeps missing accumulates lapses and floats to the front.
 */
export function adaptiveOrder(state: AppState, stems: SprintStem[]): SprintStem[] {
  const today = todayISO()
  const weight = (sched: CardSchedule | undefined) => {
    if (!sched) return { due: 1, lapses: 0, key: today } // new → treat as due
    return { due: sched.due <= today ? 1 : 0, lapses: sched.lapses, key: sched.due }
  }
  return stems
    .map((s, i) => ({ s, i, w: weight(state.sprint[s.id]) }))
    .sort((a, b) => {
      if (a.w.due !== b.w.due) return b.w.due - a.w.due // due before not-due
      if (a.w.lapses !== b.w.lapses) return b.w.lapses - a.w.lapses // missed-most first
      if (a.w.key !== b.w.key) return a.w.key < b.w.key ? -1 : 1 // soonest due first
      return a.i - b.i // stable
    })
    .map((x) => x.s)
}

/**
 * Build the deck for a round.
 * - `warmup` — the full deck (learn the tells), registry order.
 * - `sprint` / `sudden-death` — adaptive order (missed stems resurface first).
 * `focus`, when given, floats stems touching those patterns (correct or
 * look-alike) to the front — used by the mock-report "practice X vs Y" deep-link.
 */
export function sprintRound(
  state: AppState,
  round: SprintRoundKind,
  focus?: ModuleId[],
): SprintStem[] {
  const all = allStems()
  let deck = round === 'warmup' ? all : adaptiveOrder(state, all)
  if (focus && focus.length > 0) {
    const set = new Set(focus)
    const touches = (s: SprintStem) =>
      set.has(s.pattern) || s.lookalikes.some((l) => set.has(l))
    const hit = deck.filter(touches)
    const rest = deck.filter((s) => !touches(s))
    deck = [...hit, ...rest]
  }
  return deck
}

/** Grade one stem answer and persist its SM-2 schedule (correct → good, wrong → again). */
export function gradeStem(stemId: string, correct: boolean): void {
  setState((prev) => ({
    ...prev,
    sprint: {
      ...prev.sprint,
      [stemId]: applyGrade(prev.sprint[stemId], correct ? 'good' : 'again'),
    },
  }))
}

/** Record a finished round's score, keeping the per-mode high. Returns true if it's a new best. */
export function recordSprintScore(round: SprintRoundKind, score: number): boolean {
  let isBest = false
  setState((prev) => {
    const key = round === 'sudden-death' ? 'bestSuddenDeath' : 'bestSprint'
    if (round === 'warmup' || score <= prev.sprintStats[key]) return prev
    isBest = true
    return { ...prev, sprintStats: { ...prev.sprintStats, [key]: score } }
  })
  return isBest
}
