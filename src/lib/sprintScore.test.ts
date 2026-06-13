import { describe, it, expect } from 'vitest'
import { MODULE_IDS } from '@/content'
import type { ModuleId } from '@/content'
import {
  GRID_SIZE,
  buildOptions,
  cardPoints,
  endsRound,
  seedFromId,
  speedFraction,
} from './sprintScore'

const ALL = MODULE_IDS as readonly ModuleId[]

describe('speedFraction', () => {
  it('is the remaining fraction of the timer', () => {
    expect(speedFraction(0, 10_000)).toBe(1)
    expect(speedFraction(5_000, 10_000)).toBeCloseTo(0.5)
    expect(speedFraction(10_000, 10_000)).toBe(0)
  })
  it('clamps and treats an untimed card as zero speed', () => {
    expect(speedFraction(20_000, 10_000)).toBe(0) // overtime never goes negative
    expect(speedFraction(1_000, 0)).toBe(0) // untimed warmup
  })
})

describe('cardPoints', () => {
  it('awards streak × speed on a correct answer', () => {
    // base = 50 + round(50 * 0.5) = 75; newStreak = 3 → 225
    expect(cardPoints({ correct: true, elapsedMs: 5_000, timerMs: 10_000, streak: 2 })).toEqual({
      points: 225,
      newStreak: 3,
    })
  })
  it('gives the full base for an instant answer', () => {
    expect(cardPoints({ correct: true, elapsedMs: 0, timerMs: 10_000, streak: 0 })).toEqual({
      points: 100,
      newStreak: 1,
    })
  })
  it('resets the streak and scores zero on a wrong/timed-out answer', () => {
    expect(cardPoints({ correct: false, elapsedMs: 3_000, timerMs: 10_000, streak: 7 })).toEqual({
      points: 0,
      newStreak: 0,
    })
  })
})

describe('endsRound', () => {
  it('ends only sudden-death, and only on a miss', () => {
    expect(endsRound('sudden-death', false)).toBe(true)
    expect(endsRound('sudden-death', true)).toBe(false)
    expect(endsRound('sprint', false)).toBe(false)
    expect(endsRound('warmup', false)).toBe(false)
  })
})

describe('seedFromId', () => {
  it('is deterministic and non-negative', () => {
    expect(seedFromId('two-pointers-01')).toBe(seedFromId('two-pointers-01'))
    expect(seedFromId('two-pointers-01')).toBeGreaterThanOrEqual(0)
    expect(seedFromId('a')).not.toBe(seedFromId('b'))
  })
})

describe('buildOptions', () => {
  const stem = {
    pattern: 'two-pointers' as ModuleId,
    lookalikes: ['hash-maps-sets', 'binary-search', 'sliding-windows'] as ModuleId[],
  }

  it('returns exactly GRID_SIZE distinct, valid options', () => {
    const opts = buildOptions(stem, ALL, 123)
    expect(opts).toHaveLength(GRID_SIZE)
    expect(new Set(opts).size).toBe(GRID_SIZE)
    for (const o of opts) expect(ALL).toContain(o)
  })

  it('always includes the correct pattern and every look-alike (never random distractors)', () => {
    const opts = buildOptions(stem, ALL, 999)
    expect(opts).toContain(stem.pattern)
    for (const l of stem.lookalikes) expect(opts).toContain(l)
  })

  it('is deterministic for a given seed and varies across seeds', () => {
    expect(buildOptions(stem, ALL, 42)).toEqual(buildOptions(stem, ALL, 42))
    // Different seeds should (very likely) reorder or swap fillers.
    const a = buildOptions(stem, ALL, 1).join(',')
    const b = buildOptions(stem, ALL, 2).join(',')
    expect(a).not.toBe(b)
  })

  it('fills to GRID_SIZE when a stem has only 2 look-alikes', () => {
    const two = { pattern: 'stacks' as ModuleId, lookalikes: ['heaps', 'trees'] as ModuleId[] }
    const opts = buildOptions(two, ALL, 7)
    expect(opts).toHaveLength(GRID_SIZE)
    expect(opts).toContain('stacks')
    expect(opts).toContain('heaps')
    expect(opts).toContain('trees')
  })
})
