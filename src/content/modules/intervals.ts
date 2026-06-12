import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'intervals',
  visualizer: 'intervals',
  concept: `
## The mental model

Picture a wall calendar for a single shared resource — one room, one runway, one timeline — and a roll of colored tape. Every interval in the input is a strip of tape: it starts somewhere, ends somewhere, and claims everything in between. Once the strips are on the wall, every classic interval question becomes something you can literally see:

- **Merge**: where do strips run into each other and form one continuous band?
- **Depth**: at the busiest instant, how many strips are stacked on top of each other?
- **Selection**: which strips do you peel off so that none of the remaining ones touch?

Raw interval lists arrive in arbitrary order, which makes all three questions look like they need pairwise comparison — \`O(n^2)\` checks. The unlock is always the same: **sort first, then sweep left to right** carrying a tiny bit of state (the block you're building, a running counter, or the end of the last thing you kept). Sorting turns "compare everything against everything" into "compare each strip against one summary of the past."

Before any of that, burn the overlap test into your fingers. Closed intervals \`[a, b]\` and \`[c, d]\` overlap exactly when \`a <= d and c <= b\` — equivalently, they *don't* overlap only when one ends strictly before the other starts. Most interval bugs are really overlap-test bugs in disguise.

## Mechanics

**Merging.** Sort by start. Each interval either reaches back into the block you're currently building (its start is at or before the block's end) or it begins a new block. Crucially, you only ever compare against the *last* block — sorting guarantees nothing can reach further back than that.

\`\`\`python
def merge(intervals: list[list[int]]) -> list[list[int]]:
    if not intervals:
        return []
    intervals = sorted(intervals)          # by start, then end
    blocks = [list(intervals[0])]
    for s, e in intervals[1:]:
        if s <= blocks[-1][1]:             # reaches into the open block
            blocks[-1][1] = max(blocks[-1][1], e)   # max, not e!
        else:
            blocks.append([s, e])          # gap: start a fresh block
    return blocks
\`\`\`

The \`max\` matters: a short interval nested inside a long one must not *shrink* the block.

**Depth (peak overlap).** Stop thinking about which interval is which. Explode every interval into two events — \`+1\` at its start, \`-1\` at its end — sort the events, and sweep with a running counter. The answer is the counter's maximum. When a start and an end share a timestamp, the tie-break *is* the semantics: process ends first if a resource freed at \`t\` can be reused at \`t\` (half-open intervals), starts first if not.

**Selection (max non-overlapping).** Sort by **end** time and greedily keep every interval that starts at or after the end of the last one you kept. The interval that finishes earliest leaves the most room for the future — swapping it for any other compatible choice can only end later, never earlier, so the greedy choice is always safe. "Minimum removals" is just \`n\` minus this maximum.

Notice the fork in the road: merging and depth problems sort by **start**; selection problems sort by **end**. Choosing the wrong key is the most common way to be confidently wrong here.

## When to reach for it

- The input is a list of **ranges** — times, IP blocks, memory addresses, genomic coordinates — and the question is about **overlap, coverage, gaps, or conflicts**.
- You hear **"merge / consolidate / coalesce"** ranges → sort by start, sweep, extend-or-append.
- You hear **"how many at once / peak load / minimum rooms (servers, runways, channels)"** → that's depth: boundary sweep or a min-heap of end times.
- You hear **"schedule the most / cancel the fewest"** → selection: sort by end, greedy keep.
- You're inserting into an **already sorted, disjoint** set of ranges → no sort needed; a three-phase linear walk (before / merge / after) does it in \`O(n)\`.

If the question is about a *contiguous subarray* of one sequence rather than a set of independent ranges, you likely want sliding window or prefix sums instead.

## Complexity

Sorting dominates: \`O(n log n)\` time for merge, depth, and selection, with the sweep itself a single \`O(n)\` pass. Space is \`O(n)\` for the output (merge) or the event list / heap (depth), and \`O(1)\` extra for greedy selection. Inserting into a pre-sorted disjoint calendar skips the sort entirely: \`O(n)\` time, and no comparison-based method can beat that because the whole output may have to be rebuilt.

## Common pitfalls

- **Forgetting to sort.** Every sweep argument silently assumes order; on raw input you get garbage, not an error.
- **The touching convention.** Do \`[1, 3]\` and \`[3, 5]\` conflict? With closed intervals yes, with half-open \`[start, end)\` no. Read the problem's convention *before* writing the comparison, and re-check every \`<\` vs \`<=\`.
- **Extending with \`e\` instead of \`max(block_end, e)\`.** Nested intervals will silently truncate your merged block.
- **Sorting by start for a selection problem.** A long, early-starting interval gets kept and blocks everything; sort by end instead.
- **Sloppy tie-breaks in the event sweep.** Ends-before-starts versus starts-before-ends changes the answer by exactly the off-by-one your hidden tests probe.
- **Mutating the caller's intervals** while merging in place. Copy first unless the contract says otherwise.
`,
  realWorldUses: [
    {
      title: 'Free/busy computation in calendar systems',
      description:
        'When a scheduling tool proposes meeting times, it pulls every attendee’s busy intervals, merges them into consolidated busy blocks per timeline, and walks the gaps between blocks to find slots where everyone is free — the merge sweep and its complement, run millions of times a day.',
    },
    {
      title: 'Virtual memory area coalescing in OS kernels',
      description:
        'Kernels track each process’s mapped address ranges as a sorted, disjoint structure. Every mmap/munmap call is an insert-interval or delete-interval operation: the kernel finds neighbors, merges adjacent compatible regions, and splits ranges on partial unmaps — interval bookkeeping on the hottest path of the OS.',
    },
    {
      title: 'Capacity planning from session logs',
      description:
        'To size a connection pool, license count, or autoscaling fleet, ops teams take historical (connect, disconnect) intervals and run a boundary sweep to find peak concurrency — the exact "minimum rooms" computation, except the rooms are database connections or GPU instances.',
    },
  ],
  problems: [
    {
      id: 'studio-blocks',
      title: 'Studio Block Scheduler',
      difficulty: 'easy',
      statement: `
A podcast studio rents out a single recording room. Bookings arrive from the app in no particular order as pairs \`[start, end]\` — minutes since the studio opened, with \`start < end\`.

The cleaning crew only enters when the room actually goes quiet, so for their schedule, any bookings that **overlap or run back-to-back** (one starts exactly when another ends) count as one continuous *occupied block*.

Given the list \`bookings\`, return the list of occupied blocks, each as \`[start, end]\`, **sorted by start time ascending**. Blocks in the output must be pairwise disjoint and non-touching.
`,
      examples: [
        {
          input: 'bookings = [[9, 11], [13, 14], [10, 12]]',
          output: '[[9, 12], [13, 14]]',
          explanation:
            'The booking starting at 10 begins before the 9–11 session ends, so they fuse into one block ending at 12. The 13–14 booking stands alone.',
        },
        {
          input: 'bookings = [[1, 4], [4, 6]]',
          output: '[[1, 6]]',
          explanation:
            'Back-to-back bookings leave the room continuously occupied, so they form a single block.',
        },
        {
          input: 'bookings = [[2, 8], [3, 4]]',
          output: '[[2, 8]]',
          explanation:
            'The 3–4 session sits entirely inside the 2–8 session; it adds nothing to the block.',
        },
      ],
      constraints: [
        '0 <= len(bookings) <= 100_000',
        '0 <= start < end <= 10^9 for every booking',
        'Bookings may arrive in any order and may overlap arbitrarily',
        'Output blocks must be sorted by start time ascending',
      ],
      hints: [
        'Draw the first example on a timeline. When two bookings end up in the same occupied block, what is true about where one starts relative to where the other ends?',
        'Sort the bookings by start time. Then each booking either continues the block you are currently building or begins a brand-new one — sortedness removes every other case.',
        'Keep a list of finished blocks. For each sorted booking [s, e]: if s <= blocks[-1][1], set blocks[-1][1] = max(blocks[-1][1], e); otherwise append [s, e]. The max guards against bookings nested inside the current block.',
      ],
      functionName: 'merge_bookings',
      starterCode: `def merge_bookings(bookings: list[list[int]]) -> list[list[int]]:
    pass
`,
      solution: {
        code: `def merge_bookings(bookings: list[list[int]]) -> list[list[int]]:
    # Nothing booked: nothing to clean around.
    if not bookings:
        return []
    # Sort by start (then end) so each booking can only interact
    # with the block we are currently building.
    ordered = sorted(bookings)
    # Seed the first block with a copy so we never mutate the input.
    blocks = [list(ordered[0])]
    for start, end in ordered[1:]:
        last = blocks[-1]
        if start <= last[1]:
            # Overlaps or touches the open block: extend it.
            # max() matters — a booking nested inside the block
            # must not shrink the block's end.
            last[1] = max(last[1], end)
        else:
            # Strict gap: the room went quiet. Start a new block.
            blocks.append([start, end])
    return blocks
`,
        commentary: `
Unsorted, the problem looks quadratic: any booking might merge with any other. Sorting by start collapses that to a single question per booking: *does it reach back into the block currently under construction?*

Why is comparing against only the **last** block enough? The finished blocks are disjoint, in increasing order, and the open block extends furthest right of everything seen so far. If the current booking starts after the open block ends, it starts after *every* earlier block ends too — so older blocks are permanently final the moment we move past them.

The two classic traps both live in the extend branch. First, the condition is \`start <= last[1]\`, not \`<\` — the statement says back-to-back bookings fuse. Second, the new end is \`max(last[1], end)\`, not just \`end\`: a 3–4 session inside a 2–8 session must not truncate the block to end at 4. The empty input short-circuits before the loop, and a single booking simply becomes a single block.
`,
        complexity: 'Time O(n log n) for the sort + O(n) sweep, Space O(n) for the output',
      },
      testCases: [
        { input: [[[9, 11], [13, 14], [10, 12]]], expected: [[9, 12], [13, 14]], label: 'overlap merges' },
        { input: [[[1, 4], [4, 6]]], expected: [[1, 6]], label: 'back-to-back fuses' },
        { input: [[[15, 18], [1, 3], [2, 6], [8, 10]]], expected: [[1, 6], [8, 10], [15, 18]], label: 'unsorted input' },
        { input: [[]], expected: [], hidden: true, label: 'no bookings' },
        { input: [[[5, 7]]], expected: [[5, 7]], hidden: true, label: 'single booking' },
        { input: [[[1, 10], [2, 3], [4, 5], [6, 7]]], expected: [[1, 10]], hidden: true, label: 'nested bookings swallowed' },
        { input: [[[2, 6], [2, 6], [2, 6]]], expected: [[2, 6]], hidden: true, label: 'all identical' },
        { input: [[[0, 1000000000], [500000000, 1500000000]]], expected: [[0, 1500000000]], hidden: true, label: 'large timestamps' },
      ],
      furtherPractice: [
        { name: 'LeetCode 56. Merge Intervals', note: 'the canonical version' },
        { name: 'LeetCode 986. Interval List Intersections', note: 'two sorted lists instead of one' },
      ],
    },
    {
      id: 'freeze-calendar',
      title: 'Deploy Freeze Calendar',
      difficulty: 'medium',
      statement: `
Release engineering keeps a calendar of **change-freeze windows** — periods when no deploys may ship. The calendar \`windows\` is a list of \`[start, end]\` pairs that is already **sorted by start time**, with the windows **pairwise disjoint and non-touching** (each window ends strictly before the next begins).

An incident just triggered a new freeze \`new_window = [start, end]\`. Insert it into the calendar. If the new window **overlaps or touches** any existing windows, they must be fused into a single window covering their combined span — a freeze that ends the instant another begins is one continuous freeze.

Return the updated calendar as a list of \`[start, end]\` windows, **sorted by start time ascending**, pairwise disjoint and non-touching. Do this in one pass without re-sorting.
`,
      examples: [
        {
          input: 'windows = [[1, 2], [6, 9]], new_window = [3, 5]',
          output: '[[1, 2], [3, 5], [6, 9]]',
          explanation: 'The new freeze fits in the gap without touching either neighbor, so it slots in as-is.',
        },
        {
          input: 'windows = [[1, 3], [6, 9]], new_window = [2, 7]',
          output: '[[1, 9]]',
          explanation: 'The new freeze overlaps both existing windows, bridging them into one span from 1 to 9.',
        },
        {
          input: 'windows = [[1, 2], [5, 8]], new_window = [2, 5]',
          output: '[[1, 8]]',
          explanation:
            'The new freeze starts exactly when the first window ends and ends exactly when the second begins. Touching counts as continuous, so all three fuse.',
        },
      ],
      constraints: [
        '0 <= len(windows) <= 100_000',
        '0 <= start < end <= 10^9 for every window, including new_window',
        'windows is sorted by start and pairwise disjoint and non-touching',
        'Target O(n) time — do not re-sort the calendar',
        'Output must be sorted by start time ascending',
      ],
      hints: [
        'The calendar is already sorted and disjoint — that is a gift. Sketch where the new window can land: which existing windows can it possibly affect, and where do they sit in the list?',
        'Walk the calendar in three phases: windows that end strictly before the new one starts (untouched), windows that overlap or touch it (absorbed), and windows that start strictly after it ends (untouched).',
        'Phase 1: copy while windows[i][1] < new_start. Phase 2: while windows[i][0] <= new_end, fold the window in with min on starts and max on ends. Append the grown window once, then copy the rest verbatim.',
      ],
      functionName: 'insert_freeze_window',
      starterCode: `def insert_freeze_window(windows: list[list[int]], new_window: list[int]) -> list[list[int]]:
    pass
`,
      solution: {
        code: `def insert_freeze_window(windows: list[list[int]], new_window: list[int]) -> list[list[int]]:
    result = []
    ns, ne = new_window
    i, n = 0, len(windows)

    # Phase 1: windows that end strictly before the new freeze starts.
    # (Strictly — touching counts as continuous, so end == ns must merge.)
    while i < n and windows[i][1] < ns:
        result.append(list(windows[i]))  # copy, never alias the input
        i += 1

    # Phase 2: absorb every window that overlaps or touches the new one.
    # A window is involved while it starts at or before the new end.
    while i < n and windows[i][0] <= ne:
        ns = min(ns, windows[i][0])  # grow left edge
        ne = max(ne, windows[i][1])  # grow right edge
        i += 1
    result.append([ns, ne])  # the (possibly grown) new freeze, placed once

    # Phase 3: everything else starts strictly after the new end.
    while i < n:
        result.append(list(windows[i]))
        i += 1

    return result
`,
        commentary: `
Re-sorting would work — append the new window, then run a full merge — but it throws away the structure we were handed and costs \`O(n log n)\`. Because the calendar is sorted and disjoint, the windows the new freeze can affect form one **contiguous run** in the middle of the list. Everything before that run is too early to touch it; everything after is too late.

That observation turns the problem into three pointer-free phases. Phase 1's condition is \`windows[i][1] < ns\` with a **strict** less-than: a window ending exactly at \`ns\` touches the new freeze and must be absorbed, not copied. Phase 2's condition is \`windows[i][0] <= ne\` for the mirror-image reason. Inside phase 2 the new window greedily grows: \`min\` on starts, \`max\` on ends. By the time the run is exhausted, \`[ns, ne]\` covers the union, and it is emitted exactly once — including when phase 2 absorbed nothing.

The phase conditions also handle every edge case for free: an empty calendar skips phases 1 and 3 and emits just the new window; a new window past the end leaves phase 2 empty; a new window nested inside one giant window gets absorbed *by* it (min/max leave the big window's bounds intact).
`,
        complexity: 'Time O(n) single pass, Space O(n) for the output',
      },
      testCases: [
        { input: [[[1, 2], [6, 9]], [3, 5]], expected: [[1, 2], [3, 5], [6, 9]], label: 'fits in the gap' },
        { input: [[[1, 3], [6, 9]], [2, 7]], expected: [[1, 9]], label: 'bridges two windows' },
        { input: [[[1, 2], [5, 8]], [2, 5]], expected: [[1, 8]], label: 'touching fuses' },
        { input: [[], [4, 7]], expected: [[4, 7]], hidden: true, label: 'empty calendar' },
        { input: [[[2, 3], [5, 6], [8, 9]], [1, 10]], expected: [[1, 10]], hidden: true, label: 'swallows everything' },
        { input: [[[5, 7], [9, 11]], [1, 3]], expected: [[1, 3], [5, 7], [9, 11]], hidden: true, label: 'prepends before all' },
        { input: [[[1, 2], [4, 5]], [8, 9]], expected: [[1, 2], [4, 5], [8, 9]], hidden: true, label: 'appends after all' },
        { input: [[[1, 10]], [3, 4]], expected: [[1, 10]], hidden: true, label: 'nested inside existing' },
      ],
      furtherPractice: [
        { name: 'LeetCode 57. Insert Interval', note: 'the canonical version' },
        { name: 'LeetCode 715. Range Module', note: 'insert AND delete, maintained over many calls' },
      ],
    },
    {
      id: 'encoder-fleet',
      title: 'Live Encoder Fleet',
      difficulty: 'medium',
      statement: `
A streaming platform transcodes every live event on a dedicated encoder instance. The schedule is a list of events \`[start, end]\` (with \`start < end\`); an event holds its encoder for the half-open span \`[start, end)\`, meaning the encoder is released **at the instant the event ends** and can be handed to another event starting at exactly that time.

Encoders are expensive, so the platform provisions the bare minimum. Given \`events\`, return the **minimum number of encoders** needed so that every event runs on its own encoder for its entire duration.
`,
      examples: [
        {
          input: 'events = [[0, 30], [5, 10], [15, 20]]',
          output: '2',
          explanation:
            'The 0–30 event overlaps both short ones, but the short ones never overlap each other — they can share a second encoder.',
        },
        {
          input: 'events = [[1, 3], [3, 5], [5, 7]]',
          output: '1',
          explanation:
            'Each event ends exactly as the next begins. The half-open rule lets a single encoder hop from one to the next.',
        },
        {
          input: 'events = [[4, 9], [4, 9], [4, 9]]',
          output: '3',
          explanation: 'Three identical events run simultaneously the whole time; nothing can be shared.',
        },
      ],
      constraints: [
        '0 <= len(events) <= 100_000',
        '0 <= start < end <= 10^9 for every event',
        'An encoder freed at time t may serve an event starting at time t',
        'Return 0 when there are no events',
      ],
      hints: [
        'Stop trying to assign events to specific encoders. Is there a single quantity, measured over time, that by itself forces the answer?',
        'The answer is the peak number of events running at the same instant. Every start pushes that count up by one; every end pulls it down by one. You only need to visit those moments in the right order.',
        'Sort the starts and the ends into two separate lists. Walk the starts; before counting each start, pop every end that is <= it (each pop frees an encoder). Track the running count’s maximum. The <= encodes the hand-off-at-t rule.',
      ],
      functionName: 'min_encoders',
      starterCode: `def min_encoders(events: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `def min_encoders(events: list[list[int]]) -> int:
    if not events:
        return 0
    # We never need to know WHICH event ends — only WHEN events
    # start and end. Two independently sorted lists capture that.
    starts = sorted(e[0] for e in events)
    ends = sorted(e[1] for e in events)

    running = 0   # events live right now
    peak = 0      # the answer: maximum simultaneous events
    freed = 0     # index into ends: how many events have finished

    for s in starts:
        # Release every encoder whose event ended at or before s.
        # '<=' is the half-open rule: freed at t, reusable at t.
        while freed < len(ends) and ends[freed] <= s:
            running -= 1
            freed += 1
        # This event now claims an encoder.
        running += 1
        peak = max(peak, running)

    return peak
`,
        commentary: `
The pigeonhole argument does all the work. If \`k\` events are simultaneously live at some instant, no schedule survives with fewer than \`k\` encoders. Conversely, the peak is *achievable*: whenever an event starts and some earlier event has already ended, the freed encoder can simply be reused, so the fleet never needs to grow beyond the peak. Minimum fleet = peak concurrency, exactly.

Pairing starts with ends from *different* events feels wrong at first — but a release is a release. The counter doesn't care which event freed the encoder, only that one did. Decoupling the two sorted lists is what makes the sweep so short.

The single subtle line is \`ends[freed] <= s\`. With \`<=\`, an event ending at time \`s\` releases its encoder before the event starting at \`s\` is counted — the half-open hand-off the statement demands, and what makes the perfect-relay example need only one encoder. Flip it to \`<\` and that example would wrongly need two. When the convention is closed intervals instead, \`<\` is precisely the change you'd make: the tie-break *is* the semantics.
`,
        complexity: 'Time O(n log n) for the two sorts + O(n) sweep, Space O(n)',
      },
      testCases: [
        { input: [[[0, 30], [5, 10], [15, 20]]], expected: 2, label: 'long event spans two short ones' },
        { input: [[[1, 3], [3, 5], [5, 7]]], expected: 1, label: 'perfect hand-offs' },
        { input: [[[2, 4], [7, 10]]], expected: 1, label: 'disjoint events' },
        { input: [[]], expected: 0, hidden: true, label: 'no events' },
        { input: [[[4, 9], [4, 9], [4, 9], [4, 9]]], expected: 4, hidden: true, label: 'all identical' },
        { input: [[[1, 10], [2, 6], [5, 9]]], expected: 3, hidden: true, label: 'triple stack' },
        { input: [[[0, 5], [5, 10], [2, 7], [7, 12]]], expected: 2, hidden: true, label: 'reuse at exact boundaries' },
        { input: [[[5, 6]]], expected: 1, hidden: true, label: 'single event' },
      ],
      furtherPractice: [
        { name: 'LeetCode 253. Meeting Rooms II', note: 'the canonical version (premium)' },
        { name: 'LeetCode 1094. Car Pooling', note: 'same sweep with weighted +k/-k events' },
      ],
    },
    {
      id: 'runway-triage',
      title: 'Runway Slot Triage',
      difficulty: 'hard',
      statement: `
A regional airport has a single runway. Each landing request reserves an exclusive slot \`[start, end]\` (with \`start < end\`); the runway is held for the half-open span \`[start, end)\`, so a slot ending at time \`t\` frees the runway for a slot starting at exactly \`t\` — back-to-back landings are fine.

Two requests **conflict** when their slots overlap for a positive amount of time. The tower must cancel some requests so that no two remaining requests conflict.

Given \`slots\`, return the **minimum number of requests to cancel**. Only the count is required, not which requests.
`,
      examples: [
        {
          input: 'slots = [[1, 2], [2, 3], [3, 4], [1, 3]]',
          output: '1',
          explanation:
            'Cancelling [1, 3] leaves [1, 2], [2, 3], [3, 4] — back-to-back, zero conflicts. No conflict-free subset keeps all four.',
        },
        {
          input: 'slots = [[1, 4], [2, 5], [3, 6]]',
          output: '2',
          explanation: 'Every pair overlaps, so at most one request survives; two must go.',
        },
        {
          input: 'slots = [[1, 10], [2, 3], [3, 4], [4, 5]]',
          output: '1',
          explanation:
            'Cancel the long 1–10 request and the three short ones chain perfectly. Keeping the long one instead would cost three cancellations.',
        },
      ],
      constraints: [
        '0 <= len(slots) <= 100_000',
        '-10^9 <= start < end <= 10^9 for every slot',
        'Slots that merely touch (one ends exactly when another starts) do NOT conflict',
        'Return 0 when the slots are already conflict-free (including the empty list)',
      ],
      hints: [
        'Cancelling the fewest is the same as keeping the most. When you compare two requests you could keep next, what makes one of them strictly safer for everything that comes later?',
        'Among compatible candidates, the slot that finishes earliest leaves the most runway time for every future request — keeping it can never be worse. That suggests processing requests in a particular order and deciding keep-or-cancel one at a time.',
        'Sort by end time. Keep a slot iff its start >= the end of the last kept slot (>= because touching is allowed); otherwise it conflicts with something already kept — cancel it. The answer is total minus kept.',
      ],
      functionName: 'min_cancellations',
      starterCode: `def min_cancellations(slots: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `def min_cancellations(slots: list[list[int]]) -> int:
    if not slots:
        return 0
    # Minimizing cancellations == maximizing kept, conflict-free slots.
    # Greedy: always prefer the slot that frees the runway earliest.
    ordered = sorted(slots, key=lambda s: s[1])  # by END time

    kept = 0
    runway_free_at = ordered[0][0]  # nothing kept yet; first slot always fits

    for start, end in ordered:
        if start >= runway_free_at:
            # '>=' because touching is allowed: a slot may start the
            # instant the previous kept slot ends.
            kept += 1
            runway_free_at = end
        # else: this slot overlaps a kept one. Because everything kept
        # so far ends earliest-possible, this slot cannot be saved by
        # different earlier choices — cancel it.

    return len(slots) - kept
`,
        commentary: `
The reframe is half the solution: counting *cancellations* directly is awkward, but \`cancellations = n - (max conflict-free subset)\`, and maximizing a conflict-free subset has a clean greedy answer.

Why sort by **end** and not start? The exchange argument: suppose some optimal kept-set's first slot is \`X\`, while the globally earliest-ending slot is \`F\`. Swap \`X\` for \`F\`. Since \`F\` ends no later than \`X\`, every other slot in the optimal set still fits after \`F\` — the swap is free. Repeat the argument down the line and the greedy set is never smaller than optimal. Sorting by start has no such guarantee, and the third example is the standard killer: the earliest-*starting* slot is the long 1–10 blocker, and keeping it forfeits three short slots.

Two details carry the half-open rule. The keep test is \`start >= runway_free_at\` — \`>=\`, not \`>\` — so back-to-back landings chain for free. And initializing \`runway_free_at\` to the first slot's own start guarantees the earliest-ending slot is always kept, which the exchange argument requires. Each slot is visited once after sorting, and only two integers of state survive between iterations.
`,
        complexity: 'Time O(n log n) for the sort + O(n) sweep, Space O(1) extra (beyond the sort)',
      },
      testCases: [
        { input: [[[1, 2], [2, 3], [3, 4], [1, 3]]], expected: 1, label: 'one conflicting request' },
        { input: [[[1, 4], [2, 5], [3, 6]]], expected: 2, label: 'pairwise conflicts' },
        { input: [[[1, 2], [3, 4], [5, 6]]], expected: 0, label: 'already conflict-free' },
        { input: [[]], expected: 0, hidden: true, label: 'no requests' },
        { input: [[[7, 9]]], expected: 0, hidden: true, label: 'single request' },
        { input: [[[1, 2], [1, 2], [1, 2]]], expected: 2, hidden: true, label: 'all identical' },
        { input: [[[1, 10], [2, 3], [3, 4], [4, 5]]], expected: 1, hidden: true, label: 'cancel the long blocker' },
        { input: [[[-5, -1], [-2, 3], [0, 2], [2, 5]]], expected: 1, hidden: true, label: 'negative timestamps' },
      ],
      furtherPractice: [
        { name: 'LeetCode 435. Non-overlapping Intervals', note: 'the canonical version' },
        { name: 'LeetCode 452. Minimum Number of Arrows to Burst Balloons', note: 'same greedy, dual phrasing' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt:
        'Closed intervals `[a, b]` and `[c, d]` (with `a <= b`, `c <= d`) share at least one point exactly when:',
      choices: ['a <= d and c <= b', 'a <= c and b >= d', 'b == c or d == a', 'a < c < b'],
      correctIndex: 0,
      explanation:
        'Two intervals are disjoint only when one ends strictly before the other starts (b < c or d < a); negating that gives a <= d and c <= b. The second choice is the test for [c, d] being *contained* in [a, b] — containment implies overlap but misses partial overlaps. The third is only the touching case, and the fourth only detects c strictly inside [a, b], missing equal endpoints and the symmetric case.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt:
        'In the merge sweep (input sorted by start), why is it sufficient to compare each incoming interval against only the most recently built block?',
      choices: [
        'Sorting by start means the incoming interval cannot reach back past the last block: if it starts after that block ends, it starts after every earlier block ends too',
        'Intervals sorted by start are automatically sorted by end as well, so earlier blocks always end earlier than the incoming interval',
        'Merging always collapses the input into a single block, so there is only ever one block to compare against',
        'It is purely a performance shortcut; comparing against all previous blocks would sometimes produce a different (more correct) answer',
      ],
      correctIndex: 0,
      explanation:
        'Finished blocks are disjoint and ordered, and the open block extends furthest right of everything processed so far — so failing to reach the last block means failing to reach all of them. The second choice is false: nested intervals break the sorted-by-end claim (that is exactly why the extend step needs max). The third is false for any input with a gap. The fourth is backwards — the single comparison is fully correct, not an approximation.',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt: 'Merging n intervals that arrive in arbitrary order costs:',
      choices: [
        'O(n) time, O(1) space — one sweep',
        'O(n log n) time dominated by the sort, O(n) space for the output',
        'O(n^2) time — every interval must be compared with every other',
        'O(log n) time using binary search',
      ],
      correctIndex: 1,
      explanation:
        'The sweep itself is one O(n) pass with O(1) state, but it is only valid on sorted input, and comparison sorting costs O(n log n); the merged result needs O(n) space in the worst case (all disjoint). Plain O(n) is achievable only if the input arrives pre-sorted. O(n^2) is the brute force the pattern exists to beat, and O(log n) cannot even read the input.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'You must insert one interval into a calendar of n intervals that is already sorted and pairwise disjoint, merging where needed. The best achievable time is:',
      choices: [
        'O(log n) — binary search for the insertion point is all you need',
        'O(n) — one linear pass (before / absorb / after)',
        'O(n log n) — append the interval and re-sort, then merge',
        'O(1) — only the two neighbors of the new interval can be affected',
      ],
      correctIndex: 1,
      explanation:
        'The three-phase walk handles everything in one pass, and you cannot beat O(n) when returning a fresh list because the new interval may absorb (or shift) arbitrarily many entries — the whole output must be written out. Binary search finds where the action starts but neither performs the absorption (which can span O(n) windows) nor builds the result. Re-sorting works but wastes the sortedness you were handed. O(1) fails because the new interval can overlap far more than two neighbors.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'An ops dashboard ingests thousands of user sessions as [login, logout) pairs and must report the peak number of simultaneously connected users. Which approach is correct?',
      choices: [
        'Merge overlapping sessions and return the number of merged blocks',
        'Explode each session into a +1 event at login and a -1 event at logout, sort the events, sweep with a running counter, and return its maximum',
        'Sort by logout time and greedily count non-overlapping sessions',
        'Compare every pair of sessions and return the size of the largest overlapping pair-cluster',
      ],
      correctIndex: 1,
      explanation:
        'Peak concurrency is a depth question, and the boundary sweep measures depth directly. Merging is the tempting wrong pattern: it tells you how many continuous busy stretches exist (coverage), not how many sessions stack inside one — ten thousand simultaneous users merge into a single block. The greedy count answers the opposite question (a maximum set that does NOT overlap), and pairwise comparison is O(n^2) and still does not compute depth beyond pairs correctly.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'A festival has one stage and a pile of proposed sets, each [start, end). You want to host the maximum number of sets with no overlaps. Which strategy is correct?',
      choices: [
        'Sort by start time; keep each set that does not conflict with the last kept one',
        'Sort by duration, shortest first; keep each set that fits',
        'Sort by end time; keep every set whose start is at or after the end of the last kept set',
        'Maintain a min-heap of end times and report the maximum heap size reached',
      ],
      correctIndex: 2,
      explanation:
        'Earliest-finishing-first is the provably optimal greedy: by the exchange argument, the earliest-ending compatible set can always replace whatever an optimal solution chose first, without losing anything. Sort-by-start is the tempting trap — one long early set gets kept and blocks many short ones. Shortest-first also fails (a short set straddling two long compatible ones knocks out both). The min-heap of end times solves a different problem entirely: minimum number of stages, not maximum sets on one stage.',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt:
        'In a +1/-1 boundary sweep where a resource freed at time t may be reused by an interval starting at t (half-open intervals), how must events at the same timestamp be ordered?',
      choices: [
        'Starts before ends — reservations should always be claimed eagerly',
        'Ends before starts — the counter dips before it rises, so the freed resource is visible to the start at t',
        'Order never matters, because a start and an end at the same timestamp always cancel out',
        'Use closed intervals everywhere so that equal timestamps can never occur',
      ],
      correctIndex: 1,
      explanation:
        'Processing the end first releases the resource before the new start claims one, so back-to-back intervals correctly share — exactly the half-open semantics. Starts-first inflates the peak by one at every hand-off (and is the correct choice only when the convention is closed intervals). "They always cancel" fails when the counts differ at a timestamp (two ends, one start) and ignores that the order changes the maximum observed in between. The last choice changes the problem rather than answering it.',
    },
    {
      id: 'q8',
      kind: 'complexity',
      prompt:
        'The min-heap formulation of the minimum-rooms problem (sort by start; pop ends <= current start; push current end; answer is max heap size) costs:',
      choices: [
        'O(n log n) time and O(n) space',
        'O(n) time and O(1) space',
        'O(n^2) time and O(n) space',
        'O(n log n) time and O(1) space',
      ],
      correctIndex: 0,
      explanation:
        'Sorting is O(n log n); each interval is pushed once and popped at most once, at O(log n) per heap operation, so the heap phase is also O(n log n). The heap can hold all n end times when everything overlaps, so space is O(n) — which rules out both O(1)-space choices. Nothing in the algorithm is quadratic; O(n^2) is the brute-force pairwise-overlap count.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Overlap test for closed intervals [a, b] and [c, d]?',
      back: 'They overlap iff a <= d and c <= b. Equivalently: NOT (one ends strictly before the other starts). Re-check every <= against the problem’s touching convention.',
    },
    {
      id: 'f2',
      front: 'First move on almost every intervals problem?',
      back: 'Sort, then sweep with tiny state. Sort by START for merging and coverage; sort by END for greedy selection (max non-overlapping / min removals).',
    },
    {
      id: 'f3',
      front: 'Merge sweep: the two-branch loop body?',
      back: 'For each sorted [s, e]: if s <= last_end, extend with last_end = max(last_end, e); else close the block and start a new one at [s, e].',
    },
    {
      id: 'f4',
      front: 'Why max(last_end, e) instead of just e when extending a merged block?',
      back: 'A nested interval ends before the block does; assigning its end directly would shrink the block. max() keeps the furthest reach seen so far.',
    },
    {
      id: 'f5',
      front: 'Insert one interval into an already sorted, disjoint list — approach and cost?',
      back: 'Three-phase linear walk: copy windows ending before it, absorb (min/max) every window overlapping or touching it, copy the rest. O(n) time, no re-sort.',
    },
    {
      id: 'f6',
      front: '"Minimum rooms / encoders / runways for simultaneous events" — what is really being asked?',
      back: 'Peak depth: the maximum number of intervals alive at one instant. Compute via a +1/-1 boundary sweep over sorted event times, or a min-heap of end times.',
    },
    {
      id: 'f7',
      front: '"Minimum removals so no two intervals overlap" — the reduction and the greedy?',
      back: 'removals = n − (max non-overlapping subset). Sort by end time; keep each interval whose start is >= the end of the last kept one.',
    },
    {
      id: 'f8',
      front: 'Why does earliest-END-first greedy beat earliest-START-first for interval selection?',
      back: 'Exchange argument: the earliest-ending compatible interval leaves maximal room and can replace any optimal first choice for free. Earliest-start can lock in a long blocker that forfeits several later intervals.',
    },
    {
      id: 'f9',
      front: 'Sweep tie-break when a start and an end share a timestamp?',
      back: 'It encodes the semantics: process ends first if half-open (freed at t is reusable at t), starts first if closed intervals truly conflict at a shared point. Getting it backwards is an off-by-one on the peak.',
    },
    {
      id: 'f10',
      front: 'Typical complexity profile of interval algorithms?',
      back: 'O(n log n) time, dominated by sorting — the sweep itself is O(n). Space: O(n) for merged output or event list/heap; O(1) extra for greedy selection. Pre-sorted input drops insert/merge to O(n).',
    },
  ],
  cheatSheet: {
    tldr:
      'Interval problems put ranges on one shared timeline and ask one of three things: fuse overlapping ranges (merge), find the maximum number alive at once (depth), or keep the most non-conflicting ranges (selection). The universal recipe is sort-then-sweep: sorting makes each interval comparable against a single piece of carried state — the open block, a running counter, or the last kept end — instead of against everything. Sort by start for merge and depth, by end for selection; pin down the touching convention (closed vs half-open) before writing any comparison, because every <= versus < flows from it.',
    signals: [
      'Reach for this when the input is a list of ranges (times, addresses, coordinates) and the question involves overlap, conflicts, coverage, or gaps.',
      'Reach for this when you hear "merge / consolidate / coalesce" — sort by start, sweep, extend-or-append against the last block.',
      'Reach for this when you hear "how many at once / peak load / minimum rooms" — boundary sweep (+1 starts, -1 ends) or a min-heap of end times.',
      'Reach for this when you hear "schedule the most / cancel the fewest" — sort by end, greedily keep what starts after the last kept end.',
      'Be suspicious when the ranges are slices of one sequence rather than independent intervals — that is sliding-window or prefix-sum territory.',
    ],
    template: `# Merge: sort by start, extend or append
intervals.sort()
blocks = [list(intervals[0])]
for s, e in intervals[1:]:
    if s <= blocks[-1][1]:                  # overlaps/touches open block
        blocks[-1][1] = max(blocks[-1][1], e)
    else:
        blocks.append([s, e])

# Depth (min rooms): sweep starts against sorted ends
starts = sorted(i[0] for i in intervals)
ends = sorted(i[1] for i in intervals)
running = peak = freed = 0
for s in starts:
    while freed < len(ends) and ends[freed] <= s:   # <= : half-open hand-off
        running -= 1; freed += 1
    running += 1
    peak = max(peak, running)

# Selection (max kept / min removed): sort by END, greedy keep
intervals.sort(key=lambda i: i[1])
kept, free_at = 0, intervals[0][0]
for s, e in intervals:
    if s >= free_at:                        # >= : touching allowed
        kept += 1
        free_at = e`,
    complexity: 'Time O(n log n) (sort-dominated; O(n) sweep on pre-sorted input), Space O(n) output/events or O(1) for greedy.',
  },
}

export default mod
