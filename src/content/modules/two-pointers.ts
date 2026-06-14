import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'two-pointers',
  visualizer: 'two-pointers',
  concept: `
## The mental model

Picture two warehouse inspectors walking a single long aisle of shelves. One starts at the far left, one at the far right, and they walk toward each other. Every time they stop, they compare what's on their two shelves and decide — based on a rule they both trust — which one of them should take a step. Because each inspector only ever moves forward, the whole aisle gets covered in one pass, and they never re-check a shelf.

That is the entire trick. Instead of testing every pair of positions (\`O(n^2)\` pairs!), you maintain two indices and use some **structure in the data** — usually sortedness or symmetry — to prove that moving one pointer can never throw away the answer. Each move permanently eliminates a whole family of candidate pairs.

There are two main choreographies:

1. **Converging pointers** — start at both ends, walk inward. Used for pair sums on sorted data, palindrome checks, "best pair of boundaries" problems.
2. **Read/write pointers** (same direction) — both start at the left; a fast \`read\` pointer scans everything while a slow \`write\` pointer marks where the next *kept* element goes. Used for in-place dedup, filtering, and partitioning while preserving order.

## Mechanics

Converging pair-sum on a sorted array: if the current sum is too small, **only** moving the left pointer up can increase it (everything left of \`right\` is smaller than \`arr[right]\`); if too big, only moving the right pointer down can decrease it. Either way, one move is forced and safe.

\`\`\`python
def pair_sum(arr: list[int], target: int) -> list[int]:
    left, right = 0, len(arr) - 1
    while left < right:
        s = arr[left] + arr[right]
        if s == target:
            return [left, right]
        if s < target:
            left += 1      # sum too small: need a bigger left value
        else:
            right -= 1     # sum too big: need a smaller right value
    return [-1, -1]
\`\`\`

The read/write variant keeps an invariant instead of a comparison rule: *everything in \`arr[:write]\` is already the final answer*. The \`read\` pointer races ahead; whenever it finds an element worth keeping, it drops it at \`write\` and bumps \`write\`. Nothing ever needs to shift, so it's one pass and constant extra space.

\`\`\`python
write = 0
for read in range(len(arr)):
    if keep(arr[read]):
        arr[write] = arr[read]
        write += 1
# arr[:write] is the compacted result
\`\`\`

The key thing to internalize: a two-pointer solution is really a **proof disguised as a loop**. Every pointer move must come with an argument like "no pair we just skipped could have been the answer." If you can't state that argument, the technique probably doesn't apply (yet) — maybe you need to sort first, or maybe you need a hash map instead.

## When to reach for it

Concrete signals that two pointers will work:

- The input is **sorted** (or you're allowed to sort it) and you need a **pair/triple with a target property** — sum, difference, closest-to-target.
- The problem mentions **"in place"**, **"remove/compact/partition"**, or "return the array with X filtered out, order preserved." That's read/write pointers.
- You're checking **symmetry**: palindromes, mirrored sequences, comparing a string to its reverse without building the reverse.
- You must choose **two boundaries** (walls, pylons, days) where the score depends on the distance between them and the weaker of the two — converge from the ends, always move the weaker side.
- A brute force enumerates pairs \`(i, j)\` and you suspect monotonic structure makes most pairs provably useless.

If the array is unsorted and you need *original indices*, two pointers usually loses to a hash map — sorting destroys the indices. If the window of interest grows and shrinks based on its *contents* (longest substring with some property), you want the sibling pattern, sliding window.

## Complexity

Converging or same-direction scans touch each element a constant number of times: \`O(n)\` time, \`O(1)\` extra space. If you sort first, the sort dominates: \`O(n log n)\` time. Compare that to the brute-force pair enumeration at \`O(n^2)\` — on a million elements that's the difference between a millisecond and a coffee break. Harder hybrids (like palindrome-with-deletions) layer two-pointer recursion on memoization and land at \`O(n^2)\` time and space — still a massive win over the exponential branching they replace.

## Common pitfalls

- **Forgetting the precondition.** Converging pair-sum is only correct on sorted data. On unsorted input it silently returns garbage.
- **Off-by-one at the meeting point.** Decide deliberately between \`left < right\` and \`left <= right\`. Pair problems need strict \`<\` (two distinct indices); some partition problems need \`<=\`.
- **Moving the wrong pointer in boundary problems.** In max-area problems you must move the *shorter* side — moving the taller one can only shrink the score. Get this backwards and you'll pass small tests and fail hidden ones.
- **Mutating the caller's list** when the problem expects a returned copy, or vice versa. Read the contract.
- **Infinite loops** from a branch that moves neither pointer. Every iteration must advance at least one index.
- **Duplicate handling.** When the answer must skip duplicates (think 3-sum style), advance pointers *past* runs of equal values, or you'll emit repeats.
`,
  realWorldUses: [
    {
      title: 'Sort-merge joins in database engines',
      description:
        'When Postgres or Spark joins two tables sorted on the join key, it walks one cursor down each sorted run, advancing whichever cursor points at the smaller key — a textbook converging/parallel two-pointer walk that joins in linear time over the runs.',
    },
    {
      title: 'Posting-list intersection in search engines',
      description:
        'An inverted index stores, per term, a sorted list of document IDs. To answer "rust AND async", the engine walks two pointers down both posting lists, advancing the one with the smaller doc ID and emitting matches — billions of these intersections run per day.',
    },
    {
      title: 'LSM-tree compaction in storage engines',
      description:
        'RocksDB and Cassandra periodically merge sorted SSTable files. Compaction holds one read pointer per file plus a write pointer into the output file, keeping the newest version of each key and discarding tombstones — read/write pointers at terabyte scale.',
    },
  ],
  problems: [
    {
      id: 'voltage-pair',
      title: 'Battery Pairing Station',
      difficulty: 'easy',
      statement: `
A drone repair shop stores battery cells on a rail, sorted by voltage in non-decreasing order. A repair ticket asks for **two different cells** whose voltages add up to exactly a target value so they can be wired in series.

Given the sorted list \`voltages\` and an integer \`target\`, return the indices \`[i, j]\` (with \`i < j\`) of a valid pair. If more than one pair works, return the pair with the **smallest** \`i\`; if several \`j\` work for that \`i\`, return the **largest** such \`j\`. If no pair adds up to the target, return \`[-1, -1]\`.

You must do better than checking every pair: the rail can hold up to 100,000 cells.
`,
      examples: [
        {
          input: 'voltages = [3, 5, 8, 11], target = 13',
          output: '[1, 2]',
          explanation: '5 + 8 = 13. No pair with a smaller left index works (3 pairs with nothing to make 13).',
        },
        {
          input: 'voltages = [2, 4, 4, 6], target = 8',
          output: '[0, 3]',
          explanation:
            '2 + 6 = 8 uses left index 0, the smallest possible. (Indices 1 and 2 also sum to 8, but their left index is larger.)',
        },
        {
          input: 'voltages = [1, 2, 3, 9], target = 8',
          output: '[-1, -1]',
          explanation: 'No two cells sum to 8.',
        },
      ],
      constraints: [
        '0 <= len(voltages) <= 100_000',
        '-10^9 <= voltages[k] <= 10^9',
        'voltages is sorted in non-decreasing order',
        '-2 * 10^9 <= target <= 2 * 10^9',
        'A cell cannot be paired with itself (indices must differ)',
      ],
      hints: [
        'The rail is already sorted. What does comparing the current pair-sum against the target tell you about which other pairs are still worth considering?',
        'Put one pointer on the lowest-voltage cell and one on the highest. If the sum is too small, only one of the two moves can possibly fix it.',
        'Loop while left < right: on a match return [left, right]; if the sum is below target do left += 1, otherwise right -= 1. Falling out of the loop means no pair exists.',
      ],
      functionName: 'find_voltage_pair',
      starterCode: `def find_voltage_pair(voltages: list[int], target: int) -> list[int]:
    pass
`,
      solution: {
        code: `def find_voltage_pair(voltages: list[int], target: int) -> list[int]:
    # One cursor at each end of the sorted rail.
    left, right = 0, len(voltages) - 1
    while left < right:
        total = voltages[left] + voltages[right]
        if total == target:
            # First match encountered: smallest possible left index,
            # paired with the largest matching right index.
            return [left, right]
        if total < target:
            # Sum too small — only a bigger left value can raise it.
            left += 1
        else:
            # Sum too large — only a smaller right value can lower it.
            right -= 1
    # Pointers met without a match: no valid pair exists.
    return [-1, -1]
`,
        commentary: `
The brute force checks all \`O(n^2)\` pairs. Sortedness lets us discard pairs wholesale instead.

Start \`left\` at index 0 and \`right\` at the last index. If the current sum is **below** the target, then \`voltages[left]\` is too small to pair with *anything* at or below \`right\` — every value between the pointers is at most \`voltages[right]\`. So \`left\` can safely advance. Symmetrically, if the sum is **above** the target, \`voltages[right]\` can never work with anything at or above \`left\`, so \`right\` retreats. Each step permanently rules out one index, which is why the loop terminates in at most \`n\` steps.

The tie-breaking rule in the statement (smallest \`i\`, then largest \`j\`) is exactly what this scan produces naturally: \`right\` never skips a partner for the eventual \`left\` (it only retreats when the sum is provably too big), so the first match found is the canonical one. Empty and single-element rails never enter the loop and fall through to \`[-1, -1]\`.
`,
        complexity: 'Time O(n), Space O(1)',
        subgoals: [
          {
            lineRange: [1, 3],
            referenceLabel: 'Place a cursor at each end of the sorted rail',
            acceptableKeywords: ['pointer at each end', 'left and right start', 'start at both ends', 'cursor at each end'],
            hint: 'Where do the two cursors start on a sorted list?',
            misconception: 'This sets up where to scan from — no sum is computed yet.',
          },
          {
            lineRange: [4, 5],
            referenceLabel: 'Walk inward, summing the two ends',
            acceptableKeywords: ['loop while left less than right', 'add the two ends', 'sum of both pointers', 'converge computing the total'],
            hint: 'What do you compute from the two ends each step?',
            misconception: 'This is the scan and the running sum, not yet the decision.',
          },
          {
            lineRange: [6, 9],
            referenceLabel: 'On an exact match, return the index pair',
            acceptableKeywords: ['sum equals target return', 'exact match returns the pair', 'found the indices', 'hit returns left and right'],
            hint: 'What do you do the moment the two ends hit the target?',
            misconception: 'This is the success exit, not a pointer move.',
          },
          {
            lineRange: [10, 12],
            referenceLabel: 'Sum too small, raise it by advancing left',
            acceptableKeywords: ['sum below target move left', 'too small advance left', 'increase the left pointer', 'raise the total'],
            hint: 'If the sum is below target, which end can make it bigger?',
            misconception: 'Only the left (smaller) side can raise the sum — moving right would lower it.',
          },
          {
            lineRange: [13, 15],
            referenceLabel: 'Sum too big, lower it by retreating right',
            acceptableKeywords: ['sum above target move right', 'too large retreat right', 'decrease the right pointer', 'lower the total'],
            hint: 'If the sum is above target, which end can make it smaller?',
            misconception: 'Only the right (larger) side can lower the sum.',
          },
          {
            lineRange: [16, 17],
            referenceLabel: 'Pointers met with no match, report none',
            acceptableKeywords: ['no pair return negative one', 'pointers met no match', 'fall through to none', 'return minus one'],
            hint: 'If the pointers cross without a match, what is the result?',
            misconception: 'Reaching here means the whole rail was scanned with no valid pair.',
          },
        ],
      },
      testCases: [
        { input: [[3, 5, 8, 11], 13], expected: [1, 2], label: 'basic match' },
        { input: [[1, 2, 3, 9], 8], expected: [-1, -1], label: 'no pair' },
        { input: [[2, 4, 4, 6], 8], expected: [0, 3], label: 'tie-break: smallest i, largest j' },
        { input: [[5, 5, 5, 5], 10], expected: [0, 3], hidden: true, label: 'all equal' },
        { input: [[7], 14], expected: [-1, -1], label: 'single cell cannot pair with itself' },
        { input: [[], 5], expected: [-1, -1], hidden: true, label: 'empty rail' },
        { input: [[-4, -1, 0, 3, 10], -5], expected: [0, 1], hidden: true, label: 'negative voltages' },
        { input: [[1, 2], 3], expected: [0, 1], label: 'minimal pair' },
        { input: [[1, 3, 4, 6, 8, 9, 11, 14], 17], expected: [1, 7], hidden: true, label: 'several candidate pairs' },
      ],
      furtherPractice: [
        { name: 'LeetCode 167. Two Sum II - Input Array Is Sorted', note: 'the classic version (1-indexed)' },
        { name: 'LeetCode 1. Two Sum', note: 'unsorted twist — hash map beats two pointers here' },
        { name: 'LeetCode 15. 3Sum', note: 'fix one element, run this converging scan on the rest' },
      ],
    },
    {
      id: 'telemetry-retention',
      title: 'Telemetry Retention Policy',
      difficulty: 'medium',
      statement: `
A weather station uploads sensor samples as a list of integer readings, already sorted in non-decreasing order. Storage is tight, so the retention policy says: **at most two samples with the same value** may be kept; any further repeats of that value are redundant and must be dropped.

Given the sorted list \`values\`, return a new list containing the retained samples **in their original order**, with each distinct value appearing at most twice.

Aim for a single pass with \`O(1)\` extra space beyond the output — the station's firmware cannot afford to build intermediate sets or counters per value.
`,
      examples: [
        {
          input: 'values = [1, 1, 1, 2, 2, 3]',
          output: '[1, 1, 2, 2, 3]',
          explanation: 'The third 1 violates the keep-at-most-two rule and is dropped; everything else survives.',
        },
        {
          input: 'values = [0, 0, 0, 0]',
          output: '[0, 0]',
          explanation: 'Only the first two zeros are retained.',
        },
        {
          input: 'values = [1, 2, 3, 4]',
          output: '[1, 2, 3, 4]',
          explanation: 'No value repeats more than twice, so nothing is dropped.',
        },
      ],
      constraints: [
        '0 <= len(values) <= 100_000',
        '-10^9 <= values[k] <= 10^9',
        'values is sorted in non-decreasing order',
        'Relative order of retained samples must be preserved',
      ],
      hints: [
        'Because the list is sorted, all copies of a value sit next to each other. How can you tell a third copy from a second one without counting?',
        'Keep a slow "write" index marking the end of the retained log, and scan with a fast "read" index. A reading deserves keeping unless it would become the third equal value in a row.',
        'The third-copy test needs only one comparison: values[read] == kept[write - 2]. If write < 2, always keep. Append (or overwrite) at write, bump write, and return the first write elements.',
      ],
      functionName: 'compact_samples',
      starterCode: `def compact_samples(values: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `def compact_samples(values: list[int]) -> list[int]:
    # Work on a copy so the caller's list is untouched.
    arr = list(values)
    write = 0  # next slot to fill; arr[:write] is the retained log so far
    for read in range(len(arr)):
        # Keep arr[read] unless the two most recently kept samples
        # already equal it (that would make it a third copy).
        if write < 2 or arr[read] != arr[write - 2]:
            arr[write] = arr[read]  # drop it into the next retained slot
            write += 1
    # Everything before write is final; the tail is garbage to slice off.
    return arr[:write]
`,
        commentary: `
This is the read/write (same-direction) flavor of two pointers. The invariant is the whole solution: **\`arr[:write]\` is always exactly the retained log for everything scanned so far.**

The \`read\` pointer visits every sample once. The only question per sample is "would keeping you create a third consecutive copy?" Because the input is sorted, equal values are contiguous, so it suffices to compare against \`arr[write - 2]\` — the sample two slots back in the *kept* region. If they're equal, the last two kept samples plus this one would be three of a kind; drop it by simply not advancing \`write\`. Note we compare against the kept region, not against \`arr[read - 2]\`: once we start dropping, the raw neighborhood and the kept neighborhood diverge, and the kept one is the one the policy cares about.

There's no shifting, no per-value counter, no second pass. Each pointer moves monotonically forward, giving one \`O(n)\` sweep, and the only extra memory is the output copy itself. The same skeleton solves "keep at most k copies" by changing the lookback from 2 to k.
`,
        complexity: 'Time O(n), Space O(1) extra (beyond the returned copy)',
      },
      testCases: [
        { input: [[1, 1, 1, 2, 2, 3]], expected: [1, 1, 2, 2, 3], label: 'one excess copy' },
        { input: [[0, 0, 0, 0]], expected: [0, 0], label: 'all equal' },
        { input: [[]], expected: [], label: 'empty log' },
        { input: [[7]], expected: [7], hidden: true, label: 'single sample' },
        { input: [[1, 2, 3, 4]], expected: [1, 2, 3, 4], label: 'nothing to drop' },
        { input: [[5, 5]], expected: [5, 5], hidden: true, label: 'exactly two copies' },
        { input: [[-3, -3, -3, -1, 0, 0, 0, 0, 2]], expected: [-3, -3, -1, 0, 0, 2], hidden: true, label: 'negatives and long runs' },
        { input: [[1, 1, 1, 1, 1, 1, 1, 1]], expected: [1, 1], hidden: true, label: 'one long run' },
        { input: [[2, 2, 3, 3, 3, 3, 4, 4, 4, 5]], expected: [2, 2, 3, 3, 4, 4, 5], label: 'mixed runs' },
      ],
      furtherPractice: [
        { name: 'LeetCode 80. Remove Duplicates from Sorted Array II', note: 'in-place classic with the same lookback trick' },
        { name: 'LeetCode 26. Remove Duplicates from Sorted Array', note: 'the keep-at-most-one warm-up' },
        { name: 'LeetCode 283. Move Zeroes', note: 'same write-pointer invariant, partition flavor' },
      ],
    },
    {
      id: 'tarp-volume',
      title: 'Rain Tarp Between Pylons',
      difficulty: 'medium',
      statement: `
A vineyard runs a row of pylons along a track; pylon \`k\` has height \`heights[k]\` meters and consecutive pylons are 1 meter apart. To harvest rainwater, the crew stretches a waterproof tarp between **exactly two** pylons. The tarp hangs as a flat sheet whose catch capacity equals the horizontal distance between the chosen pylons multiplied by the height of the **shorter** one (water above the shorter pylon's lip spills out). The pylons between the chosen pair don't interfere.

Given \`heights\`, return the maximum catch capacity over all choices of two pylons. If fewer than two pylons exist, return \`0\`.
`,
      examples: [
        {
          input: 'heights = [3, 9, 4, 7, 12, 2, 6]',
          output: '30',
          explanation:
            'Pylons at indices 1 and 6 are 5 meters apart; the shorter is 6 m tall, so capacity = 5 * 6 = 30. No other pair beats this.',
        },
        {
          input: 'heights = [10, 1, 1, 1, 9]',
          output: '36',
          explanation: 'The two tall outer pylons: distance 4, shorter height 9, capacity 36. The short middle pylons are irrelevant.',
        },
        {
          input: 'heights = [4]',
          output: '0',
          explanation: 'A tarp needs two pylons.',
        },
      ],
      constraints: [
        '0 <= len(heights) <= 100_000',
        '0 <= heights[k] <= 10^6',
        'Pylons are evenly spaced 1 meter apart',
        'Return 0 when fewer than two pylons exist',
      ],
      hints: [
        'Capacity = width * min(two heights). Brute force scores roughly n^2/2 pairs. What property of one scored pair would make a whole family of other pairs provably worse, so you never have to score them?',
        'With pointers at both ends, the width can only shrink as you move inward. Moving the taller pylon inward can never increase min(left, right) past the shorter one — so that move is always wasted.',
        'Loop while left < right: record (right - left) * min(h[left], h[right]); then advance left if h[left] < h[right], else retreat right. Track the best value seen.',
      ],
      functionName: 'max_tarp_volume',
      starterCode: `def max_tarp_volume(heights: list[int]) -> int:
    pass
`,
      solution: {
        code: `def max_tarp_volume(heights: list[int]) -> int:
    left, right = 0, len(heights) - 1
    best = 0
    while left < right:
        # Tarp capacity: gap between pylons times the shorter lip.
        width = right - left
        depth = min(heights[left], heights[right])
        best = max(best, width * depth)
        # Moving the TALLER side inward can never help: width shrinks
        # and depth stays capped by the shorter side. So always move
        # the shorter pylon's pointer, hunting for a taller partner.
        if heights[left] < heights[right]:
            left += 1
        else:
            right -= 1
    return best
`,
        commentary: `
Brute force scores all \`O(n^2)\` pairs. The two-pointer escape hinges on one exchange argument.

Start with the widest pair. Say the left pylon is the shorter one. Every other pair that still includes this left pylon is *narrower* and its depth is still capped at \`heights[left]\` — so none of them can beat the score we just recorded. That means the left pylon is **fully accounted for**: we may retire it and move \`left\` inward without ever looking back. Symmetrically when the right one is shorter. When heights tie, retiring either is safe (the code retires the right one): any better pair must have both endpoints strictly inside, and the surviving pointer still reaches it.

Each iteration retires exactly one pylon, so the loop runs at most \`n - 1\` times — \`O(n)\` total with \`O(1)\` space. Degenerate inputs (zero or one pylon) make \`right <= left\` immediately, so the loop body never runs and \`0\` is returned.

The pitfall this problem punishes: moving the taller pointer "to see what's there." That breaks the proof and fails layouts like \`[2, 10, 10, 1]\`: move-taller scores 3, then 2, then 1 and returns 3, but the true answer is 10 — the adjacent pair of tens, which that policy never scores.
`,
        complexity: 'Time O(n), Space O(1)',
      },
      testCases: [
        { input: [[3, 9, 4, 7, 12, 2, 6]], expected: 30, label: 'best pair is not the tallest pair' },
        { input: [[10, 1, 1, 1, 9]], expected: 36, label: 'wide and shallow middle' },
        { input: [[5, 5]], expected: 5, label: 'two pylons' },
        { input: [[4]], expected: 0, hidden: true, label: 'single pylon' },
        { input: [[]], expected: 0, hidden: true, label: 'no pylons' },
        { input: [[2, 2, 2, 2]], expected: 6, label: 'all equal heights' },
        { input: [[1, 2, 3, 4, 5, 6]], expected: 9, hidden: true, label: 'strictly increasing' },
        { input: [[6, 5, 4, 3, 2, 1]], expected: 9, hidden: true, label: 'strictly decreasing' },
        { input: [[3, 1, 2, 4, 5, 8, 7, 4]], expected: 21, hidden: true, label: 'mixed terrain' },
      ],
      furtherPractice: [
        { name: 'LeetCode 11. Container With Most Water', note: 'the classic this is modeled on' },
        { name: 'LeetCode 42. Trapping Rain Water', note: 'harder cousin — water sits on every bar, not just two' },
      ],
    },
    {
      id: 'mirror-frames',
      title: 'Glitch-Tolerant Mirror Show',
      difficulty: 'hard',
      statement: `
A light installation plays a sequence of frames encoded as a string. Alphanumeric characters are **color frames**; any other character (spaces, dashes, \`#\`, punctuation) is a **calibration marker** that the projector skips entirely. Color frames are case-insensitive: \`'G'\` and \`'g'\` render identically.

The show is *mirror-perfect* if its rendered color frames read the same forwards and backwards. The firmware can also **drop up to \`k\` color frames** anywhere in the sequence (the remaining frames close ranks, changing how the ends line up).

Given \`frames\` and an integer \`k\`, return \`True\` if the show can be made mirror-perfect by dropping at most \`k\` color frames after ignoring calibration markers, and \`False\` otherwise.
`,
      examples: [
        {
          input: 'frames = "G7--7g", k = 0',
          output: 'True',
          explanation: 'Rendered frames are "g77g", already a palindrome; the dashes are skipped.',
        },
        {
          input: 'frames = "a#bca", k = 1',
          output: 'True',
          explanation: 'Rendered frames are "abca". Dropping either "b" or "c" leaves a palindrome ("aca" or "aba").',
        },
        {
          input: 'frames = "spectra", k = 2',
          output: 'False',
          explanation:
            'All seven letters are distinct, so any palindrome we can keep has length 1 — that requires dropping 6 frames, far more than 2.',
        },
        {
          input: 'frames = "###---", k = 3',
          output: 'True',
          explanation: 'Every character is a calibration marker; the rendered show is empty, which is trivially mirror-perfect.',
        },
      ],
      constraints: [
        '0 <= len(frames) <= 500',
        '0 <= k <= 500',
        'frames contains printable ASCII characters',
        'Only alphanumeric characters count as color frames; comparison is case-insensitive',
        'Dropped frames are removed entirely — the remaining frames re-align',
      ],
      hints: [
        'First reduce the input: filter to alphanumeric characters and lowercase them. Now the real question is purely about deletions making a palindrome.',
        'Run the classic palindrome two-pointer check. When s[i] == s[j] the ends cost nothing — recurse inward. On a mismatch you must drop one end or the other, and either choice changes how everything re-aligns, so you have to explore both.',
        'Define drops(i, j) = fewest deletions to make s[i..j] a palindrome: 0 when i >= j; drops(i+1, j-1) on a match; 1 + min(drops(i+1, j), drops(i, j-1)) on a mismatch. Memoize or build bottom-up over span lengths, then compare drops(0, n-1) <= k.',
      ],
      functionName: 'can_mirror',
      starterCode: `def can_mirror(frames: str, k: int) -> bool:
    pass
`,
      solution: {
        code: `def can_mirror(frames: str, k: int) -> bool:
    # Render the show: calibration markers vanish, colors are case-folded.
    s = [c.lower() for c in frames if c.isalnum()]
    n = len(s)
    if n <= 1:
        return True  # empty or single frame is trivially mirror-perfect

    # drops[i][j] = fewest frames to delete so s[i..j] reads symmetrically.
    # This is the two-pointer mismatch recursion, tabulated bottom-up.
    drops = [[0] * n for _ in range(n)]
    for length in range(2, n + 1):          # solve short spans before long ones
        for i in range(0, n - length + 1):
            j = i + length - 1
            if s[i] == s[j]:
                # Matching ends cost nothing; the price lives inside.
                drops[i][j] = drops[i + 1][j - 1] if i + 1 <= j - 1 else 0
            else:
                # Mismatch: drop one end, whichever leads to a cheaper fix.
                drops[i][j] = 1 + min(drops[i + 1][j], drops[i][j - 1])

    return drops[0][n - 1] <= k
`,
        commentary: `
Two problems are stacked here. The first layer is mechanical: render the show by filtering to alphanumerics and lowercasing, exactly like a skip-the-junk palindrome check.

The second layer is where it gets hard. A plain two-pointer palindrome check works because a mismatch is fatal — there is nothing to decide. With deletions allowed, a mismatch at \`(i, j)\` forks the world: drop \`s[i]\` and the problem becomes \`s[i+1..j]\`, or drop \`s[j]\` and it becomes \`s[i..j-1]\`. Greedily picking one side fails (a counterexample always exists for any fixed rule), and exploring both naively costs \`O(2^k)\` branches.

The rescue is noticing the recursion only ever asks about **contiguous spans** \`(i, j)\` — at most \`n^2\` distinct subproblems no matter how the branches interleave. \`drops[i][j]\` holds the cheapest fix for each span. The code tabulates by increasing span length so both candidates (\`drops[i+1][j]\`, \`drops[i][j-1]\`, and the inner \`drops[i+1][j-1]\`) are always ready when needed. The final answer is one comparison: can the whole-string fix fit inside the budget \`k\`?

This is a recurring interview escalation: pattern (two pointers) gives the *shape* of the recursion, dynamic programming makes it *affordable*. Recognizing the seam between the two is the skill being tested.
`,
        complexity: 'Time O(n^2), Space O(n^2)',
      },
      testCases: [
        { input: ['G7--7g', 0], expected: true, label: 'already a palindrome after filtering' },
        { input: ['a#bca', 1], expected: true, label: 'one drop fixes it' },
        { input: ['spectra', 2], expected: false, label: 'all-distinct letters' },
        { input: ['', 0], expected: true, label: 'empty show' },
        { input: ['###---', 3], expected: true, hidden: true, label: 'markers only' },
        { input: ['x', 0], expected: true, hidden: true, label: 'single frame' },
        { input: ['RGBgbr', 0], expected: false, label: 'needs exactly one drop, none allowed' },
        { input: ['RGBgbr', 1], expected: true, hidden: true, label: 'budget exactly meets the need' },
        { input: ['mirror', 2], expected: false, hidden: true, label: 'needs three drops, two allowed' },
        { input: ['Drone 0 0 0 enord', 0], expected: true, hidden: true, label: 'mixed case, digits, and spaces' },
      ],
      furtherPractice: [
        { name: 'LeetCode 125. Valid Palindrome', note: 'just the filtering layer' },
        { name: 'LeetCode 680. Valid Palindrome II', note: 'k = 1 special case — pure two pointers suffices' },
        { name: 'LeetCode 1216. Valid Palindrome III', note: 'the k-deletion core of this problem' },
      ],
    },
    {
      id: 'thruster-trim',
      title: 'Three-Thruster Trim Burn',
      difficulty: 'medium',
      statement: `
A cargo tug balances its attitude by firing **exactly three** of its thrusters together. Each thruster \`k\` contributes a signed impulse \`impulses[k]\` (positive ones push forward, negative ones brake). Flight control wants the combined impulse of the three chosen thrusters to land as close as possible to a desired \`target\`.

Given the list \`impulses\` (at least three entries, in any order) and an integer \`target\`, return the **sum** of the best three-thruster combination — the achievable sum whose distance \`abs(sum - target)\` is smallest. If two different sums are equally close, return the **smaller** of the two sums.

Brute-forcing all triples is \`O(n^3)\`; the fleet has thousands of thrusters, so do better.
`,
      examples: [
        {
          input: 'impulses = [-1, 2, 1, -4], target = 1',
          output: '2',
          explanation: 'The triple (-1, 2, 1) sums to 2, distance 1 from the target. No triple lands exactly on 1.',
        },
        {
          input: 'impulses = [1, 2, 6, 4], target = 10',
          output: '9',
          explanation:
            'Sorted, the candidate triples include 1+2+6=9 and 1+4+6=11, both distance 1 from 10. The tie is broken toward the smaller sum, 9.',
        },
        {
          input: 'impulses = [0, 0, 0], target = 7',
          output: '0',
          explanation: 'Only one triple exists; its sum is 0.',
        },
      ],
      constraints: [
        '3 <= len(impulses) <= 3000',
        '-10^6 <= impulses[k] <= 10^6',
        'impulses is given in arbitrary order',
        '-10^9 <= target <= 10^9',
        'On a distance tie, return the smaller sum',
      ],
      hints: [
        'Three free choices is one too many to converge directly. Is there an ordering of the thrusters that would let you pin one of the three down and reason about the other two with a rule?',
        'Sort first. Then fix the lowest thruster of the triple with an outer loop, and on the remaining suffix run a converging pair scan toward (target - fixed).',
        'For each fixed index i, set lo=i+1, hi=last. Compare impulses[i]+impulses[lo]+impulses[hi] to the target: track the closest sum (preferring the smaller on ties), then move lo up if the sum is below target, else hi down.',
      ],
      functionName: 'closest_triplet_sum',
      starterCode: `def closest_triplet_sum(impulses: list[int], target: int) -> int:
    pass
`,
      solution: {
        code: `def closest_triplet_sum(impulses: list[int], target: int) -> int:
    # Sorting unlocks the converging scan; it also makes the suffix monotone.
    arr = sorted(impulses)
    n = len(arr)
    best = arr[0] + arr[1] + arr[2]  # any real triple seeds the search
    for i in range(n - 2):
        # Fix the lowest thruster of the triple; converge the other two.
        lo, hi = i + 1, n - 1
        while lo < hi:
            total = arr[i] + arr[lo] + arr[hi]
            # Update on a strictly closer sum, or an equally close smaller one.
            if (abs(total - target) < abs(best - target)
                    or (abs(total - target) == abs(best - target) and total < best)):
                best = total
            if total == target:
                return total            # cannot beat distance 0
            if total < target:
                lo += 1                 # need a bigger sum
            else:
                hi -= 1                 # need a smaller sum
    return best
`,
        commentary: `
Three independent choices look like an \`O(n^3)\` problem, but two pointers collapses the inner two.

The move is **fix-one, converge-two**. Sort the impulses, then let an outer loop nail down the smallest member of the triple at index \`i\`. The remaining task — pick two thrusters from the sorted suffix whose sum is closest to \`target - arr[i]\` — is exactly the converging pair scan: when the running triple sum is below target the only way to grow it is to advance \`lo\`; when it is above, retreat \`hi\`. Each inner scan is linear, so the whole thing is \`O(n^2)\`, a clean win over brute force.

Two details earn the hidden cases. First, **seed \`best\` with a genuine triple** (\`arr[0]+arr[1]+arr[2]\`) rather than a sentinel like infinity, so the very first comparison is against a feasible answer. Second, the **tie-break**: when a new sum is exactly as far from the target as the incumbent, the problem asks for the smaller sum, so the update guard includes \`total < best\`. Sorting also guarantees determinism — the same multiset of impulses always explores triples in the same order.
`,
        complexity: 'Time O(n^2), Space O(1) extra (O(n) if the sort is counted)',
      },
      testCases: [
        { input: [[-1, 2, 1, -4], 1], expected: 2, label: 'classic closest, not exact' },
        { input: [[1, 2, 6, 4], 10], expected: 9, label: 'distance tie resolves to smaller sum' },
        { input: [[0, 0, 0], 7], expected: 0, label: 'only one triple' },
        { input: [[1, 1, 1], 100], expected: 3, hidden: true, label: 'all equal, far target' },
        { input: [[-3, -2, 5, 10], 4], expected: 5, hidden: true, label: 'negatives in the mix' },
        { input: [[5, -2, -1, 4, 7], 0], expected: 1, hidden: true, label: 'closest is just off zero' },
        { input: [[1, 3, 6, 5, 8], 10], expected: 10, label: 'exact hit available' },
        { input: [[-1000000, -1000000, 1000000, 1000000], 0], expected: -1000000, hidden: true, label: 'extreme magnitudes' },
        { input: [[2, 2, 2, 2], 5], expected: 6, hidden: true, label: 'every triple identical' },
      ],
      furtherPractice: [
        { name: 'LeetCode 16. 3Sum Closest', note: 'the canonical fix-one-converge-two problem' },
        { name: 'LeetCode 15. 3Sum', note: 'same skeleton, exact-zero variant with dedup' },
        { name: 'LeetCode 259. 3Sum Smaller', note: 'count triples under a threshold with the same scan' },
      ],
    },
    {
      id: 'lane-merge',
      title: 'Highway On-Ramp Merge',
      difficulty: 'easy',
      statement: `
Two traffic cameras each emit a stream of vehicle arrival timestamps (whole seconds since midnight). Each camera's stream is already sorted in non-decreasing order. A monitoring dashboard needs a **single combined timeline** of all arrivals, also sorted in non-decreasing order, preserving every timestamp (duplicates across the two streams are all kept).

Given two sorted lists \`lane_a\` and \`lane_b\`, return one new list containing every timestamp from both, in non-decreasing order. When timestamps tie, an entry from \`lane_a\` should appear before the equal entry from \`lane_b\`.

Do not concatenate-then-sort; exploit the fact that both inputs already arrive sorted.
`,
      examples: [
        {
          input: 'lane_a = [1, 3, 5], lane_b = [2, 4, 6]',
          output: '[1, 2, 3, 4, 5, 6]',
          explanation: 'The two interleave cleanly into one ascending timeline.',
        },
        {
          input: 'lane_a = [2, 2], lane_b = [1, 2]',
          output: '[1, 2, 2, 2]',
          explanation: 'On the tie at 2, lane_a entries are emitted before the equal lane_b entry.',
        },
        {
          input: 'lane_a = [], lane_b = [4, 9]',
          output: '[4, 9]',
          explanation: 'An empty stream contributes nothing; the other passes through.',
        },
      ],
      constraints: [
        '0 <= len(lane_a), len(lane_b) <= 100_000',
        '0 <= timestamp <= 86_400',
        'Both lane_a and lane_b are sorted in non-decreasing order',
        'On ties, a lane_a timestamp precedes the equal lane_b timestamp (stable)',
      ],
      hints: [
        'You are walking down two already-ordered lists at once. At any moment, where must the globally smallest remaining timestamp be sitting?',
        'Keep one pointer at the front of each stream. The smaller of the two heads is the next item for the combined timeline; emit it and advance only that pointer.',
        'Loop while both pointers are in range, appending the smaller head (take from lane_a when the heads tie, to stay stable). When one stream runs dry, append the untouched tail of the other.',
      ],
      functionName: 'merge_arrival_streams',
      starterCode: `def merge_arrival_streams(lane_a: list[int], lane_b: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `def merge_arrival_streams(lane_a: list[int], lane_b: list[int]) -> list[int]:
    i, j = 0, 0          # one read pointer per sorted stream
    merged = []
    # Walk both streams; the smaller head is always next in the timeline.
    while i < len(lane_a) and j < len(lane_b):
        # "<=" takes from lane_a on ties, keeping the merge stable.
        if lane_a[i] <= lane_b[j]:
            merged.append(lane_a[i])
            i += 1
        else:
            merged.append(lane_b[j])
            j += 1
    # Exactly one stream may have leftovers; it is already sorted, so append it whole.
    merged.extend(lane_a[i:])
    merged.extend(lane_b[j:])
    return merged
`,
        commentary: `
This is the **parallel two-pointer walk** — the same merge that powers merge sort's combine step and sort-merge joins in databases.

The invariant: everything already pushed into \`merged\` is sorted and is smaller than (or equal to) every timestamp still unread in either stream. That holds because at each step the next item must be the minimum of the two heads — every other unread value is \`>=\` its own head, which is \`>=\` the smaller head we just took. So picking the smaller head and advancing only that pointer can never strand a smaller value behind us.

Concatenating then sorting would cost \`O((m+n) log(m+n))\` and throw away the gift of pre-sorted inputs; this merge is \`O(m+n)\` because each timestamp is touched exactly once. The \`<=\` (rather than \`<\`) in the comparison is what makes the merge **stable**: on a tie we drain \`lane_a\` first, so equal timestamps keep their lane order. When either pointer reaches its end, the other stream's remaining suffix is already sorted and strictly later, so it appends verbatim — no further comparisons needed.
`,
        complexity: 'Time O(m + n), Space O(m + n) for the output',
      },
      testCases: [
        { input: [[1, 3, 5], [2, 4, 6]], expected: [1, 2, 3, 4, 5, 6], label: 'clean interleave' },
        { input: [[2, 2], [1, 2]], expected: [1, 2, 2, 2], label: 'stable tie handling' },
        { input: [[], [4, 9]], expected: [4, 9], label: 'one empty stream' },
        { input: [[], []], expected: [], hidden: true, label: 'both empty' },
        { input: [[1, 1, 1], [1, 1]], expected: [1, 1, 1, 1, 1], hidden: true, label: 'all equal across both' },
        { input: [[0, 86400], [0, 86400]], expected: [0, 0, 86400, 86400], hidden: true, label: 'extreme timestamps' },
        { input: [[5], [1, 2, 3, 4]], expected: [1, 2, 3, 4, 5], label: 'one straggler at the end' },
        { input: [[1, 2, 3], [4, 5, 6]], expected: [1, 2, 3, 4, 5, 6], hidden: true, label: 'fully disjoint, a before b' },
      ],
      furtherPractice: [
        { name: 'LeetCode 88. Merge Sorted Array', note: 'the in-place classic, merged from the back' },
        { name: 'LeetCode 21. Merge Two Sorted Lists', note: 'identical merge over linked lists' },
        { name: 'LeetCode 23. Merge k Sorted Lists', note: 'generalize to k streams with a heap' },
      ],
    },
    {
      id: 'triage-queue',
      title: 'Emergency Triage Reorder',
      difficulty: 'easy',
      statement: `
A clinic logs incoming patients in arrival order, each tagged with a severity score. A surge protocol kicks in: patients whose severity is **at or above** a \`critical\` threshold must be seen before everyone else. To keep the process fair and auditable, the relative arrival order **within** each group must be preserved — criticals stay in the order they arrived, and so do the non-criticals.

Given the list \`severities\` (in arrival order) and the integer \`critical\` threshold, return a new list with all critical patients (\`severity >= critical\`) first, followed by all non-critical patients (\`severity < critical\`), each group keeping its original arrival order.

The reorder must be **stable**; a plain sort by a true/false key would also work, but here you should achieve it with a linear two-pass scan.
`,
      examples: [
        {
          input: 'severities = [3, 9, 1, 8, 2], critical = 7',
          output: '[9, 8, 3, 1, 2]',
          explanation: 'Criticals (>=7) in arrival order are 9 then 8; the rest (3, 1, 2) follow in arrival order.',
        },
        {
          input: 'severities = [5, 5, 5], critical = 5',
          output: '[5, 5, 5]',
          explanation: 'All meet the threshold, so the list is unchanged.',
        },
        {
          input: 'severities = [1, 2, 3], critical = 10',
          output: '[1, 2, 3]',
          explanation: 'Nobody is critical, so the non-critical group is the whole list, unchanged.',
        },
      ],
      constraints: [
        '0 <= len(severities) <= 100_000',
        '0 <= severities[k] <= 1000',
        'severities is in arrival order (not sorted)',
        'Within each group, original arrival order must be preserved (stable)',
        'critical may be larger than every severity, or smaller than every severity',
      ],
      hints: [
        'You need two groups concatenated, each keeping its internal order. What is the simplest way to lay down the first group without disturbing how its members were spaced?',
        'Use a write pointer. Sweep once and copy every critical patient to the front in the order you meet them; remember where the front block ends.',
        'First pass: read pointer scans all, write pointer drops each critical (severity >= critical) at the next front slot. Second pass: the same write pointer continues, dropping each non-critical after the criticals. Return the filled list.',
      ],
      functionName: 'triage_reorder',
      starterCode: `def triage_reorder(severities: list[int], critical: int) -> list[int]:
    pass
`,
      solution: {
        code: `def triage_reorder(severities: list[int], critical: int) -> list[int]:
    # Build into a fresh buffer so the caller's arrival log is untouched.
    out = list(severities)
    write = 0
    # Pass 1: pack the criticals at the front, in arrival order.
    for read in range(len(severities)):
        if severities[read] >= critical:
            out[write] = severities[read]
            write += 1
    # Pass 2: the same write pointer continues with the non-criticals,
    # also in arrival order, right after the critical block.
    for read in range(len(severities)):
        if severities[read] < critical:
            out[write] = severities[read]
            write += 1
    return out
`,
        commentary: `
This is a **stable partition** built from the read/write two-pointer idiom, done in two linear passes.

A single-pass swap-based partition (the Lomuto/Hoare style used inside quicksort) is faster on memory but **not stable** — swapping drags elements past each other and scrambles arrival order, which this audit-friendly problem forbids. The two-pass write-pointer version keeps order for free: each pass walks the original \`severities\` left to right and appends qualifying elements in the exact order it meets them, so neither group is ever reordered.

The shared \`write\` pointer is the elegant part. After pass one it sits exactly at the boundary between the critical block and the empty tail; pass two simply keeps advancing it, laying the non-criticals down immediately after. Because every element is copied exactly once across the two passes, total work is \`O(n)\` with \`O(n)\` output space. The output is fully deterministic: it depends only on the input order and the threshold, with no tie-break ambiguity since equal values within a group never change places. Edge inputs — empty list, everyone critical, no one critical — all fall out correctly: one of the passes simply contributes nothing.
`,
        complexity: 'Time O(n), Space O(n) for the output',
      },
      testCases: [
        { input: [[3, 9, 1, 8, 2], 7], expected: [9, 8, 3, 1, 2], label: 'mixed, both groups non-empty' },
        { input: [[5, 5, 5], 5], expected: [5, 5, 5], label: 'all critical (threshold inclusive)' },
        { input: [[1, 2, 3], 10], expected: [1, 2, 3], label: 'none critical' },
        { input: [[], 4], expected: [], hidden: true, label: 'empty log' },
        { input: [[8], 8], expected: [8], hidden: true, label: 'single patient, exactly at threshold' },
        { input: [[2, 8, 2, 8, 2], 5], expected: [8, 8, 2, 2, 2], hidden: true, label: 'alternating, stability matters' },
        { input: [[10, 1, 10, 1, 10], 5], expected: [10, 10, 10, 1, 1], label: 'criticals lead, order kept' },
        { input: [[0, 1000, 0, 1000], 1000], expected: [1000, 1000, 0, 0], hidden: true, label: 'extremes at the threshold' },
      ],
      furtherPractice: [
        { name: 'LeetCode 905. Sort Array By Parity', note: 'partition by even/odd predicate' },
        { name: 'LeetCode 283. Move Zeroes', note: 'stable partition keeping non-zeros, the write-pointer staple' },
        { name: 'LeetCode 75. Sort Colors', note: 'three-way Dutch-flag partition, one pass' },
      ],
    },
    {
      id: 'twin-frequency',
      title: 'Twin-Receiver Frequency Lock',
      difficulty: 'medium',
      statement: `
A ground station tunes two independent radios to lock onto a satellite. Radio A can only sit on the frequencies in the sorted list \`freqs_a\`; radio B is restricted to the sorted list \`freqs_b\` (both in megahertz, non-decreasing). To minimize interference, the operator wants to pick **one frequency from each radio** so the two are as close together as possible.

Given \`freqs_a\` and \`freqs_b\` (each non-empty and sorted), return the pair \`[a, b]\` — \`a\` drawn from \`freqs_a\`, \`b\` from \`freqs_b\` — with the smallest absolute gap \`abs(a - b)\`. If several pairs share the smallest gap, return the one the linear scan reaches first when both pointers start at the low end and advance the side holding the smaller value.

Comparing every cross pair is \`O(m * n)\`; both catalogues can hold tens of thousands of channels.
`,
      examples: [
        {
          input: 'freqs_a = [1, 4, 7], freqs_b = [3, 8, 12]',
          output: '[4, 3]',
          explanation: 'The closest cross pair is 4 and 3, a gap of 1; nothing else is nearer.',
        },
        {
          input: 'freqs_a = [-5, 0, 5], freqs_b = [3, 4, 9]',
          output: '[5, 4]',
          explanation: 'abs(5 - 4) = 1 is the tightest lock available.',
        },
        {
          input: 'freqs_a = [10, 20], freqs_b = [15]',
          output: '[10, 15]',
          explanation: 'Both 10 and 20 sit 5 MHz from 15; the scan reaches the [10, 15] pair first.',
        },
      ],
      constraints: [
        '1 <= len(freqs_a), len(freqs_b) <= 50_000',
        '-10^9 <= frequency <= 10^9',
        'freqs_a and freqs_b are each sorted in non-decreasing order',
        'Both lists are non-empty',
        'On a tie, return the pair reached first by the low-to-high advancing scan',
      ],
      hints: [
        'Both catalogues are sorted. If the A-frequency you are looking at is below the B-frequency, what does that say about pairing this same B with even smaller A values?',
        'Start a pointer at the low end of each list. The gap can only improve by moving the pointer that sits on the smaller value — moving the larger one widens the gap.',
        'Loop while both pointers are in range: record the current pair if its gap beats the best so far; if the two values are equal the gap is 0 (return immediately); otherwise advance whichever pointer holds the smaller value.',
      ],
      functionName: 'closest_frequency_pair',
      starterCode: `def closest_frequency_pair(freqs_a: list[int], freqs_b: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `def closest_frequency_pair(freqs_a: list[int], freqs_b: list[int]) -> list[int]:
    i, j = 0, 0                 # walk both sorted catalogues from the low end
    best_gap = None
    best_pair = None
    while i < len(freqs_a) and j < len(freqs_b):
        a, b = freqs_a[i], freqs_b[j]
        gap = abs(a - b)
        # Strict "<" keeps the first-reached pair on ties (scan order).
        if best_gap is None or gap < best_gap:
            best_gap = gap
            best_pair = [a, b]
        if a == b:
            return [a, b]       # gap 0 is unbeatable
        # Advance the smaller side: it is the only move that can shrink the gap.
        if a < b:
            i += 1
        else:
            j += 1
    return best_pair
`,
        commentary: `
The naive approach pairs every A with every B at \`O(m * n)\`. Because both lists are sorted, a single **parallel two-pointer walk** finds the closest pair in \`O(m + n)\`.

The exchange argument: suppose \`freqs_a[i] < freqs_b[j]\`. Every B-frequency from \`j\` onward is \`>= freqs_b[j]\`, so pairing the current (small) A with any of them only widens the gap — the current pair is the best this A can do against the remaining Bs. We have squeezed everything useful out of \`freqs_a[i]\`, so we retire it by advancing \`i\`. Symmetrically when B is the smaller value. The pointer on the smaller side is always the one that, when advanced, can *reduce* the gap; advancing the larger side provably cannot help. An exact match (\`a == b\`) gives gap 0, the global optimum, so we stop immediately.

Determinism comes from two design choices spelled out in the statement: both pointers start low and we advance the smaller side, and the update uses a **strict** \`<\` so the *first* pair achieving the minimum gap wins any tie. Each iteration advances exactly one pointer, bounding the loop at \`m + n\` steps with only a couple of scalars of state.
`,
        complexity: 'Time O(m + n), Space O(1)',
      },
      testCases: [
        { input: [[1, 4, 7], [3, 8, 12]], expected: [4, 3], label: 'tightest lock is interior' },
        { input: [[-5, 0, 5], [3, 4, 9]], expected: [5, 4], label: 'spans negatives' },
        { input: [[10, 20], [15]], expected: [10, 15], label: 'tie resolves to first-reached pair' },
        { input: [[1], [1]], expected: [1, 1], hidden: true, label: 'exact match, gap zero' },
        { input: [[0], [1000000000]], expected: [0, 1000000000], hidden: true, label: 'singletons, huge gap' },
        { input: [[2, 2, 2], [2]], expected: [2, 2], label: 'duplicates with exact match' },
        { input: [[-1000000000, 1000000000], [0]], expected: [-1000000000, 0], hidden: true, label: 'extremes straddling zero' },
        { input: [[1, 2, 3, 4], [10, 11, 12]], expected: [4, 10], hidden: true, label: 'disjoint ranges, closest at the seam' },
      ],
      furtherPractice: [
        { name: 'LeetCode 658. Find K Closest Elements', note: 'closest-to-target cousin with a sliding window' },
        { name: 'Minimum absolute difference between two sorted arrays', note: 'the bare version of this scan' },
        { name: 'LeetCode 350. Intersection of Two Arrays II', note: 'same dual-pointer walk, equality instead of closeness' },
      ],
    },
    {
      id: 'depth-readings',
      title: 'Sonar Depth Energy Sort',
      difficulty: 'medium',
      statement: `
A submersible logs vertical displacement readings in meters, sorted in non-decreasing order. Negative readings mean it rose above the reference plane, positive means it sank below. The analysis pipeline needs the **acoustic energy** of each reading, which is proportional to the square of its displacement, returned as a list sorted in **non-decreasing order**.

Given the sorted list \`displacements\` (which may contain negatives, zero, and positives), return a new list of \`displacement * displacement\` for each reading, sorted in non-decreasing order. The output length equals the input length.

The squares of a sorted list are **not** themselves sorted when negatives are present (e.g. \`[-3, 2]\` squares to \`[9, 4]\`). Re-sorting from scratch is \`O(n log n)\`; you can do it in \`O(n)\`.
`,
      examples: [
        {
          input: 'displacements = [-4, -1, 0, 3, 10]',
          output: '[0, 1, 9, 16, 100]',
          explanation: 'Squares are 16, 1, 0, 9, 100; sorted ascending gives [0, 1, 9, 16, 100].',
        },
        {
          input: 'displacements = [-3, -2, -1]',
          output: '[1, 4, 9]',
          explanation: 'All negative: the largest magnitude (-3) yields the largest square, so the order reverses.',
        },
        {
          input: 'displacements = [0, 1, 2]',
          output: '[0, 1, 4]',
          explanation: 'No negatives means the squares are already sorted.',
        },
      ],
      constraints: [
        '0 <= len(displacements) <= 100_000',
        '-10^4 <= displacements[k] <= 10^4',
        'displacements is sorted in non-decreasing order',
        'Output is sorted in non-decreasing order and has the same length as the input',
      ],
      hints: [
        'The biggest square does not come from the middle of the list. Given the array is sorted, where do the two largest squares have to live?',
        'The largest magnitude sits at one of the two ends. Compare the absolute values at the ends and you know which square is the biggest remaining.',
        'Put a pointer at each end and fill the output from the back forward: at each step square the end with the larger absolute value, place it, and move that pointer inward.',
      ],
      functionName: 'sorted_energy',
      starterCode: `def sorted_energy(displacements: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `def sorted_energy(displacements: list[int]) -> list[int]:
    n = len(displacements)
    out = [0] * n                 # we will fill this from the back forward
    lo, hi = 0, n - 1             # the two ends hold the largest magnitudes
    for pos in range(n - 1, -1, -1):
        # Whichever end has the bigger absolute value owns the bigger square.
        if abs(displacements[lo]) > abs(displacements[hi]):
            out[pos] = displacements[lo] * displacements[lo]
            lo += 1               # that low (very negative) reading is placed
        else:
            out[pos] = displacements[hi] * displacements[hi]
            hi -= 1               # that high reading is placed
    return out
`,
        commentary: `
Squaring scrambles a sorted-with-negatives array because magnitude, not value, drives the square. The trick is to realize the array is sorted by value, so it is **bitonic by magnitude**: magnitudes fall to a minimum somewhere in the middle and rise again toward both ends. That means the single largest magnitude is always at one of the two ends.

So put a pointer at each end and **fill the output from the back**, where the biggest squares belong. At every step, compare \`abs(displacements[lo])\` against \`abs(displacements[hi])\`; the larger one is the biggest square not yet placed, so drop it at the current back slot and pull that pointer inward. The pointers converge as the write position walks left, and each reading is squared and placed exactly once.

This is \`O(n)\` time and \`O(n)\` space (just the output), versus \`O(n log n)\` for square-then-sort. The comparison uses \`>\` so ties (e.g. \`-2\` and \`2\`) take the high end first, but since their squares are identical the output is the same either way — fully deterministic. Empty and single-element inputs need no special casing: the fill loop runs zero or one times. Reading right-to-left is essential; trying to fill front-to-back would force you to find the *smallest* square, which can sit anywhere the magnitudes bottom out, defeating the clean end-pointer rule.
`,
        complexity: 'Time O(n), Space O(n) for the output',
      },
      testCases: [
        { input: [[-4, -1, 0, 3, 10]], expected: [0, 1, 9, 16, 100], label: 'mixed signs' },
        { input: [[-3, -2, -1]], expected: [1, 4, 9], label: 'all negative, order reverses' },
        { input: [[0, 1, 2]], expected: [0, 1, 4], label: 'no negatives, already sorted' },
        { input: [[]], expected: [], hidden: true, label: 'empty log' },
        { input: [[5]], expected: [25], hidden: true, label: 'single reading' },
        { input: [[-2, 2]], expected: [4, 4], label: 'symmetric pair, equal squares' },
        { input: [[0, 0, 0]], expected: [0, 0, 0], hidden: true, label: 'all zero' },
        { input: [[-10000, -3, 0, 7, 10000]], expected: [0, 9, 49, 100000000, 100000000], hidden: true, label: 'extreme magnitudes at both ends' },
        { input: [[-7, -3, 2, 3, 11]], expected: [4, 9, 9, 49, 121], label: 'duplicate squares from different signs' },
      ],
      furtherPractice: [
        { name: 'LeetCode 977. Squares of a Sorted Array', note: 'the canonical end-pointer fill' },
        { name: 'LeetCode 88. Merge Sorted Array', note: 'same back-to-front filling discipline' },
        { name: 'LeetCode 360. Sort Transformed Array', note: 'generalizes to any quadratic transform' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt:
        'Converging two pointers on a sorted array finds a target pair-sum without checking every pair. What justifies skipping all those pairs?',
      choices: [
        'Randomized sampling makes missed pairs statistically unlikely',
        'Each pointer move is backed by a monotonicity argument proving the skipped pairs cannot be the answer',
        'The algorithm checks every pair, just in a cache-friendly order',
        'Sorted arrays contain no duplicate sums, so most pairs are redundant',
      ],
      correctIndex: 1,
      explanation:
        'When the sum is too small, the left value cannot work with anything at or below the right pointer (those are all ≤ the current right value), so advancing left discards only provably-useless pairs — and symmetrically for the right. It is a proof, not a heuristic: nothing is sampled (choice 1), every pair is NOT visited (choice 3 describes brute force), and duplicate sums are irrelevant (choice 4).',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt: 'What is the defining invariant of the read/write (same-direction) two-pointer pattern?',
      choices: [
        'read and write always point at equal values',
        'The gap between read and write stays constant throughout the scan',
        'Everything before the write index is already the final, kept output; read scans ahead deciding what joins it',
        'write moves twice for every move of read',
      ],
      correctIndex: 2,
      explanation:
        'The slow pointer fences off a finished prefix — arr[:write] is exactly the answer for the elements scanned so far — while the fast pointer examines each candidate once. The gap is not constant (it grows whenever an element is dropped, ruling out choice 2), and the pointers usually hold different values precisely when dropping has begun (ruling out choice 1).',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt: 'For an array that is ALREADY sorted, what are the time and space costs of the converging pair-sum scan?',
      choices: [
        'O(n log n) time, O(n) space',
        'O(n) time, O(1) extra space',
        'O(n^2) time, O(1) space',
        'O(log n) time, O(1) space',
      ],
      correctIndex: 1,
      explanation:
        'Each iteration permanently advances one of the two pointers, so there are at most n iterations, each O(1), with only two index variables of state. O(n log n) is what you pay only if you must sort first; O(n^2) is the brute force the pattern replaces; O(log n) describes binary search, which finds one element, not a pair.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'The max-area-between-boundaries scan (move the shorter side inward) improves on brute force by how much, for n boundaries?',
      choices: [
        'O(n^2) brute force down to O(n log n)',
        'O(n^2) brute force down to O(n)',
        'O(n^3) brute force down to O(n^2)',
        'No asymptotic improvement — it is a constant-factor optimization',
      ],
      correctIndex: 1,
      explanation:
        'Brute force scores all n(n-1)/2 pairs, i.e. O(n^2). The exchange argument (the shorter side can never appear in a better, narrower pair) retires one boundary per step, giving a single O(n) pass. There is no sorting involved, so O(n log n) never enters the picture.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'You must find two numbers in an UNSORTED array that sum to a target and return their ORIGINAL indices. Which approach fits best?',
      choices: [
        'Sort the array, then run converging two pointers',
        'A single pass with a hash map from value to original index',
        'Converging two pointers directly on the unsorted array',
        'Binary search for (target - x) for each element x',
      ],
      correctIndex: 1,
      explanation:
        'Two pointers is the tempting trap: sorting destroys the original indices (you would need to carry index/value pairs and still pay O(n log n)), and running converging pointers on unsorted data is simply incorrect — the safe-skip argument requires order. Binary search also presumes sorted data. The hash map gives O(n) time and preserves indices for free.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'Task: find the longest contiguous stretch of a log where the number of DISTINCT error codes stays at most k. Which pattern fits?',
      choices: [
        'Converging two pointers from both ends of the log',
        'A sliding window — two same-direction pointers that grow and shrink based on the window contents',
        'Sort the log, then converging two pointers',
        'A read/write compaction pass',
      ],
      correctIndex: 1,
      explanation:
        'The answer depends on the contents of a contiguous range (distinct-count ≤ k), which must expand while valid and contract when violated — that is the sliding-window choreography. Converging pointers from the ends is the tempting wrong answer: it works for pair-score problems, but offers no safe-skip argument for content-dependent windows. Sorting destroys contiguity entirely.',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt: 'In the max-area boundary problem, why must you move the pointer at the SHORTER boundary rather than the taller one?',
      choices: [
        "Because the shorter boundary's pairs are all already recorded — its score is capped by its own height, and every remaining pair with it is narrower",
        'Because the taller boundary might be the global maximum element',
        'Because moving the taller one can cause an index-out-of-range error',
        'It does not matter; moving either pointer yields the correct answer',
      ],
      correctIndex: 0,
      explanation:
        'With the widest remaining pair recorded, any future pair keeping the shorter side is narrower AND still capped by that short height — so the shorter side is exhausted and can retire. Moving the taller side instead breaks this proof and misses answers (try [2,10,10,1]: move-taller returns 3, but the adjacent tens give 10), so choice 4 is wrong even though it sounds harmless. Choices 2 and 3 are irrelevant to correctness.',
    },
    {
      id: 'q8',
      kind: 'complexity',
      prompt:
        'A palindrome check that may delete up to k characters branches two ways on every mismatch. With memoization over (i, j) spans, what does the worst-case time become?',
      choices: [
        'O(2^k * n) — memoization does not help here',
        'O(n) — same as a plain palindrome check',
        'O(n^2) — one entry per contiguous span (i, j)',
        'O(n * k) — one entry per position-budget pair, where k can exceed n',
      ],
      correctIndex: 2,
      explanation:
        'However the drop-left/drop-right branches interleave, every subproblem is a contiguous span s[i..j] — at most n^2 of them, each resolved in O(1) from smaller spans. That collapses the exponential branch tree (choice 1 is the cost WITHOUT memoization). Plain O(n) only holds when mismatches are fatal and nothing branches.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Sorted array + "find a pair with target sum/difference" — which pattern, and why?',
      back: 'Converging two pointers from both ends. Sortedness makes each move provably safe: a too-small sum means only the left pointer can help, a too-big sum means only the right one can. O(n) time, O(1) space.',
    },
    {
      id: 'f2',
      front: 'What must be true before each pointer move in any two-pointer algorithm?',
      back: 'You can state a proof that the move discards only candidates that cannot be the answer. If you cannot articulate that argument, the pattern does not apply (yet) — sort first, or switch patterns.',
    },
    {
      id: 'f3',
      front: 'Read/write pointer template for in-place filtering — what is the loop body?',
      back: 'For each read index: if the element should be kept, do arr[write] = arr[read] and write += 1. The kept prefix arr[:write] is the answer; nothing ever shifts.',
    },
    {
      id: 'f4',
      front: 'Max-area / container problems: which pointer moves and what is the one-line justification?',
      back: 'Always move the shorter boundary inward. Every remaining pair containing the shorter one is narrower and still capped by its height, so it is fully exhausted.',
    },
    {
      id: 'f5',
      front: 'Pitfall: running converging pair-sum pointers on unsorted data. What happens and what is the fix?',
      back: 'The safe-skip argument collapses and you silently get wrong answers. Fix: sort first (O(n log n), but original indices are lost) or use a hash map (O(n), indices preserved).',
    },
    {
      id: 'f6',
      front: 'Time and space complexity of a converging or read/write two-pointer scan (data already sorted)?',
      back: 'O(n) time — each pointer advances monotonically, so at most n total moves — and O(1) extra space (just the two indices).',
    },
    {
      id: 'f7',
      front: 'Palindrome-check skeleton with two pointers?',
      back: 'l, r = 0, len(s)-1; while l < r: mismatch → fail (or branch if edits are allowed); else l += 1, r -= 1. Filter/normalize characters before or during the scan.',
    },
    {
      id: 'f8',
      front: 'In the max-area scan, heights at both pointers are EQUAL. Which pointer do you move?',
      back: 'Either — it cannot lose. Any strictly better pair must lie strictly inside both pointers, and the pointer you keep will still reach it. Pick one convention and stay consistent.',
    },
    {
      id: 'f9',
      front: 'loop condition: when do you use left < right versus left <= right?',
      back: 'left < right when the two pointers must index distinct elements (pair sums, palindromes). left <= right when a single middle element still needs processing, as in some partition or binary-search-style scans.',
    },
    {
      id: 'f10',
      front: 'How does "valid palindrome with k deletions" escalate the basic two-pointer pattern?',
      back: 'A mismatch now forks: drop the left or right end. Memoize over contiguous spans (i, j) to collapse the 2^k branch tree into O(n^2) subproblems — two pointers gives the recursion shape, DP makes it affordable.',
    },
  ],
  cheatSheet: {
    tldr:
      'Two pointers replaces brute-force pair enumeration with two indices that only ever move forward, each move backed by a proof (from sortedness, symmetry, or a kept-prefix invariant) that the skipped candidates cannot matter. Converging pointers walk inward from both ends for pair sums, palindromes, and best-boundary problems; read/write pointers sweep the same direction for in-place dedup, filtering, and partitioning. Either way you touch each element O(1) times: linear time, constant extra space.',
    signals: [
      'Reach for this when the input is sorted (or sortable) and you need a pair/triple hitting a target sum, difference, or closest value.',
      'Reach for this when the task says "in place", "remove/compact/partition", or "preserve order while filtering" — that is the read/write variant.',
      'Reach for this when checking symmetry: palindromes or mirrored sequences, especially with characters to skip or a small edit budget.',
      'Reach for this when picking two boundaries whose score is distance x min(heights) — converge and always move the weaker side.',
      'Be suspicious when the array is unsorted and original indices matter (hash map wins) or when a window grows/shrinks by its contents (sliding window wins).',
    ],
    template: `# Converging: ends -> middle (sorted data / symmetry / boundaries)
left, right = 0, len(arr) - 1
while left < right:
    score = combine(arr[left], arr[right])
    if is_answer(score):
        return [left, right]
    if need_bigger(score):
        left += 1            # safe: nothing pairs with arr[left] anymore
    else:
        right -= 1           # safe: nothing pairs with arr[right] anymore

# Read/write: same direction (in-place filter / dedup / partition)
write = 0
for read in range(len(arr)):
    if keep(arr[read]):      # decide using arr[:write], the kept prefix
        arr[write] = arr[read]
        write += 1
# arr[:write] is the result`,
    complexity: 'Time O(n) (O(n log n) if you must sort first), Space O(1) extra.',
  },
}

export default mod
