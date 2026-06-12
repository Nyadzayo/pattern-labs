import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'sort-search',
  visualizer: 'binary-search',
  concept: `
## The mental model

Picture a workshop where every screw, washer, and bolt lives in one big coffee can. Every job begins with five minutes of fishing. One slow afternoon you dump the can out and rack everything on a rail, smallest to largest. The racking costs an hour — and it's the last hour you'll ever spend searching. From then on, every question gets answered by a glance: *do we have an M6?* (walk to where M6 would be), *what's the closest size to this hole?* (its neighbors are right there), *which sizes do we have doubles of?* (duplicates now sit side by side).

That is this module's whole thesis: **sorting is not the goal, it's an investment**. You pay \`O(n log n)\` once to buy structure, and that structure makes a whole family of follow-up questions cheap. Most "sort & search" interview problems are really asking: *what question becomes trivial once the data is ordered — and which ordering makes it trivial?*

## Mechanics

Order buys you four superpowers:

1. **Adjacency.** Equal and near-equal values become neighbors. Duplicate detection, closest-pair, and merging overlapping ranges all collapse into a single linear sweep, because anything that can interact is now next to each other.
2. **Monotonicity.** Values only ever increase as you scan, so one comparison rules out an entire region. That's binary search (\`bisect\` in Python), and it generalizes: a row-and-column-sorted matrix lets a "staircase" walk discard a full row or column per step.
3. **Rank.** In sorted order, the k-th smallest element just sits at index \`k - 1\`. And if rank is *all* you need, quickselect gets it without paying for a full sort: partition around a pivot, see which side the target rank falls in, and throw the other side away entirely. Average \`O(n)\`.
4. **Custom orders.** \`sorted(key=...)\` means "sorted" is whatever you define. Arranging pieces to form the largest concatenation? The right order isn't numeric — it's "put \`a\` before \`b\` when \`a + b\` beats \`b + a\` as strings."

\`\`\`python
import bisect

data.sort()                          # the one-time investment

i = bisect.bisect_left(data, x)      # O(log n): leftmost slot for x
found = i < len(data) and data[i] == x

merged = [list(runs[0])]             # runs pre-sorted by start
for start, end in runs[1:]:
    if start <= merged[-1][1]:       # overlap is now adjacent
        merged[-1][1] = max(merged[-1][1], end)
    else:
        merged.append([start, end])
\`\`\`

A quick word on the sorts themselves, because interviewers ask. **Merge sort** guarantees \`O(n log n)\`, is stable, but needs \`O(n)\` scratch space. **Quicksort** averages \`O(n log n)\` in place with great cache behavior, but degrades to \`O(n^2)\` on adversarial pivots and is not stable. **Heapsort** guarantees \`O(n log n)\` in place but jumps around memory and loses stability. Python's built-in is **Timsort**: a stable merge-sort hybrid that hunts for runs already in order, so nearly-sorted input finishes in \`O(n)\`. And when keys are small integers or fixed-width strings, **counting/radix sort** runs in \`O(n + k)\` — the \`O(n log n)\` lower bound only binds sorts that learn order purely through comparisons.

**Stability** — equal keys keeping their input order — sounds academic until you chain sorts: sort by the secondary key first, then stable-sort by the primary, and ties resolve themselves for free.

## When to reach for it

- The input arrives **"in any order"** and the question is about pairs, duplicates, closeness, or coverage. Disorder is usually the entire difficulty; sorting deletes it.
- You need the **k-th smallest / median / percentile**, not the full ranking → quickselect.
- A **static dataset faces many lookups**, especially "largest value ≤ x" predecessor queries → sort once, \`bisect\` forever. (A hash set answers *exact* membership but is blind to order.)
- Ranges or intervals need **merging, overlap checks, or coverage** → sort by start, sweep once.
- The answer is a **best arrangement** of pieces → invent a comparator and justify it with an exchange argument.
- A **matrix sorted along rows and columns** → staircase from a corner, \`O(m + n)\`.

## Complexity

The sort dominates: \`O(n log n)\` time, then each follow-up query is \`O(log n)\` for binary search, \`O(n)\` for a sweep, average \`O(n)\` (worst \`O(n^2)\`) for quickselect, and \`O(m + n)\` for a staircase walk. Space is \`O(1)\` extra if you sort in place, \`O(n)\` if the caller's input must survive.

## Common pitfalls

- **Sorting destroys original indices.** If the answer needs positions from the input, decorate first: \`sorted(enumerate(arr), key=lambda p: p[1])\`.
- **Inconsistent comparators.** A custom comparator must define a total order (transitive, antisymmetric). Break that and the sort returns *something* — silently, with no error.
- **Assuming stability you don't have.** Python's sort is stable; a quicksort you hand-roll is not. Know which guarantee your chained-sort trick depends on.
- **Quickselect's worst case.** A fixed pivot on sorted input hits \`O(n^2)\`. Use median-of-three (or randomize) and prefer three-way partitioning when duplicates are heavy.
- **Treating a staircase grid as one sorted list.** Row-and-column-sorted is weaker than globally sorted; plain binary search over the flattened matrix is simply wrong there.
- **Forgetting \`max(end)\` when merging.** Nested ranges like \`[1, 10]\` swallowing \`[2, 3]\` will corrupt your sweep if you blindly overwrite the merged end.
`,
  realWorldUses: [
    {
      title: 'Timsort in language runtimes',
      description:
        "CPython's list.sort and Java's Arrays.sort for objects both run Timsort, which detects pre-ordered runs in real-world data (log files, timestamps, mostly-sorted tables) and merges them stably — nearly-sorted input finishes in linear time, which is why re-sorting an almost-current index is cheap in production.",
    },
    {
      title: 'External sorting for database ORDER BY and index builds',
      description:
        'When a result set exceeds RAM, engines like Postgres sort chunks in memory, spill sorted runs to disk, then k-way merge them. ORDER BY, GROUP BY, and B-tree index construction all lean on this sort-then-sweep shape at terabyte scale.',
    },
    {
      title: 'Selection algorithms for percentile dashboards',
      description:
        "Monitoring stacks computing p95/p99 latency on raw sample buffers use selection rather than full sorts — C++'s std::nth_element (introselect, a hardened quickselect) finds one rank in average linear time, and the same routine drives median filters in image processing.",
    },
  ],
  problems: [
    {
      id: 'flush-ranges',
      title: 'Dirty Range Flush',
      difficulty: 'easy',
      statement: `
A write-back cache tracks which byte ranges of a file have been modified since the last flush. Each dirty range is recorded as \`[start, end]\` (both **inclusive**), but writes land in arbitrary order, so the log is unsorted and full of overlaps.

Before flushing to disk, the controller wants the **minimal** list of dirty ranges. Two ranges should be merged when they share at least one byte position — so \`[1, 5]\` and \`[5, 9]\` merge into \`[1, 9]\`, but \`[1, 5]\` and \`[6, 9]\` stay separate even though they touch end to end.

Given the list \`runs\` of \`[start, end]\` pairs, return the merged ranges as a list of \`[start, end]\` pairs **sorted by start position, ascending**.
`,
      examples: [
        {
          input: 'runs = [[5, 8], [1, 3], [2, 4], [10, 12]]',
          output: '[[1, 4], [5, 8], [10, 12]]',
          explanation:
            '[1, 3] and [2, 4] share bytes 2–3 and merge into [1, 4]. [5, 8] and [10, 12] overlap nothing.',
        },
        {
          input: 'runs = [[1, 5], [5, 9]]',
          output: '[[1, 9]]',
          explanation: 'Both ranges include byte 5, so they merge.',
        },
        {
          input: 'runs = [[1, 10], [2, 3], [4, 5]]',
          output: '[[1, 10]]',
          explanation: 'The small ranges are nested entirely inside [1, 10]; the merged end must stay 10.',
        },
      ],
      constraints: [
        '0 <= len(runs) <= 100_000',
        'each run is a pair [start, end] with start <= end',
        '-10^9 <= start, end <= 10^9',
        'output must be sorted by start, ascending',
      ],
      hints: [
        'With the log in arbitrary order, any range might overlap any other — that smells like comparing all pairs. What one-time preprocessing step would guarantee that ranges able to overlap end up near each other?',
        'After sorting by start, a new range can only overlap the merged block you built most recently — every earlier block ended before that one. So each step is a single comparison against the last output entry.',
        'Sort by start. Keep an output list seeded with the first range. For each next range: if its start <= the last merged end, update that end to max(both ends); otherwise append it as a fresh block.',
      ],
      functionName: 'merge_runs',
      starterCode: `def merge_runs(runs: list[list[int]]) -> list[list[int]]:
    pass
`,
      solution: {
        code: `def merge_runs(runs: list[list[int]]) -> list[list[int]]:
    # Nothing dirty: nothing to flush.
    if not runs:
        return []
    # The investment: sort by start (end as tie-break for determinism).
    # Now any two ranges that can overlap are adjacent in this order.
    ordered = sorted(runs, key=lambda r: (r[0], r[1]))
    # Seed the output with a copy of the first range (never mutate input).
    merged = [list(ordered[0])]
    for start, end in ordered[1:]:
        last = merged[-1]
        if start <= last[1]:
            # Shares at least one byte with the current block: extend it.
            # max() matters — a nested range must not shrink the block.
            last[1] = max(last[1], end)
        else:
            # Strictly past the current block: start a new one.
            merged.append([start, end])
    return merged
`,
        commentary: `
Unsorted, every range is a potential partner for every other range — that's \`O(n^2)\` pair checks. Sorting by start collapses the interaction structure: once ranges are in start order, **a range can only overlap the most recent merged block**. Why? Every earlier block was closed precisely because some later start exceeded its end, and starts only grow from there.

So the sweep needs exactly one comparison per range: \`start <= last_end\` means overlap (the ranges share that boundary byte, since ends are inclusive), anything else means a gap. The single subtlety is nested ranges — \`[2, 3]\` arriving inside \`[1, 10]\` — which is why the merge takes \`max(last_end, end)\` instead of overwriting. The output is born sorted by start, so the required ordering costs nothing extra.
`,
        complexity: 'Time O(n log n) for the sort, O(n) sweep; Space O(n) for the output',
      },
      testCases: [
        { input: [[[5, 8], [1, 3], [2, 4], [10, 12]]], expected: [[1, 4], [5, 8], [10, 12]], label: 'basic merge' },
        { input: [[[1, 5], [5, 9]]], expected: [[1, 9]], label: 'shared endpoint merges' },
        { input: [[]], expected: [], label: 'empty log' },
        { input: [[[1, 5], [6, 9]]], expected: [[1, 5], [6, 9]], hidden: true, label: 'adjacent but disjoint' },
        { input: [[[1, 10], [2, 3], [4, 5]]], expected: [[1, 10]], hidden: true, label: 'nested ranges' },
        { input: [[[2, 2], [2, 2], [2, 2]]], expected: [[2, 2]], hidden: true, label: 'all identical points' },
        { input: [[[-5, -1], [-3, 2], [4, 6]]], expected: [[-5, 2], [4, 6]], label: 'negative positions' },
        { input: [[[1, 4], [0, 0]]], expected: [[0, 0], [1, 4]], hidden: true, label: 'output must be re-sorted' },
      ],
      furtherPractice: [
        { name: 'LeetCode 56. Merge Intervals', note: 'the canonical version of this sweep' },
        { name: 'LeetCode 57. Insert Interval', note: 'one new range into an already-sorted list' },
      ],
    },
    {
      id: 'gauge-rank',
      title: 'Flood Gauge Ranking',
      difficulty: 'medium',
      statement: `
A river-monitoring service collects depth readings (in millimetres) from field gauges. The buffer \`depths\` arrives completely unsorted, and the calibration job needs exactly one number from it: the **k-th smallest reading**, counting duplicates — i.e. the value that would sit at position \`k\` (1-indexed) if the buffer were sorted ascending.

Buffers can hold millions of readings and the job runs on a tiny edge device, so fully sorting the buffer is off the table. Find the k-th smallest in **average linear time**, and do not modify the caller's list.

Return the reading itself (an integer), not its index.
`,
      examples: [
        {
          input: 'depths = [7, 2, 9, 4], k = 2',
          output: '4',
          explanation: 'Sorted, the buffer reads [2, 4, 7, 9]; the 2nd smallest is 4.',
        },
        {
          input: 'depths = [1, 2, 2, 3], k = 3',
          output: '2',
          explanation: 'Duplicates count separately: sorted order is [1, 2, 2, 3], so position 3 holds 2.',
        },
        {
          input: 'depths = [5], k = 1',
          output: '5',
          explanation: 'A single reading is trivially the 1st smallest.',
        },
      ],
      constraints: [
        '1 <= len(depths) <= 1_000_000',
        '1 <= k <= len(depths)',
        '-10^9 <= depths[i] <= 10^9',
        'duplicates are possible and count toward rank',
        'the input list must not be mutated',
      ],
      hints: [
        'A full sort answers the question but establishes the order of every element — and you only care about one position. Is there sorting work you can provably skip?',
        "Think about what one quicksort-style partition buys you: after it, the pivot occupies its final sorted slot, and you know exactly how many elements land on each side. Which side can you discard outright?",
        'Loop instead of fully recursing: pick a median-of-three pivot, three-way partition into <, ==, > regions, then compare the target index k-1 against the region boundaries. Inside the == block, return the pivot; otherwise narrow lo/hi to the one region that contains the rank and repeat.',
      ],
      functionName: 'kth_smallest_depth',
      starterCode: `def kth_smallest_depth(depths: list[int], k: int) -> int:
    pass
`,
      solution: {
        code: `def kth_smallest_depth(depths: list[int], k: int) -> int:
    # Copy once so the caller's buffer survives our in-place shuffling.
    arr = list(depths)
    target = k - 1            # 1-indexed rank -> 0-indexed sorted position
    lo, hi = 0, len(arr) - 1
    while True:
        if lo == hi:
            # One candidate left: it must hold the target rank.
            return arr[lo]
        # Median-of-three pivot: deterministic, and it defuses the classic
        # O(n^2) blow-up on already-sorted or reverse-sorted buffers.
        mid = (lo + hi) // 2
        pivot = sorted((arr[lo], arr[mid], arr[hi]))[1]
        # Three-way (Dutch flag) partition of arr[lo..hi]:
        #   arr[lo..lt-1] < pivot, arr[lt..gt] == pivot, arr[gt+1..hi] > pivot
        lt, i, gt = lo, lo, hi
        while i <= gt:
            if arr[i] < pivot:
                arr[lt], arr[i] = arr[i], arr[lt]
                lt += 1
                i += 1
            elif arr[i] > pivot:
                arr[i], arr[gt] = arr[gt], arr[i]
                gt -= 1
            else:
                i += 1
        # Recurse (iteratively) into the single region holding the rank.
        if target < lt:
            hi = lt - 1        # rank lies among the strictly-smaller values
        elif target > gt:
            lo = gt + 1        # rank lies among the strictly-larger values
        else:
            return pivot       # rank falls inside the == block: done
`,
        commentary: `
A full sort does \`Θ(n log n)\` work to rank *every* element, then reads off one of them. Quickselect keeps quicksort's partition step but drops half the recursion: after partitioning, the pivot block sits at its **final sorted position**, so a single index comparison tells you which side hides rank \`k\` — and the other side is dead forever. The shrinking geometric series \`n + n/2 + n/4 + ...\` gives average \`O(n)\`.

Two hardening choices matter here. **Median-of-three** pivots keep sorted and reverse-sorted buffers (very common for sensor data) from degenerating into \`O(n^2)\`. And the **three-way partition** groups all copies of the pivot together, so a buffer of near-identical readings collapses in one round instead of shedding one element per pass — duplicates are the silent killer of two-way quickselect.

We copy the input once (\`O(n)\` space) because the contract forbids mutation; given a scratch buffer you own, the algorithm itself is \`O(1)\` extra space.
`,
        complexity: 'Time O(n) average, O(n^2) worst; Space O(n) for the defensive copy',
      },
      testCases: [
        { input: [[7, 2, 9, 4], 2], expected: 4, label: 'basic rank' },
        { input: [[5], 1], expected: 5, label: 'single reading' },
        { input: [[9, 8, 7, 6, 5, 4, 3, 2, 1], 1], expected: 1, label: 'reverse-sorted, k = 1' },
        { input: [[3, 3, 3, 3], 3], expected: 3, hidden: true, label: 'all readings equal' },
        { input: [[-5, 0, -10, 7, 3], 2], expected: -5, hidden: true, label: 'negative depths' },
        { input: [[1, 2, 2, 3], 3], expected: 2, hidden: true, label: 'duplicates at the rank' },
        { input: [[4, 1, 3], 3], expected: 4, label: 'k = n (maximum)' },
        { input: [[12, 3, 5, 7, 4, 19, 26], 3], expected: 5, hidden: true, label: 'mid-rank in odd buffer' },
      ],
      furtherPractice: [
        { name: 'LeetCode 215. Kth Largest Element in an Array', note: 'same idea, mirrored rank' },
        { name: 'LeetCode 973. K Closest Points to Origin', note: 'quickselect on a derived key' },
      ],
    },
    {
      id: 'calibration-grid',
      title: 'Pressure Plate Probe',
      difficulty: 'medium',
      statement: `
A materials lab calibrates pressure sensors against a reference plate. The plate's readings form a grid where values **increase left to right along every row** and **increase top to bottom down every column** (non-decreasing in both directions; duplicates are allowed). The grid is *not* globally sorted — the first value of a row may be smaller than the last value of the row above.

Given the grid and a \`target\` reading, return \`True\` if the target appears anywhere in the grid and \`False\` otherwise. The grid may be empty, and a brute-force scan of all \`m * n\` cells is too slow for the lab's real plates.
`,
      examples: [
        {
          input: 'grid = [[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]], target = 9',
          output: 'True',
          explanation: 'Reading 9 sits at row 2, column 2.',
        },
        {
          input: 'same grid, target = 15',
          output: 'False',
          explanation: '15 falls between existing readings but never appears.',
        },
        {
          input: 'grid = [[5]], target = 4',
          output: 'False',
          explanation: 'A single cell either matches or it does not.',
        },
      ],
      constraints: [
        '0 <= rows, cols <= 1_000',
        'every row is sorted non-decreasing left to right',
        'every column is sorted non-decreasing top to bottom',
        '-10^9 <= grid[i][j], target <= 10^9',
        'aim for better than O(m * n)',
      ],
      hints: [
        "The grid is sorted two ways, and a row-by-row approach only ever uses one of them. What does a single cell's value tell you about cells you haven't looked at — beyond its own row?",
        'Stand at the top-right cell. If it exceeds the target, every cell below it in that column is even bigger — the whole column dies. If it is smaller, everything to its left in that row is even smaller — the whole row dies.',
        'Start at (row, col) = (0, n-1). Loop: on a match return True; if the cell > target do col -= 1; if the cell < target do row += 1. Walking off either edge of the grid means the target is absent — return False.',
      ],
      functionName: 'plate_contains',
      starterCode: `def plate_contains(grid: list[list[int]], target: int) -> bool:
    pass
`,
      solution: {
        code: `def plate_contains(grid: list[list[int]], target: int) -> bool:
    # Empty plate or rows with no columns: nothing to find.
    if not grid or not grid[0]:
        return False
    rows, cols = len(grid), len(grid[0])
    # Start at the top-right corner: the one cell that is simultaneously
    # the max of its row and the min of its column.
    r, c = 0, cols - 1
    while r < rows and c >= 0:
        value = grid[r][c]
        if value == target:
            return True
        if value > target:
            # Everything below in this column is >= value > target:
            # the entire column is eliminated.
            c -= 1
        else:
            # Everything left in this row is <= value < target:
            # the entire row is eliminated.
            r += 1
    # Walked off the plate without a hit.
    return False
`,
        commentary: `
The trick is choosing a corner where the two sort orders **disagree**. At the top-right cell, moving left makes values shrink and moving down makes them grow — so one comparison always has an unambiguous verdict. Cell too big? Its whole column below is bigger still; discard the column. Too small? Its whole row to the left is smaller still; discard the row. (Top-left is useless: both directions grow, so a small cell tells you nothing about where to go.)

Every iteration permanently deletes a full row or a full column, so the walk takes at most \`m + n - 1\` steps — a staircase trace across the plate. It's worth seeing why plain binary search over the flattened grid is *wrong* here: row-and-column-sorted is strictly weaker than globally sorted, and 10 (start of the last row) sitting below 16 (end of the third) breaks any single sorted-list assumption. The staircase only relies on the two local guarantees the plate actually provides.
`,
        complexity: 'Time O(m + n), Space O(1)',
      },
      testCases: [
        {
          input: [[[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]], 9],
          expected: true,
          label: 'target present mid-grid',
        },
        {
          input: [[[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]], 15],
          expected: false,
          label: 'target absent between values',
        },
        { input: [[[5]], 5], expected: true, label: 'single cell hit' },
        { input: [[], 3], expected: false, hidden: true, label: 'empty grid' },
        { input: [[[]], 3], expected: false, hidden: true, label: 'grid with one empty row' },
        {
          input: [[[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]], 0],
          expected: false,
          hidden: true,
          label: 'below the minimum',
        },
        {
          input: [[[1, 4, 7, 11], [2, 5, 8, 12], [3, 6, 9, 16], [10, 13, 14, 17]], 18],
          expected: false,
          hidden: true,
          label: 'above the maximum',
        },
        { input: [[[1, 2, 2], [2, 3, 4]], 2], expected: true, label: 'duplicate readings' },
        { input: [[[1, 3, 5]], 4], expected: false, hidden: true, label: 'single row, miss' },
      ],
      furtherPractice: [
        { name: 'LeetCode 240. Search a 2D Matrix II', note: 'the staircase classic' },
        { name: 'LeetCode 74. Search a 2D Matrix', note: 'the globally-sorted cousin where binary search IS valid' },
      ],
    },
    {
      id: 'banner-number',
      title: 'Maximal Banner Number',
      difficulty: 'hard',
      statement: `
A stadium scoreboard builds its giant banner number by concatenating physical digit panels. Each panel displays one non-negative integer (for example \`30\` or \`9\`), and the operator may arrange the panels in **any order**. The crowd wants the biggest number possible.

Given the panel values \`panels\`, return the largest number that can be formed by concatenating all of them, **as a string** (the result can overflow any integer type). If every panel reads \`0\`, return exactly \`"0"\` — the scoreboard collapses redundant zeros.

Note that ordinary numeric sorting fails: \`9\` is smaller than \`34\`, yet \`934\` beats \`349\`.
`,
      examples: [
        {
          input: 'panels = [3, 30, 34, 5, 9]',
          output: '"9534330"',
          explanation:
            'The winning order is 9, 5, 34, 3, 30. Note 3 comes before 30 because "330" > "303".',
        },
        {
          input: 'panels = [10, 2]',
          output: '"210"',
          explanation: '"210" beats "102", so the 2-panel leads despite 10 being numerically larger.',
        },
        {
          input: 'panels = [0, 0]',
          output: '"0"',
          explanation: 'All-zero panels collapse to a single "0", not "00".',
        },
      ],
      constraints: [
        '1 <= len(panels) <= 100_000',
        '0 <= panels[i] <= 10^9',
        'the result must be returned as a string',
        'if all panels are 0, return exactly "0"',
      ],
      hints: [
        'Sorting the panels numerically (descending) looks right until panels of different digit-lengths meet — work out 9 versus 34 by hand. What quantity are you actually maximizing when two panels swap places?',
        'For any two panels a and b, the rest of the arrangement is unaffected by their relative order — so the only question is local: does a-then-b read larger than b-then-a as strings? That pairwise test defines an ordering you can sort by.',
        'Convert each panel to a string; sort with functools.cmp_to_key using a comparator that puts a first when a + b > b + a; join the result. If the joined string starts with "0", every panel was 0 — return "0".',
      ],
      functionName: 'largest_banner',
      starterCode: `def largest_banner(panels: list[int]) -> str:
    pass
`,
      solution: {
        code: `from functools import cmp_to_key


def largest_banner(panels: list[int]) -> str:
    # Work in string space: concatenation order is a string question.
    digits = [str(p) for p in panels]

    def glue(a: str, b: str) -> int:
        # a should come FIRST when placing it first yields the bigger read.
        # Comparing a+b against b+a sidesteps all length edge cases:
        # "9"+"34" = "934" vs "34"+"9" = "349"  ->  9 first.
        if a + b > b + a:
            return -1
        if a + b < b + a:
            return 1
        return 0

    # cmp_to_key adapts the pairwise comparator into a sort key.
    # The comparator is a genuine total order (it ranks by the value of
    # the infinite repetition abab... vs baba...), so the sort is sound.
    digits.sort(key=cmp_to_key(glue))

    result = ''.join(digits)
    # If the best arrangement leads with '0', no panel had a nonzero
    # leading digit -- every panel is 0. Collapse "000...0" to "0".
    return '0' if result[0] == '0' else result
`,
        commentary: `
This is "sort & search" with the most interesting dial turned: **you invent the order**. Numeric descending fails (\`34\` before \`9\` gives \`349...\`, losing to \`934...\`) and plain string-descending fails too (\`30\` outranks \`3\` lexicographically, producing \`303\` where \`330\` wins). The correct local question is: *for panels a and b, which concatenation reads larger — a+b or b+a?*

Why is sorting by a pairwise rule even legal? An **exchange argument**: in any arrangement, swapping two adjacent panels only changes the digits those two contribute, so an arrangement is optimal exactly when every adjacent pair is in glue order. And the comparator is a genuine total order — putting \`a\` before \`b\` when \`a+b > b+a\` is equivalent to ranking strings by the value of their infinite repetition (\`3\` ↦ \`333...\`, \`30\` ↦ \`303030...\`), which is transitive. Hand the comparator to \`cmp_to_key\` and Timsort does the rest.

The one edge case is all-zero input: glue order would emit \`"00"\` for \`[0, 0]\`, so we collapse any result with a leading zero (only possible when *every* panel is zero) to \`"0"\`.
`,
        complexity: 'Time O(n log n * L) where L is max digit-length (comparisons cost O(L)); Space O(n)',
      },
      testCases: [
        { input: [[3, 30, 34, 5, 9]], expected: '9534330', label: 'classic mixed lengths' },
        { input: [[10, 2]], expected: '210', label: 'short panel leads' },
        { input: [[0, 0]], expected: '0', label: 'all zeros collapse' },
        { input: [[0]], expected: '0', hidden: true, label: 'single zero' },
        { input: [[1]], expected: '1', hidden: true, label: 'single panel' },
        { input: [[121, 12]], expected: '12121', hidden: true, label: 'prefix panels' },
        { input: [[432, 43243]], expected: '43243432', label: 'long shared prefixes' },
        { input: [[8308, 8308, 830]], expected: '83088308830', hidden: true, label: 'duplicates plus prefix' },
        { input: [[5, 50, 56]], expected: '56550', hidden: true, label: 'same leading digit' },
      ],
      furtherPractice: [
        { name: 'LeetCode 179. Largest Number', note: 'the canonical comparator-design problem' },
        { name: 'LeetCode 1029. Two City Scheduling', note: 'another sort-by-invented-key exchange argument' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      prompt:
        'Sorting costs `O(n log n)` up front. What is the core reason "sort first" still beats clever ad-hoc scanning on so many problems?',
      choices: [
        'Sorting reduces the data size, so later passes touch fewer elements.',
        'Sorting creates structure — equal and nearby values become adjacent, and comparisons become monotonic — so later steps can discard whole regions of candidates without inspecting them.',
        'Sorted arrays compress better in CPU cache, making every later read free.',
        'Sorting guarantees that every follow-up operation runs in `O(1)`.',
      ],
      correctIndex: 1,
      explanation:
        'Order buys adjacency (interacting elements become neighbors) and monotonicity (one comparison rules out a region) — that is what turns quadratic pair-checking into linear sweeps and linear scans into binary searches. Sorting never shrinks the data (choice 1), caches do not work that way (choice 3), and follow-ups are typically `O(log n)` or `O(n)`, not `O(1)` (choice 4).',
      kind: 'conceptual',
    },
    {
      id: 'q2',
      prompt: 'A sorting algorithm is called *stable* when…',
      choices: [
        'its running time is identical on every input distribution.',
        'it never allocates more than `O(1)` extra memory.',
        'elements that compare equal keep the relative order they had in the input.',
        'it always selects the true median as its pivot.',
      ],
      correctIndex: 2,
      explanation:
        'Stability is about preserving input order among equal keys — which is what makes the chained-sort trick work: sort by the secondary key, then stable-sort by the primary, and ties resolve automatically. Merge sort and Timsort are stable; typical in-place quicksort and heapsort are not. The other choices describe time guarantees, in-place behavior, and pivot strategy — unrelated properties.',
      kind: 'conceptual',
    },
    {
      id: 'q3',
      prompt: 'Quickselect finds the k-th smallest of n elements. What are its average and worst-case time complexities?',
      choices: [
        'Average `O(n)`, worst `O(n^2)`',
        'Average `O(n log n)`, worst `O(n log n)`',
        'Average `O(log n)`, worst `O(n)`',
        'Average `O(n)`, worst `O(n log n)`',
      ],
      correctIndex: 0,
      explanation:
        'Each partition costs linear time but discards one side, so the expected work is the geometric series n + n/2 + n/4 + … = `O(n)`. With adversarial pivots the discarded side can be empty, shedding one element per linear pass: `O(n^2)`. Choice 2 describes a full sort — exactly the work quickselect exists to skip.',
      kind: 'complexity',
    },
    {
      id: 'q4',
      prompt:
        'You sort n unordered intervals by start, then sweep once to merge all overlaps. What is the overall time complexity?',
      choices: [
        '`O(n)` — the sweep dominates',
        '`O(n log n)` — the sort dominates; the sweep itself is `O(n)`',
        '`O(n^2)` — every pair of intervals must still be compared',
        '`O(log n)` amortized per interval, `O(n log^2 n)` total',
      ],
      correctIndex: 1,
      explanation:
        'The sweep makes one comparison per interval (against the last merged block), so it is linear — but the sort that made that possible costs `O(n log n)`, which dominates. Pairwise comparison (choice 3) is precisely what sorting eliminates: after ordering by start, only adjacent blocks can interact.',
      kind: 'complexity',
    },
    {
      id: 'q5',
      prompt:
        'A matrix has m rows and n columns, with every row sorted left-to-right and every column sorted top-to-bottom (not globally sorted). The staircase search for a target runs in:',
      choices: ['`O(log(m * n))`', '`O(m log n)`', '`O(m + n)`', '`O(m * n)`'],
      correctIndex: 2,
      explanation:
        'Each step of the staircase eliminates an entire row or an entire column, and there are only m + n of those to eliminate. `O(log(m*n))` would require the matrix to be one globally sorted sequence, which row-and-column-sorted does not guarantee; `O(m log n)` is the weaker binary-search-per-row approach; `O(m*n)` is brute force.',
      kind: 'complexity',
    },
    {
      id: 'q6',
      prompt:
        'You have 10 million unsorted latency samples and need the single p99 value once, after which the buffer is discarded. What is the best-fitting tool?',
      choices: [
        'Sort the full buffer, then read index 0.99n — `O(n log n)`.',
        'Quickselect to rank 0.99n — average `O(n)`, no full ordering ever built.',
        'Binary search the unsorted buffer for the percentile value.',
        'Push everything into a balanced BST and walk to the 0.99n-th node.',
      ],
      correctIndex: 1,
      explanation:
        'You need one rank, not a ranking — quickselect partitions toward that single position and discards the rest, averaging linear time. The full sort (the tempting default) does `Θ(n log n)` work establishing order you immediately throw away. Binary search is invalid on unsorted data, and a BST costs `O(n log n)` to build — a sort in disguise.',
      kind: 'scenario',
    },
    {
      id: 'q7',
      prompt:
        'A static array of one million sensor IDs must answer thousands of queries of the form "what is the largest ID ≤ x?". Which preprocessing wins?',
      choices: [
        'Load the IDs into a hash set and look up x directly.',
        'Sort once, then answer each query with a binary search (bisect) — `O(log n)` per query.',
        'Run a fresh linear scan per query, tracking the best ID seen.',
        'Quickselect per query to find the rank of x.',
      ],
      correctIndex: 1,
      explanation:
        'This is a predecessor query, and it is exactly what sorted order plus `bisect` answers in `O(log n)`. The hash set is the tempting distractor: hashing answers *exact* membership in `O(1)` but is structurally blind to order — it cannot find the nearest smaller element without scanning. Per-query linear scans and quickselects both pay `O(n)` per query and ignore that the data never changes.',
      kind: 'scenario',
    },
    {
      id: 'q8',
      prompt:
        'Panels [3, 30, 34, 5, 9] must be concatenated into the largest possible number. Which sort produces the correct order?',
      choices: [
        'Sort descending by numeric value.',
        'Sort descending lexicographically as strings.',
        'Sort with a comparator placing a before b whenever a + b > b + a (as strings).',
        'Sort ascending by digit count, breaking ties by numeric value.',
      ],
      correctIndex: 2,
      explanation:
        'The glue comparator yields 9, 5, 34, 3, 30 → "9534330". Numeric descending (the tempting reflex) puts 34 before 9, producing "3430953…"-style losses. Lexicographic descending is subtler but still wrong: it ranks "30" above "3", giving "…303" where "…330" is larger. Only the a+b vs b+a test measures the thing actually being maximized — the concatenated reading.',
      kind: 'scenario',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Signal: input arrives "in any order" and the question concerns pairs, duplicates, closeness, or coverage.',
      back: 'Sort first. Disorder usually IS the difficulty — ordering makes interacting elements adjacent and turns pair-checking into a linear sweep.',
    },
    {
      id: 'f2',
      front: "What sort does Python's sorted()/list.sort() use, and what are its key properties?",
      back: 'Timsort: a stable merge-sort hybrid that detects natural runs. Worst case O(n log n), nearly-sorted input finishes in O(n).',
    },
    {
      id: 'f3',
      front: 'Quickselect: the template move.',
      back: 'Partition around a pivot; the pivot lands at its final sorted index. Compare that index to k-1 and recurse into ONE side only. Average O(n), worst O(n^2).',
    },
    {
      id: 'f4',
      front: 'Staircase search: where do you start and why?',
      back: 'Top-right (or bottom-left) corner — the one cell where the two sort directions disagree, so every comparison eliminates a full row or column. O(m + n).',
    },
    {
      id: 'f5',
      front: 'Define sort stability and name the trick it enables.',
      back: 'Equal keys keep their input order. Enables chained sorting: sort by secondary key first, then stable-sort by primary — ties resolve themselves.',
    },
    {
      id: 'f6',
      front: 'Merge-overlapping-ranges template.',
      back: 'Sort by start. For each range: if start <= last merged end, extend with max(both ends); else append a new block. Sort O(n log n) + sweep O(n).',
    },
    {
      id: 'f7',
      front: 'Pitfall: custom comparators.',
      back: 'A comparator must define a consistent total order (transitive). Break that and sort returns garbage silently. The a+b vs b+a glue test IS a total order — safe to sort by.',
    },
    {
      id: 'f8',
      front: 'bisect_left vs bisect_right on a sorted list.',
      back: 'bisect_left returns the first index where x could insert (leftmost equal); bisect_right inserts after equals. bisect_right(x) - 1 answers "largest element <= x".',
    },
    {
      id: 'f9',
      front: 'Pitfall: you sorted, and now the answer needs original positions.',
      back: 'Sorting destroys indices. Decorate before sorting: sorted(enumerate(arr), key=lambda p: p[1]) keeps each value glued to where it came from.',
    },
    {
      id: 'f10',
      front: 'When can sorting beat O(n log n)?',
      back: 'The Ω(n log n) bound only binds comparison sorts. Counting/radix sort small-integer or fixed-width keys in O(n + k) by indexing instead of comparing.',
    },
  ],
  cheatSheet: {
    tldr: 'Sort & Search treats ordering as a one-time investment: pay O(n log n) to convert disorder into structure, then exploit that structure — adjacency for sweeps and merges, monotonicity for binary search and staircase walks, rank for k-th element queries (or skip the full sort entirely with quickselect), and custom comparators when the problem defines its own notion of "bigger".',
    signals: [
      'Input is unsorted and the question involves pairs, duplicates, nearest values, or overlapping ranges — sort, then sweep.',
      'You need the k-th smallest / median / a percentile, not the whole ranking — quickselect, average O(n).',
      'A static dataset faces many lookups or "largest value ≤ x" predecessor queries — sort once, bisect per query.',
      'A matrix is sorted along rows AND columns — staircase from the top-right corner, O(m + n).',
      'The answer is the best arrangement of pieces — design a comparator and defend it with an exchange argument.',
    ],
    template: `import bisect
from functools import cmp_to_key

# 1) Invest: sort once (Timsort — stable, O(n log n), O(n) if nearly sorted)
arr.sort()                                   # or sorted(arr, key=...)

# 2) Exploit: O(log n) lookups / predecessor queries
i = bisect.bisect_right(arr, x) - 1          # largest element <= x (if i >= 0)

# 2) Exploit: linear sweep over now-adjacent ranges
merged = [list(runs[0])]                     # runs sorted by start
for start, end in runs[1:]:
    if start <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], end)
    else:
        merged.append([start, end])

# 2) Exploit: problem-defined order via comparator (must be a total order:
#    return 0 on ties, or the sort's behavior is undefined)
parts.sort(key=cmp_to_key(
    lambda a, b: -1 if a + b > b + a else (1 if a + b < b + a else 0)))`,
    complexity:
      'Sort O(n log n) once; then binary search O(log n) per query, merge sweep O(n), quickselect average O(n) (worst O(n^2)), staircase search O(m + n).',
  },
}

export default mod
