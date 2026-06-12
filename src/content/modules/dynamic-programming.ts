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
