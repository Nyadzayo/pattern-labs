import type { Primitive, Rung } from '@/content/primitives/types'
import type { RungNumber } from '@/lib/drillEngine'
import type { CheckResult } from '@/lib/drillCheckers'

/** Shared contract every rung renderer implements. */
export interface RungViewProps<R extends Rung = Rung> {
  primitive: Primitive
  rung: R
  rungNumber: RungNumber
  /** 'prompt' = answering; 'feedback' = answered, locked, showing result. */
  phase: 'prompt' | 'feedback'
  /** True once the learner has exhausted attempts: show the worked answer. */
  revealed: boolean
  /** Deterministic seed for shuffles, stable for this item across re-renders. */
  seed: number
  /** Called with the computed result when the learner commits an answer. */
  onSubmit: (result: CheckResult) => void
}

/** Deterministic 32-bit seed from a string (so shuffles are stable per item). */
export function stringSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
