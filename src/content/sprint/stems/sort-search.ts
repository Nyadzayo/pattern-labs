import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'sort-search-01',
    text: 'A photo gallery stores shots by capture time. Group together any pictures taken at the same exact second so duplicates and bursts sit side by side, then list the groups in chronological order.',
    pattern: 'sort-search',
    lookalikes: ['hash-maps-sets', 'two-pointers', 'intervals'],
    tell: 'Bringing equal keys adjacent AND requiring chronological output → order the records first; a hash bucket would group them but lose the ordering the answer needs.',
  },
  {
    id: 'sort-search-02',
    text: 'Each runner finishes a race with a chip time. Report the three fastest finishers without ranking everyone else, on a one-time result feed.',
    pattern: 'sort-search',
    lookalikes: ['heaps', 'binary-search', 'two-pointers'],
    tell: 'Picking the top few from a single static batch → one sort then slice; a heap only earns its keep on a stream or when k is tiny relative to a huge live feed.',
  },
  {
    id: 'sort-search-03',
    text: 'An inventory sheet lists products with a price and a release date. Produce a view ordered by price, breaking ties by the newer release first, for a printable catalog.',
    pattern: 'sort-search',
    lookalikes: ['greedy', 'heaps', 'prefix-sums'],
    tell: 'A multi-key ordering with an explicit tie-breaker rule → a custom comparator over the whole set, not a per-step locally-optimal pick.',
  },
  {
    id: 'sort-search-04',
    text: 'You receive a jumbled pile of meeting cards, each showing only a start hour. Arrange them so the schedule reads earliest to latest before anyone tries to spot overlaps.',
    pattern: 'sort-search',
    lookalikes: ['intervals', 'two-pointers', 'greedy'],
    tell: 'The deliverable is the ordered arrangement itself, ending before any overlap logic begins → this is the sort step, not the interval sweep that would consume it.',
  },
  {
    id: 'sort-search-05',
    text: 'A leaderboard arrives with scores in no particular order. You must answer many later questions of the form "is exactly this score present?" against that fixed list, and want each lookup to stay fast.',
    pattern: 'sort-search',
    lookalikes: ['binary-search', 'hash-maps-sets', 'two-pointers'],
    tell: 'Many membership queries against an unordered but unchanging list → the up-front move is to sort once so each later check can probe; binary-search is the probe, not the preparation.',
  },
]

export default stems
