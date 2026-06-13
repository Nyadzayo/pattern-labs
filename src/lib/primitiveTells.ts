/**
 * Mock-report weakest-primitive detection (v1, code-derived, precision-first).
 *
 * Primary signal: a tiny curated set of HIGH-PRECISION regex "tells" over the
 * code the learner submitted for problems they did NOT fully pass. A false
 * "you got this wrong" is worse than silence, so tells run only over failed
 * problems and each maps to a manifest primitive.
 *
 * Fallback (no tell fired): the lowest-rung primitive among the module tags of
 * the failed problems — the one they've practiced least.
 */
import type { ModuleId } from '@/content/types'
import { primitivesForModule } from '@/content/primitives/registry'
import { MANIFEST_IDS } from '@/content/primitives/manifest'
import type { AppState } from './storage'
import { clampRung } from './drills'

export interface CodedProblem {
  moduleId: ModuleId
  code: string
  passedAll: boolean
}

interface Tell {
  primitiveId: string
  re: RegExp
  /** Only fire when the code has NO `break` (e.g. an unbounded `while True`). */
  requiresNoBreak?: boolean
}

/** Each tell maps to a manifest primitive id. Keep these precision-first. */
const TELLS: Tell[] = [
  // Naive / float midpoint instead of the overflow-safe lo + (hi - lo) // 2.
  { primitiveId: 'bs-mid-overflow-safe', re: /\(\s*lo\s*\+\s*hi\s*\)\s*\/\/?\s*2/ },
  // `while True:` with no break — the early-exit idiom done wrong.
  { primitiveId: 'loop-and-a-half', re: /while\s+True\s*:/, requiresNoBreak: true },
]

/**
 * Returns the primitive ids worth reviewing, most-confident first. Empty when
 * nothing trips a tell and there are no failed problems (silence beats noise).
 */
export function detectWeakPrimitives(problems: CodedProblem[], state: AppState): string[] {
  const failed = problems.filter((p) => !p.passedAll)

  const found: string[] = []
  for (const p of failed) {
    for (const tell of TELLS) {
      if (found.includes(tell.primitiveId)) continue
      if (!tell.re.test(p.code)) continue
      if (tell.requiresNoBreak && /\bbreak\b/.test(p.code)) continue
      if (MANIFEST_IDS.includes(tell.primitiveId)) found.push(tell.primitiveId)
    }
  }
  if (found.length > 0) return found

  // Fallback: least-practiced primitive among the failed problems' modules.
  let best: { id: string; rung: number } | null = null
  for (const p of failed) {
    for (const prim of primitivesForModule(p.moduleId)) {
      const rung = clampRung(state.drills[prim.id]?.rung ?? 1)
      if (!best || rung < best.rung) best = { id: prim.id, rung }
    }
  }
  return best ? [best.id] : []
}
