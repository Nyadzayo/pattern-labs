/**
 * Daily Warm-up: a short mixed session that interleaves one item of each
 * training type — a Pattern Sprint card, a Code Kata, a primitive drill, and a
 * flashcard. Interleaving across types beats blocking, and a one-set-per-day cap
 * makes consistency beat cramming.
 *
 * `dailyWarmup` is pure (state → steps) so it's unit-testable; `completeWarmup`
 * is the persistence side-effect.
 */
import type { SprintStem } from '@/content/sprint/types'
import type { ResolvedKata } from './katas'
import { katas } from './katas'
import { allStems } from '@/content/sprint/registry'
import { allPrimitives } from '@/content/primitives/registry'
import { dueStems } from './sprint'
import { dueDrillPrimitives, clampRung } from './drills'
import { dueCards, type DueCard } from './sm2'
import type { DrillItem } from './drillEngine'
import type { AppState } from './storage'
import { setState, todayISO, touchStreak } from './storage'

export type WarmupStep =
  | { kind: 'sprint'; stem: SprintStem }
  | { kind: 'kata'; kata: ResolvedKata }
  | { kind: 'drill'; item: DrillItem }
  | { kind: 'card'; card: DueCard }

/** The least-practiced kata (fewest recorded attempts), deterministic on ties. */
function pickKata(state: AppState): ResolvedKata | null {
  const all = katas()
  if (all.length === 0) return null
  let best = all[0]
  let bestAttempts = state.katas[best.id]?.attempts.length ?? 0
  for (const k of all) {
    const n = state.katas[k.id]?.attempts.length ?? 0
    if (n < bestAttempts) {
      best = k
      bestAttempts = n
    }
  }
  return best
}

/**
 * Build today's warm-up: one of each type, preferring due items and falling back
 * to the first available so the session is always runnable. Order interleaves
 * the modalities (recognize → type → drill → recall).
 */
export function dailyWarmup(state: AppState): WarmupStep[] {
  const steps: WarmupStep[] = []

  const stem = dueStems(state)[0] ?? allStems()[0]
  if (stem) steps.push({ kind: 'sprint', stem })

  const kata = pickKata(state)
  if (kata) steps.push({ kind: 'kata', kata })

  const prim = dueDrillPrimitives(state)[0] ?? allPrimitives()[0]
  if (prim) {
    steps.push({
      kind: 'drill',
      item: { primitiveId: prim.id, rung: clampRung(state.drills[prim.id]?.rung ?? 1) },
    })
  }

  const card = dueCards(state)[0]
  if (card) steps.push({ kind: 'card', card })

  return steps
}

export function warmupDoneToday(state: AppState): boolean {
  return state.lastWarmup === todayISO()
}

/** Mark the warm-up complete for today and keep the streak alive. */
export function completeWarmup(): void {
  const today = todayISO()
  setState((prev) => (prev.lastWarmup === today ? prev : { ...prev, lastWarmup: today }))
  touchStreak()
}
