import { describe, it, expect } from 'vitest'
import { calibrationReport, confidenceToExpected } from './calibration'
import type { CalibrationEntry } from './storage'

function e(confidence: 0 | 1 | 2 | 3, correct: boolean, moduleId?: string): CalibrationEntry {
  return { at: '2026-06-14T00:00:00Z', surface: 'quiz', confidence, moduleId, correct }
}

describe('confidenceToExpected', () => {
  it('maps 0..3 to 0..1', () => {
    expect(confidenceToExpected(0)).toBe(0)
    expect(confidenceToExpected(3)).toBe(1)
    expect(confidenceToExpected(2)).toBeCloseTo(2 / 3)
  })
})

describe('calibrationReport', () => {
  it('buckets accuracy by confidence level', () => {
    const r = calibrationReport([
      e(3, true), e(3, false), e(3, true), e(3, true), // Certain: 3/4
      e(0, false), e(0, true), // Guessing: 1/2
    ])
    expect(r.total).toBe(6)
    expect(r.byConfidence[3].n).toBe(4)
    expect(r.byConfidence[3].accuracy).toBeCloseTo(0.75)
    expect(r.byConfidence[0].accuracy).toBeCloseTo(0.5)
    expect(r.byConfidence[1].n).toBe(0)
    expect(r.byConfidence[1].accuracy).toBe(0)
  })

  it('flags overconfident modules (confidence > accuracy) worst first', () => {
    const r = calibrationReport([
      // binary-search: Certain but wrong → big gap
      e(3, false, 'binary-search'), e(3, false, 'binary-search'), e(2, true, 'binary-search'),
      // two-pointers: confident and right → no gap
      e(2, true, 'two-pointers'), e(2, true, 'two-pointers'),
    ])
    expect(r.topOverconfident?.moduleId).toBe('binary-search')
    expect(r.topOverconfident!.gap).toBeGreaterThan(0)
    // two-pointers is well-calibrated (accuracy >= confidence) → excluded
    expect(r.overconfidenceByModule.find((m) => m.moduleId === 'two-pointers')).toBeUndefined()
  })

  it('returns no overconfidence when well-calibrated', () => {
    const r = calibrationReport([e(0, false, 'm'), e(3, true, 'm')])
    expect(r.topOverconfident).toBeNull()
    expect(r.overconfidenceByModule).toHaveLength(0)
  })

  it('handles empty input', () => {
    const r = calibrationReport([])
    expect(r.total).toBe(0)
    expect(r.byConfidence).toHaveLength(4)
    expect(r.topOverconfident).toBeNull()
  })

  it('is deterministic with stable tie-ordering', () => {
    const entries = [e(3, false, 'b-mod'), e(3, false, 'a-mod')]
    const r1 = calibrationReport(entries)
    const r2 = calibrationReport(entries)
    expect(r1).toEqual(r2)
    // equal gaps → moduleId ascending
    expect(r1.overconfidenceByModule.map((m) => m.moduleId)).toEqual(['a-mod', 'b-mod'])
  })
})
