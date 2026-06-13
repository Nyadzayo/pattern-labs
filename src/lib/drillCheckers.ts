/**
 * Pure answer checkers for Primitives Lab — one per rung kind.
 *
 * Each returns a {@link CheckResult}. They are side-effect free and async-free
 * (rung 6 "write" is judged by Pyodide in the UI, then wrapped in a CheckResult
 * — there is no pure checker for it here). These are the unit-tested heart of
 * the drill: given an answer they decide correct/incorrect and, on a wrong
 * answer, which misconception was tripped.
 */
import type {
  ClozeRung,
  CodeLine,
  FadeRung,
  OrderRung,
  PredictRung,
  RolesRung,
} from '@/content/primitives/types'

export interface CheckResult {
  correct: boolean
  /** Set on a wrong answer when the mistake maps to a known misconception. */
  misconceptionId?: string
  /** For blank-based rungs (fade/cloze): correctness of each blank, in order. */
  perBlank?: boolean[]
  message: string
}

/** trim + collapse internal whitespace runs to a single space. */
export function normalizeAnswer(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

function sameLine(a: CodeLine, b: CodeLine): boolean {
  return a.text === b.text && a.indent === b.indent
}

function sameLines(a: CodeLine[], b: CodeLine[]): boolean {
  return a.length === b.length && a.every((l, i) => sameLine(l, b[i]))
}

export function checkPredict(rung: PredictRung, choiceIndex: number): CheckResult {
  if (choiceIndex === rung.correctIndex) {
    return { correct: true, message: 'Correct.' }
  }
  const misconceptionId = rung.distractorMisconceptions[choiceIndex] ?? undefined
  return { correct: false, misconceptionId, message: 'Not quite.' }
}

/** `picked` = the lines the learner arranged, in their chosen order (distractors excluded by them). */
export function checkOrder(rung: OrderRung, picked: CodeLine[]): CheckResult {
  if (sameLines(picked, rung.lines)) {
    return { correct: true, message: 'Correct order.' }
  }
  // Surface a misconception if the learner used a trap line.
  for (const line of picked) {
    const trap = rung.distractors.find((d) => sameLine(d, line))
    if (trap) {
      return { correct: false, misconceptionId: trap.misconceptionId, message: 'That line is a trap.' }
    }
  }
  return { correct: false, message: 'Lines are out of order.' }
}

/**
 * Fade = reorder the correct lines AND fill the blanks.
 * `pickedLines` parallels the Order check; `blankInputs` parallels `rung.blanks`.
 */
export function checkFade(
  rung: FadeRung,
  pickedLines: CodeLine[],
  blankInputs: string[],
): CheckResult {
  const orderOk = sameLines(pickedLines, rung.lines)
  const perBlank = rung.blanks.map((b, i) => blankInputs[i] === b.token)
  const blanksOk = perBlank.every(Boolean)

  if (orderOk && blanksOk) {
    return { correct: true, perBlank, message: 'Correct.' }
  }

  if (!orderOk) {
    for (const line of pickedLines) {
      const trap = rung.distractors.find((d) => sameLine(d, line))
      if (trap) {
        return { correct: false, perBlank, misconceptionId: trap.misconceptionId, message: 'That line is a trap.' }
      }
    }
  }

  // First wrong blank with a mapped misconception.
  for (let i = 0; i < rung.blanks.length; i++) {
    if (!perBlank[i]) {
      const id = rung.blanks[i].misconceptionByOption?.[blankInputs[i]]
      if (id) return { correct: false, perBlank, misconceptionId: id, message: 'Check that blank.' }
    }
  }

  return { correct: false, perBlank, message: orderOk ? 'A blank is wrong.' : 'Lines are out of order.' }
}

/** `inputs` parallels `rung.blanks`. Normalized comparison against each blank's `accept[]`. */
export function checkCloze(rung: ClozeRung, inputs: string[]): CheckResult {
  const perBlank = rung.blanks.map((b, i) => {
    const got = normalizeAnswer(inputs[i] ?? '')
    return b.accept.some((a) => normalizeAnswer(a) === got)
  })
  if (perBlank.every(Boolean)) {
    return { correct: true, perBlank, message: 'Correct.' }
  }
  for (let i = 0; i < rung.blanks.length; i++) {
    if (!perBlank[i]) {
      const got = normalizeAnswer(inputs[i] ?? '')
      const id = rung.blanks[i].misconceptionByInput?.[got]
      if (id) return { correct: false, perBlank, misconceptionId: id, message: 'Check that blank.' }
    }
  }
  return { correct: false, perBlank, message: 'Some blanks are wrong.' }
}

/** `assignment` maps slot id → chosen role. */
export function checkRoles(rung: RolesRung, assignment: Record<string, string>): CheckResult {
  const allCorrect = rung.slots.every((s) => assignment[s.id] === s.correctRole)
  if (allCorrect) return { correct: true, message: 'All roles correct.' }
  return { correct: false, message: 'Some roles are wrong.' }
}
