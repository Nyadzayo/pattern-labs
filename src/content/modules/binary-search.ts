import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'binary-search',
  visualizer: 'binary-search',
  concept: `
## The mental model

Imagine phoning an archivist who guards a kilometre-long row of filing drawers, all sorted by case number. You can't see the drawers; you can only ask, "open drawer X and read me the label." Every answer she gives — too low, too high, found it — lets you throw away *half* of the remaining drawers without ever opening them. Twenty questions kill a million drawers. That is binary search: not a way of reading data, but a way of **destroying possibilities in bulk**.

Here's the part most people learn too late: the technique doesn't actually require a sorted array. It requires a question whose answers form a clean stripe — \`no, no, no, yes, yes, yes\` — across the search space. A **monotone predicate**. A sorted array is just the most familiar place that stripe shows up. Once you see it this way, you can binary-search things that aren't arrays at all: commit histories, machine speeds, ship capacities. You're searching the *answers*, not the data.

## Mechanics

There are two loop shapes worth memorizing, and they answer different questions.

**Template 1 — exact match, \`while lo <= hi\`.** The live range \`[lo, hi]\` is inclusive and the loop runs until it's *empty*. Use it when a probe can fully resolve the search ("found it, done") and "not present" is a possible verdict:

\`\`\`python
def index_of(arr: list[int], target: int) -> int:
    lo, hi = 0, len(arr) - 1
    while lo <= hi:               # range [lo, hi] still non-empty
        mid = (lo + hi) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            lo = mid + 1          # discard mid and everything left
        else:
            hi = mid - 1          # discard mid and everything right
    return -1                     # range emptied: not present
\`\`\`

**Template 2 — boundary hunt, \`while lo < hi\`.** Here no single probe can finish the job; you're hunting the *first* index where a predicate flips from false to true. The invariant is "the answer is always inside \`[lo, hi]\`", and the loop converges to one survivor:

\`\`\`python
def lower_bound(arr: list[int], x: int) -> int:
    lo, hi = 0, len(arr)          # hi is exclusive; n means "no such index"
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] >= x:
            hi = mid              # mid satisfies it — keep mid as a candidate
        else:
            lo = mid + 1          # mid fails — it can never be the answer
    return lo                     # first index with arr[i] >= x
\`\`\`

Notice the asymmetry: the satisfying branch keeps \`mid\` (\`hi = mid\`), the failing branch discards it (\`lo = mid + 1\`). That asymmetry is what makes the loop converge instead of spin.

**Answer-space search** is Template 2 pointed at a range of candidate answers instead of array indices. "What's the slowest machine speed that still meets the deadline?" Speeds form a stripe: too-slow speeds fail, and every speed above a working one also works. Write a \`feasible(speed)\` checker, binary-search the speed range, return the boundary. The checker can be expensive — \`O(n)\` per call — because you only call it \`O(log M)\` times.

## When to reach for it

- The input is **sorted** (or indexable in sorted order) and you need a position: a target, an insertion point, a first/last occurrence.
- The problem says **minimize the maximum** or **maximize the minimum**: smallest capacity that fits, lowest speed that finishes, largest gap you can guarantee. These are answer-space searches in disguise.
- You can write a **cheap yes/no checker** for a candidate answer, and a "yes" at one value forces "yes" at every value beyond it.
- Data is sorted-then-rotated, or piecewise sorted — partial order is often still enough to discard half per probe.
- The constraints scream it: \`n\` up to \`10^9\` or answers up to \`10^18\` mean nothing linear will pass; only \`O(log)\` probing survives.

If the predicate is *not* monotone — the yeses and nos interleave — binary search will confidently return garbage. Verify the stripe before you trust the loop.

## Complexity

Each probe halves the live range, so searching \`n\` items costs \`O(log n)\` time and \`O(1)\` space — about 20 probes for a million items, 30 for a billion. Answer-space search costs \`O(n log M)\` where \`M\` is the width of the answer range and \`O(n)\` is your feasibility check: for \`n = 10^4\` bins and answers up to \`10^9\`, that's roughly 300,000 operations versus the \`10^13\` of trying every speed.

## Common pitfalls

- **Mixing templates.** \`while lo <= hi\` with \`hi = mid\` loops forever; \`while lo < hi\` with an early-return-on-match can exit without checking the survivor. Pick one shape and keep its invariant.
- **The infinite two-element loop.** In a \`lo < hi\` loop where a branch assigns \`lo = mid\` (no \`+1\`), the floor midpoint of a two-element range *is* \`lo\` — no progress, ever. Use the ceiling \`(lo + hi + 1) // 2\` whenever \`lo = mid\` appears.
- **Ambiguous endpoint in rotated arrays.** Compare \`arr[mid]\` against \`arr[hi]\`, not \`arr[lo]\` — the left comparison can't distinguish "not rotated" from "minimum is right of mid".
- **Non-monotone predicates.** If feasibility can flip back and forth, the halving argument is void. This is the bug that passes visible tests and fails hidden ones.
- **Overflow on \`mid\`.** Python integers don't overflow, but in Java/C++ \`(lo + hi) / 2\` can; the portable habit is \`lo + (hi - lo) // 2\`.
- **Forgetting what the exit state means.** After \`lo < hi\` converges, \`lo\` is a *candidate* — for "not found" semantics you must still verify it holds the target.
`,
  realWorldUses: [
    {
      title: 'git bisect for regression hunting',
      description:
        'Given a commit known to be good and a later one known to be bad, git bisect binary-searches the commit range: check out the midpoint, run the test, and discard half the history per run. A bug hidden in 4,000 commits falls in about 12 test runs — a pure answer-space search where the monotone predicate is "is the bug present yet?"',
    },
    {
      title: "Kafka's offset index lookup",
      description:
        'Each Kafka log segment carries a sparse, sorted index mapping message offsets to byte positions. When a consumer seeks to an offset, the broker binary-searches the memory-mapped index to find the nearest entry at or below the target, then scans forward — turning a seek into a handful of probes instead of a segment scan.',
    },
    {
      title: 'Key search inside B-tree pages',
      description:
        'Database engines like SQLite and Postgres descend a B-tree to find a row, and within each fixed-size page the sorted cell pointers are binary-searched to pick the child to follow. The tree descent and the in-page search compose into the overall logarithmic index lookup that makes indexed queries fast.',
    },
  ],
  problems: [
    {
      id: 'build-archive-lookup',
      title: 'Cold-Storage Build Lookup',
      difficulty: 'easy',
      statement: `
A firmware team keeps every release build in a cold-storage archive. The catalog is a list of **strictly increasing** build numbers, and the archive can hold up to 100,000 entries — far too many to scan one by one while a factory line waits.

Given the sorted list \`builds\` and a \`target\` build number, return the **index** of the target in the catalog, or \`-1\` if that build was never archived.

Your lookup must run in \`O(log n)\` time: the retrieval robot charges per catalog read, and the operations budget allows about 20 reads per request, not 100,000.
`,
      examples: [
        {
          input: 'builds = [2, 5, 8, 12, 16], target = 12',
          output: '3',
          explanation: 'Build 12 sits at index 3. A midpoint probe at index 2 reads 8 (too small), instantly discarding the left half.',
        },
        {
          input: 'builds = [2, 5, 8, 12, 16], target = 7',
          output: '-1',
          explanation: 'Build 7 was never archived. The live range shrinks until it is empty, proving absence without reading every entry.',
        },
        {
          input: 'builds = [9], target = 9',
          output: '0',
          explanation: 'A one-entry catalog resolves in a single probe.',
        },
      ],
      constraints: [
        '0 <= len(builds) <= 100_000',
        '-10^9 <= builds[k], target <= 10^9',
        'builds is sorted in strictly increasing order (no duplicates)',
        'Required: O(log n) time',
      ],
      hints: [
        'A linear scan reads up to 100,000 entries to prove a build is missing. The strict sorted order is a promise: every single read tells you something about entries you have not looked at yet. How much can one read tell you?',
        'Probe the middle of the live range. If the value there is smaller than the target, the target can only live to the right; if larger, only to the left. Either way, half the catalog dies per probe. Track the live range with two indices.',
        'Loop while lo <= hi with mid = (lo + hi) // 2. Return mid on a match; otherwise set lo = mid + 1 (probe too small) or hi = mid - 1 (probe too big). If the loop exits, the range emptied without a hit — return -1.',
      ],
      functionName: 'find_build_index',
      starterCode: `def find_build_index(builds: list[int], target: int) -> int:
    pass
`,
      solution: {
        code: `def find_build_index(builds: list[int], target: int) -> int:
    # Inclusive live range: the target, if present, is inside [lo, hi].
    lo, hi = 0, len(builds) - 1
    while lo <= hi:  # loop until the range is empty
        mid = (lo + hi) // 2
        if builds[mid] == target:
            # Direct hit — exact-match template can stop immediately.
            return mid
        if builds[mid] < target:
            # Everything at or left of mid is smaller than the target.
            lo = mid + 1
        else:
            # Everything at or right of mid is larger than the target.
            hi = mid - 1
    # Range emptied without a match: the build was never archived.
    return -1
`,
        commentary: `
This is the exact-match template in its purest form. The invariant is: *if the target exists at all, it lives inside \`[lo, hi]\`*. Each probe either resolves the search outright or proves the target is strictly on one side of \`mid\`, so \`mid\` itself and the wrong half get discarded in one move.

The loop condition \`lo <= hi\` matters: the range is inclusive on both ends, so it's only empty once \`lo\` passes \`hi\`. Stopping at \`lo < hi\` would skip the final one-element range and report phantom misses (try \`builds = [9], target = 9\`).

An empty catalog never enters the loop (\`hi\` starts at \`-1\`), falling straight through to \`-1\` — no special-casing needed. After at most \`⌈log2(n)⌉ + 1\` probes the range is empty, which is the proof of absence: every discarded half was discarded by a comparison that ruled the target out of it.
`,
        complexity: 'Time O(log n), Space O(1)',
      },
      testCases: [
        { input: [[2, 5, 8, 12, 16], 12], expected: 3, label: 'target in the middle-right' },
        { input: [[2, 5, 8, 12, 16], 7], expected: -1, label: 'absent target between entries' },
        { input: [[9], 9], expected: 0, label: 'single-entry catalog, hit' },
        { input: [[1, 3, 5, 7, 9, 11], 11], expected: 5, label: 'target at the last index' },
        { input: [[], 4], expected: -1, hidden: true, label: 'empty catalog' },
        { input: [[9], 3], expected: -1, hidden: true, label: 'single-entry catalog, miss' },
        { input: [[1, 3, 5, 7, 9, 11], 1], expected: 0, hidden: true, label: 'target at index 0' },
        { input: [[-10, -3, 0, 4], -3], expected: 1, hidden: true, label: 'negative build numbers' },
        { input: [[2, 5, 8, 12, 16], 17], expected: -1, hidden: true, label: 'target beyond the largest entry' },
      ],
      furtherPractice: [
        { name: 'LeetCode 704. Binary Search', note: 'the canonical exact-match drill' },
        { name: 'LeetCode 35. Search Insert Position', note: 'same loop, but the exit state becomes the answer' },
      ],
    },
    {
      id: 'section-scan-span',
      title: 'Turnstile Section Span',
      difficulty: 'medium',
      statement: `
A stadium logs every turnstile entry as a section number, and the night's log is stored **sorted by section** in non-decreasing order. Auditors keep asking: "show me the full block of entries for section \`s\`" — and the log can hold a million rows, most of them sometimes from a single sold-out section.

Given the sorted list \`sections\` and a \`target\` section, return \`[first, last]\` — the index of the **first** and the **last** entry for that section. If the section never appears, return \`[-1, -1]\`.

Both indices must be found in \`O(log n)\` time. Finding one match and walking outward is not acceptable: when the whole log is one section, that walk degenerates to \`O(n)\`.
`,
      examples: [
        {
          input: 'sections = [1, 2, 2, 2, 3, 5], target = 2',
          output: '[1, 3]',
          explanation: "Section 2's entries occupy the contiguous block at indices 1 through 3.",
        },
        {
          input: 'sections = [7, 7, 7, 7], target = 7',
          output: '[0, 3]',
          explanation: 'A sold-out single-section night: the block is the entire log. This is exactly the case that kills the find-one-then-walk approach.',
        },
        {
          input: 'sections = [1, 2, 3], target = 4',
          output: '[-1, -1]',
          explanation: 'Section 4 never appears, so both indices are -1.',
        },
      ],
      constraints: [
        '0 <= len(sections) <= 1_000_000',
        '0 <= sections[k], target <= 10^9',
        'sections is sorted in non-decreasing order',
        'Required: O(log n) time for both boundaries',
      ],
      hints: [
        'Equal section numbers form one contiguous block in sorted data, so the answer is really two block edges. Walking outward from any single match costs O(n) when the block is huge — the all-equal test case exists precisely to punish that.',
        'Build one helper: the first index whose value is >= x (a lower bound). Use a lo < hi loop over [0, n] where a satisfying mid is kept (hi = mid) and a failing mid is discarded (lo = mid + 1). The left edge is lower_bound(target).',
        'Reuse the same helper for the right edge: lower_bound(target + 1) - 1 is the last index holding the target. Before returning, check that lower_bound(target) is in range and actually holds the target — otherwise return [-1, -1].',
      ],
      functionName: 'section_span',
      starterCode: `def section_span(sections: list[int], target: int) -> list[int]:
    pass
`,
      solution: {
        code: `def section_span(sections: list[int], target: int) -> list[int]:
    def lower_bound(x: int) -> int:
        # First index i with sections[i] >= x; len(sections) if none.
        lo, hi = 0, len(sections)  # hi is EXCLUSIVE: n means "past the end"
        while lo < hi:
            mid = (lo + hi) // 2
            if sections[mid] >= x:
                # mid satisfies the predicate — it stays a candidate.
                hi = mid
            else:
                # mid fails — it can never be the first >= x.
                lo = mid + 1
        return lo  # lo == hi: the unique boundary

    first = lower_bound(target)
    # Verify the candidate: it may be past the end, or hold a bigger value.
    if first == len(sections) or sections[first] != target:
        return [-1, -1]
    # Last occurrence = one step before the first entry of the NEXT value.
    last = lower_bound(target + 1) - 1
    return [first, last]
`,
        commentary: `
The insight is that "first occurrence" and "last occurrence" are both **boundary** questions, and one boundary primitive answers both. \`lower_bound(x)\` finds the first index where the predicate \`sections[i] >= x\` flips to true — a monotone stripe of false-then-true, perfect for the \`lo < hi\` template.

The asymmetric moves are the whole game: when \`mid\` satisfies the predicate it might *be* the boundary, so we keep it (\`hi = mid\`); when it fails it provably isn't, so we discard it (\`lo = mid + 1\`). Every iteration shrinks the range and the answer never escapes it, so the lone survivor is the boundary.

Then comes the reuse trick: the last entry for \`target\` is the entry just before the first entry that is \`>= target + 1\`. No second algorithm, no symmetric "upper bound" code to debug — the same helper with a shifted argument. The verification step after the first call is essential: \`lower_bound\` returns where the target *would* start, which is only meaningful if something equal to the target actually lives there. Empty logs fall through naturally because \`lower_bound\` returns 0 and the bounds check fires.
`,
        complexity: 'Time O(log n), Space O(1)',
      },
      testCases: [
        { input: [[1, 2, 2, 2, 3, 5], 2], expected: [1, 3], label: 'block in the middle' },
        { input: [[1, 2, 3], 4], expected: [-1, -1], label: 'section absent' },
        { input: [[7, 7, 7, 7], 7], expected: [0, 3], label: 'all-equal log' },
        { input: [[1, 2, 3, 4], 1], expected: [0, 0], label: 'single entry at index 0' },
        { input: [[], 3], expected: [-1, -1], hidden: true, label: 'empty log' },
        { input: [[5], 5], expected: [0, 0], hidden: true, label: 'one-row log, hit' },
        { input: [[1, 1, 2, 2, 2, 2, 9], 1], expected: [0, 1], hidden: true, label: 'block starts at index 0' },
        { input: [[2, 4, 6, 8, 8], 8], expected: [3, 4], hidden: true, label: 'block ends at the last index' },
        { input: [[3, 5, 7], 1], expected: [-1, -1], hidden: true, label: 'target below every entry' },
      ],
      furtherPractice: [
        { name: 'LeetCode 34. Find First and Last Position of Element in Sorted Array', note: 'the classic phrasing of this exact problem' },
        { name: 'LeetCode 278. First Bad Version', note: 'lower bound where the "array" is an API' },
      ],
    },
    {
      id: 'carousel-minimum',
      title: 'Backup Carousel Reset',
      difficulty: 'medium',
      statement: `
A tape-backup robot stores nightly snapshots in a circular carousel. Snapshots were loaded in **strictly increasing** serial order, but a power cut spun the carousel by an unknown offset before the position counter reset — so the list you can read now is a sorted sequence **rotated** by some amount (possibly zero).

Given the list \`serials\`, return the **smallest serial number** — the true start of the sequence — so the robot can re-anchor its counter.

The carousel holds up to 100,000 tapes and each read is a slow mechanical seek, so your answer must use \`O(log n)\` reads, not a full revolution.
`,
      examples: [
        {
          input: 'serials = [4, 5, 6, 1, 2, 3]',
          output: '1',
          explanation: 'The original order 1..6 was rotated left by three positions; the smallest serial is 1.',
        },
        {
          input: 'serials = [10, 20, 30, 40]',
          output: '10',
          explanation: 'The power cut happened to leave the carousel aligned (rotation of zero). Your search must handle the not-actually-rotated case.',
        },
        {
          input: 'serials = [2, 1]',
          output: '1',
          explanation: 'A two-tape carousel rotated by one. The minimum is at the last position.',
        },
      ],
      constraints: [
        '1 <= len(serials) <= 100_000',
        '-10^9 <= serials[k] <= 10^9',
        'All serials are distinct',
        'serials is a strictly increasing sequence rotated by some offset in [0, n)',
        'Required: O(log n) time',
      ],
      hints: [
        'The spin did not destroy all the order. The list is two ascending runs glued together, and every serial in the first run is larger than every serial in the second. The answer is the first tape of the second run.',
        'Compare the middle serial against the LAST serial. If the middle is larger, you are standing in the high run and the minimum lies strictly to the right of mid; otherwise mid itself might be the minimum, so it stays in play.',
        'Loop while lo < hi: if serials[mid] > serials[hi], set lo = mid + 1, else hi = mid. The survivor is the minimum. Do not compare against serials[lo] — that comparison cannot tell "not rotated" apart from "minimum is right of mid".',
      ],
      functionName: 'carousel_minimum',
      starterCode: `def carousel_minimum(serials: list[int]) -> int:
    pass
`,
      solution: {
        code: `def carousel_minimum(serials: list[int]) -> int:
    # Boundary template: the minimum always lives inside [lo, hi].
    lo, hi = 0, len(serials) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if serials[mid] > serials[hi]:
            # mid sits in the high run (before the drop-off).
            # The minimum is strictly to the right of mid.
            lo = mid + 1
        else:
            # mid <= the last value: mid is in the low run.
            # The minimum is mid itself or somewhere to its left.
            hi = mid
    # lo == hi: the lone survivor is the smallest serial.
    return serials[lo]
`,
        commentary: `
A rotated sorted list has exactly one "cliff" — the single spot where a value is followed by a smaller one — and the minimum is the value at the bottom of that cliff (or index 0 if the rotation was zero). The search hunts the cliff with the \`lo < hi\` boundary template.

The load-bearing decision is **which endpoint to compare against**. Comparing \`serials[mid]\` to \`serials[hi]\` gives an unambiguous verdict either way: \`mid > hi\`-value means the cliff is strictly between them, so the minimum is right of \`mid\` (discard \`mid\`); \`mid < hi\`-value means \`mid\` and everything past it down to \`hi\` are on the low run's slope, so the minimum is at \`mid\` or left of it (keep \`mid\`). Distinctness guarantees no equal case.

Comparing against \`serials[lo]\` instead is the classic bug: \`serials[mid] > serials[lo]\` is true *both* when the list isn't rotated (minimum at \`lo\`!) and when the cliff is right of \`mid\` — one comparison, two contradictory conclusions, so no safe discard exists. The asymmetric moves (\`lo = mid + 1\` versus \`hi = mid\`) follow the boundary-template rule: discard \`mid\` only when it's provably not the answer. Since the discarding branch always moves \`lo\` past \`mid\`, the floor midpoint cannot stall the loop.
`,
        complexity: 'Time O(log n), Space O(1)',
      },
      testCases: [
        { input: [[4, 5, 6, 1, 2, 3]], expected: 1, label: 'rotated near the middle' },
        { input: [[10, 20, 30, 40]], expected: 10, label: 'rotation of zero' },
        { input: [[2, 1]], expected: 1, label: 'two tapes, rotated' },
        { input: [[3, 4, 5, 6, 7, 8, 2]], expected: 2, label: 'minimum at the last index' },
        { input: [[7]], expected: 7, hidden: true, label: 'single tape' },
        { input: [[50, 60, 70, 10, 20, 30, 40]], expected: 10, hidden: true, label: 'longer high run first' },
        { input: [[-5, -4, -10, -9, -8, -7, -6]], expected: -10, hidden: true, label: 'negative serials' },
        { input: [[100, 1, 2, 3]], expected: 1, hidden: true, label: 'rotation by one' },
      ],
      furtherPractice: [
        { name: 'LeetCode 153. Find Minimum in Rotated Sorted Array', note: 'the classic version' },
        { name: 'LeetCode 33. Search in Rotated Sorted Array', note: 'find a target instead of the minimum' },
        { name: 'LeetCode 154. Find Minimum in Rotated Sorted Array II', note: 'duplicates break the clean halving — see why' },
      ],
    },
    {
      id: 'flash-rig-rate',
      title: 'Flashing Rig Throughput',
      difficulty: 'hard',
      statement: `
A phone-repair franchise has one firmware-flashing rig and a stack of bins to clear before closing. Bin \`i\` holds \`bins[i]\` phones. The rig runs at a configurable rate of \`r\` phones per hour, but two rules apply: the rig works on **one bin at a time** until that bin is empty, and bin swaps happen only **on the hour** — so a bin of \`b\` phones occupies the rig for \`ceil(b / r)\` whole hours, even if the last hour is mostly idle.

Higher rates wear out the rig faster, so the owner wants the **minimum integer rate** \`r >= 1\` such that every bin is finished within \`hours\` hours.

Return that minimum rate. It is guaranteed that \`hours >= len(bins)\`, so a solution always exists (at rate \`max(bins)\`, each bin takes exactly one hour).
`,
      examples: [
        {
          input: 'bins = [3, 6, 7, 11], hours = 8',
          output: '4',
          explanation: 'At rate 4 the bins take ceil(3/4) + ceil(6/4) + ceil(7/4) + ceil(11/4) = 1 + 2 + 2 + 3 = 8 hours — exactly the budget. At rate 3 they would take 1 + 2 + 3 + 4 = 10 hours, too slow.',
        },
        {
          input: 'bins = [30, 11, 23, 4, 20], hours = 5',
          output: '30',
          explanation: 'Five bins and five hours means every bin gets exactly one hour, so the rate must cover the biggest bin in a single hour.',
        },
        {
          input: 'bins = [5, 5, 5], hours = 15',
          output: '1',
          explanation: 'With plenty of time, the gentlest rate works: 5 + 5 + 5 = 15 hours at one phone per hour.',
        },
      ],
      constraints: [
        '1 <= len(bins) <= 10_000',
        '1 <= bins[i] <= 10^9',
        'len(bins) <= hours <= 10^9',
        'The answer is an integer rate r with 1 <= r <= max(bins)',
      ],
      hints: [
        'Forget minimizing for a second. If someone handed you a candidate rate r, how cheaply could you check whether the whole stack fits inside the hour budget? Write that check first.',
        'Feasibility is monotone: if rate r finishes in time, every rate above r finishes too (each ceil(b/r) can only shrink as r grows). So the rates 1..max(bins) split into a "too slow" prefix and a "fast enough" suffix — the answer is the boundary between them.',
        'Binary search r over [1, max(bins)] with the lo < hi template: compute sum of ceil(b / mid) hours; if it is <= hours, the rate works, so hi = mid; otherwise lo = mid + 1. Integer ceiling without floats: (b + r - 1) // r.',
      ],
      functionName: 'min_flash_rate',
      starterCode: `def min_flash_rate(bins: list[int], hours: int) -> int:
    pass
`,
      solution: {
        code: `def min_flash_rate(bins: list[int], hours: int) -> int:
    def hours_needed(rate: int) -> int:
        # Each bin occupies whole hours: ceil(b / rate), computed
        # with integer math so it stays exact at any operand size.
        return sum((b + rate - 1) // rate for b in bins)

    # Candidate answers, NOT array indices: every rate in [1, max(bins)].
    # Rate max(bins) always works (one hour per bin, hours >= len(bins)).
    lo, hi = 1, max(bins)
    while lo < hi:
        mid = (lo + hi) // 2
        if hours_needed(mid) <= hours:
            # mid is fast enough — it might be the minimum, keep it.
            hi = mid
        else:
            # mid is too slow — so is everything below it; discard.
            lo = mid + 1
    # lo == hi: the slowest rate that still meets the deadline.
    return lo
`,
        commentary: `
Nothing here is sorted and there is no array to probe — the move is to binary-search the **answer space**. The candidates are the integer rates \`1..max(bins)\`, and the question "does rate r finish within the budget?" is a monotone predicate: raising the rate can only shrink each bin's \`ceil(b/r)\` hour count, so the rates form a clean too-slow/fast-enough stripe. The minimum feasible rate is the stripe's boundary, which is exactly what the \`lo < hi\` template finds: feasible \`mid\` stays a candidate (\`hi = mid\`), infeasible \`mid\` is discarded along with everything below it (\`lo = mid + 1\`).

Two details earn the "hard" tag. First, the feasibility check must respect the *whole-hour* rule — \`sum(bins) / r\` is tempting and wrong, because it lets one bin's leftover minutes spill into the next bin's hour. With \`bins = [30, 11, 23, 4, 20]\` and \`hours = 5\`, total work is 88 phones, and \`88 / 5 = 17.6\` suggests rate 18 — but five bins in five hours forces one hour per bin, so the true answer is 30. The per-bin ceiling is the entire problem. Second, \`(b + rate - 1) // rate\` computes the ceiling in pure integer arithmetic; \`math.ceil(b / rate)\` round-trips through a 53-bit float, which is fine at this problem's \`10^9\` scale but mis-rounds once operands approach \`2^53\` (answer ranges near \`10^18\`) — the integer form is the habit that never needs the caveat.

The upper bound \`max(bins)\` is safe because \`hours >= len(bins)\` guarantees one-hour-per-bin fits, so the search range always contains a feasible rate and the loop's survivor is genuinely the minimum.
`,
        complexity: 'Time O(n log M) where M = max(bins), Space O(1)',
      },
      testCases: [
        { input: [[3, 6, 7, 11], 8], expected: 4, label: 'exact-fit budget' },
        { input: [[30, 11, 23, 4, 20], 5], expected: 30, label: 'one hour per bin forces max(bins)' },
        { input: [[1], 1], expected: 1, label: 'minimal instance' },
        { input: [[5, 5, 5], 15], expected: 1, label: 'all-equal bins, generous budget' },
        { input: [[30, 11, 23, 4, 20], 6], expected: 23, hidden: true, label: 'one spare hour changes the answer' },
        { input: [[1000000000], 2], expected: 500000000, hidden: true, label: 'single huge bin, extreme values' },
        { input: [[2, 2], 3], expected: 2, hidden: true, label: 'rounding makes rate 1 infeasible' },
        { input: [[7, 7, 7, 7], 4], expected: 7, hidden: true, label: 'all-equal bins, tight budget' },
      ],
      furtherPractice: [
        { name: 'LeetCode 875. Koko Eating Bananas', note: 'the same shape with a different story' },
        { name: 'LeetCode 1011. Capacity To Ship Packages Within D Days', note: 'answer-space search where order matters' },
        { name: 'LeetCode 410. Split Array Largest Sum', note: 'minimize-the-maximum with a greedy feasibility check' },
      ],
    },
    {
      id: 'kiln-peak-reading',
      title: 'Kiln Turnover Minute',
      difficulty: 'medium',
      statement: `
A pottery studio's electric kiln logs one temperature reading per minute during a firing. The controller guarantees a clean profile: readings **strictly increase** while the elements heat, hit a single peak, then **strictly decrease** through cooldown — and either phase may be missing entirely if logging started late or was cut short.

Given the list \`readings\`, return the **index of the peak reading** — the minute the firing turned over.

The studio dashboard replays thousands of archived firings on every refresh, so each lookup must run in \`O(log n)\`; rescanning every minute of every log is off the table.
`,
      examples: [
        {
          input: 'readings = [110, 230, 480, 950, 700, 420]',
          output: '3',
          explanation: 'Temperatures climb to 950 at index 3, then fall. Minute 3 is the turnover.',
        },
        {
          input: 'readings = [220, 180, 90]',
          output: '0',
          explanation: 'Logging began after the peak — the whole log is cooldown, so the hottest reading is the very first one.',
        },
        {
          input: 'readings = [100, 400]',
          output: '1',
          explanation: 'All heating: the peak is the final reading. Either phase of the profile may be empty.',
        },
      ],
      constraints: [
        '1 <= len(readings) <= 100_000',
        '0 <= readings[k] <= 2_000',
        'readings strictly increases to a single peak, then strictly decreases (either side may be empty)',
        'Adjacent readings are never equal',
        'Required: O(log n) time',
      ],
      hints: [
        'Finding a maximum normally means looking at everything. But this log is not arbitrary data: pick any single minute and compare it with the next one, and the result tells you which phase of the firing that minute belongs to. What does knowing the phase rule out?',
        'If readings[mid] < readings[mid + 1], minute mid sits on the heating ramp, so the peak lies strictly to its right — discard mid and everything left of it. Otherwise mid is the peak or already cooling, so the peak is at mid or to its left. Every probe kills half the log.',
        'Boundary template: lo, hi = 0, len(readings) - 1; while lo < hi: mid = (lo + hi) // 2; on a rise (readings[mid] < readings[mid + 1]) set lo = mid + 1, otherwise hi = mid. The mid + 1 access is always safe because lo < hi forces mid < hi. Return lo.',
      ],
      functionName: 'kiln_peak_index',
      starterCode: `def kiln_peak_index(readings: list[int]) -> int:
    pass
`,
      solution: {
        code: `def kiln_peak_index(readings: list[int]) -> int:
    # Boundary template: the peak index always lives inside [lo, hi].
    lo, hi = 0, len(readings) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if readings[mid] < readings[mid + 1]:
            # Rising slope: mid cannot be the peak — its right
            # neighbour is hotter. The peak is strictly right of mid.
            lo = mid + 1
        else:
            # Falling here: mid might BE the peak, so keep it alive.
            hi = mid
    # lo == hi: the lone surviving index is the turnover minute.
    return lo
`,
        commentary: `
There is no target value to compare against — the trick is that the **slope** is the monotone predicate. Define \`falling(i)\` as "\`readings[i] > readings[i + 1]\`". On a strict rise-then-fall profile this predicate is false at every heating minute and true from the peak onward: a clean false→true stripe, even though the raw temperatures go up and then down. The peak is the first index where the stripe flips, so the \`lo < hi\` boundary template applies unchanged.

The moves follow the template's golden rule — discard \`mid\` only when it provably is not the answer. A rising comparison proves \`mid\` cannot be the peak (its right neighbour is hotter), hence \`lo = mid + 1\`; a non-rising comparison leaves \`mid\` alive as a candidate, hence \`hi = mid\`. Strictness is what keeps the verdict unambiguous: a plateau would make \`readings[mid]\` equal to its neighbour and the halving argument would collapse.

Two boundary details carry the implementation. \`hi\` starts at \`len(readings) - 1\` rather than \`len(readings)\` because the peak is guaranteed to exist inside the array — there is no "not found" lane to leave room for. And the \`mid + 1\` probe never falls off the end: \`lo < hi\` guarantees \`mid < hi <= n - 1\`. A single-reading log skips the loop entirely and returns index 0.
`,
        complexity: 'Time O(log n), Space O(1)',
      },
      testCases: [
        { input: [[110, 230, 480, 950, 700, 420]], expected: 3, label: 'peak mid-log' },
        { input: [[220, 180, 90]], expected: 0, label: 'all cooldown — peak at index 0' },
        { input: [[100, 400]], expected: 1, label: 'all heating — peak at the last index' },
        { input: [[640]], expected: 0, hidden: true, label: 'single reading' },
        { input: [[1, 2, 3, 4, 5]], expected: 4, hidden: true, label: 'monotone rise' },
        { input: [[5, 9, 8, 7, 6, 4, 2]], expected: 1, hidden: true, label: 'peak at index 1' },
        { input: [[8, 3]], expected: 0, hidden: true, label: 'two readings, falling' },
        { input: [[2, 4, 6, 9, 12, 11]], expected: 4, hidden: true, label: 'late peak' },
      ],
      furtherPractice: [
        { name: 'LeetCode 852. Peak Index in a Mountain Array', note: 'the classic unimodal phrasing' },
        { name: 'LeetCode 162. Find Peak Element', note: 'no unimodal guarantee — any local peak counts' },
      ],
    },
    {
      id: 'record-shelf-slot',
      title: 'Record Shop Shelf Slot',
      difficulty: 'easy',
      statement: `
A second-hand record shop keeps one long shelf of vinyl sorted by catalog number in **non-decreasing** order — duplicates are common, since popular albums went through many pressings. When a new record arrives, a clerk slides it into the shelf so the order survives, and shop policy is firm: a new arrival goes **in front of every existing copy** with the same catalog number, because newest stock sells first.

Given the shelf as a list \`catalog\` and the new record's number \`incoming\`, return the index of the slot where it must be inserted. An answer of \`len(catalog)\` means the far right end.

The flagship store shelves tens of thousands of records and logs arrivals all day, so each placement must be computed in \`O(log n)\`.
`,
      examples: [
        {
          input: 'catalog = [12, 30, 30, 47], incoming = 30',
          output: '1',
          explanation: 'Policy puts the new pressing ahead of both existing copies of 30, so it takes index 1.',
        },
        {
          input: 'catalog = [12, 30, 30, 47], incoming = 35',
          output: '3',
          explanation: 'Number 35 slots between the block of 30s and the 47.',
        },
        {
          input: 'catalog = [12, 30, 30, 47], incoming = 90',
          output: '4',
          explanation: 'Bigger than everything on the shelf: it goes at the far right end, index len(catalog).',
        },
      ],
      constraints: [
        '0 <= len(catalog) <= 100_000',
        '0 <= catalog[k], incoming <= 10^9',
        'catalog is sorted in non-decreasing order (duplicates allowed)',
        'Required: O(log n) time',
      ],
      hints: [
        'Describe the correct slot without naming any algorithm: every number to its left must be strictly smaller than the incoming one, and the number sitting at the slot — if the slot is occupied — must be at least as large. Convince yourself exactly one index fits that description.',
        'The predicate catalog[i] >= incoming is false for a prefix of indices and true for all the rest — a monotone stripe — and your slot is the first true index. Include len(catalog) itself as a candidate, since the record may belong past the last slot.',
        'lo, hi = 0, len(catalog); while lo < hi: mid = (lo + hi) // 2; if catalog[mid] >= incoming keep the candidate (hi = mid), else discard it (lo = mid + 1). Return lo — unlike a find-the-target search, every possible exit value is already a valid slot, so no final verification is needed.',
      ],
      functionName: 'shelf_insert_slot',
      starterCode: `def shelf_insert_slot(catalog: list[int], incoming: int) -> int:
    pass
`,
      solution: {
        code: `def shelf_insert_slot(catalog: list[int], incoming: int) -> int:
    # Search [0, n] INCLUSIVE of n: "past the last record" is a real slot.
    lo, hi = 0, len(catalog)
    while lo < hi:
        mid = (lo + hi) // 2
        if catalog[mid] >= incoming:
            # Slot mid works (everything from here shifts right), and it
            # might be the leftmost workable slot — keep it as a candidate.
            hi = mid
        else:
            # catalog[mid] is strictly smaller: the slot is right of mid.
            lo = mid + 1
    # lo == hi: the leftmost index whose value is >= incoming.
    return lo
`,
        commentary: `
This is the lower-bound boundary hunt where the loop's exit state **is** the answer — there is no "not found" outcome to guard against. Whether \`incoming\` already exists on the shelf (slide in front of the duplicates), falls between two numbers, or beats everything, the first index satisfying \`catalog[i] >= incoming\` is exactly the slot the policy demands. That is why no verification follows the loop, in contrast to a find-the-target search where the surviving candidate must still be checked against the target.

The search range is the subtle part: \`hi\` starts at \`len(catalog)\`, one *past* the last index, because "append at the far right" is a legitimate answer and the boundary template must keep every possible answer inside \`[lo, hi]\` at all times. Start \`hi\` at \`len(catalog) - 1\` and any incoming number larger than the whole shelf gets filed one slot too early.

Duplicates cost nothing. With \`catalog = [7, 7, 7]\` and \`incoming = 7\`, every probe satisfies \`>=\`, so \`hi\` walks down to 0 — in front of the leftmost copy — with no special handling. In fact the strict-versus-non-strict choice in that one comparison *is* the entire shop policy: testing \`catalog[mid] > incoming\` instead would file the new arrival after the existing copies (an upper bound rather than a lower bound).

An empty shelf never enters the loop (\`lo == hi == 0\`) and correctly reports slot 0.
`,
        complexity: 'Time O(log n), Space O(1)',
      },
      testCases: [
        { input: [[12, 30, 30, 47], 30], expected: 1, label: 'duplicates present — leftmost slot' },
        { input: [[12, 30, 30, 47], 35], expected: 3, label: 'between two numbers' },
        { input: [[12, 30, 30, 47], 90], expected: 4, label: 'past the right end' },
        { input: [[], 5], expected: 0, hidden: true, label: 'empty shelf' },
        { input: [[7, 7, 7], 7], expected: 0, hidden: true, label: 'entire shelf is one catalog number' },
        { input: [[10], 10], expected: 0, hidden: true, label: 'single record, equal number' },
        { input: [[2, 4, 6, 8], 5], expected: 2, hidden: true, label: 'absent, lands mid-shelf' },
        { input: [[5, 10, 15], 1], expected: 0, hidden: true, label: 'smaller than everything' },
      ],
      furtherPractice: [
        { name: 'LeetCode 35. Search Insert Position', note: 'the no-duplicates phrasing' },
        { name: 'LeetCode 744. Find Smallest Letter Greater Than Target', note: 'an upper bound, with wraparound' },
      ],
    },
    {
      id: 'plaza-square-side',
      title: 'Largest Plaza Square',
      difficulty: 'easy',
      statement: `
A paving contractor won a plaza job with a fixed inventory of \`tiles\` identical granite tiles. The design calls for the largest possible **solid square** — an \`s × s\` grid consuming exactly \`s * s\` tiles — with any leftovers returned to the quarry.

Return the largest integer side \`s\` such that \`s * s <= tiles\`. An inventory of zero means no square at all (\`s = 0\`).

One catch: inventories come straight from the quarry's ledger and can reach \`10^18\`. A 64-bit float cannot represent every integer that large, so \`math.sqrt\`-style shortcuts can mis-round near perfect squares — your answer must be exact across the full range using integer arithmetic, in \`O(log tiles)\` steps.
`,
      examples: [
        {
          input: 'tiles = 26',
          output: '5',
          explanation: 'A 5 × 5 square uses 25 tiles; 6 × 6 would need 36 and overdraw the inventory. One tile goes back to the quarry.',
        },
        {
          input: 'tiles = 49',
          output: '7',
          explanation: 'A perfect square: the inventory is consumed exactly.',
        },
        {
          input: 'tiles = 0',
          output: '0',
          explanation: 'No tiles, no plaza.',
        },
      ],
      constraints: [
        '0 <= tiles <= 10^18',
        'No floating-point square roots: the result must be exact over the full range',
        'Required: O(log tiles) time',
      ],
      hints: [
        'List the candidate sides 0, 1, 2, 3, ... next to the tile count each one needs: 0, 1, 4, 9, ... The requirement only ever grows as the side grows. Somewhere that growing requirement crosses your fixed inventory — and you already know a tool for finding a crossing without checking candidates one at a time.',
        'The predicate s * s <= tiles is true for every side up to the answer and false forever after. You are hunting the LAST true value — the mirror image of the usual first-true hunt — which flips which branch gets to keep mid, and that changes how mid must round.',
        'Search [0, tiles] with while lo < hi, but take mid = (lo + hi + 1) // 2 — the CEILING. The keeping branch is lo = mid (mid is affordable, maybe something bigger is too); the discarding branch is hi = mid - 1. With a floor midpoint, lo = mid makes a two-candidate range spin forever.',
      ],
      functionName: 'largest_square_side',
      starterCode: `def largest_square_side(tiles: int) -> int:
    pass
`,
      solution: {
        code: `def largest_square_side(tiles: int) -> int:
    # Candidate sides: 0..tiles (s * s <= tiles forces s <= tiles).
    # We hunt the LAST side whose square is still affordable.
    lo, hi = 0, tiles
    while lo < hi:
        # CEILING midpoint: the keeping branch below is lo = mid, and a
        # floor midpoint would stall forever on a two-candidate range.
        mid = (lo + hi + 1) // 2
        if mid * mid <= tiles:
            # mid is affordable — it may be the largest such side; keep it.
            lo = mid
        else:
            # mid overdraws the inventory, and so does every bigger side.
            hi = mid - 1
    # lo == hi: the largest side with lo * lo <= tiles.
    return lo
`,
        commentary: `
The answer space is the integers themselves — no array anywhere. Sides \`0..tiles\` split into an affordable prefix (\`s * s <= tiles\`) and an unaffordable suffix, and we want the **last** element of the prefix. That single word "last" reorganizes the whole loop relative to a lower-bound search: now it is the *satisfying* branch that must keep \`mid\` alive as \`lo = mid\`, and the failing branch that discards with \`hi = mid - 1\`.

That branch shape forces the ceiling midpoint. With \`lo = 4, hi = 5\`, the floor midpoint is 4: if the test passes, \`lo = mid\` leaves the range exactly where it was — an infinite loop. \`(lo + hi + 1) // 2\` picks 5 instead, so both branches make strict progress. The rule of thumb from the concept notes: whenever a branch assigns \`lo = mid\`, round the midpoint up.

Why ban \`math.sqrt\`? Python floats are 64-bit doubles with 53 bits of mantissa, and above \`2^53 ≈ 9 × 10^15\` they cannot represent every integer. \`math.isqrt\` aside, a float square root of \`10^18\`-scale ledger values can land one off near perfect squares, and \`int()\` truncation turns that into a wrong answer. The binary search runs entirely in Python's exact arbitrary-precision integers: about 60 probes for \`10^18\`, each a single multiplication.

Setting \`hi = tiles\` is correct because \`s * s <= tiles\` implies \`s <= tiles\` for every non-negative integer, and the degenerate inventories fall out free: \`tiles = 0\` starts with \`lo == hi == 0\`, and \`tiles = 1\` converges to side 1.
`,
        complexity: 'Time O(log tiles), Space O(1)',
      },
      testCases: [
        { input: [26], expected: 5, label: 'leftover tile' },
        { input: [49], expected: 7, label: 'perfect square' },
        { input: [0], expected: 0, label: 'empty inventory' },
        { input: [1], expected: 1, hidden: true, label: 'one tile' },
        { input: [8], expected: 2, hidden: true, label: 'one short of 3 × 3' },
        { input: [120], expected: 10, hidden: true, label: 'one short of 11 × 11' },
        { input: [999999999999999999], expected: 999999999, hidden: true, label: 'just below 10^18 — float sqrt territory' },
        { input: [1000000000000000000], expected: 1000000000, hidden: true, label: 'perfect square at the ledger maximum' },
      ],
      furtherPractice: [
        { name: 'LeetCode 69. Sqrt(x)', note: 'the classic integer square root' },
        { name: 'LeetCode 367. Valid Perfect Square', note: 'same search, boolean verdict' },
      ],
    },
    {
      id: 'patrol-log-search',
      title: 'Night Patrol Badge Log',
      difficulty: 'medium',
      statement: `
A security firm assigns each night guard a fixed loop of checkpoints. Checkpoint IDs were issued in **strictly increasing** order walking the loop from its official start — but a guard begins wherever the previous shift handed off, so the night's badge log is that increasing sequence **rotated** by an unknown offset (possibly zero).

Given the log \`scans\` and a checkpoint ID \`target\`, return the index in the log where that checkpoint was badged, or \`-1\` if the checkpoint is not on this route.

The audit system replays thousands of logs per minute against incident reports, so each lookup must run in \`O(log n)\` — re-walking the route row by row is not an option.
`,
      examples: [
        {
          input: 'scans = [15, 18, 2, 5, 9, 12], target = 5',
          output: '3',
          explanation: 'The shift started at checkpoint 15; checkpoint 5 was badged fourth, at index 3.',
        },
        {
          input: 'scans = [15, 18, 2, 5, 9, 12], target = 16',
          output: '-1',
          explanation: 'No checkpoint 16 exists anywhere on this loop.',
        },
        {
          input: 'scans = [3, 5, 8], target = 8',
          output: '2',
          explanation: 'The handoff happened at the official start — a rotation of zero. Your search must survive the not-actually-rotated case.',
        },
      ],
      constraints: [
        '1 <= len(scans) <= 100_000',
        '0 <= scans[k], target <= 10^9',
        'All checkpoint IDs are distinct',
        'scans is a strictly increasing sequence rotated by some offset in [0, n)',
        'Required: O(log n) time',
      ],
      hints: [
        'The rotation ruined the single sorted order, but not by much: slice the log at any position and look at the two pieces. Convince yourself that at least one piece is always perfectly sorted — and think about which questions a sorted piece can answer instantly.',
        'Compare scans[lo] with scans[mid] to identify the sorted half. A sorted half answers "is the target inside my value range?" with two comparisons. If it is, the search continues there; if not, the target — if it exists at all — must be hiding in the other, still-rotated half.',
        'Exact-match loop, while lo <= hi, returning mid on a hit. If scans[lo] <= scans[mid], the left half is sorted: shrink into it when scans[lo] <= target < scans[mid], otherwise go right. Else the right half is sorted: go right when scans[mid] < target <= scans[hi], otherwise go left. Range empty means -1.',
      ],
      functionName: 'patrol_log_position',
      starterCode: `def patrol_log_position(scans: list[int], target: int) -> int:
    pass
`,
      solution: {
        code: `def patrol_log_position(scans: list[int], target: int) -> int:
    lo, hi = 0, len(scans) - 1
    while lo <= hi:  # exact-match template: run the range to empty
        mid = (lo + hi) // 2
        if scans[mid] == target:
            return mid  # direct hit ends the search
        if scans[lo] <= scans[mid]:
            # Left half [lo, mid] is sorted (the cliff is to the right).
            if scans[lo] <= target < scans[mid]:
                hi = mid - 1  # target's value fits the sorted half
            else:
                lo = mid + 1  # provably absent on the left — go right
        else:
            # Right half [mid, hi] is sorted (the cliff is to the left).
            if scans[mid] < target <= scans[hi]:
                lo = mid + 1  # target's value fits the sorted half
            else:
                hi = mid - 1  # provably absent on the right — go left
    return -1  # range emptied: checkpoint not on this route
`,
        commentary: `
The rotated-minimum problem hunts the cliff; this one never needs to find it. The load-bearing structural fact: cut a rotated sorted list at any midpoint and **at least one half is fully sorted**, because the single cliff can only live on one side of the cut. The comparison \`scans[lo] <= scans[mid]\` detects which half that is — and distinct IDs keep it unambiguous, since equality only happens when \`lo == mid\`, a one-element (trivially sorted) half.

A sorted half is the only place a *range test* can be trusted: "is the target between \`scans[lo]\` and \`scans[mid]\`?" is meaningful precisely because those endpoints are the half's true minimum and maximum. If the target's value fits, the search shrinks into the sorted half. If it does not fit, the target is **provably absent** there — that is a real discard, not a guess — so the other half, still rotated but half the size, inherits the search. One probe, two comparisons, half the candidates destroyed: the same bulk-destruction argument as plain binary search, just with a two-step verdict.

This is the exact-match template (\`lo <= hi\`, return on hit, \`-1\` on an empty range) rather than a boundary hunt, because a single probe *can* finish the job and "not on the route" is a legal outcome. The fence-posts in the range tests are where bugs breed: the sorted-left test is \`scans[lo] <= target < scans[mid]\` — the \`<=\` admits the half's left endpoint, while the strict \`<\` is safe because the equality check above already ruled out \`mid\` itself.
`,
        complexity: 'Time O(log n), Space O(1)',
      },
      testCases: [
        { input: [[15, 18, 2, 5, 9, 12], 5], expected: 3, label: 'target in the low run' },
        { input: [[15, 18, 2, 5, 9, 12], 16], expected: -1, label: 'ID absent from the loop' },
        { input: [[3, 5, 8], 8], expected: 2, label: 'rotation of zero' },
        { input: [[15, 18, 2, 5, 9, 12], 15], expected: 0, label: 'target at index 0' },
        { input: [[7], 7], expected: 0, hidden: true, label: 'single checkpoint, hit' },
        { input: [[7], 4], expected: -1, hidden: true, label: 'single checkpoint, miss' },
        { input: [[9, 1, 3, 5], 1], expected: 1, hidden: true, label: 'target is the smallest ID' },
        { input: [[4, 6, 8, 1, 2], 8], expected: 2, hidden: true, label: 'target at the top of the cliff' },
        { input: [[5, 6, 7, 1, 2, 3], 4], expected: -1, hidden: true, label: 'absent ID falls in the rotation gap' },
      ],
      furtherPractice: [
        { name: 'LeetCode 33. Search in Rotated Sorted Array', note: 'the classic phrasing' },
        { name: 'LeetCode 81. Search in Rotated Sorted Array II', note: 'duplicates degrade the worst case — see how' },
      ],
    },
    {
      id: 'mural-crew-split',
      title: 'Festival Mural Crews',
      difficulty: 'hard',
      statement: `
A street-art festival is painting one long wall divided into panels, numbered left to right; panel \`i\` needs \`panels[i]\` hours of work. The festival hired \`crews\` painting crews. Scaffolding is rented per stretch of wall, so each crew receives exactly one **contiguous block** of consecutive panels; every panel belongs to exactly one crew and no block may be empty.

All crews start at the same moment and work in parallel. A crew's finish time is the sum of its panels' hours, and the mural is unveiled only when the **slowest crew** finishes.

Choose the block boundaries so the unveiling happens as early as possible, and return that minimum finish time in hours.
`,
      examples: [
        {
          input: 'panels = [4, 1, 3, 2, 6], crews = 2',
          output: '8',
          explanation: 'Split [4, 1, 3 | 2, 6]: both crews carry exactly 8 hours. Every other boundary leaves some crew with 10 or more.',
        },
        {
          input: 'panels = [7, 2, 5, 10, 8], crews = 2',
          output: '18',
          explanation: 'Split [7, 2, 5 | 10, 8]: loads 14 and 18. Shifting the boundary left gives 23, right gives 24 — 18 is the best worst-case.',
        },
        {
          input: 'panels = [5, 5, 5], crews = 3',
          output: '5',
          explanation: 'One panel per crew; the slowest crew needs 5 hours, and no split can beat the biggest single panel.',
        },
      ],
      constraints: [
        '1 <= len(panels) <= 10_000',
        '1 <= panels[i] <= 10^6',
        '1 <= crews <= len(panels)',
        'Blocks must be contiguous, non-empty, and cover every panel',
        'Required: O(n log S) time where S = sum(panels)',
      ],
      hints: [
        'Enumerating boundary placements explodes combinatorially. Turn the optimization around: suppose the festival director simply announced "we unveil in T hours." How hard would it be to decide whether ANY assignment of contiguous blocks lets every crew finish within T?',
        'For a fixed deadline T, a greedy sweep settles it: walk the panels left to right, piling them onto the current crew until one more would push it past T, then hand off to a fresh crew. If the crews used stay within budget, T is achievable — and any deadline above an achievable one is achievable too. That is a monotone stripe over candidate deadlines.',
        'Binary search the deadline over [max(panels), sum(panels)] with the lo < hi template: achievable(mid) → hi = mid, otherwise lo = mid + 1. The greedy check is O(n) and runs O(log S) times; the survivor is the earliest possible unveiling.',
      ],
      functionName: 'min_mural_hours',
      starterCode: `def min_mural_hours(panels: list[int], crews: int) -> int:
    pass
`,
      solution: {
        code: `def min_mural_hours(panels: list[int], crews: int) -> int:
    def crews_needed(deadline: int) -> int:
        # Greedy sweep: pack panels onto the current crew until one more
        # would blow the deadline, then hand off to a fresh crew. This
        # uses the fewest possible crews for the given deadline.
        used, load = 1, 0
        for hours in panels:
            if load + hours > deadline:
                used += 1     # current crew is full — hand off
                load = hours  # the new crew starts with this panel
            else:
                load += hours
        return used

    # Candidate deadlines, NOT positions on the wall. Anything below
    # max(panels) is impossible (someone must paint the biggest panel),
    # and sum(panels) always works (one crew paints everything).
    lo, hi = max(panels), sum(panels)
    while lo < hi:
        mid = (lo + hi) // 2
        if crews_needed(mid) <= crews:
            hi = mid      # achievable — an earlier unveiling may exist
        else:
            lo = mid + 1  # too ambitious — discard mid and below
    return lo  # the earliest achievable unveiling time
`,
        commentary: `
"Minimize the maximum block sum" sounds like an optimization over exponentially many boundary placements, but the answer itself lives on a number line — so binary-search the **answer space**. The decision version, "can the wall be finished by deadline T?", is monotone: a split that meets deadline T meets every later deadline verbatim. False up to some point, true forever after — and the unveiling time we want is exactly the stripe's boundary, which the \`lo < hi\` template extracts: achievable \`mid\` stays a candidate (\`hi = mid\`), unachievable \`mid\` dies with everything below it (\`lo = mid + 1\`).

The feasibility check is where this problem outgrows the simple rate search. Because blocks must be *contiguous*, checking a deadline means partitioning the wall, and the greedy sweep is provably optimal for that: extend the current crew's block while it fits, hand off only when forced. An exchange argument shows why — ending any block earlier than forced can only push more work into the remaining wall, never less, so no other strategy uses fewer crews for the same deadline. If the greedy count comes in under budget, idle crews are harmless: splitting any block further only lowers loads, never raises the maximum (this is why \`crews <= len(panels)\` keeps every block non-empty).

The search bounds encode two facts about the answer, not guesses: no deadline below \`max(panels)\` can work because some crew must paint the biggest panel whole, and \`sum(panels)\` always works with a single crew. Starting \`lo\` at 1 would still converge — the tighter bound just trims probes. Each probe costs one \`O(n)\` sweep and the range halves \`O(log S)\` times, so \`n = 10^4\` panels with sums near \`10^10\` resolve in a few hundred thousand operations.
`,
        complexity: 'Time O(n log S) where S = sum(panels), Space O(1)',
      },
      testCases: [
        { input: [[4, 1, 3, 2, 6], 2], expected: 8, label: 'two crews, perfectly balanced cut' },
        { input: [[7, 2, 5, 10, 8], 2], expected: 18, label: 'best split is uneven' },
        { input: [[5, 5, 5], 3], expected: 5, label: 'one panel per crew' },
        { input: [[10], 1], expected: 10, hidden: true, label: 'single panel' },
        { input: [[1, 2, 3, 4, 5], 1], expected: 15, hidden: true, label: 'one crew paints the whole wall' },
        { input: [[1, 1, 1, 1], 4], expected: 1, hidden: true, label: 'crews equal panels' },
        { input: [[9, 1, 1, 1, 9], 3], expected: 9, hidden: true, label: 'biggest panel sets the floor' },
        { input: [[2, 3, 1, 2, 4, 3], 3], expected: 6, hidden: true, label: 'three-way split' },
        { input: [[5, 1, 1, 1, 1, 5], 2], expected: 7, hidden: true, label: 'symmetric wall, asymmetric arithmetic' },
      ],
      furtherPractice: [
        { name: 'LeetCode 410. Split Array Largest Sum', note: 'the classic phrasing of this exact problem' },
        { name: 'LeetCode 1011. Capacity To Ship Packages Within D Days', note: 'same skeleton, capacity instead of time' },
        { name: 'LeetCode 1552. Magnetic Force Between Two Balls', note: 'the maximize-the-minimum mirror image' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt:
        'Binary search is usually introduced on sorted arrays. What is the actual minimal requirement for it to be correct?',
      choices: [
        'The data must be physically stored as a sorted array in memory',
        'There must be a predicate over the search space that is false up to some point and true afterwards (monotone), so one probe identifies a discardable half',
        'All elements in the search space must be unique',
        'The target must be guaranteed to exist in the search space',
      ],
      correctIndex: 1,
      explanation:
        'The halving argument only needs a monotone false→true stripe: one probe tells you which side of the boundary you are on, so half the candidates die. A sorted array is just the most common source of such a stripe — git bisect and answer-space searches have no array at all. Uniqueness is not required (first/last-occurrence searches thrive on duplicates), and "not found" is a perfectly valid outcome, so existence is not required either.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt: 'What distinguishes the `while lo <= hi` exact-match template from the `while lo < hi` boundary template?',
      choices: [
        'The exact-match loop shrinks an inclusive range until it is empty (so it can prove absence); the boundary loop keeps the answer inside [lo, hi] and converges to exactly one surviving candidate',
        'The lo < hi version is asymptotically faster than the lo <= hi version',
        'lo <= hi only works on arrays of odd length',
        'They are interchangeable — only stylistic preference separates them',
      ],
      correctIndex: 0,
      explanation:
        'They maintain different invariants for different questions. Exact match can finish early on a hit and must run the range to empty to prove a miss, hence lo <= hi. A boundary hunt has no early exit — no single probe can confirm "first occurrence" — so the loop instead guarantees the answer never leaves [lo, hi] and stops at one survivor. Both are O(log n), so speed (choice 2) is not the difference, and swapping them blindly (choice 4) causes infinite loops or skipped final checks.',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt: 'A sorted array holds about 1,000,000 elements. Roughly how many probes does binary search need in the worst case?',
      choices: ['About 20', 'About 100', 'About 1,000', 'About 500,000'],
      correctIndex: 0,
      explanation:
        'Each probe halves the live range, so the worst case is ceil(log2(1,000,000)) ≈ 20 probes, since 2^20 = 1,048,576. The 500,000 figure is the average cost of a linear scan, and 1,000 is sqrt(n) — the right answer to a different (jump-search) question.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'An answer-space search tries candidate rates in [1, M], and each feasibility check costs O(n). What is the total time complexity?',
      choices: ['O(n * M)', 'O(log M)', 'O(n log M)', 'O(n + M)'],
      correctIndex: 2,
      explanation:
        'Binary search performs O(log M) probes of the answer range, and each probe pays the full O(n) feasibility check, giving O(n log M). O(n*M) is the brute force that tests every rate; O(log M) forgets that each probe does linear work; O(n + M) describes no phase of this algorithm.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'One machine must clear a list of work bins before a deadline of h hours. At rate r, bin b occupies ceil(b / r) whole hours. You need the minimum integer rate. Which approach is correct?',
      choices: [
        'Sort the bins in descending order and assign rates greedily from largest to smallest',
        'Binary search the rate over [1, max(bins)], running a linear sum-of-ceilings feasibility check at each probe',
        'Compute ceil(total_work / h) — that is always the answer',
        'Dynamic programming over (bin index, hours used) states',
      ],
      correctIndex: 1,
      explanation:
        'Feasibility is monotone in the rate, so the rates split into a too-slow prefix and a fast-enough suffix and the boundary is the answer — a textbook answer-space binary search. The tempting trap is choice 3: ceil(total/h) ignores the per-bin whole-hour rounding (bins [30,11,23,4,20] with h=5 gives ceil(88/5)=18, but one-hour-per-bin forces rate 30). Greedy ordering does nothing — one machine processes bins sequentially, so order never changes the total. DP over up to 10^9 hours is intractable.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'A CI pipeline has 4,096 sequential builds. Some unknown build introduced a breakage, and every build after it also fails. Each verification requires an expensive full test run. How do you find the first failing build with the fewest runs?',
      choices: [
        'Run the tests starting from build 4,096 and walk backwards until one passes',
        'Hash every build artifact into a set and look for the first digest mismatch',
        'Binary search the build range: test the midpoint; if it fails, the culprit is at or before it, otherwise strictly after it',
        'Test every 64th build, then linearly scan inside the failing gap',
      ],
      correctIndex: 2,
      explanation:
        '"Passes…passes…fails…fails" is a monotone predicate over build numbers, so binary search pinpoints the boundary in about 12 runs. The hash-set distractor is tempting because hashing feels like the fast-lookup tool, but artifact digests differ on every build regardless of test status — they carry no signal about the breakage. Walking backwards is O(n) runs, and the every-64th strategy is jump search: better than linear but still ~sqrt-flavored, strictly worse than log.',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt:
        'In a `while lo < hi` loop where one branch assigns `lo = mid` (with no +1), why must mid be computed as the ceiling `(lo + hi + 1) // 2`?',
      choices: [
        'To avoid integer overflow when lo and hi are large',
        'Because when hi == lo + 1, the floor midpoint equals lo, so `lo = mid` makes no progress and the loop spins forever; the ceiling guarantees the range shrinks',
        'Because the ceiling makes the search converge in half as many iterations',
        'Because Python floor division behaves differently for negative indices',
      ],
      correctIndex: 1,
      explanation:
        'On a two-element range [lo, lo+1], the floor midpoint is lo itself; if the branch taken is `lo = mid`, nothing changes and the loop never terminates. Rounding the midpoint up makes mid = hi there, so either branch strictly shrinks the range. Overflow (choice 1) is a real concern in fixed-width languages but is solved by `lo + (hi - lo) // 2`, not by the ceiling, and the iteration count (choice 3) is unchanged.',
    },
    {
      id: 'q8',
      kind: 'scenario',
      prompt:
        'Your rotated-minimum search passes every rotated test but returns the wrong element when the input was never actually rotated. Which bug is the most likely culprit?',
      choices: [
        'Comparing arr[mid] against arr[lo] and discarding the left half whenever arr[mid] is larger',
        'Using `while lo < hi` instead of `while lo <= hi`',
        'Computing mid with floor division instead of the ceiling',
        'The algorithm requires duplicate values to work, and the input had none',
      ],
      correctIndex: 0,
      explanation:
        'arr[mid] > arr[lo] is ambiguous: it holds when the minimum lies right of mid (discard left — correct) AND in a fully sorted array where the minimum is at lo itself (discard left — throws the answer away). Comparing against arr[hi] resolves both cases unambiguously, which is the canonical fix. The tempting distractor is choice 2, but lo < hi is exactly right for this boundary search; the floor midpoint is safe here because the discarding branch uses lo = mid + 1; and distinct values make the search easier, not harder.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'What is the real precondition for binary search (beyond "sorted array")?',
      back: 'A monotone predicate: the search space must split into a false-prefix and a true-suffix, so one probe identifies a discardable half. Sorted arrays are just the most familiar source of that stripe.',
    },
    {
      id: 'f2',
      front: 'When do you use the `while lo <= hi` template, and what does loop exit mean?',
      back: 'Exact-match search where a probe can finish the job and "not found" is possible. The inclusive range runs until empty; exiting the loop without a hit is the proof of absence — return -1.',
    },
    {
      id: 'f3',
      front: 'When do you use the `while lo < hi` template, and what is the move asymmetry?',
      back: 'Boundary hunts (first index where a predicate is true). A satisfying mid stays a candidate (hi = mid); a failing mid is discarded (lo = mid + 1). The loop converges to one survivor: the boundary.',
    },
    {
      id: 'f4',
      front: 'Recipe for binary search on the answer space?',
      back: 'Write a feasibility checker for a candidate answer, verify it is monotone (one "yes" forces all larger values to "yes"), then run the boundary template over the answer range [lo_answer, hi_answer] instead of array indices.',
    },
    {
      id: 'f5',
      front: 'First and last occurrence of a value in O(log n) — what is the one-helper trick?',
      back: 'Write lower_bound(x) = first index with value >= x. First occurrence is lower_bound(t) (verify it actually holds t); last occurrence is lower_bound(t + 1) - 1.',
    },
    {
      id: 'f6',
      front: 'Rotated sorted array minimum: which endpoint do you compare mid against, and why?',
      back: 'Compare arr[mid] with arr[hi]. Larger means the minimum is strictly right of mid; smaller means it is at mid or left. Comparing against arr[lo] is ambiguous when the array is not rotated and silently discards the answer.',
    },
    {
      id: 'f7',
      front: 'Pitfall: infinite loop in a `lo < hi` search. What causes it and what is the fix?',
      back: 'A branch that assigns lo = mid (no +1) stalls on a two-element range, because the floor midpoint equals lo. Fix: compute mid as the ceiling (lo + hi + 1) // 2 whenever a branch keeps lo = mid.',
    },
    {
      id: 'f8',
      front: 'Complexity of plain binary search and of answer-space search?',
      back: 'Plain: O(log n) time, O(1) space — about 20 probes per million elements. Answer-space: O(n log M), where M is the answer-range width and O(n) is the per-probe feasibility check.',
    },
    {
      id: 'f9',
      front: 'How do you compute an integer ceiling division in Python without floats, and why bother?',
      back: 'ceil(a / b) == (a + b - 1) // b. math.ceil(a / b) routes through a 53-bit float and can mis-round once operands approach 2^53 (answer ranges near 10^18); the integer form is exact at any size.',
    },
    {
      id: 'f10',
      front: 'Constraint smells that scream "binary search"?',
      back: 'Sorted input asking for a position; "minimize the maximum" / "maximize the minimum"; a cheap yes/no check for a candidate answer; or bounds like n up to 10^9 where only logarithmic probing can possibly fit the budget.',
    },
  ],
  cheatSheet: {
    tldr:
      'Binary search destroys half the remaining candidates per probe, but it needs a monotone predicate — a clean false…false…true…true stripe across the search space — not literally a sorted array. Use `while lo <= hi` for exact matches (run the inclusive range to empty, return -1 on exit), and `while lo < hi` for boundary hunts (keep a satisfying mid with hi = mid, discard a failing mid with lo = mid + 1, return the lone survivor). Point the boundary template at a range of candidate answers instead of indices and you get answer-space search: minimum speed, capacity, or threshold problems fall to a feasibility check plus O(log M) probes.',
    signals: [
      'Sorted (or rotated-sorted) data and you need a position: a target, an insertion point, a first/last occurrence.',
      'The problem says "minimize the maximum" or "maximize the minimum" — smallest rate, capacity, or threshold that still works.',
      'You can write a cheap yes/no feasibility check, and one "yes" forces every larger candidate to also be "yes".',
      'Constraints with n or answer ranges up to 10^9+ — only logarithmic probing fits the budget.',
    ],
    template: `# Boundary template: first index in [0, n) where pred(i) is True
lo, hi = 0, n                  # hi is EXCLUSIVE; n means "no such index"
while lo < hi:
    mid = (lo + hi) // 2
    if pred(mid):
        hi = mid               # mid satisfies — keep it as a candidate
    else:
        lo = mid + 1           # mid fails — it can never be the answer
# lo == hi is the boundary (validate before trusting!)

# Answer-space search: same loop, but lo/hi span candidate ANSWERS
# and pred(mid) is a feasibility check (must be monotone).

# Exact-match variant: while lo <= hi over an inclusive [lo, hi],
# return mid on a hit, lo = mid + 1 / hi = mid - 1 otherwise, -1 on exit.`,
    complexity: 'O(log n) per search, O(1) space; answer-space: O(n log M) with an O(n) feasibility check over an answer range of width M.',
  },
}

export default mod
