import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'backtracking-01',
    text: 'A florist has a row of empty vases and a set of distinct flower types. List every arrangement that fills the vases using each flower at most once, where order matters.',
    pattern: 'backtracking',
    lookalikes: ['dynamic-programming', 'greedy', 'sort-search'],
    tell: 'Enumerate every full ordering, placing one flower then undoing it to try the next → grow a partial choice, recurse, and revert.',
  },
  {
    id: 'backtracking-02',
    text: 'Place eight watchtowers on a square grid of plots so that no two towers share a row, column, or diagonal sightline, and report each distinct valid layout.',
    pattern: 'backtracking',
    lookalikes: ['graphs', 'greedy', 'math-geometry'],
    tell: 'Fill positions one at a time, abandoning a branch the moment a constraint breaks, then back up to try another spot → constrained construction with pruning.',
  },
  {
    id: 'backtracking-03',
    text: 'Given a string of digits and a phone keypad mapping, produce every possible word that could have been typed, with each digit contributing one of its letters.',
    pattern: 'backtracking',
    lookalikes: ['trees', 'dynamic-programming', 'hash-maps-sets'],
    tell: 'Build each candidate letter-by-letter across all branches and collect the complete set → depth-first choice expansion, not a tabulated count.',
  },
  {
    id: 'backtracking-04',
    text: 'A hiker wants every route through a maze of rooms that starts at the entrance, visits a fixed number of rooms without repeating one, and ends at the exit; print all such complete routes.',
    pattern: 'backtracking',
    lookalikes: ['graphs', 'dynamic-programming', 'trees'],
    tell: 'Listing every full path under a "no repeats" rule means marking a room, recursing, then unmarking to explore alternatives — exhaustive search with undo, not shortest-path.',
  },
  {
    id: 'backtracking-05',
    text: 'Split a banner of letters into pieces so that every piece reads the same forwards and backwards, and report each way the banner can be cut.',
    pattern: 'backtracking',
    lookalikes: ['dynamic-programming', 'two-pointers', 'greedy'],
    tell: 'You need every valid set of cuts, not just a count or one split, so you try a prefix cut, recurse on the rest, then retract it and try a longer prefix.',
  },
]

export default stems
