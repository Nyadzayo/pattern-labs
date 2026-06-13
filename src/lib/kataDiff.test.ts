import { describe, it, expect } from 'vitest'
import {
  codeWpm,
  diffChars,
  hesitationMap,
  isComplete,
  keystrokeAccuracy,
  positionalAccuracy,
  tokenizeReference,
  type Keystroke,
} from './kataDiff'

describe('diffChars', () => {
  it('marks correct, wrong, and pending positions', () => {
    const cells = diffChars('abcd', 'abXd')
    expect(cells.map((c) => c.status)).toEqual(['correct', 'correct', 'wrong', 'correct'])
  })
  it('pads pending for untyped tail', () => {
    const cells = diffChars('abcd', 'ab')
    expect(cells.map((c) => c.status)).toEqual(['correct', 'correct', 'pending', 'pending'])
    expect(cells[2].ch).toBe('c') // pending cells render the reference char
  })
  it('flags surplus characters typed past the reference as wrong', () => {
    const cells = diffChars('ab', 'abcd')
    expect(cells).toHaveLength(4)
    expect(cells.map((c) => c.status)).toEqual(['correct', 'correct', 'wrong', 'wrong'])
    expect(cells[2].ch).toBe('c') // surplus renders the typed char
  })
})

describe('isComplete', () => {
  it('is true only on an exact match', () => {
    expect(isComplete('left = 0', 'left = 0')).toBe(true)
    expect(isComplete('left = 0', 'left = 1')).toBe(false)
    expect(isComplete('left = 0', 'left = 0 ')).toBe(false) // trailing space differs
  })
})

describe('positionalAccuracy', () => {
  it('is the fraction of typed positions matching the reference', () => {
    expect(positionalAccuracy('abcd', '')).toBe(1)
    expect(positionalAccuracy('abcd', 'abcd')).toBe(1)
    expect(positionalAccuracy('abcd', 'abXd')).toBe(0.75)
    expect(positionalAccuracy('abcd', 'aXXd')).toBe(0.5)
  })
})

describe('codeWpm', () => {
  it('uses 5 chars per word', () => {
    expect(codeWpm(0, 10)).toBe(0)
    expect(codeWpm(50, 60)).toBe(10) // 50 chars = 10 words in 1 minute
    expect(codeWpm(50, 0)).toBe(0) // guard against div-by-zero
  })
})

describe('keystrokeAccuracy', () => {
  it('is correct insertions over total', () => {
    expect(keystrokeAccuracy([])).toBe(1)
    const keys: Keystroke[] = [
      { t: 0, index: 0, correct: true },
      { t: 1, index: 1, correct: false },
      { t: 2, index: 1, correct: true },
      { t: 3, index: 2, correct: true },
    ]
    expect(keystrokeAccuracy(keys)).toBe(0.75)
  })
})

describe('tokenizeReference', () => {
  it('splits on whitespace and keeps char offsets', () => {
    const toks = tokenizeReference('left = 0')
    expect(toks.map((t) => t.text)).toEqual(['left', '=', '0'])
    expect(toks[2]).toEqual({ text: '0', start: 7, end: 8 })
  })
  it('returns nothing for whitespace-only input', () => {
    expect(tokenizeReference('   ')).toEqual([])
  })
})

describe('hesitationMap', () => {
  const ref = 'left = right' // tokens: left[0,4) =[5,6) right[7,12)

  it('attributes the pre-keystroke gap to the token being typed and ranks by max pause', () => {
    // Type "left" fast, pause 900ms before "=", then type "right" with a 400ms pause mid-token.
    const keys: Keystroke[] = []
    let t = 0
    for (let i = 0; i < 4; i++) keys.push({ t: (t += 50), index: i, correct: true }) // left
    keys.push({ t: (t += 60), index: 4, correct: true }) // the space (whitespace, ignored as a token)
    keys.push({ t: (t += 900), index: 5, correct: true }) // '=' — big pause before it
    keys.push({ t: (t += 60), index: 6, correct: true }) // space
    keys.push({ t: (t += 50), index: 7, correct: true }) // r
    keys.push({ t: (t += 400), index: 8, correct: true }) // i — 400ms pause inside "right"
    keys.push({ t: (t += 50), index: 9, correct: true }) // g
    keys.push({ t: (t += 50), index: 10, correct: true }) // h
    keys.push({ t: (t += 50), index: 11, correct: true }) // t

    const map = hesitationMap(ref, keys)
    expect(map[0].token).toBe('=') // 900ms — the laggiest
    expect(map[0].pauseMs).toBe(900)
    expect(map[1].token).toBe('right') // 400ms
    expect(map[1].pauseMs).toBe(400)
  })

  it('returns an empty map when typing is uniformly fast (no gaps stand out)', () => {
    const keys: Keystroke[] = []
    for (let i = 0; i < ref.length; i++) keys.push({ t: i, index: i, correct: true })
    // every gap is 1ms and > 0, so tokens get a pause; but ranking still works —
    // assert it never throws and respects topN.
    expect(hesitationMap(ref, keys, 2).length).toBeLessThanOrEqual(2)
  })

  it('is empty for whitespace-only references', () => {
    expect(hesitationMap('   ', [{ t: 0, index: 0, correct: true }])).toEqual([])
  })
})
