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
        # with integer math to stay exact for values up to 10^9.
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

Two details earn the "hard" tag. First, the feasibility check must respect the *whole-hour* rule — \`sum(bins) / r\` is tempting and wrong, because it lets one bin's leftover minutes spill into the next bin's hour. With \`bins = [30, 11, 23, 4, 20]\` and \`hours = 5\`, total work is 88 phones, and \`88 / 5 = 17.6\` suggests rate 18 — but five bins in five hours forces one hour per bin, so the true answer is 30. The per-bin ceiling is the entire problem. Second, \`(b + rate - 1) // rate\` computes the ceiling in pure integer arithmetic; \`math.ceil(b / rate)\` round-trips through a float and can mis-round near \`10^9\`.

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
      back: 'ceil(a / b) == (a + b - 1) // b. math.ceil(a / b) routes through a float and can mis-round for values near 10^9 and beyond; the integer form is always exact.',
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
