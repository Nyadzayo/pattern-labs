import { describe, it, expect } from 'vitest'
import { gradeLabel, bestChunkMatch, labelingComplete, SUBGOAL_PASS } from './subgoalGrade'

describe('gradeLabel', () => {
  const kw = ['shrink window', 'restore valid', 'move left']

  it('matches an exact keyword phrase', () => {
    const r = gradeLabel('shrink the window', kw)
    expect(r.matched).toBe(true)
    expect(r.score).toBeGreaterThan(0)
  })

  it('is inflection-tolerant (shrinking → shrink, moves → move)', () => {
    expect(gradeLabel('shrinking the window down', kw).matched).toBe(true)
    expect(gradeLabel('moves the left pointer forward', kw).matched).toBe(true)
  })

  it('rewards role understanding without exact wording', () => {
    // hits "move left" + "restore valid" via majority-of-tokens rule
    const r = gradeLabel('move left to restore a valid window', kw)
    expect(r.matched).toBe(true)
    expect(r.score).toBeGreaterThanOrEqual(SUBGOAL_PASS)
  })

  it('returns zero for an empty label', () => {
    expect(gradeLabel('', kw)).toEqual({ score: 0, matched: false })
    expect(gradeLabel('   ', kw)).toEqual({ score: 0, matched: false })
  })

  it('does not match unrelated text', () => {
    expect(gradeLabel('sort the array then binary search', kw).matched).toBe(false)
  })

  it('ignores stopwords (skip the duplicate == skip duplicate)', () => {
    const k = ['skip duplicate']
    expect(gradeLabel('skip the duplicate', k)).toEqual(gradeLabel('skip duplicate', k))
    expect(gradeLabel('skip the duplicate', k).matched).toBe(true)
  })

  it('is deterministic and order-independent', () => {
    const a = gradeLabel('restore valid move left', kw)
    const b = gradeLabel('move left restore valid', kw)
    expect(a).toEqual(b)
  })

  it('handles a no-keyword chunk gracefully', () => {
    expect(gradeLabel('anything', [])).toEqual({ score: 0, matched: false })
  })
})

describe('bestChunkMatch', () => {
  const chunks = [
    ['initialize best', 'seed answer'], // chunk 0: init
    ['measure window', 'compare against best'], // chunk 1: measure
    ['shrink window', 'move left'], // chunk 2: shrink
  ]

  it('finds the chunk a label fits best', () => {
    expect(bestChunkMatch('shrink the window from the left', chunks)).toBe(2)
    expect(bestChunkMatch('initialize the best answer so far', chunks)).toBe(0)
  })

  it('detects a swapped role (label fits a different chunk)', () => {
    // typed for chunk 1 but actually describes chunk 0
    const typedFor = 1
    const fits = bestChunkMatch('seed the best value before the loop', chunks)
    expect(fits).toBe(0)
    expect(fits).not.toBe(typedFor)
  })

  it('returns -1 when the label matches no chunk', () => {
    expect(bestChunkMatch('quicksort partition pivot', chunks)).toBe(-1)
  })
})

describe('labelingComplete', () => {
  it('is true only when every chunk passes', () => {
    expect(labelingComplete([0.5, 0.4, 1])).toBe(true)
    expect(labelingComplete([0.5, 0, 1])).toBe(false)
    expect(labelingComplete([])).toBe(false)
  })

  it('respects a custom threshold', () => {
    expect(labelingComplete([0.5, 0.5], 0.6)).toBe(false)
    expect(labelingComplete([0.7, 0.8], 0.6)).toBe(true)
  })
})
