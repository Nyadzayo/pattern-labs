import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'greedy',
  visualizer: 'greedy-intervals',
  concept: `
## The mental model

Picture the front desk of a climbing gym with a single rope and a pile of session requests for the day. The clerk plays one rule on repeat: grant the request that **lets go of the rope soonest**, toss every request that clashes with it, and move on. No spreadsheet of alternatives, no backtracking, no regret. By closing time the clerk has — provably — served the maximum possible number of climbers.

That is the greedy pattern in one sentence: **make the locally best choice by some fixed rule, commit to it, and never look back.** It is also the most dangerous pattern in the catalog, because the instinct that nails interval scheduling will confidently produce garbage on a problem that looks almost identical. A greedy algorithm without a proof is a hunch wearing a for-loop.

## Mechanics

Nearly every correct greedy is the same three moves:

1. **Sort by the right key** (or keep a heap when "best available" changes as you sweep).
2. **Sweep once**, carrying a tiny summary of the past — the last accepted end time, the farthest reachable index, a bank of unused options.
3. **Commit** at every step. Decisions are final; nothing is revisited.

Here is the climbing-gym clerk as code — earliest-finish-time scheduling:

\`\`\`python
def max_non_overlapping(sessions: list[list[int]]) -> int:
    count, free_at = 0, float("-inf")
    for start, end in sorted(sessions, key=lambda s: s[1]):
        if start >= free_at:   # compatible with everything accepted
            count += 1
            free_at = end      # commit — never reconsidered
    return count
\`\`\`

What makes this *correct* rather than merely plausible is the **exchange argument**, the proof tool of the whole pattern. Take any optimal schedule OPT. Let \`g\` be the earliest-finishing session overall. If OPT's first pick isn't \`g\`, swap it for \`g\`: since \`g\` ends no later, everything OPT scheduled afterwards still fits, and the count is unchanged. Repeat the swap at every disagreement and OPT morphs, one step at a time, into exactly the greedy schedule — without ever getting worse. Therefore greedy is optimal. Every trustworthy greedy has a swap story like this: *"take any optimal answer; exchanging its choice for mine never hurts."* If you cannot tell that story, you do not have a greedy algorithm yet — you have a guess.

Two more recurring shapes show up constantly. The **frontier number**: sweep an array keeping one value such as "farthest index reachable so far," because that single number summarizes every chain of decisions behind you. And the **banked-options heap**: pass up choices for now but record them, and the moment you are stuck, retroactively grab the best banked option — order of commitment turns out not to matter, only the set you commit to.

## When greedy fails

Make change for 6 with coin denominations \`[1, 3, 4]\`. Greedy grabs the biggest coin that fits: 4, then 1, then 1 — three coins. Optimal is 3 + 3 — two coins. The locally best move (take the 4) poisons the subproblem it leaves behind, and no exchange swap can repair it: trading a 3 for the 4 genuinely makes the remainder worse. When choices **interact** — picking this item changes the *value* of future options rather than just their availability, or you are maximizing a weighted total rather than a count — you usually need dynamic programming, which explores alternatives and memoizes subproblems instead of committing blind. Two practical litmus tests: (1) try to state the exchange swap out loud; (2) brute-force tiny inputs and diff against your greedy. A counterexample found in thirty seconds saves a rejected submission.

## When to reach for it

- The ask is **"maximize the number of…"** or **"minimum number of stops / jumps / taps / removals"** — counts, not weighted sums.
- There is an obvious **single sort key** (end time, deadline, size, position) after which a one-pass sweep with tiny state looks plausible.
- Decisions are **irrevocable but harmless**: you can argue that committing early never blocks a better future.
- The structure is **intervals, deadlines, ranges, or two sorted pools** to pair up.
- Counter-signal: the moment items carry **values or weights to trade off** (weighted intervals, knapsack, arbitrary coin systems), suspect DP instead.

## Complexity

The sort usually dominates: \`O(n log n)\` time and \`O(1)\` extra space for the classic sort-and-sweep. Frontier scans over already-positioned data (reach problems) skip the sort entirely: \`O(n)\` time, \`O(1)\` space. Heap-banking variants push and pop each option at most once: \`O(n log n)\` time, \`O(n)\` space. Compare that with the DP you avoided — typically \`O(n^2)\` — or the subset brute force at \`O(2^n)\`.

## Common pitfalls

- **Shipping a hunch.** Plausible rules (earliest start! shortest first!) fail interval scheduling; only earliest *finish* survives the exchange test. The sort key *is* the algorithm.
- **Boundary semantics.** Decide explicitly whether touching intervals clash (\`start >= free_at\` vs strict \`>\`) and whether exactly reaching a target or station counts. Off-by-one here flips hidden tests.
- **Count vs. value.** Maximizing *how many* sessions fit is greedy; maximizing their *total payout* is weighted-interval DP. Same input, different pattern.
- **Forgetting to bank.** In heap variants, push *every* option you pass before popping, or your "best so far" is a lie.
- **Silent unreachability.** Reach-style scans need an explicit stranded check (\`i > farthest\` → fail); cruising past it produces wrong answers, not errors.
`,
  realWorldUses: [
    {
      title: 'Huffman coding inside DEFLATE',
      description:
        'Every gzip stream, PNG file, and zlib-compressed payload builds its symbol codes with the Huffman construction: repeatedly merge the two lowest-frequency nodes. That repeated locally-cheapest merge is a greedy algorithm with a classic exchange-argument optimality proof.',
    },
    {
      title: 'Earliest-deadline-first in real-time schedulers',
      description:
        'Real-time operating systems (including Linux\'s SCHED_DEADLINE class) dispatch the runnable task whose deadline is nearest. EDF is greedy by deadline and provably optimal on a single processor: if any schedule meets every deadline, EDF does too.',
    },
    {
      title: 'Dijkstra inside link-state routing',
      description:
        'OSPF and IS-IS routers recompute shortest paths over the network graph with Dijkstra\'s algorithm, which greedily finalizes the unvisited node with the smallest tentative distance. With non-negative link costs, the greedy commit is exchange-safe and never needs revisiting.',
    },
  ],
  problems: [
    {
      id: 'canyon-relay',
      title: 'Canyon Relay',
      difficulty: 'easy',
      statement: `
A survey team has parked a line of relay drones through a narrow canyon, indexed \`0\` to \`n - 1\` from the canyon mouth inward. Radio power varies: drone \`i\` can forward a data packet to any drone up to \`hops[i]\` positions ahead of it (that is, to any index from \`i + 1\` through \`i + hops[i]\`). A drone with \`hops[i] = 0\` can receive but cannot forward.

A packet starts on drone \`0\` and must reach the deepest drone, index \`n - 1\`, through some chain of forwards. Given \`hops\`, return \`True\` if such a chain exists and \`False\` otherwise. A single-drone line trivially succeeds — the packet is already at its destination.

The canyon can hold up to 100,000 drones, so checking every possible chain of forwards is off the table.
`,
      examples: [
        {
          input: 'hops = [3, 1, 0, 2, 4]',
          output: 'True',
          explanation:
            'Drone 0 forwards straight to drone 3 (within its 3-position reach), and drone 3 reaches drone 4. Done.',
        },
        {
          input: 'hops = [2, 1, 0, 0, 5]',
          output: 'False',
          explanation:
            'Nothing among drones 0–2 can push the packet past index 2, and drone 2 cannot forward at all. The powerful drone at index 4 never receives the packet.',
        },
        {
          input: 'hops = [0]',
          output: 'True',
          explanation: 'The packet starts on the last (and only) drone — no forwarding needed.',
        },
      ],
      constraints: [
        '1 <= len(hops) <= 100_000',
        '0 <= hops[i] <= 100_000',
        'The packet starts at index 0; the destination is index len(hops) - 1',
      ],
      hints: [
        'Tracing every possible chain of forwards branches explosively. As you walk left to right, is there a single number that captures everything the drones you have already passed can do for you?',
        'Sweep once, maintaining the farthest index reachable so far: farthest = max(farthest, i + hops[i]), updated only for drones that are themselves reachable. What does it mean if your loop index ever exceeds farthest?',
        'If i > farthest, no chain of forwards reaches drone i, so return False. Otherwise update farthest and return True as soon as farthest >= len(hops) - 1. A single drone is trivially True.',
      ],
      functionName: 'can_relay',
      starterCode: `def can_relay(hops: list[int]) -> bool:
    pass
`,
      solution: {
        code: `def can_relay(hops: list[int]) -> bool:
    # farthest = the highest index reachable through SOME chain of
    # forwards using only the drones examined so far. One number
    # summarizes every possible chain behind us.
    farthest = 0
    last = len(hops) - 1
    for i, power in enumerate(hops):
        if i > farthest:
            # Drone i is beyond every chain we could build, so it never
            # receives the packet — and neither does anything past it.
            return False
        # Drone i is reachable, so everything within its radio range
        # becomes reachable too.
        farthest = max(farthest, i + power)
        if farthest >= last:
            return True  # the deepest drone is already in range
    # Only reachable for an empty input; kept for safety.
    return False
`,
        commentary: `
The brute force explores a tree of forwarding chains that can branch at every drone — exponential. The greedy insight is that chains are interchangeable: it never matters *which* chain got you somewhere, only *how deep* any chain can go. So the entire history compresses into one frontier number, \`farthest\`.

The invariant after processing index \`i\` is: *an index is reachable if and only if it is at most \`farthest\`*. The exchange flavor of the proof: any chain that reaches index \`j > i\` must pass through some reachable drone at or before \`i\`, and that drone's contribution \`i' + hops[i']\` is already folded into \`farthest\` — so no clever routing ever beats the frontier. If the loop index overtakes the frontier, there is a gap no chain can cross, and everything deeper is unreachable; failing fast there is not an optimization, it is the correctness condition.

Note the early \`return True\`: once the frontier covers the last index, later zeros (or anything else) cannot un-reach it. The single-drone case never needs a forward and exits on the first iteration.
`,
        complexity: 'Time O(n), Space O(1)',
        subgoals: [
          {
            lineRange: [1, 6],
            referenceLabel: 'Initialize a single frontier number summarizing all reach so far',
            acceptableKeywords: ['farthest reachable so far', 'track the frontier', 'reachable index summary', 'init reach to start'],
            hint: 'What one running value captures everything the elements behind you can do?',
            misconception: 'This is setup of the frontier, not yet the scan or any decision.',
          },
          {
            lineRange: [7, 11],
            referenceLabel: 'Scan each position and bail when it sits past the frontier',
            acceptableKeywords: ['sweep each index', 'unreachable fails fast', 'index beyond frontier', 'stranded check returns false'],
            hint: 'As you walk, what does it mean if the current index is past the frontier?',
            misconception: 'This is the stranded-failure guard, not the frontier update — overtaking the frontier means a gap nothing can cross.',
          },
          {
            lineRange: [12, 14],
            referenceLabel: 'Extend the frontier using the current element',
            acceptableKeywords: ['update farthest with reach', 'push the frontier out', 'extend reach from here', 'max of current and new reach'],
            hint: 'How does a reachable element grow how far you can get?',
            misconception: 'This widens the frontier; it does not decide success or failure on its own.',
          },
          {
            lineRange: [15, 16],
            referenceLabel: 'Succeed early once the frontier covers the goal',
            acceptableKeywords: ['frontier covers target', 'reach the last index', 'early success return', 'goal in range returns true'],
            hint: 'When can you stop scanning and declare success?',
            misconception: 'This is the early win once coverage is proven, not the per-step extension.',
          },
          {
            lineRange: [17, 18],
            referenceLabel: 'Report failure when the scan ends uncovered',
            acceptableKeywords: ['fall through to false', 'no path returns false', 'default failure', 'unreachable goal'],
            hint: 'If the loop finishes without covering the goal, what is the answer?',
            misconception: 'Reaching here means the scan ended without ever covering the goal.',
          },
        ],
      },
      testCases: [
        { input: [[3, 1, 0, 2, 4]], expected: true, label: 'reachable with a mid-line hop' },
        { input: [[2, 1, 0, 0, 5]], expected: false, label: 'dead drone blocks the line' },
        { input: [[0]], expected: true, label: 'single drone, already there' },
        { input: [[1, 0]], expected: true, label: 'minimal forward' },
        { input: [[0, 3]], expected: false, hidden: true, label: 'cannot leave drone 0' },
        { input: [[4, 0, 0, 0, 0]], expected: true, hidden: true, label: 'one giant hop covers all' },
        { input: [[1, 1, 1, 1, 1, 1]], expected: true, hidden: true, label: 'chain of single hops' },
        { input: [[2, 0, 1, 0, 4]], expected: false, hidden: true, label: 'frontier stalls one short' },
        { input: [[5, 4, 3, 2, 1, 0, 0]], expected: false, hidden: true, label: 'big early hops still fall short' },
      ],
      furtherPractice: [
        { name: 'LeetCode 55. Jump Game', note: 'the same frontier scan' },
        { name: 'LeetCode 45. Jump Game II', note: 'count the minimum hops — layer the frontier into BFS-like waves' },
        { name: 'LeetCode 1024. Video Stitching', note: 'frontier over intervals instead of hops' },
      ],
    },
    {
      id: 'booth-bookings',
      title: 'One Booth, Many Bands',
      difficulty: 'medium',
      statement: `
An indie podcast studio owns exactly one soundproof booth, and the booking inbox is overflowing. Each request is a pair \`[start, end]\` in minutes since opening: the booth is occupied from \`start\` up to (but not beyond) \`end\`. Two sessions clash if their time ranges overlap; a session that starts exactly when another ends is fine — engineers swap the talent in seconds.

Given the list \`sessions\`, return the **maximum number of requests** the studio can accept so that no two accepted sessions clash. Only the count is required, not the schedule itself.

The inbox can hold up to 100,000 requests, so anything that weighs subsets of bookings against each other will not finish before the first session starts.
`,
      examples: [
        {
          input: 'sessions = [[9, 30], [25, 60], [30, 90]]',
          output: '2',
          explanation:
            'Accept [9, 30] and [30, 90] — back-to-back is allowed. [25, 60] overlaps both, so any schedule containing it has only one session.',
        },
        {
          input: 'sessions = [[0, 5], [5, 10], [10, 15], [15, 20]]',
          output: '4',
          explanation: 'A perfect relay: every session starts exactly when the previous one ends.',
        },
        {
          input: 'sessions = []',
          output: '0',
          explanation: 'An empty inbox books nothing.',
        },
      ],
      constraints: [
        '0 <= len(sessions) <= 100_000',
        '0 <= start < end <= 10^9 for every session',
        'Sessions may overlap arbitrarily and are in no particular order',
        'A session starting exactly when another ends does NOT clash',
      ],
      hints: [
        'When two requests clash you must drop one. Compare the kept session not by when it starts or how long it runs, but by what state it leaves the booth in for the rest of the day.',
        'Sort the requests by END time. Sweep in that order and accept any session that starts at or after the end of the last accepted one — the earliest finisher always leaves at least as much room as any alternative first pick.',
        'count = 0, free_at = -infinity; for each [s, e] in sessions sorted by e: if s >= free_at, count += 1 and free_at = e. Return count. Mind the >= — back-to-back bookings are allowed.',
      ],
      functionName: 'max_bookings',
      starterCode: `def max_bookings(sessions: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `def max_bookings(sessions: list[list[int]]) -> int:
    count = 0
    free_at = float("-inf")  # the minute the booth becomes free
    # Earliest-finishing requests first. Accepting the session that
    # releases the booth soonest is the exchange-safe choice.
    for start, end in sorted(sessions, key=lambda s: s[1]):
        if start >= free_at:
            # Compatible with everything accepted so far (>= because
            # touching endpoints are explicitly allowed).
            count += 1
            free_at = end  # commit — this decision is never revisited
    return count
`,
        commentary: `
The tempting sort keys both fail. *Earliest start* loses to one marathon session that arrives first and blocks the whole day. *Shortest first* loses to a short session straddling the boundary of two long ones — it kills two bookings to gain one. Only *earliest finish* survives, and the exchange argument says why.

Let \`g\` be the request with the earliest end time. Take any optimal schedule OPT and look at its first session (by time). \`g\` ends no later than it does, so replacing OPT's first session with \`g\` cannot clash with the rest of OPT — every later session started at or after the old first session's end, which is at or after \`g\`'s end. The swap keeps the count identical. Apply the same argument to the remaining day, and OPT transforms into exactly the greedy schedule with no loss. Greedy is therefore optimal — not "usually good," provably maximal.

Implementation notes: a single \`free_at\` watermark is all the state needed because accepted sessions are committed in increasing end order. The \`>=\` versus \`>\` choice encodes the problem's touching-endpoints rule — flipping it silently fails the back-to-back tests. Duplicate sessions collapse naturally: after the first copy is accepted, identical copies fail the \`start >= free_at\` check.
`,
        complexity: 'Time O(n log n) for the sort plus an O(n) sweep, Space O(n) for the sorted copy (O(1) extra if sorting in place)',
        subgoals: [
          {
            lineRange: [1, 3],
            referenceLabel: 'Set up an accepted count and a commitment watermark',
            acceptableKeywords: ['count accepted starts zero', 'last committed boundary', 'watermark of past picks', 'init running tally'],
            hint: 'What two values carry forward from the choices already committed?',
            misconception: 'This is the running state, not yet the ordering or the test.',
          },
          {
            lineRange: [4, 6],
            referenceLabel: 'Process candidates in the proven sort order',
            acceptableKeywords: ['sort by finishing key', 'sweep earliest finisher first', 'iterate in sorted order', 'order by end time'],
            hint: 'Which single sort key makes the one-pass commit provably safe here?',
            misconception: 'The sort key IS the algorithm — sorting by start or by length breaks correctness.',
          },
          {
            lineRange: [7, 9],
            referenceLabel: 'Test the candidate against the last commitment',
            acceptableKeywords: ['compatible with last pick', 'no clash with watermark', 'fits after committed boundary', 'check overlap'],
            hint: 'How do you tell the next candidate does not collide with what you kept?',
            misconception: 'This is only the gating test; the boundary semantics live in the comparison operator.',
          },
          {
            lineRange: [10, 11],
            referenceLabel: 'Accept the candidate and commit irrevocably',
            acceptableKeywords: ['increment the count', 'advance the watermark', 'commit and never revisit', 'record the new boundary'],
            hint: 'When a candidate fits, what do you record so it is never undone?',
            misconception: 'This is the irrevocable commit, not the compatibility check that precedes it.',
          },
          {
            lineRange: [12, 12],
            referenceLabel: 'Report the size of the committed set',
            acceptableKeywords: ['return the count', 'final tally', 'report how many accepted', 'output the total'],
            hint: 'After the sweep, what single number is the answer?',
            misconception: 'This returns the accumulated count, not the schedule itself.',
          },
        ],
      },
      testCases: [
        { input: [[[9, 30], [25, 60], [30, 90]]], expected: 2, label: 'overlap plus a touching pair' },
        { input: [[]], expected: 0, label: 'empty inbox' },
        { input: [[[10, 20]]], expected: 1, label: 'single request' },
        { input: [[[0, 5], [5, 10], [10, 15], [15, 20]]], expected: 4, label: 'perfect back-to-back relay' },
        { input: [[[0, 100], [10, 20], [30, 40], [50, 60]]], expected: 3, hidden: true, label: 'long blocker loses to three short ones' },
        { input: [[[5, 8], [5, 8], [5, 8], [5, 8]]], expected: 1, hidden: true, label: 'all identical requests' },
        { input: [[[14, 18], [1, 4], [10, 13], [4, 11], [3, 9], [12, 20]]], expected: 3, hidden: true, label: 'unsorted tangle' },
        { input: [[[2, 3], [1, 4], [3, 5]]], expected: 2, hidden: true, label: 'nested interval skipped' },
        { input: [[[1, 10], [2, 3], [4, 5], [6, 7], [8, 9]]], expected: 4, hidden: true, label: 'many sessions inside one giant' },
      ],
      furtherPractice: [
        { name: 'LeetCode 435. Non-overlapping Intervals', note: 'same greedy, asked as "minimum removals"' },
        { name: 'LeetCode 646. Maximum Length of Pair Chain', note: 'identical structure with strict inequality' },
        { name: 'LeetCode 452. Minimum Number of Arrows to Burst Balloons', note: 'earliest-end greedy as point coverage' },
      ],
    },
    {
      id: 'parcel-matchup',
      title: 'Parcel-Courier Matchup',
      difficulty: 'medium',
      statement: `
A bike-courier dispatch office starts each morning with two lists: \`parcels\`, where \`parcels[k]\` is the weight of the k-th parcel waiting on the dock, and \`couriers\`, where \`couriers[k]\` is the maximum weight the k-th rider can safely carry. Each courier takes **at most one** parcel on the morning run, and a parcel can only go to a courier whose capacity is **greater than or equal to** its weight. Parcels are otherwise interchangeable — the office only cares about volume of deliveries, not which parcel rides with whom.

Given the two lists (in no particular order), return the **maximum number of parcels** that can go out this morning.

Both lists can hold up to 100,000 entries, so trying every assignment is hopeless.
`,
      examples: [
        {
          input: 'parcels = [3, 8, 8, 9], couriers = [8, 5, 10, 7]',
          output: '3',
          explanation:
            'Weight 3 rides with capacity 5, one weight-8 parcel with capacity 8, and weight 9 with capacity 10. The capacity-7 rider goes empty: the only remaining parcel weighs 8.',
        },
        {
          input: 'parcels = [4, 5, 6], couriers = [3, 3]',
          output: '0',
          explanation: 'No courier can lift even the lightest parcel.',
        },
        {
          input: 'parcels = [2, 2, 2], couriers = [2, 2]',
          output: '2',
          explanation: 'Two riders, two parcels delivered; the third parcel waits for the afternoon.',
        },
      ],
      constraints: [
        '0 <= len(parcels) <= 100_000',
        '0 <= len(couriers) <= 100_000',
        '1 <= parcels[k], couriers[k] <= 10^9',
        'Each courier carries at most one parcel; a parcel needs capacity >= weight',
      ],
      hints: [
        'A courier who can carry a given parcel can also carry every lighter parcel. Think about the weakest courier in the room first — what could possibly be gained by handing them something heavy, or by leaving them idle when something fits?',
        'Sort both lists ascending. Walk the couriers from weakest to strongest and offer each the lightest still-unassigned parcel; assign it whenever it fits. An exchange swap shows this never costs a delivery.',
        'Two indices over the sorted lists: for each capacity c in sorted couriers, if i < len(parcels_sorted) and parcels_sorted[i] <= c, then i += 1. The final i is the answer; empty inputs naturally give 0.',
      ],
      functionName: 'max_deliveries',
      starterCode: `def max_deliveries(parcels: list[int], couriers: list[int]) -> int:
    pass
`,
      solution: {
        code: `def max_deliveries(parcels: list[int], couriers: list[int]) -> int:
    weights = sorted(parcels)   # lightest parcel first
    caps = sorted(couriers)     # weakest courier first
    i = 0  # index of the lightest still-unassigned parcel
    for cap in caps:
        # Offer the weakest remaining courier the lightest remaining
        # parcel. If even that does not fit, this courier can carry
        # nothing at all (every other parcel is at least as heavy).
        if i < len(weights) and weights[i] <= cap:
            i += 1  # delivered; move to the next-lightest parcel
        # Otherwise the courier rides empty and we keep the parcel
        # for someone stronger.
    return i
`,
        commentary: `
Compatibility here is *nested*: a courier who can take a parcel can take every lighter one too. That nesting is what lets a greedy matching replace full bipartite matching.

Two exchange swaps justify the rule. **Swap 1 — the weakest courier should not be picky.** Suppose some optimal assignment gives the weakest working courier a parcel heavier than the lightest one they could carry. Whoever holds that lightest parcel (if anyone) is a stronger courier, so the two can trade parcels: both still fit, and the delivery count is unchanged. **Swap 2 — the weakest courier should not be idle.** If the weakest courier could carry the lightest unassigned parcel but the optimal plan leaves them empty, just hand it to them: the count goes up or stays equal, contradiction-free. Together these prove that "weakest courier takes lightest fitting parcel" is the first move of *some* optimal plan; induction on the remaining lists finishes the proof.

The implementation is a two-pointer walk after sorting, but the engine is greedy, not the converging-pointer pattern: \`i\` only ever advances when a delivery is committed, and the loop quietly handles every edge case — empty docks, empty rosters, and the courier who fits nothing simply falls through without advancing \`i\`.
`,
        complexity: 'Time O(n log n + m log m) for the two sorts plus a linear merge walk, Space O(n + m) for the sorted copies',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Sort both pools ascending and open a cursor on the smaller pool',
            acceptableKeywords: ['sort both lists ascending', 'weakest and lightest first', 'pointer into the demands', 'order both pools'],
            hint: 'What ordering of the two pools makes a weakest-first match safe?',
            misconception: 'This is the ordered setup; no matching has happened yet.',
          },
          {
            lineRange: [5, 8],
            referenceLabel: 'Walk the resource pool from weakest to strongest',
            acceptableKeywords: ['iterate weakest capacity first', 'sweep the providers', 'offer to the smallest provider', 'loop over sorted capacities'],
            hint: 'In what order do you offer each resource the smallest remaining demand?',
            misconception: 'This is the outer sweep; the per-step fit decision is separate.',
          },
          {
            lineRange: [9, 12],
            referenceLabel: 'Assign the smallest remaining demand when it fits, else leave the resource idle',
            acceptableKeywords: ['lightest still fits assign', 'advance the cursor on a match', 'skip when too big', 'commit a match'],
            hint: 'Given the smallest unmet demand, when does this resource take it?',
            misconception: 'Only the cursor advances on a successful match — a resource that fits nothing simply passes without consuming anything.',
          },
          {
            lineRange: [13, 13],
            referenceLabel: 'Report how many demands were satisfied',
            acceptableKeywords: ['return the match count', 'cursor is the answer', 'number assigned', 'total satisfied'],
            hint: 'After the walk, which value counts the matches made?',
            misconception: 'The cursor position equals the number of satisfied demands, not a remaining index.',
          },
        ],
      },
      testCases: [
        { input: [[3, 8, 8, 9], [8, 5, 10, 7]], expected: 3, label: 'one courier necessarily idle' },
        { input: [[4, 5, 6], [3, 3]], expected: 0, label: 'nobody can lift anything' },
        { input: [[2, 2, 2], [2, 2]], expected: 2, label: 'all-equal weights and capacities' },
        { input: [[1, 10], [5, 5]], expected: 1, label: 'only the light parcel moves' },
        { input: [[], [1, 2, 3]], expected: 0, hidden: true, label: 'empty dock' },
        { input: [[1, 2, 3], []], expected: 0, hidden: true, label: 'no couriers on shift' },
        { input: [[1, 2], [1, 2, 3]], expected: 2, hidden: true, label: 'more couriers than parcels' },
        { input: [[7, 7, 7, 7, 7], [7, 7, 7]], expected: 3, hidden: true, label: 'exact-fit saturation' },
        { input: [[6, 3, 9, 1], [2, 7, 4, 10]], expected: 4, hidden: true, label: 'perfect matching after sorting' },
      ],
      furtherPractice: [
        { name: 'LeetCode 455. Assign Cookies', note: 'the canonical two-array greedy' },
        { name: 'LeetCode 826. Most Profit Assigning Work', note: 'adds profits — sort plus a running best' },
        { name: 'LeetCode 881. Boats to Save People', note: 'pairing within one array under a capacity cap' },
      ],
    },
    {
      id: 'canal-barge',
      title: 'Dead Reckoning on the Canal',
      difficulty: 'hard',
      statement: `
An autonomous electric barge must travel \`target\` kilometres down a canal to a freight terminal. It departs with enough charge to cover \`start_charge\` kilometres. Along the canal float charging pontoons: \`stations[k] = [position_k, charge_k]\` means a pontoon moored \`position_k\` km downstream holds a one-time battery pack worth \`charge_k\` km of extra range. Positions are strictly increasing and all lie strictly between 0 and \`target\`.

Docking is expensive — each stop means lock paperwork and a missed tide window — so the operator wants the **minimum number of docking stops** that still gets the barge to the terminal. The barge may dock at a pontoon sitting exactly at the limit of its remaining range, battery capacity is effectively unlimited for this trip, and arriving at the terminal with exactly zero range to spare counts as arriving.

Return the minimum number of stops, or \`-1\` if no docking plan reaches the terminal.
`,
      examples: [
        {
          input: 'target = 950, start_charge = 300, stations = [[100, 200], [400, 150], [500, 300], [700, 100], [800, 250]]',
          output: '3',
          explanation:
            'Dock at 100 (+200, range now 500), at 500 (+300, range 800), then at 800 (+250, range 1050 >= 950). No two-stop plan works: the only pack reachable at departure is the 200, and the best follow-up (300) still strands the barge at 800 km of range.',
        },
        {
          input: 'target = 60, start_charge = 60, stations = [[30, 40]]',
          output: '0',
          explanation: 'The departure charge already covers the trip exactly — sail straight past the pontoon.',
        },
        {
          input: 'target = 200, start_charge = 20, stations = [[50, 100]]',
          output: '-1',
          explanation: 'The first pontoon sits at 50 km but the barge can only make 20 km. It strands before any pack is reachable.',
        },
        {
          input: 'target = 20, start_charge = 5, stations = [[4, 2], [6, 14]]',
          output: '2',
          explanation:
            'The barge must top up with the tiny pack at 4 km just to reach the rich pontoon at 6 km. Skipping the small pack strands it at 5 km.',
        },
      ],
      constraints: [
        '1 <= target <= 10^9',
        '0 <= start_charge <= 10^9',
        '0 <= len(stations) <= 100_000',
        '0 < stations[k][0] < target, positions strictly increasing',
        '1 <= stations[k][1] <= 10^9',
        'Each pontoon can be used at most once; docking at the exact limit of range is allowed',
      ],
      hints: [
        'You do not have to decide whether to dock at a pontoon the moment you pass it. What if you could change your mind about an earlier pontoon only at the moment the battery actually runs short?',
        'Sweep toward the terminal, "banking" every pontoon within current range without stopping. When range falls short of the target, retroactively commit to the biggest banked pack — the order you collect packs in never matters, only which set you collect.',
        'Keep a max-heap of banked charges. While reach < target: push all stations with position <= reach; if the heap is empty, return -1; otherwise pop the largest, add it to reach, and count one stop. Return the stop count.',
      ],
      functionName: 'min_docking_stops',
      starterCode: `import heapq

def min_docking_stops(target: int, start_charge: int, stations: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `import heapq

def min_docking_stops(target: int, start_charge: int, stations: list[list[int]]) -> int:
    # Max-heap (negated values) of charge packs the barge has floated
    # past but not yet committed to using.
    banked: list[int] = []
    reach = start_charge  # farthest km attainable with current commitments
    stops = 0
    i = 0
    n = len(stations)
    while reach < target:
        # Bank every pontoon currently within range. position <= reach
        # because docking exactly at the limit of range is allowed.
        while i < n and stations[i][0] <= reach:
            heapq.heappush(banked, -stations[i][1])
            i += 1
        if not banked:
            # Short of the terminal with nothing left to draw on:
            # no plan of any kind can cross this gap.
            return -1
        # Retroactively dock at the most valuable banked pontoon.
        # Which physical stop this was no longer matters — only the
        # total charge collected determines reach.
        reach += -heapq.heappop(banked)
        stops += 1
    return stops
`,
        commentary: `
The trap is treating each pontoon as a now-or-never decision — that framing forces backtracking and an exponential search, or a DP over (station, stops) pairs. The greedy reframe: a docking plan is fully described by *the set of pontoons used*, because range is just \`start_charge\` plus the sum of collected packs. So defer every decision. Float past pontoons, bank them, and only when the barge is provably short (\`reach < target\` and no unbanked pontoon is reachable) commit to one — and commit to the **largest** banked pack.

The exchange argument seals it. Suppose some optimal plan, at the moment of its k-th shortfall, uses banked pack \`b\` while a larger banked pack \`B\` sits unused for the rest of the trip. Swap \`b\` for \`B\`: reach after the swap is at least as large at every later point, so every later docking in the plan is still reachable, and the stop count is unchanged. Repeating the swap aligns any optimal plan with the greedy one, stop for stop. Therefore taking the maximum banked pack at each shortfall minimizes stops.

The loop structure guarantees progress: each iteration either banks new stations (the inner while advances \`i\`, which never resets) or pops the heap, so the algorithm terminates after at most \`n\` pushes and \`n\` pops. The \`-1\` check falls out naturally — an empty bank during a shortfall means a gap no subset of pontoons can bridge.
`,
        complexity: 'Time O(n log n) — each station is pushed and popped at most once at O(log n) per heap operation, Space O(n) for the heap',
        subgoals: [
          {
            lineRange: [1, 10],
            referenceLabel: 'Set up a bank of deferred options plus the reach and counters',
            acceptableKeywords: ['empty heap of options', 'current reachable distance', 'bank passed-up choices', 'init counters and cursor'],
            hint: 'What structure lets you defer a choice and grab it later, and what state tracks progress?',
            misconception: 'This is setup of the deferred-options bank, not yet any commitment.',
          },
          {
            lineRange: [11, 16],
            referenceLabel: 'While short of the goal, bank every option now within reach',
            acceptableKeywords: ['loop until reach covers goal', 'bank all reachable options', 'collect without committing', 'push everything in range'],
            hint: 'Before deciding anything, which options should you record as available?',
            misconception: 'Banking only records options; it does not yet spend a stop or extend reach.',
          },
          {
            lineRange: [17, 20],
            referenceLabel: 'Fail when stuck with no banked option to draw on',
            acceptableKeywords: ['empty bank means stranded', 'no option returns negative one', 'unbridgeable gap fails', 'dead end check'],
            hint: 'You are short of the goal and the bank is empty — what does that mean?',
            misconception: 'An empty bank during a shortfall is the impossibility signal, not a reason to keep scanning.',
          },
          {
            lineRange: [21, 25],
            referenceLabel: 'Retroactively commit the single best banked option and count it',
            acceptableKeywords: ['pop the largest banked', 'extend reach by best option', 'commit one stop', 'take the most valuable'],
            hint: 'When forced to act, which banked option do you finally spend?',
            misconception: 'Only the maximum banked option is taken — the physical order you passed them in no longer matters.',
          },
          {
            lineRange: [26, 26],
            referenceLabel: 'Report the minimum number of commitments made',
            acceptableKeywords: ['return the stop count', 'number of commitments', 'total options used', 'final tally'],
            hint: 'Once the goal is covered, what is the answer?',
            misconception: 'This returns the count of committed options, reached only after the goal is covered.',
          },
        ],
      },
      testCases: [
        {
          input: [950, 300, [[100, 200], [400, 150], [500, 300], [700, 100], [800, 250]]],
          expected: 3,
          label: 'three stops, heap picks the fat packs',
        },
        { input: [60, 60, [[30, 40]]], expected: 0, label: 'no stop needed' },
        { input: [200, 20, [[50, 100]]], expected: -1, label: 'strands before the first pontoon' },
        { input: [100, 25, [[25, 75]]], expected: 1, label: 'pontoon exactly at the range limit' },
        { input: [100, 50, [[40, 30], [60, 40]]], expected: 2, hidden: true, label: 'both pontoons required' },
        { input: [30, 10, [[10, 10], [20, 10]]], expected: 2, hidden: true, label: 'exact-touch chain, all-equal packs' },
        { input: [20, 5, [[4, 2], [6, 14]]], expected: 2, hidden: true, label: 'small pack unlocks the big one' },
        { input: [50, 10, [[5, 5], [8, 4]]], expected: -1, hidden: true, label: 'strands mid-route after using everything' },
        { input: [10, 3, []], expected: -1, hidden: true, label: 'no pontoons at all' },
        { input: [100, 40, [[10, 10], [35, 60]]], expected: 1, hidden: true, label: 'banking lets the barge skip the small pack' },
      ],
      furtherPractice: [
        { name: 'LeetCode 871. Minimum Number of Refueling Stops', note: 'the same banked-heap greedy' },
        { name: 'LeetCode 1642. Furthest Building You Can Reach', note: 'heap-banking with two resource types' },
        { name: 'LeetCode 502. IPO', note: 'bank affordable projects, repeatedly take the most profitable' },
      ],
    },
    {
      id: 'vaccine-airlift',
      title: 'Cold-Chain Airlift',
      difficulty: 'easy',
      statement: `
A humanitarian airlift is loading the cold-storage hold of tonight's relief flight. The hold has \`capacity\` chilled slots, and every crate — whatever is inside — occupies exactly one slot. The warehouse manifest groups identical crates together: \`manifest[k] = [count_k, doses_k]\` means the warehouse holds \`count_k\` interchangeable crates, each packed with \`doses_k\` vaccine doses. You may load any number of crates from each group, up to that group's count and the hold's remaining slots.

Return the **maximum total number of doses** the flight can carry.

The manifest can list up to 100,000 groups, so enumerating subsets of crates will not finish before wheels-up.
`,
      examples: [
        {
          input: 'manifest = [[3, 50], [2, 80], [4, 20]], capacity = 5',
          output: '310',
          explanation:
            'Load both 80-dose crates (160 doses) and three 50-dose crates (150 doses). The hold is now full; the 20-dose crates stay in the warehouse.',
        },
        {
          input: 'manifest = [[5, 9]], capacity = 10',
          output: '45',
          explanation: 'Supply runs out before slots do: all five crates fly, five slots ride empty.',
        },
        {
          input: 'manifest = [[1, 10]], capacity = 0',
          output: '0',
          explanation: 'A hold with no chilled slots carries nothing.',
        },
      ],
      constraints: [
        '0 <= len(manifest) <= 100_000',
        '1 <= count_k <= 10^6 and 1 <= doses_k <= 10^6 for every group',
        '0 <= capacity <= 10^9',
        'Every crate fills exactly one slot regardless of its contents',
      ],
      hints: [
        'Every crate claims one slot no matter what it holds, so slots are a flat currency. If exactly one slot remained and two different crates sat on the tarmac, what single comparison would settle which one flies?',
        'Sort the groups by doses per crate, descending, and fill slots from the richest group downward, taking min(group count, slots left) from each. An exchange swap — trade any loaded crate for a richer unloaded one — shows no other loading does better.',
        'total = 0; slots = capacity; for count, doses in manifest sorted by doses descending: take = min(count, slots); total += take * doses; slots -= take; break early when slots reaches 0. Return total.',
      ],
      functionName: 'max_doses',
      starterCode: `def max_doses(manifest: list[list[int]], capacity: int) -> int:
    pass
`,
      solution: {
        code: `def max_doses(manifest: list[list[int]], capacity: int) -> int:
    total = 0
    slots = capacity
    # Richest crates first. Every crate costs the same single slot,
    # so doses-per-crate is the only thing distinguishing them.
    for count, doses in sorted(manifest, key=lambda g: -g[1]):
        if slots == 0:
            break  # the hold is full; nothing further can help
        take = min(count, slots)  # load as many of this group as fit
        total += take * doses
        slots -= take
    return total
`,
        commentary: `
This is the knapsack family in its one degenerate corner where greedy is *provably* right: every item has the **same size** (one slot). The general 0/1 knapsack defeats greedy because a dense item can waste capacity that two medium items would have used perfectly — choices interact through leftover space. Here there is no leftover space to fight over: any \`capacity\` crates fill the hold equally well, so the only question is *which* crates, and that is settled crate-by-crate.

The exchange argument is one swap long. Suppose some optimal loading flies a crate with \`d\` doses while a crate with \`D > d\` doses sits in the warehouse. Swap them: the slot count is unchanged and the dose total rises by \`D - d > 0\` — contradicting optimality. So an optimal loading takes crates in non-increasing dose order, which is exactly what the sort-and-fill loop does. The grouping is purely a compression: taking \`min(count, slots)\` from a group is the same as deciding each identical crate individually.

The early \`break\` is more than politeness — with up to 10^6 crates per group, looping per crate instead of per group would blow the time budget; arithmetic on whole groups keeps the sweep linear in the number of groups.
`,
        complexity: 'Time O(n log n) for the sort plus an O(n) sweep over groups, Space O(n) for the sorted copy',
        subgoals: [
          {
            lineRange: [1, 3],
            referenceLabel: 'Initialize the running total and the remaining budget',
            acceptableKeywords: ['accumulate the value', 'remaining capacity left', 'start total at zero', 'track free budget'],
            hint: 'What two quantities do you carry while filling a fixed budget?',
            misconception: 'This is the running state, not the ordering or the take logic.',
          },
          {
            lineRange: [4, 6],
            referenceLabel: 'Process groups from densest to least dense',
            acceptableKeywords: ['sort by value descending', 'richest items first', 'iterate by density', 'highest payoff per slot first'],
            hint: 'When every item costs the same one unit, which order maximizes value?',
            misconception: 'Equal-size items make value-per-item the only sort key; order is the whole proof.',
          },
          {
            lineRange: [7, 8],
            referenceLabel: 'Stop early once the budget is fully spent',
            acceptableKeywords: ['break when budget empty', 'no capacity left stop', 'budget exhausted', 'early termination'],
            hint: 'Once no budget remains, why keep looping?',
            misconception: 'This is an early exit on a full budget, not a per-group take.',
          },
          {
            lineRange: [9, 11],
            referenceLabel: 'Take as many of this group as fit and charge them to the budget',
            acceptableKeywords: ['take min of count and slots', 'add value times taken', 'spend the budget', 'load what fits'],
            hint: 'How many of this group do you take, and how does that update total and budget?',
            misconception: 'The take is capped by both the group size and the remaining budget — not the whole group blindly.',
          },
          {
            lineRange: [12, 12],
            referenceLabel: 'Report the maximized total value',
            acceptableKeywords: ['return the total', 'final accumulated value', 'output the sum', 'report the maximum'],
            hint: 'After filling the budget, what is the answer?',
            misconception: 'This returns the accumulated value, not a count of items.',
          },
        ],
      },
      testCases: [
        { input: [[[3, 50], [2, 80], [4, 20]], 5], expected: 310, label: 'mixed manifest, slots run out' },
        { input: [[[5, 9]], 10], expected: 45, label: 'supply shorter than capacity' },
        { input: [[[1, 10]], 0], expected: 0, label: 'zero slots' },
        { input: [[], 12], expected: 0, hidden: true, label: 'empty manifest' },
        { input: [[[2, 30], [2, 30], [1, 100]], 3], expected: 160, hidden: true, label: 'tied groups behind a jackpot' },
        { input: [[[4, 7], [1, 7], [2, 7]], 5], expected: 35, hidden: true, label: 'all groups equally dense' },
        { input: [[[1000, 1], [1, 1000]], 2], expected: 1001, hidden: true, label: 'one rich crate plus filler' },
        { input: [[[3, 5], [2, 6], [1, 4]], 4], expected: 22, hidden: true, label: 'partial take from a group' },
      ],
      furtherPractice: [
        { name: 'LeetCode 1710. Maximum Units on a Truck', note: 'the same density sort' },
        { name: 'LeetCode 2279. Maximum Bags With Full Capacity of Rocks', note: 'cheapest-first is the mirror image' },
        { name: 'LeetCode 1005. Maximize Sum Of Array After K Negations', note: 'greedy on sorted value, with a twist at zero' },
      ],
    },
    {
      id: 'greenhouse-nozzles',
      title: 'Misting the Propagation Bench',
      difficulty: 'medium',
      statement: `
A long propagation bench runs down one wall of a commercial greenhouse. Each seedling tray on the bench needs mist across a span of the bench: \`trays[k] = [left_k, right_k]\` in centimetres, **ends inclusive**. The irrigation crew mounts fixed misting nozzles above the bench; a nozzle mounted at position \`x\` waters every tray whose span contains \`x\`, including trays whose span starts or ends exactly at \`x\`.

Given \`trays\`, return the **minimum number of nozzles** needed to water every tray. Spans may overlap arbitrarily, may be nested inside one another, and may be single points (\`left == right\`).

Up to 100,000 trays can sit on the bench, so trying candidate nozzle layouts by brute force is hopeless.
`,
      examples: [
        {
          input: 'trays = [[1, 6], [2, 8], [7, 12], [10, 16]]',
          output: '2',
          explanation:
            'A nozzle at 6 waters [1, 6] and [2, 8]; a nozzle at 12 waters [7, 12] and [10, 16]. No single position lies inside all four spans, so one nozzle cannot suffice.',
        },
        {
          input: 'trays = [[1, 2], [3, 4], [5, 6], [7, 8]]',
          output: '4',
          explanation: 'The spans are pairwise disjoint — every tray needs its own nozzle.',
        },
        {
          input: 'trays = [[1, 4], [4, 7]]',
          output: '1',
          explanation: 'Ends are inclusive, so a nozzle at exactly 4 catches both trays.',
        },
      ],
      constraints: [
        '0 <= len(trays) <= 100_000',
        '0 <= left_k <= right_k <= 10^9',
        'A nozzle at x waters tray [l, r] exactly when l <= x <= r',
      ],
      hints: [
        'One nozzle can water a whole cluster of trays, but only from a position inside every one of their spans. Within a single tray\'s span, are all mounting positions equally useful, or does one direction dominate?',
        'Sort trays by RIGHT end. Sweep in that order; whenever a tray is still dry, mount a nozzle exactly at its right end — pushed as far right as that tray allows, it catches the most later-ending trays. Then skip every tray containing that position.',
        'count = 0; nozzle = -infinity; for [l, r] in trays sorted by r: if l > nozzle, then count += 1 and nozzle = r. Return count. Because ends are inclusive, a tray with l == nozzle is already watered.',
      ],
      functionName: 'min_misting_nozzles',
      starterCode: `def min_misting_nozzles(trays: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `def min_misting_nozzles(trays: list[list[int]]) -> int:
    count = 0
    nozzle = float("-inf")  # position of the most recently mounted nozzle
    # Earliest right end first: the tray that ends soonest constrains
    # placement the most, so it dictates where the next nozzle goes.
    for left, right in sorted(trays, key=lambda t: t[1]):
        if left > nozzle:
            # This tray is dry. Mount a nozzle at its RIGHT end — the
            # farthest-right point it permits — so the new nozzle also
            # reaches as many later-ending trays as possible.
            count += 1
            nozzle = right
        # Otherwise left <= nozzle, and since we sweep by right end,
        # nozzle <= right too — the existing nozzle already waters it.
    return count
`,
        commentary: `
This is the *stabbing* problem — pick the fewest points so every interval contains one — and it is the mirror image of interval scheduling. A nozzle can serve any cluster of trays whose spans share a common point, so minimizing nozzles means hitting every span with as few points as possible.

The greedy claim: the first nozzle may as well sit at the right end of the **earliest-ending** tray, call it \`r1\`. Exchange argument: any valid layout must water that tray, so it owns a nozzle at some \`x <= r1\`. Slide that nozzle right to \`r1\`: every tray it watered has \`left <= x <= r1\` and, because no tray ends before \`r1\`, also \`right >= r1\` — so each one still contains \`r1\`. The slide loses nothing and possibly gains coverage. After committing to \`r1\`, the trays it misses all have \`left > r1\`, forming a strictly smaller instance, and induction finishes the proof.

Correctness of the sweep hinges on a quiet invariant: when a tray is examined, \`nozzle\` is the right end of some earlier-ending tray, so \`nozzle <= right\` always holds. That is why a single comparison \`left > nozzle\` decides coverage — no need to check the other side. The inclusive boundary is encoded in the strict \`>\`; flipping it to \`>=\` would wrongly buy a second nozzle for trays that merely touch, exactly the kind of off-by-one the hidden tests probe.
`,
        complexity: 'Time O(n log n) for the sort plus an O(n) sweep, Space O(n) for the sorted copy',
        subgoals: [
          {
            lineRange: [1, 3],
            referenceLabel: 'Initialize the point count and the last-placed position',
            acceptableKeywords: ['count of points placed', 'most recent stab position', 'start count at zero', 'remember last point'],
            hint: 'What two values track how many points you have placed and where the latest one sits?',
            misconception: 'This is the running state, not the sort order or the coverage test.',
          },
          {
            lineRange: [4, 6],
            referenceLabel: 'Process intervals ordered by their right end',
            acceptableKeywords: ['sort by right end', 'earliest finisher first', 'iterate by closing edge', 'order by upper bound'],
            hint: 'Which endpoint do you sort on so the tightest interval dictates placement?',
            misconception: 'Sorting by right end is what makes the single-comparison coverage test valid.',
          },
          {
            lineRange: [7, 14],
            referenceLabel: 'Place a point at the right edge of any still-uncovered interval',
            acceptableKeywords: ['uncovered interval needs a point', 'place at the right end', 'commit a new point', 'skip already-covered intervals'],
            hint: 'When an interval is not yet hit, where do you put the new point to also catch the most future intervals?',
            misconception: 'A point goes only at the right edge of a dry interval; intervals already containing the last point are silently covered.',
          },
          {
            lineRange: [15, 15],
            referenceLabel: 'Report the minimum number of points placed',
            acceptableKeywords: ['return the count', 'number of points', 'final tally', 'output the minimum'],
            hint: 'After the sweep, what single number is the answer?',
            misconception: 'This returns the count of points, not their positions.',
          },
        ],
      },
      testCases: [
        { input: [[[1, 6], [2, 8], [7, 12], [10, 16]]], expected: 2, label: 'two clusters' },
        { input: [[[1, 2], [3, 4], [5, 6], [7, 8]]], expected: 4, label: 'pairwise disjoint spans' },
        { input: [[[1, 4], [4, 7], [7, 10]]], expected: 2, label: 'chained boundary touches' },
        { input: [[[3, 9]]], expected: 1, label: 'single tray' },
        { input: [[]], expected: 0, hidden: true, label: 'empty bench' },
        { input: [[[5, 5], [5, 5], [5, 5]]], expected: 1, hidden: true, label: 'identical point spans' },
        { input: [[[1, 10], [2, 3], [4, 5]]], expected: 2, hidden: true, label: 'nested spans' },
        { input: [[[0, 2], [1, 3], [2, 4], [3, 5]]], expected: 2, hidden: true, label: 'sliding staircase' },
      ],
      furtherPractice: [
        { name: 'LeetCode 452. Minimum Number of Arrows to Burst Balloons', note: 'the canonical stabbing greedy' },
        { name: 'LeetCode 757. Set Intersection Size At Least Two', note: 'stabbing where every interval needs TWO points' },
        { name: 'LeetCode 435. Non-overlapping Intervals', note: 'the dual problem — same sort, opposite question' },
      ],
    },
    {
      id: 'dye-lot-cuts',
      title: 'Cutting the Dye-Lot Bolt',
      difficulty: 'medium',
      statement: `
A textile mill prints a continuous bolt of fabric one metre at a time; metre \`i\` is stamped with a dye-lot code, a lowercase letter \`lots[i]\`. Different metres can share a code, and metres with the same code must cure together: when the bolt is cut into contiguous pieces, every metre carrying a given code has to land in the **same piece**.

Cut the bolt into **as many pieces as possible** under that rule, and return the piece lengths **in order from the left end of the bolt to the right**. The maximal cutting is unique, so the answer is fully determined.

The bolt can run to 100,000 metres, so weighing alternative cuttings against each other is not viable.
`,
      examples: [
        {
          input: 'lots = "srsrtt"',
          output: '[4, 2]',
          explanation:
            'Codes s and r interleave across metres 0–3, so those four metres must share a piece; the two t metres stand alone as a second piece. No legal cutting produces three pieces.',
        },
        {
          input: 'lots = "abc"',
          output: '[1, 1, 1]',
          explanation: 'No code repeats, so every metre can be its own piece.',
        },
        {
          input: 'lots = "aba"',
          output: '[3]',
          explanation: 'The two a metres pin both ends of the bolt, dragging the b in with them.',
        },
      ],
      constraints: [
        '1 <= len(lots) <= 100_000',
        'lots contains only lowercase English letters',
        'Pieces must be contiguous and their lengths must sum to len(lots)',
      ],
      hints: [
        'Pick any single metre and ask: how far to the right must the piece containing it stretch, at a minimum? Whose positions in the bolt decide that?',
        'Precompute each letter\'s LAST index in one pass. Then sweep left to right growing a candidate piece while maintaining the farthest last-index among the letters seen so far in this piece. At some index a legal cut becomes possible — which one?',
        'When the sweep index i equals the maintained farthest last-index, no letter in the current piece appears again to the right — cut after metre i, record i - piece_start + 1, and start the next piece at i + 1.',
      ],
      functionName: 'dye_lot_cuts',
      starterCode: `def dye_lot_cuts(lots: str) -> list[int]:
    pass
`,
      solution: {
        code: `def dye_lot_cuts(lots: str) -> list[int]:
    # Where each dye-lot code appears for the LAST time. A piece that
    # contains any metre of a code must extend at least this far.
    last = {c: i for i, c in enumerate(lots)}
    pieces = []
    piece_start = 0  # leftmost metre of the piece being grown
    reach = 0        # farthest metre the current piece is obliged to include
    for i, c in enumerate(lots):
        # Every code seen inside this piece drags the cut at least out
        # to that code's final occurrence.
        reach = max(reach, last[c])
        if i == reach:
            # No code in the current piece occurs again to the right:
            # cutting after metre i is legal — and cutting earlier
            # was not, because some obligation reached past there.
            pieces.append(i - piece_start + 1)
            piece_start = i + 1
    return pieces
`,
        commentary: `
The rule "all metres of a code share a piece" turns each letter into an *obligation interval* from its first occurrence to its last. A cut is legal exactly where no obligation interval crosses it. So the question becomes: how many legal cut points are there — and the greedy answer is to **cut at the very first legal point, every time**.

Why is the earliest cut safe rather than short-sighted? Two observations. First, it is a *lower bound*: any valid cutting's first piece must contain metre 0, hence must extend to the last occurrence of every code it absorbs along the way — the running \`reach\` is precisely that forced extent, so no valid first piece can end before the index where \`i == reach\`. Second, it is *harmless*: cutting exactly there leaves a suffix whose obligations are entirely disjoint from the prefix (nothing in the suffix refers back), so the remaining problem is a fresh, independent instance. Earliest-cut therefore dominates every alternative — any other valid cutting's pieces are unions of consecutive greedy pieces, which also explains why the maximal cutting is unique.

The mechanism is the same frontier number as a reach scan, but pointed at a different job: \`reach\` tracks not "how far *can* I go" but "how far *must* I go" — an obligation horizon. When the sweep index catches the horizon, the piece has discharged every promise it made, and committing the cut is final. One subtlety worth internalizing: \`reach\` never resets between pieces, but it never needs to — at a cut point \`i == reach\`, every later letter's first occurrence is past \`i\`, so the next piece's first metre immediately pushes \`reach\` beyond it.
`,
        complexity: 'Time O(n) — one pass to map last occurrences, one pass to cut, Space O(1) beyond the output (at most 26 map entries)',
        subgoals: [
          {
            lineRange: [1, 7],
            referenceLabel: 'Record each symbol\'s final position and open the first segment',
            acceptableKeywords: ['last index of each symbol', 'map final occurrences', 'init segment start', 'precompute obligations'],
            hint: 'Before cutting, what do you need to know about how far each symbol reaches?',
            misconception: 'This precomputes the obligation horizons and segment state; no cut is made yet.',
          },
          {
            lineRange: [8, 11],
            referenceLabel: 'Sweep, pushing the obligation horizon to each symbol\'s last occurrence',
            acceptableKeywords: ['extend the required reach', 'farthest last index so far', 'grow the obligation horizon', 'update how far the piece must go'],
            hint: 'As you read each position, how far is the current segment now forced to extend?',
            misconception: 'This tracks how far the segment MUST reach, distinct from the cut decision itself.',
          },
          {
            lineRange: [12, 17],
            referenceLabel: 'Cut at the first index where the segment owes nothing further right',
            acceptableKeywords: ['index meets the horizon cut', 'close the piece here', 'record the length', 'start the next segment'],
            hint: 'When the scan index catches the horizon, what can you finally do?',
            misconception: 'The cut is legal only when index equals the horizon — cutting earlier would split a symbol across pieces.',
          },
          {
            lineRange: [18, 18],
            referenceLabel: 'Report the ordered segment lengths',
            acceptableKeywords: ['return the piece lengths', 'output the segments in order', 'list of lengths', 'final result'],
            hint: 'After the sweep, what collection is the answer?',
            misconception: 'This returns the ordered lengths, not the cut positions themselves.',
          },
        ],
      },
      testCases: [
        { input: ['srsrtt'], expected: [4, 2], label: 'interleaved codes then a clean pair' },
        { input: ['abc'], expected: [1, 1, 1], label: 'all distinct codes' },
        { input: ['zzzz'], expected: [4], label: 'one code, one piece' },
        { input: ['a'], expected: [1], hidden: true, label: 'single metre' },
        { input: ['xyxxyzzt'], expected: [5, 2, 1], hidden: true, label: 'three pieces of shrinking size' },
        { input: ['aba'], expected: [3], hidden: true, label: 'ends pinned by one code' },
        { input: ['noonmoon'], expected: [8], hidden: true, label: 'obligations chain across the whole bolt' },
      ],
      furtherPractice: [
        { name: 'LeetCode 763. Partition Labels', note: 'the same obligation-horizon cut' },
        { name: 'LeetCode 56. Merge Intervals', note: 'the obligation intervals, merged explicitly' },
        { name: 'LeetCode 1024. Video Stitching', note: 'frontier sweeps with a different objective' },
      ],
    },
    {
      id: 'festival-generators',
      title: 'Powering the Night Market',
      difficulty: 'medium',
      statement: `
A night-market organizer rents diesel generators for food stalls. Stall bookings arrive as \`bookings[k] = [plug_in_k, unplug_k]\` in minutes after the gates open: the stall draws power from minute \`plug_in_k\` up to **but not including** minute \`unplug_k\`. Generators are interchangeable, each powers one stall at a time, and handoffs are instant — a stall unplugging at minute \`t\` frees its generator for another stall plugging in at minute \`t\`.

Return the **minimum number of generators** the organizer must rent so that every stall has power for its entire booking.

Up to 100,000 bookings can arrive, so comparing every pair of bookings for overlap is too slow.
`,
      examples: [
        {
          input: 'bookings = [[0, 30], [5, 10], [15, 20]]',
          output: '2',
          explanation:
            'The long booking overlaps each short one, but the short ones never overlap each other — two machines cover the night.',
        },
        {
          input: 'bookings = [[1, 5], [5, 9], [9, 12]]',
          output: '1',
          explanation: 'Perfect handoffs at minutes 5 and 9: one generator serves all three stalls.',
        },
        {
          input: 'bookings = [[0, 10], [0, 10], [0, 10]]',
          output: '3',
          explanation: 'Three simultaneous draws need three machines, no matter how they are assigned.',
        },
      ],
      constraints: [
        '0 <= len(bookings) <= 100_000',
        '0 <= plug_in < unplug <= 10^9 for every booking',
        'Bookings are half-open: unplugging at minute t and plugging in at minute t can share a generator',
      ],
      hints: [
        'Freeze the whole market at one particular minute and count how many stalls are drawing power right then. What does that single snapshot tell you about any rental plan, however clever its handoffs?',
        'The answer is exactly the peak number of simultaneously live bookings. Turn each booking into two events — plug-in (+1) and unplug (−1) — and sort all events by time, resolving ties so unplugs land before plug-ins.',
        'Sweep the sorted events with a running count of live bookings and track its maximum. Sorting (time, delta) tuples puts −1 before +1 at equal times, which encodes the instant handoff. Return the maximum.',
      ],
      functionName: 'min_generators',
      starterCode: `def min_generators(bookings: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `def min_generators(bookings: list[list[int]]) -> int:
    events = []
    for plug_in, unplug in bookings:
        events.append((plug_in, 1))   # a stall starts drawing power
        events.append((unplug, -1))   # a stall releases its generator
    # Sort by time; at the same minute the tuple order puts unplugs
    # (-1) before plug-ins (+1), so an instant handoff is never
    # double-counted as an overlap.
    events.sort()
    live = 0  # bookings drawing power right now
    peak = 0  # the most that were ever live at once
    for _time, delta in events:
        live += delta
        peak = max(peak, live)
    return peak
`,
        commentary: `
The pull toward simulating generator assignments is strong — track machines, hand them out, recycle them. The greedy reframe: the fleet size is forced by a single number, the **peak concurrency**, and no assignment cleverness can beat it or fail to achieve it.

*Lower bound.* At the minute where \`live\` peaks, that many stalls draw power simultaneously; each needs its own machine at that instant, so every valid plan rents at least \`peak\` generators.

*Achievability.* With exactly \`peak\` machines, process events in time order and hand each plugging-in stall **any** free generator. A free one always exists: just before the handout, the number of busy machines equals the current live count minus one, which is strictly below \`peak\` by definition of the maximum. The lower bound meets the construction, so \`peak\` is the answer — a *bound-meets-greedy* proof, the pattern's other major proof style alongside the exchange argument.

The half-open semantics live entirely in the tie-break. Python's tuple sort puts \`(t, -1)\` before \`(t, 1)\`, so a stall unplugging at minute \`t\` decrements \`live\` before the minute-\`t\` plug-in increments it — back-to-back bookings cost one machine, not two. Flip that order and every clean handoff phantom-rents an extra generator; this single comparison is where most wrong submissions die. The sweep is \`O(n log n)\` against \`O(n^2)\` for pairwise overlap counting, and unlike the pairwise approach it directly produces the *simultaneous* maximum rather than a tangle of overlap pairs.
`,
        complexity: 'Time O(n log n) for sorting 2n events plus a linear sweep, Space O(n) for the event list',
        subgoals: [
          {
            lineRange: [1, 5],
            referenceLabel: 'Split each interval into a start (+1) and an end (−1) event',
            acceptableKeywords: ['expand intervals into events', 'plus one on start', 'minus one on end', 'build delta events'],
            hint: 'How do you turn each interval into two timeline markers?',
            misconception: 'This only generates the events; the concurrency count is computed later.',
          },
          {
            lineRange: [6, 9],
            referenceLabel: 'Order events by time, breaking ties so releases precede starts',
            acceptableKeywords: ['sort events by time', 'ends before starts on ties', 'tuple order encodes handoff', 'order the timeline'],
            hint: 'At the same instant, should an ending or a starting event be processed first?',
            misconception: 'The tie-break is the whole half-open semantics — ends must land before starts or handoffs double-count.',
          },
          {
            lineRange: [10, 14],
            referenceLabel: 'Sweep the timeline tracking concurrency and its maximum',
            acceptableKeywords: ['running live count', 'track the peak', 'accumulate the deltas', 'maximum overlap so far'],
            hint: 'As you walk the events, what running value and what high-water mark do you keep?',
            misconception: 'The answer is the peak of the running count, not the final running count.',
          },
          {
            lineRange: [15, 15],
            referenceLabel: 'Report the peak concurrency',
            acceptableKeywords: ['return the peak', 'maximum simultaneous count', 'highest overlap', 'output the max'],
            hint: 'After the sweep, which value is the required minimum?',
            misconception: 'This returns the peak overlap, which equals the minimum resources needed.',
          },
        ],
      },
      testCases: [
        { input: [[[0, 30], [5, 10], [15, 20]]], expected: 2, label: 'one long booking under two short ones' },
        { input: [[[1, 5], [5, 9], [9, 12]]], expected: 1, label: 'instant handoffs' },
        { input: [[[0, 10], [0, 10], [0, 10]]], expected: 3, label: 'identical simultaneous bookings' },
        { input: [[]], expected: 0, hidden: true, label: 'no bookings' },
        { input: [[[5, 6]]], expected: 1, hidden: true, label: 'single one-minute booking' },
        { input: [[[1, 4], [2, 6], [3, 8], [5, 9]]], expected: 3, hidden: true, label: 'staggered triple overlap' },
        { input: [[[10, 20], [19, 30], [30, 40], [15, 17]]], expected: 2, hidden: true, label: 'mixed touches and overlaps' },
        { input: [[[0, 1000000000], [1, 2], [3, 4], [5, 6]]], expected: 2, hidden: true, label: 'all-night booking plus brief visitors' },
      ],
      furtherPractice: [
        { name: 'LeetCode 253. Meeting Rooms II', note: 'the canonical peak-concurrency sweep' },
        { name: 'LeetCode 1094. Car Pooling', note: 'events with weights against a fixed capacity' },
        { name: 'LeetCode 731. My Calendar II', note: 'concurrency capped at two, queried online' },
      ],
    },
    {
      id: 'chess-row-booklets',
      title: 'Booklets Along the Boards',
      difficulty: 'hard',
      statement: `
After a weekend tournament, a chess academy seats its students in one long row in fixed board order, and the coach walks the row handing out puzzle booklets. House rules:

- every student receives **at least one** booklet, and
- any student whose tournament rating is **strictly higher** than an immediate neighbour's must receive **strictly more** booklets than that neighbour.

Students with equal ratings may receive any counts relative to each other — equality imposes nothing. Given \`ratings\` in seating order, return the **minimum total number of booklets** the coach must hand out.

The row can seat up to 100,000 students, so searching over assignments is out of the question.
`,
      examples: [
        {
          input: 'ratings = [3, 6, 4]',
          output: '4',
          explanation:
            'Hand out 1, 2, 1. The middle student out-rates both neighbours and out-receives them; no smaller total satisfies both comparisons.',
        },
        {
          input: 'ratings = [5, 5, 5, 5]',
          output: '4',
          explanation: 'Equal ratings impose nothing, so everyone gets the single mandatory booklet.',
        },
        {
          input: 'ratings = [5, 4, 3, 4, 5]',
          output: '11',
          explanation:
            'The valley forces 3, 2, 1, 2, 3: each step away from the bottom of the valley stacks one more strict requirement.',
        },
      ],
      constraints: [
        '0 <= len(ratings) <= 100_000',
        '0 <= ratings[i] <= 10^9',
        'Only immediate neighbours are compared; equal ratings carry no requirement',
      ],
      hints: [
        'Work the row [5, 4, 3, 4, 5] by hand. The student at the bottom of the valley clearly gets one booklet — then watch the requirement climb as you walk away from the valley in either direction. What feature of the row measures how high it climbs?',
        'Each student\'s count is forced by two independent quantities: the strictly-increasing run arriving from the left, and the strictly-decreasing run continuing to the right. One directional scan computes each. How must the two combine at a student who tops both?',
        'give = [1] * n. Left-to-right: if ratings[i] > ratings[i-1], set give[i] = give[i-1] + 1. Then right-to-left: if ratings[i] > ratings[i+1], set give[i] = max(give[i], give[i+1] + 1) — the max keeps peaks satisfying BOTH sides. Return sum(give).',
      ],
      functionName: 'min_booklets',
      starterCode: `def min_booklets(ratings: list[int]) -> int:
    pass
`,
      solution: {
        code: `def min_booklets(ratings: list[int]) -> int:
    n = len(ratings)
    if n == 0:
        return 0
    give = [1] * n  # everyone starts at the mandatory single booklet
    # Pass 1 — settle every LEFT-neighbour requirement. Walking
    # rightwards, a strict rise must hand out one more than the
    # previous student; anything else resets to the floor of 1.
    for i in range(1, n):
        if ratings[i] > ratings[i - 1]:
            give[i] = give[i - 1] + 1
    # Pass 2 — settle every RIGHT-neighbour requirement without
    # breaking pass 1. Walking leftwards, a strict rise (relative to
    # the right neighbour) must beat that neighbour's count. Taking
    # the max keeps whichever requirement is taller, so a peak ends
    # up satisfying both of its downhill sides at once.
    for i in range(n - 2, -1, -1):
        if ratings[i] > ratings[i + 1]:
            give[i] = max(give[i], give[i + 1] + 1)
    return sum(give)
`,
        commentary: `
A single left-to-right pass cannot work, and seeing *why* is most of the problem. When the scan stands at the top of a descent — say ratings \`[9, 8, 7, 6]\` — the first student's count depends on how long the descent runs, information that lives entirely to the right. Any one-directional rule either overpays everywhere or violates a constraint at the bottom of long downhills.

The fix is to notice the constraints **decompose by direction**. "Strictly more than my left neighbour when I out-rate them" chains only along ascents read left-to-right; "strictly more than my right neighbour" chains only along ascents read right-to-left. Each chain is solved greedily by the tightest assignment: climb by exactly one booklet per strict rise, reset to the floor of 1 otherwise. Pass 1 produces, at every seat, exactly the length of the strictly-increasing run arriving from the left; pass 2 produces the run continuing from the right.

Why \`max\` rather than sum or anything cleverer: a student who tops an ascent of length \`a\` on the left needs at least \`a\` booklets (each step of the chain forces +1 from a floor of 1), and symmetrically at least \`b\` from the right — so \`max(a, b)\` is a **lower bound** at every seat independently. The two passes construct an assignment that hits that bound pointwise and violates nothing: at each comparison the taller requirement subsumes the shorter, and equal ratings break every chain by design. An assignment meeting a pointwise lower bound everywhere is minimal in total — bound-meets-construction, no exchange needed.

The greedy fingerprint here is unusual: not one sort-and-sweep but two opposing sweeps, each carrying one number of state, combined by \`max\`. Forgetting the \`max\` (overwriting pass 1 at peaks) is the classic bug — it satisfies the right side while silently un-satisfying the left.
`,
        complexity: 'Time O(n) — two linear passes plus a sum, Space O(n) for the per-student counts',
        subgoals: [
          {
            lineRange: [1, 5],
            referenceLabel: 'Handle the empty case and start every element at the mandatory floor',
            acceptableKeywords: ['guard empty input', 'everyone gets the minimum', 'init all to one', 'baseline allocation'],
            hint: 'Before applying any neighbour rule, what does every element get, and what trivial input exits early?',
            misconception: 'This is the floor allocation and empty guard, before any neighbour constraint is enforced.',
          },
          {
            lineRange: [6, 11],
            referenceLabel: 'Left-to-right pass: raise on a strict rise over the previous element',
            acceptableKeywords: ['forward pass settles left side', 'increase over the left neighbour', 'climb on a left ascent', 'one more than predecessor'],
            hint: 'Sweeping forward, when must an element exceed the one before it, and by how much?',
            misconception: 'The forward pass only satisfies left-neighbour constraints; the right side is unsettled until the next pass.',
          },
          {
            lineRange: [12, 19],
            referenceLabel: 'Right-to-left pass: raise over the next element while keeping the forward result',
            acceptableKeywords: ['backward pass settles right side', 'take the max of both requirements', 'climb on a right ascent', 'preserve the earlier pass'],
            hint: 'Sweeping backward, how do you enforce the right-neighbour rule without undoing the forward pass?',
            misconception: 'The max is essential — overwriting instead of maxing un-satisfies the left side at peaks.',
          },
          {
            lineRange: [20, 20],
            referenceLabel: 'Report the total allocation',
            acceptableKeywords: ['sum the allocations', 'return the total', 'add up every count', 'final aggregate'],
            hint: 'After both passes, what aggregate is the answer?',
            misconception: 'This sums the per-element counts; it is not itself one of the constraint passes.',
          },
        ],
      },
      testCases: [
        { input: [[3, 6, 4]], expected: 4, label: 'single peak' },
        { input: [[5, 5, 5, 5]], expected: 4, label: 'all ratings equal' },
        { input: [[5, 4, 3, 4, 5]], expected: 11, label: 'symmetric valley' },
        { input: [[1, 2, 3, 4]], expected: 10, hidden: true, label: 'pure ascent' },
        { input: [[4, 3, 2, 1]], expected: 10, hidden: true, label: 'pure descent' },
        { input: [[1, 3, 2, 2, 1]], expected: 7, hidden: true, label: 'plateau breaks the chain' },
        { input: [[]], expected: 0, hidden: true, label: 'empty row' },
        { input: [[8]], expected: 1, hidden: true, label: 'single student' },
        { input: [[2, 9, 9, 2]], expected: 6, hidden: true, label: 'twin peaks with equal tops' },
      ],
      furtherPractice: [
        { name: 'LeetCode 135. Candy', note: 'the canonical two-pass neighbour greedy' },
        { name: 'LeetCode 42. Trapping Rain Water', note: 'the same opposing-sweeps-plus-combine shape' },
        { name: 'LeetCode 738. Monotone Increasing Digits', note: 'neighbour constraints resolved by a backward fix-up' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt: 'What does an exchange argument actually establish about a greedy algorithm?',
      choices: [
        'That the greedy algorithm runs asymptotically faster than the equivalent dynamic program',
        'That any optimal solution can be transformed, one harmless swap at a time, into the greedy solution — so the greedy output is itself optimal',
        'That the greedy solution is the unique optimal solution to the problem',
        'That every locally best choice is also globally best in any optimization problem',
      ],
      correctIndex: 1,
      explanation:
        'The exchange argument is a correctness proof, not a performance claim: wherever an optimal solution OPT disagrees with the greedy rule, you show swapping in the greedy choice never makes OPT worse, and repeated swaps morph OPT into the greedy answer. It says nothing about speed (choice 1), does not imply uniqueness — other optima may exist (choice 3) — and is precisely the thing that FAILS for problems like arbitrary coin change, so choice 4 is the dangerous overgeneralization the proof exists to prevent.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt:
        'For maximizing the COUNT of non-overlapping intervals, why is "earliest finish time" the correct greedy key rather than "earliest start" or "shortest duration"?',
      choices: [
        'Earliest start maximizes how early the resource begins earning',
        'Shortest intervals always conflict with the fewest other intervals',
        'The interval that ends first leaves the largest possible remaining free window, and an exchange swap shows replacing any optimal first pick with it never reduces the count',
        'Sorting by finish time is the only one of the three orders computable in O(n log n)',
      ],
      correctIndex: 2,
      explanation:
        'Only earliest-finish admits the exchange swap: the earliest finisher ends no later than any alternative first pick, so the rest of any optimal schedule still fits after the swap. Earliest start fails on a marathon interval that arrives first and blocks the day; shortest-first fails on a short interval straddling two long ones (it kills two to gain one), so choice 2 is simply false. All three sort keys cost the same O(n log n), so choice 4 distinguishes nothing.',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt: 'What is the total cost of the max-count interval scheduling greedy on n intervals?',
      choices: [
        'O(n log n) — the end-time sort dominates; the accept/skip sweep is linear with O(1) state',
        'O(n) — a single scan with no sorting required',
        'O(n^2) — every pair of intervals must be compared for overlap',
        'O(2^n) — all subsets of intervals must be considered',
      ],
      correctIndex: 0,
      explanation:
        'Sorting by end time costs O(n log n), and the sweep then makes one O(1) accept/skip decision per interval against a single watermark. O(n) is impossible in general because the intervals arrive unsorted; pairwise comparison (choice 3) and subset enumeration (choice 4) are exactly the brute-force costs the greedy proof lets you skip.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'The refuel-style greedy banks passed stations in a max-heap and pops one per forced stop. With n stations, what is the worst-case time?',
      choices: [
        'O(n) — each station is examined exactly once',
        'O(n^2) — each stop may rescan all banked stations',
        'O(n log n) — every station is pushed and popped at most once, at O(log n) per heap operation',
        'O(log n) — only the heap root is ever touched',
      ],
      correctIndex: 2,
      explanation:
        'The sweep index over stations never moves backward, so each station enters the heap once and leaves at most once: at most 2n heap operations of O(log n) each. Choice 1 ignores the heap maintenance cost; choice 2 describes a naive "rescan for the max" implementation that the heap exists to avoid; choice 4 confuses the cost of one operation with the whole run.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'A vending machine must dispense change for amount 6 using denominations [1, 3, 4] with the fewest coins. Which approach is correct?',
      choices: [
        'Greedy: repeatedly dispense the largest coin that still fits in the remaining amount',
        'Two pointers converging over the sorted denominations',
        'Dynamic programming over amounts 0..6 — the greedy choice property fails here: largest-first gives 4+1+1 (three coins) while 3+3 (two coins) is optimal',
        'Sort denominations descending and binary search the remainder after each coin',
      ],
      correctIndex: 2,
      explanation:
        'Choice 1 is the classic trap: largest-first happens to work for canonical systems like [1, 5, 10, 25], so it feels safe, but [1, 3, 4] breaks it — taking the 4 poisons the remaining subproblem and no exchange swap can repair it. DP over sub-amounts explores the alternatives greedy commits away. Two pointers and binary search (choices 2 and 4) address ordered pair-finding, which is not the structure of coin counting at all.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'A conference has one stage and 50,000 talk proposals with start and end times. The goal is to host as MANY talks as possible. Which approach is correct?',
      choices: [
        'Sort by start time and greedily take each talk that does not clash with the last accepted one',
        'Sort by duration and greedily take shortest talks first',
        'Dynamic programming over bitmask subsets of talks',
        'Sort by end time and accept every talk that starts at or after the end of the last accepted talk',
      ],
      correctIndex: 3,
      explanation:
        'Maximizing a count of compatible intervals is exactly earliest-finish greedy, proved optimal by exchange. Sorting by start (choice 1) is the tempting near-miss — one early, day-long keynote proposal would block everything. Shortest-first (choice 2) fails when a short talk straddles two otherwise compatible ones. Bitmask DP (choice 3) is correct in principle but is 2^50000 — the problem has greedy structure precisely so you can avoid that.',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt:
        'In the "can you reach the end of an array of hop ranges" greedy, what single invariant does the scan maintain?',
      choices: [
        'The farthest index reachable using any combination of the hops seen so far',
        'The minimum number of hops used to get to the current index',
        'The landing position of the most recent hop actually taken',
        'A boolean table marking reachability for every index seen so far',
      ],
      correctIndex: 0,
      explanation:
        'Chains of hops are interchangeable — only maximum depth matters — so one frontier number summarizes every possible routing: index i is reachable iff i <= farthest. The scan fails exactly when the loop index overtakes the frontier. Hop counts (choice 2) answer a different question (minimum jumps), no single "hop taken" exists because the greedy never picks a concrete chain (choice 3), and a full table (choice 4) is the DP the frontier insight makes unnecessary.',
    },
    {
      id: 'q8',
      kind: 'scenario',
      prompt:
        'Booth sessions now each carry a cash payout, and the studio wants the maximum TOTAL PAYOUT from compatible sessions, not the maximum count. What is the right approach?',
      choices: [
        'Keep the earliest-finish greedy unchanged — it maximized the count, so it maximizes payout too',
        'Sort by payout descending and accept every session compatible with those already taken',
        'Sort by end time, then run take/skip DP where "take" adds the session payout to the best result among sessions ending at or before its start (found by binary search)',
        'Sort by duration ascending and accept short sessions first to leave room for more payouts',
      ],
      correctIndex: 2,
      explanation:
        'Attaching weights breaks the exchange argument: swapping in the earliest finisher can now discard a fat payout, so choice 1 fails (two $1 sessions beat one $5 session under count-greedy). Richest-first (choice 2) also fails — one $5 session spanning the day blocks three $2 sessions worth $6. This is weighted interval scheduling, the textbook case where greedy must hand over to DP; sorting by end time plus take/skip with a binary search for the latest compatible predecessor runs in O(n log n).',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Problem says "maximize the NUMBER of non-overlapping intervals" — what is the move?',
      back: 'Sort by end time and sweep once, accepting anything that starts at or after the last accepted end. Earliest finish leaves the most room, and an exchange swap proves it optimal. O(n log n).',
    },
    {
      id: 'f2',
      front: 'What is the exchange argument?',
      back: 'Take any optimal solution and show that swapping its choice for the greedy choice at any point of disagreement never makes it worse. Repeated swaps morph the optimum into the greedy output, proving greedy optimal.',
    },
    {
      id: 'f3',
      front: 'Fast litmus test that greedy is WRONG for a problem?',
      back: 'Hunt for a tiny counterexample or brute-force small inputs and diff. Classic: coins [1, 3, 4], amount 6 — greedy gives 4+1+1 but 3+3 wins. When a choice changes the value of future options, switch to DP.',
    },
    {
      id: 'f4',
      front: 'Typical greedy complexity, and what drives it?',
      back: 'O(n log n): the sort (or heap maintenance) dominates a linear commit-as-you-go sweep with O(1) state. Frontier scans over already-positioned data drop to O(n).',
    },
    {
      id: 'f5',
      front: 'Template move for "can you reach the end" hop-range problems?',
      back: 'One pass tracking farthest = max(farthest, i + hops[i]). If i > farthest you are stranded — return False. Succeed as soon as farthest covers the last index.',
    },
    {
      id: 'f6',
      front: 'Template move for minimum refuel/recharge-style stops?',
      back: 'Sweep forward banking every station within reach in a max-heap. When short, retroactively "stop" at the largest banked option and extend reach. Return -1 if the heap is empty while still short.',
    },
    {
      id: 'f7',
      front: 'Two-array matching (tasks vs workers, parcels vs couriers): the greedy pairing rule?',
      back: 'Sort both ascending. Give the weakest worker the lightest task it can handle; if even the lightest does not fit, that worker gets nothing. Two exchange swaps (no picky weaklings, no idle weaklings) prove it.',
    },
    {
      id: 'f8',
      front: 'Pitfall: sorting intervals by START time for max-count scheduling. Why does it fail?',
      back: 'One early-starting marathon interval blocks many later ones. Earliest FINISH is the safe key — it frees the resource soonest, and the exchange swap only works in that direction.',
    },
    {
      id: 'f9',
      front: 'Intervals now carry payouts and you want max total payout. Still greedy?',
      back: 'No — that is weighted interval scheduling, where the exchange argument breaks. Sort by end time and run take/skip DP, binary searching for the latest compatible predecessor. O(n log n).',
    },
    {
      id: 'f10',
      front: 'Boundary rule of thumb for interval greedies?',
      back: 'Decide explicitly whether touching endpoints clash. Max-count scheduling usually allows back-to-back: accept when start >= last accepted end. This off-by-one is the classic hidden-test killer.',
    },
  ],
  cheatSheet: {
    tldr:
      'Greedy makes the locally best choice by a fixed rule — sort by the right key, sweep once, commit forever — and is only an algorithm (rather than a hunch) when an exchange argument shows that swapping any optimal solution\'s choice for the greedy one never hurts. It shines on counting problems over intervals, deadlines, reach ranges, and paired sorted pools, where one watermark, frontier number, or banked-options heap summarizes the whole past. The moment items carry weights or values to trade off, the exchange swap breaks and dynamic programming takes over.',
    signals: [
      'Reach for this when the goal is a COUNT — "maximize the number of…", "minimum stops/jumps/removals" — rather than a weighted total.',
      'Reach for this when one sort key (end time, deadline, size, position) makes a single commit-as-you-go sweep plausible.',
      'Reach for this when you can state the exchange swap out loud: "replace any optimal choice with mine and nothing gets worse."',
      'Reach for this when pairing two sorted pools (tasks vs workers) or sweeping intervals, deadlines, or hop ranges.',
      'Walk away (toward DP) when items carry values/weights to trade off — weighted intervals, knapsack, arbitrary coin systems — or a small brute-forced counterexample breaks your rule.',
    ],
    template: `# 1) Max-count interval scheduling: sort by END, sweep, commit
count, free_at = 0, float("-inf")
for start, end in sorted(intervals, key=lambda iv: iv[1]):
    if start >= free_at:        # compatible -> take it (exchange-safe)
        count += 1
        free_at = end

# 2) Frontier scan: one number summarizes every chain behind you
farthest = 0
for i, hop in enumerate(hops):
    if i > farthest:
        return False            # stranded: a gap nothing can cross
    farthest = max(farthest, i + hop)
return True

# 3) Banked options: defer commitments, pop the best when forced
# push every option you pass into a max-heap; when short of the
# goal, pop the largest and count one stop (-1 if the heap is empty)`,
    complexity: 'Time O(n log n) (sort or heap dominates; pure frontier scans are O(n)), Space O(1)–O(n).',
  },
}

export default mod
