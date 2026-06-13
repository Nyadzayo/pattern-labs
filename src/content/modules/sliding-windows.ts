import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'sliding-windows',
  visualizer: 'sliding-window',
  concept: `## The mental model

Imagine a long strip of ticker tape and a stencil card with a rectangular slot cut into it. You lay the card on the tape and you can only see the few symbols framed by the slot. To inspect a different stretch of tape, you don't pick the card up and start reading from the beginning — you nudge it one symbol to the right. One new symbol enters your view, one old symbol leaves. Everything in the middle was already in view, so you don't pay for it again.

That nudge is the whole trick. A "window" is just a contiguous span \`[left, right]\` of the input, and the pattern is about updating an *aggregate* of that span (a sum, a count map, a max) incrementally as the boundaries move, instead of recomputing it from scratch for every candidate span. Brute force asks "what is the answer for every subarray?" and pays for each one in full. Sliding windows notice that neighboring subarrays overlap almost entirely and only charge you for the difference.

There are two flavors:

- **Fixed-size windows.** The slot has a fixed width \`k\`. Both edges move together, one step at a time. Classic for "best k consecutive readings" questions.
- **Variable-size windows.** The slot stretches like a caterpillar: the right edge inches forward eagerly, and whenever the window violates some constraint, the left edge scrunches forward until the window is legal again. Classic for "longest/shortest span such that ..." questions.

## Mechanics

For a fixed window, keep a running aggregate and apply the *add-one, drop-one* update:

\`\`\`python
def best_fixed_window(arr: list[int], k: int) -> int:
    window = sum(arr[:k])          # pay full price exactly once
    best = window
    for right in range(k, len(arr)):
        window += arr[right]       # new element enters on the right
        window -= arr[right - k]   # stale element leaves on the left
        best = max(best, window)
    return best
\`\`\`

For a variable window, the canonical shape is *grow, then shrink to restore the invariant, then record*:

\`\`\`python
def longest_valid(items, limit) -> int:
    left = 0
    best = 0
    state = {}                       # whatever summarizes the window cheaply
    for right, x in enumerate(items):
        absorb(state, x)             # window grows by one on the right
        while violates(state, limit):
            release(state, items[left])
            left += 1                # window shrinks from the left
        best = max(best, right - left + 1)
    return best
\`\`\`

The \`state\` is the heart of it: a running sum, a \`Counter\` of items in the window, a count of zeros — anything you can update in \`O(1)\` when one element enters or leaves. For *shortest*-window problems (cover some requirement), the logic flips: grow until the window becomes valid, then shrink while it *stays* valid, recording the best as you tighten.

## When to reach for it

Concrete signals that a problem wants a sliding window:

- The answer concerns a **contiguous** subarray or substring. (If "subsequence" appears, the window probably doesn't apply.)
- The wording is "longest / shortest / maximum / count of spans **such that** ⟨constraint⟩".
- The constraint is **monotone**: growing the window can only make a "too much" condition worse, and shrinking can only relieve it (at most K distinct, at most K zeros, sum ≥ target with non-negative values).
- You're processing a **stream** and only ever need a summary of the most recent elements.
- A brute force exists but it re-scans overlapping ranges — that overlap is the budget the window saves.

The monotonicity point deserves emphasis because it is the pattern's load-bearing wall. The two-pointer dance is only correct when moving \`left\` forward is *guaranteed* to push the window toward validity. With all-positive numbers, shrinking always lowers a sum, so "sum ≤ S" works beautifully. Throw negatives in and shrinking might *raise* the sum — the signal that tells you which pointer to move disappears, and you need a different tool (Kadane's algorithm, prefix sums with a sorted structure, etc.).

## Complexity

Both flavors run in \`O(n)\` time. The variable version looks like it has a nested loop, but the inner \`while\` advances \`left\`, and \`left\` only ever moves forward: each element is absorbed once and released once, so the total work across the whole run is at most \`2n\` pointer moves — amortized \`O(n)\`. Space is \`O(1)\` for scalar aggregates like sums, or \`O(k)\` / \`O(alphabet)\` when the state is a count map (a window constrained to at most K distinct keys never stores more than K + 1 of them). Compare that with the \`O(n*k)\` of recomputing every fixed window or the \`O(n^2)\` of trying every span, and the win is obvious.

## Common pitfalls

- **Window length is \`right - left + 1\`.** Dropping the \`+ 1\` is the single most popular off-by-one in this pattern.
- **Stale keys in count maps.** When a count drops to zero, delete the key — otherwise \`len(counts)\` no longer means "distinct items in window".
- **Wrong shrink trigger.** For *longest*-valid problems you shrink while the window is **invalid**; for *shortest*-covering problems you shrink while it is still **valid**. Mixing these up silently returns garbage.
- **Recording at the wrong moment.** Record after restoring the invariant (longest) or during the valid-shrink phase (shortest), not before.
- **Forcing the pattern where monotonicity fails.** Negative values, "exactly K" phrased directly, or non-contiguous requirements all need adaptations (e.g., \`exactly(K) = atMost(K) - atMost(K-1)\`) or a different pattern entirely.

Master the two skeletons and most window problems reduce to one design question: *what tiny piece of state lets me check the constraint in constant time?*`,
  realWorldUses: [
    {
      title: 'API rate limiting',
      description:
        'Gateways like Nginx, Envoy, and cloud API managers enforce "at most N requests per rolling 60 seconds" using sliding-window counters: as time advances, new requests enter the window and expired ones fall out, exactly the add-one/drop-one update.',
    },
    {
      title: 'TCP flow control',
      description:
        "TCP's sender literally maintains a sliding window of unacknowledged bytes in flight. The window's right edge advances as new segments are sent and the left edge slides forward as ACKs arrive, bounding memory and pacing the stream.",
    },
    {
      title: 'Streaming metrics and anomaly detection',
      description:
        'Monitoring pipelines (Prometheus-style rules, fraud detectors, ops dashboards) compute rolling averages, error rates, and percentiles over the last N samples incrementally, so each new data point costs O(1) instead of re-aggregating history.',
    },
  ],
  problems: [
    {
      id: 'solar-sprint',
      title: 'Solar Farm Sprint',
      difficulty: 'easy',
      statement: `You operate a small solar farm that logs its **net energy output every hour** as an integer in \`readings\`. Output can be negative: on frosty mornings the panels draw grid power to run their de-icing heaters.

A battery vendor wants to size a storage unit for your site, and asks one question: over any stretch of exactly \`k\` **consecutive** hours, what is the highest total net energy the farm has produced?

Write \`max_window_energy(readings, k)\` that returns the maximum sum over all windows of exactly \`k\` consecutive readings.

Return the sum as an integer. There is always at least one window because \`k <= len(readings)\` is guaranteed.`,
      examples: [
        {
          input: 'readings = [4, 2, 1, 7, 8, 1, 2, 8, 1, 0], k = 3',
          output: '16',
          explanation:
            'The 3-hour stretches [1, 7, 8] and [7, 8, 1] both total 16, the best of any 3 consecutive hours.',
        },
        {
          input: 'readings = [-3, -1, -4, -2], k = 2',
          output: '-4',
          explanation:
            'Every 2-hour stretch is negative; [-3, -1] = -4 is the least bad, so it is the maximum.',
        },
        {
          input: 'readings = [2, 3, 4], k = 3',
          output: '9',
          explanation: 'When k equals the array length there is exactly one window: the whole array.',
        },
      ],
      constraints: [
        '1 <= k <= len(readings) <= 100_000',
        '-10_000 <= readings[i] <= 10_000',
        'Return a single integer (the maximum window sum).',
      ],
      hints: [
        'Two neighboring k-hour windows share k - 1 readings. How much genuinely new information does sliding one step give you?',
        'Compute the sum of the first window once. For each later position, update that running sum in O(1) rather than re-adding k numbers.',
        'When the window advances to index right, the entering element is readings[right] and the leaving one is readings[right - k]. Add one, subtract the other, and track the best sum seen.',
      ],
      functionName: 'max_window_energy',
      starterCode: `def max_window_energy(readings: list[int], k: int) -> int:
    pass`,
      solution: {
        code: `def max_window_energy(readings: list[int], k: int) -> int:
    # Pay full price for the first window exactly once.
    window = sum(readings[:k])
    best = window

    # Slide the window one hour at a time across the rest of the log.
    for right in range(k, len(readings)):
        # One reading enters on the right, the stale one drops off the left.
        window += readings[right] - readings[right - k]
        # Track the best total seen so far.
        if window > best:
            best = window

    return best`,
        commentary: `This is the fixed-size window in its purest form.

A brute force would sum every one of the \`n - k + 1\` windows independently, costing \`O(n * k)\`. But two adjacent windows overlap in \`k - 1\` elements — re-adding those is pure waste. So the solution sums the first window once, then performs the *add-one, drop-one* update: when the right edge reaches index \`right\`, \`readings[right]\` enters and \`readings[right - k]\` leaves, and the running sum stays correct with two arithmetic operations.

The loop body is the whole algorithm: update the window sum, compare against \`best\`. Negative readings need no special handling — the maximum of all window sums is well-defined either way, which is why the all-negative test still works. Note that \`best\` is initialized to the first window's sum (not 0), so the function is correct even when every window is negative.`,
        complexity: 'Time O(n), Space O(1)',
      },
      testCases: [
        {
          input: [[4, 2, 1, 7, 8, 1, 2, 8, 1, 0], 3],
          expected: 16,
          label: 'mixed values',
        },
        {
          input: [[5], 1],
          expected: 5,
          label: 'single reading',
        },
        {
          input: [[1, 1, 1, 1], 2],
          expected: 2,
          label: 'all equal',
        },
        {
          input: [[-3, -1, -4, -2], 2],
          expected: -4,
          label: 'all negative',
        },
        {
          input: [[2, 3, 4], 3],
          expected: 9,
          label: 'k equals length',
        },
        {
          input: [[10, -2, 3, 1, 0, 20], 2],
          expected: 20,
          hidden: true,
        },
        {
          input: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4],
          expected: 34,
          hidden: true,
        },
        {
          input: [[0, 0, 0], 2],
          expected: 0,
          hidden: true,
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 643. Maximum Average Subarray I', note: 'same slide, averaged' },
        { name: 'LeetCode 1456. Maximum Number of Vowels in a Substring of Given Length' },
      ],
    },
    {
      id: 'unique-scan-streak',
      title: 'Unbroken Visitor Streak',
      difficulty: 'medium',
      statement: `A museum turnstile logs the **visitor ID** of every entry scan, in order, as a list of integers \`scans\`. Members can re-enter as often as they like, so the same ID may appear many times throughout the day.

The marketing team wants a quirky statistic for their annual report: the length of the **longest run of consecutive scans in which every visitor was distinct** — the longest stretch of the log where nobody walked through twice.

Write \`longest_unique_streak(scans)\` that returns that length as an integer. An empty log has a streak of 0.`,
      examples: [
        {
          input: 'scans = [1, 2, 3, 1, 2, 3, 4]',
          output: '4',
          explanation:
            'The final four scans [1, 2, 3, 4] are all distinct visitors; no longer repeat-free run exists.',
        },
        {
          input: 'scans = [5, 5, 5, 5]',
          output: '1',
          explanation: 'The same member kept re-entering, so any streak longer than one scan has a repeat.',
        },
        {
          input: 'scans = []',
          output: '0',
          explanation: 'No scans means no streak.',
        },
      ],
      constraints: [
        '0 <= len(scans) <= 100_000',
        '0 <= scans[i] <= 10**9',
        'Return a single integer (the length of the longest repeat-free run).',
      ],
      hints: [
        'When you extend a repeat-free run by one scan and it breaks, you do not have to restart from scratch — which part of the old run is still usable?',
        'Keep a window [left, right] that never contains a duplicate. When scans[right] already appears inside the window, move left forward until the older copy is excluded.',
        "Store each ID's most recent index in a dict. On a repeat, jump left directly to last_seen[id] + 1 (but never move it backward), then record right - left + 1.",
      ],
      functionName: 'longest_unique_streak',
      starterCode: `def longest_unique_streak(scans: list[int]) -> int:
    pass`,
      solution: {
        code: `def longest_unique_streak(scans: list[int]) -> int:
    last_seen = {}   # visitor ID -> index of its most recent scan
    left = 0         # left edge of the current repeat-free window
    best = 0

    for right, visitor in enumerate(scans):
        # If this visitor already appears INSIDE the window, the window
        # must start just past their previous scan to stay duplicate-free.
        if visitor in last_seen and last_seen[visitor] >= left:
            left = last_seen[visitor] + 1

        # Remember where we last saw this visitor.
        last_seen[visitor] = right

        # The window [left, right] is duplicate-free; record its length.
        best = max(best, right - left + 1)

    return best`,
        commentary: `The invariant is simple: \`[left, right]\` never contains a duplicate visitor.

Each new scan grows the window on the right. The only way the invariant can break is if the incoming visitor is *already inside* the window — and the \`last_seen\` dict answers that in \`O(1)\`. The guard \`last_seen[visitor] >= left\` matters: an ID may have been seen long ago, *before* the current window, in which case it is not actually a duplicate and \`left\` must not move (and certainly never backward).

Rather than crawling \`left\` forward one step at a time, we jump it directly past the previous occurrence — a small optimization the dict makes free. Then \`right - left + 1\` is the length of the longest repeat-free run ending exactly at \`right\`, and the answer is the max of those over all \`right\`.

Each index enters the window once and \`left\` only moves forward, so the whole scan is linear. The dict can hold one entry per distinct visitor, giving \`O(d)\` space.`,
        complexity: 'Time O(n), Space O(d) for d distinct IDs',
      },
      testCases: [
        {
          input: [[1, 2, 3, 1, 2, 3, 4]],
          expected: 4,
          label: 'repeats then fresh ID',
        },
        {
          input: [[]],
          expected: 0,
          label: 'empty log',
        },
        {
          input: [[7]],
          expected: 1,
          label: 'single scan',
        },
        {
          input: [[5, 5, 5, 5]],
          expected: 1,
          label: 'all identical',
        },
        {
          input: [[1, 2, 3, 4, 5]],
          expected: 5,
          label: 'all distinct',
        },
        {
          input: [[3, 3, 2, 1, 3, 2, 1, 4]],
          expected: 4,
          hidden: true,
        },
        {
          input: [[9, 8, 9, 8, 9]],
          expected: 2,
          hidden: true,
        },
        {
          input: [[4, 4, 4, 1]],
          expected: 2,
          hidden: true,
        },
      ],
      furtherPractice: [
        {
          name: 'LeetCode 3. Longest Substring Without Repeating Characters',
          note: 'string version of the same window',
        },
        { name: 'LeetCode 904. Fruit Into Baskets', note: 'at most 2 distinct instead of all distinct' },
      ],
    },
    {
      id: 'drone-stabilizer',
      title: 'Drone Flight Stabilizer',
      difficulty: 'medium',
      statement: `A delivery drone streams one telemetry flag per second: \`1\` means the second was flight-stable, \`0\` means a wobble was detected. The full flight is the list \`log\`.

For certification, the operator must report the **longest continuous stretch of stable flight**. Here's the wrinkle: ground control's post-processing software can retroactively smooth out **at most \`k\` wobble seconds** across the stretch it reports (each smoothed \`0\` counts as stable).

Write \`longest_stable_flight(log, k)\` that returns the length of the longest contiguous stretch of \`log\` containing **at most \`k\` zeros**. An empty log yields 0.`,
      examples: [
        {
          input: 'log = [1, 1, 0, 1, 1, 1, 0, 1], k = 1',
          output: '6',
          explanation:
            'Seconds 0 through 5 ([1, 1, 0, 1, 1, 1]) contain a single wobble, which the software can smooth, giving a certified stretch of 6 seconds.',
        },
        {
          input: 'log = [1, 0, 1, 1, 1, 0], k = 0',
          output: '3',
          explanation:
            'With no smoothing allowed, the answer is just the longest run of natural 1s: [1, 1, 1].',
        },
        {
          input: 'log = [0, 0, 0], k = 2',
          output: '2',
          explanation: 'Any 2 of the 3 wobbles can be smoothed, but a stretch of 3 would need all three.',
        },
      ],
      constraints: [
        '0 <= len(log) <= 100_000',
        'log[i] is 0 or 1',
        '0 <= k <= 100_000 (k may exceed len(log))',
        'Return a single integer (the maximum stretch length).',
      ],
      hints: [
        'Restate the goal without the story: find the longest contiguous window that contains at most k zeros.',
        'Grow a window rightward and keep a running count of zeros inside it. What should happen the moment that count exceeds k?',
        'When zeros > k, advance left (decrementing the count whenever a 0 falls out) until zeros <= k again. After that while-loop the window is valid, so record right - left + 1.',
      ],
      functionName: 'longest_stable_flight',
      starterCode: `def longest_stable_flight(log: list[int], k: int) -> int:
    pass`,
      solution: {
        code: `def longest_stable_flight(log: list[int], k: int) -> int:
    left = 0    # left edge of the current window
    zeros = 0   # wobble seconds currently inside the window
    best = 0

    for right, flag in enumerate(log):
        # Absorb the new second into the window.
        if flag == 0:
            zeros += 1

        # Invariant restoration: a valid window holds at most k zeros.
        # Shrink from the left until that is true again.
        while zeros > k:
            if log[left] == 0:
                zeros -= 1
            left += 1

        # Window is valid here; it is the widest valid window ending at right.
        best = max(best, right - left + 1)

    return best`,
        commentary: `Strip away the drone story and this is the canonical *longest window under a budget* problem: maximize \`right - left + 1\` subject to "zeros in window <= k".

The key observation is monotonicity. Adding a second to the window can only keep the zero-count the same or raise it; removing one can only keep it or lower it. That means the moment the budget is blown (\`zeros > k\`), shrinking from the left is guaranteed to eventually fix it — so the inner \`while\` always terminates with a valid window, and we never need to consider re-expanding leftward.

The single counter \`zeros\` is the entire window state; checking validity is one comparison. After the shrink loop, the window is not just valid but the *widest* valid window ending at \`right\` (we stopped shrinking the instant it became legal), so taking the max over every \`right\` covers all candidates.

\`k = 0\` needs no special case — the while-loop simply forbids any zero in the window, degrading gracefully to "longest run of 1s". Each element enters once and leaves at most once, so despite the nested loop the time is linear.`,
        complexity: 'Time O(n), Space O(1)',
      },
      testCases: [
        {
          input: [[1, 1, 0, 1, 1, 1, 0, 1], 1],
          expected: 6,
          label: 'one smoothing pass',
        },
        {
          input: [[1, 0, 1, 1, 1, 0], 0],
          expected: 3,
          label: 'no smoothing allowed',
        },
        {
          input: [[0, 0, 0], 2],
          expected: 2,
          label: 'all wobbles',
        },
        {
          input: [[1, 1, 1, 1], 2],
          expected: 4,
          label: 'already perfect',
        },
        {
          input: [[], 3],
          expected: 0,
          label: 'empty log',
        },
        {
          input: [[0, 1, 1, 0, 1, 1, 1, 0, 1, 1], 2],
          expected: 9,
          hidden: true,
        },
        {
          input: [[0, 0, 1, 0], 5],
          expected: 4,
          hidden: true,
        },
        {
          input: [[1], 0],
          expected: 1,
          hidden: true,
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 1004. Max Consecutive Ones III', note: 'classic version' },
        { name: 'LeetCode 424. Longest Repeating Character Replacement', note: 'same budget idea, 26 letters' },
      ],
    },
    {
      id: 'shelf-sweep',
      title: 'Smallest Shelf Sweep',
      difficulty: 'hard',
      statement: `A warehouse picker walks a single long aisle. The shelf is described by the string \`shelf\`, where each character is a one-letter product code, in physical order. A customer order is the string \`order\`: the picker must collect **every character of \`order\`, with multiplicity** (if \`order\` contains \`"a"\` twice, two separate \`a\` slots are needed).

To minimize walking, the picker wants the **shortest contiguous span** of the shelf that contains all required codes. Extra products inside the span are fine — they just get skipped.

Write \`shortest_full_cart(shelf, order)\` that returns that shortest span **as a substring of \`shelf\`**. If several spans tie for shortest, return the **leftmost** one. If no span of the shelf can satisfy the order, return the empty string \`""\`.

Codes are case-sensitive letters.`,
      examples: [
        {
          input: 'shelf = "xaybzabc", order = "abc"',
          output: '"abc"',
          explanation:
            'The last three slots contain exactly a, b, c — a span of length 3. No shorter span covers the order.',
        },
        {
          input: 'shelf = "bbacba", order = "ab"',
          output: '"ba"',
          explanation:
            'Both "ba" (indices 1–2) and "ba" (indices 4–5) have length 2; the leftmost one, starting at index 1, wins.',
        },
        {
          input: 'shelf = "aabbcc", order = "abb"',
          output: '"abb"',
          explanation:
            'The order needs one a and two b’s. The span at indices 1–3 is the shortest containing that multiset.',
        },
        {
          input: 'shelf = "aab", order = "ax"',
          output: '""',
          explanation: 'The shelf has no "x" anywhere, so no span can satisfy the order.',
        },
      ],
      constraints: [
        '0 <= len(shelf) <= 100_000',
        '1 <= len(order) <= 10_000',
        'shelf and order consist of letters a-z and A-Z (case-sensitive)',
        'Return the leftmost shortest qualifying substring of shelf, or "" if none exists.',
      ],
      hints: [
        'Notice that once a span covers the order, any extension of it still covers it — what does that property let you avoid checking?',
        'Grow a window rightward until it first covers everything, then give back from the left. Track coverage with a needs counter (from order) plus a single number `missing` = how many required characters (counted with multiplicity) the window still lacks; entering characters decrement it only while their need is positive.',
        'Each time `missing` hits 0, shrink from the left while the window stays covering, recording any strictly shorter window. Strict improvement (<, not <=) is exactly what preserves the leftmost-on-tie rule.',
      ],
      functionName: 'shortest_full_cart',
      starterCode: `def shortest_full_cart(shelf: str, order: str) -> str:
    pass`,
      solution: {
        code: `from collections import Counter

def shortest_full_cart(shelf: str, order: str) -> str:
    # Quick impossibility checks.
    if not shelf or len(order) > len(shelf):
        return ""

    need = Counter(order)     # how many of each code the window still lacks
    missing = len(order)      # total required characters not yet in window
    best_len = len(shelf) + 1 # sentinel: longer than any real span
    best_start = 0

    left = 0
    for right, code in enumerate(shelf):
        # Absorb shelf[right]. It only helps if this code is still needed.
        if need[code] > 0:
            missing -= 1
        need[code] -= 1       # may go negative: surplus copies in window

        # Once the window covers the whole order, tighten from the left.
        while missing == 0:
            # Record strictly shorter windows only -> leftmost wins ties.
            if right - left + 1 < best_len:
                best_len = right - left + 1
                best_start = left

            # Give back shelf[left]; if it was a needed copy, coverage breaks.
            need[shelf[left]] += 1
            if need[shelf[left]] > 0:
                missing += 1
            left += 1

    return shelf[best_start:best_start + best_len] if best_len <= len(shelf) else ""`,
        commentary: `This is the *minimum covering window*: the shrink condition is inverted relative to "longest" problems. We grow until the window first becomes valid, then shrink **while it stays valid**, recording candidates as we tighten.

Two pieces of state make the validity check \`O(1)\`:

- \`need\`, a counter seeded from \`order\`. Positive entries mean "still required"; entries can go negative, meaning the window holds surplus copies of that code.
- \`missing\`, the total number of required characters (with multiplicity) not yet in the window. The window covers the order exactly when \`missing == 0\` — no scan over the counter needed.

The subtle lines are the paired updates. On absorb, we decrement \`missing\` only when \`need[code] > 0\` (a surplus copy does not reduce what is missing). On release, we increment \`missing\` only when the count climbs back above zero (giving back a surplus copy costs nothing).

The tie-break falls out of the strict \`<\` comparison. Windows are discovered in order of their right endpoint, and a leftmost shortest window necessarily has the smallest right endpoint among shortest windows — so it is recorded first, and later windows of equal length cannot displace it.

Each character of \`shelf\` is absorbed once and released at most once, so the scan is \`O(n)\` with \`O(u)\` space for the counter (u = distinct codes, bounded by the alphabet).`,
        complexity: 'Time O(n + m), Space O(u) — n = len(shelf), m = len(order), u = distinct codes',
      },
      testCases: [
        {
          input: ['xaybzabc', 'abc'],
          expected: 'abc',
          label: 'tight span at the end',
        },
        {
          input: ['bbacba', 'ab'],
          expected: 'ba',
          label: 'leftmost of equal lengths',
        },
        {
          input: ['aabbcc', 'abb'],
          expected: 'abb',
          label: 'multiplicity required',
        },
        {
          input: ['xyz', 'zyx'],
          expected: 'xyz',
          label: 'whole shelf needed',
        },
        {
          input: ['aab', 'ax'],
          expected: '',
          label: 'impossible order',
        },
        {
          input: ['baXab', 'ab'],
          expected: 'ba',
          hidden: true,
        },
        {
          input: ['aaabbb', 'aabb'],
          expected: 'aabb',
          hidden: true,
        },
        {
          input: ['', 'a'],
          expected: '',
          hidden: true,
        },
        {
          input: ['thequickbrownfox', 'onw'],
          expected: 'own',
          hidden: true,
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 76. Minimum Window Substring', note: 'classic version' },
        { name: 'LeetCode 209. Minimum Size Subarray Sum', note: 'numeric covering window' },
      ],
    },
    {
      id: 'packed-classes',
      title: 'Packed Class Stretches',
      difficulty: 'easy',
      statement: `A gym tracks how many members showed up to its sunrise spin class each day, as a list of integers \`attendance\` in calendar order. Management renews an instructor's prime-time slot based on sustained demand, not one-off spikes, so they judge whole scheduling blocks at a time.

Write \`count_packed_stretches(attendance, k, threshold)\` that returns the number of stretches of **exactly \`k\` consecutive days** whose **average attendance is at least \`threshold\`**.

Count every qualifying window position; different stretches may overlap.`,
      examples: [
        {
          input: 'attendance = [12, 8, 10, 11, 4, 9], k = 3, threshold = 10',
          output: '1',
          explanation:
            'Only the first stretch [12, 8, 10] averages 10 (sum 30, needing 30). The later windows sum to 29, 25, and 24 — all short.',
        },
        {
          input: 'attendance = [5, 5, 5], k = 1, threshold = 5',
          output: '3',
          explanation: 'With k = 1 every single day is its own stretch, and each one hits the average exactly.',
        },
        {
          input: 'attendance = [2, 3], k = 2, threshold = 4',
          output: '0',
          explanation: 'The only window sums to 5, but an average of 4 over 2 days needs a sum of at least 8.',
        },
      ],
      constraints: [
        '1 <= k <= len(attendance) <= 100_000',
        '0 <= attendance[i] <= 10_000',
        '0 <= threshold <= 10_000',
        'Return a single integer (the number of qualifying windows).',
      ],
      hints: [
        'Every stretch being judged has exactly the same width. What does that mean for comparing their averages with each other — and with the threshold?',
        'Average >= threshold over k days is exactly the same test as sum >= threshold * k — an all-integer comparison with no division and no float rounding to worry about.',
        'Sum the first k days once, then slide: add the day entering on the right, subtract the day leaving on the left, and count every position where the running sum reaches threshold * k.',
      ],
      functionName: 'count_packed_stretches',
      starterCode: `def count_packed_stretches(attendance: list[int], k: int, threshold: int) -> int:
    pass`,
      solution: {
        code: `def count_packed_stretches(attendance: list[int], k: int, threshold: int) -> int:
    # Same-width windows mean "average >= threshold" is just
    # "sum >= threshold * k": one integer target, no division, no floats.
    target = threshold * k

    # Pay full price for the first window exactly once.
    window = sum(attendance[:k])
    count = 1 if window >= target else 0

    # Slide: one day enters on the right, the stale day leaves on the left.
    for right in range(k, len(attendance)):
        window += attendance[right] - attendance[right - k]
        if window >= target:
            count += 1

    return count`,
        commentary: `The average is a decoy. Because every window has the same width \`k\`, comparing averages against \`threshold\` is identical to comparing sums against \`threshold * k\` — and the sum is what a sliding window maintains for free. Doing the algebra up front sidesteps division entirely, which matters in Python less for speed than for correctness habits: integer comparisons can never suffer float rounding at the boundary (a window summing to exactly \`threshold * k\` must count).

From there it is the plain fixed-size machinery: sum the first \`k\` days once (\`O(k)\`), then each slide is the *add-one, drop-one* update — \`attendance[right]\` enters, \`attendance[right - k]\` leaves — followed by a single comparison. The only difference from a "best window" problem is the bookkeeping: instead of tracking a maximum we increment a counter every time the test passes, which is why overlapping stretches are all counted naturally.

A zero threshold needs no special case: the target becomes 0 and every window (sums are non-negative here) qualifies, which is the correct reading of "average at least 0".`,
        complexity: 'Time O(n), Space O(1)',
      },
      testCases: [
        {
          input: [[12, 8, 10, 11, 4, 9], 3, 10],
          expected: 1,
          label: 'one packed block',
        },
        {
          input: [[5, 5, 5], 1, 5],
          expected: 3,
          label: 'every day qualifies',
        },
        {
          input: [[2, 3], 2, 4],
          expected: 0,
          label: 'just under the bar',
        },
        {
          input: [[10, 10, 10, 10], 2, 10],
          expected: 3,
          label: 'borderline averages count',
        },
        {
          input: [[4, 4, 4, 4, 4], 5, 4],
          expected: 1,
          label: 'k equals length',
        },
        {
          input: [[0, 0, 0], 2, 0],
          expected: 2,
          hidden: true,
        },
        {
          input: [[1, 2, 3, 4, 5, 6], 2, 4],
          expected: 2,
          hidden: true,
        },
        {
          input: [[7], 1, 8],
          expected: 0,
          hidden: true,
        },
      ],
      furtherPractice: [
        {
          name: 'LeetCode 1343. Number of Sub-arrays of Size K and Average Greater than or Equal to Threshold',
          note: 'classic version',
        },
        { name: 'LeetCode 2090. K Radius Subarray Averages', note: 'centered fixed windows' },
      ],
    },
    {
      id: 'pledge-surge',
      title: 'Shortest Pledge Surge',
      difficulty: 'medium',
      statement: `A charity telethon logs every pledge as it arrives: \`donations\` is the list of amounts, in order, and every amount is **strictly positive**. After the broadcast, the producers want to spotlight the night's most electric moment — the burst of generosity that cleared a milestone fastest.

Write \`shortest_pledge_run(donations, goal)\` that returns the length of the **shortest run of consecutive pledges whose total is at least \`goal\`**. If no run of pledges — not even the entire night — reaches the goal, return \`0\`.`,
      examples: [
        {
          input: 'donations = [2, 3, 1, 2, 4, 3], goal = 7',
          output: '2',
          explanation:
            'The back-to-back pledges [4, 3] total 7. No single pledge reaches the goal, so 2 is the minimum.',
        },
        {
          input: 'donations = [15], goal = 8',
          output: '1',
          explanation: 'One generous pledge clears the goal on its own.',
        },
        {
          input: 'donations = [1, 1, 1, 1], goal = 10',
          output: '0',
          explanation: 'All four pledges together total only 4, so no run can ever reach 10.',
        },
      ],
      constraints: [
        '0 <= len(donations) <= 100_000',
        '1 <= donations[i] <= 10**6 (every pledge is strictly positive)',
        '1 <= goal <= 10**9',
        'Return a single integer (the shortest qualifying run length, or 0 if none exists).',
      ],
      hints: [
        "Every pledge is strictly positive. What is guaranteed to happen to a run's total when you extend it by one pledge — and when you trim its oldest pledge?",
        'Grow a window to the right while accumulating its sum. The first time the sum reaches the goal you have a candidate — but a shorter run might end at the same pledge.',
        'While the window total is still >= goal, record right - left + 1 and subtract donations[left] as you advance left. Positivity guarantees the total only falls as you trim, so the loop always stops just below the goal.',
      ],
      functionName: 'shortest_pledge_run',
      starterCode: `def shortest_pledge_run(donations: list[int], goal: int) -> int:
    pass`,
      solution: {
        code: `def shortest_pledge_run(donations: list[int], goal: int) -> int:
    left = 0
    total = 0                      # sum of the current window of pledges
    best = len(donations) + 1      # sentinel: longer than any real run

    for right, amount in enumerate(donations):
        # Absorb the newest pledge into the window.
        total += amount

        # While the window still meets the goal it is a candidate:
        # record it, then trim from the left hunting for something shorter.
        while total >= goal:
            length = right - left + 1
            if length < best:
                best = length
            total -= donations[left]
            left += 1

    # If the sentinel survived, no run ever reached the goal.
    return best if best <= len(donations) else 0`,
        commentary: `This is the *shortest covering window*, the mirror image of "longest valid" problems — and mixing up the two shrink rules is the classic way to get it wrong. For longest-valid you shrink while the window is **broken**; here the window becomes interesting precisely when it is **valid** (total >= goal), so you record and shrink *while it stays valid*, squeezing out every shorter candidate that ends at the same right edge.

Strict positivity is the load-bearing assumption. Extending the window can only raise the total and trimming can only lower it, so "total >= goal" is monotone in the window: once the shrink loop drops below the goal there is no point trying further left starts for this right edge, and the abandoned prefixes never need revisiting. Allow zero or negative pledges and that one-way guarantee evaporates — trimming might *raise* the total — which is why the harder variant of this problem needs prefix sums and a monotonic deque instead.

The sentinel \`len(donations) + 1\` doubles as the "not found" flag: no real run can be that long, so if it survives the scan the function returns 0 without a separate found-flag. As always, \`left\` only moves forward, so despite the nested loop every pledge is absorbed once and released at most once — amortized \`O(n)\`.`,
        complexity: 'Time O(n), Space O(1)',
      },
      testCases: [
        {
          input: [[2, 3, 1, 2, 4, 3], 7],
          expected: 2,
          label: 'pair beats the goal',
        },
        {
          input: [[15], 8],
          expected: 1,
          label: 'single pledge suffices',
        },
        {
          input: [[1, 1, 1, 1], 10],
          expected: 0,
          label: 'goal unreachable',
        },
        {
          input: [[5, 1, 3, 5, 10, 7, 4, 9, 2, 8], 15],
          expected: 2,
          label: 'surge buried mid-stream',
        },
        {
          input: [[], 5],
          expected: 0,
          label: 'no pledges at all',
        },
        {
          input: [[1, 2, 3, 4, 5], 15],
          expected: 5,
          hidden: true,
        },
        {
          input: [[1, 2, 3, 4, 5], 16],
          expected: 0,
          hidden: true,
        },
        {
          input: [[3, 3, 3, 3], 3],
          expected: 1,
          hidden: true,
        },
        {
          input: [[1, 4, 4], 8],
          expected: 2,
          hidden: true,
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 209. Minimum Size Subarray Sum', note: 'classic version' },
        {
          name: 'LeetCode 862. Shortest Subarray with Sum at Least K',
          note: 'negatives allowed — the plain window breaks; a deque fixes it',
        },
      ],
    },
    {
      id: 'riff-shuffle',
      title: 'Shuffled Riff Detector',
      difficulty: 'medium',
      statement: `A music-transcription plugin renders a long studio take as the string \`melody\`, one lowercase letter per note, in playing order. The bandleader suspects the session guitarist kept sneaking the band's signature lick into the take — disguised by reshuffling its notes.

A stretch of the take **quotes** the lick when it has the same length as the string \`riff\` and uses **exactly the same notes with the same multiplicities**, in any order.

Write \`count_shuffled_riffs(melody, riff)\` that returns the number of starting positions in \`melody\` where a quoting stretch begins. Overlapping stretches all count.`,
      examples: [
        {
          input: 'melody = "abab", riff = "ab"',
          output: '3',
          explanation: 'The windows "ab", "ba", and "ab" (starting at 0, 1, and 2) each use one a and one b.',
        },
        {
          input: 'melody = "cbaebabacd", riff = "abc"',
          output: '2',
          explanation: 'The stretches starting at index 0 ("cba") and index 6 ("bac") both reshuffle a, b, c.',
        },
        {
          input: 'melody = "aaa", riff = "aa"',
          output: '2',
          explanation:
            'Both length-2 windows are "aa". A note repeated in the riff must appear the same number of times in the window.',
        },
        {
          input: 'melody = "abc", riff = "abcd"',
          output: '0',
          explanation: 'The riff is longer than the entire take, so nothing can quote it.',
        },
      ],
      constraints: [
        '0 <= len(melody) <= 100_000',
        '1 <= len(riff) <= 10_000',
        'melody and riff consist of lowercase letters a-z',
        'Return a single integer (the number of quoting start positions).',
      ],
      hints: [
        'Two stretches of the same length starting one note apart share almost all of their notes. How much actually changes between them?',
        "Keep note counts for a fixed window of len(riff) characters and compare them against the riff's counts. Sliding the window updates exactly two letters: the one entering and the one leaving.",
        'Comparing whole count maps every step wastes work. Track off = how many letters currently mismatch their required count, adjusting it just before and just after each single-letter update; the window quotes the riff exactly when off == 0.',
      ],
      functionName: 'count_shuffled_riffs',
      starterCode: `def count_shuffled_riffs(melody: str, riff: str) -> int:
    pass`,
      solution: {
        code: `from collections import Counter

def count_shuffled_riffs(melody: str, riff: str) -> int:
    k = len(riff)
    if k == 0 or k > len(melody):
        return 0

    need = Counter(riff)            # note -> count the riff requires
    window = Counter(melody[:k])    # note -> count inside the first window

    # off = number of distinct letters whose window count != required count.
    off = sum(1 for c in set(need) | set(window) if window[c] != need[c])

    count = 1 if off == 0 else 0

    for right in range(k, len(melody)):
        # One note enters on the right ...
        enter = melody[right]
        if window[enter] == need[enter]:
            off += 1                # this letter was matched; it drifts now
        window[enter] += 1
        if window[enter] == need[enter]:
            off -= 1                # it drifted INTO a match instead

        # ... and the stale note drops off the left.
        leave = melody[right - k]
        if window[leave] == need[leave]:
            off += 1
        window[leave] -= 1
        if window[leave] == need[leave]:
            off -= 1

        # The window quotes the riff exactly when no letter mismatches.
        if off == 0:
            count += 1

    return count`,
        commentary: `Two stretches "use the same notes with the same multiplicities" exactly when their count maps are equal — so the problem is really *count the fixed-size windows whose Counter equals the riff's Counter*. The window has a fixed width (\`len(riff)\`), so both edges march together and each slide touches precisely two letters.

The naive check — rebuild or fully compare the maps each step — costs \`O(26)\` per slide. Correct, but the elegant trick is the \`off\` tally: the number of letters whose window count currently disagrees with the required count. A single-letter update can only change *that letter's* agreement, so we adjust \`off\` with the bracketing pattern: if the letter was matched before the update it is about to drift (\`off += 1\`); if it lands matched after the update it just got fixed (\`off -= 1\`). All other letters are untouched. The whole-window test collapses to \`off == 0\`, a genuine \`O(1)\` per slide.

One subtlety makes \`Counter\` the right container: missing keys read as 0 without being inserted, so "the window holds zero of this letter" and "the riff requires zero of this letter" compare equal automatically — surplus letters that drain back to zero never need deleting for the comparison to stay honest (contrast with distinct-count problems, where stale zero keys are a bug).`,
        complexity: 'Time O(n + m), Space O(1) — counts bounded by the 26-letter alphabet',
      },
      testCases: [
        {
          input: ['abab', 'ab'],
          expected: 3,
          label: 'overlapping quotes',
        },
        {
          input: ['cbaebabacd', 'abc'],
          expected: 2,
          label: 'two scattered quotes',
        },
        {
          input: ['aaa', 'aa'],
          expected: 2,
          label: 'repeated note in riff',
        },
        {
          input: ['abc', 'abcd'],
          expected: 0,
          label: 'riff longer than take',
        },
        {
          input: ['xyz', 'zyx'],
          expected: 1,
          label: 'whole take is the quote',
        },
        {
          input: ['', 'a'],
          expected: 0,
          hidden: true,
        },
        {
          input: ['abcabcabc', 'abc'],
          expected: 7,
          hidden: true,
        },
        {
          input: ['aabbcc', 'abc'],
          expected: 0,
          hidden: true,
        },
        {
          input: ['bbaca', 'ab'],
          expected: 1,
          hidden: true,
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 438. Find All Anagrams in a String', note: 'classic version (returns indices)' },
        { name: 'LeetCode 567. Permutation in String', note: 'existence instead of counting' },
      ],
    },
    {
      id: 'feeder-watch',
      title: 'Feeder Watch Variety Report',
      difficulty: 'medium',
      statement: `A birdwatcher's smart feeder camera identifies each visiting bird and appends its **species ID** (an integer) to the list \`sightings\`, in the order the visits happened. For a community-science dashboard, the watcher wants a rolling diversity report: for **every** window of \`k\` consecutive sightings, how many **distinct species** appeared in it?

Write \`daily_variety_series(sightings, k)\` that returns a list with one integer per window — its distinct-species count — **ordered from the earliest window to the latest** (the window starting at index 0 comes first). If \`k\` exceeds the number of sightings, return an empty list.`,
      examples: [
        {
          input: 'sightings = [1, 2, 1, 3, 2], k = 3',
          output: '[2, 3, 3]',
          explanation: 'Window [1, 2, 1] holds 2 distinct species; [2, 1, 3] and [1, 3, 2] each hold 3.',
        },
        {
          input: 'sightings = [4, 4, 4], k = 2',
          output: '[1, 1]',
          explanation: 'The same bird kept returning; both windows contain a single species.',
        },
        {
          input: 'sightings = [7, 8], k = 5',
          output: '[]',
          explanation: 'No window of 5 sightings exists in a log of 2.',
        },
      ],
      constraints: [
        '1 <= k <= 100_000',
        '0 <= len(sightings) <= 100_000',
        '0 <= sightings[i] <= 10**9',
        'Return a list of len(sightings) - k + 1 integers ordered by window start (empty if k > len(sightings)).',
      ],
      hints: [
        'Two consecutive windows disagree about only two sightings. Is a fresh scan of all k entries really necessary for every line of the report?',
        'Maintain a dict mapping species -> how many times it appears in the current window; each report value is simply the size of that dict after the window moves.',
        "When a departing species' count reaches zero, delete its key — a lingering zero-count entry makes len(counts) over-report diversity. Append len(counts) once per slide.",
      ],
      functionName: 'daily_variety_series',
      starterCode: `def daily_variety_series(sightings: list[int], k: int) -> list[int]:
    pass`,
      solution: {
        code: `def daily_variety_series(sightings: list[int], k: int) -> list[int]:
    n = len(sightings)
    if k > n:
        return []

    counts = {}      # species ID -> occurrences inside the current window
    series = []

    # Pay full price for the first window exactly once.
    for i in range(k):
        counts[sightings[i]] = counts.get(sightings[i], 0) + 1
    series.append(len(counts))

    # Slide: one sighting enters on the right, one leaves on the left.
    for right in range(k, n):
        enter = sightings[right]
        counts[enter] = counts.get(enter, 0) + 1

        leave = sightings[right - k]
        counts[leave] -= 1
        if counts[leave] == 0:
            del counts[leave]    # critical: len(counts) must mean "distinct"

        series.append(len(counts))

    return series`,
        commentary: `Most window problems distill the scan into a single best value; this one asks for the **entire series** — one answer per window position. That changes nothing about the engine and everything about the framing: the fixed-size window is a machine that, after each one-step slide, can emit *any* O(1)-readable property of its state. Here that property is \`len(counts)\`.

Recomputing distinct counts per window costs \`O(n * k)\`. The incremental version exploits that adjacent windows differ by exactly two sightings: the entering ID's count rises (possibly creating a key — diversity up), the leaving ID's count falls (possibly hitting zero — diversity down). Every other species is untouched, so the dict's size stays truthful without a scan.

The one trap is the zero-count key. \`counts[leave] -= 1\` leaving a 0 behind keeps the key in the dict, and \`len(counts)\` silently over-reports from then on — the bug compounds with every eviction and no test on small inputs with all-distinct species will ever catch it. Deleting on zero is what makes "size of the map" and "distinct species in window" the same number.

Output order is fully determined: one value per window, earliest start first, so the result is reproducible without any tie-breaking rules. Time is \`O(n)\` (each sighting enters and leaves the dict once); the dict never holds more than \`k\` keys.`,
        complexity: 'Time O(n), Space O(k)',
      },
      testCases: [
        {
          input: [[1, 2, 1, 3, 2], 3],
          expected: [2, 3, 3],
          label: 'mixed flock',
        },
        {
          input: [[4, 4, 4], 2],
          expected: [1, 1],
          label: 'one regular visitor',
        },
        {
          input: [[7, 8], 5],
          expected: [],
          label: 'window wider than log',
        },
        {
          input: [[1, 2, 3, 4], 1],
          expected: [1, 1, 1, 1],
          label: 'k = 1',
        },
        {
          input: [[5, 5, 1, 5, 5], 4],
          expected: [2, 2],
          label: 'rare visitor mid-log',
        },
        {
          input: [[9], 1],
          expected: [1],
          hidden: true,
        },
        {
          input: [[2, 2, 3, 3, 2, 2], 3],
          expected: [2, 2, 2, 2],
          hidden: true,
        },
        {
          input: [[1, 2, 3, 1, 2, 3, 4], 7],
          expected: [4],
          hidden: true,
        },
        {
          input: [[], 1],
          expected: [],
          hidden: true,
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 1852. Distinct Numbers in Each Subarray', note: 'classic version' },
        {
          name: 'LeetCode 992. Subarrays with K Different Integers',
          note: 'distinct counts meet the exactly-K trick',
        },
      ],
    },
    {
      id: 'loom-band',
      title: 'Longest Loom Band',
      difficulty: 'hard',
      statement: `A weaving studio finishes each scarf with a decorative top row described by the string \`row\`: one uppercase letter per yarn segment, naming its color. A client wants the longest possible **solid-color band** — a contiguous run of segments all showing one color.

The finisher can over-dye at most \`k\` segments in total (an over-dyed segment can become any color), and only segments inside the chosen band are worth dyeing.

Write \`longest_solid_band(row, k)\` that returns the length of the longest contiguous stretch of \`row\` that can be made single-colored using at most \`k\` over-dyes.`,
      examples: [
        {
          input: 'row = "ABAB", k = 2',
          output: '4',
          explanation: 'Over-dye both B segments (or both A segments) and the whole row becomes one color.',
        },
        {
          input: 'row = "AABABBA", k = 1',
          output: '4',
          explanation:
            'Within "AABA" (segments 0–3) only the lone B needs dyeing. No 5-segment stretch can be fixed with a single dye.',
        },
        {
          input: 'row = "ABCDE", k = 1',
          output: '2',
          explanation:
            'Any two adjacent segments work: dye one to match the other. Three segments of three different colors would need two dyes.',
        },
        {
          input: 'row = "AAAA", k = 0',
          output: '4',
          explanation: 'The row is already solid; no dye is needed.',
        },
      ],
      constraints: [
        '0 <= len(row) <= 100_000',
        'row consists of uppercase letters A-Z',
        '0 <= k <= 100_000',
        'Return a single integer (the maximum achievable band length).',
      ],
      hints: [
        'Pick any candidate band. If you had to make it solid with the fewest possible dyes, which of its segments would you obviously leave untouched?',
        'A band is fixable exactly when (band length - count of its most common color) <= k. Keep per-color counts in a window and slide the left edge forward whenever the window stops being fixable.',
        'You never need to recompute the dominant count when the window shrinks: a stale (historical) maximum only makes the check conservative, never permissive, and the answer can only improve when a genuinely higher dominant count appears. Track max_freq monotonically and record right - left + 1 each step.',
      ],
      functionName: 'longest_solid_band',
      starterCode: `def longest_solid_band(row: str, k: int) -> int:
    pass`,
      solution: {
        code: `def longest_solid_band(row: str, k: int) -> int:
    counts = {}     # color -> occurrences inside the current window
    left = 0
    best = 0
    max_freq = 0    # highest single-color count seen in ANY window so far

    for right, color in enumerate(row):
        # Absorb the new segment.
        counts[color] = counts.get(color, 0) + 1
        if counts[color] > max_freq:
            max_freq = counts[color]

        # Dyes needed = segments NOT of the dominant color. If even the
        # (possibly stale) dominant count cannot justify this width, slide.
        while (right - left + 1) - max_freq > k:
            counts[row[left]] -= 1
            left += 1
            # max_freq is deliberately NOT recomputed here — see commentary.

        # The window width here never exceeds a width some real window earned.
        best = max(best, right - left + 1)

    return best`,
        commentary: `The greedy core: to make a band solid you keep its most common color and dye everything else, so a band of width \`w\` whose dominant color appears \`f\` times needs \`w - f\` dyes. The window invariant is therefore \`(right - left + 1) - max_freq <= k\`.

Maintaining \`max_freq\` *exactly* is the expensive part — when the dominant color's count drops on a shrink, finding the new maximum means scanning all 26 counts. The hard-won insight of this problem is that you may simply **not bother**. Let \`max_freq\` be the highest single-color count ever observed in any window (it only ratchets up). Two facts make this safe:

1. **No false positives that matter.** A stale, too-large \`max_freq\` makes \`w - max_freq\` an *underestimate* of dyes needed, so the window may linger one segment wider than strictly legal. But \`best\` recorded that width back when some window genuinely earned it with a real dominant count — the answer never exceeds the true optimum.
2. **No missed improvements.** The answer can only grow past the current \`best\` when a window with a strictly larger dominant count appears, and at that moment \`max_freq\` is fresh by construction (it was just raised by the entering color).

In effect the window's width never shrinks — it slides at the largest size validated so far and waits to be stretched by a better dominant count. That is also why the \`while\` runs at most one iteration per step. Each segment enters once and leaves at most once: \`O(n)\` time, and the counts dict holds at most 26 keys.`,
        complexity: 'Time O(n), Space O(1) — at most 26 color counts',
      },
      testCases: [
        {
          input: ['ABAB', 2],
          expected: 4,
          label: 'dye half the row',
        },
        {
          input: ['AABABBA', 1],
          expected: 4,
          label: 'classic budget squeeze',
        },
        {
          input: ['ABCDE', 1],
          expected: 2,
          label: 'all colors different',
        },
        {
          input: ['AAAA', 0],
          expected: 4,
          label: 'already solid',
        },
        {
          input: ['', 3],
          expected: 0,
          label: 'empty row',
        },
        {
          input: ['ABBB', 2],
          expected: 4,
          hidden: true,
        },
        {
          input: ['ABABBA', 0],
          expected: 2,
          hidden: true,
        },
        {
          input: ['XYXYXYXY', 3],
          expected: 7,
          hidden: true,
        },
        {
          input: ['Q', 0],
          expected: 1,
          hidden: true,
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 424. Longest Repeating Character Replacement', note: 'classic version' },
        { name: 'LeetCode 2024. Maximize the Confusion of an Exam', note: 'two-symbol variant' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      prompt:
        'Compared with evaluating every subarray independently, what is the core inefficiency that the sliding-window technique eliminates?',
      choices: [
        'The memory overhead of storing every subarray',
        'Recomputing work shared by overlapping windows instead of updating incrementally',
        'The cost of sorting the input before scanning it',
        'Recursion depth from divide-and-conquer splitting',
      ],
      correctIndex: 1,
      explanation:
        'Adjacent windows overlap in all but one or two elements; brute force pays for that overlap again and again, while the window updates its aggregate in O(1) per move. Memory is not the issue — brute force can also use O(1) space — and no sorting or recursion is involved in either approach.',
      kind: 'conceptual',
    },
    {
      id: 'q2',
      prompt:
        "In the canonical 'longest window with at most K distinct items' loop, what is guaranteed immediately after the inner while-loop (the shrink phase) finishes?",
      choices: [
        'The window [left, right] is valid and is the widest valid window ending at right',
        'The window contains exactly K distinct items',
        'left has caught up to right, so the window holds one element',
        'The window is the longest valid window seen anywhere so far',
      ],
      correctIndex: 0,
      explanation:
        'The shrink loop runs only while the window is invalid and stops the instant validity is restored, so the window is valid and could not be extended further left — making it the widest valid window ending at this right edge. It may hold fewer than K distinct items, left rarely reaches right, and global bookkeeping is handled separately by the running max.',
      kind: 'conceptual',
    },
    {
      id: 'q3',
      prompt:
        'A variable-size window scan contains a while-loop nested inside a for-loop, yet runs in O(n). Why?',
      choices: [
        'Because the while-loop body executes at most once per for-iteration',
        'Because the constraint check inside the while-loop is O(1)',
        'Because left only moves forward: every element enters the window once and leaves at most once, so total pointer moves are bounded by 2n',
        'It does not — the worst case is O(n^2), it just rarely occurs in practice',
      ],
      correctIndex: 2,
      explanation:
        'The amortized argument counts total work across the whole run: right advances n times and left advances at most n times, so the nested loop performs at most 2n moves overall. The while-loop can run many times in a single iteration (so choice 1 is wrong), an O(1) check alone would not bound how often it runs, and the bound is a true worst case, not an average case.',
      kind: 'complexity',
    },
    {
      id: 'q4',
      prompt:
        'Using the running-sum technique, what are the time and space costs of finding the maximum sum over all windows of size k in an array of length n?',
      choices: [
        'Time O(n * k), Space O(1)',
        'Time O(n), Space O(1)',
        'Time O(n), Space O(k)',
        'Time O(n log k), Space O(k)',
      ],
      correctIndex: 1,
      explanation:
        'The first window costs O(k) and each of the remaining n - k slides costs O(1) (add one, subtract one), totaling O(n); only a scalar sum and a best value are stored. O(n * k) is the brute force this technique replaces, and no O(k) buffer or heap is needed for a plain sum.',
      kind: 'complexity',
    },
    {
      id: 'q5',
      prompt:
        'You must find the longest substring of a string that contains at most 2 distinct characters. Which approach fits best?',
      choices: [
        'Binary search on the answer length, checking each candidate length with a scan',
        'Dynamic programming over prefixes with a 2D state table',
        'Two pointers starting at both ends and moving inward',
        'A variable-size sliding window with a character-count map, shrinking while the map holds more than 2 keys',
      ],
      correctIndex: 3,
      explanation:
        '"Longest contiguous span under a monotone constraint" is the sliding-window signature: growing can only add distinct characters, shrinking can only remove them. Inward two pointers suit pair-sum-in-sorted-array problems, not contiguous-substring constraints; binary search plus scan works but costs an unnecessary O(n log n); DP is overkill for a constraint checkable in O(1) per move.',
      kind: 'scenario',
    },
    {
      id: 'q6',
      prompt:
        'You need the maximum-sum contiguous subarray of any length in an array that contains negative numbers. Which approach is correct?',
      choices: [
        "Kadane's algorithm (running best-suffix DP), since window shrinking gives no reliable signal when values can be negative",
        'A variable-size sliding window that shrinks whenever the running sum decreases',
        'A fixed-size sliding window tried at every possible k',
        'A monotonic deque tracking the maximum element of each window',
      ],
      correctIndex: 0,
      explanation:
        'Sliding windows need monotonicity: shrinking must predictably push the window toward validity. With negatives, removing an element can raise or lower the sum, so no shrink rule is sound — the tempting window answer is wrong. Kadane’s O(n) recurrence (extend or restart) handles negatives exactly. Trying every k is O(n^2), and a deque tracks maxima of elements, not sums.',
      kind: 'scenario',
    },
    {
      id: 'q7',
      prompt:
        'Given a stream of server log lines and a required multiset of error codes, you must report the shortest contiguous block of lines containing all required codes (with repeats). Which technique fits?',
      choices: [
        'A hash set of codes seen so far, scanning once from the left',
        'Prefix sums over code counts with binary search for block boundaries',
        'A grow-then-shrink sliding window with a needs-counter and a missing tally, recording the best block while shrinking',
        'Sorting log lines by code and merging intervals',
      ],
      correctIndex: 2,
      explanation:
        'Shortest contiguous span covering a requirement is the minimum-covering-window pattern: expand until covered, contract while still covered. A plain hash set loses multiplicity and cannot shrink; prefix sums per code cannot cheaply combine into a "shortest covering block" query; sorting destroys the contiguity the problem is about.',
      kind: 'scenario',
    },
    {
      id: 'q8',
      prompt:
        "What is the worst-case space used by the count map in a 'longest window with at most K distinct items' algorithm?",
      choices: [
        'O(1) — only two integer pointers are needed',
        'O(K) — the shrink rule fires as soon as a (K+1)-th distinct key appears, so the map never grows beyond K + 1 entries',
        'O(n) — every distinct element of the input may be stored simultaneously',
        'O(n log n) — the map must stay sorted by count',
      ],
      correctIndex: 1,
      explanation:
        'The invariant bounds the map: the instant the window holds K + 1 distinct keys, shrinking evicts one (its count reaches zero and is deleted), so at most K + 1 keys ever coexist. O(n) would only apply if stale zero-count keys were never deleted — a classic implementation bug — and the map is a hash map, never sorted.',
      kind: 'complexity',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'What are the two flavors of sliding window, and when does each apply?',
      back: 'Fixed-size: both edges move together, for "best k consecutive elements". Variable-size: right edge grows, left edge shrinks to restore a constraint, for "longest/shortest span such that ...".',
    },
    {
      id: 'f2',
      front: 'Top signals that a problem wants a sliding window?',
      back: 'The answer concerns a contiguous subarray/substring, and the constraint is monotone — growing the window only worsens a "too much" condition and shrinking only relieves it.',
    },
    {
      id: 'f3',
      front: 'The fixed-size window update move?',
      back: 'Sum the first k elements once, then per step: aggregate += arr[right] - arr[right - k]. One enters, one leaves, O(1) per slide.',
    },
    {
      id: 'f4',
      front: 'Why is the grow/shrink window O(n) despite a nested while-loop?',
      back: 'left only moves forward, so each element is absorbed once and released at most once — at most 2n pointer moves total, an amortized argument.',
    },
    {
      id: 'f5',
      front: 'Formula for the current window length (and the classic mistake)?',
      back: 'right - left + 1. Forgetting the +1 is the most common off-by-one in the pattern.',
    },
    {
      id: 'f6',
      front: 'How do you track the number of DISTINCT items in a window correctly?',
      back: 'Keep a dict of counts and delete a key the moment its count hits zero; then len(counts) equals the distinct count. Stale zero-count keys silently corrupt the check.',
    },
    {
      id: 'f7',
      front: 'Shrink rule for longest-valid vs shortest-covering windows?',
      back: 'Longest: shrink WHILE INVALID, record after restoring validity. Shortest: grow until valid, then shrink WHILE STILL VALID, recording during the shrink.',
    },
    {
      id: 'f8',
      front: 'Minimum-covering-window state that makes validity O(1)?',
      back: 'A need counter seeded from the requirement (entries may go negative for surplus) plus a single missing tally; the window covers the requirement exactly when missing == 0.',
    },
    {
      id: 'f9',
      front: 'When does the sliding window pattern break down?',
      back: 'When validity is not monotone in window size — e.g., max-sum subarray with negative numbers. Shrinking gives no reliable signal; reach for Kadane’s, prefix sums, or DP instead.',
    },
    {
      id: 'f10',
      front: "How do you answer 'exactly K' questions with window machinery, and what computes per-window maxima?",
      back: 'Count exactly-K as atMost(K) - atMost(K-1) using two at-most windows. For the max of every k-window, use a monotonic deque of indices — front is the current max, amortized O(n).',
    },
  ],
  cheatSheet: {
    tldr: 'Maintain a contiguous span [left, right] over the input and an O(1)-updatable summary of it (sum, count map, zero counter). Slide instead of recompute: fixed-size windows add one element and drop one per step; variable-size windows grow on the right and shrink on the left to keep a monotone constraint satisfied. Every element enters and leaves at most once, so the whole scan is linear.',
    signals: [
      'Reach for this when the answer is about a contiguous subarray or substring (not a subsequence).',
      'Reach for this when the ask is "longest / shortest / max / count of spans such that ⟨constraint⟩".',
      'Reach for this when the constraint is monotone: growing the window only worsens it, shrinking only relieves it (at most K distinct, at most K zeros, sum ≥ target with non-negatives).',
      'Reach for this when a fixed k is given and the naive answer rescans k elements per position — replace with add-one/drop-one.',
    ],
    template: `# Variable-size: longest window satisfying a constraint
def longest_window(items, limit):
    left = 0
    best = 0
    state = {}                        # O(1)-updatable window summary
    for right, x in enumerate(items):
        # absorb items[right] into state
        while window_violates(state, limit):
            # release items[left] from state
            left += 1
        best = max(best, right - left + 1)
    return best

# Fixed-size k: add one, drop one
def best_fixed(arr, k):
    window = sum(arr[:k])
    best = window
    for right in range(k, len(arr)):
        window += arr[right] - arr[right - k]
        best = max(best, window)
    return best`,
    complexity: 'Time O(n) amortized (each element enters/leaves once); Space O(1) for scalar state, O(k) or O(alphabet) for count maps.',
  },
}

export default mod
