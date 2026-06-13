/**
 * Code Katas resolver: turns a `KataEntry` into a ready-to-drill kata by pulling
 * the primitive's write-rung solution (the reference code), function name, test
 * cases, and par time from the primitives registry. Mirrors `src/lib/drills.ts`.
 */
import { getPrimitive } from '@/content/primitives/registry'
import type { Primitive, PrimitiveCategory, WriteRung } from '@/content/primitives/types'
import type { ModuleId, TestCase } from '@/content'
import { KATA_ENTRIES, type KataEntry } from '@/content/katas'
import type { AppState, KataProgress } from './storage'

export interface ResolvedKata {
  id: string // primitive id
  name: string
  category: PrimitiveCategory
  /** One-line intent shown on the catalog and on blank-page recall. */
  intent: string
  functionName: string
  /** The reference code the learner types / reproduces (write-rung solution). */
  code: string
  testCases: TestCase[]
  parSeconds: number
  moduleTags: ModuleId[]
}

/** The write rung is always the 6th (index 5) of a primitive's ladder. */
function writeRung(p: Primitive): WriteRung {
  return p.rungs[5]
}

export function resolveKata(entry: KataEntry): ResolvedKata | null {
  const p = getPrimitive(entry.primitiveId)
  if (!p) return null
  const w = writeRung(p)
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    intent: p.why,
    functionName: w.functionName,
    code: w.solution,
    testCases: w.testCases,
    parSeconds: entry.parSeconds ?? w.parSeconds,
    moduleTags: p.moduleTags,
  }
}

/** All resolvable katas, in catalog order. */
export function katas(): ResolvedKata[] {
  return KATA_ENTRIES.map(resolveKata).filter((k): k is ResolvedKata => k !== null)
}

/** One kata by primitive id (eligible even if not in the explicit index). */
export function getKata(id: string): ResolvedKata | null {
  const entry = KATA_ENTRIES.find((e) => e.primitiveId === id) ?? { primitiveId: id }
  return resolveKata(entry)
}

export function kataProgress(state: AppState, id: string): KataProgress | undefined {
  return state.katas[id]
}

/** Count of katas the learner has driven to the "automatic" badge. */
export function automaticCount(state: AppState): number {
  return Object.values(state.katas).filter((k) => k.automatic).length
}
