import { describe, it, expect } from 'vitest'
import {
  drillReducer,
  initSession,
  interleave,
  mulberry32,
  resolutionForSubmit,
  shuffle,
  type DrillItem,
  type SessionState,
} from './drillEngine'
import type { CheckResult } from './drillCheckers'

const correct: CheckResult = { correct: true, message: 'ok' }
const wrong: CheckResult = { correct: false, message: 'no' }

const a: DrillItem = { primitiveId: 'p1', rung: 1 }
const b: DrillItem = { primitiveId: 'p2', rung: 1 }
const c: DrillItem = { primitiveId: 'p3', rung: 1 }

function submit(s: SessionState, result: CheckResult): SessionState {
  return drillReducer(s, { type: 'submit', result })
}
function next(s: SessionState): SessionState {
  return drillReducer(s, { type: 'next' })
}

describe('drillReducer', () => {
  it('first-try correct advances and bumps the streak', () => {
    let s = initSession([a, b, c])
    expect(s.current).toEqual(a)
    expect(s.phase).toBe('prompt')

    s = submit(s, correct)
    expect(s.phase).toBe('feedback')
    expect(s.streak).toBe(1)
    expect(s.lastResult).toEqual(correct)

    s = next(s)
    expect(s.current).toEqual(b)
    expect(s.phase).toBe('prompt')
    expect(s.queue).toEqual([c])
  })

  it('a wrong answer re-queues the item ~3 slots ahead and resets the streak', () => {
    const d: DrillItem = { primitiveId: 'p4', rung: 1 }
    const e: DrillItem = { primitiveId: 'p5', rung: 1 }
    const f: DrillItem = { primitiveId: 'p6', rung: 1 }
    let s = initSession([a, b, c, d, e, f]) // current a, queue [b,c,d,e,f]

    s = submit(s, wrong)
    expect(s.streak).toBe(0)
    expect(s.requeued).toBe(1)
    expect(s.attempts['p1:1']).toBe(1)
    // inserted at index min(3, 5) = 3 → after b,c,d
    expect(s.queue).toEqual([b, c, d, a, e, f])
  })

  it('the 3rd wrong attempt reveals the answer and force-advances (no infinite loop)', () => {
    let s = initSession([a]) // current a, queue []

    s = submit(s, wrong) // attempt 1 → requeue (queue [a])
    expect(s.revealed).toBe(false)
    expect(s.queue).toEqual([a])
    s = next(s) // current a again

    s = submit(s, wrong) // attempt 2 → requeue
    expect(s.revealed).toBe(false)
    s = next(s)

    s = submit(s, wrong) // attempt 3 → reveal + force-advance, NOT re-queued
    expect(s.revealed).toBe(true)
    expect(s.attempts['p1:1']).toBe(3)
    expect(s.queue).toEqual([]) // not re-queued

    s = next(s)
    expect(s.phase).toBe('done')
    expect(s.current).toBeNull()
  })

  it('skipUp promotes the current rung, capped at 6', () => {
    let s = initSession([{ primitiveId: 'p1', rung: 2 }])
    s = drillReducer(s, { type: 'skipUp' })
    expect(s.current).toEqual({ primitiveId: 'p1', rung: 3 })
    expect(s.phase).toBe('prompt')

    let top = initSession([{ primitiveId: 'p1', rung: 6 }])
    top = drillReducer(top, { type: 'skipUp' })
    expect(top.current).toEqual({ primitiveId: 'p1', rung: 6 })
  })

  it('an empty session starts done, and next on a drained queue finishes', () => {
    expect(initSession([]).phase).toBe('done')

    let s = initSession([a])
    s = submit(s, correct)
    s = next(s)
    expect(s.phase).toBe('done')
    expect(s.current).toBeNull()
  })

  it('a non-first-try correct does not bump the streak', () => {
    let s = initSession([a]) // current a
    s = submit(s, wrong) // streak 0, attempts a:1, requeue
    s = next(s) // current a again
    s = submit(s, correct) // correct but not first try
    expect(s.streak).toBe(0)
  })
})

describe('resolutionForSubmit', () => {
  it('correct resolves as passed; non-terminal wrong does not resolve; terminal wrong resolves as failed', () => {
    const s = initSession([a])
    expect(resolutionForSubmit(s, correct)).toEqual({ resolved: true, passed: true })
    expect(resolutionForSubmit(s, wrong)).toEqual({ resolved: false, passed: false })

    const stuck: SessionState = { ...s, attempts: { 'p1:1': 2 } }
    expect(resolutionForSubmit(stuck, wrong)).toEqual({ resolved: true, passed: false })
  })
})

describe('mulberry32 + shuffle', () => {
  it('is deterministic for a given seed and yields values in [0,1)', () => {
    const r1 = mulberry32(42)
    const r2 = mulberry32(42)
    const seqA = [r1(), r1(), r1(), r1()]
    const seqB = [r2(), r2(), r2(), r2()]
    expect(seqA).toEqual(seqB)
    expect(seqA.every((v) => v >= 0 && v < 1)).toBe(true)
    const r3 = mulberry32(43)
    expect([r3(), r3(), r3(), r3()]).not.toEqual(seqA)
  })

  it('shuffle with the same seed is reproducible and a true permutation', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7]
    const s1 = shuffle(arr, mulberry32(7))
    const s2 = shuffle(arr, mulberry32(7))
    expect(s1).toEqual(s2)
    expect([...s1].sort((x, y) => x - y)).toEqual(arr)
    expect(arr).toEqual([1, 2, 3, 4, 5, 6, 7]) // input untouched
  })
})

describe('interleave (module first, then category)', () => {
  function adjacentSamePrimary<T>(out: T[], primary: (t: T) => string): number {
    let n = 0
    for (let i = 1; i < out.length; i++) if (primary(out[i]) === primary(out[i - 1])) n++
    return n
  }

  it('avoids consecutive same-module items when an arrangement exists', () => {
    type X = { id: number; m: string; c: string }
    const items: X[] = [
      { id: 1, m: 'A', c: 'x' },
      { id: 2, m: 'A', c: 'x' },
      { id: 3, m: 'A', c: 'x' },
      { id: 4, m: 'B', c: 'y' },
      { id: 5, m: 'C', c: 'z' },
    ]
    const out = interleave(items, (i) => i.m, (i) => i.c)
    expect(out.length).toBe(5)
    expect([...out].sort((p, q) => p.id - q.id)).toEqual(items)
    // A,B,A,C,A is achievable → zero same-module adjacencies.
    expect(adjacentSamePrimary(out, (i) => i.m)).toBe(0)
  })

  it('keeps modules apart and spreads categories near-optimally on ties', () => {
    type X = { id: number; m: string; c: string }
    const items: X[] = [
      { id: 1, m: 'A', c: 'x' },
      { id: 2, m: 'A', c: 'y' },
      { id: 3, m: 'B', c: 'x' },
      { id: 4, m: 'B', c: 'y' },
    ]
    const out = interleave(items, (i) => i.m, (i) => i.c)
    expect([...out].sort((p, q) => p.id - q.id)).toEqual(items)
    // Primary guarantee: never two of the same module back-to-back.
    expect(adjacentSamePrimary(out, (i) => i.m)).toBe(0)
    // Every module-alternating layout of this input has exactly one category
    // collision, so the best the tiebreak can do is hold it to ≤1.
    expect(adjacentSamePrimary(out, (i) => i.c)).toBeLessThanOrEqual(1)
  })
})
