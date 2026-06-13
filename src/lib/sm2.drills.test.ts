import { describe, it, expect } from 'vitest'
import { applyDrillResult, newDrillProgress } from './sm2'

describe('applyDrillResult', () => {
  it('a pass promotes the rung (cap 6) and schedules the card forward', () => {
    const p = applyDrillResult(undefined, { passed: true, rung: 1, today: '2026-01-01' })
    expect(p.rung).toBe(2)
    expect(p.schedule.reps).toBe(1) // graded 'good' from a fresh schedule
    expect(p.mastered).toBe(false)
  })

  it('a fail demotes the rung (floor 1) and relapses the schedule', () => {
    expect(applyDrillResult(undefined, { passed: false, rung: 1, today: '2026-01-01' }).rung).toBe(1)
    const demoted = applyDrillResult(undefined, { passed: false, rung: 3, today: '2026-01-01' })
    expect(demoted.rung).toBe(2)
    expect(demoted.schedule.lapses).toBe(1)
  })

  it('promoting from rung 6 stays at 6', () => {
    const p = applyDrillResult(newDrillProgress(), { passed: true, rung: 6, today: '2026-01-01' })
    expect(p.rung).toBe(6)
  })

  it('masters only after a rung-6 pass on two distinct days', () => {
    let p = applyDrillResult(undefined, { passed: true, rung: 6, today: '2026-01-01' })
    expect(p.rung6PassDates).toEqual(['2026-01-01'])
    expect(p.mastered).toBe(false)

    // Same day again — no new date, still not mastered.
    p = applyDrillResult(p, { passed: true, rung: 6, today: '2026-01-01' })
    expect(p.rung6PassDates).toEqual(['2026-01-01'])
    expect(p.mastered).toBe(false)

    // A second distinct day flips mastery on.
    p = applyDrillResult(p, { passed: true, rung: 6, today: '2026-01-02' })
    expect(p.rung6PassDates).toEqual(['2026-01-01', '2026-01-02'])
    expect(p.mastered).toBe(true)

    // Mastery is sticky even after a later fail.
    p = applyDrillResult(p, { passed: false, rung: 6, today: '2026-01-03' })
    expect(p.mastered).toBe(true)
    expect(p.rung).toBe(5)
  })
})
