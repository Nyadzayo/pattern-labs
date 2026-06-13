import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'sliding-windows-01',
    text: 'Find the length of the longest stretch of a string that contains no repeated character.',
    pattern: 'sliding-windows',
    lookalikes: ['hash-maps-sets', 'two-pointers', 'dynamic-programming'],
    tell: 'Longest contiguous span under a "no duplicates" constraint → grow the right edge and pull the left edge in whenever the constraint breaks.',
  },
  {
    id: 'sliding-windows-02',
    text: 'An array holds only 0s and 1s. You may flip at most k zeros to ones; return the longest run of consecutive ones you can achieve.',
    pattern: 'sliding-windows',
    lookalikes: ['two-pointers', 'prefix-sums', 'greedy'],
    tell: 'Longest contiguous run under an "at most k" budget → a window that shrinks from the left once the budget is exceeded.',
  },
  {
    id: 'sliding-windows-03',
    text: 'Given daily sales (all positive) and a quota, return the length of the shortest contiguous block of days whose total reaches the quota.',
    pattern: 'sliding-windows',
    lookalikes: ['prefix-sums', 'two-pointers', 'binary-search'],
    tell: 'Shortest contiguous span reaching a target sum of positives → expand until you hit it, then contract from the left to minimize.',
  },
  {
    id: 'sliding-windows-04',
    text: 'Compute the maximum average over any block of exactly k consecutive scores.',
    pattern: 'sliding-windows',
    lookalikes: ['prefix-sums', 'two-pointers', 'heaps'],
    tell: 'A statistic over every fixed-size block of k → slide a fixed-width window, adding the entering value and dropping the leaving one.',
  },
]

export default stems
