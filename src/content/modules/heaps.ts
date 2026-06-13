import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'heaps',
  visualizer: 'heap',
  concept: `
## The mental model

Imagine a paperwork tray with one magic property: the most urgent sheet is always on top. Not the second-most urgent — you have no idea where that one is. The pile underneath is loosely organized chaos. But the moment you lift the top sheet off, the tray shuffles briefly and the *new* most urgent sheet surfaces. That's a heap: a structure that pays for one cheap promise — **instant access to the extreme element** — by refusing to promise anything else.

This is the key economic insight. A fully sorted collection answers every order question but charges you for ordering information you'll never use. A heap maintains just enough order to answer "what's the min (or max) right now?" and re-establishes that single guarantee in \`O(log n)\` after any insert or removal. When your access pattern is "repeatedly grab the extreme while things keep arriving," that thin guarantee is all you need — and it's dramatically cheaper.

## Mechanics

A binary heap is a complete binary tree flattened into a plain array. The node at index \`i\` has children at \`2i + 1\` and \`2i + 2\`, and its parent at \`(i - 1) // 2\` — no pointers, no node objects, just index arithmetic. The **heap property** for a min-heap says every parent is ≤ its children. That's it. Siblings can be in any order; the array is *not* sorted; the only element with a known global rank is the root at index 0.

Two repair moves keep the property alive. **Sift up**: append a new element at the end, then swap it with its parent while it's smaller — at most \`O(log n)\` hops up the tree. **Sift down**: to pop the root, move the last element into slot 0, then swap it with its smaller child until it settles — again \`O(log n)\`. Bonus move: building a heap from \`n\` existing items by sifting down from the middle outward (\`heapify\`) costs only \`O(n)\`, not \`O(n log n)\` — most nodes are leaves and barely move.

Python's \`heapq\` operates on a plain list as a **min-heap**. Need a max-heap? Negate the keys on the way in and negate again on the way out. (Python 3.14 finally added public max-heap functions — \`heapq.heapify_max\`, \`heappush_max\`, \`heappop_max\` — but negation remains the version-portable idiom you should reach for in interviews.) The single most useful heap idiom in interviews is the **bounded heap of size k**:

\`\`\`python
import heapq

def k_largest(stream, k):
    heap = []                          # min-heap of the k largest so far
    for x in stream:
        if len(heap) < k:
            heapq.heappush(heap, x)    # still filling up
        elif x > heap[0]:
            heapq.heapreplace(heap, x) # beats the weakest keeper: evict it
    return sorted(heap, reverse=True)  # heap itself is NOT sorted
\`\`\`

Read that invariant twice, because it's counterintuitive: to track the k **largest** items you keep a **min**-heap. The root is the weakest of your elite k — exactly the element a newcomer must beat, and exactly the one to evict when beaten. The heap never grows past k, so every operation is \`O(log k)\`, not \`O(log n)\`.

Two more load-bearing idioms: **k-way merge** (seed a heap with the head of each sorted source; pop the min, push that source's next element — the heap only ever holds k candidates) and **two heaps** (a max-heap for the lower half of the data facing a min-heap for the upper half, rebalanced so their sizes differ by at most one — the median lives at the tops).

## When to reach for it

- The problem says **"k largest / k smallest / k closest / top-k / k most frequent."** Bounded heap of size k, almost always.
- You need the **min or max repeatedly while the collection mutates** — schedulers, simulations, "process the cheapest/earliest next."
- You're **merging multiple already-sorted sources** into one ordered output.
- A statistic must stay current **as items stream in** — running median is the classic two-heaps setup.
- Anything phrased as **priority**: deadlines, costs, distances (Dijkstra's frontier is a heap).

Anti-signals: if you need the *entire* output sorted once and the data fits in memory, just sort — simpler and the same \`O(n log n)\`. If you must look up or delete *arbitrary* elements by identity, a bare heap can't find them; pair it with a hash map or use lazy deletion.

## Complexity

Peek at the extreme: \`O(1)\`. Push or pop: \`O(log n)\`. Build from n items via heapify: \`O(n)\`. Top-k over a stream of n items: \`O(n log k)\` time with \`O(k)\` space — for n in the millions and k in the tens, that's the difference between a blink and a stall. Merging k sorted lists totaling N elements: \`O(N log k)\`. Running median: \`O(log n)\` per insert, \`O(1)\` per read.

## Common pitfalls

- **Treating the heap list as sorted.** Only index 0 is guaranteed. Iterating the backing list yields near-random order; pop repeatedly or sort if you need order.
- **Forgetting \`heapq\` is min-only.** For max behavior, negate keys — and remember to un-negate on the way out.
- **Direction confusion in top-k.** k largest → min-heap; k smallest → max-heap. Reversing this silently keeps the wrong elements.
- **Tuple comparison blowups.** When priorities tie, Python compares the next tuple field. If that field isn't comparable (say, a dict), \`heappush\` raises \`TypeError\`. Insert a unique tiebreaker — an index or counter — between priority and payload.
- **Mutating priorities in place.** Changing an element's key inside the heap breaks the invariant invisibly. Push a fresh entry and lazily discard stale ones at pop time.
- **Pushing n items one by one when \`heapify\` would do.** That's \`O(n log n)\` versus \`O(n)\` for the same result.
`,
  realWorldUses: [
    {
      title: 'Timer queues in event loops',
      description:
        "Node.js's libuv keeps every pending timer in a binary heap keyed by expiry time. Each loop iteration peeks the root to compute how long it may sleep in the OS poll call, and pops expired timers off the top — millions of setTimeout calls ride on one heap.",
    },
    {
      title: 'K-way merge in external sorting',
      description:
        'When a database sorts data too large for RAM (index builds, ORDER BY spills), it sorts chunks into runs on disk, then merges the runs by holding only the current head of each run in a min-heap — emitting the global minimum repeatedly until every run is drained.',
    },
    {
      title: "Dijkstra's frontier in route planning",
      description:
        'Navigation and network-routing backends expand the cheapest unsettled node next. The frontier of candidate nodes lives in a priority queue — a heap keyed by tentative distance — popped and re-pushed millions of times per query.',
    },
  ],
  problems: [
    {
      id: 'leaderboard-cutoff',
      title: 'Leaderboard Cutoff',
      difficulty: 'easy',
      statement: `
A climbing gym runs a season-long competition. Scores arrive one at a time as climbers log their attempts, and a screen above the wall shows the **score to beat**: the k-th highest score posted so far, counting repeats (that is, the k-th entry of all scores so far sorted in descending order).

Given the list \`scores\` in arrival order and an integer \`k\`, return a list the same length as \`scores\` where entry \`i\` is the k-th highest score after the first \`i + 1\` scores have been posted. While fewer than \`k\` scores exist, the screen shows \`-1\`.

The season is long — recomputing from scratch after every attempt is too slow.
`,
      examples: [
        {
          input: 'scores = [40, 60, 50, 30, 70], k = 2',
          output: '[-1, 40, 50, 50, 60]',
          explanation:
            'After [40]: fewer than 2 scores, show -1. After [40, 60]: 2nd highest is 40. After 50 arrives: descending order is 60, 50, 40 so the 2nd is 50. 30 changes nothing. After 70: descending is 70, 60, 50, 40, 30 — the 2nd is 60.',
        },
        {
          input: 'scores = [5, 5, 5], k = 1',
          output: '[5, 5, 5]',
          explanation: 'The highest score is 5 at every step; duplicates are counted.',
        },
        {
          input: 'scores = [10, 20], k = 3',
          output: '[-1, -1]',
          explanation: 'Never enough scores to fill 3 places, so the screen shows -1 throughout.',
        },
      ],
      constraints: [
        '0 <= len(scores) <= 100_000',
        '0 <= scores[i] <= 10^9',
        '1 <= k <= 100_000',
        'Repeated scores each count toward the ranking',
      ],
      hints: [
        'The screen only ever shows one number. Most scores that arrive will never influence it again — which ones can you afford to forget entirely the moment they arrive?',
        'Keep only the k highest scores seen so far, in a structure that can instantly reveal the smallest member of that elite group. The smallest of the k highest IS the cutoff.',
        'Maintain a min-heap capped at size k: heappush while under k items; once full, heapreplace only when a new score beats heap[0]. After each score, append heap[0] if the heap holds k items, else -1.',
      ],
      functionName: 'leaderboard_cutoff',
      starterCode: `def leaderboard_cutoff(scores: list[int], k: int) -> list[int]:
    pass
`,
      solution: {
        code: `import heapq

def leaderboard_cutoff(scores: list[int], k: int) -> list[int]:
    heap = []     # min-heap holding the k highest scores seen so far
    display = []  # what the screen shows after each arrival
    for s in scores:
        if len(heap) < k:
            # Still filling the top-k: every score is provisionally elite.
            heapq.heappush(heap, s)
        elif s > heap[0]:
            # Newcomer beats the weakest of the elite: evict and admit
            # in one O(log k) operation.
            heapq.heapreplace(heap, s)
        # If s <= heap[0], it can never crack the top k from here on
        # (the cutoff only rises), so we drop it without storing it.
        # heap[0] is the smallest of the k highest = the k-th highest.
        display.append(heap[0] if len(heap) == k else -1)
    return display
`,
        commentary: `
The trap is keeping everything. A sorted list re-sorted per arrival costs \`O(n log n)\` each time; even a binary-insert into a sorted array pays \`O(n)\` to shift elements. But the screen never asks about anything except the boundary of the top k — so the other \`n - k\` scores are dead weight.

A **min-heap capped at size k** stores exactly the elite group, and its root is the group's weakest member — which is simultaneously the answer (the k-th highest overall) and the admission bar (what a newcomer must beat). When a better score arrives, \`heapreplace\` evicts the root and admits the newcomer in one sift. When a score fails the bar, we discard it instantly and *correctly*: the cutoff is monotonically non-decreasing, so a score that can't make the top k now never will.

Note the comparison is strict (\`s > heap[0]\`): a score equal to the cutoff leaves the displayed value unchanged either way, so skipping the replace saves work without changing any answer. The \`-1\` warm-up phase falls out of the same code path — the heap simply hasn't reached size k yet.
`,
        complexity: 'Time O(n log k), Space O(k)',
      },
      testCases: [
        { input: [[40, 60, 50, 30, 70], 2], expected: [-1, 40, 50, 50, 60], label: 'worked example' },
        { input: [[5, 5, 5], 1], expected: [5, 5, 5], label: 'all-equal stream, k = 1' },
        { input: [[10, 20], 3], expected: [-1, -1], label: 'never enough scores' },
        { input: [[42], 1], expected: [42], label: 'single score' },
        { input: [[7, 7, 7, 7], 2], expected: [-1, 7, 7, 7], hidden: true, label: 'duplicates fill the board' },
        { input: [[1, 2, 3, 4], 1], expected: [1, 2, 3, 4], hidden: true, label: 'rising scores, k = 1' },
        { input: [[100, 90, 80, 70], 3], expected: [-1, -1, 80, 80], hidden: true, label: 'falling scores' },
        {
          input: [[1000000000, 999999999, 1000000000], 2],
          expected: [-1, 999999999, 1000000000],
          hidden: true,
          label: 'extreme values with a repeat',
        },
        { input: [[], 2], expected: [], hidden: true, label: 'empty season' },
      ],
      furtherPractice: [
        { name: 'Kth Largest Element in a Stream', note: 'the same bounded min-heap, wrapped in a class' },
        { name: 'Last Stone Weight', note: 'max-heap simulation — negate everything' },
      ],
    },
    {
      id: 'drone-dispatch',
      title: 'Nearest Drones to the Depot',
      difficulty: 'medium',
      statement: `
A delivery company has idle drones parked across the city, each at integer coordinates \`[x, y]\`. A rush order lands at the depot, located at \`depot = [dx, dy]\`, and dispatch needs the \`k\` drones closest to it by **squared Euclidean distance** \`(x - dx)^2 + (y - dy)^2\` (no square roots — fleet firmware avoids floats).

Return those \`k\` drones as a list of \`[x, y]\` pairs, **sorted by squared distance ascending; ties broken by smaller \`x\`, then smaller \`y\`**. The same tie-break also decides *which* drones are selected when several sit at equal distance around the cut.

The fleet is large and \`k\` is small — dispatch cannot afford to rank every drone.
`,
      examples: [
        {
          input: 'drones = [[1, 2], [3, 4], [-1, 0]], depot = [0, 0], k = 2',
          output: '[[-1, 0], [1, 2]]',
          explanation:
            'Squared distances: [1,2] → 5, [3,4] → 25, [-1,0] → 1. The two closest are [-1,0] (1) then [1,2] (5).',
        },
        {
          input: 'drones = [[2, 0], [0, 2], [-2, 0]], depot = [0, 0], k = 2',
          output: '[[-2, 0], [0, 2]]',
          explanation:
            'All three sit at squared distance 4. The tie-break (smaller x, then smaller y) selects and orders [-2,0] before [0,2]; [2,0] misses the cut.',
        },
        {
          input: 'drones = [[5, 5], [1, 1]], depot = [1, 1], k = 2',
          output: '[[1, 1], [5, 5]]',
          explanation: 'k equals the fleet size, so everyone is selected — still in distance order.',
        },
      ],
      constraints: [
        '1 <= k <= len(drones) <= 100_000',
        '-10^4 <= x, y, dx, dy <= 10^4',
        'Distances are compared as squared values — no floating point',
        'Output must be sorted by (squared distance, x, y) ascending',
      ],
      hints: [
        'Dispatch never asks "what is the full ranking?" — only k drones matter. What does that suggest about how much of the fleet you actually need to remember at any moment?',
        'Keep a bounded pool of the k best candidates so far, organized so the WORST of them is instantly visible — that is the one a new drone must beat to get in.',
        'heapq is a min-heap but you need to evict the farthest keeper, so store negated keys (-dist, -x, -y). While under k items, push; otherwise heapreplace when the new negated key beats heap[0]. Un-negate the survivors and sort by (dist, x, y) at the end.',
      ],
      functionName: 'nearest_drones',
      starterCode: `def nearest_drones(drones: list[list[int]], depot: list[int], k: int) -> list[list[int]]:
    pass
`,
      solution: {
        code: `import heapq

def nearest_drones(drones: list[list[int]], depot: list[int], k: int) -> list[list[int]]:
    dx, dy = depot
    # Each drone is ranked by the key (dist, x, y). We keep the k SMALLEST
    # keys, so we need fast access to the LARGEST kept key — a max-heap.
    # heapq is min-only, so we store the key fully negated: the heap's
    # min root is then our worst keeper.
    heap = []
    for x, y in drones:
        d = (x - dx) ** 2 + (y - dy) ** 2
        item = (-d, -x, -y)  # negating every field reverses the tuple order
        if len(heap) < k:
            heapq.heappush(heap, item)
        elif item > heap[0]:
            # Larger negated key == smaller original key: the new drone
            # ranks strictly better than the current worst keeper.
            heapq.heapreplace(heap, item)
    # Un-negate the survivors and sort by the original (dist, x, y) key
    # so the output order is fully deterministic.
    kept = sorted((-nd, -nx, -ny) for nd, nx, ny in heap)
    return [[x, y] for _d, x, y in kept]
`,
        commentary: `
Sorting the whole fleet works but pays \`O(n log n)\` to rank drones that were never in contention. The bounded-heap idiom keeps the cost proportional to what dispatch actually asked for: \`O(n log k)\`.

The subtlety here is **direction**. We want the k *smallest* distance keys, so the element we repeatedly inspect and evict is the *largest* key in our pool — a max-heap job. \`heapq\` only speaks min-heap, so we negate. And because the ranking key is the full tuple \`(dist, x, y)\` — distance first, tie-broken by coordinates — we negate *every* component: for numeric tuples, \`key_a < key_b\` exactly when \`(-a0, -a1, -a2) > (-b0, -b1, -b2)\`. That single trick makes the eviction decision honor the same tie-break the output requires, so the selected set is deterministic even when several drones ring the depot at equal distance.

The final \`sorted(...)\` over k survivors costs \`O(k log k)\` — negligible — and converts the heap's loose internal order into the contractual output order. Returning the heap as-is would be a bug: heaps are not sorted.
`,
        complexity: 'Time O(n log k), Space O(k)',
      },
      testCases: [
        { input: [[[1, 2], [3, 4], [-1, 0]], [0, 0], 2], expected: [[-1, 0], [1, 2]], label: 'basic selection' },
        { input: [[[2, 0], [0, 2], [-2, 0]], [0, 0], 2], expected: [[-2, 0], [0, 2]], label: 'three-way distance tie' },
        { input: [[[5, 5], [1, 1]], [1, 1], 2], expected: [[1, 1], [5, 5]], label: 'k equals fleet size' },
        { input: [[[3, -7]], [0, 0], 1], expected: [[3, -7]], hidden: true, label: 'single drone' },
        { input: [[[2, 2], [2, 2], [2, 2]], [0, 0], 2], expected: [[2, 2], [2, 2]], hidden: true, label: 'identical positions' },
        {
          input: [[[-5, -5], [-6, -5], [0, 0], [10, 10]], [-5, -4], 3],
          expected: [[-5, -5], [-6, -5], [0, 0]],
          hidden: true,
          label: 'off-origin depot, negative coordinates',
        },
        { input: [[[1, 3], [1, -3], [4, 0]], [0, 0], 1], expected: [[1, -3]], hidden: true, label: 'tie on distance and x — y decides' },
        {
          input: [[[10000, 10000], [-10000, -10000], [0, 1]], [0, 0], 2],
          expected: [[0, 1], [-10000, -10000]],
          hidden: true,
          label: 'extreme coordinates with a far tie',
        },
      ],
      furtherPractice: [
        { name: 'K Closest Points to Origin', note: 'same shape without the tie-break ceremony' },
        { name: 'Top K Frequent Elements', note: 'bounded heap keyed on counts instead of distance' },
      ],
    },
    {
      id: 'log-stream-merge',
      title: 'Unified Log Timeline',
      difficulty: 'medium',
      statement: `
An incident review needs one combined timeline from \`k\` application servers. Each server hands over its log as a list of integer timestamps, **already sorted in non-decreasing order** — but the servers' lists interleave in time.

Given \`streams\`, a list of \`k\` such sorted lists, return a single list containing every timestamp from every stream, sorted in non-decreasing order.

Some servers were idle and produced empty lists; the whole input may even be empty. The total number of entries \`N\` can be large while \`k\` stays small, so your merge should exploit the fact that each stream is already sorted rather than treating the data as one unsorted blob.
`,
      examples: [
        {
          input: 'streams = [[1, 4, 7], [2, 5], [3, 6, 9]]',
          output: '[1, 2, 3, 4, 5, 6, 7, 9]',
          explanation: 'The three sorted streams interleave into one sorted timeline.',
        },
        {
          input: 'streams = [[], [5], []]',
          output: '[5]',
          explanation: 'Idle servers contribute nothing; the lone entry survives.',
        },
        {
          input: 'streams = [[2, 2], [2]]',
          output: '[2, 2, 2]',
          explanation: 'Equal timestamps from different servers all appear in the output.',
        },
      ],
      constraints: [
        '0 <= len(streams) <= 10_000',
        '0 <= total entries N <= 200_000',
        '-10^9 <= timestamp <= 10^9',
        'Each individual stream is sorted in non-decreasing order',
      ],
      hints: [
        'At any moment during the merge, which entries could possibly be the very next item of the combined timeline? It is a far smaller set than "everything remaining."',
        'Only the current head of each stream is a candidate. You need a structure that repeatedly hands you the smallest of up to k candidates and accepts one replacement — over and over, N times.',
        'Seed a heapq with (first_value, stream_index, 0) for every non-empty stream. Loop: pop the minimum, append its value, and if that stream has a next entry, push (next_value, stream_index, pos + 1). The stream index doubles as a tiebreaker.',
      ],
      functionName: 'merge_timelines',
      starterCode: `def merge_timelines(streams: list[list[int]]) -> list[int]:
    pass
`,
      solution: {
        code: `import heapq

def merge_timelines(streams: list[list[int]]) -> list[int]:
    # Seed the heap with the head of every non-empty stream.
    # Entries are (value, stream_index, position): the stream index acts
    # as a tiebreaker on equal timestamps, so comparison never reaches
    # the third field and the pop order is fully determined.
    heap = [(stream[0], i, 0) for i, stream in enumerate(streams) if stream]
    heapq.heapify(heap)  # O(k) — cheaper than k individual pushes

    merged = []
    while heap:
        value, i, pos = heapq.heappop(heap)  # global minimum of all heads
        merged.append(value)
        nxt = pos + 1
        if nxt < len(streams[i]):
            # Refill: the stream that just lost its head offers its next entry.
            heapq.heappush(heap, (streams[i][nxt], i, nxt))
    return merged
`,
        commentary: `
The lazy answer — concatenate everything and sort — is \`O(N log N)\` and throws away the gift in the problem: each stream is *already* sorted. The next element of the merged timeline must be the smallest **current head** among the streams; nothing deeper in any stream can jump the queue, because everything behind a head is ≥ that head.

So the live decision set has at most k members at all times. A min-heap over the heads answers "which head is smallest?" in \`O(log k)\` per pop, and each pop is followed by at most one push (the donor stream's next entry). Every one of the N entries is pushed once and popped once: \`O(N log k)\` total. With k = 50 and N in the millions, \`log k\` is ~6 versus \`log N\` ~20 — and crucially, the heap holds only k entries, which is why this exact pattern powers external sorting, where the streams are files too large for memory.

The \`(value, stream_index, position)\` tuple shape is defensive engineering: on timestamp ties Python compares the second field, and stream indices are unique, so comparison never touches the third field. If the payload were something non-comparable (a dict of log fields), that tiebreaker would be the difference between working code and a \`TypeError\` mid-merge.
`,
        complexity: 'Time O(N log k), Space O(k) beyond the output',
      },
      testCases: [
        { input: [[[1, 4, 7], [2, 5], [3, 6, 9]]], expected: [1, 2, 3, 4, 5, 6, 7, 9], label: 'three interleaved streams' },
        { input: [[[], [5], []]], expected: [5], label: 'idle servers' },
        { input: [[[2, 2], [2]]], expected: [2, 2, 2], label: 'all-equal timestamps' },
        { input: [[[1, 3, 5], [1, 3, 5], [2, 2]]], expected: [1, 1, 2, 2, 3, 3, 5, 5], label: 'duplicates across streams' },
        { input: [[[]]], expected: [], hidden: true, label: 'one empty stream' },
        { input: [[]], expected: [], hidden: true, label: 'no streams at all' },
        { input: [[[-10, -1, 3], [-5, 0]]], expected: [-10, -5, -1, 0, 3], hidden: true, label: 'negative timestamps' },
        { input: [[[1, 2, 3]]], expected: [1, 2, 3], hidden: true, label: 'single stream passes through' },
        { input: [[[9], [1], [5], [3], [7]]], expected: [1, 3, 5, 7, 9], hidden: true, label: 'many single-entry streams' },
      ],
      furtherPractice: [
        { name: 'Merge k Sorted Lists', note: 'identical idea over linked lists' },
        { name: 'Smallest Range Covering Elements from K Lists', note: 'heads-in-a-heap, plus a max tracker' },
      ],
    },
    {
      id: 'latency-median',
      title: 'Streaming Latency Median',
      difficulty: 'hard',
      statement: `
An API gateway records the latency of every request, in whole milliseconds, as it completes. The on-call dashboard shows the **median latency over all requests so far**, refreshed after every single request — averages hide outliers, and the team wants the true middle.

Given \`latencies\` in arrival order, return a list of the same length where entry \`i\` is the median of the first \`i + 1\` latencies:

- when the count is **odd**, the median is the middle value;
- when the count is **even**, the median is the **average of the two middle values, as a float** (e.g. \`3.5\`).

Traffic is heavy: re-sorting after each request will not keep up. Aim for \`O(log n)\` work per arrival.
`,
      examples: [
        {
          input: 'latencies = [3, 1, 4]',
          output: '[3, 2.0, 3]',
          explanation:
            'After [3]: median 3. After [3, 1]: the two middle values are 1 and 3, average 2.0. After [3, 1, 4]: sorted order is [1, 3, 4], middle value 3.',
        },
        {
          input: 'latencies = [5, 2]',
          output: '[5, 3.5]',
          explanation: 'After the second request the median is (2 + 5) / 2 = 3.5.',
        },
        {
          input: 'latencies = [10, 10, 10, 10]',
          output: '[10, 10.0, 10, 10.0]',
          explanation: 'All-equal traffic: the median never moves, alternating between the value and its trivial average.',
        },
      ],
      constraints: [
        '0 <= len(latencies) <= 100_000',
        '-10^9 <= latencies[i] <= 10^9',
        'Even-count medians must be the exact average of the two middle values',
        'Target O(log n) time per arriving request',
      ],
      hints: [
        'Re-sorting after every arrival repeats almost all of its own work. Ask: when one new number arrives, how far can the median actually move within the sorted order?',
        'Split the numbers into a lower half and an upper half of (nearly) equal size. If you can always read the LARGEST of the lower half and the SMALLEST of the upper half instantly, every median is at your fingertips.',
        'Two heaps: a max-heap (negated values in heapq) for the lower half, a min-heap for the upper half. Push each arrival into the correct half by comparing with the lower half\'s top, then rebalance so low holds the same count as high or exactly one more. Odd count → top of low; even → average of both tops.',
      ],
      functionName: 'streaming_medians',
      starterCode: `def streaming_medians(latencies: list[int]) -> list[float]:
    pass
`,
      solution: {
        code: `import heapq

def streaming_medians(latencies: list[int]) -> list[float]:
    low = []    # MAX-heap (values negated): the lower half of all latencies
    high = []   # MIN-heap: the upper half
    medians = []
    for x in latencies:
        # 1) Route the arrival into the correct half. Everything in low
        #    must be <= everything in high, so compare against low's top.
        if not low or x <= -low[0]:
            heapq.heappush(low, -x)
        else:
            heapq.heappush(high, x)

        # 2) Rebalance. Invariant: len(low) == len(high) or len(low) ==
        #    len(high) + 1. One push can break it by at most one element,
        #    so at most one transfer restores it.
        if len(low) > len(high) + 1:
            heapq.heappush(high, -heapq.heappop(low))   # low overgrew
        elif len(high) > len(low):
            heapq.heappush(low, -heapq.heappop(high))   # high overgrew

        # 3) The median sits at the frontier between the halves.
        if len(low) > len(high):
            medians.append(float(-low[0]))              # odd count: low's top
        else:
            medians.append((-low[0] + high[0]) / 2)     # even: average of tops
    return medians
`,
        commentary: `
The median is an *order statistic*, and the standard tools each fail the streaming test: re-sorting is \`O(n log n)\` per arrival; a sorted array with binary-insert finds the slot in \`O(log n)\` but pays \`O(n)\` to shift elements; a single heap surfaces one extreme, and the median is the opposite of an extreme — it is the middle.

The two-heaps trick reframes the middle as **two extremes facing each other**. Cut the sorted order in half: the lower half only ever needs to reveal its *maximum*, the upper half its *minimum* — exactly what heaps do in \`O(1)\`. The frontier between them IS the median: with an odd count the extra element (kept in \`low\` by convention) is the median outright; with an even count the median is the average of the two tops.

Each arrival does three constant-shape steps. **Route**: compare against \`low\`'s top to keep the ordering invariant (every element of low ≤ every element of high). **Rebalance**: one push can tilt the size balance by at most one, so at most one element migrates across the frontier — \`O(log n)\`. **Read**: peek one or two roots, \`O(1)\`. The result is \`O(log n)\` per request with no shifting, no re-sorting, and the dashboard never lags.

One detail worth internalizing: pushing the arrival into a half and *then* rebalancing is what keeps both invariants (ordering and size) simultaneously true — trying to choose the destination by sizes alone, without comparing values, is the classic way this solution goes subtly wrong.
`,
        complexity: 'Time O(n log n) total — O(log n) per arrival, Space O(n)',
      },
      testCases: [
        { input: [[3, 1, 4]], expected: [3, 2.0, 3], label: 'worked example' },
        { input: [[5, 2]], expected: [5, 3.5], label: 'fractional median' },
        { input: [[10, 10, 10, 10]], expected: [10, 10.0, 10, 10.0], label: 'all-equal traffic' },
        { input: [[2, 2, 3, 3, 1]], expected: [2, 2.0, 2, 2.5, 2], label: 'duplicates around the frontier' },
        { input: [[]], expected: [], hidden: true, label: 'no requests' },
        { input: [[7]], expected: [7], hidden: true, label: 'single request' },
        { input: [[1, 2, 3, 4, 5, 6]], expected: [1, 1.5, 2, 2.5, 3, 3.5], hidden: true, label: 'strictly increasing' },
        { input: [[9, 7, 5, 3, 1]], expected: [9, 8.0, 7, 6.0, 5], hidden: true, label: 'strictly decreasing' },
        { input: [[1000000000, -1000000000]], expected: [1000000000, 0.0], hidden: true, label: 'extreme spread' },
      ],
      furtherPractice: [
        { name: 'Find Median from Data Stream', note: 'the classic class-based formulation' },
        { name: 'Sliding Window Median', note: 'same two heaps plus lazy deletion — a real step up' },
        { name: 'IPO', note: 'two heaps used as a hand-off pipeline instead of halves' },
      ],
    },
    {
      id: 'chain-welding',
      title: 'Cheapest Chain Assembly',
      difficulty: 'easy',
      statement: `
A metal workshop has a pile of chain segments that must be welded into one continuous chain. Welding two pieces together takes minutes equal to the **combined length of the two pieces** (the whole joined piece has to be heated through), and the result is a single new piece of that combined length, which goes back in the pile.

Given \`segments\`, a list of segment lengths, return the **minimum total minutes** of welding needed to end up with a single chain. With one segment — or none — no welding is needed and the answer is \`0\`.

The order of welds is entirely up to you, and it matters: a careless order can reheat the longest pieces over and over.
`,
      examples: [
        {
          input: 'segments = [4, 3, 2, 6]',
          output: '29',
          explanation:
            'Weld 2 + 3 = 5 (5 minutes), then 4 + 5 = 9 (9 minutes), then 6 + 9 = 15 (15 minutes). Total 5 + 9 + 15 = 29. Any order that joins the 6 early costs more.',
        },
        {
          input: 'segments = [1, 2]',
          output: '3',
          explanation: 'One weld, costing the combined length 1 + 2 = 3.',
        },
        {
          input: 'segments = [10]',
          output: '0',
          explanation: 'A single segment is already a complete chain — nothing to weld.',
        },
      ],
      constraints: [
        '0 <= len(segments) <= 100_000',
        '1 <= segments[i] <= 10^6',
        'Each weld joins exactly two pieces and costs their combined length',
      ],
      hints: [
        'Every link in a piece gets reheated each time that piece participates in a weld. Which segments should end up being welded into many times, and which as few times as possible?',
        'The total cost equals each original segment length multiplied by the number of welds its piece passes through. To minimize that, the longest segments must join as late as possible — so at every step, fuse the two currently shortest pieces.',
        'heapify the lengths in O(n). While more than one piece remains: heappop twice, add the sum to a running total, heappush the sum back. Return the total when one piece is left.',
      ],
      functionName: 'min_weld_minutes',
      starterCode: `def min_weld_minutes(segments: list[int]) -> int:
    pass
`,
      solution: {
        code: `import heapq

def min_weld_minutes(segments: list[int]) -> int:
    # Fewer than two pieces: nothing to weld.
    if len(segments) < 2:
        return 0
    heap = list(segments)
    heapq.heapify(heap)  # O(n) — cheaper than n individual pushes
    total = 0
    while len(heap) > 1:
        # Greedy choice: always fuse the two shortest pieces. Whatever we
        # fuse now will be re-paid inside every later weld it joins, so the
        # smallest possible sums should be the ones repeated the most.
        a = heapq.heappop(heap)
        b = heapq.heappop(heap)
        total += a + b
        # The merged piece re-enters the pile as a single candidate.
        heapq.heappush(heap, a + b)
    return total
`,
        commentary: `
The cost structure is the whole problem. Each weld charges the combined length of both pieces, so a segment's length is billed once for *every* weld its piece passes through on the way to the final chain. Welding the longest segment early means its length is re-billed in every subsequent join; deferring it means it is billed once or twice at the end. The optimal schedule therefore pushes big lengths toward the *last* welds — which is exactly what "always fuse the two smallest" achieves. (This is the same exchange argument that makes Huffman coding optimal: any schedule that joins a non-minimal pair early can be improved by swapping in the two smallest.)

The heap is what makes the greedy *executable*. After every weld, the pile changes: two pieces vanish, a new one appears, and we again need the two smallest of the mutated collection. That is the heap's exact contract — \`O(log n)\` pop, pop, push, repeated \`n - 1\` times. A sorted list gets the first pair right and then pays \`O(n)\` per re-insertion; re-sorting every round is \`O(n^2 log n)\` of wasted work.

Note the shape of this facet: unlike top-k problems where the heap is a *filter* that stays small, here the heap holds everything and acts as a *scheduler* — the pattern to recognize is "repeatedly combine the two extremes and feed the result back in."
`,
        complexity: 'Time O(n log n), Space O(n)',
      },
      testCases: [
        { input: [[4, 3, 2, 6]], expected: 29, label: 'worked example' },
        { input: [[1, 2]], expected: 3, label: 'single weld' },
        { input: [[10]], expected: 0, label: 'already one chain' },
        { input: [[]], expected: 0, hidden: true, label: 'empty pile' },
        { input: [[1, 1, 1, 1]], expected: 8, hidden: true, label: 'all-equal segments' },
        { input: [[5, 5, 5]], expected: 25, hidden: true, label: 'three equal pieces' },
        { input: [[1, 100]], expected: 101, hidden: true, label: 'lopsided pair' },
        { input: [[8, 4, 6, 12, 16, 2]], expected: 114, hidden: true, label: 'larger pile' },
      ],
      furtherPractice: [
        { name: 'Minimum Cost to Connect Sticks', note: 'the same greedy, different furniture' },
        { name: 'Last Stone Weight', note: 'pop-two-push-one again, but with a max-heap and subtraction' },
      ],
    },
    {
      id: 'bakery-bestsellers',
      title: 'Bakery Bestsellers',
      difficulty: 'medium',
      statement: `
A bakery's till produces one receipt line per pastry sold. At closing time the owner wants the day's **top \`k\` bestsellers** for tomorrow's chalkboard.

Given \`receipts\`, a list of pastry names in the order they were sold, and an integer \`k\`, return a list of \`k\` names ranked by:

1. **units sold, descending** — more sales ranks higher;
2. on equal sales, **alphabetical order, ascending** — \`"danish"\` beats \`"eclair"\`.

It is guaranteed that at least \`k\` distinct pastries were sold. The chalkboard order must be exact: the tie rule decides both *which* names make the board and *where* they stand on it.
`,
      examples: [
        {
          input: 'receipts = ["scone", "croissant", "scone", "baguette", "croissant", "scone"], k = 2',
          output: '["scone", "croissant"]',
          explanation: 'scone sold 3, croissant 2, baguette 1. The top two by count are scone then croissant.',
        },
        {
          input: 'receipts = ["eclair", "danish", "eclair", "danish", "brioche"], k = 2',
          output: '["danish", "eclair"]',
          explanation:
            'danish and eclair both sold 2 (brioche only 1). The alphabetical tie-break puts danish ahead of eclair.',
        },
        {
          input: 'receipts = ["rye", "rye", "focaccia"], k = 2',
          output: '["rye", "focaccia"]',
          explanation: 'Only two distinct pastries exist, so both make the board, counts ordering them.',
        },
      ],
      constraints: [
        '1 <= len(receipts) <= 100_000',
        '1 <= k <= number of distinct names in receipts',
        'Names are non-empty lowercase strings of length <= 30',
        'Output is ordered by (count descending, name ascending) — exactly',
      ],
      hints: [
        'Counting how many of each pastry sold is the easy half. The interesting half: the ranking has two parts that pull in opposite directions — bigger is better for counts, but earlier is better for names. How do you make one structure respect both at once?',
        'You can negate a number to flip its sort direction, but you cannot negate a string. Build a key where a plain min-heap pop order IS the chalkboard order: store (-count, name), so the smallest tuple is the best seller and alphabetical order breaks ties for free.',
        'collections.Counter the receipts, build [(-count, name)] over the m distinct names, heapify in O(m), then heappop exactly k times, collecting names in pop order.',
      ],
      functionName: 'bestselling_pastries',
      starterCode: `def bestselling_pastries(receipts: list[str], k: int) -> list[str]:
    pass
`,
      solution: {
        code: `import heapq
from collections import Counter

def bestselling_pastries(receipts: list[str], k: int) -> list[str]:
    # Phase 1: collapse n receipt lines into m distinct (name, count) pairs.
    counts = Counter(receipts)

    # Phase 2: rank by (count DESC, name ASC). Counts negate cleanly;
    # strings cannot be negated. Storing (-count, name) makes a single
    # min-heap pop order equal the chalkboard order: smallest -count is
    # the highest count, and on ties Python compares the name ascending —
    # which is exactly the tie-break we were asked for.
    heap = [(-count, name) for name, count in counts.items()]
    heapq.heapify(heap)  # O(m), not O(m log m)

    # Phase 3: pop exactly k times; each pop yields the next-best seller.
    return [heapq.heappop(heap)[1] for _ in range(k)]
`,
        commentary: `
The two-direction ranking is the heart of this problem. With purely numeric keys you can pick either heap direction and negate fields at will — that is how the bounded size-k idiom handles "keep the best k while streaming." But here one tie-break field is a **string**, and strings have no negation. That kills the bounded min-heap-of-keepers approach in its naive form: the root must be the *worst* keeper, which would require count ascending but name *descending* in one tuple — impossible to express without wrapper classes.

So flip the architecture: instead of a small heap of survivors, build a heap over **all m distinct names** keyed \`(-count, name)\` and pop k times. Now the pop order itself is the answer's order — highest count first, alphabetical within ties — and no field ever needed an impossible negation. \`heapify\` builds the structure in \`O(m)\`, and only the k pops cost \`log m\` each, so the total is \`O(n + m + k log m)\`: better than fully sorting the distinct names (\`O(m log m)\`) whenever k is small, which is the whole premise of a top-k chalkboard.

The general lesson: when a composite ranking mixes directions over non-numeric fields, *pop from a full heap in answer order* instead of *maintaining a bounded heap of keepers*. Same data structure, opposite deployment.
`,
        complexity: 'Time O(n + m + k log m) for m distinct names, Space O(m)',
      },
      testCases: [
        {
          input: [['scone', 'croissant', 'scone', 'baguette', 'croissant', 'scone'], 2],
          expected: ['scone', 'croissant'],
          label: 'worked example',
        },
        {
          input: [['eclair', 'danish', 'eclair', 'danish', 'brioche'], 2],
          expected: ['danish', 'eclair'],
          label: 'alphabetical tie-break',
        },
        { input: [['rye', 'rye', 'focaccia'], 2], expected: ['rye', 'focaccia'], label: 'k equals distinct count' },
        { input: [['plum', 'apple', 'pear'], 2], expected: ['apple', 'pear'], hidden: true, label: 'all counts equal' },
        { input: [['bun'], 1], expected: ['bun'], hidden: true, label: 'single receipt' },
        { input: [['bagel', 'almond', 'almond', 'bagel'], 1], expected: ['almond'], hidden: true, label: 'k = 1 decided by tie-break' },
        {
          input: [['muffin', 'muffin', 'muffin', 'zopf', 'zopf', 'arepa', 'arepa', 'quiche'], 3],
          expected: ['muffin', 'arepa', 'zopf'],
          hidden: true,
          label: 'mixed counts with a mid-board tie',
        },
      ],
      furtherPractice: [
        { name: 'Top K Frequent Words', note: 'the identical mixed-direction tie-break' },
        { name: 'Top K Frequent Elements', note: 'numeric-only version — bounded heap works there' },
      ],
    },
    {
      id: 'greenhouse-kth-reading',
      title: 'K-th Driest Bench',
      difficulty: 'medium',
      statement: `
A research greenhouse arranges plant benches in a rectangular grid of moisture sensors. The misting rig sits at the far back-right corner, so moisture rises toward it: in the readings grid, **every row is sorted non-decreasing left to right, and every column is sorted non-decreasing front to back**.

The agronomist waters by dryness priority and wants the **k-th driest reading** in the whole grid — the value at position \`k\` (1-indexed) if all readings were lined up in non-decreasing order. Duplicate readings each count separately.

Given \`grid\` and \`k\`, return that reading. The grid can be large and \`k\` small; lining up all the readings defeats the point of the sensors being pre-sorted.
`,
      examples: [
        {
          input: 'grid = [[2, 4, 7], [3, 5, 8], [6, 9, 10]], k = 4',
          output: '5',
          explanation:
            'All readings in non-decreasing order: 2, 3, 4, 5, 6, 7, 8, 9, 10. The 4th is 5.',
        },
        {
          input: 'grid = [[1, 2], [2, 3]], k = 3',
          output: '2',
          explanation: 'Order with duplicates: 1, 2, 2, 3. The 3rd reading is the second 2.',
        },
        {
          input: 'grid = [[4]], k = 1',
          output: '4',
          explanation: 'A single sensor: its reading is the 1st driest by default.',
        },
      ],
      constraints: [
        '1 <= rows, cols <= 1_000',
        '1 <= k <= rows * cols',
        '0 <= grid[r][c] <= 10^9',
        'Every row and every column is sorted non-decreasing',
      ],
      hints: [
        'The driest reading is obviously the front-left corner. Once you have accounted for it, which cells could possibly be the NEXT driest? The sorted structure rules out almost the entire grid.',
        'Treat each row as an already-sorted stream of readings. The k-th smallest overall is what a merge of those streams would emit on its k-th step — and a merge only ever considers one candidate per row at a time.',
        'Seed a min-heap with (grid[r][0], r, 0) for the first min(k, rows) rows only — row r of the grid cannot contain the k-th smallest if r >= k, because its column predecessors are all <= it. Pop k times; after popping (val, r, c), push (grid[r][c+1], r, c+1) if it exists. The k-th popped value is the answer.',
      ],
      functionName: 'kth_driest_reading',
      starterCode: `def kth_driest_reading(grid: list[list[int]], k: int) -> int:
    pass
`,
      solution: {
        code: `import heapq

def kth_driest_reading(grid: list[list[int]], k: int) -> int:
    rows = len(grid)
    # Seed one candidate per row: its leftmost (smallest) reading.
    # Rows beyond index k - 1 can be skipped entirely: grid[r][0] sits
    # below r column-predecessors that are all <= it, so for r >= k its
    # rank is already past k — as is everything to its right.
    heap = [(grid[r][0], r, 0) for r in range(min(rows, k))]
    heapq.heapify(heap)  # O(min(rows, k))

    val = 0
    for _ in range(k):
        # The smallest un-emitted reading must be some row's current head:
        # everything right of a head is >= that head (rows sorted).
        val, r, c = heapq.heappop(heap)
        if c + 1 < len(grid[r]):
            # The donor row offers its next reading as a new candidate.
            heapq.heappush(heap, (grid[r][c + 1], r, c + 1))
    return val
`,
        commentary: `
Flattening and sorting costs \`O(RC log RC)\` and ignores the gift in the problem: the grid arrives **pre-sorted along both axes**. Row-sortedness alone already makes this a k-way merge — each row is a sorted stream, and the next-smallest reading overall must be one of the current row heads. So a min-heap of at most one candidate per row replays the merge, and we simply **stop after k pops** instead of draining everything. That early stop is the key difference from a full merge: total work is \`O(k log k)\`-ish, independent of how many readings the grid holds beyond the k-th.

Column-sortedness buys the second optimization: seeding only \`min(k, rows)\` rows. Reading \`grid[r][0]\` has \`r\` column-predecessors that are all \`<=\` it, so for \`r >= k\` its rank already exceeds k — and every other cell in that row is even larger. With a tall, skinny grid and a small k, this keeps the heap tiny no matter how many thousand rows exist.

The \`(value, row, col)\` tuple is doing double duty again: equal readings fall back to comparing row indices, which are unique among heap entries, so comparisons are always decided before reaching a third field and pops are fully deterministic. Worth knowing for follow-up conversations: a binary search **on the value range**, counting cells \`<=\` mid per row, solves the same problem in \`O((R + C) log range)\` — but the heap version is the one that generalizes to "give me the readings in dryness order until I say stop."
`,
        complexity: 'Time O(min(rows, k) + k log min(rows, k)), Space O(min(rows, k))',
      },
      testCases: [
        { input: [[[2, 4, 7], [3, 5, 8], [6, 9, 10]], 4], expected: 5, label: 'worked example' },
        { input: [[[1, 2], [2, 3]], 3], expected: 2, label: 'duplicates count separately' },
        { input: [[[4]], 1], expected: 4, label: 'single sensor' },
        { input: [[[1, 3], [2, 4]], 4], expected: 4, hidden: true, label: 'k equals every cell' },
        { input: [[[5, 6, 7, 8]], 3], expected: 7, hidden: true, label: 'single row' },
        { input: [[[1], [4], [6]], 2], expected: 4, hidden: true, label: 'single column' },
        { input: [[[7, 7], [7, 7]], 3], expected: 7, hidden: true, label: 'all readings equal' },
        {
          input: [[[1, 4, 9, 16], [2, 5, 10, 17], [3, 6, 11, 18], [7, 8, 12, 19]], 10],
          expected: 10,
          hidden: true,
          label: 'larger 4x4 grid',
        },
      ],
      furtherPractice: [
        { name: 'Kth Smallest Element in a Sorted Matrix', note: 'this exact shape; also try the value-space binary search' },
        { name: 'Find K Pairs with Smallest Sums', note: 'the same lazy frontier expansion over an implicit grid' },
      ],
    },
    {
      id: 'garage-emptiest-levels',
      title: 'Emptiest Parking Levels',
      difficulty: 'easy',
      statement: `
A multi-storey garage reports each level as a list of spot sensors: \`1\` for occupied, \`0\` for free. Drivers always take the first free spot past the ramp, so on every level **all the 1s come before all the 0s**.

An overflow system routes incoming cars to the emptiest levels first. Given \`levels\` (each inner list the same length) and an integer \`k\`, return the **indices of the k emptiest levels**, ordered by:

1. **occupied count, ascending** — fewer cars first;
2. on equal counts, **lower level index first**.

Levels are wide and numerous; take advantage of the packed-from-the-ramp layout rather than scanning every spot of every level.
`,
      examples: [
        {
          input: 'levels = [[1, 1, 0, 0], [1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 0, 0]], k = 2',
          output: '[2, 0]',
          explanation:
            'Occupied counts per level: 2, 4, 1, 2. Level 2 is emptiest with 1 car. Levels 0 and 3 tie at 2 cars; the lower index 0 wins the second slot.',
        },
        {
          input: 'levels = [[1, 0], [1, 0], [0, 0]], k = 2',
          output: '[2, 0]',
          explanation: 'Counts are 1, 1, 0. Level 2 has zero cars; then levels 0 and 1 tie at one car and index 0 comes first.',
        },
        {
          input: 'levels = [[1, 1], [1, 1]], k = 1',
          output: '[0]',
          explanation: 'Both levels are full with 2 cars each — the tie-break picks the lower index.',
        },
      ],
      constraints: [
        '1 <= k <= len(levels) <= 50_000',
        '1 <= spots per level <= 10_000 (all levels equal width)',
        'Each level lists all 1s before any 0s',
        'Output is ordered by (occupied count ascending, level index ascending)',
      ],
      hints: [
        'Two separate subproblems hide here: counting the cars on a level without touching every sensor, and picking k levels under a ranking with a tie rule. Solve them independently.',
        'Because cars pack from the ramp, each level is 1s then 0s — the count of cars equals the index of the FIRST 0, which binary search finds in O(log w). For the selection, pair each count with its level index; Python compares tuples field by field, which IS your tie-break.',
        'Build (count, index) pairs — both fields rank ascending, so no negation is needed anywhere — heapify the list in O(m), then heappop k times and collect the indices in pop order.',
      ],
      functionName: 'emptiest_levels',
      starterCode: `def emptiest_levels(levels: list[list[int]], k: int) -> list[int]:
    pass
`,
      solution: {
        code: `import heapq

def emptiest_levels(levels: list[list[int]], k: int) -> list[int]:
    def car_count(level: list[int]) -> int:
        # The level is 1s then 0s, so the index of the first 0 IS the
        # count of cars. Binary search for that boundary: O(log w)
        # instead of O(w) per level.
        lo, hi = 0, len(level)
        while lo < hi:
            mid = (lo + hi) // 2
            if level[mid] == 1:
                lo = mid + 1   # boundary is to the right of mid
            else:
                hi = mid       # mid is free: boundary is at or left of mid
        return lo

    # (count, index): both ranking directions are ascending, so the raw
    # tuple already sorts exactly the way the answer must — no negation,
    # no custom keys. Ties on count fall through to the index field.
    pairs = [(car_count(level), i) for i, level in enumerate(levels)]
    heapq.heapify(pairs)  # O(m) over m levels

    # k pops emit levels in (count, index) order — precisely the answer.
    return [heapq.heappop(pairs)[1] for _ in range(k)]
`,
        commentary: `
This problem layers two independent exploitations of structure, and it is worth seeing them as separate decisions.

**Counting**: a level's sensors are sorted (1s then 0s), so "how many cars?" is a *boundary search*, not a scan. Binary search finds the first 0 in \`O(log w)\`; summing would cost \`O(w)\`. With 10,000 spots per level, that is ~14 probes versus 10,000 reads — and it is the kind of free win interviewers expect you to spot whenever data inside a row is monotone.

**Selecting**: we need k levels under the composite key \`(count, index)\`. Both fields rank *ascending*, which makes this the friendliest possible case: the raw tuple's natural order is already the answer's order, so a plain min-heap over all m pairs, built with \`O(m)\` heapify, emits the answer with k cheap pops. Contrast this with the drone problem (every field needed negating to fake a max-heap) and the bakery problem (one field *couldn't* be negated, forcing the pop-k architecture): the data's directions, not the problem's surface story, dictate which heap deployment you reach for.

Total cost: \`O(m log w)\` to count, \`O(m)\` to heapify, \`O(k log m)\` to extract — versus \`O(m log m)\` for the sort-everything baseline. For small k the heap wins; and unlike the sort, it can stop the moment the overflow system has enough levels.
`,
        complexity: 'Time O(m log w + m + k log m), Space O(m)',
      },
      testCases: [
        {
          input: [[[1, 1, 0, 0], [1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 0, 0]], 2],
          expected: [2, 0],
          label: 'worked example',
        },
        { input: [[[1, 0], [1, 0], [0, 0]], 2], expected: [2, 0], label: 'empty level wins, then index tie-break' },
        { input: [[[1, 1], [1, 1]], 1], expected: [0], label: 'all levels full' },
        { input: [[[1], [0]], 2], expected: [1, 0], hidden: true, label: 'k equals all levels' },
        { input: [[[0, 0], [0, 0], [0, 0]], 2], expected: [0, 1], hidden: true, label: 'completely empty garage' },
        { input: [[[1, 0, 0]], 1], expected: [0], hidden: true, label: 'single level' },
        {
          input: [[[1, 1, 1, 1, 1, 1, 1, 0], [1, 1, 1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, 0, 0]], 2],
          expected: [2, 0],
          hidden: true,
          label: 'wide levels exercising the boundary search',
        },
      ],
      furtherPractice: [
        { name: 'The K Weakest Rows in a Matrix', note: 'the same count-then-select composite' },
        { name: 'Kth Largest Element in an Array', note: 'selection without the counting layer' },
      ],
    },
    {
      id: 'press-ink-cooldown',
      title: 'Press Schedule with Purge Gaps',
      difficulty: 'hard',
      statement: `
A print shop runs one press that completes exactly **one job per time slot**. Every job is tagged with an ink color. After the press runs a job of some color, residue rules require **at least \`gap\` slots before another job of the same color** — jobs of *different* colors may run back-to-back freely. When no color is eligible, the press burns an idle purge slot.

Jobs may be run in **any order**. Given \`jobs\` (a list of color tags) and the integer \`gap\`, return the **minimum total number of slots** — working plus idle — needed to finish every job.

A bad ordering strands the dominant color behind its own cooldown again and again; the right ordering hides cooldowns behind other colors' work.
`,
      examples: [
        {
          input: 'jobs = ["A", "A", "A", "B", "B", "B"], gap = 2',
          output: '8',
          explanation:
            'One optimal schedule: A B idle A B idle A B — every pair of same-color jobs is at least 3 slots apart, total 8 slots. No schedule finishes in 7.',
        },
        {
          input: 'jobs = ["A", "A", "B", "C"], gap = 2',
          output: '4',
          explanation: 'A B C A works: the two A jobs sit 3 slots apart and no slot idles.',
        },
        {
          input: 'jobs = ["A", "A", "A", "A"], gap = 1',
          output: '7',
          explanation: 'Only one color exists, so every A needs a purge slot after it except the last: A _ A _ A _ A.',
        },
        {
          input: 'jobs = ["X", "X", "Y"], gap = 0',
          output: '3',
          explanation: 'With no cooldown the press never idles — the answer is just the job count.',
        },
      ],
      constraints: [
        '0 <= len(jobs) <= 10_000',
        '0 <= gap <= 100',
        'Color tags are non-empty strings (at most 20 distinct colors)',
        'Consecutive same-color jobs must be at least gap + 1 slots apart',
      ],
      hints: [
        'Schedule a small instance by hand, slot by slot. When several colors are eligible to run, does it ever pay to pick a color with FEW jobs left while a color with many jobs left is also eligible?',
        'Greedy: in every slot, run the eligible color with the MOST remaining jobs — it is the one that threatens future idle time, so its cooldowns should start as early as possible. You need two structures: one surfacing the heaviest eligible color, one parking colors until their cooldown expires.',
        'Max-heap (negated counts) of eligible colors + a FIFO deque of (ready_slot, negated_remaining). Each slot: move every entry whose ready_slot has arrived from the deque to the heap; then pop and run the heaviest color, parking it back in the deque if jobs remain — or idle if the heap is empty. The slot counter when both structures drain is the answer.',
      ],
      functionName: 'press_schedule_length',
      starterCode: `def press_schedule_length(jobs: list[str], gap: int) -> int:
    pass
`,
      solution: {
        code: `import heapq
from collections import Counter, deque

def press_schedule_length(jobs: list[str], gap: int) -> int:
    if not jobs:
        return 0
    # Only the per-color counts matter — the tags themselves never need
    # to be compared, so the heap holds bare negated counts (max-heap).
    heap = [-c for c in Counter(jobs).values()]
    heapq.heapify(heap)

    # Colors mid-cooldown, as (first slot they may run again, negated
    # remaining). Ready slots are strictly increasing in insertion order
    # (one job runs per slot), so a FIFO deque keeps them sorted for free.
    cooling = deque()

    slot = 0
    while heap or cooling:
        slot += 1
        # Re-admit every color whose cooldown has expired by this slot.
        while cooling and cooling[0][0] <= slot:
            heapq.heappush(heap, cooling.popleft()[1])
        if heap:
            # Run one job of the heaviest eligible color. Negated count:
            # adding 1 means one fewer job remaining.
            remaining = heapq.heappop(heap) + 1
            if remaining < 0:
                # Still has jobs: park it until slot + gap + 1.
                cooling.append((slot + gap + 1, remaining))
        # else: no color eligible — this slot is an idle purge; the
        #       clock still advances, which is the entire cost model.
    return slot
`,
        commentary: `
This is the heap as a **simulation engine** rather than a filter or a merger. The schedule unfolds slot by slot, and at each slot the press faces a priority decision over a *mutating* candidate set — colors leave when they enter cooldown and re-enter when it expires. That churn is exactly what heaps price at \`O(log m)\`.

The greedy choice — always run the eligible color with the most remaining jobs — comes from asking what causes idle slots at all: one color holding so much remaining work that the others cannot fill its cooldown windows. Running the heaviest color first starts its mandatory waiting periods as early as possible, letting lighter colors pay down those windows with useful work. An exchange argument makes it exact: swapping a lighter pick to before a heavier one can only delay the heavier color's last job, never accelerate the finish.

Two implementation choices carry the determinism and the cleanliness. First, the heap stores **bare negated counts, not tags**: ties between equally heavy colors are genuinely interchangeable for the schedule *length*, so dropping the tags removes both the tie-break ceremony and any risk of non-comparable payloads. Second, the cooling line is a **deque, not a second heap**: because exactly one job runs per slot, ready times are strictly increasing as they are appended, so FIFO order is already sorted order — a heap there would buy nothing and cost \`log\`. Recognizing when a queue's arrival order makes a heap redundant is its own little interview skill.

The drain condition \`while heap or cooling\` plus the unconditional \`slot += 1\` is what counts idle time correctly: when everything eligible is exhausted but a color is still cooling, the loop keeps ticking — and those ticks *are* the purge slots the answer must include.
`,
        complexity: 'Time O(n log m + idle) for m distinct colors, Space O(m)',
      },
      testCases: [
        { input: [['A', 'A', 'A', 'B', 'B', 'B'], 2], expected: 8, label: 'worked example' },
        { input: [['A', 'A', 'B', 'C'], 2], expected: 4, label: 'no idle needed' },
        { input: [['A', 'A', 'A', 'A'], 1], expected: 7, label: 'single color, forced purges' },
        { input: [['X', 'X', 'Y'], 0], expected: 3, label: 'zero gap degenerates to the job count' },
        { input: [[], 5], expected: 0, hidden: true, label: 'no jobs' },
        { input: [['Z'], 10], expected: 1, hidden: true, label: 'one job ignores the gap' },
        { input: [['P', 'P', 'P'], 3], expected: 9, hidden: true, label: 'heavy cooldown, lone color' },
        { input: [['A', 'A', 'B', 'B', 'C', 'C'], 1], expected: 6, hidden: true, label: 'three colors interleave with zero idle' },
        { input: [['A', 'A', 'A', 'B'], 4], expected: 11, hidden: true, label: 'dominant color strands the schedule' },
      ],
      furtherPractice: [
        { name: 'Task Scheduler', note: 'the classic formulation — also derive the closed-form frame formula' },
        { name: 'Reorganize String', note: 'the same greedy with gap = 1, but you must output the arrangement' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt: 'An array-backed binary min-heap satisfies the heap property. What does that actually guarantee about the array?',
      choices: [
        'The array is fully sorted in ascending order',
        'Every parent is <= its children, so index 0 holds the global minimum — but siblings and cousins have no defined order',
        'For any node, its entire left subtree holds smaller values and its right subtree larger values, like a BST',
        'Each level of the tree is sorted left to right',
      ],
      correctIndex: 1,
      explanation:
        'The heap property is strictly parent-vs-child: every path from root to leaf is non-decreasing, which pins down only the root. The array is emphatically not sorted (the second-smallest element could be at index 1 or 2), it is not a BST (left/right children carry no relative meaning), and levels are not internally ordered. Mistaking the heap list for sorted data is one of the most common heap bugs.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt: "Python `heapq`'s classic API is min-heap only. What is the standard, version-portable way to get max-heap behavior?",
      choices: [
        'Pass reverse=True to heappush',
        'Use the private heapq._heapify_max helpers in production code',
        'Negate the keys when pushing and negate again when popping (or wrap items in a class that inverts comparison)',
        'Push items in reverse sorted order so the largest ends up at the root',
      ],
      correctIndex: 2,
      explanation:
        'Negating keys turns "smallest negated" into "largest original" — two characters of code, fully supported. heappush has no reverse parameter; the _max helpers are private, incomplete (no _heappush_max in older versions), and unsafe to rely on; and insertion order cannot defeat the sift logic — the heap reorganizes regardless of the order you push. (Python 3.14 did add public max-heap functions — heapq.heapify_max, heappush_max, heappop_max — but negation remains the answer that works on every version.)',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt: 'You track the k-th largest element over a stream of n items using a min-heap capped at size k. What is the total time complexity?',
      choices: ['O(n log n)', 'O(n log k)', 'O(n * k)', 'O(n + k)'],
      correctIndex: 1,
      explanation:
        'Each of the n arrivals does at most one O(1) root comparison plus one push/replace on a heap that never exceeds k elements — O(log k) per item, O(n log k) total. O(n log n) is what you pay if the heap grows unbounded (or if you sort); O(nk) is the no-heap approach of rescanning a k-list per item; O(n + k) would require constant-time inserts, which a heap does not offer.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt: 'You have n items in a plain list. Compare building a heap with heapify(list) versus pushing the n items one at a time.',
      choices: [
        'Both are O(n log n) — heapify is just a convenience wrapper',
        'heapify is O(n); n individual pushes total O(n log n)',
        'heapify is O(log n); n pushes are O(n)',
        'Both are O(n) — pushes amortize like dynamic-array appends',
      ],
      correctIndex: 1,
      explanation:
        'heapify sifts down from the last internal node toward the root; half the nodes are leaves that move zero steps, a quarter move at most one, and the weighted sum converges to O(n). Individual pushes each pay up to O(log i) sift-up, summing to O(n log n). The costs do not amortize away like array appends, because sift distance genuinely grows with heap height.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'You must produce one globally sorted output from 50 sorted files of several GB each — far too much to hold in memory at once. Which approach is right?',
      choices: [
        'Concatenate all files and run a single sort — O(N log N) and by far the simplest code',
        'Repeatedly linear-scan the 50 current file heads and emit the minimum',
        'Keep the current head of each file in a 50-entry min-heap; pop the smallest, emit it, and refill from that file',
        'Binary search each file for successive global ranks',
      ],
      correctIndex: 2,
      explanation:
        'This is k-way merge: only the 50 heads can be the next output element, so a heap over the heads emits N items in O(N log 50) using ~50 entries of memory — it streams. Concatenate-and-sort is the tempting reflex, but it requires materializing all N elements (which the premise forbids) and wastes the pre-sortedness. Linear-scanning heads is correct but O(N * 50); binary searching for ranks does not produce a streaming merge at all.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt: 'A live dashboard must display the median of all measurements seen so far, updated after every arrival. Which design keeps every update cheap?',
      choices: [
        'Re-sort the full list after each arrival and read the middle element',
        'Maintain a sorted list with bisect.insort — binary search makes each insert O(log n)',
        'Maintain two heaps: a max-heap for the lower half and a min-heap for the upper half, rebalanced so sizes differ by at most one',
        'Maintain one min-heap and pop half of it whenever the median is requested',
      ],
      correctIndex: 2,
      explanation:
        'Two heaps put the median at the frontier between the halves: O(log n) per insert, O(1) per read. The bisect.insort option is the seductive trap — the binary search is O(log n) but the list insertion shifts elements, making the whole operation O(n). Re-sorting is O(n log n) per arrival, and popping half a heap per read is O(n log n) and destroys the heap.',
    },
    {
      id: 'q7',
      kind: 'scenario',
      prompt:
        'Your job scheduler stores pending tasks in a priority heap, but users frequently cancel tasks by id before they run. How do you support cancellation efficiently?',
      choices: [
        'A heap already supports delete-by-id in O(log n) — call heappop with the id',
        'Record cancelled ids in a hash set and, whenever a task surfaces at the root, discard it if its id is in the set (lazy deletion)',
        'Linear-scan the heap array for the id, remove it, and re-heapify — O(n), the only correct option',
        'Switch the pending queue to a stack, which supports removal anywhere',
      ],
      correctIndex: 1,
      explanation:
        'A bare heap cannot locate an arbitrary element — that is its core blind spot — and heappop only ever removes the root, so choice 1 describes an API that does not exist. Lazy deletion sidesteps the search entirely: cancelled tasks cost O(1) to mark and are skipped in O(log n) when they eventually surface. The linear scan works but is not "the only correct option," and stacks have no priority ordering at all.',
    },
    {
      id: 'q8',
      kind: 'conceptual',
      prompt: 'To track the k LARGEST items of a stream you keep a MIN-heap of size k. Why a min-heap and not a max-heap?',
      choices: [
        'Because heapq only provides min-heaps, so there is no choice',
        'The min-heap root is the weakest of the kept k — exactly the element each newcomer must beat, and exactly the one to evict when beaten',
        'A max-heap of size k would use more memory for the same elements',
        'Min-heaps have smaller constant factors than max-heaps',
      ],
      correctIndex: 1,
      explanation:
        'The eviction decision is always "does the newcomer beat the worst element I am keeping?" — for the k largest, the worst keeper is the minimum, so it must sit at the root. A max-heap of size k surfaces the best keeper, which is useless for eviction (you would never evict your best). Memory and constant factors are identical either way, and heapq can simulate a max-heap by negation, so choice 1 gives a true-ish fact that is not the reason.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Problem says "k largest / k smallest / k closest / top-k most frequent" — which pattern?',
      back: 'A heap bounded at size k holding the current best k. Compare each arrival against the root (the worst keeper), heapreplace if it wins. O(n log k) time, O(k) space.',
    },
    {
      id: 'f2',
      front: 'Which heap direction tracks the k LARGEST items, and why?',
      back: 'A MIN-heap of size k. Its root is the weakest of the elite — the eviction candidate and the k-th largest in one. (Symmetrically: k smallest → max-heap.)',
    },
    {
      id: 'f3',
      front: 'Max-heap in Python, given that heapq is min-only?',
      back: 'Negate keys on push, negate again on pop. For composite keys like (dist, x, y), negate every component — tuple comparison reverses cleanly.',
    },
    {
      id: 'f4',
      front: 'heapify(n items) vs pushing n items one by one — costs?',
      back: 'heapify is O(n) (bottom-up sift-down; most nodes are leaves). n pushes cost O(n log n). Always heapify when the data is already in hand.',
    },
    {
      id: 'f5',
      front: 'Template move: merge k sorted lists with a heap.',
      back: 'Seed with (head_value, list_index, 0) per non-empty list. Pop the min, emit it, push that list\'s next element. Each of N elements is pushed/popped once: O(N log k), O(k) live entries.',
    },
    {
      id: 'f6',
      front: 'Template move: running median with two heaps.',
      back: 'Max-heap `low` for the lower half, min-heap `high` for the upper half. Route each arrival by comparing to low\'s top, rebalance so len(low) - len(high) is 0 or 1. Odd → -low[0]; even → average of the two tops.',
    },
    {
      id: 'f7',
      front: 'Pitfall: heap entries are tuples and priorities tie. What breaks?',
      back: 'Python falls through to comparing the next field; if that is non-comparable (dict, custom object), heappush raises TypeError. Fix: insert a unique counter or index between priority and payload.',
    },
    {
      id: 'f8',
      front: 'Pitfall: reading the heap\'s backing list as if it were sorted.',
      back: 'Only heap[0] has a guaranteed rank; the rest is loosely ordered. To get sorted output, pop repeatedly (O(n log n)) or sort the list — never iterate it raw.',
    },
    {
      id: 'f9',
      front: 'When does a heap LOSE to other structures?',
      back: 'Need the full sorted output once → just sort. Need lookup/delete of arbitrary elements → heap cannot find them; pair with a hash map or use lazy deletion (mark dead ids, discard when they surface at the root).',
    },
    {
      id: 'f10',
      front: 'Core heap costs: peek / push / pop / build?',
      back: 'Peek O(1); push and pop O(log n) via sift-up/sift-down; build from n items O(n) with heapify. Bounded at size k, push/pop drop to O(log k).',
    },
  ],
  cheatSheet: {
    tldr:
      'A heap is an array-shaped complete binary tree that maintains exactly one guarantee — the extreme element sits at the root — and restores it in O(log n) after any push or pop. That thin promise is precisely what streaming problems need: top-k with a size-k heap (min-heap for k largest, max-heap for k smallest), k-way merging of sorted sources by heaping their heads, priority scheduling, and running medians via two heaps facing each other. Python\'s heapq is min-only: negate keys for max behavior, and add a tiebreaker field to tuples so comparison never reaches a non-comparable payload.',
    signals: [
      'Reach for this when the ask is "k largest / smallest / closest / most frequent" — bound the heap at size k and evict via the root.',
      'Reach for this when you repeatedly need the min or max of a collection that keeps changing — schedulers, simulations, Dijkstra-style frontiers.',
      'Reach for this when merging multiple already-sorted sources into one ordered stream — heap the current heads, pop and refill.',
      'Reach for this when a streaming statistic lives at the boundary between two halves of the data — running median means two heaps, rebalanced.',
      'Skip it when you need the whole output sorted once (just sort) or arbitrary lookup/deletion (hash map + lazy deletion, or a balanced tree).',
    ],
    template: `import heapq

# Top-k largest over a stream: MIN-heap bounded at size k
heap = []
for x in stream:
    if len(heap) < k:
        heapq.heappush(heap, x)
    elif x > heap[0]:                 # beats the weakest keeper
        heapq.heapreplace(heap, x)    # evict + admit, one O(log k) sift
# heap[0] is the k-th largest; sorted(heap, reverse=True) is the top k

# K-way merge of sorted lists: heap the current heads
heads = [(lst[0], i, 0) for i, lst in enumerate(lists) if lst]
heapq.heapify(heads)                  # O(k), not O(k log k)
while heads:
    val, i, pos = heapq.heappop(heads)
    emit(val)
    if pos + 1 < len(lists[i]):
        heapq.heappush(heads, (lists[i][pos + 1], i, pos + 1))

# Max-heap idiom: negate on push, negate on pop
heapq.heappush(maxheap, -x)
largest = -maxheap[0]`,
    complexity: 'Peek O(1); push/pop O(log n); heapify O(n); top-k of a stream O(n log k) time, O(k) space; merging k lists O(N log k).',
  },
}

export default mod
