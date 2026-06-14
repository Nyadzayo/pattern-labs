/**
 * Shared shape-check for subgoal annotations, used by both validate-primitives
 * (label rungs) and validate-content (reference solutions). Errors on the
 * invariants that would break the labeling UI/grading; warns on coverage gaps.
 */
import type { Subgoal } from '../src/content/types'

export function checkSubgoals(
  code: string,
  subgoals: Subgoal[] | undefined,
  err: (msg: string) => void,
  warn: (msg: string) => void,
  where = 'subgoals',
): void {
  if (!subgoals) return
  if (subgoals.length === 0) {
    err(`${where}: subgoals[] is present but empty`)
    return
  }
  const totalLines = code.replace(/\n+$/, '').split('\n').length
  let prevEnd = 0
  subgoals.forEach((s, i) => {
    const [a, b] = s.lineRange ?? [NaN, NaN]
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 1 || b < a) {
      err(`${where} chunk ${i}: invalid lineRange [${a}, ${b}]`)
    } else {
      if (b > totalLines)
        err(`${where} chunk ${i}: lineRange end ${b} exceeds the solution's ${totalLines} lines`)
      if (a <= prevEnd) err(`${where} chunk ${i}: lineRange start ${a} overlaps the previous chunk (ended ${prevEnd})`)
      else if (a > prevEnd + 1)
        warn(`${where} chunk ${i}: lines ${prevEnd + 1}–${a - 1} are uncovered (chunks should be contiguous)`)
      prevEnd = Math.max(prevEnd, b)
    }
    if (!s.referenceLabel || !s.referenceLabel.trim()) err(`${where} chunk ${i}: empty referenceLabel`)
    if (!Array.isArray(s.acceptableKeywords) || s.acceptableKeywords.length === 0)
      err(`${where} chunk ${i}: acceptableKeywords[] is empty`)
  })
  if (prevEnd > 0 && prevEnd < totalLines)
    warn(`${where}: chunks cover lines 1–${prevEnd} of ${totalLines} (tail uncovered)`)
}
