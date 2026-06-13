import { describe, it, expect } from 'vitest'
import {
  checkCloze,
  checkFade,
  checkOrder,
  checkPredict,
  checkRoles,
  normalizeAnswer,
} from './drillCheckers'
import type {
  ClozeRung,
  FadeRung,
  OrderRung,
  PredictRung,
  RolesRung,
} from '@/content/primitives/types'

describe('checkPredict', () => {
  const rung: PredictRung = {
    kind: 'predict',
    markedLine: 0,
    prompt: '',
    choices: ['a', 'b', 'c'],
    correctIndex: 1,
    distractorMisconceptions: ['m0', null, 'm2'],
    verify: { mode: 'stdout' },
  }
  it('accepts the correct choice', () => {
    expect(checkPredict(rung, 1)).toEqual({ correct: true, message: expect.any(String) })
  })
  it('maps each wrong choice to its misconception', () => {
    expect(checkPredict(rung, 0).misconceptionId).toBe('m0')
    expect(checkPredict(rung, 2).misconceptionId).toBe('m2')
    expect(checkPredict(rung, 0).correct).toBe(false)
  })
})

describe('checkOrder', () => {
  const rung: OrderRung = {
    kind: 'order',
    lines: [
      { text: 'a = 0', indent: 0 },
      { text: 'a += 1', indent: 1 },
    ],
    distractors: [{ text: 'a -= 1', indent: 1, misconceptionId: 'mtrap' }],
  }
  it('accepts the exact correct ordering', () => {
    expect(checkOrder(rung, rung.lines).correct).toBe(true)
  })
  it('rejects a reordering with no misconception', () => {
    const res = checkOrder(rung, [rung.lines[1], rung.lines[0]])
    expect(res.correct).toBe(false)
    expect(res.misconceptionId).toBeUndefined()
  })
  it('flags a trap line by its misconception', () => {
    const res = checkOrder(rung, [{ text: 'a = 0', indent: 0 }, { text: 'a -= 1', indent: 1 }])
    expect(res.correct).toBe(false)
    expect(res.misconceptionId).toBe('mtrap')
  })
})

describe('checkFade', () => {
  const rung: FadeRung = {
    kind: 'fade',
    lines: [{ text: 'x = f(y)', indent: 0 }],
    distractors: [{ text: 'trap()', indent: 0, misconceptionId: 'mt' }],
    blanks: [{ lineIndex: 0, token: 'f', options: ['f', 'g'], misconceptionByOption: { g: 'mg' } }],
  }
  it('accepts correct order + correct blank', () => {
    const res = checkFade(rung, rung.lines, ['f'])
    expect(res.correct).toBe(true)
    expect(res.perBlank).toEqual([true])
  })
  it('maps a wrong blank option to its misconception', () => {
    const res = checkFade(rung, rung.lines, ['g'])
    expect(res.correct).toBe(false)
    expect(res.perBlank).toEqual([false])
    expect(res.misconceptionId).toBe('mg')
  })
  it('flags a trap line over a blank error', () => {
    const res = checkFade(rung, [{ text: 'trap()', indent: 0 }], ['f'])
    expect(res.correct).toBe(false)
    expect(res.misconceptionId).toBe('mt')
  })
})

describe('checkCloze', () => {
  const rung: ClozeRung = {
    kind: 'cloze',
    lines: ['n = ▢'],
    blanks: [
      {
        lineIndex: 0,
        accept: ['len(arr)', 'len( arr )'],
        misconceptionByInput: { arr: 'm-raw' },
      },
    ],
  }
  it('accepts the canonical answer', () => {
    expect(checkCloze(rung, ['len(arr)']).correct).toBe(true)
  })
  it('accepts an alternative spelling under whitespace normalization', () => {
    expect(checkCloze(rung, ['len(  arr )']).correct).toBe(true)
    expect(checkCloze(rung, ['  len(arr)  ']).correct).toBe(true)
  })
  it('maps a known wrong input to its misconception', () => {
    const res = checkCloze(rung, ['arr'])
    expect(res.correct).toBe(false)
    expect(res.perBlank).toEqual([false])
    expect(res.misconceptionId).toBe('m-raw')
  })
})

describe('checkRoles', () => {
  const rung: RolesRung = {
    kind: 'roles',
    lines: ['⟦s1⟧ then ⟦s2⟧'],
    slots: [
      { id: 's1', correctRole: 'index' },
      { id: 's2', correctRole: 'total' },
    ],
    roleBank: ['index', 'total', 'flag'],
  }
  it('accepts a fully correct assignment', () => {
    expect(checkRoles(rung, { s1: 'index', s2: 'total' }).correct).toBe(true)
  })
  it('rejects any wrong role', () => {
    expect(checkRoles(rung, { s1: 'index', s2: 'flag' }).correct).toBe(false)
  })
})

describe('normalizeAnswer', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizeAnswer('  a   +  b ')).toBe('a + b')
  })
})
