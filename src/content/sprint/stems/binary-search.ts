import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'binary-search-01',
    text: 'A sorted array was rotated at an unknown pivot. Locate a given value in logarithmic time.',
    pattern: 'binary-search',
    lookalikes: ['two-pointers', 'sort-search', 'sliding-windows'],
    tell: 'Sorted-but-rotated data with a log-time requirement → binary search, deciding at each step which half is still in order.',
  },
  {
    id: 'binary-search-02',
    text: 'You must ship a fixed list of package weights within D days, packing consecutive packages each day. Find the smallest daily capacity that still finishes on time.',
    pattern: 'binary-search',
    lookalikes: ['greedy', 'dynamic-programming', 'two-pointers'],
    tell: 'Minimize a capacity where "is this feasible?" is monotonic in the value → binary search the answer space, not the array.',
  },
  {
    id: 'binary-search-03',
    text: 'Given a sorted array that may contain duplicates, return the index at which a target would be inserted to keep the array sorted.',
    pattern: 'binary-search',
    lookalikes: ['two-pointers', 'sort-search', 'prefix-sums'],
    tell: 'First index meeting a threshold in sorted data → a lower-bound binary search that converges on the boundary.',
  },
  {
    id: 'binary-search-04',
    text: 'In an array where neighbors are never equal, find any peak — an element greater than both of its neighbors — in logarithmic time.',
    pattern: 'binary-search',
    lookalikes: ['two-pointers', 'sort-search', 'heaps'],
    tell: 'Log-time on unsorted data by always walking toward the rising side → binary search on the local slope.',
  },
]

export default stems
