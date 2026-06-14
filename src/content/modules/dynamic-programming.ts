import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'dynamic-programming',
  visualizer: 'dp-table',
  concept: `
## The mental model

Picture a spreadsheet. Every cell poses one tiny question — "fewest tokens to assemble exactly 7 credits", "best haul from the first five hives" — and its formula references only cells that were filled in earlier. No cell is ever computed twice: once its value is written, later formulas simply read it. Fill the sheet in dependency order and the answer materializes in the final cell.

That spreadsheet is dynamic programming. The naive recursive solution to these problems is a call **tree** that keeps re-asking identical questions — a plain recursive \`fib(40)\` recomputes \`fib(10)\` over a million times. DP notices that the tree contains only a handful of **distinct** questions and flattens it into a table with one cell per question. The exponential blowup was an illusion; the real problem was polynomial-sized all along.

Two properties must hold before this works:

1. **Overlapping subproblems** — the brute-force recursion revisits the same arguments again and again, so caching pays for itself.
2. **Optimal substructure** — the best answer to the whole problem is built from best answers to subproblems, so a cell can trust the cells it reads.

## Mechanics: state, transition, base case

Designing a DP means answering three questions, in this order:

- **State.** What is the *minimal* information that makes the rest of the problem self-contained? For fewest-coins it is just the remaining amount; for edit distance it is the pair (prefix of A, prefix of B). The acid test: if two different histories that share a state could still lead to different futures, your state is too small — add a dimension.
- **Transition.** A recurrence that expresses each state's answer using strictly "smaller" states: the last decision you could make, branched over all its options.
- **Base cases and answer location.** Which states are trivially known (amount 0 costs 0 tokens; an empty prefix needs j inserts), and which cell holds the final answer.

Then pick one of two execution styles — this is the memoization vs tabulation choice:

**Memoization (top-down)** keeps the recursive solver and bolts a cache onto it. You write the recurrence as a function of the state, and every state is computed at most once. It explores only states actually reachable from the start, and it is usually the fastest thing to write.

\`\`\`python
from functools import lru_cache

def fewest_tokens(faces: list[int], amount: int) -> int:
    @lru_cache(maxsize=None)            # memoization: one cache entry per state
    def best(rem: int) -> float:
        if rem == 0:
            return 0                    # base case: paid exactly
        options = [1 + best(rem - f) for f in faces if f <= rem]
        return min(options) if options else float('inf')
    ans = best(amount)
    return -1 if ans == float('inf') else int(ans)
\`\`\`

**Tabulation (bottom-up)** deletes the recursion entirely: allocate the table, seed the base cases, and loop over states in an order that guarantees every dependency is already filled.

\`\`\`python
dp = [0] + [float('inf')] * amount      # dp[a] = fewest tokens to total a
for a in range(1, amount + 1):
    for f in faces:
        if f <= a:
            dp[a] = min(dp[a], dp[a - f] + 1)
\`\`\`

Same states, same recurrence, same asymptotics. Memoization skips unreachable states but leans on the call stack; tabulation gives you explicit control of evaluation order, never overflows the stack, and makes space tricks (keeping only the last row) trivial.

## When to reach for it

- The ask is phrased as **"count the ways"**, **"minimum/maximum cost"**, **"fewest steps"**, or **"is it possible to reach/partition/segment"**.
- Each choice constrains later choices through a **small summary** — remaining budget, current position, whether the previous item was taken.
- You sketch the brute-force recursion tree and see the **same arguments repeating** at different branches.
- A greedy idea fails an exchange-argument sanity check — for fewest coins with faces \`[1, 5, 12, 19]\` and amount 16, biggest-first pays 5 tokens while the optimum is 4.

When subproblems never repeat (mergesort's halves are all different) caching is dead weight — that is plain divide and conquer. And if the only valid "state" would be the entire history of choices, DP collapses; reformulate or reach for another pattern.

## Complexity

One formula covers everything: **time = number of distinct states × work per transition**. The staircase recurrence has \`O(n)\` states with \`O(1)\` transitions: \`O(n)\` total. Fewest coins is \`O(amount * k)\` time with \`O(amount)\` space. Edit distance fills an (m+1)×(n+1) grid: \`O(m * n)\` time, and because each row reads only the previous row, space drops to \`O(min(m, n))\`. Non-adjacent max sum looks back exactly two cells, so the whole table compresses to two variables: \`O(n)\` time, \`O(1)\` space.

## Common pitfalls

- **State too small.** If the recurrence needs to know something the state doesn't capture (was the previous house robbed? which row am I on?), answers silently corrupt. Add the dimension.
- **Base-case off-by-ones.** Table index \`i\` usually means "first i characters", so the character in play is \`s[i-1]\`. Mixing those up is the classic edit-distance bug.
- **Wrong fill order in tabulation.** Every state must be computed after everything it reads. If a cell looks left and up, fill rows top-to-bottom, left-to-right.
- **Python recursion depth.** A memoized chain of 100,000 states blows the default stack. Convert to tabulation or raise the limit deliberately.
- **Unhashable memo keys.** \`lru_cache\` chokes on lists; pass indices into shared data instead of slices.
- **Leaking the infinity sentinel.** Seed unreachable states with a sentinel, but remember to translate it to \`-1\` (or whatever the contract says) before returning.
- **Coding before stating the recurrence.** If you cannot say the transition out loud in one English sentence, the loop you are about to write is a guess.
`,
  realWorldUses: [
    {
      title: 'Diff engines in version control',
      description:
        'When git shows you a minimal diff between two versions of a file, it is solving an edit-distance-family problem: find the cheapest script of insertions and deletions that transforms one sequence of lines into the other, computed over prefix-pair subproblems exactly like the DP table.',
    },
    {
      title: 'Spell-check and fuzzy search',
      description:
        'Search engines and IDEs rank "did you mean" candidates by Levenshtein distance. Elasticsearch builds Levenshtein automata, and autocorrect pipelines run banded edit-distance DP against dictionary entries millions of times per second.',
    },
    {
      title: 'Genome sequence alignment',
      description:
        'Bioinformatics tools align DNA and protein sequences with Needleman–Wunsch and Smith–Waterman — scoring DP tables over prefix pairs, where match/mismatch/gap penalties replace the unit edit costs. Entire sequencing pipelines stand on these tables.',
    },
  ],
  problems: [
    {
      id: 'rig-ladder-routines',
      title: 'Rig Ladder Routines',
      difficulty: 'easy',
      statement: `
A stage lighting technician climbs a fixed vertical ladder to reach the rig platform. Safety rules allow exactly two kinds of moves: step up **1 rung**, or hop up **2 rungs**. Two climbs count as different routines if the sequence of moves differs at any point — \`[1, 2]\` and \`[2, 1]\` are different routines even though both cover 3 rungs.

Given the number of rungs \`rungs\` between the floor and the platform, return the number of distinct climbing routines that land **exactly** on the platform.

If \`rungs\` is 0, the technician is already on the platform: there is exactly **one** routine (do nothing).

The venue's tallest ladder has 70 rungs, and the booking system calls this function constantly — an exponential solution will time out.
`,
      examples: [
        {
          input: 'rungs = 3',
          output: '3',
          explanation: 'The routines are [1,1,1], [1,2], and [2,1].',
        },
        {
          input: 'rungs = 4',
          output: '5',
          explanation: '[1,1,1,1], [1,1,2], [1,2,1], [2,1,1], [2,2].',
        },
        {
          input: 'rungs = 0',
          output: '1',
          explanation: 'Already on the platform — the empty routine is the only one.',
        },
      ],
      constraints: [
        '0 <= rungs <= 70',
        'Each move is exactly 1 or 2 rungs upward; the climb must finish exactly on the platform',
        'The answer always fits in a 64-bit integer for valid inputs',
      ],
      hints: [
        'List the routines for 3 and 4 rungs by hand. Just before the final move of any routine, on which rung must the technician be standing?',
        'Every routine ends with either a 1-step from rung n-1 or a 2-hop from rung n-2, and those two groups share no routines. So ways(n) = ways(n-1) + ways(n-2). What are ways(0) and ways(1)?',
        'Iterate from 2 up to n keeping two rolling values: prev, curr = curr, prev + curr. Start both at 1 (ways(0) and ways(1)), return curr, and short-circuit rungs == 0 to 1.',
      ],
      functionName: 'count_climb_ways',
      starterCode: `def count_climb_ways(rungs: int) -> int:
    pass
`,
      solution: {
        code: `def count_climb_ways(rungs: int) -> int:
    # ways(k) = number of routines that land exactly on rung k.
    # Base cases: ways(0) = 1 (the empty routine), ways(1) = 1 (single step).
    if rungs == 0:
        return 1
    prev, curr = 1, 1  # ways(0), ways(1)
    for _ in range(2, rungs + 1):
        # Every routine reaching rung k arrives either by a 1-step from k-1
        # or a 2-hop from k-2; the two groups are disjoint, so they add.
        prev, curr = curr, prev + curr
    return curr
`,
        commentary: `
The brute force branches on the first move and recurses — but sketch that call tree and you will see \`ways(k)\` requested over and over from different branches. There are only \`n + 1\` distinct questions hiding in an exponentially large tree: textbook **overlapping subproblems**.

The state is just the rung number, because nothing about *how* the technician reached rung k changes what routines remain above it — that is the **optimal substructure** (here, "counting substructure") that lets each cell trust the cells below it. The transition counts the last move: a routine ending on rung k arrived via a 1-step from \`k-1\` or a 2-hop from \`k-2\`, and since no routine can do both, the counts add with no double-counting.

This is tabulation in its most compressed form. The full table \`dp[0..n]\` would work, but each cell reads only the two cells before it, so the table collapses to two rolling variables. The \`rungs == 0\` short-circuit honors the "empty routine" convention the statement pins down.
`,
        complexity: 'Time O(n), Space O(1)',
        subgoals: [
          {
            lineRange: [1, 3],
            referenceLabel: 'Name the per-position count and pin its trivial values',
            acceptableKeywords: ['define the subproblem', 'count per position', 'base cases', 'state meaning'],
            hint: 'Before any loop, what does one table entry stand for, and which entries are known outright?',
            misconception: 'This declares what is being counted and the seeds — it is not yet any arithmetic.',
          },
          {
            lineRange: [4, 5],
            referenceLabel: 'Short-circuit the degenerate input',
            acceptableKeywords: ['handle the empty case', 'guard the trivial input', 'return early', 'edge case'],
            hint: 'One input is small enough that the recurrence has nothing to build on — what then?',
            misconception: 'This guards the smallest case so the loop can safely assume two prior values exist.',
          },
          {
            lineRange: [6, 6],
            referenceLabel: 'Seed the two rolling carriers from the base cases',
            acceptableKeywords: ['initialize the rolling values', 'seed two variables', 'start from base cases', 'prime the recurrence'],
            hint: 'The loop will look back two steps — what two values must already be in hand?',
            misconception: 'This primes the two trailing counts; it is setup, not the iterative step.',
          },
          {
            lineRange: [7, 10],
            referenceLabel: 'Fold each new position from its two predecessors',
            acceptableKeywords: ['add the two prior counts', 'roll the recurrence forward', 'combine previous two', 'advance the window'],
            hint: 'Each position is reached from exactly which earlier positions, and how do their counts combine?',
            misconception: 'This is the transition that sums two disjoint arrival groups, not the base case or the final read.',
          },
          {
            lineRange: [11, 11],
            referenceLabel: 'Hand back the count at the final position',
            acceptableKeywords: ['return the last count', 'answer at the target', 'final table cell', 'report the result'],
            hint: 'After the sweep, which carrier holds the answer for the requested position?',
            misconception: 'This reads the finished value; it does no counting of its own.',
          },
        ],
      },
      testCases: [
        { input: [3], expected: 3, label: 'small case from the example' },
        { input: [5], expected: 8, label: 'medium ladder' },
        { input: [0], expected: 1, label: 'zero rungs: only the empty routine' },
        { input: [1], expected: 1, hidden: true, label: 'single rung' },
        { input: [2], expected: 2, hidden: true, label: 'two rungs: [1,1] and [2]' },
        { input: [10], expected: 89, hidden: true, label: 'ten rungs' },
        { input: [45], expected: 1836311903, hidden: true, label: 'large input — exponential solutions die here' },
        { input: [70], expected: 308061521170129, hidden: true, label: 'maximum ladder height' },
      ],
      furtherPractice: [
        { name: 'LeetCode 70. Climbing Stairs', note: 'the canonical version of this recurrence' },
        { name: 'LeetCode 746. Min Cost Climbing Stairs', note: 'same state, but minimize cost instead of counting' },
        { name: 'LeetCode 62. Unique Paths', note: 'the 2-D counting cousin' },
      ],
    },
    {
      id: 'hive-harvest',
      title: 'Hive Harvest Day',
      difficulty: 'medium',
      statement: `
A beekeeper's apiary is a single row of hives. Forecasts give \`jars[i]\`, the number of jars of honey hive \`i\` will yield if harvested today. There is a catch: opening a hive agitates the colonies on **both sides**, so if hive \`i\` is harvested, hives \`i-1\` and \`i+1\` must be left alone for the day.

Given the list \`jars\`, return the **maximum total jars** the beekeeper can collect today under the no-adjacent-harvest rule. Harvesting nothing is allowed; an empty row yields \`0\`.

The apiary can stretch to 100,000 hives, so trying every subset is out of the question.
`,
      examples: [
        {
          input: 'jars = [2, 9, 2, 9]',
          output: '18',
          explanation: 'Harvest hives 1 and 3 (9 + 9). They are not adjacent.',
        },
        {
          input: 'jars = [2, 3, 2]',
          output: '4',
          explanation:
            'Grabbing the single richest hive (3) blocks both neighbors and yields only 3; taking hives 0 and 2 yields 4.',
        },
        {
          input: 'jars = [7]',
          output: '7',
          explanation: 'One hive, no neighbors to upset.',
        },
      ],
      constraints: [
        '0 <= len(jars) <= 100_000',
        '0 <= jars[i] <= 10^9',
        'No two harvested hives may be adjacent in the row',
        'Harvesting zero hives (total 0) is always allowed',
      ],
      hints: [
        'Hand-simulate jars = [2, 3, 2]. Why does grabbing the single richest hive first lead you astray? Whatever the right method is, it has to consider how a choice at one hive ripples down the row.',
        'Define best(i) = the most honey collectible from hives 0..i only. Hive i is either skipped — leaving best(i-1) — or harvested, adding jars[i] on top of best(i-2). Take the larger.',
        'You only ever need the previous two values: prev2, prev1 = 0, 0; for y in jars: prev2, prev1 = prev1, max(prev1, prev2 + y); return prev1. The empty row falls out as 0 automatically.',
      ],
      functionName: 'max_honey',
      starterCode: `def max_honey(jars: list[int]) -> int:
    pass
`,
      solution: {
        code: `def max_honey(jars: list[int]) -> int:
    # prev1 = best total using hives seen so far (the full prefix).
    # prev2 = best total using the prefix that excludes the most recent hive.
    prev2, prev1 = 0, 0
    for y in jars:
        # Skip this hive: keep prev1.
        # Harvest it: its jars plus the best that leaves its left neighbor alone.
        prev2, prev1 = prev1, max(prev1, prev2 + y)
    # For an empty row the loop never runs and we correctly return 0.
    return prev1
`,
        commentary: `
The greedy instinct — sort the yields, grab the biggest available hive, repeat — dies on \`[2, 3, 2]\`: the 3 blocks both 2s, but the two 2s together beat it. Each choice's true cost depends on what it forbids later, which is exactly the situation DP handles.

**State design** is the whole problem. The naive state, "the set of hives harvested so far", is exponentially large. But notice that once you are deciding hive \`i\`, the only fact about history that matters is whether hive \`i-1\` was taken — and even that folds away if you define \`best(i)\` as *the best total over the prefix 0..i*, with the recurrence \`best(i) = max(best(i-1), best(i-2) + jars[i])\`. The skip branch carries forward the previous best; the take branch reaches back two slots so it can never collide with an adjacent harvest. Both branches reference *optimal* sub-answers, and any optimal plan for the prefix must end in one of these two moves — that is the optimal substructure argument, made concrete.

Since the recurrence looks back exactly two states, the table compresses to two rolling variables, giving one linear pass over up to 100,000 hives in constant extra space. Zero-yield hives need no special casing: \`max\` simply never favors them.
`,
        complexity: 'Time O(n), Space O(1)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Seed two running optima for adjacent and skipped prefixes',
            acceptableKeywords: ['initialize two best totals', 'seed the rolling optima', 'start both at zero', 'define the two states'],
            hint: 'Two carriers stand in for two prefix answers — what do they mean and what do they start as?',
            misconception: 'This declares and seeds the pair of best-so-far values; no element has been weighed yet.',
          },
          {
            lineRange: [5, 5],
            referenceLabel: 'Walk the row one element at a time',
            acceptableKeywords: ['iterate over each item', 'single forward pass', 'visit every element', 'scan the sequence'],
            hint: 'How do you reach each position so its take-or-skip choice can be resolved in order?',
            misconception: 'This is the traversal that surfaces each value, not the decision rule itself.',
          },
          {
            lineRange: [6, 8],
            referenceLabel: 'Pick the better of skipping versus taking-with-gap',
            acceptableKeywords: ['max of skip or take', 'choose include or exclude', 'best of two branches', 'reach back to avoid neighbor'],
            hint: 'At each element, which two mutually exclusive plans compete, and how does the take-branch dodge its neighbor?',
            misconception: 'This is the core transition comparing two options, not the setup or the final read.',
          },
          {
            lineRange: [9, 10],
            referenceLabel: 'Return the best total over the whole prefix',
            acceptableKeywords: ['return the running best', 'final optimum', 'answer over all elements', 'report the maximum'],
            hint: 'After the pass, which carrier already holds the answer for the entire row?',
            misconception: 'This reads the finished optimum and also covers the empty-row case; it makes no new choice.',
          },
        ],
      },
      testCases: [
        { input: [[2, 9, 2, 9]], expected: 18, label: 'alternating rich hives' },
        { input: [[2, 3, 2]], expected: 4, label: 'greedy trap: richest hive loses' },
        { input: [[7]], expected: 7, label: 'single hive' },
        { input: [[]], expected: 0, hidden: true, label: 'empty apiary' },
        { input: [[5, 1, 1, 5]], expected: 10, hidden: true, label: 'take both ends' },
        { input: [[4, 4, 4, 4, 4]], expected: 12, hidden: true, label: 'all equal: indices 0, 2, 4' },
        { input: [[10, 2, 3, 11, 4, 6]], expected: 27, hidden: true, label: 'mixed row' },
        { input: [[0, 0, 0]], expected: 0, hidden: true, label: 'all zero yields' },
        { input: [[8, 1, 6, 12, 3, 9, 2, 14]], expected: 43, hidden: true, label: 'longer row with irregular gaps' },
      ],
      furtherPractice: [
        { name: 'LeetCode 198. House Robber', note: 'the classic skin of this exact recurrence' },
        { name: 'LeetCode 213. House Robber II', note: 'the row becomes a circle — run the DP twice' },
        { name: 'LeetCode 740. Delete and Earn', note: 'reduce a counting problem to this recurrence' },
      ],
    },
    {
      id: 'arcade-token-counter',
      title: 'Arcade Token Counter',
      difficulty: 'medium',
      statement: `
A retro arcade's prize counter only accepts payment in machine tokens. Tokens come in a fixed set of face values, and the change machine dispenses **unlimited** tokens of each face. A prize costs exactly \`cost\` credits, and the counter accepts only exact payment — no overpaying, no change given.

Given the list \`denominations\` of token face values and the integer \`cost\`, return the **fewest tokens** whose face values sum to exactly \`cost\`. If no combination of tokens can hit the cost exactly, return \`-1\`. A cost of \`0\` requires \`0\` tokens.

Beware: always grabbing the largest face that still fits does **not** always minimize the token count.
`,
      examples: [
        {
          input: 'denominations = [1, 4, 5], cost = 8',
          output: '2',
          explanation: 'Two 4-tokens. Largest-first would pay 5+1+1+1 — four tokens.',
        },
        {
          input: 'denominations = [2], cost = 3',
          output: '-1',
          explanation: 'Even values can never sum to 3.',
        },
        {
          input: 'denominations = [3, 7], cost = 0',
          output: '0',
          explanation: 'Nothing to pay, nothing to insert.',
        },
      ],
      constraints: [
        '1 <= len(denominations) <= 12',
        '1 <= denominations[i] <= 10^4',
        '0 <= cost <= 10^4',
        'Unlimited tokens are available for every face value',
        'denominations may contain duplicate face values',
      ],
      hints: [
        'Test the biggest-token-first idea on denominations [1, 5, 12, 19] with cost 16. Count the tokens it pays versus the best possible. What does that tell you about local choices here?',
        'Think about the LAST token inserted in an optimal payment of amount a: it has some face d, and what came before it must be an optimal payment of a - d. So fewest(a) = 1 + min over faces d <= a of fewest(a - d).',
        'Build dp[0..cost] with dp[0] = 0 and everything else set to a sentinel like cost + 1. For each amount a from 1 to cost, relax dp[a] = min(dp[a], dp[a - d] + 1) over all faces d <= a. Return dp[cost], translating the sentinel to -1.',
      ],
      functionName: 'min_tokens',
      starterCode: `def min_tokens(denominations: list[int], cost: int) -> int:
    pass
`,
      solution: {
        code: `def min_tokens(denominations: list[int], cost: int) -> int:
    # dp[a] = fewest tokens summing exactly to amount a.
    # Sentinel cost + 1 means "not reachable" (any real payment uses <= cost tokens,
    # since the smallest face is at least 1).
    INF = cost + 1
    dp = [0] + [INF] * cost  # base case: amount 0 needs 0 tokens
    for a in range(1, cost + 1):
        for d in denominations:
            # If face d fits, paying it last leaves the subproblem a - d.
            if d <= a and dp[a - d] + 1 < dp[a]:
                dp[a] = dp[a - d] + 1
    # Translate the sentinel into the contract's -1.
    return dp[cost] if dp[cost] <= cost else -1
`,
        commentary: `
Greedy fails because token systems are not always "canonical": with faces \`[1, 5, 12, 19]\` and cost 16, biggest-first pays 12+1+1+1+1 (five tokens) while 5+5+5+1 (four) wins. No local rule survives that counter-example, so we must consider all options — but cheaply.

**State**: the remaining amount, nothing else. Tokens are unlimited, so it does not matter which tokens were already used — only how much is left to pay. That single insight shrinks the search space from "all multisets of tokens" to just \`cost + 1\` states.

**Transition**: condition on the last token of an optimal payment. It has some face \`d\`, and the rest must be an *optimal* payment of \`a - d\` — if it were not, swapping in the better sub-payment would improve the whole, contradicting optimality. That cut-and-paste argument is the optimal substructure proof, and it justifies \`dp[a] = 1 + min(dp[a - d])\`.

The fill order is simply increasing amount, since every transition reads a strictly smaller amount. The sentinel \`cost + 1\` is safe because any reachable amount uses at most \`cost\` tokens (faces are >= 1); it also propagates harmlessly through \`min\` without infecting reachable states. Duplicate faces cost a little wasted work but no wrong answers.
`,
        complexity: 'Time O(cost * k) for k denominations, Space O(cost)',
        subgoals: [
          {
            lineRange: [1, 5],
            referenceLabel: 'Define the per-amount cost and an unreachable marker',
            acceptableKeywords: ['define the subproblem', 'cost per amount', 'sentinel for impossible', 'unreachable marker'],
            hint: 'What does one table slot mean here, and what stand-in flags a slot that cannot be reached?',
            misconception: 'This fixes the meaning of a cell and the impossibility sentinel; it is not yet the table or the loop.',
          },
          {
            lineRange: [6, 6],
            referenceLabel: 'Allocate the table and seed the trivial amount',
            acceptableKeywords: ['build the dp array', 'seed amount zero', 'base case at zero', 'fill with sentinel'],
            hint: 'Which single amount has a known answer, and what should every other slot start as?',
            misconception: 'This lays out storage with one true base case; no real amount has been solved yet.',
          },
          {
            lineRange: [7, 11],
            referenceLabel: 'Relax every amount against each candidate last choice',
            acceptableKeywords: ['try each denomination', 'relax from smaller amount', 'minimize over last token', 'fill increasing amounts'],
            hint: 'For each amount, conditioning on the last piece used reduces it to which strictly smaller amount?',
            misconception: 'This is the transition that minimizes over last choices, not the setup or the final translation.',
          },
          {
            lineRange: [12, 13],
            referenceLabel: 'Read the target slot, mapping the sentinel to the failure value',
            acceptableKeywords: ['return the target amount', 'translate sentinel to minus one', 'report impossibility', 'final answer cell'],
            hint: 'After filling, how do you turn the unreachable marker into the answer the contract demands?',
            misconception: 'This only reads and translates the finished cell; it performs no further relaxation.',
          },
        ],
      },
      testCases: [
        { input: [[1, 4, 5], 8], expected: 2, label: 'greedy overpays; DP finds 4+4' },
        { input: [[2], 3], expected: -1, label: 'parity makes it impossible' },
        { input: [[3, 7], 0], expected: 0, label: 'zero cost, zero tokens' },
        { input: [[1, 2, 5], 11], expected: 3, hidden: true, label: '5+5+1' },
        { input: [[9, 6, 5, 1], 11], expected: 2, hidden: true, label: '6+5 beats 9+1+1' },
        { input: [[1, 5, 12, 19], 16], expected: 4, hidden: true, label: 'the greedy counter-example from the hints' },
        { input: [[7, 7, 7], 21], expected: 3, hidden: true, label: 'duplicate denominations' },
        { input: [[5, 10], 12], expected: -1, hidden: true, label: 'unreachable cost' },
        { input: [[1, 3, 4], 6], expected: 2, hidden: true, label: '3+3 beats 4+1+1' },
      ],
      furtherPractice: [
        { name: 'LeetCode 322. Coin Change', note: 'the canonical fewest-coins problem' },
        { name: 'LeetCode 518. Coin Change II', note: 'count combinations instead — watch the loop order' },
        { name: 'LeetCode 279. Perfect Squares', note: 'same DP with an implicit denomination set' },
      ],
    },
    {
      id: 'sku-migration',
      title: 'SKU Migration Audit',
      difficulty: 'hard',
      statement: `
A warehouse is migrating product codes from a legacy labeling scheme to a new one. The relabeling gun supports exactly three operations, each costing one press: **insert** one character anywhere, **delete** one character, or **replace** one character with another.

For the audit report, every product needs the **minimum number of presses** required to turn its legacy code \`legacy\` into its new code \`target\`.

Return that minimum as an integer. Either code may be empty (a brand-new product has an empty legacy code; a discontinued one has an empty target).

Note there is **no swap operation**: transposing two adjacent characters takes two presses, not one.
`,
      examples: [
        {
          input: "legacy = 'AX-204', target = 'AX-304'",
          output: '1',
          explanation: "Replace the '2' with a '3'. Everything else already matches.",
        },
        {
          input: "legacy = 'PUMP', target = 'PUMPS'",
          output: '1',
          explanation: "Insert an 'S' at the end.",
        },
        {
          input: "legacy = 'BRG-77', target = 'BGR-77'",
          output: '2',
          explanation: "The R and G are transposed; with no swap operation, that's two replacements.",
        },
        {
          input: "legacy = 'DRUM', target = ''",
          output: '4',
          explanation: 'Discontinued product: delete all four characters.',
        },
      ],
      constraints: [
        '0 <= len(legacy), len(target) <= 500',
        'Codes contain uppercase letters, digits, and dashes',
        'Allowed operations: insert one character, delete one character, replace one character — each costs exactly 1',
      ],
      hints: [
        'Warm up on the trivial cases: what is the answer when legacy is empty? When target is empty? And if both codes end with the same character, how does the problem shrink?',
        'Define D[i][j] = fewest presses turning the first i characters of legacy into the first j characters of target. If the i-th and j-th characters match, D[i][j] = D[i-1][j-1]. Otherwise one press plus the best of: replace (D[i-1][j-1]), delete from legacy (D[i-1][j]), or insert into legacy (D[i][j-1]).',
        'Allocate an (m+1) x (n+1) table. Row 0 is 0,1,2,...,n (pure inserts) and column 0 is 0,1,2,...,m (pure deletes). Fill row by row, left to right — each cell reads up, left, and up-left. The answer sits at D[m][n].',
      ],
      functionName: 'min_revision_ops',
      starterCode: `def min_revision_ops(legacy: str, target: str) -> int:
    pass
`,
      solution: {
        code: `def min_revision_ops(legacy: str, target: str) -> int:
    m, n = len(legacy), len(target)
    # dp[i][j] = fewest presses converting legacy[:i] into target[:j].
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    # Base cases: converting a prefix to the empty string is i deletions;
    # building target[:j] from the empty string is j insertions.
    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if legacy[i - 1] == target[j - 1]:
                # Last characters already agree: no press needed for them.
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(
                    dp[i - 1][j - 1],  # replace legacy's last char with target's
                    dp[i - 1][j],      # delete legacy's last char
                    dp[i][j - 1],      # insert target's last char onto legacy
                )
    # Whole legacy converted into whole target.
    return dp[m][n]
`,
        commentary: `
The hard part is finding the state. Edits can happen anywhere, in any order, so "what has been done so far" looks hopelessly history-dependent. The escape hatch: any optimal edit script can be replayed **left to right**, which means at every moment there is a clean frontier — some prefix of \`legacy\` has been consumed and some prefix of \`target\` has been produced. The pair of prefix lengths \`(i, j)\` is therefore a complete state: \`O(m * n)\` subproblems instead of an unbounded space of scripts.

The transition conditions on how the script handles the last characters of the two prefixes. If they match, an optimal script need not touch them (touching them could only be replicated more cheaply on the smaller prefixes), so the cost equals \`D[i-1][j-1]\`. If they differ, the final press at this frontier is one of exactly three moves — replace, delete, or insert — each reducing to a strictly smaller prefix pair. Taking the min over those three, plus one for the press itself, is the whole recurrence. The base cases are the degenerate scripts: all-deletes down column 0, all-inserts along row 0.

Tabulation beats memoization here for a practical reason: 500×500 = 250,000 states is fine, but a memoized recursion can chain ~1,000 frames deep and flirt with Python's stack limit. The row-by-row fill also exposes the space optimization — each row reads only the previous row, so two rows of length \`min(m, n) + 1\` suffice when memory matters. The transposition example (\`BRG-77\` → \`BGR-77\`) lands naturally at 2: with no swap operation, the table simply finds two substitutions.
`,
        complexity: 'Time O(m * n), Space O(m * n) (reducible to O(min(m, n)) with rolling rows)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Lay out a grid keyed by a pair of prefix lengths',
            acceptableKeywords: ['two dimensional table', 'state is a prefix pair', 'allocate the grid', 'define cell meaning'],
            hint: 'What two pieces of progress together form one cell, and how big is the grid that holds them?',
            misconception: 'This defines the prefix-pair state and allocates storage; no cost has been computed yet.',
          },
          {
            lineRange: [5, 10],
            referenceLabel: 'Fill the degenerate edges where one prefix is empty',
            acceptableKeywords: ['seed first row and column', 'empty prefix costs', 'base cases on the border', 'all deletes or all inserts'],
            hint: 'When one side is the empty string, how many operations does the other side force, and where do those go?',
            misconception: 'These borders are the trivial base cases the interior leans on, not part of the main recurrence.',
          },
          {
            lineRange: [11, 21],
            referenceLabel: 'Resolve each cell by matching or taking the cheapest edit',
            acceptableKeywords: ['compare last characters', 'min over three edits', 'fill the interior cells', 'transition over replace delete insert'],
            hint: 'For an interior cell, when do the last characters cost nothing, and otherwise which three smaller cells compete?',
            misconception: 'This is the core transition over match/replace/delete/insert, not the border seeding or the final read.',
          },
          {
            lineRange: [22, 23],
            referenceLabel: 'Return the corner spanning both full strings',
            acceptableKeywords: ['return the bottom corner', 'answer at full prefixes', 'final grid cell', 'report the cost'],
            hint: 'Which single cell represents converting all of one string into all of the other?',
            misconception: 'This reads the finished corner cell; it performs no comparison of its own.',
          },
        ],
      },
      testCases: [
        { input: ['AX-204', 'AX-304'], expected: 1, label: 'single replacement' },
        { input: ['PUMP', 'PUMPS'], expected: 1, label: 'single insertion' },
        { input: ['BRG-77', 'BGR-77'], expected: 2, label: 'transposition costs two presses' },
        { input: ['', ''], expected: 0, hidden: true, label: 'both empty' },
        { input: ['', 'QZ-1'], expected: 4, hidden: true, label: 'build target from nothing' },
        { input: ['DRUM', ''], expected: 4, hidden: true, label: 'delete everything' },
        { input: ['AAAA', 'AAAA'], expected: 0, hidden: true, label: 'identical codes' },
        { input: ['VALVE-09', 'VLV-209'], expected: 3, hidden: true, label: 'mixed delete and replacements' },
        { input: ['AAAA', 'BBBB'], expected: 4, hidden: true, label: 'nothing matches: all replacements' },
      ],
      furtherPractice: [
        { name: 'LeetCode 72. Edit Distance', note: 'the canonical statement of this table' },
        { name: 'LeetCode 1143. Longest Common Subsequence', note: 'the sibling prefix-pair DP' },
        { name: 'LeetCode 583. Delete Operation for Two Strings', note: 'edit distance with a restricted operation set' },
      ],
    },
    {
      id: 'gallery-polisher-routes',
      title: 'Gallery Polisher Routes',
      difficulty: 'easy',
      statement: `
A museum's overnight floor-polishing machine is parked on the northwest tile of a rectangular gallery and must dock at the southeast tile. The gallery floor is a grid: \`floor[r][c]\` is \`0\` for an open tile and \`1\` for a tile occupied by a display pedestal the machine may never touch. To keep its polishing pattern even, the machine only ever moves **one tile south** or **one tile east** per step.

Given the grid \`floor\`, return the number of distinct routes from the northwest tile to the southeast tile that avoid every pedestal. Two routes are distinct if their move sequences differ anywhere. If the start tile or the dock tile itself holds a pedestal, return \`0\`.

An open 15×15 floor already has tens of millions of routes — enumerating them one by one will not finish before the museum opens.
`,
      examples: [
        {
          input: 'floor = [[0,0,0],[0,1,0],[0,0,0]]',
          output: '2',
          explanation:
            'The centre pedestal splits the traffic: east-east-south-south along the top edge and south-south-east-east along the left edge are the only legal routes.',
        },
        {
          input: 'floor = [[0,1],[1,0]]',
          output: '0',
          explanation: 'Both two-step routes pass through a pedestal, so the dock is unreachable.',
        },
        {
          input: 'floor = [[0,0],[0,0]]',
          output: '2',
          explanation: 'East-then-south and south-then-east.',
        },
      ],
      constraints: [
        '1 <= len(floor), len(floor[0]) <= 15, and every row has the same length',
        'floor[r][c] is 0 (open tile) or 1 (pedestal)',
        'The machine starts at floor[0][0], docks at the bottom-right tile, and moves only one tile south or one tile east per step',
        'If the start or dock tile holds a pedestal, the answer is 0',
      ],
      hints: [
        'Trace the 3×3 example with the centre pedestal and list both routes by hand. Now pick any open tile in the middle of the floor: given that the machine moves only south or east, which tiles could it have occupied immediately before reaching that one?',
        'Let routes(r, c) be the number of legal routes from the start to tile (r, c). For an open tile, routes(r, c) = routes(r-1, c) + routes(r, c-1), treating missing neighbours as 0; for a pedestal tile it is 0, which automatically stops routes flowing through it. routes(0, 0) is 1 when the start tile is open.',
        'Fill a rows × cols table top-to-bottom, left-to-right so the north and west cells are always ready. Seed dp[0][0] from the start tile, force every pedestal cell to 0, and return dp[rows-1][cols-1] — which is already 0 whenever the dock tile is blocked.',
      ],
      functionName: 'count_polish_routes',
      starterCode: `def count_polish_routes(floor: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `def count_polish_routes(floor: list[list[int]]) -> int:
    rows, cols = len(floor), len(floor[0])
    # dp[r][c] = number of legal routes from the start tile to tile (r, c).
    dp = [[0] * cols for _ in range(rows)]
    # Base case: the start tile carries one (empty) route, unless blocked.
    dp[0][0] = 1 if floor[0][0] == 0 else 0
    for r in range(rows):
        for c in range(cols):
            if floor[r][c] == 1:
                # A pedestal can never be stood on: zero routes end here,
                # which also stops routes from "flowing through" it.
                dp[r][c] = 0
                continue
            if r == 0 and c == 0:
                continue  # already seeded
            # The machine moves only south or east, so it arrived from the
            # north neighbour or the west neighbour (when those exist).
            from_north = dp[r - 1][c] if r > 0 else 0
            from_west = dp[r][c - 1] if c > 0 else 0
            dp[r][c] = from_north + from_west
    return dp[rows - 1][cols - 1]
`,
        commentary: `
Counting routes one at a time is hopeless, but the routes share massive structure: every route into a tile arrives **either from the north or from the west**, and those two families are disjoint. That is the entire transition: \`routes(r, c) = routes(r-1, c) + routes(r, c-1)\`. The state is just the tile, because *how* the machine got somewhere has no bearing on the tiles still ahead of it.

Pedestals integrate with zero special machinery. A blocked tile supports no routes, so its cell holds 0 — and since every later cell only *adds* its neighbours, that zero does exactly the right thing: routes neither end on the pedestal nor pass through it. The same logic covers a blocked start or dock tile, so no early returns are needed; the zeros simply propagate.

The fill order falls straight out of the dependencies: each cell reads north and west, so sweeping rows top-to-bottom and columns left-to-right guarantees both are ready. Conceptually this is the ladder-routine recurrence from earlier in the module with one extra state dimension — position now needs two coordinates — and like that one, the table compresses further if you want it to: row r only reads row r-1, so a single rolling row of length cols suffices.
`,
        complexity: 'Time O(rows * cols), Space O(rows * cols) (reducible to O(cols) with a rolling row)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Build a grid counting routes that reach each cell',
            acceptableKeywords: ['two dimensional table', 'routes per cell', 'allocate the grid', 'state is a coordinate'],
            hint: 'One cell stands for the count of paths to a position — how large is the grid and what does it start as?',
            misconception: 'This declares the per-tile count and allocates storage; no path has been counted yet.',
          },
          {
            lineRange: [5, 6],
            referenceLabel: 'Seed the origin with its single empty route',
            acceptableKeywords: ['seed the start tile', 'base case at origin', 'one empty path', 'initialize the corner'],
            hint: 'How many ways are there to be standing on the very first tile before moving?',
            misconception: 'This is the lone base case (also honoring a blocked start); it is not the propagation step.',
          },
          {
            lineRange: [7, 15],
            referenceLabel: 'Sweep cells in dependency order, zeroing blocked ones',
            acceptableKeywords: ['iterate over the grid', 'skip blocked tiles', 'fill in order', 'guard obstacles and origin'],
            hint: 'In what order must cells be visited so their inputs are ready, and what do obstacle tiles contribute?',
            misconception: 'This is the traversal plus obstacle handling, not the formula that combines neighbours.',
          },
          {
            lineRange: [16, 20],
            referenceLabel: 'Accumulate each cell from its two legal predecessors',
            acceptableKeywords: ['add the two incoming neighbours', 'sum from above and left', 'combine predecessor counts', 'route transition'],
            hint: 'Given the allowed moves, a tile is entered only from which two neighbours, and how do their counts combine?',
            misconception: 'This is the additive transition over disjoint arrival directions, not the loop scaffolding or the read.',
          },
          {
            lineRange: [21, 21],
            referenceLabel: 'Return the count at the destination corner',
            acceptableKeywords: ['return the last cell', 'answer at the goal', 'final grid corner', 'report the route total'],
            hint: 'Which single cell holds the number of routes to the finish tile?',
            misconception: 'This reads the finished destination cell; it adds nothing further.',
          },
        ],
      },
      testCases: [
        { input: [[[0, 0, 0], [0, 1, 0], [0, 0, 0]]], expected: 2, label: 'pedestal in the centre' },
        { input: [[[0, 1], [1, 0]]], expected: 0, label: 'both corridors blocked' },
        { input: [[[0, 0], [0, 0]]], expected: 2, label: 'small open floor' },
        { input: [[[0]]], expected: 1, hidden: true, label: 'single open tile: the empty route' },
        { input: [[[1]]], expected: 0, hidden: true, label: 'start tile blocked' },
        { input: [[[0, 0, 1, 0]]], expected: 0, hidden: true, label: 'single row severed by a pedestal' },
        { input: [[[0, 0], [0, 1]]], expected: 0, hidden: true, label: 'dock tile blocked' },
        { input: [[[0, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [1, 0, 0, 0]]], expected: 3, hidden: true, label: 'three pedestals, three survivors' },
        { input: [[[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]], expected: 10, hidden: true, label: 'open 3x4 floor' },
      ],
      furtherPractice: [
        { name: 'LeetCode 63. Unique Paths II', note: 'the canonical obstacle-grid counting problem' },
        { name: 'LeetCode 62. Unique Paths', note: 'the obstacle-free version with a closed form' },
        { name: 'LeetCode 64. Minimum Path Sum', note: 'same grid, but minimize a cost instead of counting' },
      ],
    },
    {
      id: 'telegram-phrasebook',
      title: 'Telegram Phrasebook Check',
      difficulty: 'medium',
      statement: `
A telegraph office delivers a message only after a clerk verifies it against the official phrasebook: the wire strips out every space, so the received string must split — end to end, with nothing left over — into a sequence of approved phrasebook words. The same word may appear in the split any number of times, and book entries may overlap in tricky ways (\`'st'\` and \`'storm'\` can both be in the book).

Given the received string \`message\` and the list \`phrasebook\`, return \`True\` if at least one complete split exists and \`False\` otherwise. An empty message passes vacuously.

Messages run to 300 characters and the book holds up to 100 words, so trying every combination of cut points will explode.
`,
      examples: [
        {
          input: "message = 'sendcashnow', phrasebook = ['send', 'cash', 'now']",
          output: 'True',
          explanation: "Split as 'send' + 'cash' + 'now' with nothing left over.",
        },
        {
          input: "message = 'stormdelay', phrasebook = ['storm', 'delays', 'st', 'arm']",
          output: 'False',
          explanation:
            "'storm' leaves 'delay', which is not in the book ('delays' is one letter too long), and 'st' leaves 'ormdelay', which no word starts. Every split dead-ends.",
        },
        {
          input: "message = 'nownownow', phrasebook = ['now', 'nownow']",
          output: 'True',
          explanation: "Several splits work, e.g. 'now' + 'nownow'; one witness is enough.",
        },
      ],
      constraints: [
        '0 <= len(message) <= 300',
        '1 <= len(phrasebook) <= 100 and 1 <= len(phrasebook[i]) <= 20',
        'message and all phrasebook entries contain lowercase letters only',
        'Phrasebook words may be reused any number of times within one split',
        'The empty message is considered segmentable (return True)',
      ],
      hints: [
        "Try to segment 'stormdelay' against ['storm', 'delays', 'st', 'arm'] by hand. After you commit to a first word, what exactly does the remaining task depend on — the particular word you chose, or only the position where it ended?",
        'Define ok(i) = True when the first i characters split cleanly into phrasebook words. The last word of any such split covers message[j:i] for some j, so ok(i) holds when some j has ok(j) true AND message[j:i] in the book. ok(0) is True: the empty prefix needs no justification.',
        'Put the phrasebook in a set and record the longest word length L. Build dp[0..n] with dp[0] = True; for each i, scan j from max(0, i - L) to i - 1, setting dp[i] when dp[j] and message[j:i] is in the set, breaking on the first hit. Return dp[n].',
      ],
      functionName: 'can_segment_telegram',
      starterCode: `def can_segment_telegram(message: str, phrasebook: list[str]) -> bool:
    pass
`,
      solution: {
        code: `def can_segment_telegram(message: str, phrasebook: list[str]) -> bool:
    words = set(phrasebook)                    # O(1) membership checks
    longest = max(len(w) for w in words)       # no last word can exceed this
    n = len(message)
    # dp[i] = True if the first i characters split cleanly into book words.
    dp = [False] * (n + 1)
    dp[0] = True                               # empty prefix: nothing to justify
    for i in range(1, n + 1):
        # Condition on the LAST word of a split ending at i: it spans
        # message[j:i] for some cut j, and the part before j must itself split.
        start = max(0, i - longest)            # longer spans can never match
        for j in range(start, i):
            if dp[j] and message[j:i] in words:
                dp[i] = True
                break                          # feasibility: one witness suffices
    return dp[n]
`,
        commentary: `
The brute force tries every first word and recurses on the rest — and that recursion tree re-asks the same suffixes constantly, because many different chains of choices end at the same cut position. The key observation is **history-blindness**: once a split has reached position i, *which* words got it there is irrelevant to whether the remainder can be finished. So the cut position alone is the state, and there are only n + 1 of them instead of exponentially many partial splits.

The recurrence conditions on the last word of a successful split of the first i characters: it occupies \`message[j:i]\` for some earlier cut j, and everything before j must itself be splittable. Because this is a *feasibility* DP, each cell stores a boolean and one witness is enough — the inner loop breaks on the first success rather than tallying anything. \`dp[0] = True\` encodes that the empty prefix needs no words at all, which is both the base case that seeds every real split and the reason the empty message passes.

Two cheap engineering moves keep it fast: the phrasebook goes into a set for O(1) membership, and since no entry exceeds L characters, the scan for j only needs to look back L positions. That bounds the work at roughly n × L substring checks instead of n² — the difference between a snappy check and a sluggish one at 300 characters.
`,
        complexity: 'Time O(n * L^2) worst case (n positions, <=L lookbacks, O(L) substring hash), Space O(n) plus the word set',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Index the dictionary for fast lookups and bound the lookback',
            acceptableKeywords: ['build a lookup set', 'fast membership check', 'longest entry length', 'precompute bounds'],
            hint: 'What structure makes word checks cheap, and what limit lets you skip impossibly long candidates?',
            misconception: 'This is preprocessing for speed; it neither defines the table nor decides any split.',
          },
          {
            lineRange: [5, 7],
            referenceLabel: 'Set up a feasibility flag per cut position and seed the empty prefix',
            acceptableKeywords: ['boolean per position', 'reachability table', 'empty prefix is true', 'base case at zero'],
            hint: 'One flag per cut means what, and which position is trivially achievable to start?',
            misconception: 'This declares the boolean state and its single seed; no real prefix has been tested yet.',
          },
          {
            lineRange: [8, 15],
            referenceLabel: 'Mark a cut reachable if some last word bridges from an earlier cut',
            acceptableKeywords: ['condition on the last word', 'scan candidate cuts', 'reachable predecessor plus a word', 'stop on first witness'],
            hint: 'A position is splittable when which earlier position is splittable and the gap between them forms a valid word?',
            misconception: 'This is the feasibility transition over last-word cuts, not the setup or the final read.',
          },
          {
            lineRange: [16, 16],
            referenceLabel: 'Report whether the full message is splittable',
            acceptableKeywords: ['return the last flag', 'answer at full length', 'final feasibility cell', 'report reachability'],
            hint: 'Which flag tells you the entire message broke cleanly into words?',
            misconception: 'This reads the finished flag; it computes nothing new.',
          },
        ],
      },
      testCases: [
        { input: ['sendcashnow', ['send', 'cash', 'now']], expected: true, label: 'clean three-word split' },
        { input: ['stormdelay', ['storm', 'delays', 'st', 'arm']], expected: false, label: 'every split dead-ends' },
        { input: ['nownownow', ['now', 'nownow']], expected: true, label: 'overlapping reusable words' },
        { input: ['', ['stop']], expected: true, hidden: true, label: 'empty message passes vacuously' },
        { input: ['arrivemonday', ['arrive', 'mon', 'day', 'monday']], expected: true, hidden: true, label: 'two distinct splits exist' },
        { input: ['aaaaaaab', ['a', 'aa', 'aaa']], expected: false, hidden: true, label: 'unmatchable final character' },
        { input: ['wirefunds', ['wire', 'fund']], expected: false, hidden: true, label: 'one stray letter left over' },
        { input: ['regards', ['regards']], expected: true, hidden: true, label: 'whole message is a single book word' },
        { input: ['sosos', ['so', 'sos', 'os']], expected: true, hidden: true, label: 'requires the right first cut' },
      ],
      furtherPractice: [
        { name: 'LeetCode 139. Word Break', note: 'the canonical segmentation-feasibility DP' },
        { name: 'LeetCode 140. Word Break II', note: 'enumerate the splits instead of testing feasibility' },
        { name: 'LeetCode 472. Concatenated Words', note: 'run the same check across an entire dictionary' },
      ],
    },
    {
      id: 'amp-chain-gain',
      title: 'Amplifier Chain Gain',
      difficulty: 'medium',
      statement: `
An audio engineer is debugging a rack of amplifier stages wired in a fixed series order. Stage \`i\` applies an integer gain \`gains[i]\`: positive for a normal stage, **negative for an inverting stage** (it flips the signal's polarity while scaling it), and \`0\` for a stage muted by a fault. The engineer patches a test signal in before some stage and taps it out after some later (or the same) stage, so the chosen stages form one contiguous run of **at least one stage**, and the run's overall gain is the **product** of its stages' gains.

Given \`gains\`, return the maximum overall gain achievable by any contiguous run.

Beware: two inverting stages cancel. A deeply negative running product can snap to a large positive one a stage later, so a rule that abandons a run the moment its product looks bad will miss the best answer.
`,
      examples: [
        {
          input: 'gains = [2, 3, -2, 4]',
          output: '6',
          explanation:
            'The run [2, 3] gives 6. Extending into the inverting stage gives -12, and [4] alone gives only 4.',
        },
        {
          input: 'gains = [-4, -3, -2]',
          output: '12',
          explanation: 'Two inverting stages cancel: [-4, -3] gives 12. All three together give -24.',
        },
        {
          input: 'gains = [-2, 0, -1]',
          output: '0',
          explanation:
            'Every run avoiding the muted stage is negative, so tapping the muted stage alone — overall gain 0 — is the best available.',
        },
      ],
      constraints: [
        '1 <= len(gains) <= 10_000',
        '-10 <= gains[i] <= 10',
        'The patched run must be contiguous and contain at least one stage',
        'For all provided tests the answer fits comfortably in a 64-bit integer',
      ],
      hints: [
        'Work through [-4, -3, -2] by hand: write down the product of every contiguous run. Notice which run wins, and what the second negative gain does to a large negative running product. Why does "extend the run while the product stays big" miss it?',
        'A single "best product ending here" is not enough state, because a negative gain turns the smallest (most negative) product into the largest. Carry two values per position: the maximum AND the minimum product over runs ending exactly at that stage.',
        'Initialise hi = lo = answer = gains[0]. For each later gain g, a run ending there either starts fresh at g or extends the previous hi or lo: take candidates (g, hi*g, lo*g), set hi to their max and lo to their min, and fold hi into answer. Zeros need no special case — they reset both trackers to 0, which competes fairly for the answer.',
      ],
      functionName: 'max_chain_gain',
      starterCode: `def max_chain_gain(gains: list[int]) -> int:
    pass
`,
      solution: {
        code: `def max_chain_gain(gains: list[int]) -> int:
    # best_hi / best_lo = the largest and smallest products over all runs
    # that END at the current stage. Both matter: a negative gain swaps them.
    best_hi = best_lo = answer = gains[0]
    for g in gains[1:]:
        # A run ending here either starts fresh at g, or extends the best /
        # worst run ending one stage earlier. When g is negative, the old
        # minimum becomes the new maximum — so all three must compete.
        candidates = (g, best_hi * g, best_lo * g)
        best_hi = max(candidates)
        best_lo = min(candidates)
        # The optimal run ends SOMEWHERE; track the best ending seen so far.
        answer = max(answer, best_hi)
    return answer
`,
        commentary: `
Sum-style reasoning — "keep extending while the running value is good" — breaks here because multiplication is not monotone: a negative gain *inverts the ordering* of candidate products. The run \`[-4, -3]\` is the proof. After one stage the running product is the worst value in sight; one stage later it is the best. Any algorithm that discards "bad" partial products throws away exactly the information a future inverting stage needs.

The fix is to widen the state. For each stage, track the best **and** worst products over runs ending exactly there. Both are computable from the previous pair: a run ending at stage i either starts fresh at \`g\` or extends a run ending at i-1, so the candidates are \`g\`, \`hi*g\`, and \`lo*g\` — and when \`g\` is negative the roles swap, with the old minimum producing the new maximum. The global answer is the largest \`hi\` observed at any position, because the optimal run must end *somewhere*.

Zeros fall out for free: a muted stage collapses both trackers to 0 (the fresh-start candidate revives the run afterwards), and 0 itself competes for the answer — which is exactly right when every zero-avoiding run is negative, as in \`[-2, 0, -1]\`. The transferable lesson: when a transition can invert what "better" means, carry the full frontier of optima — here a (max, min) pair — instead of a single best value.
`,
        complexity: 'Time O(n), Space O(1)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Track both extremes and seed them from the first element',
            acceptableKeywords: ['keep best and worst', 'two running optima', 'seed from first item', 'widen the state'],
            hint: 'Why does one running best fail here, and what pair of values must you carry instead?',
            misconception: 'This declares and seeds the dual high/low trackers; no extension has happened yet.',
          },
          {
            lineRange: [5, 11],
            referenceLabel: 'Extend or restart, recomputing both extremes each step',
            acceptableKeywords: ['extend or start fresh', 'recompute max and min', 'candidates include a sign flip', 'transition with inversion'],
            hint: 'At each element, which candidate runs compete for the new extremes, and why must the worst one be in the mix?',
            misconception: 'This is the transition that updates both extremes, not the seeding or the global-best bookkeeping.',
          },
          {
            lineRange: [12, 13],
            referenceLabel: 'Fold the best ending here into the running answer',
            acceptableKeywords: ['track the global best', 'update the answer', 'best ending anywhere', 'keep the overall maximum'],
            hint: 'The optimal run ends at some position — how do you remember the best one seen so far?',
            misconception: 'This maintains the cross-position answer; it does not itself extend any run.',
          },
          {
            lineRange: [14, 14],
            referenceLabel: 'Return the best run found anywhere',
            acceptableKeywords: ['return the global best', 'final answer', 'overall maximum', 'report the result'],
            hint: 'After the sweep, which variable holds the best result over all ending positions?',
            misconception: 'This reads the accumulated answer; it computes nothing further.',
          },
        ],
      },
      testCases: [
        { input: [[2, 3, -2, 4]], expected: 6, label: 'inverting stage cuts the run' },
        { input: [[-4, -3, -2]], expected: 12, label: 'two negatives cancel' },
        { input: [[-2, 0, -1]], expected: 0, label: 'muted stage is the best option' },
        { input: [[5]], expected: 5, hidden: true, label: 'single stage' },
        { input: [[-7]], expected: -7, hidden: true, label: 'single inverting stage: answer is negative' },
        { input: [[2, -5, -2, -4, 3]], expected: 24, hidden: true, label: 'best run sits in the middle' },
        { input: [[0, 0, 0]], expected: 0, hidden: true, label: 'all muted' },
        { input: [[-2, 3, 0, 4, -1, -5]], expected: 20, hidden: true, label: 'zero splits the rack into segments' },
        { input: [[3, -1, 4]], expected: 4, hidden: true, label: 'crossing the negative never pays' },
      ],
      furtherPractice: [
        { name: 'LeetCode 152. Maximum Product Subarray', note: 'the canonical max/min-pair product DP' },
        { name: 'LeetCode 53. Maximum Subarray', note: 'the additive version, where one tracker suffices' },
        { name: 'LeetCode 1567. Maximum Length of Subarray With Positive Product', note: 'track sign parity instead of value' },
      ],
    },
    {
      id: 'pager-numeric-decode',
      title: 'Pager Code Interpretations',
      difficulty: 'medium',
      statement: `
A 1990s paging service let callers spell short words on a phone keypad: each letter was transmitted as its alphabet position — \`A\` as \`1\` through \`Z\` as \`26\` — and the digits arrived back-to-back with **no separators**. Reading a pager message therefore means re-inserting the token boundaries, and many digit strings support several readings.

Given the digit string \`signal\`, return the number of distinct complete readings. A token must represent 1 through 26 with no leading zero: \`'0'\` by itself maps to no letter, and \`'06'\` is not a valid way to send 6. If no complete reading exists, return \`0\`.

Signals run up to 60 digits, and the number of readings can grow far too quickly to enumerate them one at a time.
`,
      examples: [
        {
          input: "signal = '26'",
          output: '2',
          explanation: "Read as 2,6 ('B','F') or as the single token 26 ('Z').",
        },
        {
          input: "signal = '206'",
          output: '1',
          explanation: 'The 0 can only ride inside the token 20, forcing the reading 20,6 — exactly one way.',
        },
        {
          input: "signal = '1011'",
          output: '2',
          explanation: 'Valid readings: 10,1,1 and 10,11. Starting with a lone 1 would strand the 0.',
        },
      ],
      constraints: [
        '1 <= len(signal) <= 60',
        'signal contains only the digits 0-9',
        "Tokens represent 1..26; '0' alone maps to nothing and tokens may not carry a leading zero ('06' is not 6)",
        'Return 0 when no complete reading exists',
      ],
      hints: [
        "Decode '26' and '1011' fully by hand and count the readings. Each reading is determined entirely by where the token boundaries fall. Now focus on the LAST token of any valid reading: how many digits can it span, and which digit strings of each length are actually legal?",
        "Let readings(i) = the number of valid readings of the first i digits. The last token is either one digit — legal unless it is '0' — contributing readings(i-1), or two digits — legal when they read as 10 through 26 — contributing readings(i-2). Illegal tokens contribute nothing, and readings(0) = 1 for the empty prefix.",
        "Build dp[0..n] with dp[0] = 1. At each i, add dp[i-1] if signal[i-1] != '0', and add dp[i-2] if i >= 2 and 10 <= int(signal[i-2:i]) <= 26 — the numeric comparison rejects '06'-style tokens automatically. Return dp[n]; dead ends simply propagate zeros.",
      ],
      functionName: 'count_pager_readings',
      starterCode: `def count_pager_readings(signal: str) -> int:
    pass
`,
      solution: {
        code: `def count_pager_readings(signal: str) -> int:
    n = len(signal)
    # dp[i] = number of valid readings of the first i digits.
    dp = [0] * (n + 1)
    dp[0] = 1  # the empty prefix has exactly one reading: read nothing
    for i in range(1, n + 1):
        # Case 1: the last token is ONE digit. Legal unless it is '0',
        # because no letter is encoded as 0.
        if signal[i - 1] != '0':
            dp[i] += dp[i - 1]
        # Case 2: the last token is TWO digits. Legal exactly when the pair
        # reads as 10..26; a leading zero like '06' parses below 10 and is
        # rejected by the same comparison.
        if i >= 2 and 10 <= int(signal[i - 2 : i]) <= 26:
            dp[i] += dp[i - 2]
    return dp[n]
`,
        commentary: `
Every reading is a way of cutting the signal into legal tokens, and here is the collapse that makes DP work: the number of ways to finish reading depends only on **how many digits are already consumed**, never on how the earlier digits were grouped. "Digits consumed" is therefore a complete state, folding exponentially many token sequences onto just n + 1 cells.

The transition conditions on the last token of a reading. It spans one digit — legal unless that digit is \`'0'\`, since no letter encodes as zero — or two digits, legal exactly when the pair reads as 10 through 26. The numeric test does double duty: \`'06'\` parses as 6, falls below 10, and is rejected without any explicit leading-zero rule. The two cases consume different amounts of signal, so they can never describe the same reading twice, and the counts add cleanly. A position with no legal last token receives 0, and that zero propagates forward so dead signals like \`'100'\` finish at 0 with no special handling.

Structurally this is the ladder recurrence wearing a validity mask: \`dp[i]\` still draws from \`dp[i-1]\` and \`dp[i-2]\`, but each contribution is gated by a token-legality predicate, so the count can stall at zero instead of growing like a Fibonacci sequence — and on an all-ones signal it does grow exactly like one. The base \`dp[0] = 1\` (one way to read nothing) is what lets the first legal token inherit a count rather than start from nothing.
`,
        complexity: 'Time O(n), Space O(n) (reducible to O(1) with two rolling counts)',
        subgoals: [
          {
            lineRange: [1, 5],
            referenceLabel: 'Set up a per-position count and seed the empty prefix',
            acceptableKeywords: ['count per prefix length', 'allocate the table', 'empty prefix has one reading', 'base case at zero'],
            hint: 'One cell counts readings of how much of the input, and which prefix is trivially countable to start?',
            misconception: 'This declares the state and its single seed; no token has been read yet.',
          },
          {
            lineRange: [6, 10],
            referenceLabel: 'Add the readings where the last token is a single unit',
            acceptableKeywords: ['last token one digit', 'inherit from one back', 'guard the invalid single', 'single-unit transition'],
            hint: 'When the final piece is one symbol, which earlier count carries forward, and when is that piece illegal?',
            misconception: 'This is one of two disjoint transition branches, gated by a legality check — not the whole recurrence.',
          },
          {
            lineRange: [11, 15],
            referenceLabel: 'Add the readings where the last token spans two units',
            acceptableKeywords: ['last token two digits', 'inherit from two back', 'valid pair range', 'two-unit transition'],
            hint: 'When the final piece is two symbols, which earlier count carries forward, and what makes that pair valid?',
            misconception: 'This is the second disjoint branch consuming two units; it never double-counts the one-unit case.',
          },
          {
            lineRange: [16, 16],
            referenceLabel: 'Return the count over the whole signal',
            acceptableKeywords: ['return the last count', 'answer at full length', 'final table cell', 'report the total'],
            hint: 'Which cell holds the number of readings of the entire input?',
            misconception: 'This reads the finished count; it adds nothing.',
          },
        ],
      },
      testCases: [
        { input: ['26'], expected: 2, label: 'pair or single letters' },
        { input: ['206'], expected: 1, label: 'zero locked inside 20' },
        { input: ['1011'], expected: 2, label: 'two readings around the zero' },
        { input: ['0'], expected: 0, hidden: true, label: 'lone zero: unreadable' },
        { input: ['100'], expected: 0, hidden: true, label: 'second zero strands the signal' },
        { input: ['11106'], expected: 2, hidden: true, label: 'the 06 trap' },
        { input: ['27'], expected: 1, hidden: true, label: '27 exceeds Z, so only 2,7' },
        { input: ['10'], expected: 1, hidden: true, label: 'exactly the token J' },
        { input: ['111111111111111111111111111111'], expected: 1346269, hidden: true, label: '30 ones: Fibonacci-scale growth' },
      ],
      furtherPractice: [
        { name: 'LeetCode 91. Decode Ways', note: 'the canonical digit-string decoding count' },
        { name: 'LeetCode 639. Decode Ways II', note: "adds wildcard '*' digits to the same recurrence" },
        { name: 'LeetCode 1416. Restore The Array', note: 'tokens bounded by an arbitrary k instead of 26' },
      ],
    },
    {
      id: 'ferry-lane-balance',
      title: 'Ferry Lane Balance',
      difficulty: 'hard',
      statement: `
A vehicle ferry loads freight crates into two parallel deck lanes, port and starboard. Harbour rules are strict: **every crate on the manifest must be loaded**, and the two lanes must carry **exactly the same total weight**, or the ferry lists and is refused departure clearance. Crates cannot be split, and the loadmaster cares only about weight — which lane an individual crate ends up in is otherwise irrelevant.

Given the list \`weights\` of crate weights, return \`True\` if the crates can be divided between the two lanes so the lane totals are exactly equal, and \`False\` otherwise. An empty manifest balances trivially (0 = 0), and a lane is allowed to remain empty.

Up to 200 crates may appear on a manifest, so checking all 2^200 lane assignments is unthinkable.
`,
      examples: [
        {
          input: 'weights = [3, 1, 4, 2]',
          output: 'True',
          explanation: 'Load {3, 2} to port and {1, 4} to starboard: 5 = 5.',
        },
        {
          input: 'weights = [5, 3, 3]',
          output: 'False',
          explanation: 'The total is 11, which is odd — no split of an odd total can be equal.',
        },
        {
          input: 'weights = [2, 2, 2, 5, 5]',
          output: 'False',
          explanation:
            'The total 16 is even, but no subset of these crates sums to 8: combinations of 2s reach only 2, 4, 6, and adding any 5 overshoots or undershoots.',
        },
        {
          input: 'weights = [7]',
          output: 'False',
          explanation: 'The single crate must go somewhere, leaving 7 versus 0.',
        },
      ],
      constraints: [
        '0 <= len(weights) <= 200',
        '0 <= weights[i] <= 100',
        'Every crate must be loaded onto exactly one of the two lanes',
        'A lane may remain empty; an empty manifest balances trivially',
      ],
      hints: [
        "Add up all the crate weights in [3, 1, 4, 2] and look at the successful split: each lane carries 5. What must be true of the grand total before any perfect balance is even conceivable? And once one lane's manifest is fixed, how much choice is actually left for the other lane?",
        'A perfect balance exists exactly when some subset of crates sums to total / 2 — the remaining crates fill the other lane automatically. So track reachable sums: after considering some crates, reachable(s) says whether a subset of THOSE crates sums to s. Each new crate extends every previously reachable sum by its weight.',
        'Build a boolean array reachable[0..total//2] with reachable[0] = True. For each crate w, sweep s DOWNWARD from the target to w, setting reachable[s] when reachable[s - w] holds — the downward sweep is what stops a single crate from being loaded twice. Reject odd totals up front and return reachable[target].',
      ],
      functionName: 'can_balance_lanes',
      starterCode: `def can_balance_lanes(weights: list[int]) -> bool:
    pass
`,
      solution: {
        code: `def can_balance_lanes(weights: list[int]) -> bool:
    total = sum(weights)
    # An exact balance gives each lane total / 2, so an odd total is hopeless.
    if total % 2 == 1:
        return False
    target = total // 2
    # reachable[s] = True if some subset of the crates seen so far sums to s.
    reachable = [False] * (target + 1)
    reachable[0] = True  # the empty subset: leave a lane empty
    for w in weights:
        # Sweep DOWNWARD so this crate is counted at most once: for s scanned
        # high-to-low, reachable[s - w] still describes subsets that EXCLUDE
        # the current crate. An upward sweep would let one crate be "loaded"
        # again and again, answering a different (unbounded) question.
        for s in range(target, w - 1, -1):
            if reachable[s - w]:
                reachable[s] = True
    return reachable[target]
`,
        commentary: `
The first move is a **reduction**, not a recurrence. If the lanes balance, each carries exactly half the grand total — so an odd total fails instantly, and otherwise the question becomes: does some *subset* of crates sum to total/2? The complement automatically fills the other lane, so two-lane balancing collapses to single-target subset-sum.

The state is the pair (crates considered, sum aimed for), and each cell stores feasibility: after processing k crates, \`reachable[s]\` says whether some subset of those k crates hits s. Each crate either joins the chosen subset or does not, giving \`reachable_k[s] = reachable_(k-1)[s] or reachable_(k-1)[s - w]\`. The crate dimension compresses to one array updated in place — but only if the inner sweep runs **downward**. Scanning s from high to low guarantees \`reachable[s - w]\` was written in a previous crate's round, so it describes subsets that exclude the current crate. Sweep upward and the freshly set entries feed back into the same round: one crate gets loaded repeatedly, and you have silently solved the unbounded token-machine problem from earlier in this module instead. The direction of a single loop is the entire difference between 0/1 and unbounded choice.

The cost is pseudo-polynomial: O(n × total/2) cell updates — comfortable for 200 crates of weight ≤ 100, a 10,001-wide array — while remaining untouched by the 2^200 assignment space. Subset-sum is NP-complete in general; this DP is tractable precisely because the *numeric size* of the target is small, not the number of crates. That distinction is worth saying out loud in an interview.
`,
        complexity: 'Time O(n * T) where T = total/2, Space O(T)',
        subgoals: [
          {
            lineRange: [1, 6],
            referenceLabel: 'Reduce the split to hitting half the total, rejecting odd sums',
            acceptableKeywords: ['reduce to subset sum', 'each side is half', 'odd total is impossible', 'derive the target'],
            hint: 'What single number must one side reach for the split to work, and which totals can be ruled out at once?',
            misconception: 'This reframing and parity guard set up the target; it is not yet the subset-sum DP itself.',
          },
          {
            lineRange: [7, 9],
            referenceLabel: 'Set up reachable-sum flags and seed the empty subset',
            acceptableKeywords: ['boolean per sum', 'reachability over sums', 'empty subset reaches zero', 'base case at zero'],
            hint: 'One flag per possible sum means what, and which sum is always achievable to begin with?',
            misconception: 'This declares the per-sum feasibility state and its seed; no crate has been considered yet.',
          },
          {
            lineRange: [10, 17],
            referenceLabel: 'Fold in each item once via a high-to-low sweep',
            acceptableKeywords: ['process each item once', 'iterate sums downward', 'mark newly reachable sums', 'zero-or-one inclusion'],
            hint: 'Why must the inner scan run from high to low so each crate is used at most once?',
            misconception: 'The downward direction is what enforces 0/1 choice; an upward sweep would solve the unbounded problem instead.',
          },
          {
            lineRange: [18, 18],
            referenceLabel: 'Report whether the half-total is reachable',
            acceptableKeywords: ['return the target flag', 'answer at half total', 'final feasibility cell', 'report reachability'],
            hint: 'Which flag tells you some subset hit exactly half the total?',
            misconception: 'This reads the finished flag; it performs no further marking.',
          },
        ],
      },
      testCases: [
        { input: [[3, 1, 4, 2]], expected: true, label: 'balances at 5 per lane' },
        { input: [[5, 3, 3]], expected: false, label: 'odd total: instant rejection' },
        { input: [[2, 2, 2, 5, 5]], expected: false, label: 'even total but no subset hits half' },
        { input: [[7]], expected: false, hidden: true, label: 'single crate cannot balance' },
        { input: [[]], expected: true, hidden: true, label: 'empty manifest: 0 = 0' },
        { input: [[0, 0]], expected: true, hidden: true, label: 'weightless crates' },
        { input: [[1, 1, 1, 1, 1, 1]], expected: true, hidden: true, label: 'three ones per lane' },
        { input: [[3, 3, 4, 8]], expected: false, hidden: true, label: 'even total 18, but 9 is unreachable' },
        { input: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]], expected: true, hidden: true, label: 'twenty crates, target 105' },
      ],
      furtherPractice: [
        { name: 'LeetCode 416. Partition Equal Subset Sum', note: 'the canonical equal-partition feasibility DP' },
        { name: 'LeetCode 494. Target Sum', note: 'count the assignments instead of testing feasibility' },
        { name: 'LeetCode 1049. Last Stone Weight II', note: 'minimize the lane imbalance rather than demanding zero' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt: 'Which two properties must a problem exhibit before dynamic programming actually pays off?',
      choices: [
        'A sorted input and a monotonic predicate over it',
        'Overlapping subproblems and optimal substructure',
        'Independent subproblems and a balanced divide step',
        'A greedy-choice property and exchangeable local decisions',
      ],
      correctIndex: 1,
      explanation:
        'Overlapping subproblems make caching profitable (the recursion re-asks the same questions), and optimal substructure lets each cached answer be trusted by larger problems. Choice 3 describes divide and conquer — mergesort halves never repeat, so a cache would just waste memory. Choice 1 is binary-search territory, and choice 4 is exactly the condition under which you should prefer greedy over DP.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt: 'What actually distinguishes memoization from tabulation?',
      choices: [
        'Memoization is a cache bolted onto a top-down recursive solver; tabulation fills the same state space iteratively from base cases upward',
        'Memoization has strictly better asymptotic time than tabulation',
        'Tabulation visits only the states the answer needs, while memoization always computes every state',
        'Memoization works only for numeric answers; tabulation supports arbitrary value types',
      ],
      correctIndex: 0,
      explanation:
        'Both styles evaluate the same states with the same recurrence, so asymptotics typically match (ruling out choice 2). Choice 3 has it exactly backwards: it is memoization that skips unreachable states, while tabulation usually computes the whole table. Value types are irrelevant to either (choice 4). The real trade-offs are stack depth and control of evaluation order versus ease of writing.',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt:
        'The fewest-tokens DP keeps one slot per sub-amount from 0 to A and tries each of k denominations per slot. Time and space?',
      choices: [
        'O(k log k) time, O(k) space',
        'O(A^2) time, O(A) space',
        'O(A * k) time, O(A) space',
        'O(2^k) time, O(A * k) space',
      ],
      correctIndex: 2,
      explanation:
        'There are A + 1 states and each does O(k) work scanning the denominations, giving O(A * k) time with a single O(A) array. O(A^2) would mean each amount scanned all smaller amounts — the denominations list, not the amount range, bounds the inner loop. O(2^k) is the cost of enumerating denomination subsets, which the unlimited-supply structure makes unnecessary.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'Edit distance between strings of lengths m and n via the prefix-pair table: what is the time, and the standard space improvement?',
      choices: [
        'O(m + n) time, O(1) space',
        'O(m * n) time; O(min(m, n)) space using a rolling row',
        'O((m + n) log(m + n)) time, O(m + n) space',
        'O(m * n) time, and the full O(m * n) table is unavoidable',
      ],
      correctIndex: 1,
      explanation:
        'The table has (m+1)(n+1) cells, each filled in O(1) from its up, left, and up-left neighbors — O(m * n) time. Because a row depends only on the previous row, two rows suffice, and orienting the table so the shorter string spans the columns gives O(min(m, n)) space. Choice 4 is only true if you must reconstruct the actual edit script; for the distance alone, rolling rows work. Linear or linearithmic time (choices 1, 3) are below the known complexity of this problem.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'A prize costs 16 credits and token faces are [1, 5, 12, 19]. You need the fewest tokens summing to exactly 16. A teammate proposes always grabbing the largest face that fits. What do you do?',
      choices: [
        'Approve it — largest-first is always optimal when a 1-valued token exists as a fallback',
        'Sort the faces and run converging two pointers to find a pair summing to 16',
        'Run backtracking over every multiset of tokens and keep the smallest',
        'Reject it: largest-first pays 12+1+1+1+1 = 5 tokens, but 5+5+5+1 = 4 is better — run the DP over sub-amounts 0..16',
      ],
      correctIndex: 3,
      explanation:
        'Greedy is the tempting trap: it works for canonical systems like US coins, but [1, 5, 12, 19] is a concrete counter-example where the local choice (12) strands you with four 1s. Two pointers answers a different question entirely (a pair summing to a target, no repetition). Full backtracking is correct but exponential, and pointless when the amount-indexed DP solves it in O(16 * 4) steps.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'A robot moves only right or down across an m x n warehouse floor with some blocked tiles. Count the distinct routes from the top-left tile to the bottom-right tile. Best approach?',
      choices: [
        'Fill a table where each open tile stores routes(from above) + routes(from the left), seeded with 1 at the entrance',
        'Depth-first search that walks every route and increments a counter at the exit',
        'Breadth-first search from the entrance, returning the count of visited tiles',
        'Compute a binomial coefficient for the grid and subtract the number of blocked tiles',
      ],
      correctIndex: 0,
      explanation:
        'Every route into a tile arrives from above or from the left, and those route sets are disjoint — so counts add, and one O(m * n) table fill answers it. DFS is the tempting graph-tool reflex, but it enumerates each route individually and route counts grow exponentially with grid size. BFS visited-counts measure reachability, not path multiplicity. The closed-form binomial works only on an unobstructed grid; blocked tiles break it in ways a simple subtraction cannot repair.',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt: 'For the non-adjacent max-sum problem (harvest no two adjacent hives), which state design is sufficient and smallest?',
      choices: [
        'The set of indices harvested so far',
        'The current index plus the running total collected so far',
        'Just the prefix boundary i, with dp[i] defined as the best total achievable within the first i elements',
        'No finite state suffices — the problem requires backtracking',
      ],
      correctIndex: 2,
      explanation:
        'The recurrence dp[i] = max(dp[i-1], dp[i-2] + v[i]) shows the prefix boundary alone is enough: the "was the previous one taken?" information is resolved implicitly by comparing the skip branch against the take branch that reaches back two slots. (A state of (index, took-previous) also works but doubles the state count.) The set of harvested indices is exponentially large, and carrying the running total in the state is both enormous and unnecessary because optimal substructure already guarantees sub-answers compose.',
    },
    {
      id: 'q8',
      kind: 'complexity',
      prompt:
        'The staircase recurrence ways(n) = ways(n-1) + ways(n-2) is evaluated by naive recursion, then again with a memo. What changes?',
      choices: [
        'Both are O(n); the memo only saves constant factors',
        'Exponential growth (~phi^n call-tree nodes) collapses to O(n), because only n + 1 distinct states exist',
        'O(n^2) drops to O(n log n)',
        'O(2^n) drops to O(log n), because the memo enables repeated squaring',
      ],
      correctIndex: 1,
      explanation:
        'The naive call tree has a Fibonacci number of leaves — it grows like phi^n (phi ~ 1.618), which is exponential. Memoization caps total work at (#states) x (transition cost) = (n + 1) x O(1) = O(n). Choice 4 conflates memoization with the fast-doubling / matrix-power technique: O(log n) is achievable for this recurrence, but through a different algorithm, not by caching the recursion.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Two green lights that say "this is a DP problem"?',
      back: 'Overlapping subproblems (the brute-force recursion re-asks identical questions) and optimal substructure (optimal answers compose from optimal sub-answers). Missing either, caching buys nothing.',
    },
    {
      id: 'f2',
      front: 'Memoization vs tabulation in one breath?',
      back: 'Same states, same recurrence. Memoization = recursion plus a cache, computes only reachable states but leans on the call stack; tabulation = explicit loops from base cases up, full control of order and easy space tricks.',
    },
    {
      id: 'f3',
      front: 'Recipe for designing a DP state?',
      back: 'The minimal information that makes the rest of the problem self-contained: position plus whatever past choices constrain the future. Acid test: if two histories sharing a state could have different futures, the state is too small.',
    },
    {
      id: 'f4',
      front: 'Rule-of-thumb complexity for any DP?',
      back: 'Time = (number of distinct states) x (work per transition). Space = number of states, often compressible to a rolling window when the recurrence looks back a fixed distance.',
    },
    {
      id: 'f5',
      front: 'Non-adjacent max-sum recurrence?',
      back: 'dp[i] = max(dp[i-1], dp[i-2] + v[i]) — skip element i, or take it on top of the best ending at least two back. Two rolling variables give O(n) time, O(1) space.',
    },
    {
      id: 'f6',
      front: 'Fewest-coins recurrence and the unreachable case?',
      back: 'dp[a] = 1 + min(dp[a - d]) over faces d <= a, with dp[0] = 0. Seed unreachable amounts with a sentinel like amount + 1, and translate it to -1 only at the very end.',
    },
    {
      id: 'f7',
      front: 'Edit-distance recurrence?',
      back: 'Match: D[i][j] = D[i-1][j-1]. Mismatch: 1 + min(D[i-1][j-1] replace, D[i-1][j] delete, D[i][j-1] insert). Row 0 and column 0 are pure inserts and pure deletes.',
    },
    {
      id: 'f8',
      front: 'Why might a correct memoized solution still crash in Python?',
      back: 'Recursion depth: a chain of tens of thousands of states blows the default ~1000-frame stack. Convert to tabulation, or raise the limit deliberately and document why.',
    },
    {
      id: 'f9',
      front: 'When can a DP table be shrunk in memory?',
      back: 'When transitions read only a bounded window of earlier states: last two values (staircase, house-robber) compress to two variables; the previous row (edit distance) compresses to two rows, O(min(m, n)).',
    },
    {
      id: 'f10',
      front: 'A tabulated DP is wrong on some inputs but right on others. First suspects?',
      back: 'Base cases (row/column 0, empty-input conventions) and fill order (every state must be computed after everything it reads). Third classic: the off-by-one between "first i characters" and s[i-1].',
    },
  ],
  cheatSheet: {
    tldr:
      'Dynamic programming turns an exponential recursion into a table fill. Identify the minimal state that makes subproblems self-contained, write a recurrence connecting each state to strictly smaller ones, pin down the base cases, then either memoize the recursion (top-down) or fill the table from the base cases upward (tabulation). Every distinct state is computed exactly once, so the cost collapses from the size of the recursion tree to the number of states times the transition work — and when the recurrence looks back only a fixed distance, the table itself compresses to a rolling window.',
    signals: [
      'Reach for this when the ask is "count the ways", "minimum/maximum cost", "fewest steps", or "is it possible to reach/partition/segment".',
      'Reach for this when sketching the brute-force recursion shows the same arguments recurring across branches — overlapping subproblems.',
      "Reach for this when each choice constrains later choices through a small summary: remaining budget, prefix position, whether the previous item was taken.",
      'Reach for this when a greedy rule fails an exchange-argument check (e.g. coin faces [1, 5, 12, 19] for amount 16).',
      'Be suspicious when subproblems never repeat (plain divide and conquer) or when the only valid state would be the entire history — DP buys nothing there.',
    ],
    template: `# Top-down (memoization): recurrence as a cached function of the state
from functools import lru_cache

def solve(data):
    @lru_cache(maxsize=None)
    def best(state):
        if is_base(state):
            return base_value(state)      # trivially known answers
        return combine(                   # min / max / sum over options
            best(smaller)
            for smaller in transitions(state)
        )
    return best(start_state)

# Bottom-up (tabulation): seed bases, fill in dependency order
dp = [base_value] * (n + 1)               # dp[s] = answer for state s
for s in fill_order:                      # every dependency already filled
    dp[s] = combine(dp[prev] for prev in transitions(s))
answer = dp[goal_state]`,
    complexity:
      'Time O(#states x transition work); Space O(#states), often O(window) after rolling-array compression.',
  },
}

export default mod
