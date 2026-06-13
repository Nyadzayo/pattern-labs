import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'intervals-01',
    text: 'A shared lab has dozens of equipment bookings, each with a start and end time. Merge every chain of bookings that touch or overlap into single uninterrupted blocks so the cleaning crew sees the real busy stretches.',
    pattern: 'intervals',
    lookalikes: ['sort-search', 'sliding-windows', 'greedy'],
    tell: 'Each item is a [start, end] range and overlapping ranges must be fused → sort by start, then sweep merging when the next start falls inside the running end.',
  },
  {
    id: 'intervals-02',
    text: 'A conference venue receives a list of talk requests with begin and finish times. Find the minimum number of rooms required so no two talks share a room at the same moment.',
    pattern: 'intervals',
    lookalikes: ['heaps', 'greedy', 'sort-search'],
    tell: 'Peak count of simultaneously active ranges → track range endpoints in time order; the maximum concurrent overlap is the answer, not a single greedy pick.',
  },
  {
    id: 'intervals-03',
    text: 'A calendar already holds a set of busy time spans kept in chronological order. A new meeting span arrives; splice it in, fusing it with any spans it touches, and return the tidy list.',
    pattern: 'intervals',
    lookalikes: ['two-pointers', 'binary-search', 'linked-lists'],
    tell: 'Inserting one [start, end] into an ordered list of ranges and coalescing the overlaps → an interval-insert sweep, not a value lookup or a pointer scan over scalars.',
  },
  {
    id: 'intervals-04',
    text: 'Two streaming services each publish their downtime windows as sorted, non-overlapping time ranges. Report only the periods when both services were down at the very same time.',
    pattern: 'intervals',
    lookalikes: ['two-pointers', 'sliding-windows', 'hash-maps-sets'],
    tell: 'Intersecting two sorted lists of ranges by comparing the later start against the earlier end → an interval-overlap test, even though two cursors advance through the lists.',
  },
  {
    id: 'intervals-05',
    text: 'A logistics planner has a pile of delivery slots, each a span from pickup time to drop-off time. Keep the largest set of slots a single driver can complete with no span clashing against another.',
    pattern: 'intervals',
    lookalikes: ['greedy', 'dynamic-programming', 'sort-search'],
    tell: 'Maximize how many [start, end] spans fit without overlap → sort by finish time and keep each span whose start clears the last kept finish; overlap geometry drives the choice.',
  },
]

export default stems
