/**
 * Code Katas — pure, deterministic diff + typing metrics.
 *
 * Nothing here calls `Date`, `Math.random`, or any async work. The typing
 * surface stamps each inserted character with `performance.now()` and feeds the
 * resulting `Keystroke[]` to these functions, so diffing, accuracy, WPM, and the
 * hesitation map are all unit-testable from fixed inputs.
 */

export type CharStatus = 'correct' | 'wrong' | 'pending'

export interface CharCell {
  /** Character to render at this position (reference char, or an extra typed char). */
  ch: string
  status: CharStatus
}

/**
 * Per-position diff of `typed` against `reference`. Length is the longer of the
 * two. Typed positions render the *typed* character (so a wrong cell shows what
 * the learner actually keyed); not-yet-reached positions render the reference
 * character and are `pending`; characters typed past the end of the reference
 * are surplus and marked `wrong`.
 */
export function diffChars(reference: string, typed: string): CharCell[] {
  const n = Math.max(reference.length, typed.length)
  const cells: CharCell[] = []
  for (let i = 0; i < n; i++) {
    if (i >= typed.length) {
      cells.push({ ch: reference[i], status: 'pending' })
    } else {
      const status: CharStatus = typed[i] === reference[i] ? 'correct' : 'wrong'
      cells.push({ ch: typed[i], status })
    }
  }
  return cells
}

/** Where the next character will land. */
export function cursorIndex(typed: string): number {
  return typed.length
}

/** Guided/fading completion gate: an exact match. */
export function isComplete(reference: string, typed: string): boolean {
  return typed === reference
}

/** Fraction of currently-typed positions that match the reference (0..1). */
export function positionalAccuracy(reference: string, typed: string): number {
  if (typed.length === 0) return 1
  let correct = 0
  const n = Math.min(reference.length, typed.length)
  for (let i = 0; i < n; i++) if (typed[i] === reference[i]) correct++
  return correct / typed.length
}

/** Code words-per-minute (5 characters = 1 word). */
export function codeWpm(chars: number, seconds: number): number {
  if (seconds <= 0) return 0
  return chars / 5 / (seconds / 60)
}

/** One committed character: a timestamp, the reference slot it filled, and whether it matched. */
export interface Keystroke {
  /** Milliseconds (performance.now); only relative gaps are used. */
  t: number
  /** Reference position this keystroke filled (0-based). */
  index: number
  correct: boolean
}

/** Keystroke-level accuracy: correct insertions / total insertions. */
export function keystrokeAccuracy(keys: Keystroke[]): number {
  if (keys.length === 0) return 1
  return keys.filter((k) => k.correct).length / keys.length
}

export interface Token {
  text: string
  /** Char offsets into the reference, [start, end). */
  start: number
  end: number
}

/** Reference split into non-whitespace tokens with their char offsets. */
export function tokenizeReference(reference: string): Token[] {
  const tokens: Token[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(reference)) !== null) {
    tokens.push({ text: m[0], start: m.index, end: m.index + m[0].length })
  }
  return tokens
}

export interface TokenPause {
  token: string
  start: number
  end: number
  pauseMs: number
}

/**
 * Rank reference tokens by the longest pause the learner took on them. The gap
 * before a keystroke (time since the previous keystroke) is the hesitation
 * *before* committing that character; each token keeps the max such gap landing
 * inside it. The laggiest tokens are the not-yet-automatic spots to drill next.
 */
export function hesitationMap(reference: string, keys: Keystroke[], topN = 4): TokenPause[] {
  const tokens = tokenizeReference(reference)
  if (tokens.length === 0) return []
  const sorted = [...keys].sort((a, b) => a.t - b.t)
  const maxGap = new Array(tokens.length).fill(0)
  const tokenAt = (idx: number) => tokens.findIndex((tk) => idx >= tk.start && idx < tk.end)

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i].t - sorted[i - 1].t
    if (gap <= 0) continue
    const ti = tokenAt(sorted[i].index)
    if (ti >= 0 && gap > maxGap[ti]) maxGap[ti] = gap
  }

  return tokens
    .map((tk, i) => ({ token: tk.text, start: tk.start, end: tk.end, pauseMs: Math.round(maxGap[i]) }))
    .filter((tp) => tp.pauseMs > 0)
    .sort((a, b) => b.pauseMs - a.pauseMs)
    .slice(0, topN)
}
