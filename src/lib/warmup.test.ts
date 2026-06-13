import { describe, it, expect } from 'vitest'
import '@/content' // register modules (flashcards)
import '@/content/primitives' // register primitives (drills, katas)
import '@/content/sprint' // register sprint stems
import { dailyWarmup, warmupDoneToday } from './warmup'
import { defaultState, todayISO } from './storage'

describe('dailyWarmup', () => {
  it('interleaves one of each training type, recognize → type → drill → recall', () => {
    const steps = dailyWarmup(defaultState())
    expect(steps.map((s) => s.kind)).toEqual(['sprint', 'kata', 'drill', 'card'])
  })

  it('every step points at a real, resolvable item', () => {
    const steps = dailyWarmup(defaultState())
    for (const s of steps) {
      if (s.kind === 'sprint') expect(s.stem.pattern).toBeTruthy()
      if (s.kind === 'kata') expect(s.kata.code.length).toBeGreaterThan(0)
      if (s.kind === 'drill') expect(s.item.rung).toBeGreaterThanOrEqual(1)
      if (s.kind === 'card') expect(s.card.front).toBeTruthy()
    }
  })

  it('picks the least-practiced kata (deterministic)', () => {
    const a = defaultState()
    const first = dailyWarmup(a).find((s) => s.kind === 'kata')
    const firstId = first && first.kind === 'kata' ? first.kata.id : null
    expect(firstId).toBeTruthy()

    // Give that kata some history; the warm-up should then pick a different one.
    const b = defaultState()
    b.katas[firstId!] = {
      bestSeconds: null,
      attempts: [{ at: '2026-01-01', mode: 'guided', seconds: 5, accuracy: 1, wpm: 50 }],
      automaticDates: [],
      automatic: false,
    }
    const second = dailyWarmup(b).find((s) => s.kind === 'kata')
    const secondId = second && second.kind === 'kata' ? second.kata.id : null
    expect(secondId).not.toBe(firstId)
  })
})

describe('warmupDoneToday', () => {
  it('is true only when last completed today', () => {
    const s = defaultState()
    expect(warmupDoneToday(s)).toBe(false)
    s.lastWarmup = todayISO()
    expect(warmupDoneToday(s)).toBe(true)
    s.lastWarmup = '2000-01-01'
    expect(warmupDoneToday(s)).toBe(false)
  })
})
