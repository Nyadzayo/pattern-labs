import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'trees',
  visualizer: 'tree-traversal',
  concept: `
## The mental model

Picture a company where every manager has at most two direct reports. The CEO needs a total headcount. Nobody walks the floors counting desks; the CEO asks both VPs, "how many people work under you, yourself included?" Each VP asks their own two reports the same question, all the way down to individual contributors who simply answer "one." Numbers flow back up, each manager adds the two replies plus themselves, and the CEO gets a perfect count while personally doing a single addition.

That delegation move is the entire trees pattern. A tree problem almost never asks you to orchestrate the whole structure — it asks you to write **one node's job**: a small contract stating what question every subtree must answer, plus the few lines that combine two child answers into this node's answer. Recursion (structural induction, if you want the formal name) handles the rest. The moment you catch yourself mentally simulating a traversal four levels deep, stop and ask the simpler question: *what does a single call promise to return, and what does the empty subtree return?*

## Mechanics

The workhorse is the postorder skeleton — children answer first, then the node combines:

\`\`\`python
def solve(node):
    if node is None:
        return EMPTY_ANSWER          # the contract for an empty subtree
    left = solve(node.left)          # trusted: correct for the left subtree
    right = solve(node.right)        # trusted: correct for the right subtree
    return combine(node.val, left, right)
\`\`\`

The three DFS orders differ only in *when* the node acts relative to its children. **Preorder** (node first) pushes information *down* — copying a tree, serializing it, narrowing a constraint window for descendants. **Inorder** (left, node, right) has one killer property: on a binary search tree it visits values in sorted order. **Postorder** (children first) pulls information *up* — heights, sizes, validity flags, best paths.

When the question groups nodes by *distance from the root* rather than by subtree — "average per level", "rightmost node per row" — recursion is the wrong shape. Use a queue and process one tier per round:

\`\`\`python
from collections import deque
tier = deque([root])
while tier:
    for _ in range(len(tier)):   # snapshot the width FIRST
        node = tier.popleft()
        # ... consume node ...
        if node.left:  tier.append(node.left)
        if node.right: tier.append(node.right)
\`\`\`

Two power moves come up constantly. First, **return richer answers**: a balance check that calls a separate height helper at every node repeats work; returning height *and* a validity signal from one postorder pass does everything in a single sweep. Second, **pass constraints down**: BST validity is not "each node beats its children" — it is "each node sits inside a \`(lo, hi)\` window inherited from *all* of its ancestors," and you tighten that window on every descent.

## When to reach for it

- The data is genuinely hierarchical: filesystems, org charts, DOM/UI trees, parse trees, comment threads, decision trees.
- The ask is phrased per subtree — "every node", "any root-to-leaf path", "the largest subtree such that…". That is DFS with a subtree contract.
- The ask is phrased per depth — "each level", "row by row", "the view from one side". That is BFS with a width snapshot.
- The words **sorted**, **range**, **kth smallest**, or **closest value** appear alongside a tree: the BST invariant lets you discard half the structure per step and descend a single path.
- The structure is defined recursively in the statement ("a node is healthy if both its children are healthy and…"). Recursive definitions beg for recursive solutions.

If the tree is just storage and the question ignores shape entirely ("does value v exist anywhere?" in an unordered tree), don't overthink it: that is a plain \`O(n)\` scan in fancy clothes.

## Complexity

Any full traversal — DFS in any order, or BFS — touches each node a constant number of times: \`O(n)\` time. Space depends on shape. The DFS stack is the tree's height \`O(h)\`: \`O(log n)\` on a balanced tree, \`O(n)\` on a degenerate chain. The BFS queue holds one tier, and the bottom tier of a complete tree holds about half the nodes, so worst case \`O(n)\`. A BST descent that never branches — search, insert, lowest common ancestor of two values — costs \`O(h)\` total without visiting most of the tree. The classic accidental blowup: recomputing a per-subtree helper (like height) at every node turns one pass into \`O(n^2)\` on a chain.

## Common pitfalls

- **Missing the empty-subtree base case** — or returning the wrong thing for it. Decide what \`None\` answers *before* writing the combine step.
- **Validating a BST against children only.** A grandchild can satisfy its parent and still violate its grandparent. You need inherited ranges, or an inorder scan checked for strict ascent.
- **Height vs depth off-by-ones.** Count nodes or count edges — either works, but pick one and write it down; mixed conventions produce answers exactly one off.
- **Python's recursion limit** (default around 1000) on skewed trees. A ten-thousand-node chain crashes a recursive solution; switch to an explicit stack or raise the limit.
- **Merging BFS tiers** by forgetting to snapshot \`len(queue)\` before the inner loop — children leak into the current level and every per-level statistic shifts.
- **Confusing the value passed up with the answer recorded.** In best-path problems a node returns the best *extendable* arm to its parent while a nonlocal best tracks the full answer; conflating the two silently drops solutions.
`,
  realWorldUses: [
    {
      title: 'B-tree index descent in databases',
      description:
        'A primary-key lookup in Postgres or MySQL walks a B-tree from the root, comparing the key at each node and following exactly one child pointer — the BST descent move, generalized to wide nodes. Each step discards an enormous subtree, which is why a lookup over a billion rows touches only a handful of pages.',
    },
    {
      title: 'Compiler and linter AST passes',
      description:
        'Compilers parse source code into an abstract syntax tree, then run postorder passes over it: a node cannot know the type of an expression (or fold its constants) before its child subexpressions have answered. Lint rules in tools like ESLint and clang-tidy are literally callbacks fired during a recursive tree walk.',
    },
    {
      title: 'Browser layout and UI reconciliation',
      description:
        "A browser's render tree is laid out bottom-up — a container's size depends on its children's sizes (postorder) — and painted top-down (preorder). React's reconciler does the same shape of work, recursively diffing the old and new component trees to decide the minimal set of DOM mutations.",
    },
  ],
  problems: [
    {
      id: 'mast-tolerance',
      title: 'Repeater Mast Tolerance Check',
      difficulty: 'easy',
      statement: `
A community radio co-op relays its broadcast through a network of repeater masts. The main transmitter is the root; every mast forwards the signal to at most two downstream masts. The network arrives as a **level-order list** of mast IDs with \`null\` marking an absent child — for example \`[8, 3, 10, 1, 6, null, 14]\` — and the starter code's \`build_tree\` helper turns that list into linked \`TreeNode\` objects.

The co-op's engineering spec says the network is **within tolerance** when, at *every* mast, the heights of its left and right downstream subtrees differ by at most one. The **height** of a subtree is the number of masts on its longest downward chain (an empty subtree has height 0).

Given \`values\`, return the height of the whole network if it is within tolerance, or \`-1\` if any mast violates the rule. An empty network is within tolerance and has height \`0\`.
`,
      examples: [
        {
          input: 'values = [8, 3, 10, 1, 6, null, 14]',
          output: '3',
          explanation:
            'Every mast keeps its two sides within one unit of height of each other, and the longest chain (e.g. 8 → 3 → 6) has 3 masts.',
        },
        {
          input: 'values = [1, 2, null, 3]',
          output: '-1',
          explanation:
            'At the transmitter the left side is a 2-mast chain (height 2) while the right side is empty (height 0) — a difference of 2.',
        },
        {
          input: 'values = []',
          output: '0',
          explanation: 'An empty network is trivially within tolerance.',
        },
      ],
      constraints: [
        '0 <= number of masts <= 10^4',
        '-10^9 <= mast ID <= 10^9',
        'IDs may repeat; they are labels and play no role in the spec',
        'The tolerance rule must hold at every mast, not just the root',
      ],
      hints: [
        'Work [1, 2, null, 3] out on paper. To see that the transmitter is out of spec, what single number did you need to know about each of its two children?',
        'Let each subtree report its own height upward, children before parent. A mast can then check its own tolerance with one subtraction — but a plain height return loses the news that something below already failed.',
        'Fold the failure signal into the height channel: the helper returns -1 for "a violation exists somewhere in here", otherwise the real height. Check left, bail on -1, check right, bail on -1, compare, and return 1 + max(left, right).',
      ],
      functionName: 'balanced_depth',
      starterCode: `class TreeNode:
    """One mast: an ID plus links to up to two downstream masts."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def balanced_depth(values: list) -> int:
    # root = build_tree(values), then recurse on TreeNode objects
    pass
`,
      solution: {
        code: `class TreeNode:
    """One mast: an ID plus links to up to two downstream masts."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):                     # left child slot
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):                     # right child slot
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def balanced_depth(values: list) -> int:
    # Postorder probe. Contract: return the height of this subtree,
    # or -1 the moment anything at or below this mast is out of spec.
    def probe(node: "TreeNode | None") -> int:
        if node is None:
            return 0                       # empty subtree: height 0, in spec
        left = probe(node.left)
        if left == -1:
            return -1                      # poison from below: stop measuring
        right = probe(node.right)
        if right == -1:
            return -1
        if abs(left - right) > 1:
            return -1                      # this mast itself violates the spec
        return 1 + max(left, right)        # healthy: report height upward

    return probe(build_tree(values))
`,
        commentary: `
The naive plan — "for every mast, compute the height of each side with a separate helper" — is correct but wasteful: on a chain-shaped network each helper call re-walks everything below, and the total climbs to \`O(n^2)\`.

The fix is the **richer return value** move. Height alone is not enough information for a parent to act on, so we widen the contract: the helper returns the subtree's height *if everything inside is within tolerance*, and \`-1\` otherwise. \`-1\` works as a poison value because no real height is negative; once any subtree reports it, every ancestor short-circuits and passes it along untouched. Each mast is visited exactly once, does \`O(1)\` work, and the whole audit is one postorder sweep.

Two details worth noticing. The base case carries half the logic: an empty subtree must report height \`0\` and "in spec", or leaves would misfire. And the early \`return -1\` after the left probe is not just style — it skips probing the right side entirely once the verdict is settled.

One honest caveat for the constraint ceiling: a recursive solution on a 10^4-mast *chain* brushes against Python's default recursion limit (~1000). The same contract converts mechanically to an explicit-stack postorder if you ever need it; for interview-sized inputs the recursive form is the one to write.
`,
        complexity: 'Time O(n), Space O(h) recursion stack (O(n) worst case on a chain)',
        subgoals: [
          {
            lineRange: [1, 7],
            referenceLabel: 'Define the node type that links to two children',
            acceptableKeywords: ['node class definition', 'value and two child links', 'tree node structure', 'left and right pointers'],
            hint: 'What shape does a single element of this structure have?',
            misconception: 'This only declares the node type; no traversal or measuring happens yet.',
          },
          {
            lineRange: [8, 32],
            referenceLabel: 'Materialize the structure from a flat level-order list',
            acceptableKeywords: ['build tree from list', 'parse level order', 'wire up children', 'construct from array'],
            hint: 'How does the flat input list become a linked structure of nodes?',
            misconception: 'This is input parsing, not the audit logic itself.',
          },
          {
            lineRange: [33, 39],
            referenceLabel: 'State the per-subtree contract and the empty base case',
            acceptableKeywords: ['recursive contract', 'empty subtree returns zero', 'base case for none', 'what one call promises'],
            hint: 'What should a call return when the subtree is empty, before any combining?',
            misconception: 'This fixes the base case; it is not where a violation gets reported.',
          },
          {
            lineRange: [40, 46],
            referenceLabel: 'Gather child results and reject anything out of tolerance',
            acceptableKeywords: ['recurse into both children', 'short circuit on poison', 'check the local constraint', 'reject when too unbalanced'],
            hint: 'After both sides answer, which conditions force this node to emit the failure signal?',
            misconception: 'This both relays a child failure and tests this node itself; it is not yet the healthy return.',
          },
          {
            lineRange: [47, 49],
            referenceLabel: 'Report this subtree height upward and launch the sweep',
            acceptableKeywords: ['return height to parent', 'combine child results', 'one plus max of children', 'kick off the recursion'],
            hint: 'When everything below is healthy, what single number does this node hand up?',
            misconception: 'This is the healthy combine step, distinct from the failure rejection above it.',
          },
        ],
      },
      testCases: [
        { input: [[8, 3, 10, 1, 6, null, 14]], expected: 3, label: 'balanced network' },
        { input: [[1, 2, null, 3]], expected: -1, label: 'left chain out of spec' },
        { input: [[]], expected: 0, label: 'empty network' },
        { input: [[5]], expected: 1, hidden: true, label: 'single transmitter' },
        {
          input: [[1, 2, 2, 3, null, null, 3, 4, null, null, 4]],
          expected: -1,
          hidden: true,
          label: 'symmetric but too deep: every node passes vs siblings except mid-level',
        },
        { input: [[7, 7, 7, 7]], expected: 3, hidden: true, label: 'all-equal IDs, still in spec' },
        { input: [[1, 2, 3, 4, 5, 6, 7]], expected: 3, label: 'perfect tree' },
        {
          input: [[1, 2, 3, 4, 5, null, null, 6]],
          expected: -1,
          hidden: true,
          label: 'violation buried two levels down',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 104. Maximum Depth of Binary Tree', note: 'the height half on its own' },
        { name: 'LeetCode 110. Balanced Binary Tree', note: 'the tolerance half on its own' },
        { name: 'LeetCode 543. Diameter of Binary Tree', note: 'same richer-return trick, different combine step' },
      ],
    },
    {
      id: 'tier-averages',
      title: 'Fan-Out Tier Averages',
      difficulty: 'medium',
      statement: `
An API gateway fans each request out through a tree of internal services: the edge service is the root, and every service forwards work to at most two downstream dependencies. The tree arrives as a **level-order list** of measured response times in milliseconds, with \`null\` for an absent dependency; the starter's \`build_tree\` converts it into linked \`TreeNode\` objects. Readings can be negative — clock-skew corrections occasionally backdate a sample.

The SRE dashboard wants one number per **tier**: tier 0 is the edge service alone, tier 1 is everything it calls directly, tier 2 is everything those services call, and so on.

Return a list containing the **average response time of each tier as a float**, ordered from tier 0 down to the deepest tier. Do not round — return the exact quotient (an average of 13 over 2 services is \`6.5\`). Return \`[]\` for an empty tree.
`,
      examples: [
        {
          input: 'values = [8, 3, 10, 1, 6, null, 14]',
          output: '[8.0, 6.5, 7.0]',
          explanation: 'Tier 0 is just 8. Tier 1 averages (3 + 10) / 2 = 6.5. Tier 2 averages (1 + 6 + 14) / 3 = 7.0.',
        },
        {
          input: 'values = [3, 1, 2]',
          output: '[3.0, 1.5]',
          explanation: 'The two direct dependencies average to (1 + 2) / 2 = 1.5.',
        },
        {
          input: 'values = []',
          output: '[]',
          explanation: 'No services, no tiers.',
        },
      ],
      constraints: [
        '0 <= number of services <= 10^4',
        '-2^31 <= reading <= 2^31 - 1',
        'Output must be ordered tier 0 first, deepest tier last',
        'Averages must be exact floats, not rounded or truncated',
      ],
      hints: [
        'Compute [8, 3, 10, 1, 6, null, 14] by hand. Which services ended up averaged together, and what do they have in common that a subtree does NOT capture?',
        'The grouping is by distance from the root, so process the tree one tier at a time with a queue: everything currently queued belongs to the same tier, and their children form the next one.',
        'Snapshot width = len(queue) BEFORE the inner loop, pop exactly width nodes while summing and pushing children, then append total / width. The / operator already gives you the float.',
      ],
      functionName: 'tier_averages',
      starterCode: `class TreeNode:
    """One service: a response-time reading plus up to two dependencies."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def tier_averages(values: list) -> list[float]:
    # root = build_tree(values), then walk tier by tier
    pass
`,
      solution: {
        code: `from collections import deque

class TreeNode:
    """One service: a response-time reading plus up to two dependencies."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):                     # left child slot
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):                     # right child slot
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def tier_averages(values: list) -> list[float]:
    root = build_tree(values)
    if root is None:
        return []                       # no services, no tiers

    averages: list[float] = []
    tier = deque([root])                # invariant: queue holds exactly one full tier
    while tier:
        width = len(tier)               # snapshot BEFORE pushing any children
        total = 0
        for _ in range(width):
            node = tier.popleft()
            total += node.val
            if node.left:
                tier.append(node.left)  # children accumulate as the NEXT tier
            if node.right:
                tier.append(node.right)
        averages.append(total / width)  # true division: exact float
    return averages
`,
        commentary: `
This is the canonical case where DFS is the wrong shape. A recursive walk visits 8 → 3 → 1 → 6 → 10 → 14 (or some other subtree-first order), interleaving tiers freely; reconstructing per-tier groups from that order means carrying depth labels around. BFS gives you the grouping natively, *if* you keep the tiers from bleeding into each other.

The one load-bearing line is \`width = len(tier)\` taken **before** the inner loop. At the top of each outer iteration the queue holds exactly one complete tier — that is the invariant. The inner loop pops exactly \`width\` nodes (the current tier) while appending their children (the next tier). Skip the snapshot and the loop happily consumes freshly pushed children, merging tier boundaries and shifting every average.

Two small correctness points. Python's \`/\` performs true division, so \`total / width\` is already the exact float the dashboard wants — no casting dance. And summing before dividing (rather than averaging incrementally) keeps the arithmetic exact for integer readings, including negative ones; precision only enters at the single final division per tier.

An equivalent DFS formulation — recurse with a \`depth\` parameter into \`sums[depth]\` and \`counts[depth]\` lists, divide at the end — is also linear and worth knowing, but the queue version reads as what it is: a tier-by-tier sweep.
`,
        complexity: 'Time O(n), Space O(w) for the queue, up to O(n) on the widest tier',
        subgoals: [
          {
            lineRange: [1, 9],
            referenceLabel: 'Import the queue and define the node type',
            acceptableKeywords: ['import a queue', 'node class definition', 'value and two child links', 'set up data structures'],
            hint: 'What collection type and what element type does a level-by-level sweep need ready?',
            misconception: 'This is setup only; no levels are walked here.',
          },
          {
            lineRange: [10, 34],
            referenceLabel: 'Materialize the structure from a flat level-order list',
            acceptableKeywords: ['build tree from list', 'parse level order', 'wire up children', 'construct from array'],
            hint: 'How does the flat input list become a linked structure of nodes?',
            misconception: 'This is input parsing, separate from the breadth-first averaging.',
          },
          {
            lineRange: [35, 41],
            referenceLabel: 'Seed the frontier with the root and handle the empty case',
            acceptableKeywords: ['queue starts with root', 'empty input returns empty', 'initialize the frontier', 'result accumulator'],
            hint: 'Before the level loop runs, what single node is in the queue, and what if there are none?',
            misconception: 'This primes the breadth-first walk; it does not yet compute any average.',
          },
          {
            lineRange: [42, 51],
            referenceLabel: 'Drain exactly one level, summing as you enqueue the next',
            acceptableKeywords: ['snapshot the level width', 'pop one full tier', 'enqueue children for next level', 'accumulate the running total'],
            hint: 'Why must you record how many nodes are on this level before popping any of them?',
            misconception: 'The width snapshot keeps levels from merging; without it the per-level boundary blurs.',
          },
          {
            lineRange: [52, 53],
            referenceLabel: 'Convert each level total into its average',
            acceptableKeywords: ['divide sum by count', 'record the level mean', 'append the average', 'return the per-level results'],
            hint: 'Once a level is fully drained, what single value represents it?',
            misconception: 'This finalizes one level mean; it is not part of the draining loop above.',
          },
        ],
      },
      testCases: [
        { input: [[8, 3, 10, 1, 6, null, 14]], expected: [8.0, 6.5, 7.0], label: 'three tiers' },
        { input: [[3, 1, 2]], expected: [3.0, 1.5], label: 'fractional average' },
        { input: [[]], expected: [], label: 'empty tree' },
        { input: [[5, 5, 5, 5, 5, null, 5]], expected: [5.0, 5.0, 5.0], hidden: true, label: 'all-equal readings' },
        {
          input: [[1, -2, null, 3, null, -4]],
          expected: [1.0, -2.0, 3.0, -4.0],
          hidden: true,
          label: 'left chain with negative readings',
        },
        {
          input: [[2147483647, 2147483647, 2147483647]],
          expected: [2147483647.0, 2147483647.0],
          hidden: true,
          label: 'extreme readings, no overflow in Python',
        },
        { input: [[1, 2, 3, 4, 5, 6, 7, 8, 9]], expected: [1.0, 2.5, 5.5, 8.5], label: 'four tiers' },
        { input: [[7]], expected: [7.0], hidden: true, label: 'single service' },
      ],
      furtherPractice: [
        { name: 'LeetCode 637. Average of Levels in Binary Tree', note: 'the same sweep, classic form' },
        { name: 'LeetCode 102. Binary Tree Level Order Traversal', note: 'return the tiers themselves' },
        { name: 'LeetCode 199. Binary Tree Right Side View', note: 'keep one node per tier instead of an average' },
      ],
    },
    {
      id: 'catalog-salvage',
      title: 'Salvage the Catalog Index',
      difficulty: 'hard',
      statement: `
A hardware warehouse keeps its part catalog as a binary tree of part numbers. A healthy catalog obeys the **index invariant** everywhere: at any node, *every* part number in its left subtree is strictly smaller than the node's own number, and *every* part number in its right subtree is strictly larger. (In other words, a healthy catalog is a binary search tree.)

Last night a botched migration swapped an unknown set of nodes. The invariant may now fail anywhere — possibly at the root while pockets deeper down remain healthy.

The recovery tool can salvage exactly one **block**: a node together with all of its descendants. Given the catalog as a level-order list (\`null\` for missing children; \`build_tree\` is provided in the starter), return the **number of nodes in the largest salvageable block** — the largest subtree within which the invariant holds at every node. A single node is always a healthy block of size 1; an empty catalog yields 0. Duplicate part numbers violate the *strict* invariant wherever they meet.
`,
      examples: [
        {
          input: 'values = [10, 5, 15, 1, 8, null, 7]',
          output: '3',
          explanation:
            'The block rooted at 5 (containing 1 and 8) is healthy. The stray 7 sits in the right subtree of 15 yet is smaller than 15, which poisons every block containing both — including the whole catalog.',
        },
        {
          input: 'values = [8, 3, 10, 1, 6, null, 14]',
          output: '6',
          explanation: 'The migration left this catalog untouched: the invariant holds everywhere, so all 6 nodes form one salvageable block.',
        },
        {
          input: 'values = [2, 2, 2]',
          output: '1',
          explanation: 'Duplicates break strictness at the root, so only single-node blocks qualify.',
        },
      ],
      constraints: [
        '0 <= number of parts <= 10^4',
        '-10^9 <= part number <= 10^9',
        'Part numbers may repeat (a result of the corruption)',
        'A salvageable block must satisfy the invariant at every node inside it, not just at its root',
      ],
      hints: [
        'In [10, 5, 15, 1, 8, null, 7] the whole tree fails yet the answer is 3. Walk it: which block survives, and exactly which ancestor–descendant pairs does the stray 7 poison?',
        'For a node to head a healthy block, both child blocks must be healthy AND the largest number in the left block must be below the node AND the smallest in the right block above it. Checking the child roots alone is the classic trap — a healthy-looking child can hide a value that busts this node.',
        'Postorder, returning four facts per subtree: (healthy?, size, min, max). Empty subtree: (True, 0, no-min, no-max). At each healthy node, update a running best with the block size; once a subtree is unhealthy, report it poisoned so every ancestor fails fast.',
      ],
      functionName: 'largest_valid_index',
      starterCode: `class TreeNode:
    """One catalog entry: a part number plus up to two sub-shelves."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def largest_valid_index(values: list) -> int:
    # root = build_tree(values), then audit bottom-up
    pass
`,
      solution: {
        code: `class TreeNode:
    """One catalog entry: a part number plus up to two sub-shelves."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):                     # left child slot
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):                     # right child slot
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def largest_valid_index(values: list) -> int:
    best = 0   # size of the largest healthy block found anywhere

    # Postorder audit. Contract per subtree:
    #   (healthy, size, lo, hi)
    # where lo/hi are the min/max part numbers inside it.
    # The empty subtree is healthy with size 0 and no min/max (None).
    def audit(node: "TreeNode | None"):
        nonlocal best
        if node is None:
            return (True, 0, None, None)

        l_ok, l_size, l_lo, l_hi = audit(node.left)
        r_ok, r_size, r_lo, r_hi = audit(node.right)

        # This node heads a healthy block only if BOTH child blocks are
        # healthy AND the entire left block sits strictly below this value
        # AND the entire right block sits strictly above it.
        ok = l_ok and r_ok
        if ok and l_hi is not None and l_hi >= node.val:
            ok = False                   # something in the left block is too big
        if ok and r_lo is not None and r_lo <= node.val:
            ok = False                   # something in the right block is too small

        if not ok:
            # Poisoned: every ancestor block containing this node also fails.
            # (Healthy blocks below were already recorded in best.)
            return (False, 0, None, None)

        size = l_size + r_size + 1
        best = max(best, size)           # record the healthy block headed here
        lo = l_lo if l_lo is not None else node.val   # block min lives leftmost
        hi = r_hi if r_hi is not None else node.val   # block max lives rightmost
        return (True, size, lo, hi)

    audit(build_tree(values))
    return best
`,
        commentary: `
The trap baked into this problem is the local check: "node bigger than left child, smaller than right child." It passes \`[10, 5, 15, 1, 12]\` at every single node — yet the 12, legal under its parent 5, violates the ancestor 10. The invariant is a statement about *entire* subtrees, so an honest verdict at a node needs facts about everything below it, not just the two children.

That makes this a **richer-return** postorder. Each subtree reports four things: whether it is healthy, how many nodes it holds, and its minimum and maximum values. The parent's test is then three cheap comparisons: both children healthy, left block's max strictly below me, right block's min strictly above me. When the test passes, the new block's min is the left block's min (or my own value if the left is empty) and its max is the right block's max — which is exactly why those two extra fields earn their keep.

Failure handling is where the "largest" twist lives. A poisoned subtree returns \`(False, 0, None, None)\` and every ancestor fails fast — but the healthy blocks *inside* it were already counted, because \`best\` is updated at the moment each healthy block is confirmed, not at the end. The answer is the high-water mark over all healthy blocks, regardless of what happens above them.

Strictness falls out for free: the comparisons use \`>=\` and \`<=\` to reject ties, so duplicate part numbers can never share a block. One pass, constant work per node.
`,
        complexity: 'Time O(n), Space O(h) recursion stack (O(n) worst case on a chain)',
        subgoals: [
          {
            lineRange: [1, 7],
            referenceLabel: 'Define the node type that links to two children',
            acceptableKeywords: ['node class definition', 'value and two child links', 'tree node structure', 'left and right pointers'],
            hint: 'What shape does a single element of this structure have?',
            misconception: 'This only declares the node type; the validity scan comes later.',
          },
          {
            lineRange: [8, 32],
            referenceLabel: 'Materialize the structure from a flat level-order list',
            acceptableKeywords: ['build tree from list', 'parse level order', 'wire up children', 'construct from array'],
            hint: 'How does the flat input list become a linked structure of nodes?',
            misconception: 'This is input parsing, not the search for the largest valid block.',
          },
          {
            lineRange: [33, 46],
            referenceLabel: 'Declare the running best and gather both child summaries',
            acceptableKeywords: ['track best so far', 'rich return per subtree', 'recurse into children', 'empty subtree base case'],
            hint: 'What facts about each whole subtree must come back before this node can judge itself?',
            misconception: 'This collects child reports and the base case; it has not yet tested the ordering rule.',
          },
          {
            lineRange: [47, 55],
            referenceLabel: 'Validate this node against the full extent of both sides',
            acceptableKeywords: ['compare against subtree extremes', 'left max below node', 'right min above node', 'inherited range check'],
            hint: 'A child-only comparison is not enough — what does the node check against the whole left and right blocks?',
            misconception: 'This tests entire-subtree bounds, not just the two immediate children.',
          },
          {
            lineRange: [56, 60],
            referenceLabel: 'Mark a failed block so ancestors abandon it',
            acceptableKeywords: ['return failure signal', 'poison the ancestors', 'invalid block reported', 'stop counting upward'],
            hint: 'When this block breaks the rule, what must it tell every node above it?',
            misconception: 'This reports failure upward; healthy blocks found below were already recorded.',
          },
          {
            lineRange: [61, 69],
            referenceLabel: 'Record the valid block size and propagate its extremes',
            acceptableKeywords: ['update best with block size', 'pass min and max up', 'count this valid block', 'launch the audit'],
            hint: 'When the block is valid, what size do you record and which extremes flow to the parent?',
            misconception: 'This is the success path that updates the answer, distinct from the failure return above.',
          },
        ],
      },
      testCases: [
        { input: [[10, 5, 15, 1, 8, null, 7]], expected: 3, label: 'stray leaf poisons the root' },
        { input: [[8, 3, 10, 1, 6, null, 14]], expected: 6, label: 'whole catalog healthy' },
        { input: [[]], expected: 0, label: 'empty catalog' },
        { input: [[2, 2, 2]], expected: 1, hidden: true, label: 'all-equal: strictness rejects duplicates' },
        { input: [[5, 4, 6, null, null, 3, 7]], expected: 3, hidden: true, label: 'healthy block on the right side' },
        {
          input: [[10, 5, 15, 1, 12]],
          expected: 3,
          hidden: true,
          label: 'local parent-child check would wrongly pass the root',
        },
        { input: [[1]], expected: 1, label: 'single part' },
        { input: [[50, 30, 60, 20, 40, 55, 10]], expected: 3, hidden: true, label: 'corruption on the right branch' },
        {
          input: [[10, 5, 15, 1, 8, 12, 20, null, null, 6, 9]],
          expected: 9,
          hidden: true,
          label: 'deep catalog, fully healthy',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 98. Validate Binary Search Tree', note: 'the boolean version — ranges down or min/max up' },
        { name: 'LeetCode 333. Largest BST Subtree', note: 'the classic statement of this exact twist' },
        { name: 'LeetCode 1373. Maximum Sum BST in Binary Tree', note: 'same skeleton, maximize sum instead of size' },
      ],
    },
    {
      id: 'escalation-point',
      title: 'Escalation Meeting Point',
      difficulty: 'medium',
      statement: `
PrimeDesk, a support platform, routes escalations through a management tree keyed by badge number. The tree is a valid **binary search tree**: every badge in a manager's left subtree is smaller than their own, every badge in the right subtree is larger, and all badges are distinct. It arrives as a level-order list with \`null\` for missing reports; the starter's \`build_tree\` reconstructs it.

Two incidents are open, owned by the employees with badges \`a\` and \`b\`. Both owners are guaranteed to be in the tree, and they may be the same person. Company policy: a joint review is chaired by the **lowest** person in the hierarchy whose team — defined as themselves plus everyone below them — includes both owners. Because a person counts as a member of their own team, an owner can end up chairing their own review.

Return the badge number of the chair. An answer always exists, since the root's team includes everyone.
`,
      examples: [
        {
          input: 'values = [8, 3, 10, 1, 6, null, 14], a = 1, b = 6',
          output: '3',
          explanation: 'Both owners sit below badge 3, and no one lower covers both: 1 and 6 are in different branches under 3.',
        },
        {
          input: 'values = [8, 3, 10, 1, 6, null, 14], a = 1, b = 14',
          output: '8',
          explanation: 'The owners sit on opposite sides of the root, so only the root covers both.',
        },
        {
          input: 'values = [8, 3, 10, 1, 6, null, 14], a = 10, b = 14',
          output: '10',
          explanation: 'Badge 14 is on badge 10’s own team, so 10 chairs the review personally.',
        },
      ],
      constraints: [
        '1 <= number of employees <= 10^4',
        '-10^9 <= badge <= 10^9',
        'The tree is a valid BST and all badges are distinct',
        'Both a and b exist in the tree (a == b is allowed)',
      ],
      hints: [
        'Trace a = 1, b = 6 from the root by hand. At badge 8 you knew, without looking anywhere else, that the chair was further down — at badge 3 you knew the search was over. What changed between those two moments?',
        'The BST ordering answers "which side of this person does a badge live on?" with one comparison. While BOTH owners are strictly on the same side of the current person, the chair must be down that side; you never need to inspect the other branch.',
        'Iterate from the root: if a and b are both smaller, step left; both larger, step right; otherwise the owners split here (or one equals the current badge) and this person is the chair — return node.val. This also handles a == b: the walk stops exactly at that badge.',
      ],
      functionName: 'escalation_point',
      starterCode: `class TreeNode:
    """One employee: a badge number plus up to two direct reports."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def escalation_point(values: list, a: int, b: int) -> int:
    # root = build_tree(values), then descend
    pass
`,
      solution: {
        code: `class TreeNode:
    """One employee: a badge number plus up to two direct reports."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):                     # left child slot
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):                     # right child slot
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def escalation_point(values: list, a: int, b: int) -> int:
    node = build_tree(values)
    # Descend from the root. The first person where the owners do NOT both
    # fall strictly on the same side is the lowest one covering both.
    while node is not None:
        if a < node.val and b < node.val:
            node = node.left         # both owners below-left: chair is lower
        elif a > node.val and b > node.val:
            node = node.right        # both owners below-right: chair is lower
        else:
            return node.val          # split point (or an owner): the chair
    return -1                        # unreachable: both owners are guaranteed present
`,
        commentary: `
In a *plain* binary tree this question is genuinely harder: nothing tells you where the owners live, so you end up locating both nodes (or threading found-flags through a recursive search) and the cost is \`O(n)\`. The BST invariant collapses all of that into one comparison per step.

Here is the argument. At any node, if both badges are strictly smaller, then both owners live in the left subtree — so the current person covers both, but so does someone lower, and the *lowest* such person must be down the left branch. The symmetric claim holds on the right. The first node where neither claim applies is the **split point**: either one owner sits on each side, or the current badge *is* one of the owners (the other lives below it, or is the same person). At that node the team covers both owners, and no descendant's team can — moving into either subtree abandons at least one owner. That node is therefore exactly the answer, and the walk that finds it never branches: a single root-to-answer path, \`O(h)\` with no extra memory.

Note what the policy clause "a person counts as a member of their own team" buys: the \`else\` branch fires both for true splits and for the case where the walk lands on \`a\` or \`b\` itself — including \`a == b\`, where the descent simply steers to that badge and stops. No special cases needed; the guarantee that both badges exist is what makes the bare \`while\` loop safe.
`,
        complexity: 'Time O(h) — O(log n) balanced, O(n) worst case — Space O(1)',
        subgoals: [
          {
            lineRange: [1, 7],
            referenceLabel: 'Define the node type that links to two children',
            acceptableKeywords: ['node class definition', 'value and two child links', 'tree node structure', 'left and right pointers'],
            hint: 'What shape does a single element of this structure have?',
            misconception: 'This only declares the node type; the descent logic is separate.',
          },
          {
            lineRange: [8, 32],
            referenceLabel: 'Materialize the structure from a flat level-order list',
            acceptableKeywords: ['build tree from list', 'parse level order', 'wire up children', 'construct from array'],
            hint: 'How does the flat input list become a linked structure of nodes?',
            misconception: 'This is input parsing, not the ordered-tree descent.',
          },
          {
            lineRange: [33, 37],
            referenceLabel: 'Start a single-path descent from the root',
            acceptableKeywords: ['begin at the root', 'loop down one path', 'walk a single branch', 'no branching traversal'],
            hint: 'Where does the walk begin, and why does it follow just one path rather than recursing both ways?',
            misconception: 'This sets up the descent; it does not yet decide which way to turn.',
          },
          {
            lineRange: [38, 44],
            referenceLabel: 'Turn toward both targets until they diverge',
            acceptableKeywords: ['both values smaller go left', 'both values larger go right', 'stop at the split point', 'first node between the targets'],
            hint: 'When both targets sit on the same side, which way do you go — and what does it mean when they do not?',
            misconception: 'The split point is where the search stops, not just any common ancestor higher up.',
          },
        ],
      },
      testCases: [
        { input: [[8, 3, 10, 1, 6, null, 14], 1, 6], expected: 3, label: 'owners split below 3' },
        { input: [[8, 3, 10, 1, 6, null, 14], 1, 14], expected: 8, label: 'opposite sides of the root' },
        { input: [[8, 3, 10, 1, 6, null, 14], 10, 14], expected: 10, label: 'owner chairs their own review' },
        {
          input: [[20, 10, 30, 5, 15, 25, 35, 3, 7, 12, 17], 7, 12],
          expected: 10,
          hidden: true,
          label: 'split two levels down',
        },
        {
          input: [[20, 10, 30, 5, 15, 25, 35, 3, 7, 12, 17], 3, 35],
          expected: 20,
          hidden: true,
          label: 'extreme leaves, root chairs',
        },
        { input: [[7], 7, 7], expected: 7, hidden: true, label: 'single employee, same owner twice' },
        {
          input: [[20, 10, 30, 5, 15, 25, 35, 3, 7, 12, 17], 12, 17],
          expected: 15,
          hidden: true,
          label: 'both owners under one mid-level manager',
        },
        { input: [[5, 3], 5, 3], expected: 5, label: 'minimal two-person org' },
        {
          input: [[0, -1000000000, 1000000000], -1000000000, 1000000000],
          expected: 0,
          hidden: true,
          label: 'extreme badge values',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 235. Lowest Common Ancestor of a Binary Search Tree', note: 'the classic form of this descent' },
        { name: 'LeetCode 236. Lowest Common Ancestor of a Binary Tree', note: 'remove the BST and see what it costs you' },
        { name: 'LeetCode 700. Search in a Binary Search Tree', note: 'the single-target version of the same walk' },
      ],
    },
    {
      id: 'rose-window-symmetry',
      title: 'Rose Window Mirror Audit',
      difficulty: 'easy',
      statement: `
The restoration team at a coastal chapel is cataloguing its rose window before re-leading the glass. The window's panels form a binary tree: the central boss is the root, and every panel splits into at most two smaller panels further out. Each panel carries an integer **color code**. The layout arrives as a **level-order list** with \`null\` marking an absent panel; the starter's \`build_tree\` reconstructs it.

The original glazier worked symmetrically: the finished window should read the same in a mirror. Concretely, the window is **mirror-true** when the left half and the right half of the tree are reflections of each other — matching shapes AND matching color codes, pane for pane, across the vertical centerline.

Given \`values\`, return \`True\` if the window is mirror-true and \`False\` otherwise. An empty window and a lone central boss are both mirror-true.
`,
      examples: [
        {
          input: 'values = [1, 2, 2, 3, 4, 4, 3]',
          output: 'True',
          explanation:
            'Fold the window down its centerline: the 2s land on each other, the outer 3s pair up, and the inner 4s pair up.',
        },
        {
          input: 'values = [1, 2, 2, null, 3, null, 3]',
          output: 'False',
          explanation:
            'Both 3s hang as inner-right panels. The two halves are identical copies — but a mirror would flip one of them, so the reflection does not match.',
        },
        {
          input: 'values = []',
          output: 'True',
          explanation: 'Nothing to mirror.',
        },
      ],
      constraints: [
        '0 <= number of panels <= 10^3',
        '-10^9 <= color code <= 10^9',
        'Color codes may repeat freely; only position and code matter',
        'Both the shape and the color codes must mirror',
      ],
      hints: [
        'Trace example 2 by hand: the two halves are exact COPIES of each other, yet the window fails. What is the difference between a copy and a reflection?',
        'Mirroring is a relation between PAIRS of panels, not a property you can check one panel at a time. After matching the two children of the boss against each other, which two pairs of grandchildren must be compared next — and which pairing would be wrong?',
        'Write mirror(p, q): true if both are absent; false if exactly one is absent or the codes differ; otherwise require mirror(p.left, q.right) AND mirror(p.right, q.left) — the outer pair, then the inner pair. Kick off with mirror(root.left, root.right).',
      ],
      functionName: 'window_is_symmetric',
      starterCode: `class TreeNode:
    """One glass panel: a color code plus up to two smaller panels further out."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def window_is_symmetric(values: list) -> bool:
    # root = build_tree(values), then compare the two halves against each other
    pass
`,
      solution: {
        code: `class TreeNode:
    """One glass panel: a color code plus up to two smaller panels further out."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):                     # left child slot
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):                     # right child slot
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def window_is_symmetric(values: list) -> bool:
    root = build_tree(values)
    if root is None:
        return True                     # an empty window is trivially mirror-true

    # Pair contract: panels p and q mirror each other when their codes match,
    # p's OUTER child mirrors q's OUTER child, and the inner pair likewise.
    def mirror(p: "TreeNode | None", q: "TreeNode | None") -> bool:
        if p is None and q is None:
            return True                 # two absent panels mirror perfectly
        if p is None or q is None:
            return False                # a panel on one side only: shape breaks
        if p.val != q.val:
            return False                # colors must match across the centerline
        # Outer pair: p's left lines up with q's RIGHT. Inner pair: the reverse.
        return mirror(p.left, q.right) and mirror(p.right, q.left)

    return mirror(root.left, root.right)
`,
        commentary: `
The instinct to walk each half separately and compare the two visit logs is the trap worth naming: example 2 defeats it. Its two halves are identical *copies*, so any one-sided traversal produces identical logs for both — yet a mirror flips left and right, and copies are exactly what a mirror does NOT produce.

The clean fix is to make the recursion itself two-handed. Instead of the usual one-node contract, define a contract over a **pair**: \`mirror(p, q)\` answers "are these two subtrees reflections of each other?" The combine step encodes the geometry of reflection directly — p's left child must pair with q's *right* child (the two outer panels) and p's right child with q's left (the two inner panels). Get those two recursive calls crossed correctly and the rest collapses into three base cases: two absent panels mirror, an absent/present pair does not, and mismatched color codes do not.

This pairwise recursion is a "same tree" check with one of the two argument orders flipped — a useful way to remember it. Each panel participates in exactly one pair comparison, so the sweep is linear, and the recursion depth equals the window's height.

An equivalent iterative version pushes pairs onto an explicit stack — handy if the window is a degenerate chain deep enough to threaten Python's recursion limit.
`,
        complexity: 'Time O(n), Space O(h) recursion stack (O(n) worst case on a chain)',
        subgoals: [
          {
            lineRange: [1, 7],
            referenceLabel: 'Define the node type that links to two children',
            acceptableKeywords: ['node class definition', 'value and two child links', 'tree node structure', 'left and right pointers'],
            hint: 'What shape does a single element of this structure have?',
            misconception: 'This only declares the node type; the mirror check is separate.',
          },
          {
            lineRange: [8, 32],
            referenceLabel: 'Materialize the structure from a flat level-order list',
            acceptableKeywords: ['build tree from list', 'parse level order', 'wire up children', 'construct from array'],
            hint: 'How does the flat input list become a linked structure of nodes?',
            misconception: 'This is input parsing, not the symmetry comparison.',
          },
          {
            lineRange: [33, 37],
            referenceLabel: 'Set up the two-subtree comparison from the root halves',
            acceptableKeywords: ['compare left and right halves', 'pairwise recursion setup', 'empty tree is symmetric', 'reflect the two sides'],
            hint: 'What two subtrees does the symmetry check compare against each other?',
            misconception: 'This frames the problem as a pair comparison; the cross-recursion is defined next.',
          },
          {
            lineRange: [38, 47],
            referenceLabel: 'Decide when two mirrored positions agree or fail',
            acceptableKeywords: ['both absent is a match', 'one absent breaks shape', 'values must be equal', 'base cases for the pair'],
            hint: 'For a pair of mirrored nodes, what are the cases that immediately settle match or mismatch?',
            misconception: 'These are the per-pair base cases, not the recursive descent into deeper pairs.',
          },
          {
            lineRange: [48, 50],
            referenceLabel: 'Recurse with outer and inner sides crossed',
            acceptableKeywords: ['cross left with right', 'outer pair and inner pair', 'flip the recursive arguments', 'launch the mirror check'],
            hint: 'When the current pair matches, which children of each side must you compare against which?',
            misconception: 'This is the crossed recursion that encodes reflection, not a same-side comparison.',
          },
        ],
      },
      testCases: [
        { input: [[1, 2, 2, 3, 4, 4, 3]], expected: true, label: 'mirror-true window' },
        { input: [[1, 2, 2, null, 3, null, 3]], expected: false, label: 'identical halves are not reflections' },
        { input: [[]], expected: true, label: 'empty window' },
        { input: [[7]], expected: true, hidden: true, label: 'lone central boss' },
        {
          input: [[1, 2, 2, 3, 4, 4, 3, 5, 6, 7, 8, 8, 7, 6, 5]],
          expected: true,
          hidden: true,
          label: 'four tiers, fully mirrored',
        },
        { input: [[1, 2, 2, 3, 4, 4, 9]], expected: false, hidden: true, label: 'one outer color breaks the mirror' },
        { input: [[1, 2, 3]], expected: false, label: 'children differ immediately' },
        {
          input: [[2, 1, 1, 2, null, null, 2]],
          expected: true,
          hidden: true,
          label: 'awkward-looking list, symmetric window',
        },
        { input: [[1, 2, 2, 2, null, 2]], expected: false, hidden: true, label: 'same shape both sides, mirror fails' },
      ],
      furtherPractice: [
        { name: 'LeetCode 101. Symmetric Tree', note: 'the classic form of this pair recursion' },
        { name: 'LeetCode 100. Same Tree', note: 'the un-flipped twin: compare without crossing' },
        { name: 'LeetCode 226. Invert Binary Tree', note: 'build the reflection instead of checking it' },
      ],
    },
    {
      id: 'mobile-snapshot',
      title: 'Kinetic Mobile, Shot from the Right',
      difficulty: 'easy',
      statement: `
A sculpture gallery is photographing its newest kinetic mobile for the exhibition catalog. The mobile is a binary tree of hanging ornaments: the ceiling hook holds the root ornament, and each ornament suspends at most two more below it on short wires. The piece arrives as a **level-order list** of ornament IDs with \`null\` for an empty wire; the starter's \`build_tree\` rebuilds it.

The photographer shoots from the right-hand wall of the gallery, dead level with the piece. From there, exactly one ornament per **hanging tier** is visible: whichever hangs furthest to the right at that depth hides everything else on its tier.

Given \`values\`, return the list of visible ornament IDs **ordered from the top tier down to the deepest tier**. Return \`[]\` for an empty mobile.
`,
      examples: [
        {
          input: 'values = [5, 3, 9, 1, null, null, 4]',
          output: '[5, 9, 4]',
          explanation: 'Tier by tier, the rightmost ornaments are 5, then 9, then 4.',
        },
        {
          input: 'values = [1, 2, null, 3]',
          output: '[1, 2, 3]',
          explanation:
            'Every ornament hangs on a left wire, yet all three are visible: each is the only — and therefore the rightmost — ornament on its tier.',
        },
        {
          input: 'values = []',
          output: '[]',
          explanation: 'An empty hook photographs as a blank wall.',
        },
      ],
      constraints: [
        '0 <= number of ornaments <= 10^4',
        '-10^9 <= ornament ID <= 10^9',
        'IDs may repeat; visibility depends only on position',
        'Output must be ordered top tier first, deepest tier last',
      ],
      hints: [
        'Sketch values = [1, 2, null, 3] and look at your sketch from the right edge of the page. Why is ornament 3 visible even though it never hangs on a right-hand wire?',
        'Visibility is decided per tier, not per subtree: each depth contributes exactly one ornament — whichever sits furthest right AT THAT DEPTH, regardless of which arm of the mobile it hangs from. Group the ornaments by tier before deciding anything.',
        'Queue sweep: snapshot width = len(queue) before the inner loop, pop exactly width ornaments while enqueueing children left-then-right, and record the LAST ornament popped in each round — the enqueue order makes it the rightmost.',
      ],
      functionName: 'visible_ornaments',
      starterCode: `class TreeNode:
    """One ornament: an ID plus up to two more ornaments wired below it."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def visible_ornaments(values: list) -> list[int]:
    # root = build_tree(values), then walk tier by tier
    pass
`,
      solution: {
        code: `from collections import deque

class TreeNode:
    """One ornament: an ID plus up to two more ornaments wired below it."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):                     # left child slot
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):                     # right child slot
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def visible_ornaments(values: list) -> list[int]:
    root = build_tree(values)
    if root is None:
        return []                       # nothing hangs, nothing shows

    seen: list = []
    tier = deque([root])                # invariant: queue holds exactly one full tier
    while tier:
        width = len(tier)               # snapshot BEFORE pushing any children
        for i in range(width):
            node = tier.popleft()
            if i == width - 1:
                seen.append(node.val)   # last pop of the round = rightmost on the tier
            if node.left:
                tier.append(node.left)  # children accumulate as the NEXT tier,
            if node.right:
                tier.append(node.right) # enqueued left-then-right
    return seen
`,
        commentary: `
This sits one notch away from a per-tier aggregate like a sum or an average — and the difference is instructive. An aggregate consumes every node on the tier; here the tier is scanned only to **select** one node. The mechanics are unchanged: at the top of each round the queue holds exactly one full tier (the invariant), \`width = len(tier)\` is snapshotted before any children are pushed, and the inner loop pops exactly \`width\` ornaments. Because children are enqueued left-then-right, a tier comes off the queue in left-to-right order, so the pop at \`i == width - 1\` is the rightmost — no comparison, no max, just position.

The example worth internalizing is the left chain \`[1, 2, null, 3]\`. "Rightmost per tier" is a statement about *depth*, not about right children: a tier whose only occupant hangs far out on the left arm still shows that occupant. Any attempt to answer this by chasing right pointers down from the hook dies on this case immediately.

There is a slick DFS alternative: preorder visiting the RIGHT child first, carrying a depth counter, and recording a node only when its depth appears for the first time — the first arrival at each depth is automatically the rightmost. Same O(n) time with a stack instead of a queue. It is worth knowing, but the queue version states the per-tier structure of the question directly, which is what you want to be able to produce on demand.
`,
        complexity: 'Time O(n), Space O(w) for the queue, up to O(n) on the widest tier',
        subgoals: [
          {
            lineRange: [1, 9],
            referenceLabel: 'Import the queue and define the node type',
            acceptableKeywords: ['import a queue', 'node class definition', 'value and two child links', 'set up data structures'],
            hint: 'What collection type and what element type does a level-by-level sweep need ready?',
            misconception: 'This is setup only; no levels are walked here.',
          },
          {
            lineRange: [10, 34],
            referenceLabel: 'Materialize the structure from a flat level-order list',
            acceptableKeywords: ['build tree from list', 'parse level order', 'wire up children', 'construct from array'],
            hint: 'How does the flat input list become a linked structure of nodes?',
            misconception: 'This is input parsing, separate from the per-level selection.',
          },
          {
            lineRange: [35, 41],
            referenceLabel: 'Seed the frontier with the root and handle the empty case',
            acceptableKeywords: ['queue starts with root', 'empty input returns empty', 'initialize the frontier', 'result accumulator'],
            hint: 'Before the level loop runs, what single node is in the queue, and what if there are none?',
            misconception: 'This primes the breadth-first walk; nothing is selected yet.',
          },
          {
            lineRange: [42, 51],
            referenceLabel: 'Scan each level and keep only its final node',
            acceptableKeywords: ['snapshot the level width', 'pick the last pop', 'enqueue children left then right', 'one node per level'],
            hint: 'Since children are queued left-then-right, which pop of the round is the one you want?',
            misconception: 'This selects by position in the level, not by following right-child pointers down.',
          },
          {
            lineRange: [52, 52],
            referenceLabel: 'Return the collected per-level picks',
            acceptableKeywords: ['return the result list', 'hand back the view', 'output collected nodes', 'one value per level'],
            hint: 'After every level is processed, what do you hand back?',
            misconception: 'This is the final return, not part of the scanning loop.',
          },
        ],
      },
      testCases: [
        { input: [[5, 3, 9, 1, null, null, 4]], expected: [5, 9, 4], label: 'rightmost of each tier' },
        { input: [[1, 2, null, 3]], expected: [1, 2, 3], label: 'left chain, all visible' },
        { input: [[]], expected: [], label: 'empty mobile' },
        { input: [[7]], expected: [7], hidden: true, label: 'single ornament' },
        { input: [[1, 2, 3, 4, 5, 6, 7]], expected: [1, 3, 7], hidden: true, label: 'perfect mobile' },
        { input: [[1, 2, 3, 4]], expected: [1, 3, 4], hidden: true, label: 'deepest tier hangs on the left arm' },
        {
          input: [[10, 8, 12, 6, 9, 11, 15, null, 7]],
          expected: [10, 12, 15, 7],
          hidden: true,
          label: 'bottom ornament dangles under the left wing',
        },
        { input: [[2, 2, 2]], expected: [2, 2], label: 'repeated IDs' },
      ],
      furtherPractice: [
        { name: 'LeetCode 199. Binary Tree Right Side View', note: 'the classic form of this selection' },
        { name: 'LeetCode 513. Find Bottom Left Tree Value', note: 'select by tier on the other axis' },
        { name: 'LeetCode 515. Find Largest Value in Each Tree Row', note: 'swap positional pick for a max' },
      ],
    },
    {
      id: 'hotline-extensions',
      title: 'Hotline Extension Checksum',
      difficulty: 'medium',
      statement: `
A regional utility runs its customer hotline on a keypad menu tree. Every node of the tree is one spoken prompt labeled with a single **digit** \`0\`–\`9\`: the greeting is the root, and after each prompt the caller presses one of at most two digits to descend. When a caller reaches a **leaf** prompt, the digits pressed along the way — root first, leaf last — spell out the internal **extension number** the call is routed to. A prompt with even one follow-up is not an extension; the dialing continues below it.

The billing team audits the menu with a checksum: the **sum of every extension number** the tree encodes, as one integer. Concatenation is numeric — the path 4 → 0 spells the extension 40, and a path starting with 0 simply yields a smaller number (0 → 1 → 2 spells 12).

Given the menu as a level-order list \`values\` (\`null\` for a missing branch; \`build_tree\` provided in the starter), return the checksum. An empty menu sums to 0.
`,
      examples: [
        {
          input: 'values = [1, 2, 3]',
          output: '25',
          explanation: 'Two extensions exist: 1 → 2 spells 12 and 1 → 3 spells 13. Their sum is 25.',
        },
        {
          input: 'values = [4, 9, 0, 5, 1]',
          output: '1026',
          explanation: 'Three leaves, three extensions: 495, 491, and 40. They sum to 1026.',
        },
        {
          input: 'values = [0, 1, 2]',
          output: '3',
          explanation: 'Leading zeros vanish numerically: the paths spell 01 and 02, i.e. the extensions 1 and 2.',
        },
      ],
      constraints: [
        '0 <= number of prompts <= 10^4',
        '0 <= digit <= 9',
        'The menu is at most 12 prompts deep, so every extension fits in a standard integer',
        'A prompt with exactly one follow-up is NOT a leaf; its extension continues below',
      ],
      hints: [
        'Dial through values = [4, 9, 0, 5, 1] out loud. By the time you stand at the prompt labeled 5, which digits of its extension are already settled — and could anything you find below the 5 ever change them?',
        'This is information flowing DOWN, not up: a prompt can know the partial number its ancestors spell without ever looking back at them. What single integer should a parent hand each child along with the call?',
        'Preorder with an accumulator: descend carrying acc = acc * 10 + digit. When a prompt has no follow-ups at all, acc is one finished extension — add it to the total. Otherwise sum the two recursive results; a one-child prompt just forwards through its present side.',
      ],
      functionName: 'extension_total',
      starterCode: `class TreeNode:
    """One menu prompt: a single digit plus up to two follow-up prompts."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def extension_total(values: list) -> int:
    # root = build_tree(values), then carry the number-so-far downward
    pass
`,
      solution: {
        code: `class TreeNode:
    """One menu prompt: a single digit plus up to two follow-up prompts."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):                     # left child slot
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):                     # right child slot
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def extension_total(values: list) -> int:
    # Preorder accumulator. acc is the number the ancestors spell BEFORE
    # this prompt's digit is appended; the value flows DOWN the call tree.
    def walk(node: "TreeNode | None", acc: int) -> int:
        if node is None:
            return 0                       # missing branch: no extensions here
        acc = acc * 10 + node.val          # append this digit numerically
        if node.left is None and node.right is None:
            return acc                     # a true leaf finishes one extension
        # One present child still means "keep dialing": the absent side
        # contributes 0 through the base case, so plain addition is safe.
        return walk(node.left, acc) + walk(node.right, acc)

    return walk(build_tree(values), 0)
`,
        commentary: `
The upward instinct — gather every root-to-leaf path as a list of digits, then convert each to a number at the end — works, but it hauls whole paths around: up to O(n) paths of O(h) digits each. The structure of the question points the other way. By the time you stand on any prompt, the prefix above you is *finished*; nothing discovered below can edit it. Finished-prefix problems are preorder problems: act on the node first, then descend.

The entire trick is one arithmetic identity: appending digit \`d\` to a number \`x\` is \`x * 10 + d\`. Carry that accumulator down as a parameter and every prompt knows, in O(1), the exact number its path spells so far — no lists, no string slicing. Leaves, and only leaves, convert the accumulator into output. That is where the one-child trap bites: a prompt with a single follow-up must NOT bank its accumulator, because dialing continues through it; the absent side safely contributes 0 via the base case, so the unconditional two-call sum stays correct.

Note what makes this immune to the leading-zero worry: \`0 * 10 + 1 = 1\`, so a menu rooted at 0 just produces numerically smaller extensions, with no special casing anywhere.

The shape generalizes well beyond digits: whenever each node needs facts about its **ancestors** — path prefixes, inherited bounds, remaining budgets — pass them down as parameters instead of trying to look upward. Compare this with the module's postorder problems, where the facts needed live *below* instead.
`,
        complexity: 'Time O(n), Space O(h) recursion stack (O(n) worst case on a chain)',
        subgoals: [
          {
            lineRange: [1, 7],
            referenceLabel: 'Define the node type that links to two children',
            acceptableKeywords: ['node class definition', 'value and two child links', 'tree node structure', 'left and right pointers'],
            hint: 'What shape does a single element of this structure have?',
            misconception: 'This only declares the node type; the path accumulation is separate.',
          },
          {
            lineRange: [8, 32],
            referenceLabel: 'Materialize the structure from a flat level-order list',
            acceptableKeywords: ['build tree from list', 'parse level order', 'wire up children', 'construct from array'],
            hint: 'How does the flat input list become a linked structure of nodes?',
            misconception: 'This is input parsing, not the prefix-building walk.',
          },
          {
            lineRange: [33, 39],
            referenceLabel: 'Carry the running prefix down and fold in this node',
            acceptableKeywords: ['accumulator passed downward', 'extend the prefix number', 'append digit by ten times', 'empty branch contributes nothing'],
            hint: 'What value flows down into each call, and how does this node extend it?',
            misconception: 'The prefix is passed down before children act; this is preorder, not an upward combine.',
          },
          {
            lineRange: [40, 41],
            referenceLabel: 'Bank the completed number only at a leaf',
            acceptableKeywords: ['leaf finishes a path', 'no children means done', 'commit the full number', 'terminal node returns the value'],
            hint: 'At which kind of node is the accumulated number actually a finished result?',
            misconception: 'Only a true leaf banks the number; a node with one child must keep descending.',
          },
          {
            lineRange: [42, 46],
            referenceLabel: 'Sum the results from both branches and launch',
            acceptableKeywords: ['add both child totals', 'absent side contributes zero', 'recurse into children', 'start the walk from root'],
            hint: 'For a non-leaf, how do the two branch results combine, and why is plain addition safe?',
            misconception: 'A single-child node still recurses both ways; the missing side returns zero via the base case.',
          },
        ],
      },
      testCases: [
        { input: [[1, 2, 3]], expected: 25, label: 'two short extensions' },
        { input: [[4, 9, 0, 5, 1]], expected: 1026, label: 'three extensions of mixed length' },
        { input: [[]], expected: 0, label: 'empty menu' },
        { input: [[7]], expected: 7, hidden: true, label: 'the greeting is itself an extension' },
        { input: [[0, 1, 2]], expected: 3, hidden: true, label: 'leading zeros vanish numerically' },
        { input: [[1, null, 2]], expected: 12, hidden: true, label: 'one-child prompt is not a leaf' },
        { input: [[1, 2, 3, 4, 5, 6, 7]], expected: 522, label: 'full three-tier menu' },
        {
          input: [[9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]],
          expected: 79992,
          hidden: true,
          label: 'maximal digits, four tiers',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 129. Sum Root to Leaf Numbers', note: 'the classic statement of this accumulator' },
        { name: 'LeetCode 257. Binary Tree Paths', note: 'collect the paths themselves instead of summing' },
        { name: 'LeetCode 112. Path Sum', note: 'pass a shrinking budget down instead of a growing prefix' },
      ],
    },
    {
      id: 'race-kth-fastest',
      title: 'Podium Call at Mistbow Ridge',
      difficulty: 'medium',
      statement: `
The Mistbow Ridge trail marathon clocks every finisher with an ankle chip. As runners cross the line, the timing rig files each **chip time** (whole seconds, all distinct) into a binary search tree: at any node, every time in the left subtree is faster (smaller) and every time in the right subtree is slower (larger). The tree reaches you as a level-order list with \`null\` for missing children; the starter's \`build_tree\` rebuilds it.

The podium ceremony works down the rankings one place at a time, and the announcer keeps asking the same question with a different number: *what is the k-th fastest chip time?* The 1st fastest is the smallest time in the tree, the 2nd fastest the next smallest, and so on.

Given \`values\` and \`k\` (always between 1 and the number of finishers), return the k-th fastest chip time. Aim to answer without visiting every node when \`k\` is small.
`,
      examples: [
        {
          input: 'values = [240, 180, 300, 150, 200], k = 2',
          output: '180',
          explanation: 'Ascending, the times read 150, 180, 200, 240, 300; the 2nd fastest is 180.',
        },
        {
          input: 'values = [240, 180, 300, 150, 200], k = 5',
          output: '300',
          explanation: 'The 5th fastest of five finishers is the slowest time of all.',
        },
        {
          input: 'values = [97], k = 1',
          output: '97',
          explanation: 'A one-runner race: that runner holds every rank at once.',
        },
      ],
      constraints: [
        '1 <= number of finishers <= 10^4',
        '1 <= chip time <= 10^9; all chip times are distinct',
        'The tree is a valid binary search tree keyed on chip time',
        '1 <= k <= number of finishers',
      ],
      hints: [
        'For values = [240, 180, 300, 150, 200] and k = 2, you can find the answer without ever glancing at the 300 side of the tree. What does the BST invariant promise about where the fastest times live?',
        'One of the three DFS orders visits a BST in exactly ascending order. Name it — and notice that once you have it, "k-th fastest" stops being a search problem and becomes a counting problem.',
        'Iterative inorder with an explicit stack: slide left pushing every node, pop (each pop is the smallest time not yet seen), then step into the popped node’s right subtree. Count the pops and return on the k-th — stopping early is what makes the cost O(h + k) instead of O(n).',
      ],
      functionName: 'kth_fastest',
      starterCode: `class TreeNode:
    """One finisher: a chip time, with faster times left and slower times right."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def kth_fastest(values: list, k: int) -> int:
    # root = build_tree(values), then visit times in ascending order
    pass
`,
      solution: {
        code: `class TreeNode:
    """One finisher: a chip time, with faster times left and slower times right."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):                     # left child slot
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):                     # right child slot
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def kth_fastest(values: list, k: int) -> int:
    node = build_tree(values)
    stack = []
    # Iterative inorder. Invariant: the stack holds the chain of nodes whose
    # left side is still being explored, so pops come off in strictly
    # ascending chip-time order.
    while True:
        while node is not None:
            stack.append(node)      # park this time; faster ones may lie left
            node = node.left
        node = stack.pop()          # the smallest time not yet counted
        k -= 1
        if k == 0:
            return node.val         # k-th pop = k-th fastest: stop right here
        node = node.right           # the next-larger times live to the right
`,
        commentary: `
The honest baseline is to flatten the tree — collect every time, sort, index. Correct, O(n log n), and it throws away the only interesting thing about the input: the tree IS already sorted, just not in a flat layout. A full inorder traversal into a list improves that to O(n), but still walks ten thousand nodes to answer a question about the 2nd one.

Inorder is the load-bearing property: on a BST, visiting left subtree → node → right subtree yields values in strictly ascending order, because everything parked on the way down-left is smaller and everything to the right is larger. That converts "k-th fastest" from a search into a **count** — visit in ascending order and stop on visit number k.

The reference goes iterative rather than recursive because of the early exit. A recursive inorder can be aborted with a sentinel value or an exception, but both are clumsy; with an explicit stack, \`return\` simply works mid-walk. The cost is worth stating precisely: the initial left slide costs O(h), and across the whole run each node is pushed and popped at most once, so reaching the k-th pop touches O(h + k) nodes. For the podium question — k = 1, 2, 3 on a balanced tree of ten thousand finishers — that is a few dozen visits instead of ten thousand. The guarantee \`1 <= k <= n\` is what lets the loop run bare, with no empty-stack check.

If the announcer asked for ranks repeatedly while finishers were still streaming in, you would augment each node with its left-subtree size and descend numerically — an interview-worthy remark, but overkill for a single ceremony.
`,
        complexity: 'Time O(h + k) — O(log n + k) balanced, O(n) worst case — Space O(h) for the stack',
        subgoals: [
          {
            lineRange: [1, 7],
            referenceLabel: 'Define the node type that links to two children',
            acceptableKeywords: ['node class definition', 'value and two child links', 'tree node structure', 'left and right pointers'],
            hint: 'What shape does a single element of this structure have?',
            misconception: 'This only declares the node type; the ordered walk is separate.',
          },
          {
            lineRange: [8, 32],
            referenceLabel: 'Materialize the structure from a flat level-order list',
            acceptableKeywords: ['build tree from list', 'parse level order', 'wire up children', 'construct from array'],
            hint: 'How does the flat input list become a linked structure of nodes?',
            misconception: 'This is input parsing, not the in-order counting.',
          },
          {
            lineRange: [33, 39],
            referenceLabel: 'Prepare an explicit stack for an in-order walk',
            acceptableKeywords: ['iterative inorder setup', 'explicit stack of nodes', 'ascending visit order', 'start at the root'],
            hint: 'What auxiliary structure lets an ordered visit pause and resume so it can stop early?',
            misconception: 'This sets up the ordered traversal; no counting toward k happens yet.',
          },
          {
            lineRange: [40, 43],
            referenceLabel: 'Dive to the smallest unvisited value',
            acceptableKeywords: ['slide all the way left', 'push nodes on the way down', 'pop the smallest remaining', 'leftmost is smallest'],
            hint: 'To reach the next-smallest value, which way do you keep descending, and what do you stack as you go?',
            misconception: 'The leftmost-reachable node is the next in ascending order, not necessarily a leaf.',
          },
          {
            lineRange: [44, 47],
            referenceLabel: 'Count down and stop on the target rank, else go right',
            acceptableKeywords: ['decrement k each visit', 'return on the kth pop', 'move to the right subtree', 'stop at the target order'],
            hint: 'Each pop is the next value in order — when do you stop, and where do you go otherwise?',
            misconception: 'After visiting a node you turn right to the next-larger values, not back up the left chain.',
          },
        ],
      },
      testCases: [
        { input: [[240, 180, 300, 150, 200], 2], expected: 180, label: '2nd fastest' },
        { input: [[240, 180, 300, 150, 200], 5], expected: 300, label: 'k equals the field size' },
        { input: [[97], 1], expected: 97, label: 'one-runner race' },
        { input: [[240, 180, 300, 150, 200], 1], expected: 150, hidden: true, label: 'winner: pure left slide' },
        { input: [[500, 400, null, 300, null, 200], 3], expected: 400, hidden: true, label: 'degenerate left chain' },
        { input: [[20, 10, 30, 5, 15, 25, 35], 4], expected: 20, hidden: true, label: 'median lands on the root' },
        { input: [[20, 10, 30, 5, 15, 25, 35], 7], expected: 35, hidden: true, label: 'slowest finisher' },
        {
          input: [[100, 50, 150, 25, 75, 125, 175, 10, 30], 3],
          expected: 30,
          label: '3rd fastest needs a right step',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 230. Kth Smallest Element in a BST', note: 'the classic form' },
        { name: 'LeetCode 173. Binary Search Tree Iterator', note: 'package the early-stopping walk as an object' },
        { name: 'LeetCode 94. Binary Tree Inorder Traversal', note: 'drill the explicit-stack walk on its own' },
      ],
    },
    {
      id: 'canopy-scenic-walk',
      title: 'Featured Walk on the Canopy Line',
      difficulty: 'hard',
      statement: `
Hollyfern National Park runs a treetop walkway: wooden platforms joined by rope bridges. The entrance tower is the root platform, and from every platform at most two bridges continue outward to further platforms, so the network is a binary tree (handed to you level-order, \`null\` for a missing bridge; \`build_tree\` is in the starter). Each platform has a **scenic rating** — an integer that can be negative, since platforms wrapped in repair scaffolding actively spoil the view.

The park wants to advertise one **featured walk**: a route that follows bridges and never revisits a platform. A walk may start and end anywhere — it does not have to touch the entrance tower — and a single platform on its own counts as a (very short) walk. A walk's score is the sum of the scenic ratings of every platform on it.

Given \`values\` (at least one platform), return the **maximum score over all possible walks**.
`,
      examples: [
        {
          input: 'values = [4, 2, 6]',
          output: '12',
          explanation: 'The walk 2 → 4 → 6 crosses both bridges and collects every rating: 2 + 4 + 6 = 12.',
        },
        {
          input: 'values = [-10, 9, 20, null, null, 15, 7]',
          output: '42',
          explanation:
            'The best walk is 15 → 20 → 7, scoring 42. Climbing on through the entrance tower (-10) could only connect it to the 9, for 42 - 10 + 9 = 41 — worse.',
        },
        {
          input: 'values = [-3]',
          output: '-3',
          explanation: 'A walk must contain at least one platform, so with a single scaffolded platform the best score is its own negative rating.',
        },
        {
          input: 'values = [2, -1, -2]',
          output: '2',
          explanation: 'Both neighbors of the 2 would drag the total down; the best walk is the single platform 2.',
        },
      ],
      constraints: [
        '1 <= number of platforms <= 10^4',
        '-1000 <= scenic rating <= 1000',
        'A walk never revisits a platform, so it bends through at most one highest platform',
        'A single platform is a valid walk; an empty walk is not',
      ],
      hints: [
        'In values = [-10, 9, 20, null, null, 15, 7] the best walk never touches the entrance tower. Trace it on paper: which platform is the HIGHEST one it visits, and what shape do its two halves make below that platform?',
        'Every walk has exactly one highest platform, where it bends: one straight arm dropping into that platform’s left side and one into its right (either arm may be empty). If each subtree could report the best single downward arm starting at its own root, scoring a bend would be one addition.',
        'Postorder with a nonlocal best. At each platform: left = max(arm(left_child), 0) and right = max(arm(right_child), 0); record val + left + right as a candidate full walk; but return only val + max(left, right) upward — a parent can extend one arm, never a bent walk. The clamp at 0 is how you walk away from a toxic arm.',
      ],
      functionName: 'best_scenic_walk',
      starterCode: `class TreeNode:
    """One platform: a scenic rating plus up to two outgoing rope bridges."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def best_scenic_walk(values: list) -> int:
    # root = build_tree(values), then audit bottom-up
    pass
`,
      solution: {
        code: `class TreeNode:
    """One platform: a scenic rating plus up to two outgoing rope bridges."""
    def __init__(self, val: int, left: "TreeNode | None" = None, right: "TreeNode | None" = None):
        self.val = val
        self.left = left
        self.right = right

def build_tree(values: list) -> "TreeNode | None":
    """Build a binary tree from a level-order list; None marks a missing child."""
    if not values or values[0] is None:
        return None
    root = TreeNode(values[0])
    queue = [root]
    head = 0   # next parent to wire up
    i = 1      # next slot in the level-order list
    while head < len(queue) and i < len(values):
        node = queue[head]
        head += 1
        if i < len(values):                     # left child slot
            v = values[i]
            i += 1
            if v is not None:
                node.left = TreeNode(v)
                queue.append(node.left)
        if i < len(values):                     # right child slot
            v = values[i]
            i += 1
            if v is not None:
                node.right = TreeNode(v)
                queue.append(node.right)
    return root

def best_scenic_walk(values: list) -> int:
    best = float("-inf")   # score of the best full (possibly bent) walk seen

    # Arm contract: the best score of a walk that STARTS at this platform
    # and heads straight DOWN one side. That is the only shape a parent can
    # extend without revisiting a platform.
    def arm(node: "TreeNode | None") -> int:
        nonlocal best
        if node is None:
            return 0                         # no platform, no contribution
        left = max(arm(node.left), 0)        # a negative arm is worth skipping
        right = max(arm(node.right), 0)
        # Candidate ANSWER: the walk that bends here, using both arms.
        best = max(best, node.val + left + right)
        # Value passed UP: one arm only — a bent walk cannot be extended.
        return node.val + max(left, right)

    arm(build_tree(values))
    return best
`,
        commentary: `
Two distinct quantities live in this problem, and conflating them is *the* classic mistake. The answer the park wants is a **bent walk**: up one arm, through a bending platform, down the other arm. But the value a subtree can usefully hand its parent is narrower — a **straight arm** starting at the subtree's root — because a parent receiving a bent walk could not attach to it without revisiting the bend. The solution keeps both channels: the recursive return value carries arms, while a nonlocal \`best\` records bent-walk candidates as a side effect at every platform. Returning the bent score upward is the bug to watch for; it silently builds Y-shaped "walks" that cross the bend twice.

The other load-bearing idea is the clamp. \`max(arm, 0)\` says a walk is never obligated to enter a subtree: an arm with a negative total is replaced by the empty arm, score 0. The clamp is also why the final answer cannot be assembled from return values alone — when every rating is negative, every clamped arm reads 0, yet the true answer is the least-negative single platform. The nonlocal \`best\`, fed \`node.val + left + right\` (which degenerates to just \`node.val\` when both arms clamp away), handles that case with no special code, as the \`[-3]\` example shows.

Why does scoring only bends cover every walk? Each walk in a tree has a unique highest platform; classifying walks by that platform partitions the whole search space, and the postorder sweep visits every platform — so every walk is accounted for exactly once, in one O(n) pass.

Set every rating to 1 and the same skeleton computes the tree's diameter measured in platforms; the weighting, and especially the negative ratings, are what push this version to the hard tier.
`,
        complexity: 'Time O(n), Space O(h) recursion stack (O(n) worst case on a chain)',
        subgoals: [
          {
            lineRange: [1, 7],
            referenceLabel: 'Define the node type that links to two children',
            acceptableKeywords: ['node class definition', 'value and two child links', 'tree node structure', 'left and right pointers'],
            hint: 'What shape does a single element of this structure have?',
            misconception: 'This only declares the node type; the best-path search is separate.',
          },
          {
            lineRange: [8, 32],
            referenceLabel: 'Materialize the structure from a flat level-order list',
            acceptableKeywords: ['build tree from list', 'parse level order', 'wire up children', 'construct from array'],
            hint: 'How does the flat input list become a linked structure of nodes?',
            misconception: 'This is input parsing, not the path-scoring sweep.',
          },
          {
            lineRange: [33, 44],
            referenceLabel: 'Track a global best and clamp each arm to non-negative',
            acceptableKeywords: ['external best tracker', 'best downward arm contract', 'discard negative arms', 'recurse into both sides'],
            hint: 'What separate variable holds the overall answer, and why is a negative arm replaced with zero?',
            misconception: 'A clamped arm contributes zero rather than dragging the score down; this is not yet the answer update.',
          },
          {
            lineRange: [45, 46],
            referenceLabel: 'Score the bent path that joins both arms here',
            acceptableKeywords: ['combine both arms at node', 'candidate full path', 'update the global best', 'value plus left plus right'],
            hint: 'What full-path candidate is only visible at this node, using both of its arms?',
            misconception: 'The bent (two-arm) sum is recorded as a candidate answer, never returned to the parent.',
          },
          {
            lineRange: [47, 51],
            referenceLabel: 'Hand the parent a single straight arm and launch',
            acceptableKeywords: ['return one arm only', 'extendable straight path', 'value plus the better side', 'start the recursion'],
            hint: 'What single quantity can a parent actually extend, so what does this node return upward?',
            misconception: 'Only one arm is returned; returning the bent sum would let a path cross the same node twice.',
          },
        ],
      },
      testCases: [
        { input: [[4, 2, 6]], expected: 12, label: 'walk through the tower' },
        { input: [[-10, 9, 20, null, null, 15, 7]], expected: 42, label: 'best walk skips the tower' },
        { input: [[-3]], expected: -3, label: 'single scaffolded platform' },
        { input: [[2, -1, -2]], expected: 2, hidden: true, label: 'both arms worth abandoning' },
        { input: [[-2, -1]], expected: -1, hidden: true, label: 'all negative: best single platform' },
        {
          input: [[1, 2, 3, 4, 5, 6, 7]],
          expected: 18,
          hidden: true,
          label: 'bend at the tower with two deep arms',
        },
        {
          input: [[5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]],
          expected: 48,
          hidden: true,
          label: 'long bent walk across both wings',
        },
        { input: [[-1, -2, -3, -4]], expected: -1, hidden: true, label: 'all negative: the tower is least bad' },
        { input: [[9, -4, -4, 3, 3, 3, 3]], expected: 9, label: 'arms turn toxic above healthy leaves' },
      ],
      furtherPractice: [
        { name: 'LeetCode 124. Binary Tree Maximum Path Sum', note: 'the classic statement of the weighted version' },
        { name: 'LeetCode 543. Diameter of Binary Tree', note: 'every rating set to 1: same skeleton, count edges' },
        { name: 'LeetCode 687. Longest Univalue Path', note: 'arms may only extend while values match' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt:
        'Why is checking `left_child.val < node.val < right_child.val` at every node NOT sufficient to validate a binary search tree?',
      choices: [
        'It is sufficient — that is the definition of a BST',
        'A node deep in a subtree can satisfy its own parent yet still violate a constraint inherited from a more distant ancestor',
        'It only fails when the tree contains duplicate values',
        'It only works when the tree is height-balanced',
      ],
      correctIndex: 1,
      explanation:
        'The BST property constrains every node against ALL of its ancestors, not just its parent. In [10, 5, 15, 1, 12], the 12 is a legal right child of 5 (12 > 5) but sits in the left subtree of 10, which it violates — yet every parent-child comparison passes. Choice 1 is the classic trap: the definition quantifies over whole subtrees. Duplicates and balance are unrelated to the flaw.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt:
        'You must compute, for every node, the size of the subtree rooted there. Relative to visiting its children, when should a node compute its own answer?',
      choices: [
        'Before either child (preorder)',
        'Between its left and right child (inorder)',
        'After both children (postorder)',
        'Order is irrelevant — any traversal computes subtree sizes equally directly',
      ],
      correctIndex: 2,
      explanation:
        'A subtree size is 1 + left size + right size, so both child answers must exist before the node can combine them — that is precisely postorder. Preorder is the shape for pushing information DOWN (constraints, path prefixes), and inorder is the BST sorted-visit order. Order is not irrelevant: pre/inorder would have to revisit or buffer children to get the same numbers.',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt: 'For a recursive DFS over a binary tree with n nodes and height h, what are the time and auxiliary space costs?',
      choices: [
        'O(n) time, O(h) space for the call stack',
        'O(n log n) time, O(n) space',
        'O(h) time, O(1) space',
        'O(n) time, O(1) space',
      ],
      correctIndex: 0,
      explanation:
        'Every node is entered and exited a constant number of times, giving O(n) time, and the deepest chain of pending calls equals the height, giving O(h) stack space. O(n log n) imports a sorting-style cost that never appears; O(h) time describes a single descent (like BST search), not a full traversal; and recursion can never be O(1) space — the stack is real memory.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'A balance checker calls a separate height() helper on both subtrees of every node. On a degenerate chain of n nodes, what is its worst-case running time?',
      choices: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(2^n)'],
      correctIndex: 2,
      explanation:
        'On a chain, the node at depth d pays O(n - d) for its height call, and summing over all depths gives a quadratic total. O(n log n) is what the same naive code costs on a BALANCED tree — the tempting but wrong "worst case". The fix is a single postorder pass whose helper returns height (with a sentinel for "already unbalanced"), restoring O(n). Nothing branches exponentially, so O(2^n) is out.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'A telemetry tree stores one reading per device, and the dashboard needs the MAXIMUM reading at each depth, reported top row first. Which approach fits best?',
      choices: [
        'Inorder traversal collecting all readings, then sort them in descending order',
        'BFS with a queue, snapshotting the queue length to process one level per round',
        'Converging two pointers from the shallowest and deepest rows',
        'A single max-heap holding every reading in the tree',
      ],
      correctIndex: 1,
      explanation:
        'The grouping is by depth, which is exactly what level-order traversal produces; a per-round width snapshot keeps rows separate while you take each row’s max. The inorder-plus-sort distractor is tempting because "max" suggests sorting, but it destroys depth information — sorted readings tell you nothing about which row they came from. Two pointers needs a linear sequence with order structure, and one global heap yields one global max, not one per row.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt: 'You need the kth smallest badge number in a BST of n nodes, where k is tiny compared to n. Which approach is best?',
      choices: [
        'Level-order traversal into a list, sort it, take index k - 1',
        'Inorder traversal that stops as soon as the kth node is visited',
        'Heapify all n values, then pop the minimum k times',
        'Binary search directly on the level-order array representation',
      ],
      correctIndex: 1,
      explanation:
        'Inorder on a BST visits values in ascending order, so stopping at the kth visit costs about O(h + k) — the tree IS the sorted structure. Collect-and-sort is the tempting habit but pays O(n log n) to rebuild an order the tree already encodes. Heapify costs O(n) before the first pop. And the level-order array is not sorted, so binary searching it is simply meaningless.',
    },
    {
      id: 'q7',
      kind: 'scenario',
      prompt:
        'You are finding the lowest common ancestor of two values that both exist in a tree. What changes when the tree is a BST rather than a plain binary tree?',
      choices: [
        'Nothing — you still must locate both nodes by searching both subtrees',
        'One comparison per node tells you which single side both targets lie on, so a lone O(h) descent finds the split point',
        'You can binary search the level-order list directly for the ancestor',
        'The LCA is always the root, so no search is needed',
      ],
      correctIndex: 1,
      explanation:
        'In a BST, comparing both targets to the current value either sends you down one side (both smaller or both larger) or proves you are standing at the split point — the LCA — without ever inspecting the other branch. Choice 1 imports the general-binary-tree method (find both paths, compare them), which works but wastes the ordering and costs O(n). The level-order list is not sorted, and the root is only the LCA when the targets straddle it.',
    },
    {
      id: 'q8',
      kind: 'complexity',
      prompt: 'What is the worst-case auxiliary space for a level-order (BFS) traversal of a complete binary tree with n nodes?',
      choices: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
      correctIndex: 2,
      explanation:
        'The queue must hold an entire level at once, and the bottom level of a complete tree contains about n/2 nodes — so the queue peaks at O(n). O(log n) is the tempting swap: it is the DFS stack depth on that same tree, not the BFS queue width. O(1) ignores the queue entirely, and O(n log n) overcounts — the queue never holds more than one level plus its children.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'What is the "subtree contract", and why is it the core of tree recursion?',
      back: 'Define exactly what one call returns for ANY subtree — including the empty one — then trust the recursive calls on the children and write only the combine step. Structural induction does the orchestration you would otherwise simulate by hand.',
    },
    {
      id: 'f2',
      front: 'Preorder vs inorder vs postorder — one-line job description for each?',
      back: 'Preorder acts before the children: push constraints or prefixes DOWN (copying, serializing). Inorder visits a BST in sorted order. Postorder acts after the children: pull heights, sizes, and validity UP.',
    },
    {
      id: 'f3',
      front: 'How do you validate a BST correctly?',
      back: 'Pass a (lo, hi) window down: every node must sit strictly inside the window inherited from ALL ancestors, tightened at each descent. Equivalently, confirm the inorder visit is strictly ascending. Comparing only with direct children misses deep violations.',
    },
    {
      id: 'f4',
      front: 'Balance/height check in one pass — what is the template move?',
      back: 'One postorder helper returns the subtree height, using -1 as a poison value for "already unbalanced"; propagate -1 immediately without further work. This avoids per-node height recomputation and keeps the audit O(n).',
    },
    {
      id: 'f5',
      front: 'BFS level template — how do you keep tiers from bleeding together?',
      back: 'Snapshot width = len(queue) BEFORE the inner loop, then pop exactly width nodes while appending their children. One outer iteration then equals exactly one level.',
    },
    {
      id: 'f6',
      front: 'Time and space of a full DFS traversal over n nodes?',
      back: 'O(n) time — each node is processed a constant number of times. Space is the recursion stack: O(h), which is O(log n) on a balanced tree but O(n) on a skewed chain.',
    },
    {
      id: 'f7',
      front: 'LCA of two values in a BST — what is the template move?',
      back: 'Descend from the root: both targets smaller → go left; both larger → go right; otherwise you are at the split point, which is the LCA. One path, O(h) time, O(1) space, no parent pointers or stored paths.',
    },
    {
      id: 'f8',
      front: 'Pitfall: why does calling height() inside every node of a recursive check hurt, and what is the fix?',
      back: 'Each call re-walks the subtree, totalling O(n^2) on a chain. Fix: widen the return value — send height plus the verdict up in a single postorder pass.',
    },
    {
      id: 'f9',
      front: 'Why can a 10^4-node tree crash a correct recursive Python solution, and what do you do?',
      back: 'Python’s default recursion limit is about 1000, and a skewed tree’s depth equals its node count. Convert to an explicit-stack iterative traversal, or raise the limit when you control the environment.',
    },
    {
      id: 'f10',
      front: 'Signal checklist: which phrasings point to tree DFS, tree BFS, and BST descent?',
      back: '"Every node / any root-to-leaf path / largest subtree" → DFS with a subtree contract. "Per level / row by row / side view" → BFS with width snapshots. "Sorted / range / kth smallest / closest" on a tree → BST descent in O(h).',
    },
  ],
  cheatSheet: {
    tldr:
      'Tree problems are solved one node at a time: state a contract for what any subtree returns (including the empty one), trust the recursive calls on the children, and write only the combine step. Postorder pulls answers up (heights, sizes, validity), preorder pushes constraints down (BST windows), inorder reads a BST in sorted order, and a queue replaces recursion when the question groups nodes by level. On binary search trees, one comparison per node discards half the structure and turns search-shaped asks into O(h) descents.',
    signals: [
      'Reach for this when the data is genuinely hierarchical — filesystems, org charts, DOMs, parse trees — and the question concerns structure, not just values.',
      'Reach for this when the ask is per subtree ("every node", "any root-to-leaf path", "largest subtree such that…"): postorder DFS with a subtree contract.',
      'Reach for this when the ask is per depth ("each level", "row by row", "side view"): BFS, snapshotting the queue width each round.',
      'Reach for this when "sorted", "range", "kth smallest", or "closest" appears next to a tree: the BST invariant gives O(h) descents and sorted inorder scans.',
      'Be suspicious when a node’s answer needs facts about its ancestors — pass constraints down as parameters (like BST (lo, hi) windows) instead of trying to look upward.',
    ],
    template: `# Postorder subtree contract (heights, sizes, validity — answers flow UP)
def solve(node):
    if node is None:
        return EMPTY_ANSWER        # decide the empty case first
    left = solve(node.left)        # trusted answer for the left subtree
    right = solve(node.right)      # trusted answer for the right subtree
    return combine(node.val, left, right)

# BFS per tier (anything phrased "per level / per row")
from collections import deque
tier = deque([root])
while tier:
    for _ in range(len(tier)):     # snapshot width BEFORE pushing children
        node = tier.popleft()
        # ... consume node ...
        if node.left:  tier.append(node.left)
        if node.right: tier.append(node.right)

# BST descent (search / LCA / closest — discard half the tree per step)
while node:
    if target < node.val:
        node = node.left
    elif target > node.val:
        node = node.right
    else:
        break                      # found the pivot / split point`,
    complexity:
      'Full traversals: Time O(n); Space O(h) for DFS (log n balanced, n skewed) or O(width) for BFS (up to n). Pure BST descents: O(h) with no traversal at all.',
  },
}

export default mod
