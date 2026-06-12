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
