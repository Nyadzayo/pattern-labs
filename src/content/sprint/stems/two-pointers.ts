import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'two-pointers-01',
    text: 'A list of daily temperatures is already sorted from coldest to hottest. Given a target difference, decide whether any two readings differ by exactly that amount.',
    pattern: 'two-pointers',
    lookalikes: ['hash-maps-sets', 'binary-search', 'sliding-windows'],
    tell: 'Sorted input plus "find a pair with a fixed relationship" → march one pointer up and one down, widening or narrowing the gap.',
  },
  {
    id: 'two-pointers-02',
    text: 'Rafters have known weights and each raft holds at most two people up to a fixed limit. With the weights sorted, count the fewest rafts needed.',
    pattern: 'two-pointers',
    lookalikes: ['greedy', 'sort-search', 'sliding-windows'],
    tell: 'Pairing the lightest with the heaviest from sorted data → opposite-ends pointers that converge, not a moving window.',
  },
  {
    id: 'two-pointers-03',
    text: 'Push every zero in an array to the end while preserving the order of the non-zero values, using no second array.',
    pattern: 'two-pointers',
    lookalikes: ['fast-slow-pointers', 'sliding-windows', 'sort-search'],
    tell: 'In-place compaction that keeps relative order → a slow write pointer trails a fast read pointer over one pass.',
  },
  {
    id: 'two-pointers-04',
    text: 'Vertical lines of varying heights stand at consecutive positions. Choose two lines so the water trapped between them is greatest.',
    pattern: 'two-pointers',
    lookalikes: ['dynamic-programming', 'prefix-sums', 'sliding-windows'],
    tell: 'Maximize an area between two boundaries on an axis → start wide and step the shorter side inward each move.',
  },
]

export default stems
