import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'graphs',
  visualizer: 'graph-traversal',
  concept: `
## The mental model

Think of a rumor moving through an office. The person who hears it first tells everyone at the neighboring desks; next round, each of *those* people tells their neighbors; and so on. The rumor spreads in waves, and the wave that sweeps you up is exactly your "distance" from the source. That is **breadth-first search (BFS)**: explore in expanding rings, never touching ring \`k+1\` until ring \`k\` is exhausted. The ring number is a free shortest-path certificate — the first time BFS reaches a node, no shorter route to it exists.

Now picture a cave explorer with a ball of string. They walk as deep as possible down one tunnel, and only when they hit a dead end do they backtrack along the string to the last junction with an unexplored branch. That is **depth-first search (DFS)**: commit fully to one path, retreat, repeat. DFS doesn't know distances, but it's superb at exhausting everything reachable and at noticing when a tunnel loops back onto the path you're currently standing on — which is precisely what cycle detection needs.

A graph is just *things plus relationships*: machines and cables, jobs and prerequisites, grid cells and adjacency. Most graph interview problems are one of these two walks wearing a costume. Strip the story, find the nodes and edges, and the question collapses into "walk the graph and record something along the way."

## Mechanics

Two chores come before any walk. First, **representation**: an edge list becomes an adjacency list (\`adj[u]\` is the list of \`u\`'s neighbors); a grid needs no conversion at all, because neighbors are computed on the fly from \`(r±1, c)\` and \`(r, c±1)\`. Second, a **visited set**, because real graphs have cycles and an unguarded walk will orbit one forever.

The BFS skeleton:

\`\`\`python
from collections import deque

def bfs(start, neighbors):
    seen = {start}
    queue = deque([(start, 0)])        # (node, distance from start)
    while queue:
        node, dist = queue.popleft()
        # first visit to node happens at its minimal dist — act here
        for nxt in neighbors(node):
            if nxt not in seen:
                seen.add(nxt)          # mark at ENQUEUE time, not at pop
                queue.append((nxt, dist + 1))
\`\`\`

Swap the deque for a stack (or recursion) and drop the distances — that's DFS. Everything else is identical.

Three composable upgrades cover most problems. **Connected components**: wrap the walk in a loop over all nodes; every time you find an unvisited node, that's a brand-new component — count it, then traverse until the component is exhausted. **Union-Find** is the alternative when edges arrive as a list: start with \`n\` singleton groups, merge per edge, count survivors; with path compression it's effectively constant per operation. **Cycle detection / topological order** in a directed graph: Kahn's algorithm repeatedly runs any node with indegree zero and decrements its dependents; if you finish fewer than \`n\` nodes, the leftovers sit on (or behind) a cycle.

## When to reach for it

- **"Minimum number of steps / moves / hops"** on unweighted relationships — BFS, full stop. The first arrival is provably optimal.
- **"Groups", "clusters", "regions", "provinces", "segments"** — connected components, via repeated traversal or Union-Find.
- **"Can A reach B?"** — either walk works; pick BFS iteratively to dodge recursion limits.
- **"Prerequisites", "dependencies", "deadlock", "valid order"** — topological sort and cycle detection on a directed graph.
- **A grid where you move between cells** — it's a graph in disguise; the grid *is* the adjacency structure.

Be suspicious when edges carry **different weights** — BFS's layer argument dies, and you want Dijkstra. And if movement is restricted to right/down only, the grid is a DAG and DP may be simpler.

## Complexity

BFS and DFS visit each node once and scan each edge a constant number of times: \`O(V + E)\` time, \`O(V)\` space for the visited set plus the frontier. An \`R x C\` grid has \`V = R*C\` cells and at most \`4V\` edges, so grid traversal is \`O(R*C)\`. Union-Find with path compression and union by size runs in effectively \`O(α(n))\` amortized per operation — constant for any input that fits in this universe. Compare all of this with the naive "try every path" approach, which is exponential: the visited set is what turns an intractable enumeration into a linear scan.

## Common pitfalls

- **Marking visited at pop time instead of enqueue time.** Distances stay correct, but the same node can flood the queue many times over — a silent performance bug that passes small tests.
- **No visited set at all.** The walk loops forever on the first cycle it meets.
- **Only traversing from node 0.** Disconnected graphs are the norm in component problems; loop over every node as a potential start.
- **Recursion-depth crashes.** Python's default limit is ~1000; a 100k-node path graph kills recursive DFS. Prefer an explicit stack or BFS.
- **Using BFS on weighted edges.** Fewest hops is not cheapest cost; reach for Dijkstra.
- **Directed cycle detection with a plain visited set.** Hitting a visited node may just be a cross edge to a finished subtree. You need "in progress" vs "done" states (gray/black), or Kahn's processed-count check.
- **Grid bounds and terrain checks in the wrong order.** Check in-bounds *before* indexing, and check passability and visited before enqueueing.
`,
  realWorldUses: [
    {
      title: 'Web crawlers',
      description:
        'A crawler is a giant BFS over the hyperlink graph: a frontier queue of URLs to fetch, a visited set (deduplicated, often via hashes or Bloom filters) so pages are not fetched twice, and per-domain politeness rules layered on top. The expanding-ring structure is also why crawl depth is a natural quality signal.',
    },
    {
      title: 'Build systems and package managers',
      description:
        'make, npm, cargo, and Bazel all model targets/packages as a directed dependency graph, topologically sort it to find a valid build order, and run a cycle check first — a circular dependency is rejected at resolution time rather than deadlocking the build.',
    },
    {
      title: 'Flood fill and connected-component labeling',
      description:
        'The paint-bucket tool in image editors is a BFS/DFS over the pixel grid from the clicked pixel through same-colored neighbors. Computer-vision pipelines use the same connected-component pass to separate touching objects (cells in microscopy, characters in OCR) before measuring them.',
    },
  ],
  problems: [
    {
      id: 'panel-defect-clusters',
      title: 'Dead Pixel Clusters',
      difficulty: 'easy',
      statement: `
A factory that assembles OLED display panels runs every unit through an optical tester. The tester emits a grid \`panel\` of 0s and 1s, where \`panel[r][c] == 1\` means the pixel at row \`r\`, column \`c\` failed to light up.

QA does not care much about how many individual pixels are dead — it cares about **defect clusters**, because clusters indicate an etching fault. A defect cluster is a maximal group of dead pixels connected **horizontally or vertically**. Diagonal contact does not connect pixels: the etching process only bleeds along rows and columns.

Given the grid, return the number of defect clusters. Two dead pixels belong to the same cluster exactly when you can walk from one to the other through dead pixels using only up/down/left/right steps.
`,
      examples: [
        {
          input: 'panel = [[1, 1, 0, 0], [0, 1, 0, 1], [0, 0, 0, 1], [1, 0, 0, 0]]',
          output: '3',
          explanation:
            'The three dead pixels in the top-left touch orthogonally (one cluster), the two in the right column touch (a second), and the lone pixel in the bottom-left corner is a third.',
        },
        {
          input: 'panel = [[1, 0, 1], [0, 1, 0], [1, 0, 1]]',
          output: '5',
          explanation:
            'Every pair of dead pixels touches only diagonally, and diagonal contact does not count — each pixel is its own cluster.',
        },
        {
          input: 'panel = [[0, 0], [0, 0]]',
          output: '0',
          explanation: 'A perfect panel has no defect clusters.',
        },
      ],
      constraints: [
        '0 <= rows, cols <= 300',
        'panel[r][c] is 0 (healthy) or 1 (dead)',
        'Connectivity is 4-directional only (no diagonals)',
      ],
      hints: [
        'Imagine pressing a fingertip on one dead pixel and asking: which other dead pixels are "stuck to" this one through chains of touching dead pixels? The question is really asking you to count each such blob exactly once.',
        'Scan every cell in reading order. When you land on a dead pixel you have never seen before, that is the discovery of a brand-new cluster — count it, then visit and mark every dead pixel reachable from it before resuming the scan, so the rest of that blob can never be counted again.',
        'Keep a seen matrix. For each unseen 1, increment the count and flood outward with a queue: pop a cell, look at its 4 orthogonal neighbors, and enqueue any that are in bounds, dead, and unseen — marking them seen as you enqueue. The scan-plus-flood touches each cell O(1) times.',
      ],
      functionName: 'count_defect_clusters',
      starterCode: `def count_defect_clusters(panel: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `from collections import deque


def count_defect_clusters(panel: list[list[int]]) -> int:
    # Degenerate panels (no rows, or rows with no columns) have no clusters.
    if not panel or not panel[0]:
        return 0
    rows, cols = len(panel), len(panel[0])
    seen = [[False] * cols for _ in range(rows)]
    clusters = 0

    for r in range(rows):
        for c in range(cols):
            # A dead pixel we have never touched = the first sighting
            # of a brand-new cluster.
            if panel[r][c] == 1 and not seen[r][c]:
                clusters += 1
                # Flood the whole cluster so none of its other pixels
                # can ever start a count of their own.
                queue = deque([(r, c)])
                seen[r][c] = True
                while queue:
                    cr, cc = queue.popleft()
                    for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nr, nc = cr + dr, cc + dc
                        # In bounds, dead, and not yet absorbed?
                        if (
                            0 <= nr < rows
                            and 0 <= nc < cols
                            and panel[nr][nc] == 1
                            and not seen[nr][nc]
                        ):
                            seen[nr][nc] = True  # mark at enqueue time
                            queue.append((nr, nc))
    return clusters
`,
        commentary: `
This is the canonical connected-components-on-a-grid scan. The key invariant: **every pixel marked \`seen\` has already been attributed to exactly one cluster.**

The outer double loop guarantees we eventually stand on at least one pixel of every cluster. The moment we stand on a dead, unseen pixel, we know two things: (1) this blob has never been counted, because flooding always absorbs a blob *entirely* before the scan resumes, and (2) it will never be counted again, for the same reason. So \`clusters += 1\` fires exactly once per blob.

The flood itself is plain BFS over the implicit grid graph — a cell's neighbors are computed from coordinate deltas rather than stored anywhere. Marking \`seen\` at enqueue time (not pop time) matters: two frontier cells often share an unseen neighbor, and enqueue-time marking stops that neighbor from entering the queue twice.

Each cell is enqueued at most once and examined at most five times (once by the scan, up to four times as someone's neighbor), so the whole thing is linear in the panel area. A DFS with an explicit stack works identically; recursion would risk Python's depth limit on a 300×300 all-dead panel.
`,
        complexity: 'Time O(R·C), Space O(R·C) for the seen matrix and queue',
      },
      testCases: [
        {
          input: [[[1, 1, 0, 0], [0, 1, 0, 1], [0, 0, 0, 1], [1, 0, 0, 0]]],
          expected: 3,
          label: 'three clusters',
        },
        {
          input: [[[1, 0, 1], [0, 1, 0], [1, 0, 1]]],
          expected: 5,
          label: 'diagonals do not connect',
        },
        { input: [[[0, 0], [0, 0]]], expected: 0, label: 'clean panel' },
        { input: [[[1]]], expected: 1, label: 'single dead pixel' },
        { input: [[]], expected: 0, hidden: true, label: 'empty grid' },
        { input: [[[1, 1, 1], [1, 1, 1]]], expected: 1, hidden: true, label: 'entire panel dead' },
        { input: [[[1, 1, 0, 1]]], expected: 2, hidden: true, label: 'single row' },
        {
          input: [[[1, 0, 0, 1, 1], [1, 0, 0, 0, 1], [0, 0, 1, 0, 0], [1, 1, 1, 0, 1]]],
          expected: 4,
          hidden: true,
          label: 'mixed layout with snaking cluster',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 200. Number of Islands', note: 'the classic phrasing of this exact scan' },
        { name: 'LeetCode 695. Max Area of Island', note: 'count cluster sizes instead of clusters' },
        { name: 'LeetCode 733. Flood Fill', note: 'one flood from a given start, no outer scan' },
      ],
    },
    {
      id: 'network-segments',
      title: 'Counting Network Segments',
      difficulty: 'medium',
      statement: `
After an office move, the IT team finds a box of patch-cable records but no network map. The office has \`n\` machines labeled \`0\` to \`n - 1\`, and \`links\` is a list of pairs \`[a, b]\`, each meaning a cable directly connects machine \`a\` and machine \`b\`. Two machines can communicate if there is any chain of cables between them, in either direction.

Return the number of **network segments**: groups of machines that can all reach each other but cannot reach any machine outside the group. A machine with no cables at all forms a segment by itself. The records are messy — the same cable may have been logged more than once — and duplicates must not change the answer.
`,
      examples: [
        {
          input: 'n = 5, links = [[0, 1], [1, 2], [3, 4]]',
          output: '2',
          explanation: 'Machines {0, 1, 2} form one segment via the chain 0–1–2; machines {3, 4} form the other.',
        },
        {
          input: 'n = 4, links = []',
          output: '4',
          explanation: 'With no cables, every machine is isolated — four segments of one machine each.',
        },
        {
          input: 'n = 6, links = [[0, 1], [2, 3], [4, 5], [1, 2]]',
          output: '2',
          explanation:
            'The cable [1, 2] fuses the {0, 1} and {2, 3} groups into one segment of four; {4, 5} stays separate.',
        },
      ],
      constraints: [
        '0 <= n <= 100_000',
        '0 <= len(links) <= 200_000',
        'links[i] = [a, b] with 0 <= a, b < n and a != b',
        'Duplicate cable records may appear',
      ],
      hints: [
        'If you drew the machines as dots and the cables as lines on a whiteboard, what visual feature of the drawing are you actually being asked to count? Think about what a machine with no lines contributes.',
        'Two equivalent strategies: (1) start every machine in its own group and treat each cable record as evidence that two groups are really one, counting the groups that survive; or (2) build an adjacency list and sweep over all machines, launching a traversal from each machine no previous traversal has touched.',
        'Union-Find is the tidy version of strategy 1: parent = list(range(n)), a find() with path compression, and a counter starting at n. For each link, find both roots; if they differ, link one root to the other and decrement the counter. Duplicates find equal roots and change nothing.',
      ],
      functionName: 'count_network_segments',
      starterCode: `def count_network_segments(n: int, links: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `def count_network_segments(n: int, links: list[list[int]]) -> int:
    # Union-Find (disjoint set union). Every machine starts as the
    # root of its own one-machine segment.
    parent = list(range(n))

    def find(x: int) -> int:
        # Walk up to the root, halving the path as we go so future
        # finds on this chain are nearly free (path compression).
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    # n isolated machines = n segments before any cable is considered.
    segments = n
    for a, b in links:
        root_a, root_b = find(a), find(b)
        if root_a != root_b:
            # This cable joins two previously separate segments:
            # merge them and lose exactly one segment.
            parent[root_a] = root_b
            segments -= 1
        # If the roots already match (duplicate cable, or a cable
        # inside an existing segment), nothing changes.
    return segments
`,
        commentary: `
The question "how many groups remain after all these pairwise merges?" is Union-Find's home turf. The accounting argument makes the code almost write itself: with zero cables there are exactly \`n\` segments, and each cable either (a) connects two machines already in the same segment — segment count unchanged — or (b) fuses two distinct segments into one — segment count drops by exactly 1. So we start the counter at \`n\` and decrement once per *successful* union. Duplicate records fall into case (a) automatically; no deduplication pass needed.

\`find\` uses path halving: every node on the walk to the root gets re-pointed at its grandparent, flattening the tree for all future queries. Even without union-by-size, path compression alone keeps operations near-constant amortized in practice; adding rank/size tracking gives the textbook \`O(α(n))\` bound.

The BFS/DFS alternative — build an adjacency list, sweep all \`n\` machines, launch a traversal from each unvisited one, count launches — is the same \`O(n + m)\` and equally correct. Union-Find wins here on memory locality and on never materializing the adjacency list; BFS wins when you also need to *list* each segment's members in traversal order.
`,
        complexity: 'Time O(n + m·α(n)) ≈ O(n + m), Space O(n) for the parent array',
      },
      testCases: [
        { input: [5, [[0, 1], [1, 2], [3, 4]]], expected: 2, label: 'two segments' },
        { input: [4, []], expected: 4, label: 'no cables' },
        {
          input: [6, [[0, 1], [2, 3], [4, 5], [1, 2]]],
          expected: 2,
          label: 'late cable fuses two groups',
        },
        { input: [1, []], expected: 1, hidden: true, label: 'single machine' },
        { input: [0, []], expected: 0, hidden: true, label: 'empty office' },
        {
          input: [3, [[0, 1], [1, 0], [0, 1]]],
          expected: 2,
          hidden: true,
          label: 'duplicate cables ignored',
        },
        {
          input: [5, [[0, 1], [1, 2], [2, 3], [3, 4]]],
          expected: 1,
          hidden: true,
          label: 'one chain, one segment',
        },
        {
          input: [8, [[0, 7], [1, 6], [2, 5], [3, 4], [0, 1], [2, 3]]],
          expected: 2,
          label: 'pairs fused into two quads',
        },
      ],
      furtherPractice: [
        {
          name: 'LeetCode 323. Number of Connected Components in an Undirected Graph',
          note: 'the classic phrasing',
        },
        { name: 'LeetCode 547. Number of Provinces', note: 'same idea, adjacency-matrix input' },
        { name: 'LeetCode 684. Redundant Connection', note: 'union-find spotting the cycle-making edge' },
      ],
    },
    {
      id: 'delivery-robot-route',
      title: 'Hospital Delivery Robot',
      difficulty: 'medium',
      statement: `
A hospital uses a small autonomous robot to carry medication from the loading dock to the pharmacy. The floor plan is a grid \`floor\` where \`floor[r][c] == 0\` is an open tile and \`floor[r][c] == 1\` is blocked (walls, parked carts, wet-floor zones). The dock occupies the **top-left** tile \`(0, 0)\` and the pharmacy the **bottom-right** tile.

In one move the robot rolls to an orthogonally adjacent open tile — up, down, left, or right; it can never enter a blocked tile or leave the grid. Return the **minimum number of moves** needed to travel from the dock to the pharmacy. If the pharmacy is unreachable — including the cases where the dock or pharmacy tile is itself blocked — return \`-1\`. If the grid is a single open tile, the robot is already there: return \`0\`.
`,
      examples: [
        {
          input: 'floor = [[0, 0, 0], [1, 1, 0], [0, 0, 0]]',
          output: '4',
          explanation:
            'The middle row is walled except at the right edge, so the robot goes right, right, down, down — 4 moves, and no shorter route exists.',
        },
        {
          input: 'floor = [[0, 1], [1, 0]]',
          output: '-1',
          explanation: 'Both tiles adjacent to the dock are blocked; the pharmacy cannot be reached.',
        },
        {
          input: 'floor = [[0]]',
          output: '0',
          explanation: 'Dock and pharmacy share the only tile — zero moves.',
        },
      ],
      constraints: [
        '1 <= rows, cols <= 200',
        'floor[r][c] is 0 (open) or 1 (blocked)',
        'Moves are 4-directional, onto open in-bounds tiles only',
        'Return -1 when no route exists, including when either endpoint is blocked',
      ],
      hints: [
        'Many different routes can reach the pharmacy. What would have to be true about the *order* in which you explore tiles for the first arrival at the pharmacy to be guaranteed cheapest?',
        'Explore the floor in expanding rings: first every tile reachable in 1 move, then every tile reachable in 2, and so on. The first ring that touches the pharmacy is the answer. A first-in-first-out queue produces exactly this ring order.',
        'BFS with a deque of (row, col, dist). Mark tiles visited when you enqueue them, not when you pop. Skip out-of-bounds, blocked, and visited neighbors; the moment a neighbor is the bottom-right tile, return dist + 1. Before the loop, handle blocked endpoints and the 1×1 grid; if the queue drains, return -1.',
      ],
      functionName: 'min_delivery_moves',
      starterCode: `def min_delivery_moves(floor: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `from collections import deque


def min_delivery_moves(floor: list[list[int]]) -> int:
    rows, cols = len(floor), len(floor[0])

    # If either endpoint is blocked, no route can exist.
    if floor[0][0] == 1 or floor[rows - 1][cols - 1] == 1:
        return -1
    # Dock and pharmacy are the same tile: already delivered.
    if rows == 1 and cols == 1:
        return 0

    seen = [[False] * cols for _ in range(rows)]
    seen[0][0] = True
    queue = deque([(0, 0, 0)])  # (row, col, moves taken to get here)

    while queue:
        r, c, dist = queue.popleft()
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            # Neighbor must be in bounds, open, and not yet discovered.
            if (
                0 <= nr < rows
                and 0 <= nc < cols
                and floor[nr][nc] == 0
                and not seen[nr][nc]
            ):
                # First time the frontier touches the pharmacy is
                # guaranteed minimal — return immediately.
                if nr == rows - 1 and nc == cols - 1:
                    return dist + 1
                seen[nr][nc] = True  # mark at enqueue time
                queue.append((nr, nc, dist + 1))

    # Frontier exhausted without reaching the pharmacy.
    return -1
`,
        commentary: `
Every move costs the same, so this is the textbook case for BFS. The correctness argument rests on one property of a FIFO frontier: **the queue always holds tiles in nondecreasing distance order**, with at most two distinct distance values present at once. By induction, when a tile is first discovered, it is discovered from a tile one ring closer to the dock — so the recorded \`dist + 1\` is its true shortest distance. DFS has no such guarantee: it would happily report some meandering first-found route.

Two details earn the "passes hidden tests" badge. First, *visited at enqueue time*: open floor plans let many frontier tiles share an undiscovered neighbor, and pop-time marking would let that neighbor pile into the queue repeatedly — still correct, but needlessly slow and memory-hungry. Second, the *endpoint edge cases*: a blocked dock or pharmacy means \`-1\` regardless of what the rest of the maze looks like, and a 1×1 open grid means \`0\` — the main loop never handles "start equals goal" because we return on *discovering* the goal, so it must be settled up front.

Returning at discovery (rather than at pop) shaves up to one full ring of work; either choice is correct as long as distances are assigned at enqueue time.
`,
        complexity: 'Time O(R·C), Space O(R·C) for the seen matrix and queue',
      },
      testCases: [
        { input: [[[0, 0, 0], [1, 1, 0], [0, 0, 0]]], expected: 4, label: 'detour around a wall' },
        { input: [[[0, 1], [1, 0]]], expected: -1, label: 'pharmacy sealed off' },
        { input: [[[0]]], expected: 0, label: 'single open tile' },
        { input: [[[1, 0], [0, 0]]], expected: -1, hidden: true, label: 'dock itself blocked' },
        { input: [[[0, 0], [0, 1]]], expected: -1, hidden: true, label: 'pharmacy itself blocked' },
        {
          input: [[[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]],
          expected: 5,
          label: 'open floor, manhattan distance',
        },
        {
          input: [
            [
              [0, 0, 0, 0, 0],
              [1, 1, 1, 1, 0],
              [0, 0, 0, 0, 0],
              [0, 1, 1, 1, 1],
              [0, 0, 0, 0, 0],
            ],
          ],
          expected: 16,
          hidden: true,
          label: 'snake maze forces full zigzag',
        },
        { input: [[[0], [0], [0], [0]]], expected: 3, hidden: true, label: 'single-column corridor' },
        {
          input: [[[0, 0, 0], [0, 1, 1], [0, 1, 0]]],
          expected: -1,
          hidden: true,
          label: 'goal walled in from both sides',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 1091. Shortest Path in Binary Matrix', note: '8-directional variant' },
        { name: 'LeetCode 994. Rotting Oranges', note: 'multi-source BFS, rings = minutes' },
        { name: 'LeetCode 542. 01 Matrix', note: 'multi-source BFS computing all distances at once' },
      ],
    },
    {
      id: 'bake-order-feasibility',
      title: 'Asset Bake Order',
      difficulty: 'hard',
      statement: `
A game studio's build farm "bakes" assets overnight: lightmaps, navmeshes, compressed texture atlases. There are \`n\` bake jobs labeled \`0\` to \`n - 1\`, and a manifest \`deps\` where each entry \`deps[i] = [job, requirement]\` means \`requirement\` must finish **before** \`job\` may start. A job may appear in many entries, and the farm runs jobs one at a time in whatever order the scheduler picks.

Manifests are written by hand, so they sometimes contain circular requirements that would deadlock the farm — and occasionally a job is even listed as its own requirement, which is just as fatal. Return \`True\` if there exists **some** order in which all \`n\` jobs can run to completion, and \`False\` otherwise. Duplicate entries may appear and must not change the answer.
`,
      examples: [
        {
          input: 'n = 3, deps = [[1, 0], [2, 1]]',
          output: 'True',
          explanation: 'Run job 0, then job 1 (its requirement is done), then job 2. Every job completes.',
        },
        {
          input: 'n = 2, deps = [[0, 1], [1, 0]]',
          output: 'False',
          explanation: 'Job 0 waits for job 1 and job 1 waits for job 0 — neither can ever start.',
        },
        {
          input: 'n = 3, deps = [[1, 1]]',
          output: 'False',
          explanation:
            'Job 1 requires itself, so it can never start. Jobs 0 and 2 could run, but ALL jobs must complete.',
        },
      ],
      constraints: [
        '1 <= n <= 100_000',
        '0 <= len(deps) <= 200_000',
        'deps[i] = [job, requirement] with 0 <= job, requirement < n',
        'Entries may repeat, and job may equal requirement (a manifest error that makes the plan infeasible)',
      ],
      hints: [
        'Try to schedule a tiny manifest by hand. Which jobs are you allowed to run first, before anything else has finished? And what shape would the requirements have to take for you to get permanently stuck?',
        'A job with zero unmet requirements can run right now, and finishing it may unblock others. Keep running whatever is unblocked. If everything eventually runs, the plan is feasible; if you stall while jobs are still waiting, those jobs must be waiting on each other in a loop.',
        "Kahn's algorithm: build after[req] -> list of jobs it unlocks, plus an indegree count of unmet requirements per job (count duplicates consistently in both). Seed a queue with all indegree-0 jobs; pop, tally it as done, decrement each dependent's indegree, enqueue any that hit 0. Return done == n.",
      ],
      functionName: 'can_finish_all',
      starterCode: `def can_finish_all(n: int, deps: list[list[int]]) -> bool:
    pass
`,
      solution: {
        code: `from collections import deque


def can_finish_all(n: int, deps: list[list[int]]) -> bool:
    # after[r] lists the jobs that are waiting on requirement r.
    after = [[] for _ in range(n)]
    # indegree[j] counts how many (not-yet-finished) requirement
    # entries job j still has. Duplicates are counted on both sides,
    # so they cancel out exactly.
    indegree = [0] * n
    for job, req in deps:
        after[req].append(job)
        indegree[job] += 1
        # Note: a self-entry [j, j] gives j an indegree it can never
        # shed, so j is never scheduled — infeasible, as required.

    # Every job with no requirements can run immediately.
    queue = deque(j for j in range(n) if indegree[j] == 0)

    done = 0
    while queue:
        current = queue.popleft()
        done += 1  # this job runs to completion
        # Finishing this job satisfies one requirement entry of each
        # job that listed it.
        for unlocked in after[current]:
            indegree[unlocked] -= 1
            if indegree[unlocked] == 0:
                queue.append(unlocked)  # fully unblocked: schedule it

    # If some jobs were never scheduled, their remaining requirements
    # form (or depend on) a cycle. All n must finish for feasibility.
    return done == n
`,
        commentary: `
"Can every job complete?" is exactly "is the requirement graph acyclic?", and Kahn's algorithm answers it by *simulating the scheduler*. The simulation is greedy but loses nothing: running an unblocked job can never hurt, because it removes obligations and adds none. So if any valid order exists, the run-whatever-is-unblocked policy finds one.

The contrapositive is where the cycle detection lives. Suppose the loop stalls with \`done < n\`. Every unfinished job has at least one unfinished requirement (otherwise it would have been enqueued when its indegree hit zero). Follow those requirement arrows through the finite set of unfinished jobs and you must eventually revisit one — a cycle. Self-entries \`[j, j]\` are just the one-node case: \`j\` carries an indegree it can never shed.

Two robustness details: duplicates are harmless because each duplicate entry bumps \`indegree[job]\` once *and* appears once in \`after[req]\`, so the increments and decrements pair off exactly. And jobs in untouched components with no requirements seed the queue directly, so disconnected manifests work without special casing.

The DFS alternative — three-color marking, where finding an edge into a "gray" (in-progress) node proves a cycle — is equally valid, but on 100k-job manifests the iterative queue version dodges Python's recursion limit for free.
`,
        complexity: 'Time O(n + m), Space O(n + m) for the adjacency lists and indegree array',
      },
      testCases: [
        { input: [3, [[1, 0], [2, 1]]], expected: true, label: 'simple chain' },
        { input: [2, [[0, 1], [1, 0]]], expected: false, label: 'two-job deadlock' },
        { input: [4, []], expected: true, label: 'independent jobs' },
        { input: [1, []], expected: true, hidden: true, label: 'single job, no deps' },
        { input: [3, [[1, 1]]], expected: false, hidden: true, label: 'self requirement' },
        {
          input: [5, [[1, 0], [2, 0], [3, 1], [3, 2], [4, 3]]],
          expected: true,
          label: 'diamond DAG',
        },
        {
          input: [6, [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 2]]],
          expected: false,
          hidden: true,
          label: 'long cycle with a tail',
        },
        {
          input: [3, [[1, 0], [1, 0], [2, 1]]],
          expected: true,
          hidden: true,
          label: 'duplicate entries cancel out',
        },
        {
          input: [6, [[1, 0], [3, 2], [2, 3]]],
          expected: false,
          hidden: true,
          label: 'cycle hidden in one component',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 207. Course Schedule', note: 'the classic phrasing of this exact problem' },
        { name: 'LeetCode 210. Course Schedule II', note: 'also produce the order' },
        { name: 'LeetCode 802. Find Eventual Safe States', note: 'cycle detection from the other side' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt:
        'In an **unweighted** graph, why is the first time BFS reaches a node guaranteed to be along a shortest path from the source?',
      choices: [
        'Because BFS visits nodes in the order they were inserted into the adjacency list, which matches distance',
        'Because the FIFO queue processes nodes in nondecreasing distance order, so a node is always first discovered from a node exactly one layer closer to the source',
        'Because BFS enumerates every possible path to the node and keeps the minimum',
        'It is not guaranteed unless the adjacency lists are sorted first',
      ],
      correctIndex: 1,
      explanation:
        'The queue holds at most two consecutive distance values at any moment, so frontier expansion proceeds ring by ring; the first discovery of a node therefore comes from distance d and assigns it d+1, which no later path can beat. Choice 2 describes brute-force enumeration — BFS never revisits a node, which is exactly why it is fast. Insertion order and sorted adjacency (choices 0 and 3) affect tie-breaking among equal-length paths, never the length itself.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt:
        'You write a grid BFS but mark cells as visited when they are **popped** from the queue (skipping already-visited pops) instead of when they are **pushed**. What is the consequence?',
      choices: [
        'Some cells receive a longer distance than the true shortest path',
        'Nothing — the two placements behave identically in every respect',
        'Distances stay correct, but the same cell can be enqueued many times, bloating the queue and slowing the scan',
        'The BFS loops forever because the queue can never empty',
      ],
      correctIndex: 2,
      explanation:
        'The first copy of a cell to be popped is still the one enqueued earliest, i.e., at minimal distance, so answers remain correct — which is what makes this bug so sneaky. But several frontier cells often share an undiscovered neighbor, and pop-time marking lets each of them enqueue it, multiplying queue traffic (up to one entry per edge). It terminates eventually, so choice 3 is wrong; choice 0 is wrong because duplicates are skipped at pop time before they can assign anything.',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt:
        'A graph with `V` nodes and `E` edges is stored as an adjacency list. What is the time complexity of one full BFS or DFS traversal?',
      choices: ['O(V · E)', 'O(V + E)', 'O(E log V)', 'O(V^2)'],
      correctIndex: 1,
      explanation:
        'Each node enters the frontier at most once (guarded by the visited set), and each adjacency list is scanned exactly once when its node is processed, touching every edge a constant number of times — hence O(V + E). O(V^2) is what you get from an adjacency *matrix*, where finding the neighbors of one node already costs O(V). O(V·E) and O(E log V) describe Bellman-Ford and Dijkstra-with-a-heap respectively, not plain traversal.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'You run BFS over an `R x C` grid where each cell connects to its 4 orthogonal neighbors. What is the tight time bound?',
      choices: ['O(R · C)', 'O((R · C)^2)', 'O(R · C · log(R · C))', 'O(R + C)'],
      correctIndex: 0,
      explanation:
        'The grid is a graph with V = R·C nodes and at most 4 edges per node, so E = O(V) and the usual O(V + E) collapses to O(R·C). The log factor (choice 2) belongs to Dijkstra with a priority queue — unnecessary when all moves cost the same. O(R + C) only counts one row and one column, and the quadratic bound would mean re-scanning the whole grid per cell, which the visited set exists to prevent.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'A ride-sharing app must find the **cheapest** route between two intersections, where every road segment has its own toll. A teammate proposes BFS "because BFS finds shortest paths." What is the right call?',
      choices: [
        'Agree — BFS finds shortest paths in any graph, weighted or not',
        "Switch to Dijkstra's algorithm: BFS only minimizes the number of edges, and with varying tolls the fewest-hop route need not be the cheapest",
        'Use DFS and track the cheapest complete path found so far',
        'Use Union-Find to merge intersections in order of increasing toll',
      ],
      correctIndex: 1,
      explanation:
        "BFS's optimality proof depends on every edge costing the same — its rings count hops, not dollars. A 2-hop route through expensive toll roads can easily cost more than a 5-hop route on free streets, so the tempting choice 0 produces wrong fares. DFS-with-tracking explores exponentially many paths, and Union-Find answers connectivity questions, not cheapest-path ones. Dijkstra is BFS's weighted generalization: a priority queue keyed on accumulated cost restores the 'first arrival is optimal' guarantee.",
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'You ingest a log of one million account-merge events, each a pair `[a, b]` meaning two user accounts were found to belong to the same person. Afterward you must report how many distinct identities remain. Which approach fits best?',
      choices: [
        'BFS from account 0 and count the accounts it reaches',
        'Topologically sort the merge events and count the sources',
        'Union-Find: union each pair, starting a counter at n and decrementing on each merge of two distinct groups',
        'Sort the events by account id and sweep once',
      ],
      correctIndex: 2,
      explanation:
        'This is connected-component counting over a stream of undirected pairs — Union-Find processes each event in near-constant amortized time and the surviving group count is the answer. The tempting choice 0 fails because a single BFS only explores ONE component; accounts never mentioned in any event would be missed entirely, and you would need to sweep all n starts anyway. Topological sort applies to directed acyclic precedence, not symmetric merges, and sorting by id tells you nothing about transitive connectivity.',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt:
        'In an undirected graph, DFS proves a cycle the moment it sees an already-visited neighbor other than its parent. Why does that same test produce **false positives** in a directed graph?',
      choices: [
        'Because directed graphs cannot contain cycles in the first place',
        "Because a directed edge can point at a node whose DFS already finished — a cross or forward edge — without any cycle existing; you must distinguish 'in progress' (gray) from 'done' (black)",
        'Because directed graphs have twice as many edges, so the visited set overflows',
        'Because visited sets are only sound on trees, not on general graphs',
      ],
      correctIndex: 1,
      explanation:
        "In a directed graph, two long branches can both point at a shared node: the second branch finds it 'visited' even though no edge leads back, so no cycle exists. A cycle requires an edge back into a node still on the current recursion path — hence the three-color scheme (white/gray/black) or, equivalently, Kahn's processed-count check. Choice 0 is backwards, and choices 2 and 3 are non-sequiturs: visited sets work fine on any graph; they just answer 'seen before?', not 'still in progress?'.",
    },
    {
      id: 'q8',
      kind: 'scenario',
      prompt:
        'A robot moves up/down/left/right through a grid with obstacles, and you need the minimum number of moves to the exit. A teammate suggests dynamic programming: scan top-left to bottom-right filling `dist[r][c] = 1 + min(dist[r-1][c], dist[r][c-1])`. What is wrong, and what works?',
      choices: [
        'Nothing is wrong — that recurrence is the standard solution for grid paths',
        'The recurrence only considers arriving from above or the left, but an optimal route may need to detour and arrive from below or the right; 4-directional movement makes the dependencies cyclic, so use BFS instead',
        'The DP fails only due to memory limits; a recursive DFS fixes it',
        'Neither DP nor BFS works; the grid requires Dijkstra because grids are inherently weighted',
      ],
      correctIndex: 1,
      explanation:
        "Single-pass DP needs an acyclic dependency order, which only exists when movement is restricted (e.g., right/down only — the case the tempting choice 0 is remembering). With all four directions, a cell's true distance can depend on a neighbor that the scan has not reached yet, or one computed from a stale value — think of a U-shaped corridor that forces the robot to travel down and back up. BFS makes no ordering assumption beyond expanding rings and is exactly linear. DFS gives no shortest-path guarantee, and the moves here all cost 1, so Dijkstra is overkill.",
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Problem says "minimum number of steps/moves/hops" with equal-cost transitions — which traversal and why?',
      back: 'BFS. Its FIFO frontier expands in rings of equal distance, so the first arrival at any node is provably along a shortest path. DFS gives no such guarantee, and Dijkstra is only needed once edges have different weights.',
    },
    {
      id: 'f2',
      front: 'In BFS, when exactly do you mark a node visited?',
      back: 'When you ENQUEUE it, not when you pop it. Pop-time marking keeps answers correct but lets many frontier nodes enqueue the same neighbor, bloating the queue up to one entry per edge.',
    },
    {
      id: 'f3',
      front: 'Time and space complexity of BFS/DFS on an adjacency list? On an R×C grid?',
      back: 'O(V + E) time and O(V) space for the visited set plus frontier. A grid has E = O(V), so traversal is O(R·C) time and space.',
    },
    {
      id: 'f4',
      front: 'Template move for treating a grid as a graph?',
      back: 'Iterate a directions tuple ((1,0),(-1,0),(0,1),(0,-1)); for each neighbor check in-bounds FIRST, then passable, then unvisited, before enqueueing. No adjacency list is ever built — the grid is the graph.',
    },
    {
      id: 'f5',
      front: 'Counting connected components — the two standard recipes?',
      back: '(1) Loop over every node; each unvisited one starts a new component — count it, traverse to exhaustion. (2) Union-Find over the edge list: start the count at n, decrement each time a union merges two distinct roots.',
    },
    {
      id: 'f6',
      front: "How does Kahn's algorithm double as cycle detection?",
      back: 'Repeatedly process indegree-0 nodes, decrementing dependents. If processed count < n at the end, every leftover node still has an unmet requirement — the leftovers contain a cycle, so no valid topological order exists.',
    },
    {
      id: 'f7',
      front: 'Union-Find: which two optimizations, and what complexity do they buy?',
      back: 'Path compression (point nodes nearer the root during find) and union by rank/size. Together: O(α(n)) amortized per operation — effectively constant. Path compression alone is already near-constant in practice.',
    },
    {
      id: 'f8',
      front: 'Detecting a cycle in a DIRECTED graph with DFS — what extra state beyond "visited"?',
      back: 'Three colors: white = untouched, gray = on the current recursion path, black = fully finished. An edge into a GRAY node proves a cycle; an edge into a black node is a harmless cross/forward edge.',
    },
    {
      id: 'f9',
      front: 'Two graph-traversal bugs that pass small tests but fail at scale?',
      back: 'Traversing only from node 0 and missing disconnected components — always loop over all starts. And recursive DFS blowing Python’s ~1000-frame recursion limit on long paths — use an explicit stack or BFS.',
    },
    {
      id: 'f10',
      front: 'Phrases that signal a problem is secretly a graph problem?',
      back: '"Fewest steps", "can X reach Y", "groups/clusters/regions/segments", "prerequisites/dependencies/deadlock/valid order", and any grid you move through. Identify nodes and edges first; the algorithm usually picks itself.',
    },
  ],
  cheatSheet: {
    tldr:
      'Model the input as nodes plus relationships, then walk it with a visited set. BFS uses a FIFO queue to expand in rings, so the first arrival at any node is a shortest path in edge count — it owns every unweighted "minimum moves" question. DFS (explicit stack or recursion) exhausts reachability and, with in-progress/done states, detects directed cycles. Wrap either walk in a loop over all nodes to count connected components, or use Union-Find when edges arrive as a list; use Kahn’s indegree-queue when the question is about dependency order or deadlock. The visited set is what turns exponential path enumeration into a linear scan.',
    signals: [
      'Reach for BFS when you need the minimum number of steps/moves/hops and every transition costs the same.',
      'Reach for components (traversal sweep or Union-Find) when the ask is "how many groups/clusters/regions/segments".',
      'Reach for topological sort / Kahn’s when you see prerequisites, dependencies, build order, or "can all tasks finish".',
      'Treat any grid you move through as an implicit graph: neighbors come from coordinate deltas, not an adjacency list.',
      'Be suspicious when edges have different weights (Dijkstra territory) or movement is monotone right/down only (DP may be simpler).',
    ],
    template: `from collections import deque

# BFS: shortest path in an unweighted graph / grid
def bfs(start, goal, neighbors):
    seen = {start}
    queue = deque([(start, 0)])
    while queue:
        node, dist = queue.popleft()
        if node == goal:
            return dist
        for nxt in neighbors(node):
            if nxt not in seen:
                seen.add(nxt)            # mark at enqueue time
                queue.append((nxt, dist + 1))
    return -1                            # unreachable

# Connected components: sweep every possible start
def count_components(nodes, neighbors):
    seen, count = set(), 0
    for node in nodes:
        if node not in seen:
            count += 1                   # new component discovered
            seen.add(node)
            stack = [node]
            while stack:                 # exhaust it (DFS flavor)
                cur = stack.pop()
                for nxt in neighbors(cur):
                    if nxt not in seen:
                        seen.add(nxt)
                        stack.append(nxt)
    return count`,
    complexity: 'Time O(V + E) (grids: O(R·C)), Space O(V) for the visited set and frontier.',
  },
}

export default mod
