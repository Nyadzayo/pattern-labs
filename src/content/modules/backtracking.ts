import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'backtracking',
  visualizer: 'backtracking',
  concept: `
## The mental model

Backtracking is depth-first trial and error with a flawless memory of how to take things back. Picture exploring a cave with a ball of string. At every junction you pick a tunnel and unroll string as you walk. Hit a dead end? Follow the string back to the junction, rewinding as you go, and try the next tunnel. You never wander the same tunnel twice from the same junction, and you can always retrace your way out. The string is your \`path\`; rewinding it is the undo step.

Formally, you are walking a **decision tree**. Every solution is a sequence of choices — flag in or out, a plate size, a column for this row, a direction for the next letter. Each tree node is a *partial* candidate; each edge is one choice. Brute force would build every leaf and filter at the end. Backtracking's whole edge is that it inspects partial candidates **on the way down** and abandons a branch the instant it becomes hopeless — chopping off the entire subtree below it without ever building it.

## Mechanics

Every backtracking function has the same three-beat heartbeat: **choose, explore, unchoose**.

\`\`\`python
def backtrack(path, start):
    if is_complete(path):
        results.append(path.copy())   # snapshot! path keeps mutating
        return
    for choice in options(start):
        if violates(choice, path):
            continue                  # prune BEFORE descending
        path.append(choice)           # choose: mutate shared state
        backtrack(path, nxt(choice))  # explore: recurse one level deeper
        path.pop()                    # unchoose: restore state EXACTLY
\`\`\`

Three details carry most of the weight in practice:

1. **The start index.** For combinations, order does not matter — \`[3, 5]\` and \`[5, 3]\` are the same multiset. Sort the candidates and only ever pick at-or-after your current index: pass \`i + 1\` to move on, or \`i\` to allow reuse of the same item. Every combination then comes out exactly once, in a canonical non-decreasing form.
2. **Incremental constraint state.** Re-scanning the whole partial solution to validate each choice costs \`O(n)\` per node. Instead, carry the constraints with you — a set of used columns, used diagonals, a marked grid cell — so each check is \`O(1)\`. Add on the way down, remove on the way up.
3. **Exact undo.** The unchoose step must be a perfect mirror of choose. Sibling branches must see the identical state the parent saw. A half-finished undo leaks constraints sideways and quietly drops or duplicates solutions.

## When to reach for it

- The ask is **"all"**, **"every"**, **"generate"**, or **"enumerate"** valid somethings — subsets, combinations, arrangements, paths. If the output itself can be exponential, exponential time is the floor, not a failure.
- You must **count** solutions under constraints that entangle every choice with every other (column and diagonal clashes), so there is no clean subproblem decomposition for DP to exploit.
- The ask is **"does there exist"** a path or assignment, and the move structure is irregular enough that you must search with the ability to retreat — tracing a word through grid cells without revisits is the canonical case.
- **n is small.** Subsets are viable to roughly n ≈ 20, permutations to n ≈ 10–12. Constraints quoting tiny bounds are the strongest tell in an interview.

Be suspicious when only a **count or optimum** is needed and subproblems overlap cleanly (coin-change counts, grid path counts) — DP collapses those without enumerating. And when you want a **shortest** anything in an unweighted space, BFS reaches it first; backtracking would wade through exponentially many longer paths.

## Complexity

The cost is the size of the decision tree you actually visit. With branching factor \`b\` and depth \`d\` that is \`O(b^d)\` worst case. The two anchors to memorize: subsets of n items generate \`2^n\` nodes and copying each snapshot makes it \`O(n * 2^n)\`; permutations generate \`n!\` leaves for \`O(n * n!)\`. Pruning cannot improve the worst case, but it routinely turns "heat death of the universe" into milliseconds in the average case — n-queens explores a vanishing sliver of the \`n^n\` raw tree. Space is the recursion depth plus the path: \`O(d)\` beyond the output.

## Common pitfalls

- **Appending the live list.** \`results.append(path)\` stores a reference; every "solution" aliases the same list, which is empty when the recursion unwinds. Snapshot with \`path.copy()\`.
- **Partial undo.** Add to three constraint sets but remove from two, and the bug surfaces three branches later where it is miserable to trace.
- **Pruning too late.** Validating only at the leaves is still correct — and still brute force. Test constraints before recursing, not after.
- **Duplicate combinations** from treating order as significant. Forgetting the start index yields every permutation of every combination.
- **Unmarking on only one exit path.** In grid DFS, restore the cell whether the branch succeeds or fails, or later traces see a corrupted board.
- **Recursion depth.** Python's default limit is about 1000 frames; a path-shaped search on a large input can hit it.
`,
  realWorldUses: [
    {
      title: 'SAT and constraint solvers',
      description:
        'DPLL-family SAT solvers — the engines inside hardware verification and program analysis tools — assign a truth value to one variable, propagate the consequences, and on contradiction undo the assignment and flip it. Modern CDCL solvers add learned clauses and non-chronological backjumping, but the skeleton is textbook backtracking.',
    },
    {
      title: 'Package dependency resolution',
      description:
        "pip's resolver and Cargo pick a version for one package, recurse into its requirements, and when two packages demand incompatible versions of a shared dependency, they backtrack: discard the tentative choice, try an older release, and re-explore. The 'resolution-too-deep' errors users see are pruning limits on that search tree.",
    },
    {
      title: 'Backtracking regex engines',
      description:
        'PCRE and Python\'s re module match patterns by trying one alternative of an alternation or one split of a quantifier, and rewinding the input cursor on failure to try the next. Catastrophic backtracking — the famous (a+)+ blowup — is exactly this decision tree exploding without pruning.',
    },
  ],
  problems: [
    {
      id: 'flag-rollout-sets',
      title: 'Feature Flag Test Matrix',
      difficulty: 'easy',
      statement: `
A QA engineer is signing off a release that ships several independent feature flags. Any flag can be on or off, and bugs love to hide in *interactions*, so the test plan must cover **every possible configuration** — every subset of enabled flags, including the configuration where none are enabled.

Given a list \`flags\` of distinct flag names, return all subsets as a list of lists of strings, in this exact order so the test report is reproducible:

- inside each subset, names are sorted **alphabetically**;
- subsets are ordered by **size ascending**;
- among subsets of the same size, order them **lexicographically**, comparing the subsets element by element as sequences of strings.

So for two flags the report reads: empty set first, then each single flag alphabetically, then the pair.
`,
      examples: [
        {
          input: 'flags = ["dark_mode", "beta"]',
          output: '[[], ["beta"], ["dark_mode"], ["beta", "dark_mode"]]',
          explanation:
            'Size 0 first, then the two singles in alphabetical order, then the only pair (itself internally sorted).',
        },
        {
          input: 'flags = []',
          output: '[[]]',
          explanation: 'With no flags there is exactly one configuration to test: everything off.',
        },
        {
          input: 'flags = ["y", "x", "z"]',
          output: '[[], ["x"], ["y"], ["z"], ["x", "y"], ["x", "z"], ["y", "z"], ["x", "y", "z"]]',
          explanation:
            'Input order is irrelevant: 8 subsets total, grouped by size, lexicographic within each size band.',
        },
      ],
      constraints: [
        '0 <= len(flags) <= 12',
        'Flag names are distinct, non-empty, and contain only lowercase letters, digits, and underscores',
        'Every subset must appear exactly once, in the order specified',
      ],
      hints: [
        'Before writing any code, pin down the target: for 3 flags there are exactly 8 configurations. List them by hand in the required order — the structure of that list suggests how to build it.',
        'Sort the names once, then grow a current selection with a start index: every subset reachable from here either stops now (record it) or extends with one flag that comes after everything already chosen.',
        'Record path.copy() at every node (not just leaves), then for i in range(start, n): append flags[i], recurse with i + 1, pop. Finish with results.sort(key=lambda s: (len(s), s)) to get the size-then-lex order.',
      ],
      functionName: 'enumerate_flag_sets',
      starterCode: `def enumerate_flag_sets(flags: list[str]) -> list[list[str]]:
    pass
`,
      solution: {
        code: `def enumerate_flag_sets(flags: list[str]) -> list[list[str]]:
    # Sort once so subsets come out internally alphabetical for free.
    items = sorted(flags)
    results: list[list[str]] = []
    path: list[str] = []

    def backtrack(start: int) -> None:
        # Every node of the decision tree IS a valid subset: record it.
        # Snapshot with copy() — path keeps mutating after we leave.
        results.append(path.copy())
        for i in range(start, len(items)):
            path.append(items[i])   # choose: include items[i]
            backtrack(i + 1)        # explore: only items after i may follow
            path.pop()              # unchoose: restore for the next sibling

    backtrack(0)
    # The DFS emits subsets in lexicographic order; re-key by
    # (size, sequence) to get the size-ascending report order.
    results.sort(key=lambda s: (len(s), s))
    return results
`,
        commentary: `
This is the purest form of the pattern: there are no constraints to prune on, so the decision tree and the answer are the same thing. The two ideas worth internalizing:

**Every node is a solution.** Unlike target-seeking problems, a subset enumeration records \`path.copy()\` at *every* call, not just at leaves. The recursion tree for n items has exactly \`2^n\` nodes — one per subset — so nothing is wasted.

**The start index kills duplicates structurally.** By only appending items at or after \`start\`, each subset is built in exactly one way: in sorted order. Without it you would generate \`["beta", "dark_mode"]\` and \`["dark_mode", "beta"]\` as separate paths and need a set of frozensets to dedupe — strictly worse.

The final \`sort\` re-keys the natural DFS order (lexicographic) into the requested size-then-lex order. It is actually the asymptotic bottleneck: sorting \`2^n\` subsets takes \`O(2^n * log(2^n)) = O(n * 2^n)\` comparisons, and each comparison of two lists can cost up to \`O(n)\`, for \`O(n^2 * 2^n)\` worst case — more than the \`O(n * 2^n)\` generation. You could avoid the sort entirely by generating subsets size by size (one bounded DFS per target size), but for the n <= 12 limit here the straightforward sort is perfectly fine.
`,
        complexity: 'Time O(n^2 * 2^n) (the size-then-lex sort dominates the O(n * 2^n) generation), Space O(n) beyond the output',
      },
      testCases: [
        {
          input: [['dark_mode', 'beta']],
          expected: [[], ['beta'], ['dark_mode'], ['beta', 'dark_mode']],
          label: 'two flags',
        },
        { input: [[]], expected: [[]], label: 'no flags — only the all-off config' },
        {
          input: [['y', 'x', 'z']],
          expected: [
            [],
            ['x'],
            ['y'],
            ['z'],
            ['x', 'y'],
            ['x', 'z'],
            ['y', 'z'],
            ['x', 'y', 'z'],
          ],
          label: 'unsorted input',
        },
        { input: [['a']], expected: [[], ['a']], hidden: true, label: 'single flag' },
        {
          input: [['m', 'a', 't', 'h']],
          expected: [
            [],
            ['a'],
            ['h'],
            ['m'],
            ['t'],
            ['a', 'h'],
            ['a', 'm'],
            ['a', 't'],
            ['h', 'm'],
            ['h', 't'],
            ['m', 't'],
            ['a', 'h', 'm'],
            ['a', 'h', 't'],
            ['a', 'm', 't'],
            ['h', 'm', 't'],
            ['a', 'h', 'm', 't'],
          ],
          hidden: true,
          label: 'four flags, 16 subsets',
        },
        {
          input: [['flag2', 'flag10', 'flag1']],
          expected: [
            [],
            ['flag1'],
            ['flag10'],
            ['flag2'],
            ['flag1', 'flag10'],
            ['flag1', 'flag2'],
            ['flag10', 'flag2'],
            ['flag1', 'flag10', 'flag2'],
          ],
          hidden: true,
          label: 'string sort, not numeric ("flag10" < "flag2")',
        },
        {
          input: [['b', 'a']],
          expected: [[], ['a'], ['b'], ['a', 'b']],
          hidden: true,
          label: 'reverse-sorted input',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 78. Subsets', note: 'the classic, without the ordering contract' },
        { name: 'LeetCode 90. Subsets II', note: 'adds duplicate elements — skip equal siblings' },
        { name: 'LeetCode 77. Combinations', note: 'fixed subset size k — prune on remaining count' },
      ],
    },
    {
      id: 'counterweight-kits',
      title: 'Counterweight Kits',
      difficulty: 'medium',
      statement: `
An elevator technician balances a car by stacking steel plates until they hit an exact target weight. The depot stocks a few distinct plate sizes and has an **unlimited supply of each**. Two kits that use the same plates in a different stacking order count as the **same kit** — what matters is how many of each size you take.

Given the distinct positive integers \`plates\` and an integer \`target\`, return **every distinct kit** whose plate sizes sum to exactly \`target\`, as a list of lists:

- each kit listed in **non-decreasing** order of plate size;
- the list of kits in **lexicographic order**, comparing element by element, where a kit that is a strict prefix of another comes first (so \`[2, 2, 4]\` precedes \`[2, 3, 3]\`, and \`[2]\` would precede \`[2, 2]\`).

Return \`[]\` if no kit can hit the target exactly.
`,
      examples: [
        {
          input: 'plates = [2, 3, 5], target = 8',
          output: '[[2, 2, 2, 2], [2, 3, 3], [3, 5]]',
          explanation:
            'Three distinct multisets hit 8. [3, 5] and [5, 3] are the same kit, listed once in non-decreasing form.',
        },
        {
          input: 'plates = [2], target = 7',
          output: '[]',
          explanation: 'Stacks of 2 only reach even weights; 7 is unreachable.',
        },
        {
          input: 'plates = [7], target = 7',
          output: '[[7]]',
          explanation: 'A single plate is a perfectly good kit.',
        },
      ],
      constraints: [
        '1 <= len(plates) <= 8',
        'Plate sizes are distinct integers with 1 <= plate <= 40',
        '1 <= target <= 40',
        'The total number of valid kits never exceeds 200',
      ],
      hints: [
        'Why are [3, 5] and [5, 3] the same kit? Find a canonical written form for a multiset of plates, so that each kit can only ever be generated one way.',
        'Sort the plates and never pick a plate smaller than the one you just picked: pass a start index down the recursion, and to allow reuse of the same size, recurse with the same index i rather than i + 1.',
        'Carry remaining = target minus the path sum. remaining == 0 means record path.copy() and return. Because plates are sorted, the moment sizes[i] > remaining you can break out of the whole loop, not just skip one.',
      ],
      functionName: 'counterweight_combos',
      starterCode: `def counterweight_combos(plates: list[int], target: int) -> list[list[int]]:
    pass
`,
      solution: {
        code: `def counterweight_combos(plates: list[int], target: int) -> list[list[int]]:
    # Sorted sizes make the output canonical AND unlock the break-prune.
    sizes = sorted(plates)
    results: list[list[int]] = []
    path: list[int] = []

    def backtrack(start: int, remaining: int) -> None:
        if remaining == 0:
            # Exact hit: snapshot the kit. path is non-decreasing by
            # construction, so no per-kit sort is needed.
            results.append(path.copy())
            return
        for i in range(start, len(sizes)):
            if sizes[i] > remaining:
                # Sorted candidates: every later plate is even heavier,
                # so the entire rest of this level is infeasible.
                break
            path.append(sizes[i])            # choose this plate
            backtrack(i, remaining - sizes[i])  # i, not i + 1: reuse allowed
            path.pop()                       # unchoose for the next size

    backtrack(0, target)
    # DFS over sorted sizes already emits kits in lexicographic order.
    return results
`,
        commentary: `
The crux is **canonical form**. A kit is a multiset, but recursion produces sequences — so we force every multiset into exactly one sequence: the non-decreasing one. The start index enforces it: once you move past a size you may never come back to it, but recursing with \`i\` (not \`i + 1\`) lets you take the *current* size again. That one-character difference is the whole "reuse allowed" semantics.

The prune is the second lesson. \`continue\` would test every remaining size individually; because the sizes are sorted, \`break\` discards all of them at once the moment one is too heavy. The check happens *before* descending — a doomed branch never allocates a stack frame.

Why does the output need no final sort? DFS tries smaller sizes first at every level, so completed kits appear in exactly the element-by-element lexicographic order the statement demands — a prefix completes (hits zero) before its extensions are even attempted.
`,
        complexity:
          'Time O(k * target/min(plates)) per emitted kit in the worst case — exponential in target overall; Space O(target/min(plates)) recursion depth beyond the output',
      },
      testCases: [
        {
          input: [[2, 3, 5], 8],
          expected: [
            [2, 2, 2, 2],
            [2, 3, 3],
            [3, 5],
          ],
          label: 'three kits',
        },
        { input: [[7], 7], expected: [[7]], label: 'single-plate kit' },
        { input: [[2], 7], expected: [], label: 'unreachable odd target' },
        {
          input: [[8, 4, 2], 8],
          expected: [
            [2, 2, 2, 2],
            [2, 2, 4],
            [4, 4],
            [8],
          ],
          label: 'unsorted input, four kits',
        },
        {
          input: [[1], 4],
          expected: [[1, 1, 1, 1]],
          hidden: true,
          label: 'one size reused to fill everything',
        },
        { input: [[5, 10], 3], expected: [], hidden: true, label: 'every plate exceeds the target' },
        {
          input: [[2, 3, 6, 7], 7],
          expected: [
            [2, 2, 3],
            [7],
          ],
          hidden: true,
          label: 'mix of deep and shallow kits',
        },
        {
          input: [[3, 4, 5], 12],
          expected: [
            [3, 3, 3, 3],
            [3, 4, 5],
            [4, 4, 4],
          ],
          hidden: true,
          label: 'three sizes all participate',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 39. Combination Sum', note: 'the same reuse-allowed core' },
        { name: 'LeetCode 40. Combination Sum II', note: 'no reuse + duplicate candidates' },
        { name: 'LeetCode 216. Combination Sum III', note: 'adds a fixed kit size' },
      ],
    },
    {
      id: 'serial-trace',
      title: 'Tracing the Serial Code',
      difficulty: 'medium',
      statement: `
A circuit board's test pads are laid out in a rectangular grid, and each pad is silkscreened with one uppercase letter. A diagnostic probe verifies a board by physically tracing its serial code: it starts on any pad and steps only between **edge-adjacent** pads (up, down, left, right — never diagonally), reading one letter per pad. Touching a pad leaves flux residue, so the probe may **never revisit a pad** within a single trace.

Given \`board\` (a grid of single-character strings) and the serial \`code\`, return \`True\` if some sequence of moves spells the code exactly, and \`False\` otherwise.
`,
      examples: [
        {
          input: 'board = [["P","R","O"],["Y","E","B"]], code = "PROBE"',
          output: 'True',
          explanation:
            'Trace (0,0) -> (0,1) -> (0,2) -> (1,2) -> (1,1): P, R, O, B, E with every step edge-adjacent and no pad reused.',
        },
        {
          input: 'board = [["P","R","O"],["Y","E","B"]], code = "PROBES"',
          output: 'False',
          explanation: 'There is no S anywhere on the board, so no trace can finish.',
        },
        {
          input: 'board = [["N","O"],["O","N"]], code = "NOON"',
          output: 'False',
          explanation:
            'All four letters exist, but the two O pads are diagonal to each other — the middle O-to-O step of N-O-O-N cannot be walked with edge-adjacent moves.',
        },
      ],
      constraints: [
        '1 <= rows, cols <= 8',
        'Each board cell is a single uppercase letter A-Z',
        '1 <= len(code) <= 20, uppercase letters only',
        'A pad may be used at most once per trace; traces may start on any pad',
      ],
      hints: [
        'The code might start anywhere, and a partially built trace can fail many steps in. What information must you carry while extending a partial trace so you never step on a used pad — and what must happen to that information when the attempt retreats?',
        'For every cell matching code[0], run a depth-first search carrying an index k: the current cell must equal code[k]; mark the pad used; try all four neighbors for letter k + 1; unmark before returning either way.',
        "Overwrite board[r][c] with a sentinel like '#' before recursing and restore the letter afterward — an in-place visited set. Out-of-bounds and letter-mismatch checks at the top of dfs keep the four recursive calls branch-free; k reaching len(code) is success.",
      ],
      functionName: 'can_trace_code',
      starterCode: `def can_trace_code(board: list[list[str]], code: str) -> bool:
    pass
`,
      solution: {
        code: `from collections import Counter


def can_trace_code(board: list[list[str]], code: str) -> bool:
    rows, cols = len(board), len(board[0])

    # Cheap global prune: if the board lacks enough copies of some
    # letter, no trace can exist — skip the search entirely.
    have = Counter(ch for row in board for ch in row)
    need = Counter(code)
    if any(have[ch] < cnt for ch, cnt in need.items()):
        return False

    def dfs(r: int, c: int, k: int) -> bool:
        if k == len(code):
            return True                       # spelled every letter
        if r < 0 or r >= rows or c < 0 or c >= cols:
            return False                      # stepped off the board
        if board[r][c] != code[k]:
            return False                      # wrong letter or used pad
        board[r][c] = '#'                     # choose: mark pad used
        found = (
            dfs(r + 1, c, k + 1)
            or dfs(r - 1, c, k + 1)
            or dfs(r, c + 1, k + 1)
            or dfs(r, c - 1, k + 1)
        )
        board[r][c] = code[k]                 # unchoose: restore the letter
        return found

    # The trace may start on any pad.
    return any(dfs(r, c, 0) for r in range(rows) for c in range(cols))
`,
        commentary: `
This is backtracking where the "path" lives in the board itself. Writing \`'#'\` into the cell does double duty: it is the visited marker, and because \`'#'\` can never equal a code letter, the mismatch check at the top of \`dfs\` silently rejects revisits with zero extra bookkeeping.

The restore line is the soul of the solution. It runs whether the branch succeeded or failed, so every caller — including a *different starting pad* tried later by \`any\` — sees a pristine board. Skip it and the NOON-style cases poison each other: a failed trace from one corner leaves ghost markers that block a valid trace from another.

The Counter pre-check is a global prune: it costs one linear pass and instantly kills searches like "PROBES" (no S exists) that would otherwise probe every P on the board. Order-of-checks matters too — bounds, then letter — so the four recursive calls need no guards of their own.
`,
        complexity: 'Time O(rows * cols * 3^len(code)), Space O(len(code)) recursion depth',
      },
      testCases: [
        { input: [[['P', 'R', 'O'], ['Y', 'E', 'B']], 'PROBE'], expected: true, label: 'snake trace' },
        {
          input: [[['P', 'R', 'O'], ['Y', 'E', 'B']], 'PROBES'],
          expected: false,
          label: 'missing letter',
        },
        {
          input: [[['N', 'O'], ['O', 'N']], 'NOON'],
          expected: false,
          label: 'letters exist but only diagonally',
        },
        { input: [[['N', 'O'], ['O', 'N']], 'NON'], expected: true, hidden: true, label: 'short trace works' },
        { input: [[['Q']], 'Q'], expected: true, label: 'one-pad board' },
        { input: [[['Q']], 'QQ'], expected: false, hidden: true, label: 'would need a revisit' },
        {
          input: [[['A', 'A'], ['A', 'A']], 'AAAA'],
          expected: true,
          hidden: true,
          label: 'all-equal board, full tour',
        },
        {
          input: [[['A', 'A'], ['A', 'A']], 'AAAAA'],
          expected: false,
          hidden: true,
          label: 'code longer than the board',
        },
        {
          input: [[['A', 'A', 'A'], ['A', 'X', 'A'], ['A', 'A', 'A']], 'AAAAAAAA'],
          expected: true,
          hidden: true,
          label: 'ring walk around a blocker',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 79. Word Search', note: 'the classic grid-trace problem' },
        { name: 'LeetCode 212. Word Search II', note: 'many words — add a trie to share prefixes' },
        { name: 'LeetCode 1219. Path with Maximum Gold', note: 'same mark/unmark walk, maximizing instead' },
      ],
    },
    {
      id: 'laser-pegboard',
      title: 'Laser Pegboard Layouts',
      difficulty: 'hard',
      statement: `
An optics lab mounts \`n\` laser emitters on an \`n x n\` pegboard for a calibration rig — **exactly one emitter per row**. Each emitter fires test beams along its entire row, its entire column, and both of its diagonals. Two emitters must never be able to hit each other, so no pair may share a row, a column, or a diagonal.

Some pegs are damaged and cannot hold an emitter. You are given \`n\` and a list \`blocked\` of damaged pegs as \`[row, col]\` pairs (0-indexed).

Return the **number** of distinct valid layouts. Layouts are counted, not listed — two layouts are distinct if any emitter sits on a different peg.
`,
      examples: [
        {
          input: 'n = 4, blocked = []',
          output: '2',
          explanation:
            'Exactly two layouts exist: emitters at columns [1, 3, 0, 2] for rows 0..3, and the mirror image [2, 0, 3, 1].',
        },
        {
          input: 'n = 4, blocked = [[0, 1]]',
          output: '1',
          explanation:
            'The damaged peg (0,1) kills the [1, 3, 0, 2] layout, which needs row 0 column 1. Only the mirror survives.',
        },
        {
          input: 'n = 2, blocked = []',
          output: '0',
          explanation:
            'On a 2x2 board every pair of pegs in different rows shares a column or a diagonal — no layout works even with all pegs intact.',
        },
      ],
      constraints: [
        '1 <= n <= 9',
        '0 <= len(blocked) <= n * n, all pairs distinct and within the board',
        'Exactly one emitter per row; return the count as an integer',
      ],
      hints: [
        'One emitter per row means a complete layout is just a choice of one column for each row, top to bottom. When a partial layout for rows 0..r is doomed, how early can you know — and what would you need to remember to know it in O(1)?',
        'Walk row by row. Keep three sets: used columns, used r - c values (one per falling diagonal), and used r + c values (one per rising diagonal). A peg is safe iff it is undamaged and hits none of the three sets.',
        'Write place(row) returning a count: if row == n, return 1. Otherwise, for each safe column, add (col, row - col, row + col) to the sets, accumulate place(row + 1), then remove all three before trying the next column. Sum over columns is the answer.',
      ],
      functionName: 'count_laser_layouts',
      starterCode: `def count_laser_layouts(n: int, blocked: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `def count_laser_layouts(n: int, blocked: list[list[int]]) -> int:
    # Damaged pegs as a set of (row, col) for O(1) lookups.
    banned = {(r, c) for r, c in blocked}

    # Constraint state, maintained incrementally:
    cols: set[int] = set()    # columns already hosting an emitter
    falling: set[int] = set() # r - c is constant along a falling diagonal
    rising: set[int] = set()  # r + c is constant along a rising diagonal

    def place(row: int) -> int:
        if row == n:
            return 1  # every row filled without conflict: one valid layout
        total = 0
        for col in range(n):
            if (
                (row, col) in banned
                or col in cols
                or (row - col) in falling
                or (row + col) in rising
            ):
                continue  # prune: this peg conflicts, skip its whole subtree
            # choose: claim column and both diagonals
            cols.add(col)
            falling.add(row - col)
            rising.add(row + col)
            total += place(row + 1)  # explore: count layouts below
            # unchoose: release all three so the next column starts clean
            cols.remove(col)
            falling.remove(row - col)
            rising.remove(row + col)
        return total

    return place(0)
`,
        commentary: `
The first insight is the **representation**: because each row hosts exactly one emitter, a layout is fully described by one column index per row. That collapses the search space from "choose n pegs among n^2" (about n^2-choose-n) to n^n raw sequences before pruning — and the row constraint is satisfied by construction, never checked.

The second is **O(1) conflict checks via diagonal arithmetic**. Every falling diagonal shares a single \`r - c\` value and every rising diagonal a single \`r + c\` value, so three small sets replace any rescan of previously placed emitters. Add on the way down, remove on the way up — the same three-beat heartbeat as every backtracking solution, here applied to constraint state rather than a path.

Counting instead of listing changes only the leaf: \`return 1\` and sum the recursive results. The blocked-peg set composes for free as one more O(1) condition in the prune. For n = 9 with no blocks the search visits a few thousand nodes — the pruning discards essentially all of the 387 million raw column sequences.
`,
        complexity: 'Time O(n!) nodes explored in the worst case (heavily pruned), Space O(n) for the sets and recursion',
      },
      testCases: [
        { input: [1, []], expected: 1, label: 'single peg, single layout' },
        { input: [4, []], expected: 2, label: 'classic 4x4' },
        { input: [2, []], expected: 0, label: 'too cramped even unblocked' },
        { input: [4, [[0, 1]]], expected: 1, label: 'block kills one of two layouts' },
        { input: [3, []], expected: 0, hidden: true, label: '3x3 has no layout' },
        { input: [1, [[0, 0]]], expected: 0, hidden: true, label: 'only peg is damaged' },
        { input: [5, []], expected: 10, hidden: true, label: '5x5 unblocked' },
        { input: [6, []], expected: 4, hidden: true, label: '6x6 unblocked' },
        { input: [8, []], expected: 92, hidden: true, label: '8x8 unblocked' },
        { input: [5, [[2, 2]]], expected: 8, hidden: true, label: 'center peg damaged on 5x5' },
      ],
      furtherPractice: [
        { name: 'LeetCode 52. N-Queens II', note: 'the unblocked counting core' },
        { name: 'LeetCode 51. N-Queens', note: 'emit the boards instead of counting' },
        { name: 'LeetCode 37. Sudoku Solver', note: 'heavier constraint propagation, same skeleton' },
      ],
    },
    {
      id: 'audio-guide-mnemonics',
      title: 'Audio Guide Mnemonics',
      difficulty: 'easy',
      statement: `
A museum's handheld audio guide has a numeric keypad, and every exhibit is reached by typing its numeric code. To help visitors remember codes, each key from 2 to 9 is also printed with letters, exactly like this:

\`\`\`
2 -> abc   3 -> def   4 -> ghi   5 -> jkl
6 -> mno   7 -> pqrs  8 -> tuv   9 -> wxyz
\`\`\`

The curators want to pick a pronounceable nickname for each exhibit, so they need **every** letter string the code could stand for: one letter chosen from each key, in the order the digits appear.

Given the digit string \`code\`, return all possible mnemonics as a list of strings in **lexicographic (dictionary) order**. If \`code\` is empty there is nothing to spell: return an empty list.
`,
      examples: [
        {
          input: 'code = "23"',
          output: '["ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"]',
          explanation:
            'Key 2 offers a/b/c for the first letter and key 3 offers d/e/f for the second: 3 x 3 = 9 mnemonics, in dictionary order.',
        },
        {
          input: 'code = "7"',
          output: '["p", "q", "r", "s"]',
          explanation: 'A single key with four letters yields four one-letter mnemonics.',
        },
        {
          input: 'code = ""',
          output: '[]',
          explanation: 'No digits means no mnemonics — an empty list, not a list holding an empty string.',
        },
      ],
      constraints: [
        '0 <= len(code) <= 6',
        "code contains only the digits '2' through '9'",
        'Mnemonics must appear in lexicographic order, each exactly len(code) letters long',
      ],
      hints: [
        "Before any code, count the mnemonics for '79' by hand: key 7 carries four letters and key 9 carries four. The number you land on — and the way you computed it — reveals the shape of the whole answer.",
        'Build one mnemonic letter by letter. A partial string of length k has committed one letter for each of the first k digits; extending it means trying, in turn, each letter printed on key code[k].',
        "Carry a path list and an index k. When k == len(code), record ''.join(path). Otherwise for ch in keypad[code[k]]: append ch, recurse with k + 1, pop. Each key lists its letters alphabetically, so this branch order emits mnemonics in lexicographic order with no final sort.",
      ],
      functionName: 'expand_exhibit_code',
      starterCode: `def expand_exhibit_code(code: str) -> list[str]:
    pass
`,
      solution: {
        code: `KEYPAD = {
    '2': 'abc', '3': 'def', '4': 'ghi', '5': 'jkl',
    '6': 'mno', '7': 'pqrs', '8': 'tuv', '9': 'wxyz',
}


def expand_exhibit_code(code: str) -> list[str]:
    # An empty code spells nothing: empty list, not [""].
    if not code:
        return []
    results: list[str] = []
    path: list[str] = []

    def backtrack(k: int) -> None:
        if k == len(code):
            # One letter committed per digit: the mnemonic is complete.
            results.append(''.join(path))
            return
        # Each key lists its letters alphabetically, so visiting them in
        # printed order emits the results in lexicographic order for free.
        for ch in KEYPAD[code[k]]:
            path.append(ch)    # choose a letter for digit k
            backtrack(k + 1)   # explore the remaining digits
            path.pop()         # unchoose before the key's next letter

    backtrack(0)
    return results
`,
        commentary: `
This is backtracking with the training wheels still on — and that is exactly why it is worth doing once in isolation. The decision tree has **fixed depth** (one level per digit) and **no constraints at all**: every branch survives to the bottom, so every leaf is a solution and the unchoose step exists purely to let siblings share the one mutable \`path\`. What remains when you strip pruning away is the pattern's skeleton: choose, explore, unchoose, snapshot at the base case.

The facet to take with you is **deterministic output order from deterministic branch order**. Nothing about the recursion is sorted afterward; the dictionary order of the result falls out of two facts composed together — digits are consumed left to right (earlier positions dominate the comparison) and each key's letters are tried alphabetically (ties at a position resolve correctly). When a problem dictates an output order, look first at whether the branch order can simply *be* that order.

The empty-code guard matters more than it looks: the bare recursion would happily record \`''\` (the empty product has exactly one term), but the statement defines an empty code as spelling nothing. Read edge-case contracts; do not let the recursion decide them for you.
`,
        complexity: 'Time O(L * 4^L) where L = len(code) — up to 4^L mnemonics, each joined in O(L); Space O(L) for the path and recursion beyond the output',
      },
      testCases: [
        {
          input: ['23'],
          expected: ['ad', 'ae', 'af', 'bd', 'be', 'bf', 'cd', 'ce', 'cf'],
          label: 'two keys, nine mnemonics',
        },
        { input: ['7'], expected: ['p', 'q', 'r', 's'], label: 'single four-letter key' },
        { input: [''], expected: [], label: 'empty code spells nothing' },
        {
          input: ['79'],
          expected: [
            'pw', 'px', 'py', 'pz', 'qw', 'qx', 'qy', 'qz',
            'rw', 'rx', 'ry', 'rz', 'sw', 'sx', 'sy', 'sz',
          ],
          hidden: true,
          label: 'two four-letter keys, 16 mnemonics',
        },
        {
          input: ['222'],
          expected: [
            'aaa', 'aab', 'aac', 'aba', 'abb', 'abc', 'aca', 'acb', 'acc',
            'baa', 'bab', 'bac', 'bba', 'bbb', 'bbc', 'bca', 'bcb', 'bcc',
            'caa', 'cab', 'cac', 'cba', 'cbb', 'cbc', 'cca', 'ccb', 'ccc',
          ],
          hidden: true,
          label: 'repeated key, 27 mnemonics',
        },
        { input: ['9'], expected: ['w', 'x', 'y', 'z'], hidden: true, label: 'last key alone' },
        {
          input: ['86'],
          expected: ['tm', 'tn', 'to', 'um', 'un', 'uo', 'vm', 'vn', 'vo'],
          hidden: true,
          label: 'descending digits still ascend lexicographically',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 17. Letter Combinations of a Phone Number', note: 'the classic framing' },
        { name: 'LeetCode 784. Letter Case Permutation', note: 'two-way branching per character' },
      ],
    },
    {
      id: 'reversible-pennant-cuts',
      title: 'Reversible Pennant Cuts',
      difficulty: 'medium',
      statement: `
A festival workshop turns a long fabric strip printed with lowercase letters into a string of pennants. The strip is cut into contiguous segments, each segment becomes one pennant, and because the pennants are sheer, every pennant must read **identically from both sides** — each segment must read the same forwards and backwards.

Given the string \`strip\`, return **every** way to cut it into such segments, as a list of cuttings, where each cutting is the list of its segments in left-to-right order.

Order the cuttings deterministically: comparing two cuttings at the **first segment where they differ**, the one with the **shorter** segment there comes first. (Both cut the same strip, so at that first difference one segment is always a prefix of the other.)
`,
      examples: [
        {
          input: 'strip = "aab"',
          output: '[["a", "a", "b"], ["aa", "b"]]',
          explanation:
            'Both cuttings use only two-sided-readable segments. They first differ at segment one ("a" vs "aa"), and the shorter comes first.',
        },
        {
          input: 'strip = "noon"',
          output: '[["n", "o", "o", "n"], ["n", "oo", "n"], ["noon"]]',
          explanation:
            '"no" and "on" read differently reversed, so the only options are single letters, the "oo" pair, or the whole word — itself a palindrome.',
        },
        {
          input: 'strip = "ab"',
          output: '[["a", "b"]]',
          explanation:
            '"ab" reversed is "ba", so the whole strip cannot be one pennant; only the letter-by-letter cutting works.',
        },
      ],
      constraints: [
        '1 <= len(strip) <= 12',
        'strip contains lowercase letters only',
        'Every letter belongs to exactly one segment; segments keep their original left-to-right order',
        'At least one cutting always exists (single letters always qualify)',
      ],
      hints: [
        "Cut 'aab' by hand and list every valid cutting. Once you commit to a first segment, stare at the letters left over — they pose the very same task, just on a shorter strip.",
        'Recurse on a start position. For each end where strip[start:end] reads the same reversed, commit that segment and solve the suffix beginning at end; uncommit before trying a longer first segment.',
        'def backtrack(start): if start == len(strip): record path.copy(). For end in range(start + 1, len(strip) + 1): piece = strip[start:end]; if piece == piece[::-1]: append piece, backtrack(end), pop. Trying end in increasing order produces exactly the shortest-segment-first output order.',
      ],
      functionName: 'reversible_pennant_cuts',
      starterCode: `def reversible_pennant_cuts(strip: str) -> list[list[str]]:
    pass
`,
      solution: {
        code: `def reversible_pennant_cuts(strip: str) -> list[list[str]]:
    results: list[list[str]] = []
    path: list[str] = []

    def backtrack(start: int) -> None:
        if start == len(strip):
            # Every letter is on some pennant: record this cutting.
            results.append(path.copy())
            return
        # Try every candidate next segment, shortest first — this branch
        # order alone yields the required output order, no sort needed.
        for end in range(start + 1, len(strip) + 1):
            piece = strip[start:end]
            if piece != piece[::-1]:
                continue  # prune: this segment cannot read both ways
            path.append(piece)  # choose: commit the segment
            backtrack(end)      # explore: cut the remaining suffix
            path.pop()          # unchoose: try a longer first segment

    backtrack(0)
    return results
`,
        commentary: `
The new facet here is **what a "choice" is**. In subset and combination problems a choice picks an *item*; here a choice picks a *cut point* — how long the next segment should be. The decision tree's branching factor is the number of palindromic prefixes of the current suffix, and depth is at most the strip length. Everything else is the familiar heartbeat: commit a segment, recurse on what remains, pop.

Notice the self-similarity that hint one points at: after committing \`strip[start:end]\`, the problem on \`strip[end:]\` is the *original problem on a shorter input*. Whenever cutting a prefix leaves you with an identical-but-smaller task, recursion on a start index is the natural shape — the same skeleton handles splitting digit strings into IP address octets or sentences into dictionary words; only the validity test on the piece changes.

The prune is the palindrome test applied to the **segment, before descending** — a non-mirrorable segment kills its entire subtree of suffix cuttings unexplored. Worst case remains exponential and must: an all-equal strip like \`"aaaa"\` has a valid cutting for every subset of its n - 1 cut points, so the output itself holds 2^(n-1) cuttings. Output-bound problems cannot beat their own output size.
`,
        complexity: 'Time O(n * 2^n) worst case — up to 2^(n-1) cuttings, each costing O(n) to copy, plus O(n) per palindrome test; Space O(n) for the path and recursion beyond the output',
      },
      testCases: [
        {
          input: ['aab'],
          expected: [['a', 'a', 'b'], ['aa', 'b']],
          label: 'two cuttings',
        },
        {
          input: ['noon'],
          expected: [['n', 'o', 'o', 'n'], ['n', 'oo', 'n'], ['noon']],
          label: 'whole strip is itself a pennant',
        },
        { input: ['ab'], expected: [['a', 'b']], label: 'only the letter-by-letter cutting' },
        { input: ['a'], expected: [['a']], hidden: true, label: 'single letter' },
        {
          input: ['aaa'],
          expected: [['a', 'a', 'a'], ['a', 'aa'], ['aa', 'a'], ['aaa']],
          hidden: true,
          label: 'all-equal strip, every cut point optional',
        },
        {
          input: ['abba'],
          expected: [['a', 'b', 'b', 'a'], ['a', 'bb', 'a'], ['abba']],
          hidden: true,
          label: 'even-length mirror word',
        },
        {
          input: ['refer'],
          expected: [['r', 'e', 'f', 'e', 'r'], ['r', 'efe', 'r'], ['refer']],
          hidden: true,
          label: 'odd-length mirror word',
        },
        { input: ['abc'], expected: [['a', 'b', 'c']], hidden: true, label: 'no multi-letter segment qualifies' },
      ],
      furtherPractice: [
        { name: 'LeetCode 131. Palindrome Partitioning', note: 'the classic framing' },
        { name: 'LeetCode 132. Palindrome Partitioning II', note: 'minimum cuts only — DP, not enumeration' },
        { name: 'LeetCode 93. Restore IP Addresses', note: 'same cut-a-prefix skeleton, different validity test' },
      ],
    },
    {
      id: 'slur-patterns',
      title: 'Slur Nesting Patterns',
      difficulty: 'medium',
      statement: `
Music engraving software draws **slurs** — curved phrase marks over the staff. Each slur contributes two anchors to the note line: an opening anchor, written \`(\`, and a closing anchor, written \`)\`. An anchor sequence is **printable** when a left-to-right renderer never meets a closing anchor without an unclosed slur to attach it to, and every opened slur eventually closes.

Given the number of slurs \`n\`, return **every** printable anchor sequence of the \`2n\` anchors as a list of strings, in **lexicographic order**, where \`(\` sorts before \`)\`.

For \`n = 0\` there is exactly one printable sequence: the empty string.
`,
      examples: [
        {
          input: 'n = 2',
          output: '["(())", "()()"]',
          explanation:
            'Two slurs can nest or follow each other. Sequences like "())(" fail: the renderer meets the third anchor, a close, with nothing open.',
        },
        {
          input: 'n = 3',
          output: '["((()))", "(()())", "(())()", "()(())", "()()()"]',
          explanation: 'All five printable arrangements of three slurs, in dictionary order with "(" before ")".',
        },
        {
          input: 'n = 0',
          output: '[""]',
          explanation: 'Zero slurs admit exactly one rendering: nothing to draw.',
        },
      ],
      constraints: [
        '0 <= n <= 8',
        'Each returned string has exactly 2 * n characters and uses only "(" and ")"',
        "Output in lexicographic order with '(' ordering before ')'",
      ],
      hints: [
        "Write out all six arrangements of two '(' and two ')' and circle the printable ones. For each rejected arrangement, find the exact character where a left-to-right reader first gets stuck — what was true of the counts at that moment?",
        'Grow the sequence one anchor at a time, carrying two counters: slurs opened so far and slurs closed so far. One simple condition on the counters makes "(" legal to append; a different one makes ")" legal.',
        "backtrack(opens, closes): when len(path) == 2 * n, record ''.join(path). Append '(' only while opens < n; append ')' only while closes < opens; recurse, then pop. Trying '(' before ')' at every step emits the list in lexicographic order automatically.",
      ],
      functionName: 'slur_patterns',
      starterCode: `def slur_patterns(n: int) -> list[str]:
    pass
`,
      solution: {
        code: `def slur_patterns(n: int) -> list[str]:
    results: list[str] = []
    path: list[str] = []

    def backtrack(opens: int, closes: int) -> None:
        if len(path) == 2 * n:
            # The guards below admit only balanced prefixes, so any
            # full-length sequence is printable: record it.
            results.append(''.join(path))
            return
        # Branch '(' before ')': '(' sorts first, so this order alone
        # produces lexicographic output.
        if opens < n:        # a slur remains to be opened
            path.append('(')
            backtrack(opens + 1, closes)
            path.pop()
        if closes < opens:   # an open slur is waiting for its close
            path.append(')')
            backtrack(opens, closes + 1)
            path.pop()

    backtrack(0, 0)
    return results
`,
        commentary: `
The facet on display is **feasibility captured in counters**. Other problems carry a visited grid or used-column sets; here the entire legality of a partial sequence compresses into two integers. \`opens < n\` says an opening anchor is still available; \`closes < opens\` says a close has something to attach to. Because both guards run *before* appending, no dead prefix is ever extended — and a pleasant consequence is that the base case needs **no validation at all**: any path that reaches length \`2n\` got there through 2n legal appends, hence is printable. Compare that with generate-and-filter over all 2^(2n) strings, where the filter does all the work at the leaves.

The branching factor is at most two, and the guards frequently cut it to one (forced closes at the end, forced opens at the start). The number of leaves is the n-th Catalan number — about \`4^n / n^1.5\` — which is the true cost driver; the tree above the leaves only adds a constant factor.

Order falls out structurally again: at every node the \`(\` branch is explored before the \`)\` branch, and \`(\` < \`)\`, so completed strings appear in dictionary order without a sort. When asked for "all valid sequences" of any bracket-like alphabet, reach for legality counters before reaching for post-hoc filtering.
`,
        complexity: 'Time O(Catalan(n) * n) ≈ O(4^n / sqrt(n)) — one O(n) join per emitted sequence; Space O(n) for the path and recursion beyond the output',
      },
      testCases: [
        { input: [1], expected: ['()'], label: 'one slur' },
        { input: [2], expected: ['(())', '()()'], label: 'nest or follow' },
        {
          input: [3],
          expected: ['((()))', '(()())', '(())()', '()(())', '()()()'],
          label: 'five printable patterns',
        },
        { input: [0], expected: [''], hidden: true, label: 'zero slurs — the empty rendering' },
        {
          input: [4],
          expected: [
            '(((())))', '((()()))', '((())())', '((()))()', '(()(()))',
            '(()()())', '(()())()', '(())(())', '(())()()', '()((()))',
            '()(()())', '()(())()', '()()(())', '()()()()',
          ],
          hidden: true,
          label: 'fourteen patterns (Catalan 4)',
        },
        {
          input: [5],
          expected: [
            '((((()))))', '(((()())))', '(((())()))', '(((()))())', '(((())))()',
            '((()(())))', '((()()()))', '((()())())', '((()()))()', '((())(()))',
            '((())()())', '((())())()', '((()))(())', '((()))()()', '(()((())))',
            '(()(()()))', '(()(())())', '(()(()))()', '(()()(()))', '(()()()())',
            '(()()())()', '(()())(())', '(()())()()', '(())((()))', '(())(()())',
            '(())(())()', '(())()(())', '(())()()()', '()(((())))', '()((()()))',
            '()((())())', '()((()))()', '()(()(()))', '()(()()())', '()(()())()',
            '()(())(())', '()(())()()', '()()((()))', '()()(()())', '()()(())()',
            '()()()(())', '()()()()()',
          ],
          hidden: true,
          label: 'forty-two patterns (Catalan 5)',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 22. Generate Parentheses', note: 'the classic framing' },
        { name: 'LeetCode 678. Valid Parenthesis String', note: 'checking instead of generating — greedy counters' },
        { name: 'LeetCode 301. Remove Invalid Parentheses', note: 'harder: search over deletions' },
      ],
    },
    {
      id: 'blade-server-spacing',
      title: 'Blade Server Spacing',
      difficulty: 'hard',
      statement: `
A data-center bay is a grid of \`rows x cols\` rack slots. The facilities team must install exactly \`k\` high-draw blade servers, but the bay's cooling cannot handle two blades in **touching** slots — slots that are adjacent horizontally, vertically, **or diagonally**. The blades are identical, so an install plan is just the **set** of slots used: choosing the same slots in a different order is the same plan.

Given \`rows\`, \`cols\`, and \`k\`, return the **number** of valid install plans. For \`k = 0\` the answer is 1: the single plan that installs nothing.
`,
      examples: [
        {
          input: 'rows = 2, cols = 2, k = 1',
          output: '4',
          explanation: 'A lone blade can take any of the four slots; with no second blade there is nothing to touch.',
        },
        {
          input: 'rows = 2, cols = 2, k = 2',
          output: '0',
          explanation:
            'Every pair of slots in a 2x2 bay touches — sharing a row, a column, or a diagonal corner — so no two-blade plan survives.',
        },
        {
          input: 'rows = 2, cols = 3, k = 2',
          output: '4',
          explanation:
            'Exactly four pairs keep their distance, each pairing a slot of the left column with one of the right column.',
        },
        {
          input: 'rows = 3, cols = 3, k = 4',
          output: '1',
          explanation: 'Only the four corners hold four blades on a 3x3 bay; every other arrangement brings two within touching range.',
        },
      ],
      constraints: [
        '1 <= rows, cols <= 5',
        '0 <= k <= rows * cols',
        'Two slots touch when their rows differ by at most 1 AND their columns differ by at most 1',
        'Blades are interchangeable: count sets of slots, not sequences; return an integer',
      ],
      hints: [
        'Work the 2x2 bay with k = 2 by hand and watch all six slot pairs fail. Then number the slots of a 2x3 bay 0..5 in reading order and list its valid pairs — notice each pair shows up exactly once when you always name the smaller slot number first.',
        'Scan slots in row-major order with a start index, seating each next blade strictly after the previous one: every SET of slots gets built exactly once, in increasing slot order. Keep the seated slots in a list so a candidate slot can be rejected the instant it touches one of them.',
        'place(start, remaining): return 1 when remaining == 0; return 0 when n - start < remaining (too few slots left). Otherwise sum place(i + 1, remaining - 1) over each i >= start whose (r, c) = divmod(i, cols) has no seated blade with abs(dr) <= 1 and abs(dc) <= 1 — appending before the call, popping after.',
      ],
      functionName: 'count_blade_layouts',
      starterCode: `def count_blade_layouts(rows: int, cols: int, k: int) -> int:
    pass
`,
      solution: {
        code: `def count_blade_layouts(rows: int, cols: int, k: int) -> int:
    n = rows * cols
    seated: list[tuple[int, int]] = []  # slots already holding a blade

    def touches(r: int, c: int) -> bool:
        # Two slots interfere when they differ by at most 1 on BOTH axes.
        return any(abs(r - pr) <= 1 and abs(c - pc) <= 1 for pr, pc in seated)

    def place(start: int, remaining: int) -> int:
        if remaining == 0:
            return 1  # all k blades seated: exactly one completed plan
        if n - start < remaining:
            return 0  # prune: fewer slots ahead than blades still to seat
        total = 0
        # Row-major start index: each SET of slots is built exactly once,
        # in increasing slot order — blades are interchangeable.
        for i in range(start, n):
            r, c = divmod(i, cols)
            if touches(r, c):
                continue  # prune: this slot would overheat a seated blade
            seated.append((r, c))                  # choose the slot
            total += place(i + 1, remaining - 1)   # explore later slots only
            seated.pop()                           # unchoose for the next slot
        return total

    return place(0, k)
`,
        commentary: `
Two ideas from earlier problems fuse here, plus one new constraint shape.

**The start index is doing anti-symmetry work, not ordering work.** Blades are interchangeable, so plans are sets; without the strictly-increasing slot rule, each k-blade plan would be counted once per ordering — k! times. Linearizing the grid (slot \`i\` maps to \`divmod(i, cols)\`) turns "choose a set of cells" into the same canonical-form trick used for combinations of numbers.

**The conflict check is geometric, not arithmetic.** Queen-style placement enjoys a lovely closed form — each diagonal owns one \`r - c\` value — but a *proximity* constraint has no such global signature. Instead each candidate is tested against the seated list directly. With k <= 25 that scan is O(k) per candidate, and the list itself is the constraint state: append on the way down, pop on the way up.

**The feasibility prune is about the future, not the past.** \`n - start < remaining\` rejects branches that are not (yet) in conflict but can no longer gather enough slots — a budget argument rather than a violation. Cheap forward-looking prunes like this routinely cut more of the tree than the conflict checks do, because they fire high up. Counting, as always, changes only the leaf: return 1 and sum, never materializing a single plan.
`,
        complexity: 'Time O(C(n, k) * k) with n = rows * cols — each explored node scans up to k seated blades, and pruning keeps explored nodes far below the binomial bound in practice; Space O(k) for the seated list and recursion',
      },
      testCases: [
        { input: [2, 2, 1], expected: 4, label: 'lone blade, four slots' },
        { input: [2, 3, 2], expected: 4, label: 'left column vs right column' },
        { input: [3, 3, 4], expected: 1, label: 'corners only' },
        { input: [2, 2, 2], expected: 0, hidden: true, label: 'every pair touches' },
        { input: [1, 5, 3], expected: 1, hidden: true, label: 'single row forces slots 0, 2, 4' },
        { input: [3, 3, 0], expected: 1, hidden: true, label: 'k = 0 — the empty plan' },
        { input: [2, 2, 5], expected: 0, hidden: true, label: 'more blades than slots' },
        { input: [3, 4, 3], expected: 34, hidden: true, label: 'mid-size bay' },
        { input: [4, 4, 4], expected: 79, hidden: true, label: 'larger bay, four blades' },
        { input: [5, 5, 5], expected: 1974, hidden: true, label: 'full-size bay stress case' },
      ],
      furtherPractice: [
        { name: 'LeetCode 52. N-Queens II', note: 'same counting skeleton, line constraints instead of proximity' },
        { name: 'LeetCode 1349. Maximum Students Taking Exam', note: 'adjacency-constrained seating, bitmask-DP contrast' },
        { name: 'LeetCode 526. Beautiful Arrangement', note: 'counting permutations under per-slot constraints' },
      ],
    },
    {
      id: 'distinct-bouquets',
      title: 'Distinct Bouquets',
      difficulty: 'medium',
      statement: `
A florist's morning bucket holds individual stems, each labeled with its flower type — and types repeat, like \`["rose", "iris", "rose"]\`. A display bouquet uses **exactly** \`k\` stems, each physical stem at most once. Customers only see types: two bouquets are **the same** when they use the same types with the same counts, no matter which physical stem of a type was pulled.

Given \`stems\` and \`k\`, return every **distinct** bouquet as a list of lists: each bouquet's type names in **alphabetical order**, and the bouquets themselves in **lexicographic order** (compare two bouquets name by name). For \`k = 0\` return \`[[]]\` — the single empty bouquet.
`,
      examples: [
        {
          input: 'stems = ["rose", "iris", "rose"], k = 2',
          output: '[["iris", "rose"], ["rose", "rose"]]',
          explanation:
            'Pairing the iris with the first rose or with the second rose reads identically on the card — one bouquet, not two. The two physical roses together make the second.',
        },
        {
          input: 'stems = ["aster", "fern", "lily"], k = 2',
          output: '[["aster", "fern"], ["aster", "lily"], ["fern", "lily"]]',
          explanation: 'All types distinct, so every pair of stems is its own bouquet: three in total.',
        },
        {
          input: 'stems = ["lily", "lily", "lily"], k = 2',
          output: '[["lily", "lily"]]',
          explanation: 'Three physical pairs exist, but every one of them reads "lily, lily" — a single distinct bouquet.',
        },
      ],
      constraints: [
        '1 <= len(stems) <= 10',
        '0 <= k <= len(stems)',
        'Type names are 1–12 lowercase letters; the same name may appear many times',
        'Each physical stem may be used at most once per bouquet',
        'Every distinct bouquet must appear exactly once, in the order specified',
      ],
      hints: [
        'With stems rose, rose, iris and k = 2, list every handful by hand treating the two roses as physically different stems. Which handfuls collapse into the same bouquet on the card — and what, precisely, makes them collapse?',
        'Sort the stems and pick with a start index so each bouquet is built in alphabetical order. The duplicate problem then shrinks to one situation: two equal names available as alternatives at the same level of the recursion.',
        'for i in range(start, n): skip when i > start and pool[i] == pool[i - 1] — an equal sibling at this level already built everything this branch would build. Otherwise append pool[i], backtrack(i + 1), pop. Record path.copy() when len(path) == k; the sorted pool plus start index makes the output lexicographic with no final sort.',
      ],
      functionName: 'distinct_bouquets',
      starterCode: `def distinct_bouquets(stems: list[str], k: int) -> list[list[str]]:
    pass
`,
      solution: {
        code: `def distinct_bouquets(stems: list[str], k: int) -> list[list[str]]:
    # Sorting gives every bouquet a canonical (alphabetical) build order
    # AND lines up equal names so the duplicate-skip rule can see them.
    pool = sorted(stems)
    n = len(pool)
    results: list[list[str]] = []
    path: list[str] = []

    def backtrack(start: int) -> None:
        if len(path) == k:
            # Exactly k stems chosen, already in alphabetical order.
            results.append(path.copy())
            return
        for i in range(start, n):
            # Skip equal siblings: choosing pool[i] here, when the same
            # name was available at this SAME level via pool[i-1],
            # would rebuild a bouquet that sibling already produced.
            if i > start and pool[i] == pool[i - 1]:
                continue
            if n - i < k - len(path):
                break  # prune: too few stems remain to reach k
            path.append(pool[i])  # choose this physical stem
            backtrack(i + 1)      # explore: each stem used at most once
            path.pop()            # unchoose for the next type

    backtrack(0)
    return results
`,
        commentary: `
The fresh facet is **duplicates in the pool**. The start index alone canonicalizes *order* — it stops \`["iris", "rose"]\` and \`["rose", "iris"]\` from both appearing — but it cannot tell the two physical roses apart, so iris-with-rose#1 and iris-with-rose#2 would still each be emitted. The fix is structural, not a dedupe pass: after sorting, equal names sit adjacent, and the rule \`i > start and pool[i] == pool[i - 1]\` refuses to *start a branch* with a name that an earlier sibling at the same level already started one with. The first copy of each name at a level explores everything that name can do; later copies are pure repetition.

Read the condition's two halves separately, because mixing them up is the classic bug. \`pool[i] == pool[i - 1]\` finds a repeated name; \`i > start\` restricts the skip to *siblings* — alternatives at the same level. When \`i == start\`, the equal name is being stacked *deeper* onto its own twin (rose then rose again), which is exactly how \`["rose", "rose"]\` gets built and must stay legal.

Contrast the three combination regimes now covered by this module: unlimited reuse recurses with \`i\` (counterweight kits); distinct items, no reuse recurses with \`i + 1\` (flag subsets); duplicated physical items, no reuse recurses with \`i + 1\` *plus* the equal-sibling skip. One loop skeleton, three policies. The \`n - i < k - len(path)\` break is the same forward-looking budget prune as the blade-server problem — sorted iteration makes \`break\` (not \`continue\`) safe, since every later index leaves even fewer stems.
`,
        complexity: 'Time O(k * C(n, k)) worst case — at most one explored node per distinct partial bouquet, each completed bouquet copied in O(k); Space O(k) for the path and recursion beyond the output',
      },
      testCases: [
        {
          input: [['rose', 'iris', 'rose'], 2],
          expected: [['iris', 'rose'], ['rose', 'rose']],
          label: 'twin roses collapse',
        },
        {
          input: [['aster', 'fern', 'lily'], 2],
          expected: [['aster', 'fern'], ['aster', 'lily'], ['fern', 'lily']],
          label: 'all types distinct',
        },
        {
          input: [['lily', 'lily', 'lily'], 2],
          expected: [['lily', 'lily']],
          label: 'three physical pairs, one bouquet',
        },
        { input: [['rose'], 0], expected: [[]], hidden: true, label: 'k = 0 — the empty bouquet' },
        {
          input: [['rose', 'rose', 'iris', 'iris'], 2],
          expected: [['iris', 'iris'], ['iris', 'rose'], ['rose', 'rose']],
          hidden: true,
          label: 'two duplicated types',
        },
        { input: [['tulip', 'tulip'], 3], expected: [], hidden: true, label: 'k exceeds the bucket' },
        {
          input: [['mum', 'aster', 'mum', 'aster', 'poppy'], 3],
          expected: [
            ['aster', 'aster', 'mum'],
            ['aster', 'aster', 'poppy'],
            ['aster', 'mum', 'mum'],
            ['aster', 'mum', 'poppy'],
            ['mum', 'mum', 'poppy'],
          ],
          hidden: true,
          label: 'unsorted bucket, mixed multiplicities',
        },
        {
          input: [['iris', 'iris', 'iris', 'rose'], 3],
          expected: [['iris', 'iris', 'iris'], ['iris', 'iris', 'rose']],
          hidden: true,
          label: 'triple of one type',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 40. Combination Sum II', note: 'the same skip rule under a sum target' },
        { name: 'LeetCode 90. Subsets II', note: 'all sizes at once instead of exactly k' },
        { name: 'LeetCode 47. Permutations II', note: 'the skip rule transplanted to orderings' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt:
        'Brute force generates every complete candidate and filters at the end. What is the essential thing backtracking does differently?',
      choices: [
        'It visits candidates breadth-first instead of depth-first',
        'It validates partial candidates on the way down and abandons a branch the moment it becomes infeasible, so doomed subtrees are never built',
        'It guarantees polynomial running time by memoizing repeated states',
        'It only works when the problem has exactly one solution',
      ],
      correctIndex: 1,
      explanation:
        'Backtracking is brute force plus early rejection: constraints are checked at every partial step, and a violation prunes the entire subtree below it. Traversal order (choice 1) is not the point — backtracking is DFS, but DFS over completed candidates would still be brute force. It remains exponential in the worst case (choice 3 confuses it with DP), and it happily enumerates many solutions or zero (choice 4).',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt:
        "After exploring a choice, the 'unchoose' step (path.pop(), unmark the cell, remove from the sets) must restore state exactly. Why?",
      choices: [
        'It reduces memory usage from exponential to linear',
        'Python cannot recurse on a mutated list otherwise',
        'Sibling branches must explore from the identical state the parent saw; leftover mutations leak constraints across branches and silently drop or duplicate solutions',
        'It converts the exponential search into polynomial time',
      ],
      correctIndex: 2,
      explanation:
        'The recursion shares one mutable state for efficiency, so correctness depends on choose/unchoose being perfect mirrors: when control returns to the parent loop, the next sibling must see exactly the pre-choice state. A half-undone mutation makes valid pegs look occupied (dropped solutions) or used pads look free (phantom solutions). Memory (choice 1) is already linear in the depth either way, and no undo discipline changes the asymptotic time (choice 4).',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt:
        'Enumerating all subsets of n distinct items with backtracking, copying each completed subset into the results list — what is the total time?',
      choices: ['O(2^n)', 'O(n * 2^n)', 'O(n^2)', 'O(n!)'],
      correctIndex: 1,
      explanation:
        'The decision tree has exactly 2^n nodes (one per subset), and snapshotting a subset with copy() costs up to O(n), giving O(n * 2^n). Plain O(2^n) (choice 0) ignores the copying. O(n!) is the permutation tree, a much faster-growing family, and O(n^2) would mean the output itself could not even be written down.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'Backtracking over all permutations of n distinct items, using a set for O(1) "already used" checks, does roughly how much total work?',
      choices: ['O(n^2)', 'O(2^n)', 'O(n * n!)', 'O(n log n)'],
      correctIndex: 2,
      explanation:
        'The tree has n choices at the root, n-1 below, and so on — n! leaves — and each completed permutation costs O(n) to snapshot, giving O(n * n!). O(2^n) (choice 1) is the subset tree, which grows far slower than n!: at n = 12, 2^n is about 4,000 while n! is about 479 million. The polynomial options could not even output the n! results.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'You need the NUMBER of ways to make exact change for 10,000 cents from 5 coin denominations, where order does not matter. Which approach is right?',
      choices: [
        'Backtracking with a start index that enumerates every combination, incrementing a counter at each exact hit',
        'Dynamic programming: build ways[amount] denomination by denomination up to 10,000',
        'Greedy: repeatedly take the largest coin that fits and count one way per remainder',
        'BFS over remaining amounts, counting paths that reach zero',
      ],
      correctIndex: 1,
      explanation:
        'Only the count is needed and the subproblems (ways to make each smaller amount) overlap massively, so DP computes the answer in O(5 * 10000) without materializing a single combination. The tempting backtracking enumeration (choice 0) is correct but visits one node per combination — astronomically many at this target. Greedy finds one way, not all ways, and BFS path-counting (choice 3) is the same explosion as backtracking wearing a different traversal order.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'A robot in an unweighted grid maze must report the MINIMUM number of moves from entrance to exit. Which approach fits?',
      choices: [
        'Backtracking DFS that explores every path, tracking the best length found',
        'BFS from the entrance — the first time the exit is dequeued, its depth is the minimum',
        'Sort all cells by distance to the exit and walk them in order',
        'Two pointers converging from entrance and exit',
      ],
      correctIndex: 1,
      explanation:
        'Shortest path in an unweighted graph is BFS by definition: it visits cells in increasing distance order, so each cell is settled once and the exit is reached at its true minimum depth in O(cells) time. The tempting backtracking answer (choice 0) is correct but enumerates exponentially many simple paths to guarantee the minimum — exhaustive search for a question that never needed enumeration. Sorting by straight-line distance ignores walls, and two pointers has no meaning on a 2-D maze.',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt:
        'In combination-sum over sorted candidates, when sizes[i] > remaining the reference solution uses break rather than continue. What makes break valid there?',
      choices: [
        'break and continue are interchangeable in backtracking loops',
        'Candidates are sorted, so every later candidate at this level is at least as large and equally infeasible — the rest of the level can be discarded wholesale',
        'break is required for correctness; continue would produce duplicate combinations',
        'break limits the recursion depth so Python never overflows the stack',
      ],
      correctIndex: 1,
      explanation:
        'The prune rests on a monotonicity argument: sortedness means once one candidate overshoots the remaining target, all of its right-hand siblings overshoot too, so abandoning the loop skips only provably dead branches. With continue the algorithm stays correct but tests each doomed sibling individually (choice 2 has it backwards — duplicates are prevented by the start index, not by break). Recursion depth is untouched either way.',
    },
    {
      id: 'q8',
      kind: 'scenario',
      prompt:
        'A wedding planner needs to OUTPUT every valid seating order of 8 guests, given a list of pairs who must not sit adjacent. Which approach fits best?',
      choices: [
        'Dynamic programming with memoized counts per (seated-set, last-guest) state',
        'Backtracking that fills seats left to right, pruning whenever the newest neighbor pair is forbidden, emitting each completed arrangement',
        'A greedy pass that always seats the most-constrained remaining guest next',
        'Generate all 8! orders, then filter out the invalid ones',
      ],
      correctIndex: 1,
      explanation:
        'The deliverable is the arrangements themselves, so the output size is a hard lower bound and an enumerating search is the right shape; pruning at each placement keeps the explored tree close to that bound. The tempting DP (choice 0) computes the COUNT beautifully but yields no actual seatings without bolting reconstruction onto every state. Greedy produces one arrangement at best, and generate-then-filter (choice 3) builds all 40,320 orders including those that die at the second seat — exactly the waste pruning exists to avoid.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'The three-beat heartbeat of every backtracking function?',
      back: 'Choose (mutate shared state: append, mark, add to sets), explore (recurse one level deeper), unchoose (restore state exactly, mirror of choose). The undo runs on every exit path, success or failure.',
    },
    {
      id: 'f2',
      front: 'Problem-statement signals that scream backtracking?',
      back: '"All / every / enumerate / generate" valid configurations, "count" under entangled constraints, or "does there exist" a path/assignment — combined with tiny bounds (n around 20 for subsets, 10-12 for permutations).',
    },
    {
      id: 'f3',
      front: 'Time complexity anchors: subsets vs permutations of n items?',
      back: 'Subsets: 2^n tree nodes, O(n * 2^n) with snapshot copying. Permutations: n! leaves, O(n * n!). Both are output-bound — you cannot beat the size of what you must emit.',
    },
    {
      id: 'f4',
      front: 'How do you stop [3,5] and [5,3] from both appearing in combination enumeration?',
      back: 'Sort candidates and pass a start index: only pick at-or-after your position, forcing each multiset into its unique non-decreasing form. Recurse with i to allow reuse of the same element, i+1 to forbid it.',
    },
    {
      id: 'f5',
      front: 'Pitfall: results.append(path) without .copy() — what goes wrong?',
      back: 'You store references to the one live list, which the recursion keeps mutating and finally empties. Every recorded "solution" ends up identical (and usually empty). Always snapshot: results.append(path.copy()).',
    },
    {
      id: 'f6',
      front: 'Sorted candidates + remaining target: continue or break when a candidate overshoots?',
      back: 'break. Sortedness means every later sibling at this level is at least as large, so all are infeasible — discard the whole rest of the level, not just one candidate. Prune before recursing, never after.',
    },
    {
      id: 'f7',
      front: 'Grid path search (word tracing): how do you track visited cells cheaply?',
      back: "Overwrite board[r][c] with a sentinel ('#') before recursing and restore the real letter after — the mismatch check then rejects revisits for free. Restore on success AND failure, or later starts see a corrupted board.",
    },
    {
      id: 'f8',
      front: 'N-queens-style placements: how do you make each conflict check O(1)?',
      back: 'Three sets: used columns, used r-c values (falling diagonals), used r+c values (rising diagonals). Each diagonal has one constant, so membership tests replace rescanning all placed pieces.',
    },
    {
      id: 'f9',
      front: 'When does DP beat backtracking on a counting problem?',
      back: 'When only the count (or optimum) is needed and subproblems overlap cleanly — coin-change counts, grid path counts. Backtracking pays per solution; DP pays per distinct subproblem. Need the actual solutions listed? Back to backtracking.',
    },
    {
      id: 'f10',
      front: 'Structure of the recursive function: what comes first, and what guarantees termination?',
      back: 'Success/base-case test first (path complete, target hit, row == n), then the choice loop. Every recursive call must consume progress — k+1, row+1, smaller remaining — so depth is bounded and the tree is finite.',
    },
  ],
  cheatSheet: {
    tldr:
      'Backtracking is depth-first search over a decision tree of partial candidates: at each node, choose an option by mutating shared state, recurse, then undo the mutation exactly so siblings start clean. Its power is pruning — rejecting a partial candidate kills its entire subtree unexplored — and its honesty is accepting exponential worst-case time, which is unavoidable whenever the output itself (all subsets, all arrangements) is exponential. Canonical ordering via a start index kills duplicate combinations; incremental constraint sets make each validity check O(1).',
    signals: [
      'Reach for this when the ask is "all/every/enumerate" valid configurations — subsets, combinations, arrangements, paths — and n is small (bounds around 8-20 are the tell).',
      'Reach for this when counting placements under constraints that entangle every choice (columns, diagonals, adjacency) so no clean DP decomposition exists.',
      'Reach for this when asking "does there exist" a trace/assignment that must be searched with the ability to retreat, like spelling a word through adjacent grid cells without revisits.',
      'Be suspicious when only a count/optimum is needed and subproblems overlap (DP wins), or when you need a shortest path in an unweighted space (BFS wins).',
    ],
    template: `# Generic: choose -> explore -> unchoose
def backtrack(path, start):
    if is_complete(path):           # base case FIRST
        results.append(path.copy()) # snapshot — never append the live list
        return
    for i in range(start, len(options)):
        if violates(options[i]):    # prune BEFORE descending
            continue                # (break if sorted + monotone constraint)
        path.append(options[i])     # choose
        backtrack(path, i + 1)      # explore (pass i instead to allow reuse)
        path.pop()                  # unchoose — exact mirror of choose

# Grid walk variant: the board IS the path state
def dfs(r, c, k):
    if k == len(word): return True
    if out_of_bounds(r, c) or board[r][c] != word[k]: return False
    board[r][c] = '#'               # choose: mark used
    ok = any(dfs(nr, nc, k + 1) for nr, nc in neighbors(r, c))
    board[r][c] = word[k]           # unchoose: restore either way
    return ok`,
    complexity:
      'Time O(b^d) over the pruned decision tree — O(n * 2^n) for subsets, O(n * n!) for permutations; Space O(d) for path + recursion, excluding the output.',
  },
}

export default mod
