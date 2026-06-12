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
