import { describe, it, expect } from 'vitest'
import '@/content/primitives' // register the catalog so the fallback can resolve primitives
import { detectWeakPrimitives } from './primitiveTells'
import { defaultState } from './storage'

const state = defaultState()

describe('detectWeakPrimitives', () => {
  it('fires the naive-midpoint tell on a failed binary-search problem', () => {
    const ids = detectWeakPrimitives(
      [{ moduleId: 'binary-search', code: 'mid = (lo + hi) // 2', passedAll: false }],
      state,
    )
    expect(ids).toContain('bs-mid-overflow-safe')
  })

  it('stays silent when every problem passed (no false negatives surfaced)', () => {
    expect(
      detectWeakPrimitives(
        [{ moduleId: 'binary-search', code: 'mid = (lo + hi) // 2', passedAll: true }],
        state,
      ),
    ).toEqual([])
  })

  it('flags loop-and-a-half on a `while True` with no break', () => {
    const ids = detectWeakPrimitives(
      [{ moduleId: 'linked-lists', code: 'while True:\n    x += 1', passedAll: false }],
      state,
    )
    expect(ids).toContain('loop-and-a-half')
  })

  it('does not fire the loop tell when there is a break (suppressed; falls back)', () => {
    const ids = detectWeakPrimitives(
      [{ moduleId: 'graphs', code: 'while True:\n    if done:\n        break', passedAll: false }],
      state,
    )
    expect(ids).not.toContain('loop-and-a-half')
    expect(ids.length).toBeGreaterThan(0) // fallback surfaces a graphs primitive
  })

  it('falls back to a module-tagged primitive when no tell fires', () => {
    const ids = detectWeakPrimitives(
      [{ moduleId: 'heaps', code: 'x = sorted(nums)[-k]', passedAll: false }],
      state,
    )
    expect(ids).toContain('heap-push-pop-k') // the only primitive tagging 'heaps'
  })
})
