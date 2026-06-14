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
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Handle the empty input up front',
            acceptableKeywords: ['empty input guard', 'nothing to process return early', 'base case for no data', 'short-circuit on empty'],
            hint: 'What should happen before any sweeping when there is no data at all?',
            misconception: 'This is only the trivial-input exit, not where merging begins.',
          },
          {
            lineRange: [5, 9],
            referenceLabel: 'Order the items so interactions become adjacent, then seed the result',
            acceptableKeywords: ['sort by start key', 'order so overlaps are neighbors', 'the ordering investment', 'seed output with a copy'],
            hint: 'What single rearrangement makes "can these overlap?" a question about neighbors only?',
            misconception: 'This buys the structure the sweep relies on; it is not yet the overlap test.',
          },
          {
            lineRange: [10, 15],
            referenceLabel: 'Extend the current block when the next item overlaps it',
            acceptableKeywords: ['merge overlapping into current', 'extend the open block', 'take the max end', 'absorb a nested range'],
            hint: 'When the new item touches the most recent block, how do you grow that block safely?',
            misconception: 'Overwriting the end instead of taking the max would shrink the block on a nested range.',
          },
          {
            lineRange: [16, 19],
            referenceLabel: 'Open a fresh block on a gap, then hand back the result',
            acceptableKeywords: ['start a new block on a gap', 'no overlap append disjoint', 'close out and continue', 'return the merged list'],
            hint: 'When the next item starts past the open block, what do you do instead of extending?',
            misconception: 'This is the disjoint case plus the final return — not part of the overlap branch.',
          },
        ],
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
        subgoals: [
          {
            lineRange: [1, 5],
            referenceLabel: 'Copy the input and set up the rank target and search bounds',
            acceptableKeywords: ['defensive copy of input', 'convert rank to zero-based index', 'initialize lo and hi', 'set up the working range'],
            hint: 'Before any partitioning, what do you protect, and what index are you actually hunting for?',
            misconception: 'This is setup and the rank translation, not the selection logic itself.',
          },
          {
            lineRange: [6, 9],
            referenceLabel: 'Loop until the window collapses to the answer',
            acceptableKeywords: ['repeat until one candidate', 'window shrinks each round', 'single element holds the rank', 'termination on lo equals hi'],
            hint: 'What condition means the search has narrowed to exactly the element you want?',
            misconception: 'This is the loop frame and its exit, not the partition step.',
          },
          {
            lineRange: [10, 13],
            referenceLabel: 'Choose a pivot resistant to adversarial input',
            acceptableKeywords: ['median-of-three pivot', 'pick a robust pivot', 'avoid worst-case sorted input', 'pivot selection'],
            hint: 'How do you pick a splitter that does not blow up on already-ordered data?',
            misconception: 'A fixed or naive pivot here is what degrades selection to quadratic.',
          },
          {
            lineRange: [14, 26],
            referenceLabel: 'Partition the window into less-than, equal, and greater-than regions',
            acceptableKeywords: ['three-way partition', 'dutch national flag', 'group around the pivot', 'split into three regions'],
            hint: 'How do you arrange the window so all copies of the pivot sit together in their final place?',
            misconception: 'A two-way split would not collapse duplicates in one pass like this does.',
          },
          {
            lineRange: [27, 33],
            referenceLabel: 'Keep only the region that contains the target rank',
            acceptableKeywords: ['recurse into one side', 'discard the half without the rank', 'rank inside the equal block', 'narrow lo and hi'],
            hint: 'Once the pivot sits at its final spot, how do you decide which side to keep?',
            misconception: 'This is the discard decision, not the partitioning that produced the regions.',
          },
        ],
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
        subgoals: [
          {
            lineRange: [1, 5],
            referenceLabel: 'Reject degenerate input and read off the dimensions',
            acceptableKeywords: ['guard empty grid', 'handle no rows or columns', 'record width and height', 'dimension setup'],
            hint: 'What must be true about the grid before a staircase walk can even begin?',
            misconception: 'This only rules out empty grids and records sizes; no searching yet.',
          },
          {
            lineRange: [6, 8],
            referenceLabel: 'Begin at the corner where the two sort orders disagree',
            acceptableKeywords: ['start at top-right corner', 'pick the pivot corner', 'max of row min of column', 'corner where directions split'],
            hint: 'Which starting cell lets every comparison send you in exactly one unambiguous direction?',
            misconception: 'A corner where both directions grow gives no information; this picks the useful one.',
          },
          {
            lineRange: [9, 12],
            referenceLabel: 'Walk the staircase and report a direct hit',
            acceptableKeywords: ['loop while inside the grid', 'read the current cell', 'return on exact match', 'found the target'],
            hint: 'While still on the plate, what do you check at the current cell before moving?',
            misconception: 'This is the scan loop and success case, not the elimination step.',
          },
          {
            lineRange: [13, 20],
            referenceLabel: 'Discard a whole row or column based on the comparison',
            acceptableKeywords: ['cell too big drop column', 'cell too small drop row', 'eliminate a full line', 'move based on comparison'],
            hint: 'When the cell misses, how does its value tell you to delete an entire row or column?',
            misconception: 'Moving the wrong index discards the line that might still hold the target.',
          },
          {
            lineRange: [21, 22],
            referenceLabel: 'Report absence after walking off the grid',
            acceptableKeywords: ['exhausted the grid return false', 'walked off the plate', 'no match found', 'not present'],
            hint: 'If the walk leaves the grid entirely, what does that prove about the target?',
            misconception: 'This is the failure exit, reached only when every row and column is exhausted.',
          },
        ],
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
        subgoals: [
          {
            lineRange: [1, 6],
            referenceLabel: 'Move the data into the space where the comparison is natural',
            acceptableKeywords: ['convert to strings', 'work in string space', 'import the comparator adapter', 'represent items for concatenation'],
            hint: 'In what representation does "which arrangement reads larger" become a clean comparison?',
            misconception: 'This only reframes the items; the ordering rule has not been defined yet.',
          },
          {
            lineRange: [7, 16],
            referenceLabel: 'Define the pairwise rule that decides which item leads',
            acceptableKeywords: ['custom comparator', 'compare a+b against b+a', 'pairwise ordering rule', 'which concatenation is bigger'],
            hint: 'For two pieces, what local test says which one belongs first?',
            misconception: 'Numeric or plain lexicographic order is wrong here; the rule must compare both gluings.',
          },
          {
            lineRange: [17, 21],
            referenceLabel: 'Sort the whole collection under the custom rule',
            acceptableKeywords: ['sort by the comparator', 'apply the ordering globally', 'cmp_to_key sort', 'arrange all pieces'],
            hint: 'How do you turn the two-item rule into a full arrangement of every piece?',
            misconception: 'This relies on the pairwise rule being a true total order, or the sort is meaningless.',
          },
          {
            lineRange: [22, 26],
            referenceLabel: 'Assemble the answer and collapse the all-zeros edge case',
            acceptableKeywords: ['join into the final string', 'handle leading zero', 'collapse all zeros to one', 'build the result'],
            hint: 'After concatenating in order, what single degenerate input still needs special care?',
            misconception: 'Forgetting the leading-zero collapse emits "000" instead of "0" for all-zero input.',
          },
        ],
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
    {
      id: 'last-boat-out',
      title: 'Last Boat Out',
      difficulty: 'easy',
      statement: `
A harbor runs two ferry piers, north and south, and each pier keeps its own departure log: the minute-stamps of every boat that left, already **sorted ascending**. The logs are never combined — until the complaints desk opens.

Each complaint is a passenger arrival time \`t\`. To process it, the desk needs the **most recent departure from either pier at or before** \`t\` — the boat that passenger just watched sail away — or \`-1\` if no boat had left the harbor by then.

Given the logs \`north\` and \`south\` and the list \`queries\` of arrival times, return one answer per query, in query order. Minute-stamps may repeat within and across the logs.
`,
      examples: [
        {
          input: 'north = [10, 30, 60], south = [20, 45], queries = [5, 20, 40, 100]',
          output: '[-1, 20, 30, 60]',
          explanation:
            'The combined timeline is [10, 20, 30, 45, 60]. At t = 5 nothing has left yet; at t = 40 the latest departure is 30.',
        },
        {
          input: 'north = [], south = [15], queries = [14, 15, 16]',
          output: '[-1, 15, 15]',
          explanation: 'A boat leaving exactly at the arrival minute counts as "at or before".',
        },
        {
          input: 'north = [], south = [], queries = [7]',
          output: '[-1]',
          explanation: 'Empty logs mean every complaint answers -1.',
        },
      ],
      constraints: [
        '0 <= len(north), len(south) <= 100_000',
        'both logs are sorted ascending and may contain repeated minute-stamps',
        '0 <= len(queries) <= 100_000',
        '0 <= every minute-stamp and query <= 10^9',
        'answers must be returned in query order',
      ],
      hints: [
        'Answering one complaint by scanning both logs end to end works — but the desk fields thousands of complaints against the same two logs. What could you build once so every later question stops being a full scan?',
        'Each log is already sorted, and two sorted lists weave into one sorted timeline in a single linear pass with two pointers. On one sorted timeline, "latest departure at or before t" is a predecessor question.',
        'Merge the logs with two pointers, then answer each query with bisect.bisect_right(merged, t): that index is the first departure strictly after t, so the entry just before it is the answer — and index 0 means no boat had left, so return -1.',
      ],
      functionName: 'last_departures',
      starterCode: `def last_departures(north: list[int], south: list[int], queries: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `import bisect


def last_departures(north: list[int], south: list[int], queries: list[int]) -> list[int]:
    # One-time investment: weave the two pre-sorted logs into a single
    # sorted timeline. Two pointers, linear time -- no comparison sort
    # needed, because each log already supplies its own order.
    merged: list[int] = []
    i = j = 0
    while i < len(north) and j < len(south):
        if north[i] <= south[j]:
            merged.append(north[i])
            i += 1
        else:
            merged.append(south[j])
            j += 1
    # One log is exhausted; the other's tail is already sorted.
    merged.extend(north[i:])
    merged.extend(south[j:])

    answers: list[int] = []
    for t in queries:
        # bisect_right finds the first departure STRICTLY after t,
        # so the slot just before it holds the predecessor.
        idx = bisect.bisect_right(merged, t)
        answers.append(merged[idx - 1] if idx > 0 else -1)
    return answers
`,
        commentary: `
The two logs are each sorted, so running a comparison sort over their concatenation would pay \`O(n log n)\` for order the data **already has**. A two-pointer merge harvests that existing structure in \`O(n + m)\` — the same move merge sort makes internally, used here as preprocessing rather than as a sorting subroutine.

The payoff is monotonicity: on one sorted timeline, "latest departure at or before \`t\`" is a predecessor query, and \`bisect_right\` answers it in \`O(log(n + m))\` by discarding half the remaining timeline per comparison. Note what a hash set could **not** do here: it answers "did a boat leave exactly at \`t\`?" but is blind to *nearest-below* — predecessor and successor queries are precisely where sorted order beats hashing.

Concretely, \`bisect_right(merged, t)\` is the count of departures \`<= t\` (ties land to its left), so \`merged[idx - 1]\` is the latest qualifying boat and \`idx == 0\` means the harbor was still quiet.
`,
        complexity: 'Time O(n + m) to merge + O(log(n + m)) per query; Space O(n + m) for the timeline',
        subgoals: [
          {
            lineRange: [1, 9],
            referenceLabel: 'Set up the combined timeline and twin read cursors',
            acceptableKeywords: ['import the search helper', 'initialize the output list', 'two pointers at the starts', 'prepare to merge'],
            hint: 'Before weaving two sorted logs, what container and cursors do you initialize?',
            misconception: 'This is preparation; the actual interleaving has not started.',
          },
          {
            lineRange: [10, 16],
            referenceLabel: 'Interleave two pre-sorted runs by always taking the smaller front',
            acceptableKeywords: ['merge two sorted lists', 'take the smaller head', 'advance the chosen pointer', 'linear-time weave'],
            hint: 'At each step, which of the two front elements goes into the timeline next?',
            misconception: 'A comparison sort here re-derives order the inputs already carry.',
          },
          {
            lineRange: [17, 19],
            referenceLabel: 'Append whichever run still has leftovers',
            acceptableKeywords: ['drain the remaining tail', 'flush the leftover run', 'append the rest', 'finish the exhausted merge'],
            hint: 'Once one log runs out, what do you do with the other log’s remaining entries?',
            misconception: 'Skipping the leftover tail drops the largest timestamps from the timeline.',
          },
          {
            lineRange: [20, 27],
            referenceLabel: 'Answer each predecessor query by binary search',
            acceptableKeywords: ['find latest value at or before', 'predecessor via bisect', 'binary search per query', 'nearest below the target'],
            hint: 'On the single sorted timeline, how do you find the latest entry not exceeding each query?',
            misconception: 'A hash set answers exact membership but cannot find the nearest-below entry.',
          },
        ],
      },
      testCases: [
        { input: [[10, 30, 60], [20, 45], [5, 20, 40, 100]], expected: [-1, 20, 30, 60], label: 'basic complaints' },
        { input: [[], [15], [14, 15, 16]], expected: [-1, 15, 15], label: 'departure exactly at arrival' },
        { input: [[], [], [7]], expected: [-1], label: 'both logs empty' },
        { input: [[5, 5, 9], [5, 7], [5, 6, 8, 9]], expected: [5, 5, 7, 9], hidden: true, label: 'duplicate stamps across piers' },
        { input: [[100], [200], [99, 100, 150, 250]], expected: [-1, 100, 100, 200], hidden: true, label: 'before, at, between, after' },
        { input: [[1, 4, 7], [2, 5, 8], [3, 6, 9, 0]], expected: [2, 5, 8, -1], hidden: true, label: 'fully interleaved logs' },
        { input: [[1, 2], [3], []], expected: [], hidden: true, label: 'no complaints filed' },
      ],
      furtherPractice: [
        { name: 'LeetCode 88. Merge Sorted Array', note: 'the merge half of this problem' },
        { name: 'LeetCode 744. Find Smallest Letter Greater Than Target', note: 'the successor twin of this predecessor query' },
      ],
    },
    {
      id: 'latte-ballots',
      title: 'Latte-Art Standings',
      difficulty: 'medium',
      statement: `
A latte-art championship ends with every judge submitting a complete ballot: a ranking of **all** competitors from best pour to worst. The trophy committee turns the stack of ballots into final standings with a strict positional rule:

1. The competitor with the most **1st-place votes** ranks highest.
2. Ties break by most **2nd-place votes**, then 3rd-place, and so on through every position.
3. Competitors tied at **every single position** are ordered by plain string comparison of their names, smaller first.

Given \`ballots\`, where each ballot is a list of competitor names (best first) and every ballot ranks the same competitors, return the final standings as a list of names, best first.
`,
      examples: [
        {
          input: 'ballots = [["ana", "bo", "cy"], ["ana", "cy", "bo"], ["bo", "ana", "cy"]]',
          output: '["ana", "bo", "cy"]',
          explanation:
            'ana earns 2 first-place votes against 1 for bo and 0 for cy, so first-place counts settle the whole ranking.',
        },
        {
          input: 'ballots = [["kit", "lee"], ["lee", "kit"]]',
          output: '["kit", "lee"]',
          explanation:
            'Each name collects one 1st and one 2nd — tied at every position — so the standings fall back to name order.',
        },
        {
          input: 'ballots = [["a", "b", "c"], ["b", "a", "c"], ["c", "a", "b"]]',
          output: '["a", "b", "c"]',
          explanation: 'All three tie on firsts with one each; second-place counts (a: 2, b: 1, c: 0) break the tie.',
        },
      ],
      constraints: [
        '1 <= len(ballots) <= 1_000',
        '1 <= number of competitors <= 26',
        'every ballot is a permutation of the same set of names',
        'names are non-empty lowercase strings, all distinct',
      ],
      hints: [
        'Collapsing each ballot into points (3 for 1st, 2 for 2nd, ...) feels natural — but a competitor with one first and nothing else must outrank one with zero firsts and a mountain of seconds. What information does a single summed score destroy?',
        'Give every competitor a full tally: how many 1sts, how many 2nds, and so on. Comparing two competitors is then a left-to-right walk down their tallies — which is exactly how Python compares two lists.',
        'Sort the names with key = ([-count for each position], name): negating turns "more votes is better" into ascending order, and appending the name itself makes the alphabetical fallback part of the same key. One sorted() call implements the whole rule.',
      ],
      functionName: 'rank_baristas',
      starterCode: `def rank_baristas(ballots: list[list[str]]) -> list[str]:
    pass
`,
      solution: {
        code: `def rank_baristas(ballots: list[list[str]]) -> list[str]:
    # Every ballot ranks the same names; the first ballot lists them all.
    names = ballots[0]
    positions = len(names)
    # tally[name][p] = how many ballots put this name at position p.
    tally = {name: [0] * positions for name in names}
    for ballot in ballots:
        for pos, name in enumerate(ballot):
            tally[name][pos] += 1

    def standing_key(name: str):
        # Negate each count: "more votes at this position" becomes
        # "smaller key element", so an ascending sort ranks winners
        # first. The name rides along as the all-positions-tied
        # fallback, making the order total and deterministic.
        return ([-c for c in tally[name]], name)

    # Python compares the keys left to right: the count lists element
    # by element (position by position), then -- only on a complete
    # tie -- the name.
    return sorted(names, key=standing_key)
`,
        commentary: `
The tempting move — weighting positions into one number — is **lossy**: any fixed point scheme either lets enough 2nd places outweigh a 1st (violating rule 1) or has to space weights so far apart that it is really a positional comparison in disguise. The rule is *lexicographic by position*, so the faithful representation is the full tally vector per competitor, not a scalar.

Sorting by a composite key works because Python compares sequences lexicographically: it walks the negated tallies position by position and only consults later entries on exact ties — which is precisely the committee's procedure, mechanized. The trailing \`name\` term is not decoration: it upgrades the comparison to a **total order**, so even competitors tied at every position resolve deterministically and the sort can never emit one of several "valid" outputs.

This is the chained-criteria idea from the concept page compressed into a single key — primary, secondary, and final fallback packed in priority order, with no need for repeated stable sorts.
`,
        complexity: 'Time O(b·n) tallying + O(n log n) comparisons of O(n)-long keys = O(b·n + n^2 log n); Space O(n^2) for the tallies',
        subgoals: [
          {
            lineRange: [1, 6],
            referenceLabel: 'Enumerate the candidates and allocate a per-position tally',
            acceptableKeywords: ['collect the candidate names', 'set up the tally structure', 'count slots per position', 'initialize position counts'],
            hint: 'Before counting anything, what structure must exist to hold per-position votes?',
            misconception: 'This only allocates the counters; no ballots have been tallied yet.',
          },
          {
            lineRange: [7, 9],
            referenceLabel: 'Accumulate how often each item lands at each position',
            acceptableKeywords: ['count votes per position', 'tally each ballot', 'increment position counts', 'aggregate the rankings'],
            hint: 'How do you turn the raw ballots into a profile of each name across positions?',
            misconception: 'This fills the tally; it does not yet decide any ordering.',
          },
          {
            lineRange: [10, 16],
            referenceLabel: 'Build a composite key encoding the tie-breaking priority',
            acceptableKeywords: ['lexicographic key by position', 'negate counts for descending', 'name as final tiebreak', 'multi-level sort key'],
            hint: 'How do you pack "first position counts, then second, then a final fallback" into one comparable value?',
            misconception: 'Collapsing the positions into one weighted number loses the lexicographic rule.',
          },
          {
            lineRange: [17, 21],
            referenceLabel: 'Produce the standings by sorting on that key',
            acceptableKeywords: ['sort names by the key', 'order by composite key', 'apply the ranking key', 'final ordering'],
            hint: 'With the priority encoded as a key, what single operation yields the standings?',
            misconception: 'Without the trailing name term the order would not be total or deterministic.',
          },
        ],
      },
      testCases: [
        {
          input: [[['ana', 'bo', 'cy'], ['ana', 'cy', 'bo'], ['bo', 'ana', 'cy']]],
          expected: ['ana', 'bo', 'cy'],
          label: 'firsts decide everything',
        },
        {
          input: [[['kit', 'lee'], ['lee', 'kit']]],
          expected: ['kit', 'lee'],
          label: 'all-position tie falls to name order',
        },
        { input: [[['zed', 'amy', 'raj']]], expected: ['zed', 'amy', 'raj'], label: 'single ballot is its own standings' },
        {
          input: [[['a', 'b', 'c'], ['b', 'a', 'c'], ['c', 'a', 'b']]],
          expected: ['a', 'b', 'c'],
          hidden: true,
          label: 'seconds break a three-way tie',
        },
        {
          input: [[['mia', 'noa'], ['noa', 'mia'], ['mia', 'noa'], ['noa', 'mia']]],
          expected: ['mia', 'noa'],
          hidden: true,
          label: 'even split, alphabetical fallback',
        },
        { input: [[['solo']]], expected: ['solo'], hidden: true, label: 'one competitor' },
        {
          input: [[['d', 'c', 'b', 'a'], ['d', 'b', 'c', 'a'], ['c', 'd', 'b', 'a']]],
          expected: ['d', 'c', 'b', 'a'],
          hidden: true,
          label: 'tie-break chain reaches third position',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 1366. Rank Teams by Votes', note: 'the canonical positional-vote ranking' },
        { name: 'LeetCode 937. Reorder Data in Log Files', note: 'another multi-criterion key with explicit tie-breaks' },
      ],
    },
    {
      id: 'meteor-leaderboard',
      title: 'Fireball Leaderboard',
      difficulty: 'medium',
      statement: `
An all-sky meteor camera streams detections through the night, each tagged with an apparent **magnitude** — the astronomical brightness scale where **lower numbers mean brighter** (a dazzling fireball can go negative). The camera's processing board is tiny: it may hold at most \`k\` magnitudes at any moment, plus a fixed handful of loop variables. Buffering the whole night and sorting it at dawn is physically impossible.

At dawn the observatory wants the night's **k brightest detections** — the \`k\` smallest magnitudes, counting duplicates — reported in **ascending order** (brightest first). If the night produced fewer than \`k\` detections, report them all, ascending.

Given the stream as a list \`readings\` and the budget \`k\`, return that report.
`,
      examples: [
        {
          input: 'readings = [2.5, -1.4, 0.3, 5.0, -0.2], k = 3',
          output: '[-1.4, -0.2, 0.3]',
          explanation: 'The three smallest magnitudes, ascending — the fireball at -1.4 leads the report.',
        },
        {
          input: 'readings = [4.0, 4.0, 4.0, 1.0], k = 2',
          output: '[1.0, 4.0]',
          explanation: 'Duplicates count separately; only one of the three 4.0 readings makes the cut.',
        },
        {
          input: 'readings = [3.2, 1.1], k = 5',
          output: '[1.1, 3.2]',
          explanation: 'A short night: fewer detections than k, so everything is reported.',
        },
      ],
      constraints: [
        '0 <= len(readings) <= 1_000_000',
        '1 <= k <= 10_000',
        '-30.0 <= readings[i] <= 30.0 (floating point)',
        'memory: at most k stored readings plus O(1) extra — no full-night buffer',
        'output is ascending and keeps duplicates',
      ],
      hints: [
        'Imagine the night just ended and the report is due. Of everything that streamed past, how little did you actually need to remember — and at the instant each reading arrived, what single question decided whether it could ever matter?',
        'A reading belongs in the final report only if it is among the k smallest seen so far. Keep a leaderboard of at most k magnitudes: a newcomer either fails to beat the worst member (drop it instantly) or joins and evicts that worst member.',
        'Keep the leaderboard as a sorted list. While it holds fewer than k values, bisect.insort every reading. Once full, compare each newcomer with the last element: if smaller, insort it and pop() the end. When the stream ends, the buffer is the answer — already ascending.',
      ],
      functionName: 'brightest_meteors',
      starterCode: `def brightest_meteors(readings: list[float], k: int) -> list[float]:
    pass
`,
      solution: {
        code: `import bisect


def brightest_meteors(readings: list[float], k: int) -> list[float]:
    # Sorted leaderboard of the k smallest magnitudes seen so far,
    # ascending -- so board[-1] is always the current WORST member.
    board: list[float] = []
    for mag in readings:
        if len(board) < k:
            # Leaderboard not yet full: every reading qualifies for now.
            bisect.insort(board, mag)
        elif mag < board[-1]:
            # Beats the worst member: binary-search the slot, insert,
            # then evict the displaced worst to respect the k-budget.
            bisect.insort(board, mag)
            board.pop()
        # else: too dim to ever appear in the answer -- rejected after
        # one comparison, which is the common case in a long stream.
    # The invariant kept the board sorted ascending all night,
    # so it IS the report.
    return board
`,
        commentary: `
The full-sort answer — \`sorted(readings)[:k]\` — computes a total order over a million readings just to keep \`k\` of them, and violates the memory budget outright. The fix is a **selection invariant**: after any prefix of the stream, the board holds exactly that prefix's \`k\` smallest values. A newcomer only ever interacts with one number, the board's current maximum, because beating *any* member implies beating the worst one.

Keeping the board sorted makes both halves of the update easy to reason about: \`bisect\` locates the insertion slot in \`O(log k)\` comparisons and eviction is a \`pop()\` from the end. (Honest accounting: a Python list shifts elements on insert, so an accepted reading costs \`O(k)\` moves worst-case; a max-heap makes every update a strict \`O(log k)\` at the price of losing the always-sorted property. With \`k\` small and most readings rejected in \`O(1)\`, the sorted list is the simpler tool and the rejections dominate.)

Contrast with quickselect: that finds **one rank** inside a buffer you fully hold; here the memory wall forces a *streaming* selection that never holds the data at all. And the answer needs no final sort — the invariant kept it ascending the whole night.
`,
        complexity: 'Time O(n log k) comparisons (rejections cost O(1); each accepted insert shifts O(k)); Space O(k)',
        subgoals: [
          {
            lineRange: [1, 7],
            referenceLabel: 'Start an empty bounded leaderboard and stream the input',
            acceptableKeywords: ['initialize the sorted board', 'bounded running collection', 'set up the streaming loop', 'empty top-k holder'],
            hint: 'What small ordered structure do you maintain as readings arrive one at a time?',
            misconception: 'This only sets up the board and the stream; no selection has happened yet.',
          },
          {
            lineRange: [8, 11],
            referenceLabel: 'Admit every item while the board is below capacity',
            acceptableKeywords: ['board not yet full', 'insert until capacity reached', 'fill the first k', 'accept while under budget'],
            hint: 'Until the board reaches its size limit, which incoming readings qualify?',
            misconception: 'This warm-up phase is not the competitive replacement; every reading still fits.',
          },
          {
            lineRange: [12, 18],
            referenceLabel: 'Swap in a newcomer that beats the current worst, evicting the loser',
            acceptableKeywords: ['compare against the worst member', 'insert then evict the maximum', 'replace the weakest', 'maintain the top-k invariant'],
            hint: 'Once full, what single member must a reading beat, and what then gets dropped?',
            misconception: 'Comparing against anything but the worst member admits values that cannot belong.',
          },
          {
            lineRange: [19, 21],
            referenceLabel: 'Return the board, already in sorted order',
            acceptableKeywords: ['return the leaderboard', 'invariant keeps it sorted', 'no final sort needed', 'report the top-k'],
            hint: 'After the stream ends, why is no extra sorting required before returning?',
            misconception: 'The board is already ordered by the invariant; re-sorting would be wasted work.',
          },
        ],
      },
      testCases: [
        { input: [[2.5, -1.4, 0.3, 5.0, -0.2], 3], expected: [-1.4, -0.2, 0.3], label: 'basic night' },
        { input: [[4.0, 4.0, 4.0, 1.0], 2], expected: [1.0, 4.0], label: 'duplicates at the cut' },
        { input: [[3.2, 1.1], 5], expected: [1.1, 3.2], label: 'fewer detections than k' },
        { input: [[-8.2, 12.0, -8.2, 0.5], 3], expected: [-8.2, -8.2, 0.5], label: 'duplicate fireballs both kept' },
        { input: [[], 3], expected: [], hidden: true, label: 'cloudy night, empty stream' },
        { input: [[2.0, 2.0, 2.0, 1.0, 3.0], 3], expected: [1.0, 2.0, 2.0], hidden: true, label: 'ties straddling the boundary' },
        { input: [[7.5, -3.0, 0.0], 1], expected: [-3.0], hidden: true, label: 'k = 1 keeps only the brightest' },
        { input: [[5.0, 4.0, 3.0, 2.0, 1.0], 2], expected: [1.0, 2.0], hidden: true, label: 'every reading improves the board' },
      ],
      furtherPractice: [
        { name: 'LeetCode 703. Kth Largest Element in a Stream', note: 'the streaming-selection classic, mirrored to largest' },
        { name: 'LeetCode 658. Find K Closest Elements', note: 'selection by a derived distance key' },
      ],
    },
    {
      id: 'firmware-order',
      title: 'Firmware Rollout Order',
      difficulty: 'medium',
      statement: `
A robotics fleet's update server stores release tags like \`"2.4.10"\`: one to four numeric components joined by dots. Components can have any digit count and may carry leading zeros (\`"1.02"\` means component value 2). The rollout planner needs the tags in a strict, reproducible order, defined by three levels:

1. Compare **numerically, component by component, left to right**; a missing component counts as \`0\` (so \`"1.4"\` and \`"1.4.0"\` are numerically equal).
2. If two tags are numerically equal, the tag with **fewer components** comes first.
3. If still tied, the **lexicographically smaller raw string** comes first (so \`"1.02"\` precedes \`"1.2"\`).

Given the list \`tags\`, return it sorted ascending under this order. Plain string sorting is wrong: it would place \`"1.10"\` before \`"1.9"\`.
`,
      examples: [
        {
          input: 'tags = ["1.10", "1.9", "1.9.1"]',
          output: '["1.9", "1.9.1", "1.10"]',
          explanation: 'Numerically 9 < 10, so both 1.9-series releases precede 1.10 — the opposite of string order.',
        },
        {
          input: 'tags = ["2.0", "2", "2.0.0"]',
          output: '["2", "2.0", "2.0.0"]',
          explanation: 'All three are numerically equal; the tag with fewer components sorts first.',
        },
        {
          input: 'tags = ["1.02", "1.2"]',
          output: '["1.02", "1.2"]',
          explanation: 'Equal numbers and equal component counts — the raw-string rule decides ("0" < "2").',
        },
      ],
      constraints: [
        '1 <= len(tags) <= 10_000',
        'each tag has 1–4 dot-separated components',
        'each component is 1–6 decimal digits; leading zeros allowed',
        'duplicate tags may appear',
        'output ascending under the three-level rule in the statement',
      ],
      hints: [
        "Character-by-character comparison thinks '1.10' comes before '1.9' because the character '1' loses to '9' — yet release 1.10 is newer. What unit does the ordering rule actually compare, and what must each tag become before any comparison can be trusted?",
        'Split each tag on dots and convert the pieces to integers. Padding every list with zeros to a common length turns rule 1 into a plain element-wise list comparison — something Python performs natively.',
        'Build one composite key per tag: (numeric components padded to length 4, component count, raw string). Tuples compare left to right, so this single key encodes all three levels — then sorted(tags, key=...) is the entire algorithm.',
      ],
      functionName: 'order_firmware',
      starterCode: `def order_firmware(tags: list[str]) -> list[str]:
    pass
`,
      solution: {
        code: `def order_firmware(tags: list[str]) -> list[str]:
    def release_key(tag: str):
        parts = tag.split('.')
        # Rule 1 raw material: the numeric value of each component.
        # int() also erases leading zeros ("02" -> 2) for free.
        nums = [int(p) for p in parts]
        # Pad to the maximum width (4) so a missing component counts
        # as 0 and list comparison never ends early on length alone.
        padded = nums + [0] * (4 - len(nums))
        # Rules 2 and 3 ride along as later tuple slots: component
        # count, then the raw string. Tuples compare left to right,
        # so each level is consulted only on a tie at the level above.
        return (padded, len(parts), tag)

    # One sort over a key that IS the total order.
    return sorted(tags, key=release_key)
`,
        commentary: `
This is comparator design with a different tool than the pairwise trick: when an ordering can be phrased as **"translate each item, then compare the translations"**, a *key function* beats a \`cmp_to_key\` comparator. Keys are computed once per element (\`O(n)\` translations) instead of once per comparison, and the total-order proof comes free — tuples of lists, ints, and strings inherit transitivity and antisymmetry from their parts, so the sort cannot misbehave.

The three-level rule maps onto tuple slots in priority order. The padding is what makes rule 1 sound: without it, Python would rank \`[1, 4]\` before \`[1, 4, 0]\` purely by length, silently smuggling rule 2's job into rule 1 territory and breaking numeric equality. The explicit fallback levels matter for **determinism** — a rule that stopped at "numerically equal" would leave \`"2"\` versus \`"2.0"\` to accidents of input order, and any consumer diffing two rollout plans would see phantom changes.

The pitfall this problem rehearses: an under-specified order does not crash, it just quietly returns *one of several valid* arrangements. Forcing every tie to resolve makes the sort a pure function of the tag multiset.
`,
        complexity: 'Time O(n log n) comparisons on small fixed-size keys, plus O(n) key construction; Space O(n) for the keys',
        subgoals: [
          {
            lineRange: [1, 6],
            referenceLabel: 'Decompose each item into its numeric components',
            acceptableKeywords: ['split on the separator', 'parse parts to integers', 'extract numeric components', 'normalize each segment'],
            hint: 'What is the raw numeric material for ordering, pulled out of each tag?',
            misconception: 'This only parses the segments; the comparison rule is not yet assembled.',
          },
          {
            lineRange: [7, 9],
            referenceLabel: 'Pad to a fixed width so short items compare correctly',
            acceptableKeywords: ['pad to fixed length', 'missing component counts as zero', 'align the component vectors', 'normalize widths'],
            hint: 'Why must a shorter component list be extended before it can be compared numerically?',
            misconception: 'Without padding, length alone decides order and smuggles a later rule into rule one.',
          },
          {
            lineRange: [10, 13],
            referenceLabel: 'Assemble a tuple key with the tie-break levels in priority order',
            acceptableKeywords: ['build the composite key', 'order the tie-break levels', 'tuple compares left to right', 'priority-ordered key'],
            hint: 'How do you stack the primary, secondary, and final fallback into one comparable value?',
            misconception: 'Omitting later levels leaves equal-on-numbers tags resolved by accident of input order.',
          },
          {
            lineRange: [14, 16],
            referenceLabel: 'Sort once using that translated key',
            acceptableKeywords: ['sort by the key function', 'one pass over the translation', 'apply the release key', 'final ordering'],
            hint: 'With each item translated to a total-order key, what single call produces the result?',
            misconception: 'A key function computes once per item; a pairwise comparator would recompute per comparison.',
          },
        ],
      },
      testCases: [
        { input: [['1.10', '1.9', '1.9.1']], expected: ['1.9', '1.9.1', '1.10'], label: 'numeric beats lexicographic' },
        { input: [['2.0', '2', '2.0.0']], expected: ['2', '2.0', '2.0.0'], label: 'fewer components first' },
        { input: [['1.02', '1.2']], expected: ['1.02', '1.2'], label: 'raw-string final tie-break' },
        { input: [['1.007', '1.6']], expected: ['1.6', '1.007'], label: 'leading zeros are still numbers' },
        { input: [['0.9', '0.10', '0.9.9', '1.0']], expected: ['0.9', '0.9.9', '0.10', '1.0'], hidden: true, label: 'mixed depths and double digits' },
        { input: [['7']], expected: ['7'], hidden: true, label: 'single tag' },
        { input: [['3.1', '3.1', '3.01']], expected: ['3.01', '3.1', '3.1'], hidden: true, label: 'duplicates plus zero-padded twin' },
        { input: [['10.0.0.1', '9.99.99.99', '10.0.0']], expected: ['9.99.99.99', '10.0.0', '10.0.0.1'], hidden: true, label: 'four components, large values' },
      ],
      furtherPractice: [
        { name: 'LeetCode 165. Compare Version Numbers', note: 'the two-tag comparison this order generalizes' },
        { name: 'LeetCode 1356. Sort Integers by The Number of 1 Bits', note: 'another composite-key sort with an explicit tie-break' },
      ],
    },
    {
      id: 'seed-upsets',
      title: 'Bracket Chaos Score',
      difficulty: 'hard',
      statement: `
A speedrunning championship seeds every finalist with a qualifier number — seed 1 ran the fastest qualifier, seed 2 the next, and so on. After the grand final, the broadcast wants a single "chaos score" for the headline: the number of **upset pairs** in the result.

You are given \`finish\`, the finalists' seed numbers listed in finishing order (champion first). A pair of finalists is an upset pair when the one who finished **earlier** carries the **numerically larger** (worse) seed — formally, indices \`i < j\` with \`finish[i] > finish[j]\`. Co-seeded finalists (equal numbers are possible after qualifier ties) never form an upset pair.

Fields can be large, so the score must be computed faster than checking every pair.
`,
      examples: [
        {
          input: 'finish = [2, 1, 3]',
          output: '1',
          explanation: 'Seed 2 finishing ahead of seed 1 is the only upset pair.',
        },
        {
          input: 'finish = [1, 2, 3, 4]',
          output: '0',
          explanation: 'Pure chalk: every finalist finished exactly where qualifying predicted.',
        },
        {
          input: 'finish = [3, 2, 1]',
          output: '3',
          explanation: 'All three pairs are inverted: (3,2), (3,1), and (2,1).',
        },
        {
          input: 'finish = [2, 2, 1]',
          output: '2',
          explanation: 'Each co-seeded 2 beat seed 1 (two upsets), but the equal 2s do not upset each other.',
        },
      ],
      constraints: [
        '0 <= len(finish) <= 200_000',
        '1 <= finish[i] <= 10^9',
        'equal seeds are possible and never count as upsets',
        'the answer can reach n·(n-1)/2 ≈ 2·10^10 — return it exactly',
        'aim for better than O(n^2)',
      ],
      hints: [
        'The definition reads like "check every pair", which is quadratic. But the output is a single count — no pair ever has to be named individually. Could some larger computation you already know account for many pairs with one arithmetic step as a side effect?',
        'Suppose the left half and the right half of the list were each already sorted. The moment a merge takes an element from the right half, that element is smaller than EVERY element still waiting in the left half — and each of those left/right pairs is an upset, all countable at once.',
        'Write a merge sort where each call returns (sorted run, upset count). In the merge loop, when right[j] < left[i], add len(left) - i to the count before consuming right[j]; on ties consume from the LEFT so equal seeds add nothing. The total is left count + right count + merge count.',
      ],
      functionName: 'count_upsets',
      starterCode: `def count_upsets(finish: list[int]) -> int:
    pass
`,
      solution: {
        code: `def count_upsets(finish: list[int]) -> int:
    # Merge sort, instrumented: each merge counts cross-half upsets
    # in bulk while producing the sorted run it would build anyway.
    def sort_count(arr):
        # Returns (sorted copy of arr, upset pairs entirely inside arr).
        n = len(arr)
        if n <= 1:
            return arr, 0
        mid = n // 2
        left, upsets_left = sort_count(arr[:mid])
        right, upsets_right = sort_count(arr[mid:])

        merged = []
        upsets = upsets_left + upsets_right
        i = j = 0
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:
                # In order, or a tie: take from the LEFT so equal
                # seeds never register as upsets.
                merged.append(left[i])
                i += 1
            else:
                # right[j] beats every element still waiting in left
                # (left is sorted), and each of those stood EARLIER
                # in the original order: len(left) - i upsets at once.
                upsets += len(left) - i
                merged.append(right[j])
                j += 1
        # Whichever run remains is already sorted and adds no upsets.
        merged.extend(left[i:])
        merged.extend(right[j:])
        return merged, upsets

    _, total = sort_count(list(finish))
    return total
`,
        commentary: `
The insight is that **sorting and counting disorder are the same computation**. An upset pair is exactly an *inversion* — a pair the eventual sort must logically repair — and merge sort encounters every inversion in a countable way without ever enumerating pairs one at a time.

Why does the merge count them in bulk? Split the list: pairs living entirely inside one half are handled by recursion. A cross-half pair is an upset precisely when the left member exceeds the right member, and the merge discovers all of these at once — the moment \`right[j]\` is chosen over \`left[i]\`, sortedness of the left run guarantees that all \`len(left) - i\` of its survivors exceed \`right[j]\`, and every one of them stood earlier in the original order. One subtraction books the whole batch. No pair is double-counted: each is counted at the unique recursion level where its two members first land in different halves.

The tie rule is load-bearing. Taking from the left on \`left[i] <= right[j]\` keeps equal seeds out of the count (and, incidentally, keeps the sort stable); flip the comparison to strict \`<\` and \`[2, 2, 1]\` silently over-counts. The recursion does \`O(n)\` merge work on each of \`O(log n)\` levels — the familiar merge-sort bill, now buying a statistic instead of just order.
`,
        complexity: 'Time O(n log n); Space O(n) for merge scratch plus O(log n) recursion depth',
        subgoals: [
          {
            lineRange: [1, 8],
            referenceLabel: 'Frame the recursive helper and its trivial base case',
            acceptableKeywords: ['define the recursive routine', 'base case single element', 'no inversions in a unit', 'set up divide and conquer'],
            hint: 'What is the smallest input the counter can answer without any merging?',
            misconception: 'This is the recursion frame and base case, not where pairs get counted.',
          },
          {
            lineRange: [9, 15],
            referenceLabel: 'Split in half, recurse, and carry the subtotals forward',
            acceptableKeywords: ['divide into two halves', 'recurse on each side', 'sum the inner counts', 'prepare the merge accumulators'],
            hint: 'How do you reduce the problem to two smaller counts before combining them?',
            misconception: 'The within-half inversions come from recursion; the cross-half ones are still uncounted here.',
          },
          {
            lineRange: [16, 28],
            referenceLabel: 'Merge the two runs while counting cross-half inversions in bulk',
            acceptableKeywords: ['merge the sorted halves', 'count inversions during merge', 'batch the cross-half upsets', 'take from left on a tie'],
            hint: 'When you pull from the right run, how many waiting left elements does that reveal as out of order?',
            misconception: 'Using strict less-than on ties over-counts equal elements as upsets.',
          },
          {
            lineRange: [29, 32],
            referenceLabel: 'Flush the leftover run and return the sorted run with its count',
            acceptableKeywords: ['drain the remaining run', 'append the leftover tail', 'return sorted run and count', 'finish the merge'],
            hint: 'After one run empties, what remains to append, and what two things does the helper hand back?',
            misconception: 'The trailing run adds no new inversions; only its elements need appending.',
          },
          {
            lineRange: [33, 35],
            referenceLabel: 'Launch the recursion on a copy and report the total',
            acceptableKeywords: ['kick off the recursion', 'pass a defensive copy', 'extract the total count', 'return the answer'],
            hint: 'What single call starts the whole process, and which part of its result do you actually want?',
            misconception: 'Only the count is wanted; the sorted run produced alongside it is discarded.',
          },
        ],
      },
      testCases: [
        { input: [[2, 1, 3]], expected: 1, label: 'single upset' },
        { input: [[1, 2, 3, 4]], expected: 0, label: 'pure chalk' },
        { input: [[3, 2, 1]], expected: 3, label: 'fully reversed podium' },
        { input: [[2, 2, 1]], expected: 2, hidden: true, label: 'co-seeds never upset each other' },
        { input: [[]], expected: 0, hidden: true, label: 'cancelled final' },
        { input: [[7]], expected: 0, hidden: true, label: 'single finalist' },
        { input: [[5, 1, 4, 2, 3]], expected: 6, hidden: true, label: 'mixed shuffle' },
        { input: [[1, 3, 2, 3, 1]], expected: 4, hidden: true, label: 'duplicates scattered through the field' },
        { input: [[6, 5, 4, 3, 2, 1]], expected: 15, hidden: true, label: 'maximum chaos for n = 6' },
      ],
      furtherPractice: [
        { name: 'LeetCode 493. Reverse Pairs', note: 'merge-and-count with a shifted comparison' },
        { name: 'LeetCode 315. Count of Smaller Numbers After Self', note: 'per-element inversion counts' },
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
