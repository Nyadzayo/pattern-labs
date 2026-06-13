import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'linked-lists-01',
    text: 'A train of carriages is coupled head-to-tail, each car only knowing the one behind it. Re-couple them so the caboose becomes the engine and the whole train faces the opposite way, without uncoupling anything onto the platform.',
    pattern: 'linked-lists',
    lookalikes: ['two-pointers', 'stacks', 'fast-slow-pointers'],
    tell: 'Each element only points forward and you must flip those forward links in place → walk the chain rewiring prev/next, not index pointers and not an auxiliary stack.',
  },
  {
    id: 'linked-lists-02',
    text: 'Two append-only event logs share a common suffix once a merge happened, but each entry stores only a reference to the next entry. Find the exact entry where the two histories first become the same shared record.',
    pattern: 'linked-lists',
    lookalikes: ['hash-maps-sets', 'two-pointers', 'fast-slow-pointers'],
    tell: 'Y-shaped chains of next-references converging → advance one runner per list and switch each to the other head so they meet at the join; no cycle, so no fast/slow.',
  },
  {
    id: 'linked-lists-03',
    text: 'A playlist is a sequence of song nodes, each holding the address of the song that follows. A listener wants to drop the song sitting a fixed number of slots before the very last one, in a single forward sweep.',
    pattern: 'linked-lists',
    lookalikes: ['fast-slow-pointers', 'two-pointers', 'sliding-windows'],
    tell: 'Reaching a position counted from the end of a next-pointer chain in one pass → keep two node references a fixed gap apart and splice, rather than a window over array indices.',
  },
  {
    id: 'linked-lists-04',
    text: 'Browser tabs are stitched together so each tab points to its successor. Rearrange the stitching so that all tabs opened from work sites come before all tabs opened from personal sites, while keeping each group in its original opening order and reusing the same tab objects.',
    pattern: 'linked-lists',
    lookalikes: ['two-pointers', 'sort-search', 'stacks'],
    tell: 'Partitioning a next-reference chain into two stable groups by relinking nodes (not by swapping values or comparing keys) → build two sublists and join their tails.',
  },
  {
    id: 'linked-lists-05',
    text: 'A set of ordered ticket queues is given, each queue a forward-linked run of priority numbers already in ascending order. Weave every queue into one combined ascending run by re-pointing the existing ticket nodes, never allocating fresh tickets.',
    pattern: 'linked-lists',
    lookalikes: ['heaps', 'two-pointers', 'sort-search'],
    tell: 'Splicing several already-sorted next-pointer runs into one chain by rewiring nodes → thread a result list pulling the smaller head each step, an in-place merge rather than a key-based sort.',
  },
]

export default stems
