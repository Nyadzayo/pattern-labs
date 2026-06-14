/**
 * Code Katas resolver: turns a `KataEntry` into a ready-to-drill kata by pulling
 * the primitive's write-rung solution (the reference code), function name, test
 * cases, and par time from the primitives registry. Mirrors `src/lib/drills.ts`.
 */
import { getPrimitive } from '@/content/primitives/registry'
import { findWriteRung } from '@/content/primitives/types'
import type { Primitive, PrimitiveCategory, WriteRung } from '@/content/primitives/types'
import type { ModuleId, TestCase } from '@/content'
import { KATA_ENTRIES, type KataEntry } from '@/content/katas'
import type { AppState, KataAttempt, KataProgress } from './storage'
import { setState, todayISO } from './storage'

/** How many recent attempts to keep per kata for the WPM/accuracy sparkline. */
const ATTEMPT_HISTORY = 20

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

/** The write rung is always the LAST rung; resolve it by kind (ladder may be 6 or 7). */
function writeRung(p: Primitive): WriteRung {
  return findWriteRung(p)
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

export function newKataProgress(): KataProgress {
  return { bestSeconds: null, attempts: [], automaticDates: [], automatic: false }
}

export interface KataAttemptInput {
  mode: KataAttempt['mode']
  seconds: number
  accuracy: number // 0..1
  wpm: number
  parSeconds: number
  /** Blank-page recall: did the reproduced solution pass the judge? */
  passed?: boolean
}

/**
 * Persist one kata attempt. `bestSeconds` and the "automatic" badge track
 * blank-page recall only (the meaningful from-memory milestone): a blank-page
 * pass under par at full accuracy records the day, and mastery flips on after
 * two distinct such days. Guided/fading runs still feed the attempt history
 * (the sparkline).
 */
export function recordKataAttempt(id: string, a: KataAttemptInput): void {
  const today = todayISO()
  setState((prev) => {
    const base = prev.katas[id] ?? newKataProgress()
    const attempts = [
      ...base.attempts,
      { at: today, mode: a.mode, seconds: a.seconds, accuracy: a.accuracy, wpm: a.wpm },
    ].slice(-ATTEMPT_HISTORY)

    let bestSeconds = base.bestSeconds
    const cleanBlank = a.mode === 'blank' && a.passed === true
    if (cleanBlank && (bestSeconds === null || a.seconds < bestSeconds)) bestSeconds = a.seconds

    let automaticDates = base.automaticDates
    if (cleanBlank && a.seconds <= a.parSeconds && a.accuracy >= 1 && !automaticDates.includes(today)) {
      automaticDates = [...automaticDates, today]
    }
    const automatic = automaticDates.length >= 2

    return {
      ...prev,
      katas: { ...prev.katas, [id]: { bestSeconds, attempts, automaticDates, automatic } },
    }
  })
}
