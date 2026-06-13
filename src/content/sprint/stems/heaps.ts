import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'heaps-01',
    text: 'A live trivia game streams millions of scores as they arrive. At any moment you must be able to flash the five highest scores so far on the leaderboard, without storing every score.',
    pattern: 'heaps',
    lookalikes: ['sort-search', 'greedy', 'binary-search'],
    tell: 'Keep only the top K from an unbounded stream → a size-K min-heap evicts its smallest each time a bigger score arrives, far cheaper than re-sorting everything.',
  },
  {
    id: 'heaps-02',
    text: 'You hold several already-sorted logs from different servers and must weave them into one timeline ordered by timestamp, pulling the next earliest entry one at a time.',
    pattern: 'heaps',
    lookalikes: ['two-pointers', 'sort-search', 'linked-lists'],
    tell: 'Merging many sorted sources by always taking the global next-smallest → a heap of the current front of each list surfaces that minimum in log time.',
  },
  {
    id: 'heaps-03',
    text: 'An emergency ward admits patients tagged with an urgency level, and new arrivals keep coming. Each time a doctor frees up, the most urgent waiting patient must be seen next.',
    pattern: 'heaps',
    lookalikes: ['greedy', 'stacks', 'sort-search'],
    tell: 'Repeatedly remove the current most-extreme item while new items keep being inserted → a priority queue (heap), since the set changes between every extraction.',
  },
  {
    id: 'heaps-04',
    text: 'Readings flow in from a sensor one value at a time, and after each new reading you must report the median of everything seen so far.',
    pattern: 'heaps',
    lookalikes: ['sort-search', 'binary-search', 'sliding-windows'],
    tell: 'A running middle value over a growing stream → balance a max-heap of the lower half against a min-heap of the upper half so the median sits at their tops.',
  },
  {
    id: 'heaps-05',
    text: 'Given a fleet of delivery jobs each with a known duration, you want to find the k-th shortest job overall without fully ordering the entire batch.',
    pattern: 'heaps',
    lookalikes: ['sort-search', 'binary-search', 'two-pointers'],
    tell: 'Selecting the k-th smallest from a large unsorted set → a bounded heap of size k yields the answer in O(n log k), avoiding a full O(n log n) sort.',
  },
]

export default stems
