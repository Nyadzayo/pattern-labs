/**
 * Primitives Lab — content schema.
 *
 * A *primitive* is one recurring micro-pattern (a loop idiom, a pointer setup,
 * a window mechanic …). Each is drilled on a fading ladder of 6 core rungs,
 * optionally with a 7th "label" rung inserted before write:
 *
 *   1 predict (MC)  2 order (Parsons)  3 fade (Parsons + blanks)
 *   4 cloze (typed blanks)  5 roles (assign variable roles)
 *   [6 label (self-generated subgoal labeling — only when subgoals authored)]
 *   write (from scratch) — always the last rung
 *
 * `snippet` is the single source of truth. Every Order / Fade / Cloze rung must
 * reconstruct (lines in order, blanks filled with the correct token) to exactly
 * this `snippet` (whitespace-normalized) — the validator enforces it by
 * reconstructing + compiling, so a drill can never teach code that drifts from
 * the primitive it claims to drill.
 */
import type { ModuleId, Subgoal, TestCase } from '../types'

export type RungKind = 'predict' | 'order' | 'fade' | 'cloze' | 'roles' | 'label' | 'write'

export type PrimitiveCategory =
  | 'loops'
  | 'state'
  | 'two-pointers'
  | 'sliding-window'
  | 'hashing'
  | 'binary-search'
  | 'stack-queue'
  | 'recursion'
  | 'dp'
  | 'arrays'

/** Sentinel that marks a typed blank inside a Cloze line. */
export const CLOZE_BLANK = '▢'

/** A named misconception with the feedback shown when a learner trips it. */
export interface Misconception {
  id: string
  label: string
  feedback: string
}

/** A code line with an indent depth measured in 4-space units. */
export interface CodeLine {
  text: string
  indent: number
}

/**
 * Rung 1 — Predict. The learner reads `snippet` (with `markedLine` highlighted)
 * and predicts the value of a marked expression / the printed output.
 * The validator runs `verify.setup` + `snippet` and asserts the result equals
 * `choices[correctIndex]`, so the answer key is machine-proven.
 */
export interface PredictRung {
  kind: 'predict'
  /** 0-based index into the snippet's lines that the prompt focuses on. */
  markedLine: number
  prompt: string
  choices: string[]
  correctIndex: number
  /** Parallel to `choices`: a misconception id per wrong choice, `null` for the correct one. */
  distractorMisconceptions: (string | null)[]
  verify: {
    setup?: string
    /** 'stdout' → captured stdout (stripped); {expr} → str() of evaluating `expr` after the snippet. */
    mode: 'stdout' | { expr: string }
  }
}

/** Rung 2 — Order (Parsons): drag the correct lines into order; trap lines must be left out. */
export interface OrderRung {
  kind: 'order'
  /** Correct program = these lines in array order, at their indents. */
  lines: CodeLine[]
  /** 1–2 trap lines that must NOT be used; each names the misconception it represents. */
  distractors: (CodeLine & { misconceptionId: string })[]
}

/** Rung 3 — Fade (Parsons + blanks): order the correct lines AND fill the blanked tokens. */
export interface FadeRung {
  kind: 'fade'
  lines: CodeLine[]
  distractors: (CodeLine & { misconceptionId: string })[]
  blanks: {
    /** Index into `lines`. The line text must contain `token` literally. */
    lineIndex: number
    /** The correct token (must be one of `options`). */
    token: string
    options: string[]
    /** option text → misconception id, for wrong picks. */
    misconceptionByOption?: Record<string, string>
  }[]
}

/** Rung 4 — Cloze: lines are shown in order; the learner types each blanked token. */
export interface ClozeRung {
  kind: 'cloze'
  /** Full lines (indentation baked in). A blanked line contains the {@link CLOZE_BLANK} sentinel. */
  lines: string[]
  blanks: {
    lineIndex: number
    /** Accepted answers (normalized: trim + collapse inner whitespace). `accept[0]` is canonical. */
    accept: string[]
    misconceptionByInput?: Record<string, string>
    placeholder?: string
  }[]
}

/** Rung 5 — Roles: assign each marked variable/expression a semantic role from a bank. */
export interface RolesRung {
  kind: 'roles'
  /** Lines with slot markers like `⟦s1⟧` standing in for variables/expressions. */
  lines: string[]
  slots: { id: string; correctRole: string }[]
  /** Correct roles + distractor roles. */
  roleBank: string[]
}

/**
 * Rung 6 (optional) — Label: self-generated subgoal labeling. The learner types
 * their own purpose label for each chunk of the write-rung solution, then the
 * canonical labels are revealed for comparison (generate-then-reveal). Present
 * only on primitives whose write solution has been subgoal-annotated; its
 * `subgoals` lineRanges index into the sibling {@link WriteRung.solution}.
 */
export interface LabelRung {
  kind: 'label'
  subgoals: Subgoal[]
}

/** Write: implement the primitive from scratch; judged by Pyodide against `testCases`. Always last. */
export interface WriteRung {
  kind: 'write'
  functionName: string
  starterCode: string
  testCases: TestCase[]
  parSeconds: number
  solution: string
}

export type Rung = PredictRung | OrderRung | FadeRung | ClozeRung | RolesRung | LabelRung | WriteRung

/** The 6 core rungs (predict → write), no subgoal labeling. */
export type CoreLadder = [PredictRung, OrderRung, FadeRung, ClozeRung, RolesRung, WriteRung]
/** The 7-rung ladder: a Label rung sits between Roles and Write. */
export type LabeledLadder = [PredictRung, OrderRung, FadeRung, ClozeRung, RolesRung, LabelRung, WriteRung]

export interface Primitive {
  id: string
  name: string
  category: PrimitiveCategory
  /** The canonical idiom — single source of truth for the order/fade/cloze rungs. */
  snippet: string
  /** Short "why this matters / how to recognize it" note (1–3 sentences). */
  why: string
  misconceptions: Misconception[]
  moduleTags: ModuleId[]
  /**
   * The fading ladder. Either the 6 core rungs, or 7 with a Label rung inserted
   * before Write. Write is ALWAYS the last element; index lookups for write/label
   * must be by `kind`, never a fixed position. The validator enforces the order.
   */
  rungs: CoreLadder | LabeledLadder
}

/** Find a primitive's write rung (always present, always last) by kind. */
export function findWriteRung(p: Primitive): WriteRung {
  return (p.rungs as Rung[]).find((r): r is WriteRung => r.kind === 'write') as WriteRung
}

/** Find a primitive's optional label rung by kind (undefined when not authored). */
export function findLabelRung(p: Primitive): LabelRung | undefined {
  return (p.rungs as Rung[]).find((r): r is LabelRung => r.kind === 'label')
}
