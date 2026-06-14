/**
 * Content schema for Pattern Lab modules.
 *
 * Every module file in src/content/modules/ exports a `ModuleContent`.
 * The judge calls `functionName(...testCase.input)` and deep-compares the
 * return value against `testCase.expected`, so inputs/expected must be
 * JSON-serializable values that map cleanly to Python (numbers, strings,
 * booleans, null, arrays, plain objects → dicts).
 */

export const MODULE_IDS = [
  'two-pointers',
  'hash-maps-sets',
  'linked-lists',
  'fast-slow-pointers',
  'sliding-windows',
  'binary-search',
  'stacks',
  'heaps',
  'intervals',
  'prefix-sums',
  'trees',
  'tries',
  'graphs',
  'backtracking',
  'dynamic-programming',
  'greedy',
  'sort-search',
  'bit-manipulation',
  'math-geometry',
] as const

export type ModuleId = (typeof MODULE_IDS)[number]

export const VISUALIZER_IDS = [
  'two-pointers',
  'hash-map',
  'sliding-window',
  'binary-search',
  'linked-list',
  'stack',
  'heap',
  'intervals',
  'prefix-sums',
  'tree-traversal',
  'trie',
  'graph-traversal',
  'backtracking',
  'dp-table',
  'greedy-intervals',
  'bitwise',
] as const

export type VisualizerId = (typeof VISUALIZER_IDS)[number]

export type Difficulty = 'easy' | 'medium' | 'hard'

/** A single judge test case. `input` holds positional arguments. */
export interface TestCase {
  input: unknown[]
  expected: unknown
  /** Hidden cases run only on Submit; visible ones also run on Run. */
  hidden?: boolean
  label?: string
  /**
   * When true and `expected` is an array, compare as a multiset (element
   * order does not matter). Prefer deterministic outputs; use sparingly.
   */
  unordered?: boolean
}

export interface WorkedExample {
  input: string
  output: string
  explanation?: string
}

/**
 * One labeled chunk of a reference solution, used by the self-generated
 * subgoal-labeling exercise. Labels are abstract/context-free (describe the
 * role, not the specific variable names) since context-free subgoals aid
 * transfer best. The learner types their own label; we grade leniently against
 * `acceptableKeywords` and only then reveal `referenceLabel` for comparison.
 */
export interface Subgoal {
  /** Contiguous 1-based inclusive line span into the solution `code` string. */
  lineRange: [number, number]
  /** Canonical purpose label, short + imperative. Original writing. */
  referenceLabel: string
  /** Concept keywords for lenient grading of the learner's free-typed label. */
  acceptableKeywords: string[]
  /** Common confusion for this chunk, surfaced when a label fits the wrong chunk. */
  misconception?: string
}

export interface ReferenceSolution {
  /** Complete Python solution, commented line by line. */
  code: string
  /** Markdown walkthrough of the approach. */
  commentary: string
  /** e.g. "Time O(n), Space O(1)" */
  complexity: string
  /**
   * Optional subgoal annotation: contiguous, non-overlapping chunks covering
   * the solution, each with a context-free purpose label. Drives the "Label the
   * subgoals" exercise. Present on the first 3 modules now; rest authored later.
   */
  subgoals?: Subgoal[]
}

export interface Problem {
  id: string
  title: string
  difficulty: Difficulty
  /** Markdown problem statement. Original writing only. */
  statement: string
  examples: WorkedExample[]
  constraints: string[]
  /** Exactly three progressive hints, vague → concrete. */
  hints: [string, string, string]
  /** Name of the Python entry-point function the judge calls. */
  functionName: string
  /** Python starter stub shown in the editor. */
  starterCode: string
  solution: ReferenceSolution
  /** 6–10 cases including edge cases (judged by the Pyodide worker). */
  testCases: TestCase[]
  /** Optional similarly-themed classics, referenced by name only. */
  furtherPractice?: { name: string; note?: string }[]
}

export type QuizKind = 'conceptual' | 'complexity' | 'scenario'

export interface QuizQuestion {
  id: string
  /** Markdown. */
  prompt: string
  choices: string[]
  correctIndex: number
  /** Why the correct answer is correct (and distractors are not). */
  explanation: string
  kind: QuizKind
}

export interface Flashcard {
  id: string
  front: string
  back: string
}

export interface RealWorldUse {
  title: string
  description: string
}

export interface ModuleContent {
  id: ModuleId
  /** Markdown, 600–1000 words: intuition → mechanics → signals → complexity → pitfalls. */
  concept: string
  realWorldUses: RealWorldUse[]
  visualizer: VisualizerId
  problems: Problem[]
  quiz: QuizQuestion[]
  flashcards: Flashcard[]
  /** Cheat-sheet fields used by the printable summary page. */
  cheatSheet: {
    /** One-paragraph essence of the pattern. */
    tldr: string
    /** "Reach for this when…" bullets. */
    signals: string[]
    /** Canonical template code in Python. */
    template: string
    /** Typical complexity line. */
    complexity: string
  }
}

export interface ModuleMeta {
  id: ModuleId
  title: string
  /** Position in the curriculum, 1-based. */
  order: number
  /** One-line teaser shown in the sidebar/dashboard. */
  blurb: string
  visualizer: VisualizerId
}
