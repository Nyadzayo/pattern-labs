/**
 * App-level Primitives-Lab selectors: which primitives are due, how the Daily
 * Drill is assembled, and the per-primitive ladder. Combines the runtime
 * registry, persisted SM-2 progress, and the pure interleaver.
 */
import { allPrimitives, getPrimitive } from '@/content/primitives/registry'
import type { Primitive } from '@/content/primitives/types'
import type { AppState } from './storage'
import { todayISO } from './storage'
import { interleave, type DrillItem, type RungNumber } from './drillEngine'

export function clampRung(n: number): RungNumber {
  return Math.min(6, Math.max(1, Math.round(n))) as RungNumber
}

/** Primitives due today (never drilled = due immediately), in manifest order. */
export function dueDrillPrimitives(state: AppState): Primitive[] {
  const today = todayISO()
  return allPrimitives().filter((p) => {
    const d = state.drills[p.id]
    return !d || d.schedule.due <= today
  })
}

export function dueDrillCount(state: AppState): number {
  return dueDrillPrimitives(state).length
}

/**
 * The Daily Drill: due primitives interleaved so consecutive items differ in
 * module first, then category, capped at `cap`. Each starts at its current rung.
 */
export function dailyDrillItems(state: AppState, cap = 10): DrillItem[] {
  const ordered = interleave(
    dueDrillPrimitives(state),
    (p) => p.moduleTags[0] ?? p.category,
    (p) => p.category,
  )
  return ordered.slice(0, cap).map((p) => ({
    primitiveId: p.id,
    rung: clampRung(state.drills[p.id]?.rung ?? 1),
  }))
}

/** Full 6-rung ladder for one primitive, starting from the learner's current rung. */
export function ladderItems(primitive: Primitive, state: AppState): DrillItem[] {
  const start = clampRung(state.drills[primitive.id]?.rung ?? 1)
  const items: DrillItem[] = []
  for (let r = start; r <= 6; r++) items.push({ primitiveId: primitive.id, rung: r as RungNumber })
  return items
}

/** Convenience: name lookup for surfacing a primitive in other pages. */
export function primitiveName(id: string): string {
  return getPrimitive(id)?.name ?? id
}
