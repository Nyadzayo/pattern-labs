import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'math-geometry-01',
    text: 'A drone hovers above a flat warehouse floor and a worker stands at fixed coordinates. Report whether the worker falls inside, on, or outside a circular no-fly zone of known center and radius.',
    pattern: 'math-geometry',
    lookalikes: ['binary-search', 'two-pointers', 'sort-search'],
    tell: 'Classifying a point against a circle reduces to comparing squared distance to radius squared — closed-form coordinate arithmetic, not a search over sorted data.',
  },
  {
    id: 'math-geometry-02',
    text: 'A clock has only an hour hand and a minute hand. Given a time of day, compute the smaller angle in degrees between the two hands.',
    pattern: 'math-geometry',
    lookalikes: ['greedy', 'prefix-sums', 'sort-search'],
    tell: 'Each hand maps to an angle via constant degrees-per-unit, then take the modular difference — a direct formula, not an accumulation or a choice rule.',
  },
  {
    id: 'math-geometry-03',
    text: 'Starting at the top-left cell of an m-by-n grid you may step only right or down. Without enumerating routes, count how many distinct paths reach the bottom-right corner.',
    pattern: 'math-geometry',
    lookalikes: ['dynamic-programming', 'backtracking', 'graphs'],
    tell: 'A fixed number of right and down moves makes the count a single binomial coefficient — combinatorics closes the form instead of filling a DP table or exploring branches.',
  },
  {
    id: 'math-geometry-04',
    text: 'You repeatedly multiply a positive integer by itself: 1, then a pair, then a triple, and so on. Given a target, decide whether it equals some integer raised to some integer power greater than one.',
    pattern: 'math-geometry',
    lookalikes: ['binary-search', 'bit-manipulation', 'two-pointers'],
    tell: 'Detecting a perfect power is about integer roots and divisibility of exponents — number-theory reasoning, not a sorted-array probe or bit tricks.',
  },
  {
    id: 'math-geometry-05',
    text: 'A spreadsheet labels columns A, B, ..., Z, then AA, AB, and onward. Given such a label, return the 1-based position of that column.',
    pattern: 'math-geometry',
    lookalikes: ['bit-manipulation', 'prefix-sums', 'hash-maps-sets'],
    tell: 'The labels are a bijective base-26 numeral system, so each letter contributes its digit times a power of 26 — positional place-value math, not bit shifts or running totals.',
  },
]

export default stems
