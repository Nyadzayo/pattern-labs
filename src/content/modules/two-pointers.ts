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
