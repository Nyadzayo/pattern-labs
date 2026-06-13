import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'prefix-sums',
  visualizer: 'prefix-sums',
  concept: `
## The mental model

Open your banking app. It doesn't just list transactions — it shows a **running balance** next to each one. Want to know how much moved through your account between March 3rd and March 18th? You don't re-add two weeks of transactions; you subtract the balance *before* March 3rd from the balance *at the end of* March 18th. The statement did the heavy lifting once, up front, and now every question about a date range costs one subtraction.

That is the entire pattern. A **prefix sum** array stores, for every position, the total of everything up to that point. Once it exists, the sum of any contiguous range \`[l, r]\` is just \`prefix[r+1] - prefix[l]\`: everything up to \`r\`, minus everything before \`l\`. You pay \`O(n)\` once to build the table, and then every range-sum question — no matter how wide — is \`O(1)\`. The pattern converts *repeated scanning* into *pointer arithmetic on a lookup table*.

## Mechanics

Build the table one slot longer than the array, with a leading zero. That zero is not decoration: it represents the empty prefix, and it means a range starting at index 0 needs no special case.

\`\`\`python
def build_prefix(arr: list[int]) -> list[int]:
    prefix = [0] * (len(arr) + 1)
    for i, x in enumerate(arr):
        prefix[i + 1] = prefix[i] + x
    return prefix

# sum of arr[l..r] inclusive, in O(1):
# prefix[r + 1] - prefix[l]
\`\`\`

Two upgrades take this from "neat trick" to "interview workhorse":

**1. Prefix + hash map (the counting trick).** Asked to *count* subarrays whose sum is exactly \`k\`? Note that a subarray ending at index \`i\` sums to \`k\` exactly when some earlier running total equals \`running - k\`. So scan once, keeping a dict that counts how many times each running total has appeared — seeded with \`{0: 1}\` for the empty prefix:

\`\`\`python
seen = {0: 1}
running = answer = 0
for x in arr:
    running += x
    answer += seen.get(running - k, 0)   # spans ending here that net k
    seen[running] = seen.get(running, 0) + 1
\`\`\`

This works with **negative numbers**, which is precisely where sliding windows break down.

**2. Two dimensions (summed-area tables).** Store \`P[r][c]\` = total of the rectangle from the origin to cell \`(r-1, c-1)\`. Any rectangle sum is then four lookups with inclusion–exclusion: take the big corner, cut away the strip above and the strip to the left, and add back the corner you cut twice. Build in \`O(R*C)\`, answer each rectangle in \`O(1)\`.

A useful relative is the **running-difference sweep**: problems like equilibrium index don't even need the stored table — one precomputed total plus an accumulating left sum gives you both sides of any split point in constant space.

## When to reach for it

- **Many range-sum queries over data that doesn't change.** The moment a problem says "answer Q queries," ask whether one precomputed table makes each query \`O(1)\`.
- **"Contiguous" + "sums to exactly…"** — especially when values can be **negative**. Exact-sum counting is the prefix-map trick; windows can't do it.
- **Left-versus-right comparisons**: pivot/equilibrium points, "is the first half heavier," splitting an array where both sides hit some total.
- **Rectangle sums on a grid**, or anything shaped like "total inside this region, many times."
- **Prefix-property counting**: variants key the map on running total *mod m*, or parity, or first-seen index — same skeleton, different key.

Know the boundaries. If all values are **positive** and you want the shortest/longest window meeting a *threshold* (sum ≥ target), sliding window is simpler and \`O(1)\` space. If the array gets **updated** between queries, a static prefix table goes stale — that's Fenwick/segment-tree territory.

## Complexity

Building the 1D table: \`O(n)\` time, \`O(n)\` space; each range query after that: \`O(1)\`. Answering \`m\` queries costs \`O(n + m)\` total versus \`O(n * m)\` for re-scanning — on 100k readings and 100k queries that's the difference between two hundred thousand operations and ten billion. The count-subarrays pass is one scan: \`O(n)\` time, \`O(n)\` space for the map. The 2D table costs \`O(R*C)\` to build and store, then \`O(1)\` per rectangle. The equilibrium sweep is the lightweight cousin: \`O(n)\` time, \`O(1)\` extra space.

## Common pitfalls

- **Off-by-one chaos.** Decide once: \`prefix\` has length \`n+1\`, \`prefix[i]\` is the sum of the first \`i\` elements, range \`[l, r]\` is \`prefix[r+1] - prefix[l]\`. Writing \`prefix[r] - prefix[l]\` quietly drops the last element.
- **Forgetting \`seen = {0: 1}\`.** Without the empty-prefix seed, every subarray that starts at index 0 goes uncounted — including the whole-array match.
- **Counting after inserting.** In the map trick, look up \`running - k\` *before* recording the current running total, or a \`k = 0\` query will match a subarray against itself.
- **Stale tables.** One point update invalidates every later prefix entry. "Patch one slot" is wrong; rebuilding per update is \`O(n)\`. Frequent updates mean a different data structure.
- **2D double-subtraction.** Cutting the top strip and the left strip removes the top-left corner twice — forgetting to add \`P[r1][c1]\` back is the classic summed-area bug.
- **Overflow elsewhere.** Python integers don't overflow, but in Java/C++ a prefix over 10^5 elements of 10^9 each blows past 32 bits. Say it out loud in interviews.
`,
  realWorldUses: [
    {
      title: 'Monotonic counters in metrics systems',
      description:
        'Prometheus-style counters never store per-second values — they store a cumulative running total (requests served, bytes sent). Computing traffic over any time window is exactly the prefix-sum query: sample the counter at both ends of the window and subtract, no matter how many events happened in between.',
    },
    {
      title: 'Summed-area tables in vision and graphics',
      description:
        'Real-time face detection (the Viola–Jones cascade) and box-blur filters need the sum of thousands of overlapping pixel rectangles per frame. They precompute a 2D prefix table over the image once, then evaluate every rectangle with four lookups — the same inclusion–exclusion query, millions of times per second.',
    },
    {
      title: 'Byte-offset indexes in file and log formats',
      description:
        'Container formats and log segments store an index of cumulative byte offsets — a prefix sum over record lengths. Seeking to record 1,000,000 is one index lookup instead of scanning a million length headers, which is how columnar files and message-broker segments support O(1) random access.',
    },
  ],
  problems: [
    {
      id: 'solar-dispatch',
      title: 'Solar Dispatch Reports',
      difficulty: 'easy',
      statement: `
You maintain the reporting backend for a community solar farm. Each day the net meter logs one integer: the net kilowatt-hours pushed to the grid that day. The number can be **negative** — on overcast days the site's inverters and heaters draw more than the panels produce.

Regulators submit report batches. Each request is a pair \`[start, end]\` (0-indexed, **both inclusive**) asking for the total net energy across that range of days.

Given the list \`readings\` and the list \`queries\`, return a list containing the total for each query, **in the same order as the queries**.

A batch may hold tens of thousands of requests spanning years of readings, so re-summing each range from scratch will time out.
`,
      examples: [
        {
          input: 'readings = [5, 2, 7, 1, 4], queries = [[0, 2], [1, 3], [4, 4]]',
          output: '[14, 10, 4]',
          explanation: '5+2+7 = 14, then 2+7+1 = 10, then day 4 alone contributes 4.',
        },
        {
          input: 'readings = [3], queries = [[0, 0]]',
          output: '[3]',
          explanation: 'A single-day range is just that day’s reading.',
        },
        {
          input: 'readings = [-4, 6, -2, 9], queries = [[0, 3], [2, 3]]',
          output: '[9, 7]',
          explanation: 'Negative days subtract from the total: -4+6-2+9 = 9 and -2+9 = 7.',
        },
      ],
      constraints: [
        '0 <= len(readings) <= 100_000',
        '-10^9 <= readings[i] <= 10^9',
        '0 <= len(queries) <= 100_000',
        'Every query [start, end] satisfies 0 <= start <= end < len(readings)',
        'Results must be returned in query order',
      ],
      hints: [
        'Summing each range from scratch repeats enormous amounts of work — queries [0, 900] and [0, 901] share almost every addition. Where exactly is the shared work, and could you do it just once?',
        'Precompute running totals: a table where entry i holds the sum of the first i readings. Any range total then becomes the difference of two table entries — no loop per query.',
        'Build prefix of length n+1 with prefix[0] = 0 and prefix[i+1] = prefix[i] + readings[i]. Answer each [start, end] as prefix[end + 1] - prefix[start].',
      ],
      functionName: 'dispatch_totals',
      starterCode: `def dispatch_totals(readings: list[int], queries: list[list[int]]) -> list[int]:
    pass
`,
      solution: {
        code: `def dispatch_totals(readings: list[int], queries: list[list[int]]) -> list[int]:
    # prefix[i] holds the sum of the first i readings (prefix[0] = 0
    # is the empty prefix, so ranges starting at day 0 need no special case).
    prefix = [0] * (len(readings) + 1)
    for i, kwh in enumerate(readings):
        prefix[i + 1] = prefix[i] + kwh

    totals = []
    for start, end in queries:
        # Everything up to and including 'end', minus everything before 'start'.
        totals.append(prefix[end + 1] - prefix[start])
    return totals
`,
        commentary: `
The naive approach re-walks each queried range: with \`n\` readings and \`m\` queries that is \`O(n * m)\` in the worst case — 10^10 additions at the stated limits.

The fix is to notice that every range sum is a **difference of two running totals**: the total of days \`[start, end]\` equals (everything up to \`end\`) minus (everything before \`start\`). So we spend one \`O(n)\` pass building \`prefix\`, where \`prefix[i]\` is the sum of the first \`i\` readings, and after that each query is a single subtraction.

The leading zero matters more than it looks: \`prefix\` has length \`n + 1\` and \`prefix[0] = 0\` stands for the empty prefix. That is what lets \`prefix[end + 1] - prefix[start]\` handle \`start = 0\` identically to every other start — no branch, no bug. Negative readings need no special treatment because subtraction of running totals is exact regardless of sign. An empty farm with an empty query batch falls straight through to \`[]\`.
`,
        complexity: 'Time O(n + m) for n readings and m queries, Space O(n)',
      },
      testCases: [
        { input: [[5, 2, 7, 1, 4], [[0, 2], [1, 3], [4, 4]]], expected: [14, 10, 4], label: 'basic batch' },
        { input: [[3], [[0, 0]]], expected: [3], label: 'single day' },
        {
          input: [[5, 2, 7, 1, 4], [[2, 2], [0, 4], [0, 0], [3, 4]]],
          expected: [7, 19, 5, 5],
          label: 'overlapping queries incl. full range',
        },
        { input: [[], []], expected: [], hidden: true, label: 'empty farm, empty batch' },
        { input: [[2, 2, 2, 2], [[0, 3], [1, 2]]], expected: [8, 4], hidden: true, label: 'all-equal readings' },
        {
          input: [[-4, 6, -2, 9], [[0, 1], [0, 3], [2, 3]]],
          expected: [2, 9, 7],
          hidden: true,
          label: 'negative net days',
        },
        {
          input: [[1000000000, 1000000000, 1000000000], [[0, 2]]],
          expected: [3000000000],
          hidden: true,
          label: 'large values, no overflow in Python',
        },
        { input: [[1, 2, 3], [[0, 2], [0, 2], [0, 2]]], expected: [6, 6, 6], hidden: true, label: 'repeated query' },
      ],
      furtherPractice: [
        { name: 'LeetCode 303. Range Sum Query - Immutable', note: 'the same idea wrapped in a class' },
        { name: 'LeetCode 1480. Running Sum of 1d Array', note: 'just the build step' },
      ],
    },
    {
      id: 'ledger-spans',
      title: 'Settled Spans in the Ledger',
      difficulty: 'medium',
      statement: `
A neighborhood savings co-op records one integer per day: the net cash movement (deposits positive, withdrawals negative; a quiet day logs 0). The annual audit asks a pointed question: **how many contiguous spans of days net to exactly \`k\` cents?**

Given the list \`movements\` and the integer \`k\`, return the number of contiguous, non-empty spans of days whose movements sum to exactly \`k\`. Two spans are different if they start or end on different days, even when they contain the same values.

The ledger can hold a year of high-frequency activity, so checking every span individually is off the table.
`,
      examples: [
        {
          input: 'movements = [1, 1, 1], k = 2',
          output: '2',
          explanation: 'Days 0–1 and days 1–2 each net exactly 2. The full span nets 3.',
        },
        {
          input: 'movements = [3, 4, 7, 2, -3, 1, 4, 2], k = 7',
          output: '4',
          explanation: 'Four spans net exactly 7: days 0–1 (3+4), day 2 alone (7), days 2–5 (7+2-3+1), and days 5–7 (1+4+2).',
        },
        {
          input: 'movements = [1, -1, 0], k = 0',
          output: '3',
          explanation: 'Spans 0–1 (1-1), 0–2 (1-1+0), and 2–2 (0) net zero. Cancellation means negatives matter.',
        },
      ],
      constraints: [
        '0 <= len(movements) <= 100_000',
        '-10^4 <= movements[i] <= 10^4',
        '-10^9 <= k <= 10^9',
        'Spans must be contiguous and non-empty',
      ],
      hints: [
        'A sliding window looks tempting, but withdrawals are negative: growing a span can shrink its total, so "too big, shrink the window" reasoning falls apart. What would your scan need to know about everything seen so far instead?',
        'Express any span as a difference of running totals from day 0: total(0..end) - total(0..start-1). A span ending today nets k exactly when some earlier running total equals today\'s running total minus k.',
        'One pass with a dict counting occurrences of each running total, seeded {0: 1} for the empty prefix. Each day: running += x, add seen[running - k] to the answer, then increment seen[running]. The lookup must happen before the insert.',
      ],
      functionName: 'count_settled_spans',
      starterCode: `def count_settled_spans(movements: list[int], k: int) -> int:
    pass
`,
      solution: {
        code: `def count_settled_spans(movements: list[int], k: int) -> int:
    # seen[t] = how many prefixes (so far) have running total t.
    # The empty prefix has total 0 — without this seed, spans that
    # start on day 0 would never be counted.
    seen = {0: 1}
    running = 0  # running total of movements[0..i]
    count = 0
    for delta in movements:
        running += delta
        # A span ending today nets k iff it started right after some
        # earlier prefix whose total was (running - k).
        count += seen.get(running - k, 0)
        # Record today's prefix AFTER counting, so a span never
        # matches against itself when k == 0.
        seen[running] = seen.get(running, 0) + 1
    return count
`,
        commentary: `
Brute force enumerates all \`O(n^2)\` spans. The structural insight: a span \`[start, end]\` nets \`k\` exactly when \`prefix(end) - prefix(start - 1) = k\`, i.e. when the running total just *before* the span equals \`running - k\` at the span's end. So instead of enumerating starts, we **count** them: walking left to right, the dict \`seen\` records how many prefixes have produced each running total, and every day we ask "how many earlier prefixes equal \`running - k\`?" Each match is a distinct valid span ending today.

Two details carry the correctness. First, \`seen = {0: 1}\`: the empty prefix (before day 0) has total 0, and it is the start marker for every span beginning on day 0 — drop it and \`[5]\` with \`k = 5\` returns 0 instead of 1. Second, the lookup happens **before** inserting today's total; otherwise a zero-length "span" would match itself whenever \`k = 0\`.

Why not a sliding window? Windows rely on monotonicity — extend grows the sum, shrink reduces it. Negative movements destroy that: the right answer might require growing *through* a dip. The hash map sidesteps the issue entirely because it never assumes anything about sign.
`,
        complexity: 'Time O(n), Space O(n)',
      },
      testCases: [
        { input: [[1, 1, 1], 2], expected: 2, label: 'overlapping spans' },
        { input: [[3, 4, 7, 2, -3, 1, 4, 2], 7], expected: 4, label: 'mixed signs' },
        { input: [[1, -1, 0], 0], expected: 3, label: 'cancellation to zero' },
        { input: [[5], 5], expected: 1, label: 'single day exact match' },
        { input: [[], 5], expected: 0, hidden: true, label: 'empty ledger' },
        { input: [[0, 0, 0, 0], 0], expected: 10, hidden: true, label: 'all zeros: n(n+1)/2 spans' },
        { input: [[-2, -3, 5, -5, 5], 0], expected: 4, hidden: true, label: 'negative-heavy ledger' },
        { input: [[2, 2, 2], 10], expected: 0, hidden: true, label: 'k larger than any span' },
      ],
      furtherPractice: [
        { name: 'LeetCode 560. Subarray Sum Equals K', note: 'the canonical form of this trick' },
        { name: 'LeetCode 525. Contiguous Array', note: 'same skeleton, map stores first index instead of count' },
        { name: 'LeetCode 974. Subarray Sums Divisible by K', note: 'key the map on running total mod k' },
      ],
    },
    {
      id: 'hinge-day',
      title: 'The Hinge Day',
      difficulty: 'medium',
      statement: `
An indie studio tracks daily net revenue for its game — refunds and chargebacks make some days negative. For the post-mortem they want the **hinge day**: a day where the total revenue earned strictly *before* it equals the total earned strictly *after* it (the hinge day's own revenue belongs to neither side).

Given the list \`revenue\`, return the index of the **leftmost** hinge day, or \`-1\` if no day qualifies.

Edge conventions: an empty side sums to 0, so for a one-day launch the single day is always the hinge (both sides are empty).
`,
      examples: [
        {
          input: 'revenue = [4, 1, 6, 5]',
          output: '2',
          explanation: 'Before day 2: 4+1 = 5. After day 2: 5. The 6 on the hinge day itself is excluded from both sides.',
        },
        {
          input: 'revenue = [1, 2, 3]',
          output: '-1',
          explanation: 'No split works: (0 vs 5), (1 vs 3), (3 vs 0). Return -1.',
        },
        {
          input: 'revenue = [5]',
          output: '0',
          explanation: 'Both sides are empty (0 == 0), so day 0 is the hinge.',
        },
      ],
      constraints: [
        '0 <= len(revenue) <= 100_000',
        '-10^6 <= revenue[i] <= 10^6',
        'Return the leftmost qualifying index, or -1 if none exists',
      ],
      hints: [
        'For a fixed candidate day d you are comparing two quantities. As d slides one step right, how does each side change? Notice that neither side needs to be re-summed from scratch.',
        'You never need the right-hand sum independently: if you know the grand total and the sum of everything left of d, the right side is total - left - revenue[d].',
        'Compute total = sum(revenue) once. Sweep d from 0 keeping a running left sum; return the first d where left == total - left - revenue[d], adding revenue[d] to left only after the check fails. Fall out of the loop with -1.',
      ],
      functionName: 'find_hinge_day',
      starterCode: `def find_hinge_day(revenue: list[int]) -> int:
    pass
`,
      solution: {
        code: `def find_hinge_day(revenue: list[int]) -> int:
    # One pass to get the grand total; we never need a stored prefix
    # array because the sweep maintains the left sum incrementally.
    total = sum(revenue)

    left = 0  # sum of revenue[0..d-1], i.e. strictly before day d
    for d, amount in enumerate(revenue):
        # Right side = everything minus the left side minus the hinge itself.
        if left == total - left - amount:
            return d  # first match is the leftmost by construction
        left += amount  # day d now belongs to the left side
    return -1  # no split balances
`,
        commentary: `
The brute force re-sums both sides for every candidate day — \`O(n^2)\`. But the two sides are not independent: they always add up to \`total - revenue[d]\`. So one number (\`total\`, computed once) plus one accumulator (\`left\`, updated by a single addition per step) fully determines the right side as \`total - left - revenue[d]\`. This is prefix sums stripped to its minimum — we exploit the *running total* idea without materializing the table, which drops the extra space from \`O(n)\` to \`O(1)\`.

Order of operations is the subtle part: check the balance condition **before** folding \`revenue[d]\` into \`left\`, because the hinge day's own revenue belongs to neither side. Returning inside the loop guarantees the *leftmost* answer.

The edge cases follow from the conventions rather than fighting them: an empty list never enters the loop (\`-1\`); a single day checks \`0 == total - 0 - total\`, which is true, so index 0 comes back; and negatives need no special handling because the identity \`left + amount + right = total\` holds for any signs.
`,
        complexity: 'Time O(n), Space O(1)',
      },
      testCases: [
        { input: [[4, 1, 6, 5]], expected: 2, label: 'hinge in the middle' },
        { input: [[1, 2, 3]], expected: -1, label: 'no balance point' },
        { input: [[5]], expected: 0, label: 'single day: both sides empty' },
        { input: [[0, 0]], expected: 0, hidden: true, label: 'tie-break: leftmost of several hinges' },
        { input: [[]], expected: -1, hidden: true, label: 'empty timeline' },
        { input: [[2, -2, 0, -2, 2]], expected: 2, hidden: true, label: 'negatives balance the sides' },
        { input: [[3, 3, 3]], expected: 1, hidden: true, label: 'all equal, odd length' },
        { input: [[3, 3, 3, 3]], expected: -1, hidden: true, label: 'all equal, even length' },
      ],
      furtherPractice: [
        { name: 'LeetCode 724. Find Pivot Index', note: 'the classic statement of this problem' },
        { name: 'LeetCode 1991. Find the Middle Index in Array', note: 'identical mechanics' },
      ],
    },
    {
      id: 'moisture-grid',
      title: 'Moisture Map Queries',
      difficulty: 'hard',
      statement: `
An agronomy drone surveys a field and produces a grid of \`R\` rows and \`C\` columns. Each cell holds an integer moisture score relative to the crop's baseline — positive means wetter than baseline, negative means drier.

The irrigation planner then fires off a batch of rectangle queries. Each query is \`[r1, c1, r2, c2]\` (0-indexed, **all bounds inclusive**) naming the top-left cell \`(r1, c1)\` and bottom-right cell \`(r2, c2)\` of a candidate irrigation zone. For each query, the planner needs the total moisture score inside the rectangle.

Given \`grid\` and \`queries\`, return a list with the total for each query, **in the same order as the queries**. Batches routinely contain tens of thousands of heavily overlapping rectangles over the same survey, so per-query cell-by-cell summation will not finish in time.
`,
      examples: [
        {
          input: 'grid = [[3, 0, 1, 4], [5, 6, 3, 2], [1, 2, 0, 1]], queries = [[0, 0, 1, 1], [1, 1, 2, 3]]',
          output: '[14, 14]',
          explanation:
            'First rectangle covers 3+0+5+6 = 14. Second covers rows 1–2, columns 1–3: 6+3+2 + 2+0+1 = 14.',
        },
        {
          input: 'grid = [[7]], queries = [[0, 0, 0, 0]]',
          output: '[7]',
          explanation: 'A one-cell field; the rectangle is that single cell.',
        },
        {
          input: 'grid = [[-1, 2], [3, -4]], queries = [[0, 0, 1, 1], [0, 1, 1, 1]]',
          output: '[0, -2]',
          explanation: 'Negative (dry) cells subtract: the whole field nets -1+2+3-4 = 0; the right column nets 2-4 = -2.',
        },
      ],
      constraints: [
        '1 <= R, C <= 300',
        '-10^4 <= grid[r][c] <= 10^4',
        '0 <= len(queries) <= 100_000',
        'Every query satisfies 0 <= r1 <= r2 < R and 0 <= c1 <= c2 < C',
        'Results must be returned in query order',
      ],
      hints: [
        'Summing cell by cell costs O(area) per query, and the rectangles overlap heavily. Look for a one-time precomputation that makes each query\'s cost independent of its area.',
        'Precompute P[r][c] = total of the rectangle from the origin (0,0) down to cell (r-1, c-1). Any query rectangle is then a combination of four entries of P: the big corner, minus the strip above, minus the strip to the left, plus the piece you removed twice.',
        'Build with P[r+1][c+1] = grid[r][c] + P[r][c+1] + P[r+1][c] - P[r][c] (a padded (R+1) x (C+1) table). Answer [r1,c1,r2,c2] as P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1].',
      ],
      functionName: 'moisture_totals',
      starterCode: `def moisture_totals(grid: list[list[int]], queries: list[list[int]]) -> list[int]:
    pass
`,
      solution: {
        code: `def moisture_totals(grid: list[list[int]], queries: list[list[int]]) -> list[int]:
    rows = len(grid)
    cols = len(grid[0]) if rows else 0

    # Padded summed-area table: P[r][c] = sum of grid[0..r-1][0..c-1].
    # The extra zero row and column mean queries touching the top or
    # left edge need no special-casing.
    P = [[0] * (cols + 1) for _ in range(rows + 1)]
    for r in range(rows):
        for c in range(cols):
            # Current cell, plus the rectangle above, plus the rectangle
            # to the left, minus their overlap (counted twice).
            P[r + 1][c + 1] = grid[r][c] + P[r][c + 1] + P[r + 1][c] - P[r][c]

    totals = []
    for r1, c1, r2, c2 in queries:
        # Inclusion-exclusion: big corner, cut the strip above (P[r1][...])
        # and the strip to the left (P[...][c1]), then restore the top-left
        # block that both cuts removed.
        total = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]
        totals.append(total)
    return totals
`,
        commentary: `
This is the 1D prefix idea lifted into two dimensions. In 1D, a range is "everything up to the right edge minus everything before the left edge." In 2D, rectangles overlap in two directions at once, so a single subtraction is not enough — we need **inclusion–exclusion** over four origin-anchored rectangles.

Define \`P[r][c]\` as the total of the rectangle from \`(0,0)\` to \`(r-1, c-1)\`. The build recurrence mirrors the query: the rectangle ending at a cell equals that cell, plus the rectangle above, plus the rectangle to the left, minus the overlap that both contributions counted (\`P[r][c]\`). Each entry costs \`O(1)\`, so the table is \`O(R*C)\` to build.

A query \`[r1, c1, r2, c2]\` then carves its rectangle out of \`P[r2+1][c2+1]\`: subtract the strip of rows above \`r1\` and the strip of columns left of \`c1\`. Those two strips share the block above-and-left of the rectangle — it has been subtracted twice, so add \`P[r1][c1]\` back once. Forgetting that final add-back is *the* classic summed-area bug, and it stays hidden until a query is away from both edges.

The padding (an extra zero row and column) is the 2D version of the leading zero in 1D: queries touching row 0 or column 0 hit the zero border instead of needing branches. With the table in place, 100k queries cost 100k constant-time lookups instead of up to 100k × 90,000 cell additions.
`,
        complexity: 'Time O(R*C + Q), Space O(R*C)',
      },
      testCases: [
        {
          input: [
            [
              [3, 0, 1, 4],
              [5, 6, 3, 2],
              [1, 2, 0, 1],
            ],
            [
              [0, 0, 1, 1],
              [1, 1, 2, 3],
              [2, 0, 2, 0],
            ],
          ],
          expected: [14, 14, 1],
          label: 'basic batch with single-cell query',
        },
        { input: [[[7]], [[0, 0, 0, 0]]], expected: [7], label: 'one-cell field' },
        {
          input: [
            [
              [3, 0, 1, 4],
              [5, 6, 3, 2],
              [1, 2, 0, 1],
            ],
            [[0, 0, 2, 3]],
          ],
          expected: [28],
          label: 'whole-field query',
        },
        {
          input: [
            [
              [1, 2],
              [3, 4],
            ],
            [],
          ],
          expected: [],
          label: 'empty query batch',
        },
        {
          input: [
            [
              [-1, 2],
              [3, -4],
            ],
            [
              [0, 0, 1, 1],
              [0, 1, 1, 1],
              [1, 0, 1, 0],
            ],
          ],
          expected: [0, -2, 3],
          hidden: true,
          label: 'dry (negative) cells',
        },
        {
          input: [
            [
              [2, 2, 2],
              [2, 2, 2],
              [2, 2, 2],
            ],
            [
              [0, 0, 2, 2],
              [1, 1, 2, 2],
              [0, 0, 0, 2],
            ],
          ],
          expected: [18, 8, 6],
          hidden: true,
          label: 'all-equal field',
        },
        {
          input: [[[1, 2, 3, 4, 5]], [[0, 1, 0, 3], [0, 0, 0, 4], [0, 4, 0, 4]]],
          expected: [9, 15, 5],
          hidden: true,
          label: 'single-row field degenerates to 1D',
        },
        {
          input: [[[2], [4], [6]], [[0, 0, 2, 0], [1, 0, 2, 0]]],
          expected: [12, 10],
          hidden: true,
          label: 'single-column field',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 304. Range Sum Query 2D - Immutable', note: 'the canonical class-based version' },
        { name: 'LeetCode 1314. Matrix Block Sum', note: 'build the table, then query a window around every cell' },
        { name: 'LeetCode 1292. Maximum Side Length of a Square with Sum ≤ Threshold', note: '2D prefix + binary search' },
      ],
    },
    {
      id: 'lighting-cues',
      title: 'Plotting the Light Rig',
      difficulty: 'easy',
      statement: `
You program the lighting console for a black-box theater. The rig is a single row of \`n\` LED fixtures, numbered \`0\` to \`n - 1\`, and every fixture's trim level starts the session at \`0\`. During plotting, the designer calls out cues; each cue is a triple \`[left, right, delta]\` meaning every fixture from \`left\` to \`right\` (**both inclusive**) has its trim adjusted by \`delta\` — positive to brighten, negative to pull back. A negative final trim is fine: trims are offsets from the board's house default, not absolute outputs.

Cues are only *recorded* during plotting; nothing is rendered until the session ends. Given \`n\` and the list \`cues\`, return a list of length \`n\` with each fixture's final trim level, **in fixture order**.

A long session can log a hundred thousand cues, each sweeping nearly the whole rig — walking every fixture per cue will not keep up.
`,
      examples: [
        {
          input: 'n = 5, cues = [[1, 3, 4], [2, 4, -1]]',
          output: '[0, 4, 3, 3, -1]',
          explanation: 'The first cue raises fixtures 1–3 to 4. The second pulls fixtures 2–4 down by 1.',
        },
        {
          input: 'n = 3, cues = []',
          output: '[0, 0, 0]',
          explanation: 'No cues recorded; every fixture stays at its starting trim of 0.',
        },
        {
          input: 'n = 4, cues = [[0, 3, 2], [0, 0, 5]]',
          output: '[7, 2, 2, 2]',
          explanation: 'A whole-rig wash of +2, then +5 on fixture 0 alone: 2 + 5 = 7 for fixture 0.',
        },
      ],
      constraints: [
        '1 <= n <= 100_000',
        '0 <= len(cues) <= 100_000',
        'Every cue [left, right, delta] satisfies 0 <= left <= right < n',
        '-10^6 <= delta <= 10^6',
        'All fixtures start at trim level 0',
      ],
      hints: [
        'Replaying each cue across its whole range is up to 10^10 writes. Notice that nobody reads a single trim level until plotting ends — so you are free to reorganize the work. What is the smallest piece of information one cue actually adds?',
        'A cue [left, right, delta] changes the fixture-to-fixture profile in exactly two places: the level steps UP by delta entering fixture left and steps DOWN by delta just past fixture right. Record only those two boundary marks per cue.',
        'Keep diff of length n + 1. For each cue: diff[left] += delta and diff[right + 1] -= delta. After all cues, one prefix-sum pass over the first n entries of diff reconstructs every final trim — O(n + cues) total.',
      ],
      functionName: 'final_brightness',
      starterCode: `def final_brightness(n: int, cues: list[list[int]]) -> list[int]:
    pass
`,
      solution: {
        code: `def final_brightness(n: int, cues: list[list[int]]) -> list[int]:
    # diff[i] holds the CHANGE in trim stepping from fixture i-1 to i.
    # The extra slot means the "step back down" write at right + 1 is
    # always in range, even for a cue ending at the last fixture.
    diff = [0] * (n + 1)
    for left, right, delta in cues:
        diff[left] += delta       # level steps up by delta entering 'left'...
        diff[right + 1] -= delta  # ...and back down just past 'right'.

    # The trims are the running totals of the recorded steps: a single
    # prefix-sum pass re-integrates the difference array.
    levels = []
    running = 0
    for i in range(n):
        running += diff[i]
        levels.append(running)
    return levels
`,
        commentary: `
This is prefix sums run **in reverse**. The range-query problems in this module read many ranges from static data, so they precompute cumulative totals. Here the workload is flipped — many range *writes*, then one read of the final state — so we store the rig in *derivative* form instead: \`diff[i]\` records only how the trim changes stepping from fixture \`i - 1\` to fixture \`i\`. In that representation, a cue sweeping thousands of fixtures is two O(1) boundary writes: step up by \`delta\` at \`left\`, step back down just past \`right\`.

The closing prefix-sum pass is what makes the shortcut legal: summing the steps left to right re-integrates the derivative, and because addition commutes, recording cues as boundary marks in any order yields exactly what replaying them faithfully would. Deferring that single O(n) integration until all cues are in is the whole win — O(n + c) instead of O(n × c).

The \`n + 1\` length on \`diff\` mirrors the leading zero of a prefix table: a cue ending at the last fixture writes to \`diff[n]\`, which exists precisely so no cue needs a bounds check. And the pattern's usual limitation holds in mirror image too — if reads and writes *interleave*, the deferred integration breaks down, and you are back in Fenwick/segment-tree territory.
`,
        complexity: 'Time O(n + c) for c cues, Space O(n)',
      },
      testCases: [
        { input: [5, [[1, 3, 4], [2, 4, -1]]], expected: [0, 4, 3, 3, -1], label: 'two overlapping cues' },
        { input: [3, []], expected: [0, 0, 0], label: 'no cues' },
        { input: [4, [[0, 3, 2], [0, 0, 5]]], expected: [7, 2, 2, 2], label: 'whole-rig wash plus a special' },
        { input: [1, [[0, 0, 10], [0, 0, -4]]], expected: [6], hidden: true, label: 'single fixture' },
        {
          input: [6, [[0, 5, 1], [0, 5, 1], [0, 5, 1]]],
          expected: [3, 3, 3, 3, 3, 3],
          hidden: true,
          label: 'repeated full-range cues',
        },
        { input: [5, [[4, 4, 9]]], expected: [0, 0, 0, 0, 9], hidden: true, label: 'cue ending at the last fixture' },
        {
          input: [5, [[0, 2, 3], [2, 4, 3], [1, 3, -6]]],
          expected: [3, -3, 0, -3, 3],
          hidden: true,
          label: 'negative trims after a pullback cue',
        },
        {
          input: [2, [[0, 1, 1000000], [0, 1, 1000000]]],
          expected: [2000000, 2000000],
          hidden: true,
          label: 'large deltas',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 1109. Corporate Flight Bookings', note: 'the same recording trick over seat ranges' },
        { name: 'LeetCode 370. Range Addition', note: 'the pattern in its purest form' },
      ],
    },
    {
      id: 'pedal-bypass',
      title: 'Pedalboard Bypass Test',
      difficulty: 'medium',
      statement: `
A session guitarist's pedalboard chains \`n\` effects pedals in series. On the shop's test rig, each pedal \`i\` multiplies the signal by an integer gain \`gains[i]\` — negative gains flip the signal's phase, and a dead pedal mutes everything with a gain of \`0\`.

To chase down a muddy tone, the tech runs a bypass test: for every pedal, measure what the whole chain's gain *would be* with that one pedal lifted out and all the others left in place. Return a list \`result\` where \`result[i]\` is the product of every gain except \`gains[i]\`, **in pedal order**.

One rule from the bench: the obvious shortcut — total product divided by \`gains[i]\` — dies the moment a dead pedal shows up, so your routine must not use division.
`,
      examples: [
        {
          input: 'gains = [2, 3, 4, 5]',
          output: '[60, 40, 30, 24]',
          explanation: 'Bypassing pedal 0 leaves 3*4*5 = 60; bypassing pedal 3 leaves 2*3*4 = 24.',
        },
        {
          input: 'gains = [4, 0, 2]',
          output: '[0, 8, 0]',
          explanation:
            'The dead pedal zeroes every measurement that still includes it; only bypassing the dead pedal itself (4*2 = 8) restores signal.',
        },
        {
          input: 'gains = [-1, 2, -3]',
          output: '[-6, 3, -2]',
          explanation: 'Phase-flipping pedals multiply like any sign: bypassing pedal 1 leaves -1 * -3 = 3.',
        },
      ],
      constraints: [
        '2 <= len(gains) <= 100_000',
        '-30 <= gains[i] <= 30 (zero means a dead pedal)',
        'Division must not be used — gains can be 0',
        'Return the measurements in pedal order',
      ],
      hints: [
        'Dividing the grand product by each gain collapses when any pedal is dead (gain 0) — yet every bypass measurement is still perfectly well-defined. Forget the grand product: which pedals actually contribute to result[i]?',
        'result[i] = (product of all gains left of i) × (product of all gains right of i). Each of those families — every left-product, every right-product — has a running structure you can generate incrementally in one directional sweep.',
        'Pass 1 (left to right): write into result[i] the running product of everything before i, starting from 1. Pass 2 (right to left): multiply result[i] by a running product of everything after i. Two passes, no division, zeros fall out naturally.',
      ],
      functionName: 'bypass_gains',
      starterCode: `def bypass_gains(gains: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `def bypass_gains(gains: list[int]) -> list[int]:
    n = len(gains)
    result = [1] * n

    # Left-to-right sweep: result[i] = product of all gains BEFORE pedal i.
    # 'before' starts at 1 — the empty product, prefix-sums' leading zero
    # translated into multiplication.
    before = 1
    for i in range(n):
        result[i] = before
        before *= gains[i]

    # Right-to-left sweep: fold in the product of all gains AFTER pedal i.
    after = 1
    for i in range(n - 1, -1, -1):
        result[i] *= after
        after *= gains[i]

    return result
`,
        commentary: `
\`result[i]\` factors cleanly into two independent pieces: everything to the pedal's left and everything to its right. Both families have prefix structure — the left-product at \`i + 1\` is the left-product at \`i\` times \`gains[i]\` — so one forward sweep generates every "product before me" and one backward sweep every "product after me". Writing the first sweep straight into the output and multiplying the second sweep into it keeps extra space at O(1) beyond the answer itself.

Why not divide the grand product by each gain? Zeros. A dead pedal makes the grand product 0 and the division meaningless, yet the bypass measurements remain well-defined — bypassing the dead pedal itself may bring the whole signal back. The two-sweep method never needs the inverse of anything, so zeros simply propagate correctly: one zero in the chain zeroes every slot except its own, and two zeros zero everything.

Structurally this is the hinge-day idea — left context plus right context determines the answer at each index — but under multiplication the right side is *not* recoverable from a single grand total (you cannot "subtract" a factor), so the suffix genuinely must be swept separately. That is the tell for prefix/suffix problems: whenever the combine operation lacks a safe inverse, precompute both directions.
`,
        complexity: 'Time O(n), Space O(1) beyond the output list',
      },
      testCases: [
        { input: [[2, 3, 4, 5]], expected: [60, 40, 30, 24], label: 'all positive gains' },
        { input: [[4, 0, 2]], expected: [0, 8, 0], label: 'one dead pedal' },
        { input: [[-1, 2, -3]], expected: [-6, 3, -2], label: 'phase-flipping gains' },
        { input: [[0, 0, 5]], expected: [0, 0, 0], hidden: true, label: 'two dead pedals zero everything' },
        { input: [[7, 1]], expected: [1, 7], hidden: true, label: 'minimum chain length' },
        { input: [[1, 1, 1, 1, 1]], expected: [1, 1, 1, 1, 1], hidden: true, label: 'unity gains' },
        { input: [[3, -2, 0, 4]], expected: [0, 0, -24, 0], hidden: true, label: 'dead pedal among mixed signs' },
        { input: [[10, 10, 10]], expected: [100, 100, 100], hidden: true, label: 'equal gains' },
      ],
      furtherPractice: [
        { name: 'LeetCode 238. Product of Array Except Self', note: 'the canonical statement of this exact trick' },
        { name: 'LeetCode 2256. Minimum Average Difference', note: 'prefix/suffix split with sums instead of products' },
      ],
    },
    {
      id: 'pantry-level-stretch',
      title: 'Back Where We Started',
      difficulty: 'medium',
      statement: `
A food bank logs one integer per day for its canned-goods shelf: the net change in cans that day (donations arriving minus parcels going out; a closed day logs \`0\`). For the annual impact report, the coordinator wants the longest stretch the shelf "held its level" — the maximum length of a contiguous run of days whose net changes sum to exactly zero, meaning the shelf ended that run at precisely the count it started with.

Given the list \`changes\`, return the length of the longest such run, or \`0\` if no non-empty run nets to zero.

A year of daily logs is small, but the food bank federates logs across hundreds of branches — your routine will be called on inputs up to 100,000 days, so checking every run individually is out.
`,
      examples: [
        {
          input: 'changes = [3, -1, -2, 5]',
          output: '3',
          explanation: 'Days 0–2 net 3 - 1 - 2 = 0, a run of length 3. Day 3 breaks the balance; no longer run nets zero.',
        },
        {
          input: 'changes = [4, 5]',
          output: '0',
          explanation: 'Every run has a positive total; nothing nets to zero, so the answer is 0.',
        },
        {
          input: 'changes = [5, -5, 5, -5]',
          output: '4',
          explanation: 'The whole log nets zero: the shelf ends exactly where it began, a run of length 4.',
        },
      ],
      constraints: [
        '0 <= len(changes) <= 100_000',
        '-10^4 <= changes[i] <= 10^4',
        'A qualifying run must be contiguous and non-empty; return 0 if none exists',
      ],
      hints: [
        'A sliding window fails here — outgoing parcels make changes negative, so growing a run can move its total in either direction. Step back from the runs themselves and watch the shelf count evolve day by day. What does a zero-net run look like in terms of that evolving count?',
        'The cumulative count after day j equals the cumulative count after day i exactly when the run covering days i+1..j nets zero. So the answer is the farthest-apart PAIR of equal running totals.',
        'One pass with a dict mapping each running total to the FIRST index it appeared, seeded {0: -1} for the empty prefix. On a repeat at index i, a zero-net run of length i - first_seen[running] ends here. Never overwrite an earlier index — the earliest start gives the longest run.',
      ],
      functionName: 'longest_level_stretch',
      starterCode: `def longest_level_stretch(changes: list[int]) -> int:
    pass
`,
      solution: {
        code: `def longest_level_stretch(changes: list[int]) -> int:
    # first_seen[t] = earliest prefix index whose running total is t.
    # Index -1 stands for the empty prefix (before day 0), total 0.
    first_seen = {0: -1}
    running = 0
    best = 0
    for i, delta in enumerate(changes):
        running += delta
        if running in first_seen:
            # The shelf is back at a level it has held before: everything
            # since that earlier moment cancels to exactly zero.
            best = max(best, i - first_seen[running])
        else:
            # Record only the FIRST occurrence — a later duplicate could
            # only start a shorter run, so the earliest index is optimal.
            first_seen[running] = i
    return best
`,
        commentary: `
Re-summing all O(n^2) runs is hopeless at 10^5 days. The pivot is to stop looking at runs and start looking at the **running total** — the shelf's cumulative drift after each day. A run nets zero exactly when the drift at its right end equals the drift just before its left end: whatever happened in between canceled out. The problem therefore reduces to: *over all pairs of equal running totals, which pair is farthest apart?*

A dict answers that in one pass. For each running total we store only the **first** index where it appeared; when the same total resurfaces at index \`i\`, the run between the two sightings nets zero and has length \`i - first_seen[running]\`. Never overwriting is the subtle correctness point — replacing the stored index with a later one could only shorten future runs. Contrast this with the count-spans problem earlier in the module: there the map stores *counts* because every earlier occurrence contributes a span; here only the extreme pair matters, so the map stores *first positions*. Same skeleton, different payload — that swap is the most reusable idea in the prefix-map family.

The seed \`{0: -1}\` is the empty prefix in 1D clothing: the shelf's drift was 0 before day 0, so a run covering days 0 through \`i\` scores \`i - (-1)\`. Drop the seed and the single-day log \`[0]\` answers 0 instead of 1.
`,
        complexity: 'Time O(n), Space O(n)',
      },
      testCases: [
        { input: [[3, -1, -2, 5]], expected: 3, label: 'balanced run at the start' },
        { input: [[4, 5]], expected: 0, label: 'no zero-net run' },
        { input: [[5, -5, 5, -5]], expected: 4, label: 'whole log balances' },
        { input: [[]], expected: 0, hidden: true, label: 'empty log' },
        { input: [[0]], expected: 1, hidden: true, label: 'single closed day is a run of length 1' },
        { input: [[2, -2, 3, 1, -4, 6]], expected: 5, hidden: true, label: 'longest run hides mid-log' },
        { input: [[1, 2, 3]], expected: 0, hidden: true, label: 'strictly growing shelf' },
        { input: [[-3, 1, 1, 1]], expected: 4, hidden: true, label: 'deficit repaid by the last day' },
      ],
      furtherPractice: [
        { name: 'LeetCode 325. Maximum Size Subarray Sum Equals k', note: 'same first-index map with a nonzero target' },
        { name: 'LeetCode 525. Contiguous Array', note: 'map 0s to -1 and it becomes this exact problem' },
      ],
    },
    {
      id: 'trivia-band',
      title: 'Streaks in the Scoring Band',
      difficulty: 'medium',
      statement: `
A pub-trivia league reviews each match from its score sheet: round \`i\` changed the team's score by \`points[i]\` (bonuses positive, penalties negative). The league's stats columnist defines a *streak* as any non-empty run of consecutive rounds, and wants to know how many streaks landed inside the night's "respectable band": a total between \`lo\` and \`hi\`, **both inclusive**.

Given \`points\`, \`lo\`, and \`hi\`, return the number of streaks whose totals fall within \`[lo, hi]\`. Two streaks are distinct if they begin or end at different rounds, even when they contain identical values.

Score sheets are short — at most a couple thousand rounds — so examining every (start, end) pair is acceptable, **provided each pair is checked in constant time**. Re-adding every streak from scratch is not.
`,
      examples: [
        {
          input: 'points = [2, -1, 3], lo = 1, hi = 3',
          output: '4',
          explanation:
            'Qualifying streaks: [2] (total 2), [2,-1] (1), [-1,3] (2), [3] (3). The full match nets 4 — just above the band — and [-1] sits below it.',
        },
        {
          input: 'points = [1, 1, 1], lo = 2, hi = 2',
          output: '2',
          explanation: 'Only rounds 0–1 and rounds 1–2 total exactly 2.',
        },
        {
          input: 'points = [-2, -3], lo = -5, hi = -1',
          output: '3',
          explanation: 'A fully negative band: [-2], [-3], and [-2,-3] (total -5) all land inside it.',
        },
      ],
      constraints: [
        '0 <= len(points) <= 2000',
        '-10^4 <= points[i] <= 10^4',
        '-10^8 <= lo <= hi <= 10^8',
        'Streaks must be contiguous and non-empty',
      ],
      hints: [
        'Three nested loops — start, end, re-sum — is O(n^3): around 8 billion steps at n = 2000. The innermost loop is the disposable one: streaks (s, e) and (s, e+1) differ by a single round. What one-time precomputation removes the re-summing entirely?',
        'Every streak total is a difference of two running totals: total(s..e) = prefix[e+1] - prefix[s]. With the table built once, each candidate streak costs one subtraction and one comparison.',
        'Build prefix in O(n), then loop over all (start, end) pairs testing lo <= prefix[end+1] - prefix[start] <= hi. That is about 2 million constant-time checks at n = 2000 — comfortably fast. (At n = 10^5 you would need order statistics over prefixes instead; different fight.)',
      ],
      functionName: 'count_band_streaks',
      starterCode: `def count_band_streaks(points: list[int], lo: int, hi: int) -> int:
    pass
`,
      solution: {
        code: `def count_band_streaks(points: list[int], lo: int, hi: int) -> int:
    n = len(points)
    # prefix[i] = total of the first i rounds; prefix[0] = 0 is the empty
    # prefix, so streaks starting at round 0 need no special case.
    prefix = [0] * (n + 1)
    for i, p in enumerate(points):
        prefix[i + 1] = prefix[i] + p

    count = 0
    # Enumerate every streak; the prefix table makes each one O(1).
    for start in range(n):
        for end in range(start, n):
            total = prefix[end + 1] - prefix[start]
            if lo <= total <= hi:
                count += 1
    return count
`,
        commentary: `
This problem has three natural cost tiers: O(n^3) by re-summing every streak, O(n^2) with precomputed running totals, and O(n log n) with order statistics over prefixes. The constraint \`n <= 2000\` is an explicit invitation to take the middle tier — reading limits to decide *which* tool they permit is the actual skill being exercised here.

The prefix table collapses the innermost loop: \`total(s..e) = prefix[e+1] - prefix[s]\`, so every (start, end) pair becomes one subtraction and two comparisons — roughly 2 million constant-time checks at the limit versus billions of additions for brute force. Note what *doesn't* work: penalties make totals non-monotone in the endpoints, ruling out two-pointer tricks, and the hash-map counting trick from the exact-sum problem cannot serve a *range* of targets \`[lo, hi]\` without iterating over every integer inside it.

For honesty's sake: at n = 10^5 the quadratic pair loop dies, and the real fix counts, for each end, how many earlier prefixes fall in \`[prefix[end+1] - hi, prefix[end+1] - lo]\` using a sorted structure — merge-sort counting or a Fenwick tree. Same prefix insight, heavier machinery. Naming that escalation path in an interview, even while implementing the quadratic version, is exactly the kind of judgment the small constraint is probing for.
`,
        complexity: 'Time O(n^2) after an O(n) build, Space O(n)',
      },
      testCases: [
        { input: [[2, -1, 3], 1, 3], expected: 4, label: 'mixed signs, tight band' },
        { input: [[1, 1, 1], 2, 2], expected: 2, label: 'band collapsed to one value' },
        { input: [[-2, -3], -5, -1], expected: 3, label: 'fully negative band' },
        { input: [[], 0, 10], expected: 0, hidden: true, label: 'empty score sheet' },
        { input: [[0, 0, 0], 0, 0], expected: 6, hidden: true, label: 'all-zero rounds: every streak qualifies' },
        { input: [[5], 6, 10], expected: 0, hidden: true, label: 'band entirely above the only streak' },
        { input: [[3, -3, 4, -4], -1, 1], expected: 4, hidden: true, label: 'cancellations land inside a narrow band' },
        { input: [[10, -10, 10], -100, 100], expected: 6, hidden: true, label: 'wide band captures all streaks' },
      ],
      furtherPractice: [
        { name: 'LeetCode 327. Count of Range Sums', note: 'the large-n version; needs order statistics over prefixes' },
        { name: 'LeetCode 560. Subarray Sum Equals K', note: 'the band collapsed to a point — and suddenly O(n) works' },
      ],
    },
    {
      id: 'sustained-heat',
      title: 'Sustained Heat',
      difficulty: 'hard',
      statement: `
A climate desk flags *sustained* heat events, not one-day spikes. For a weather station you receive \`anomalies\`, where \`anomalies[i]\` is day \`i\`'s temperature departure from the seasonal norm in tenths of a degree (negative on cool days), plus an editorial rule: an event must span **at least** \`min_days\` consecutive days — a single scorching afternoon is weather, not an event.

Return the maximum possible total anomaly over all stretches of at least \`min_days\` consecutive days. The log always has at least \`min_days\` entries, so some stretch qualifies; in a cold season the answer may be negative — report the best qualifying stretch regardless.

Station logs run to 100,000 days, so comparing all stretches pairwise is too slow.
`,
      examples: [
        {
          input: 'anomalies = [3, -5, 4, 2], min_days = 2',
          output: '6',
          explanation:
            'Days 2–3 total 4 + 2 = 6. Day 2 alone scores 4 but is too short to qualify; the full log only nets 4.',
        },
        {
          input: 'anomalies = [-4, -2, -7], min_days = 2',
          output: '-6',
          explanation: 'Every qualifying stretch is negative; days 0–1 (total -6) is the least bad.',
        },
        {
          input: 'anomalies = [1, 2, 3], min_days = 3',
          output: '6',
          explanation: 'Only the full stretch is long enough, so its total of 6 is the answer.',
        },
      ],
      constraints: [
        '1 <= len(anomalies) <= 100_000',
        '1 <= min_days <= len(anomalies)',
        '-10^4 <= anomalies[i] <= 10^4',
      ],
      hints: [
        'The classic "abandon the running sum once it goes negative" instinct breaks here: the minimum-length rule can force the best stretch to carry a cold snap it would rather drop. For a FIXED final day, what would make one allowed starting day better than another?',
        'Express any stretch as prefix[end] - prefix[start]. Fixing end, the total is maximized by the SMALLEST prefix[start] among the allowed starts — exactly those with end - start >= min_days.',
        'Sweep end from min_days to n, maintaining min_prefix = min(prefix[0..end - min_days]); each step admits exactly one new prefix entry into the pool, so the minimum updates in O(1). The answer is the max of prefix[end] - min_prefix over the sweep.',
      ],
      functionName: 'max_sustained_anomaly',
      starterCode: `def max_sustained_anomaly(anomalies: list[int], min_days: int) -> int:
    pass
`,
      solution: {
        code: `def max_sustained_anomaly(anomalies: list[int], min_days: int) -> int:
    n = len(anomalies)
    # prefix[i] = total anomaly of the first i days; prefix[0] = 0 is the
    # empty prefix, which lets stretches anchored at day 0 compete.
    prefix = [0] * (n + 1)
    for i, a in enumerate(anomalies):
        prefix[i + 1] = prefix[i] + a

    best = None             # max total over all qualifying stretches
    min_prefix = prefix[0]  # smallest prefix among currently allowed starts
    for end in range(min_days, n + 1):
        # A stretch ending at day end-1 with length >= min_days may start
        # at any prefix index 0..end - min_days. Stepping end forward
        # admits exactly ONE new start into that pool — fold it in.
        min_prefix = min(min_prefix, prefix[end - min_days])
        candidate = prefix[end] - min_prefix
        if best is None or candidate > best:
            best = candidate
    return best
`,
        commentary: `
Without the length rule this is the classic maximum-subarray problem. With it, the Kadane-style greedy fails: the rule can force the best stretch to *carry* losing days it would otherwise drop, because shrinking below \`min_days\` disqualifies it (the hidden \`[-1, 8, -2, 8, -1]\` case must keep the \`-2\` to join the two 8s).

Prefix sums make the constraint mechanical. Any stretch total is \`prefix[end] - prefix[start]\`, and the length rule is just an index inequality: \`start <= end - min_days\`. Fix \`end\` and the best partner is whichever allowed prefix is **smallest** — so the whole problem becomes a sweep that maintains the minimum of a growing pool of prefixes. The crucial observation is that the pool only ever *grows*: stepping \`end\` forward admits exactly one new start (\`prefix[end - min_days]\`) and evicts none. A growing pool means a single running minimum suffices, updated in O(1) — no heap, no deque. (Add a *maximum*-length rule and the pool would slide, evicting old prefixes; that is when a monotonic deque becomes necessary. Knowing which constraint triggers which machinery is the senior-level discriminator here.)

Initialization carries the edge cases. The empty prefix \`prefix[0] = 0\` is in the pool from the first valid \`end\`, which is how stretches anchored at day 0 compete; and since \`min_days <= n\` is guaranteed, the sweep always produces a candidate, so an all-negative season correctly returns the least-bad qualifying total instead of a fabricated 0. With \`min_days = 1\` the algorithm quietly degenerates into the prefix-min view of maximum subarray — a useful sanity check.
`,
        complexity: 'Time O(n), Space O(n)',
      },
      testCases: [
        { input: [[3, -5, 4, 2], 2], expected: 6, label: 'short hot tail beats the full log' },
        { input: [[-4, -2, -7], 2], expected: -6, label: 'cold season: best answer is negative' },
        { input: [[1, 2, 3], 3], expected: 6, label: 'only the full stretch qualifies' },
        { input: [[2, -1, 2, -1, 5], 1], expected: 7, hidden: true, label: 'min_days = 1 degenerates to max subarray' },
        { input: [[5], 1], expected: 5, hidden: true, label: 'single-day log' },
        {
          input: [[10, -100, 10, 10, 10], 3],
          expected: 30,
          hidden: true,
          label: 'best stretch sits entirely after the crash',
        },
        { input: [[0, 0, 0, 0], 2], expected: 0, hidden: true, label: 'flat season' },
        {
          input: [[-1, 8, -2, 8, -1], 2],
          expected: 14,
          hidden: true,
          label: 'optimal stretch must carry a losing middle day',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 53. Maximum Subarray', note: 'min_days = 1; compare the prefix-min view against Kadane' },
        { name: 'LeetCode 643. Maximum Average Subarray I', note: 'the fixed-length cousin of this sweep' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt:
        'The standard prefix array has length n+1 with prefix[0] = 0, one slot more than the input. What does that extra leading zero buy you?',
      choices: [
        'It stores the grand total so full-array queries skip the subtraction',
        'It lets every range sum — including ranges starting at index 0 — be one uniform subtraction, prefix[r+1] - prefix[l], with no special case',
        'It protects the table against negative values in the input',
        'It halves the memory needed for the table',
      ],
      correctIndex: 1,
      explanation:
        'prefix[0] = 0 represents the empty prefix, so a range starting at l = 0 computes prefix[r+1] - prefix[0] through exactly the same formula as any other range — no branch, no off-by-one. The grand total actually lives at the OTHER end (prefix[n]), negatives need no protection because subtraction is sign-agnostic, and the extra slot slightly increases memory rather than halving it.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt:
        'In the count-subarrays-summing-to-k technique, a dict counts how many times each running total has appeared. Why must it be seeded with {0: 1} before the scan?',
      choices: [
        'Because the running total can never legitimately reach zero',
        'To prevent a KeyError when the dict is empty on the first lookup',
        'The seed represents the empty prefix before index 0, so subarrays that start at the very beginning of the array get counted',
        'It guarantees the function never returns 0',
      ],
      correctIndex: 2,
      explanation:
        'A subarray spanning [0, i] matches when running - k equals the total of the empty prefix, which is 0 — the seed is that empty prefix\'s "vote." Without it, [5] with k = 5 returns 0 instead of 1. The running total can absolutely reach zero (negatives cancel), .get() with a default already avoids KeyErrors, and a correct answer of 0 is perfectly possible (no spans match), so the other choices misdiagnose the seed\'s role.',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt:
        'You build a 1D prefix table over n readings, then answer m range-sum queries. What is the total time for the whole job?',
      choices: ['O(n + m)', 'O(n * m)', 'O(m log n)', 'O((n + m) log n)'],
      correctIndex: 0,
      explanation:
        'The build is one O(n) pass and each query is one O(1) subtraction, so the total is O(n + m). O(n * m) is the naive re-scan the pattern exists to kill. The log-n options describe binary-search or tree-based structures — nothing here searches or balances; queries are direct array lookups.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt: 'For an R x C grid and Q rectangle-sum queries using a summed-area table, what are the time and space costs?',
      choices: [
        'O(R*C*Q) time, O(1) space',
        'O(R*C + Q) time, O(R*C) space',
        'O((R + C) * Q) time, O(R + C) space',
        'O(Q log(R*C)) time, O(R*C) space',
      ],
      correctIndex: 1,
      explanation:
        'Each table entry is filled once in O(1) via the build recurrence (O(R*C) total, and the table itself is the O(R*C) space), then every query is four lookups — O(1) each, O(Q) total. O(R*C*Q) is the naive per-query scan. Row-plus-column tables (option 3) cannot answer arbitrary rectangles, and nothing in the lookup involves a logarithm.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'You have a year of daily price *changes* (positive and negative) and must count how many contiguous runs of days net to exactly +250. Which approach is correct?',
      choices: [
        'Sliding window: grow while the sum is below 250, shrink while above',
        'One pass with prefix sums and a hash map counting occurrences of each running total',
        'Sort the changes, then converging two pointers',
        'Build a table over all (start, end) pairs of run totals',
      ],
      correctIndex: 1,
      explanation:
        'The sliding window is the tempting trap: its grow/shrink logic assumes extending a run increases the sum, and negative changes break that monotonicity — the window will skip valid runs. Sorting destroys contiguity entirely, and a table over all pairs is the O(n^2) brute force in disguise. The prefix-map pass counts, for each day, how many earlier running totals equal running - 250 — exact, sign-agnostic, and O(n).',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'An array of strictly positive request weights; find the SHORTEST contiguous block with total weight >= W. Which technique fits best?',
      choices: [
        'Prefix sums + hash map keyed on running totals',
        'A sliding window with two same-direction pointers',
        'An equilibrium-index sweep',
        'A 2D summed-area table',
      ],
      correctIndex: 1,
      explanation:
        'The hash map is the tempting wrong answer here — it finds running totals EQUAL to a target, but a threshold (>= W) has no single value to look up. With all-positive values, sums are monotone in window size, so the sliding window\'s grow-until-valid / shrink-while-valid logic is both correct and O(1) space. The equilibrium sweep compares left vs right halves (a different question), and a 2D table is for grids. (Prefix sums CAN solve thresholds via binary search over the monotone table, but the window is the canonical, cheaper fit.)',
    },
    {
      id: 'q7',
      kind: 'scenario',
      prompt:
        'A live leaderboard receives frequent single-element score updates interleaved with range-sum queries. What should back the range sums?',
      choices: [
        'Keep the prefix array and patch only the one entry whose element changed',
        'Rebuild the entire prefix array after every update',
        'A Fenwick (binary indexed) tree or segment tree',
        'The prefix + hash map counting trick',
      ],
      correctIndex: 2,
      explanation:
        'Patching one entry is the tempting trap and it is simply wrong: changing element i shifts EVERY prefix entry from i+1 onward, so the table is left internally inconsistent. Rebuilding is correct but costs O(n) per update, which a stream of updates turns into O(n) per operation. A Fenwick or segment tree gives O(log n) for both update and range query — exactly the static-table pattern\'s known limitation and its standard fix. The hash-map trick answers counting questions, not arbitrary range sums under mutation.',
    },
    {
      id: 'q8',
      kind: 'complexity',
      prompt:
        'The equilibrium-index sweep precomputes the grand total, then walks once maintaining a running left sum. Time and extra space?',
      choices: [
        'O(n) time, O(n) extra space',
        'O(n) time, O(1) extra space',
        'O(n^2) time, O(1) extra space',
        'O(n log n) time, O(1) extra space',
      ],
      correctIndex: 1,
      explanation:
        'Two linear passes (sum, then sweep) give O(n) time, and the state is just two integers — total and left — so extra space is O(1). O(n) space would apply only if you materialized a full prefix array, which this variant deliberately avoids; O(n^2) is the re-sum-both-sides brute force; nothing sorts or searches, so no log factor appears.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Signal: "answer many range-sum queries over a static array." Which pattern, and what does it cost?',
      back: 'Prefix sums: one O(n) build of a running-total table, then every query is O(1) — prefix[r+1] - prefix[l]. Total O(n + m) for m queries instead of O(n * m).',
    },
    {
      id: 'f2',
      front: 'Why is the prefix table length n+1 with a leading 0?',
      back: 'prefix[0] = 0 is the empty prefix. It makes ranges starting at index 0 use the same subtraction as everyone else — the single most effective off-by-one vaccine in the pattern.',
    },
    {
      id: 'f3',
      front: 'Exact formula for the sum of arr[l..r] (inclusive) from the prefix table?',
      back: 'prefix[r + 1] - prefix[l]. Everything through r, minus everything before l. Writing prefix[r] - prefix[l] silently drops arr[r].',
    },
    {
      id: 'f4',
      front: 'Template: count subarrays summing to exactly k.',
      back: 'seen = {0: 1}; running = ans = 0. Per element: running += x; ans += seen.get(running - k, 0); then seen[running] += 1. Lookup strictly before insert.',
    },
    {
      id: 'f5',
      front: 'Why does a sliding window FAIL on "subarray sum equals k" when values can be negative — and what works?',
      back: 'Negatives break monotonicity: growing the window can shrink the sum, so grow/shrink decisions are no longer safe. The prefix + hash map pass works regardless of sign.',
    },
    {
      id: 'f6',
      front: '2D query: sum of rectangle (r1,c1)–(r2,c2) from padded table P?',
      back: 'P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]. Big corner, cut the top strip, cut the left strip, add back the doubly-cut overlap.',
    },
    {
      id: 'f7',
      front: '2D build recurrence for the summed-area table?',
      back: 'P[r+1][c+1] = grid[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]. Cell + above + left - their overlap. O(R*C) build, O(1) per query.',
    },
    {
      id: 'f8',
      front: 'Equilibrium / pivot index in O(1) extra space — what is the one-line balance check?',
      back: 'Precompute total once; sweep with running left. Day d balances when left == total - left - arr[d]. Check before adding arr[d] to left; first hit is the leftmost answer.',
    },
    {
      id: 'f9',
      front: 'Pitfall: forgetting seen = {0: 1} in the counting trick. What breaks?',
      back: 'Every subarray that starts at index 0 goes uncounted — [5] with k=5 returns 0 instead of 1. The seed is the empty prefix that anchors spans beginning at the start.',
    },
    {
      id: 'f10',
      front: 'When does a prefix table become the WRONG tool for range sums?',
      back: 'When the array mutates: one point update invalidates every later entry, so each update costs O(n) to rebuild. Frequent updates call for a Fenwick/segment tree (O(log n) update and query).',
    },
  ],
  cheatSheet: {
    tldr:
      'Prefix sums trade one up-front O(n) pass for O(1) answers to every later range-sum question: store running totals (with a leading 0 for the empty prefix) and any range [l, r] becomes prefix[r+1] - prefix[l]. The same idea powers three workhorses — direct range queries on static data, the hash-map-of-running-totals trick that counts subarrays with an exact sum even when values go negative, and 2D summed-area tables that answer rectangle sums with four lookups and inclusion–exclusion. It is precomputation as a pattern: pay once, query forever — but only while the data stays put.',
    signals: [
      'Reach for this when a problem says "answer Q queries" about range or rectangle totals on data that does not change.',
      'Reach for this when you must count contiguous subarrays with an EXACT sum/property — especially with negative values, where sliding windows are unsound.',
      'Reach for this when comparing left side vs right side of a split point (pivot/equilibrium problems) — total + running left sum, O(1) space.',
      'Reach for this when grid problems ask for region totals many times — build the summed-area table once.',
      'Be suspicious when values are all positive and the target is a threshold (sliding window is simpler) or when the array mutates between queries (Fenwick/segment tree).',
    ],
    template: `# 1D: build once, query forever
prefix = [0] * (len(arr) + 1)
for i, x in enumerate(arr):
    prefix[i + 1] = prefix[i] + x
# sum of arr[l..r]  ->  prefix[r + 1] - prefix[l]

# Count subarrays summing to exactly k (negatives OK)
seen = {0: 1}                      # empty prefix
running = count = 0
for x in arr:
    running += x
    count += seen.get(running - k, 0)   # lookup BEFORE insert
    seen[running] = seen.get(running, 0) + 1

# 2D: padded summed-area table
# build: P[r+1][c+1] = grid[r][c] + P[r][c+1] + P[r+1][c] - P[r][c]
# query: P[r2+1][c2+1] - P[r1][c2+1] - P[r2+1][c1] + P[r1][c1]`,
    complexity: 'Build O(n) (or O(R*C) in 2D), then O(1) per query; counting trick O(n) time, O(n) space.',
  },
}

export default mod
