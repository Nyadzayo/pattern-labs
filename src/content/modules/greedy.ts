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
