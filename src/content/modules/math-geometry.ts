import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'math-geometry',
  visualizer: 'dp-table',
  concept: `
## The mental model

Most patterns in this course are one move you drill until it becomes reflex. Math & geometry is different: it is the locksmith's bench of interviews — a drawer of small, precision tools, each of which collapses one specific kind of fiddly problem into a few clean lines. The skill is not inventing a tool under pressure; it is recognizing which jig fits the lock in front of you.

Three tools do most of the work:

**The odometer — modular arithmetic.** A three-digit odometer rolls from 999 to 000: those numbers live on a ring, not a line. Whenever a quantity wraps — clock hands, circular buffers, hash buckets, repeating cycles — arithmetic mod \`m\` is the native language. \`(i + 1) % m\` steps forward around the ring, and in Python \`(i - 1) % m\` steps backward without ever going negative.

**The rectangle cutter — GCD and Euclid.** Want the largest square tile that exactly tiles an \`a x b\` floor? Slice as many \`b x b\` squares off the long side as fit; you are left with an \`(a % b) x b\` strip, and any tile that covers the whole floor must also cover that strip. Applied repeatedly, this is Euclid's algorithm: \`gcd(a, b) == gcd(b, a % b)\`, shrinking until one side hits zero. Two thousand years old, still the sharpest tool in the drawer.

**The camera move — coordinate tricks.** When a grid problem says rotate, reflect, or spiral, the amateur move is shuffling data cell by cell while juggling temporaries. The pro move is to leave the data alone and move the camera: write the formula for where each coordinate lands, then implement the formula. A 90° clockwise rotation sends cell \`(r, c)\` to \`(c, n-1-r)\` — and that map factors into two mirrors you already know how to code: transpose (reflect across the main diagonal), then reverse each row (reflect across the vertical midline). Two reflections compose into one rotation.

## Mechanics

\`\`\`python
def gcd(a: int, b: int) -> int:
    while b:
        a, b = b, a % b      # slice the strip off the rectangle
    return a

def rotate_cw(grid: list[list[int]]) -> list[list[int]]:
    n = len(grid)
    # Destination formula implemented directly: the cell that lands
    # at (r, c) after a clockwise turn came from (n-1-c, r).
    return [[grid[n - 1 - c][r] for c in range(n)] for r in range(n)]
\`\`\`

Grid geometry follows the same philosophy. A spiral traversal is four walls — top, bottom, left, right — closing in: sweep along a wall, move it inward one step, repeat until the walls cross, guarding the last two sweeps so a leftover single row or column is not walked twice. Axis-aligned rectangle overlap splits one 2-D question into two 1-D questions: project both boxes onto each axis and ask whether the shadow intervals overlap; the boxes collide exactly when both projections do.

For primes, the Sieve of Eratosthenes inverts the question. Instead of asking "is k prime?" once per k (expensive every time), let each discovered prime cross off all of its multiples in one cheap forward sweep — starting at \`p*p\`, because every smaller multiple of \`p\` has a smaller prime factor and was already crossed off.

## When to reach for it

- Anything that **wraps or repeats** — circular buffers, rotate-by-k, clock math, "every m-th element", hashing — wants modular arithmetic.
- **Reducing fractions, synchronizing periods, splitting evenly** — gcd/lcm via Euclid, with \`lcm(a, b) = a // gcd(a, b) * b\`.
- Grid problems that say **rotate, reflect, transpose, spiral, diagonal** — derive the coordinate map first, write code second.
- **"How many primes…"** or repeated primality checks below a bound that fits in memory — sieve once, answer forever.
- **Collision, containment, intersection** of axis-aligned boxes — per-axis interval tests; no trig, no floats.
- A brute force whose inner loop re-derives a number fact (divisibility, periodicity) millions of times — there is usually a closed form or a one-time precomputation hiding there.

## Complexity

The tools are cheap, which is the point. Euclid's gcd runs in \`O(log min(a, b))\` — the remainder at least halves every step, with consecutive Fibonacci numbers as the worst case. The sieve performs \`n/2 + n/3 + n/5 + ...\` crossings, a harmonic-style sum over primes only, landing at \`O(n log log n)\` time and \`O(n)\` space — versus \`O(n * sqrt(n))\` for trial-dividing every number. Matrix rotation and spiral traversal touch each cell a constant number of times: \`O(n^2)\` for an n×n grid (\`O(m*n)\` rectangular), which is optimal because the output is that large; done in place they take \`O(1)\` extra space. The rectangle-overlap test is four comparisons: \`O(1)\`.

## Common pitfalls

- **Negative modulo portability.** Python's \`%\` follows the sign of the divisor (\`-1 % 8 == 7\`), but C, Java, and JavaScript follow the dividend (\`-1 % 8 == -1\`). Backward wrap-around code breaks the moment it is ported.
- **Which mirror, which order.** Transpose-then-reverse-each-row is clockwise; reverse-each-row-then-transpose is counterclockwise. And "reverse each row" (horizontal flip) is a different mirror from "reverse the row order" (vertical flip). Write the coordinate map down; never guess.
- **The pairwise-swap delusion.** The rotation map is a 4-cycle — each cell displaces three others — so "swap each cell with its destination" corrupts the grid. In-place rotation needs the two-reflection trick or an explicit four-way cycle.
- **Sieve off-by-ones.** "Below n" versus "up to n"; forgetting that 0 and 1 are not prime; starting the crossing at \`2p\` instead of \`p*p\` (correct but wasteful).
- **Spiral double-visits.** Without \`top <= bottom\` and \`left <= right\` guards before the last two sweeps, a single remaining row or column is traversed in both directions.
- **Float seduction.** Comparing floats for equality, or dividing where you could cross-multiply, invites precision bugs. Stay in integers — grid geometry almost never needs a float.
- **Edge-touch ambiguity.** Decide whether shared borders count as overlap, state the rule, and pick \`<\` versus \`<=\` accordingly. Most collision specs want positive area, hence strict inequalities.
`,
  realWorldUses: [
    {
      title: 'Zero-copy image rotation in graphics pipelines',
      description:
        'Image libraries and GPU texture units rotate pictures by rewriting the coordinate mapping rather than moving pixels: NumPy\'s rot90 returns a transposed, axis-flipped view in O(1), and phone cameras store sensor data unrotated, letting the renderer apply the EXIF orientation transform at display time.',
    },
    {
      title: 'Modular arithmetic in cryptography and sharding',
      description:
        'Every TLS handshake performs modular exponentiation over enormous primes (RSA, Diffie-Hellman), and key generation leans on fast primality machinery. At the systems layer, consistent-hashing rings place servers and keys on a mod-2^k circle, and hash tables pick prime bucket counts to spread clustered keys.',
    },
    {
      title: 'Broad-phase collision detection in game physics',
      description:
        'Physics engines like Box2D first test axis-aligned bounding boxes with the per-axis interval-overlap comparison — four integer compares — to discard the vast majority of object pairs before running expensive narrow-phase geometry on the few that might actually touch.',
    },
  ],
  problems: [
    {
      id: 'pad-clearance',
      title: 'Copper Pad Clearance Check',
      difficulty: 'easy',
      statement: `
A circuit-board layout checker verifies that copper pads never short against each other. Each pad is an axis-aligned rectangle described as a list \`[x1, y1, x2, y2]\` of integer micrometer coordinates, where \`(x1, y1)\` is the **bottom-left** corner and \`(x2, y2)\` is the **top-right** corner.

Two pads short only if they overlap with **positive area**. Pads that merely touch along an edge or at a single corner are safe — the fab process keeps zero-area contact electrically separate, so touching does **not** count as overlap.

Given two pads \`a\` and \`b\`, return \`True\` if they overlap with positive area and \`False\` otherwise.
`,
      examples: [
        {
          input: 'a = [0, 0, 4, 4], b = [2, 2, 6, 6]',
          output: 'True',
          explanation: 'The pads share the 2×2 square from (2, 2) to (4, 4) — positive area, so they short.',
        },
        {
          input: 'a = [0, 0, 2, 2], b = [2, 0, 4, 2]',
          output: 'False',
          explanation: 'The pads touch along the vertical line x = 2 but share no interior — zero-area contact is safe.',
        },
        {
          input: 'a = [0, 0, 2, 2], b = [3, 3, 5, 5]',
          output: 'False',
          explanation: 'The pads are fully separated; their shadows do not even overlap on either axis.',
        },
      ],
      constraints: [
        'a and b each have the form [x1, y1, x2, y2] with exactly 4 integers',
        '-10^9 <= x1 < x2 <= 10^9 and -10^9 <= y1 < y2 <= 10^9 for both pads',
        'Rectangles always have positive width and height',
        'Touching edges or corners must return False',
      ],
      hints: [
        'Reasoning about all eight corner points at once gets confusing fast. Instead, sketch one overlapping pair and one merely-touching pair on grid paper — what single fact about their positions distinguishes the two situations?',
        'Project both pads onto the x-axis: each becomes an interval. Do the same on the y-axis. The pads collide exactly when both pairs of intervals overlap — and keep the shared-edge rule in mind.',
        'Two intervals (lo1, hi1) and (lo2, hi2) share interior points exactly when lo1 < hi2 and lo2 < hi1 — strictly. Return the AND of that test on x and on y; the strict < is what makes touching edges safe.',
      ],
      functionName: 'pads_collide',
      starterCode: `def pads_collide(a: list[int], b: list[int]) -> bool:
    pass
`,
      solution: {
        code: `def pads_collide(a: list[int], b: list[int]) -> bool:
    # Unpack the corners: (x1, y1) bottom-left, (x2, y2) top-right.
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    # Project onto the x-axis: two 1-D intervals share interior points
    # exactly when each starts strictly before the other ends.
    x_overlap = ax1 < bx2 and bx1 < ax2
    # Same test on the y-axis projection.
    y_overlap = ay1 < by2 and by1 < ay2
    # Positive-area overlap requires interior overlap on BOTH axes.
    # Strict < is the whole edge-touch rule: if the pads only share a
    # border (say ax2 == bx1), the x test fails and we report safe.
    return x_overlap and y_overlap
`,
        commentary: `
The trick is **dimension reduction**. A 2-D rectangle is the product of two 1-D intervals — its x-span and its y-span — and two rectangles intersect with positive area exactly when their x-spans overlap *and* their y-spans overlap. So a planar question becomes two interval questions, each answered by one comparison pair.

For open intervals, "overlap" means each starts strictly before the other ends: \`lo1 < hi2 and lo2 < hi1\`. Using strict \`<\` is not an implementation detail here — it *is* the specification. When two pads abut (\`ax2 == bx1\`), the x-test is false and we correctly report clearance. Switching to \`<=\` would flip the rule to "touching counts."

Note what we did **not** do: check whether a corner of one pad lies inside the other. That popular shortcut fails on the plus-sign configuration — a wide, short pad crossing a tall, narrow one overlaps in the middle while all eight corners sit outside the other rectangle. The axis-projection test has no such blind spot, and it runs in constant time with pure integer math.
`,
        complexity: 'Time O(1), Space O(1)',
      },
      testCases: [
        { input: [[0, 0, 4, 4], [2, 2, 6, 6]], expected: true, label: 'classic partial overlap' },
        { input: [[0, 0, 2, 2], [2, 0, 4, 2]], expected: false, label: 'shared edge is safe' },
        { input: [[0, 0, 2, 2], [3, 3, 5, 5]], expected: false, label: 'fully disjoint' },
        { input: [[0, 0, 10, 10], [3, 4, 5, 6]], expected: true, label: 'one pad inside the other' },
        { input: [[0, 0, 2, 2], [2, 2, 4, 4]], expected: false, hidden: true, label: 'corner touch is safe' },
        { input: [[0, 3, 10, 5], [4, 0, 6, 9]], expected: true, hidden: true, label: 'plus-sign: no corner inside either pad' },
        { input: [[1, 1, 3, 3], [1, 1, 3, 3]], expected: true, hidden: true, label: 'identical pads' },
        { input: [[-5, -5, -1, -1], [-2, -2, 3, 3]], expected: true, hidden: true, label: 'negative coordinates' },
        { input: [[0, 0, 2, 2], [1, 5, 3, 7]], expected: false, hidden: true, label: 'x-shadows overlap but y-shadows do not' },
      ],
      furtherPractice: [
        { name: 'LeetCode 836. Rectangle Overlap', note: 'the same test, same edge-touch convention' },
        { name: 'LeetCode 223. Rectangle Area', note: 'next step: compute the union area via the overlap width and height' },
      ],
    },
    {
      id: 'sprite-rotation',
      title: 'Sprite Foundry Rotation',
      difficulty: 'medium',
      statement: `
A retro game studio bakes every decoration in its levels as a square sprite: an \`n x n\` grid of integer palette indices. Level designers place the same crate, arrow, or vine in four orientations, so the asset pipeline must produce the **90° clockwise** rotation of any sprite on demand.

Given the square grid \`grid\`, return a new \`n x n\` grid holding the sprite rotated 90° clockwise. Concretely, the cell at row \`r\`, column \`c\` of the input must end up at row \`c\`, column \`n - 1 - r\` of the output — the old top row becomes the new rightmost column, reading top to bottom.

The grading checks only the returned grid; whether you build a fresh grid or transform a copy in place is up to you. Sprites can be large, so aim to touch each cell a constant number of times.
`,
      examples: [
        {
          input: 'grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]',
          output: '[[7, 4, 1], [8, 5, 2], [9, 6, 3]]',
          explanation: 'The old top row 1,2,3 becomes the rightmost column read downward; the old left column 1,4,7 becomes the top row reversed.',
        },
        {
          input: 'grid = [[1, 2], [3, 4]]',
          output: '[[3, 1], [4, 2]]',
          explanation: 'Each cell takes one quarter-turn around the center: 1 → top-right, 2 → bottom-right, 4 → bottom-left, 3 → top-left.',
        },
        {
          input: 'grid = [[9]]',
          output: '[[9]]',
          explanation: 'A 1×1 sprite is unchanged by any rotation.',
        },
      ],
      constraints: [
        '1 <= n <= 500 where n = len(grid)',
        'grid is square: every row has exactly n entries',
        '-10^9 <= grid[r][c] <= 10^9',
        'Return the rotated grid; cell (r, c) must land at (c, n-1-r)',
      ],
      hints: [
        'Take a tiny 3×3 sprite and write down, for each cell, where it ends up after the turn. Is there a single formula relating (row, col) before and after?',
        'The destination of cell (r, c) is (c, n-1-r). You can build the output directly from that map — or notice the map factors into two mirror operations you already know how to code.',
        'Transpose (swap (r, c) with (c, r), touching only the triangle above the diagonal so pairs swap once), then reverse every row left-to-right. Or construct out[r][c] = grid[n-1-c][r] in one comprehension.',
      ],
      functionName: 'rotate_sprite',
      starterCode: `def rotate_sprite(grid: list[list[int]]) -> list[list[int]]:
    pass
`,
      solution: {
        code: `def rotate_sprite(grid: list[list[int]]) -> list[list[int]]:
    n = len(grid)
    # Work on a deep copy so the caller's sprite stays untouched.
    out = [row[:] for row in grid]
    # Step 1: transpose — reflect across the main diagonal.
    # Swap (r, c) with (c, r) for the triangle ABOVE the diagonal only;
    # iterating the whole square would swap every pair twice and undo it.
    for r in range(n):
        for c in range(r + 1, n):
            out[r][c], out[c][r] = out[c][r], out[r][c]
    # Step 2: reverse each row — reflect across the vertical midline.
    # Composing the two mirrors sends (r, c) -> (c, r) -> (c, n-1-r),
    # which is exactly the 90-degree clockwise destination map.
    for row in out:
        row.reverse()
    return out
`,
        commentary: `
Start from the destination formula: clockwise rotation sends \`(r, c)\` to \`(c, n-1-r)\`. You could fill a fresh matrix straight from it — \`out[r][c] = grid[n-1-c][r]\` — and that is a perfectly good \`O(n^2)\`-space answer. The classic interview flourish is doing it with no second buffer, and the key insight is that the rotation map **factors into two reflections**: transpose takes \`(r, c)\` to \`(c, r)\`, then reversing each row takes \`(c, r)\` to \`(c, n-1-r)\`. Two mirrors compose into one quarter-turn, and each mirror is trivially in-place.

Two details earn the follow-up points. First, the transpose loop must cover only the triangle above the diagonal (\`c > r\`); sweeping all cells would swap each pair twice and silently restore the original. Second, order matters: reversing rows *before* transposing composes the mirrors the other way and yields the **counterclockwise** rotation — a classic way to pass the 1×1 test and fail everything else.

Why not just swap each cell with its destination? Because the map is a 4-cycle: \`(r, c) → (c, n-1-r) → (n-1-r, n-1-c) → (n-1-c, r) → back\`. A pairwise swap breaks the cycle and corrupts the grid; you would need an explicit four-way rotation per orbit, which is exactly what the two reflections accomplish with less bookkeeping.
`,
        complexity: 'Time O(n^2), Space O(n^2) for the returned copy (O(1) extra beyond it)',
      },
      testCases: [
        { input: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [[7, 4, 1], [8, 5, 2], [9, 6, 3]], label: '3x3 basic' },
        { input: [[[1, 2], [3, 4]]], expected: [[3, 1], [4, 2]], label: '2x2 quarter-turn' },
        { input: [[[9]]], expected: [[9]], label: '1x1 fixed point' },
        { input: [[[5, 5, 5], [5, 5, 5], [5, 5, 5]]], expected: [[5, 5, 5], [5, 5, 5], [5, 5, 5]], hidden: true, label: 'all-equal sprite' },
        {
          input: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]],
          expected: [[13, 9, 5, 1], [14, 10, 6, 2], [15, 11, 7, 3], [16, 12, 8, 4]],
          hidden: true,
          label: '4x4 even side',
        },
        { input: [[[-1, 0], [7, -3]]], expected: [[7, -1], [-3, 0]], hidden: true, label: 'negative palette indices' },
        {
          input: [
            [
              [0, 1, 2, 3, 4],
              [5, 6, 7, 8, 9],
              [10, 11, 12, 13, 14],
              [15, 16, 17, 18, 19],
              [20, 21, 22, 23, 24],
            ],
          ],
          expected: [
            [20, 15, 10, 5, 0],
            [21, 16, 11, 6, 1],
            [22, 17, 12, 7, 2],
            [23, 18, 13, 8, 3],
            [24, 19, 14, 9, 4],
          ],
          hidden: true,
          label: '5x5 odd side, center fixed',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 48. Rotate Image', note: 'the in-place version of this exact transform' },
        { name: 'LeetCode 867. Transpose Matrix', note: 'isolate the first of the two mirrors' },
      ],
    },
    {
      id: 'prime-bucket-census',
      title: 'Prime Bucket Census',
      difficulty: 'medium',
      statement: `
Your team maintains a hash-map library that only ever resizes its bucket array to a **prime** length — prime sizes scatter clustered keys far better than composite ones. The capacity planner needs to know, for a given memory budget, how many prime sizes are even available.

Given an integer \`n\`, return the count of prime numbers **strictly less than** \`n\`. (A prime is an integer greater than 1 whose only positive divisors are 1 and itself.)

The budget can be as large as 1,000,000 and this check runs in CI on every commit, so testing each number independently by trial division is too slow — you need an approach where work is shared across all the candidates at once.
`,
      examples: [
        {
          input: 'n = 10',
          output: '4',
          explanation: 'The primes below 10 are 2, 3, 5, and 7.',
        },
        {
          input: 'n = 2',
          output: '0',
          explanation: 'There are no primes strictly less than 2 — and 0 and 1 are not prime.',
        },
        {
          input: 'n = 20',
          output: '8',
          explanation: 'Below 20: 2, 3, 5, 7, 11, 13, 17, 19.',
        },
      ],
      constraints: [
        '0 <= n <= 1_000_000',
        'Count primes p with p < n (strictly below the budget)',
        '0 and 1 are not prime; 2 is the smallest prime',
        'Target roughly O(n log log n) total work',
      ],
      hints: [
        'Checking each number for primality on its own repeats an enormous amount of work across candidates. Could the primes you have already confirmed somehow do the work for you?',
        'Allocate a boolean array of size n, optimistically mark everything from 2 upward as prime, then walk upward: each time you reach a number still marked prime, eliminate something. What exactly, and from where?',
        'For each prime p while p*p < n, mark p*p, p*p + p, p*p + 2p, … as composite. Starting at p*p is safe because any smaller multiple of p has a smaller prime factor and is already marked. The answer is the count of survivors.',
      ],
      functionName: 'count_prime_sizes',
      starterCode: `def count_prime_sizes(n: int) -> int:
    pass
`,
      solution: {
        code: `def count_prime_sizes(n: int) -> int:
    # No integers below 3 are... wait, 2 is prime — but 2 < n requires
    # n >= 3. For n in {0, 1, 2} there are no primes strictly below n.
    if n < 3:
        return 0
    # is_prime[k] answers "is k prime?" for every k in [0, n).
    # Start optimistic and knock numbers out as we find their factors.
    is_prime = [True] * n
    is_prime[0] = is_prime[1] = False  # by definition, not prime
    p = 2
    while p * p < n:
        if is_prime[p]:
            # p survived every smaller prime's sweep, so p is prime.
            # Cross off its multiples starting at p*p: any smaller
            # multiple m = q*p with q < p has a prime factor < p and
            # was already crossed off during that factor's sweep.
            # Slice assignment marks the whole stride in one C-speed op.
            is_prime[p * p :: p] = [False] * len(range(p * p, n, p))
        p += 1
    # Every surviving True flag is a prime strictly below n.
    return sum(is_prime)
`,
        commentary: `
Trial division asks "is k prime?" independently for each k, paying up to \`O(sqrt(k))\` per number — about \`O(n * sqrt(n))\` total, which at a million candidates is real CI money. The sieve flips the direction of the question: instead of each number searching downward for a factor, each confirmed **prime sweeps upward** crossing off its multiples. Every composite gets eliminated by its prime factors, and whatever survives is prime by definition.

Two classic optimizations carry the proof inside them. The outer loop stops once \`p * p >= n\`: any composite below \`n\` has a factor pair, and the smaller member of every pair is below \`sqrt(n)\`, so all composites are dead by then. And each sweep starts at \`p * p\` rather than \`2p\`: a smaller multiple like \`3p\` (when \`p > 3\`) has the smaller prime factor 3 and was crossed off during 3's sweep already.

Total work is \`n/2 + n/3 + n/5 + n/7 + ...\` — the harmonic sum over **primes only**, which grows like \`log log n\`. That is so close to linear that the slice-assignment trick (one bulk write per stride instead of a Python-level loop) matters more in practice than further asymptotic cleverness. Watch the boundary in the problem statement: *strictly below* \`n\` means an array of size exactly \`n\` indexes everything we need.
`,
        complexity: 'Time O(n log log n), Space O(n)',
      },
      testCases: [
        { input: [10], expected: 4, label: 'primes 2, 3, 5, 7' },
        { input: [20], expected: 8, label: 'two-digit budget' },
        { input: [2], expected: 0, label: 'no primes strictly below 2' },
        { input: [0], expected: 0, hidden: true, label: 'zero budget' },
        { input: [3], expected: 1, hidden: true, label: 'only the prime 2 qualifies' },
        { input: [100], expected: 25, hidden: true, label: 'classic checkpoint' },
        { input: [1000], expected: 168, hidden: true, label: 'thousand budget' },
        { input: [1000000], expected: 78498, hidden: true, label: 'full-size budget, must be fast' },
      ],
      furtherPractice: [
        { name: 'LeetCode 204. Count Primes', note: 'the same sieve, same strict bound' },
        { name: 'Project Euler Problem 10', note: 'sum the primes instead of counting them' },
      ],
    },
    {
      id: 'spiral-patrol',
      title: 'Night Guard Spiral Patrol',
      difficulty: 'hard',
      statement: `
The night guard at the city museum sweeps a rectangular wing of exhibit rooms laid out as an \`m x n\` grid \`rooms\`, where \`rooms[r][c]\` is that room's sensor ID. Patrol protocol is strict:

1. Start in the **top-left** room.
2. Walk the outer ring **clockwise**: right along the top row, down the rightmost column, left along the bottom row, up the leftmost column.
3. Step inward to the next untouched ring and repeat, until **every room has been visited exactly once**.

Return the sensor IDs as a single flat list, in exact visit order. The wing may be any rectangle — wide, tall, a single row or column — and an empty wing (no rooms) yields an empty route. Be careful: when only one row or one column remains in the middle, a sloppy route reports those rooms twice, and the audit system flags duplicate visits.
`,
      examples: [
        {
          input: 'rooms = [[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]',
          output: '[1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7]',
          explanation: 'Outer ring clockwise (1,2,3,4,8,12,11,10,9,5), then the inner remnant is the single row 6, 7 — visited left to right, once.',
        },
        {
          input: 'rooms = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]',
          output: '[1, 2, 3, 6, 9, 8, 7, 4, 5]',
          explanation: 'The ring covers eight rooms; the center room 5 is its own final one-room ring.',
        },
        {
          input: 'rooms = [[1], [2], [3]]',
          output: '[1, 2, 3]',
          explanation: 'A single-column wing is one downward sweep — the return trip upward would re-visit rooms and must not happen.',
        },
      ],
      constraints: [
        '0 <= m, n <= 200 where m = len(rooms)',
        'When m > 0, every row has the same length n >= 1',
        '-10^9 <= rooms[r][c] <= 10^9',
        'Each room appears exactly once in the output, in clockwise spiral order from the top-left',
      ],
      hints: [
        'Trace the route with your finger on the 3×4 example and say out loud when you change direction. What condition tells the guard "this wall of the ring is finished"?',
        'Keep four boundary markers — top, bottom, left, right. Sweep the top row, then the right column, then the bottom row, then the left column; after each sweep, pull that wall inward one step. Stop when the walls cross.',
        'The top and right sweeps are always safe, but guard the bottom sweep with "top <= bottom" and the left sweep with "left <= right". Those two checks are exactly what stops a lone middle row or column from being walked twice in opposite directions.',
      ],
      functionName: 'patrol_order',
      starterCode: `def patrol_order(rooms: list[list[int]]) -> list[int]:
    pass
`,
      solution: {
        code: `def patrol_order(rooms: list[list[int]]) -> list[int]:
    # An empty wing (or a wing with zero-width rows) has no route.
    if not rooms or not rooms[0]:
        return []
    # Four walls bounding the ring that is still unvisited.
    top, bottom = 0, len(rooms) - 1
    left, right = 0, len(rooms[0]) - 1
    route: list[int] = []
    while top <= bottom and left <= right:
        # 1) Sweep the top wall, left -> right, then retire it.
        for c in range(left, right + 1):
            route.append(rooms[top][c])
        top += 1
        # 2) Sweep the right wall, top -> bottom (top already moved,
        #    so the corner room is not repeated), then retire it.
        for r in range(top, bottom + 1):
            route.append(rooms[r][right])
        right -= 1
        # 3) Sweep the bottom wall right -> left — but ONLY if a row
        #    remains. If top > bottom, the ring was a single row and
        #    step 1 already consumed it; sweeping back would duplicate.
        if top <= bottom:
            for c in range(right, left - 1, -1):
                route.append(rooms[bottom][c])
            bottom -= 1
        # 4) Sweep the left wall bottom -> top — only if a column
        #    remains, for the symmetric single-column reason.
        if left <= right:
            for r in range(bottom, top - 1, -1):
                route.append(rooms[r][left])
            left += 1
    return route
`,
        commentary: `
The clean mental model is **four walls closing in**. The invariant after every sweep: the rectangle strictly inside \`top/bottom/left/right\` is exactly the set of unvisited rooms. Each of the four sweeps walks one wall of the current ring and then retires that wall by moving it inward, so the ring shrinks by one layer per loop iteration and the loop ends when the walls cross.

All of the difficulty hides in the **degenerate final ring**. When the unvisited region collapses to a single row, sweep 1 consumes it entirely — and sweep 3, pointed the opposite direction along the same row, would emit every room a second time. The \`top <= bottom\` guard (re-checked *after* sweep 1 moved the wall) is what prevents that; \`left <= right\` does the same for a lone column before sweep 4. These two checks are the difference between code that passes square inputs and code that survives 1×n, m×1, and skinny-rectangle cases.

A tempting alternative is direction simulation: walk forward, and turn right whenever the next cell is out of bounds or already visited. It produces the same order but costs an \`O(m*n)\` visited matrix and a four-way direction table. The wall method keeps \`O(1)\` bookkeeping beyond the output and makes the no-duplicates argument a one-line invariant instead of a property of a state machine. Either way, every room is appended exactly once: \`O(m*n)\` time, which is optimal since the output has that many entries.
`,
        complexity: 'Time O(m·n), Space O(1) extra beyond the output list',
      },
      testCases: [
        {
          input: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]],
          expected: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7],
          label: 'wide 3x4 wing',
        },
        { input: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [1, 2, 3, 6, 9, 8, 7, 4, 5], label: '3x3 with center room' },
        { input: [[[7, 8, 9]]], expected: [7, 8, 9], label: 'single row, no return trip' },
        { input: [[]], expected: [], label: 'empty wing' },
        { input: [[[1], [2], [3]]], expected: [1, 2, 3], hidden: true, label: 'single column, no climb back up' },
        {
          input: [[[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]]],
          expected: [1, 2, 3, 6, 9, 12, 11, 10, 7, 4, 5, 8],
          hidden: true,
          label: 'tall 4x3 wing, inner ring is a lone column',
        },
        { input: [[[42]]], expected: [42], hidden: true, label: 'one-room wing' },
        { input: [[[5, 5], [5, 5]]], expected: [5, 5, 5, 5], hidden: true, label: 'all-equal sensor IDs' },
      ],
      furtherPractice: [
        { name: 'LeetCode 54. Spiral Matrix', note: 'the canonical version of this traversal' },
        { name: 'LeetCode 59. Spiral Matrix II', note: 'invert it: write 1..n^2 into spiral positions' },
      ],
    },
    {
      id: 'loom-warp-transpose',
      title: 'Loom Warp-and-Weft Swap',
      difficulty: 'easy',
      statement: `
A jacquard weaving loom stores a pattern as a grid of integer thread colors: \`grid[r][c]\` is the color the loom lays down at warp row \`r\`, weft column \`c\`. To weave the same design rotated onto its side, the controller needs the **transpose** of the pattern — the fabric viewed with rows and columns swapped.

Given a rectangular grid with \`m\` rows and \`n\` columns, return a new grid with \`n\` rows and \`m\` columns where the entry at row \`i\`, column \`j\` of the output equals \`grid[j][i]\`. In other words, what was a row becomes a column and vice versa. The grid need **not** be square.

Return the transposed grid as a list of lists. An empty pattern (no rows) transposes to an empty list.
`,
      examples: [
        {
          input: 'grid = [[1, 2, 3], [4, 5, 6]]',
          output: '[[1, 4], [2, 5], [3, 6]]',
          explanation: 'The 2×3 pattern becomes 3×2. The old first row 1,2,3 becomes the first column read downward.',
        },
        {
          input: 'grid = [[1, 2], [3, 4], [5, 6]]',
          output: '[[1, 3, 5], [2, 4, 6]]',
          explanation: 'The 3×2 pattern becomes 2×3: each old column 1,3,5 and 2,4,6 becomes a row.',
        },
        {
          input: 'grid = [[7]]',
          output: '[[7]]',
          explanation: 'A single thread is unchanged.',
        },
      ],
      constraints: [
        '0 <= m <= 200 rows and 1 <= n <= 200 columns when m > 0',
        'Every row has the same length n (the grid is rectangular)',
        '-10^9 <= grid[r][c] <= 10^9',
        'Output[i][j] must equal grid[j][i]; an empty input returns []',
      ],
      hints: [
        'Hold up the 2×3 example and read it once across the rows, then once down the columns. What does the second reading look like as a fresh grid?',
        'The output has as many rows as the input has columns. Output row i is built by collecting grid[r][i] for every input row r.',
        'Either build out[i][j] = grid[j][i] with a nested comprehension over the new dimensions, or initialize an n×m grid of zeros and assign out[c][r] = grid[r][c] while scanning the input. Mind the empty-grid case so len(grid[0]) never throws.',
      ],
      functionName: 'transpose_loom',
      starterCode: `def transpose_loom(grid: list[list[int]]) -> list[list[int]]:
    pass
`,
      solution: {
        code: `def transpose_loom(grid: list[list[int]]) -> list[list[int]]:
    # No rows means no pattern at all; the transpose is empty too.
    if not grid:
        return []
    m = len(grid)        # number of input rows
    n = len(grid[0])     # number of input columns
    # The output is n rows by m columns. Output entry (i, j) is the
    # input entry (j, i): reading down input column i across all rows
    # j becomes reading across output row i. One direct comprehension
    # implements that index swap with no temporaries.
    return [[grid[j][i] for j in range(m)] for i in range(n)]
`,
        commentary: `
Transpose is the simplest of the grid mirrors: reflect every cell across the main diagonal, sending \`(r, c)\` to \`(c, r)\`. For a **rectangular** grid the catch is that the *shape* changes too — an \`m x n\` input becomes an \`n x m\` output — so you cannot swap entries in place the way a square matrix allows; you build a fresh grid sized to the new dimensions.

The clean construction reads the destination formula straight off: output row \`i\` is input column \`i\`, gathered by walking every input row \`j\` and taking \`grid[j][i]\`. The outer comprehension runs \`i\` over the \`n\` output rows; the inner runs \`j\` over the \`m\` output columns. No accumulator, no mutation, no diagonal-triangle bookkeeping — that triangle trick is only needed when you insist on transposing a *square* grid in place.

The one trap is the empty grid: \`len(grid[0])\` raises \`IndexError\` when there are zero rows, so guard \`not grid\` up front and return \`[]\`. With that handled the routine is \`O(m·n)\` time — optimal, since the output has \`m·n\` cells — and \`O(m·n)\` space for the returned grid.
`,
        complexity: 'Time O(m·n), Space O(m·n) for the returned grid',
      },
      testCases: [
        { input: [[[1, 2, 3], [4, 5, 6]]], expected: [[1, 4], [2, 5], [3, 6]], label: '2x3 to 3x2' },
        { input: [[[1, 2], [3, 4], [5, 6]]], expected: [[1, 3, 5], [2, 4, 6]], label: '3x2 to 2x3' },
        { input: [[[7]]], expected: [[7]], label: '1x1 fixed' },
        { input: [[]], expected: [], hidden: true, label: 'empty pattern' },
        {
          input: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]],
          expected: [[1, 4, 7], [2, 5, 8], [3, 6, 9]],
          hidden: true,
          label: 'square 3x3',
        },
        { input: [[[5], [6], [7], [8]]], expected: [[5, 6, 7, 8]], hidden: true, label: 'single column to single row' },
        { input: [[[-1, 0, 4]]], expected: [[-1], [0], [4]], hidden: true, label: 'single row with negatives' },
      ],
      furtherPractice: [
        { name: 'LeetCode 867. Transpose Matrix', note: 'the same rows-to-columns swap on a rectangular grid' },
      ],
    },
    {
      id: 'happy-beacon',
      title: 'Beacon Self-Calibration',
      difficulty: 'medium',
      statement: `
A deep-space beacon recalibrates by repeatedly compressing its current integer power level: it replaces the level with the **sum of the squares of its decimal digits**, and repeats. If the level ever reaches exactly \`1\`, the beacon has **stabilized** and locks on. If instead the level falls into a repeating loop that never includes \`1\`, the beacon oscillates forever and never stabilizes.

Given a positive integer starting power level \`n\`, return \`True\` if the process eventually reaches \`1\`, and \`False\` if it gets trapped in a cycle that excludes \`1\`.

For example, starting at \`19\`: \`1^2 + 9^2 = 82\`, then \`8^2 + 2^2 = 68\`, then \`6^2 + 8^2 = 100\`, then \`1^2 + 0^2 + 0^2 = 1\` — stabilized, so return \`True\`.
`,
      examples: [
        {
          input: 'n = 19',
          output: 'True',
          explanation: '19 → 82 → 68 → 100 → 1. The chain reaches 1, so the beacon stabilizes.',
        },
        {
          input: 'n = 2',
          output: 'False',
          explanation: '2 → 4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 — it returns to 4 and loops forever without hitting 1.',
        },
        {
          input: 'n = 1',
          output: 'True',
          explanation: 'Already at 1; stabilized immediately.',
        },
      ],
      constraints: [
        '1 <= n <= 2^31 - 1',
        'Each step replaces the level with the sum of the squares of its base-10 digits',
        'Return True iff the sequence ever equals 1',
        'The transformation is deterministic, so every start either reaches 1 or enters one fixed loop',
      ],
      hints: [
        'Run the rule by hand from 7 and from 4. One marches down to 1; the other comes back to a number it already produced. What general fact about a deterministic step on bounded values does that second behavior reveal?',
        'After a few steps the value can never grow without bound — the digit-square sum of any number below, say, 1000 is itself small. So the sequence is eventually trapped in a finite set, which means it either hits 1 or revisits a value. How do you detect a revisit?',
        'Track seen values in a set and stop when you hit 1 (return True) or re-encounter a value (return False). Or use Floyd cycle detection with a slow and fast pointer over the transform — O(1) space — and check whether the meeting point is 1.',
      ],
      functionName: 'beacon_stabilizes',
      starterCode: `def beacon_stabilizes(n: int) -> bool:
    pass
`,
      solution: {
        code: `def beacon_stabilizes(n: int) -> bool:
    def step(x: int) -> int:
        # Replace x with the sum of the squares of its decimal digits.
        total = 0
        while x > 0:
            x, d = divmod(x, 10)   # peel off the lowest digit
            total += d * d
        return total

    # Floyd's tortoise and hare over the deterministic transform.
    # The sequence lives in a finite set, so the slow and fast walkers
    # must eventually collide; if the loop they share is the fixed
    # point 1, the beacon stabilizes.
    slow = n
    fast = step(n)
    while fast != 1 and slow != fast:
        slow = step(slow)            # one step
        fast = step(step(fast))      # two steps
    # We exited because fast hit 1 (stabilized) or the pointers met
    # inside a non-1 cycle. Either way the answer is "did we land on 1".
    return fast == 1
`,
        commentary: `
The key realization is that the digit-square step is a **deterministic function on a bounded domain**. Once the value drops below a few hundred (and it does almost immediately — the digit-square sum of any 10-digit number is at most \`10 · 81 = 810\`), the sequence is confined to a small finite set. A deterministic walk through a finite set must eventually repeat, so every start either reaches the fixed point \`1\` or enters some other cycle. The whole problem is therefore **cycle detection**, exactly like detecting a loop in a linked list where "next" is "apply the transform."

Two standard tools work. A \`seen\` set is the obvious one: iterate the transform, return \`True\` on hitting \`1\` and \`False\` the moment you revisit a value — \`O(1)\` space is sacrificed for clarity. Floyd's tortoise-and-hare, shown here, keeps the space \`O(1)\`: advance one pointer by one step and the other by two; they are guaranteed to collide inside whatever cycle the sequence falls into. Then a single test — is the collision value \`1\`? — answers the question, because \`1\` maps to \`1\` and forms its own one-element cycle.

The subtle correctness point is the loop guard. We stop when \`fast == 1\` (stabilized) **or** \`slow == fast\` (met inside a non-1 loop). Starting \`fast\` one step ahead of \`slow\` avoids a spurious immediate match. The transform itself is the only arithmetic: peel digits with \`divmod(x, 10)\`, square, accumulate.
`,
        complexity: 'Time O(k) steps until stabilization or collision (k tiny in practice), Space O(1)',
      },
      testCases: [
        { input: [19], expected: true, label: 'classic stabilizer' },
        { input: [2], expected: false, label: 'enters the 4-loop' },
        { input: [1], expected: true, label: 'already locked on' },
        { input: [7], expected: true, hidden: true, label: 'single digit that climbs then settles' },
        { input: [4], expected: false, hidden: true, label: 'sits squarely in the oscillating cycle' },
        { input: [100], expected: true, hidden: true, label: 'trailing zeros ignored' },
        { input: [1111111], expected: true, hidden: true, label: 'seven ones sum to 7, which stabilizes' },
        { input: [2147483647], expected: false, hidden: true, label: 'max 32-bit start oscillates' },
      ],
      furtherPractice: [
        { name: 'LeetCode 202. Happy Number', note: 'the same digit-square cycle test' },
        { name: 'LeetCode 142. Linked List Cycle II', note: 'Floyd detection in its native linked-list setting' },
      ],
    },
    {
      id: 'vault-aisle-label',
      title: 'Vault Aisle Labeling',
      difficulty: 'medium',
      statement: `
A vast automated archive numbers its storage aisles \`1, 2, 3, …\` but prints them on signage using letters, exactly like spreadsheet column headers: aisle 1 is \`A\`, aisle 26 is \`Z\`, aisle 27 is \`AA\`, aisle 28 is \`AB\`, aisle 52 is \`AZ\`, aisle 53 is \`BA\`, and so on. This is **bijective base-26**: there is no zero digit — the "digits" are \`A\` through \`Z\` standing for \`1\` through \`26\`.

Given a positive integer aisle number \`n\`, return its uppercase letter label as a string.

This is the **number → label** direction only. (Note this is not plain base-26: there is no digit for zero, which is why each step subtracts one before taking the remainder.)
`,
      examples: [
        {
          input: 'n = 1',
          output: '"A"',
          explanation: 'The first aisle is A.',
        },
        {
          input: 'n = 28',
          output: '"AB"',
          explanation: '28 = 26 + 2 → the high "digit" is A (1) and the low is B (2).',
        },
        {
          input: 'n = 701',
          output: '"ZY"',
          explanation: '701 = 26·26 + 25 maps to Z (26) then Y (25).',
        },
        {
          input: 'n = 703',
          output: '"AAA"',
          explanation: 'After ZZ (702) the labels roll over to three letters: AAA.',
        },
      ],
      constraints: [
        '1 <= n <= 2_000_000_000',
        'Output uses only uppercase letters A–Z',
        'Bijective base-26: A=1 … Z=26, with no zero digit',
        'Return the label as a string',
      ],
      hints: [
        'Write out the labels 1 through 28 by hand. The rollover from Z (26) to AA (27) does not behave like ordinary base-26, where 26 would be "10". What is different about the lowest place when there is no zero?',
        'You build the label from the least-significant letter upward, peeling one letter per step. Because the alphabet is 1-based (A=1, not 0), you must shift n down by one before taking the remainder mod 26.',
        'Loop while n > 0: set n, r = divmod(n - 1, 26); prepend chr(ord("A") + r); continue with the new n. The minus-one is what turns a multiple of 26 into the letter Z instead of a stray zero.',
      ],
      functionName: 'aisle_label',
      starterCode: `def aisle_label(n: int) -> str:
    pass
`,
      solution: {
        code: `def aisle_label(n: int) -> str:
    letters = []
    # Peel off one letter per iteration, least-significant first.
    while n > 0:
        # The alphabet is 1-based: A=1 ... Z=26, with NO zero digit.
        # Subtracting 1 before divmod re-bases each place to 0..25 so
        # that a clean multiple of 26 yields remainder 25 -> 'Z' and
        # carries the quotient down correctly, instead of emitting a
        # spurious zero the way plain base-26 would.
        n, r = divmod(n - 1, 26)
        letters.append(chr(ord('A') + r))   # 0->'A', 25->'Z'
    # We generated letters from low place to high, so reverse them.
    return ''.join(reversed(letters))
`,
        commentary: `
Spreadsheet columns look like base-26 but are not: ordinary base-26 has digits \`0..25\`, and \`26\` would be written \`"10"\`. Here the digits are \`A..Z\` = \`1..26\` with **no zero** — a *bijective* numeral system. That single missing zero is the whole problem, and it shows up as a \`- 1\` in exactly the right place.

Each iteration extracts the lowest letter. If you naively took \`divmod(n, 26)\`, then \`n = 26\` would give remainder \`0\` (no letter for it) and quotient \`1\`, producing \`"A?"\` — wrong; \`26\` should be \`"Z"\`. Subtracting one first, \`divmod(n - 1, 26)\`, maps \`26\` to remainder \`25\` (\`'Z'\`) and quotient \`0\` (loop ends): correct. The decrement effectively borrows the missing zero from the next place up, which is precisely how bijective bases carry.

Letters come out least-significant first, so reverse before joining. The loop runs once per output letter — \`O(log_26 n)\` iterations — with \`O(log_26 n)\` space for the string. Plain integer arithmetic throughout; the only "trick" is knowing where the \`- 1\` lives.
`,
        complexity: 'Time O(log_26 n), Space O(log_26 n) for the label',
      },
      testCases: [
        { input: [1], expected: 'A', label: 'first aisle' },
        { input: [28], expected: 'AB', label: 'two-letter' },
        { input: [701], expected: 'ZY', label: 'high two-letter' },
        { input: [26], expected: 'Z', hidden: true, label: 'exact multiple of 26 is a single Z, not a carry' },
        { input: [27], expected: 'AA', hidden: true, label: 'rollover to two letters' },
        { input: [702], expected: 'ZZ', hidden: true, label: 'last two-letter label' },
        { input: [703], expected: 'AAA', hidden: true, label: 'rollover to three letters' },
        { input: [18278], expected: 'ZZZ', hidden: true, label: 'last three-letter label' },
      ],
      furtherPractice: [
        { name: 'LeetCode 168. Excel Sheet Column Title', note: 'the identical number-to-label direction' },
        { name: 'LeetCode 171. Excel Sheet Column Number', note: 'the inverse: parse a label back to its number' },
      ],
    },
    {
      id: 'tower-clock-angle',
      title: 'Clock Tower Hand Angle',
      difficulty: 'easy',
      statement: `
The keeper of a clock tower needs the angle between the hour and minute hands for any time, to schedule maintenance when the hands are far apart. The clock is a standard analog face: 360 degrees around, 12 hours on the dial.

Given an hour \`h\` (where \`0\` and \`12\` both mean the 12 position) and a minute \`m\` (\`0\` to \`59\`), return the **smaller** of the two angles between the hands, in degrees. The minute hand sweeps \`6\` degrees per minute. The hour hand sweeps \`30\` degrees per hour **plus** \`0.5\` degrees per minute, because it creeps forward as the minutes pass.

Return a number of degrees in the range \`[0, 180]\`. Because all the inputs are whole minutes, every answer is an exact multiple of \`0.5\`; the judge compares with a tolerance of \`1e-6\`.
`,
      examples: [
        {
          input: 'h = 3, m = 0',
          output: '90.0',
          explanation: 'At 3:00 the minute hand is at 0° and the hour hand at 90°; the gap is 90°.',
        },
        {
          input: 'h = 12, m = 30',
          output: '165.0',
          explanation: 'Minute hand at 180°, hour hand at 15° (halfway between 12 and 1); the difference is 165°.',
        },
        {
          input: 'h = 3, m = 15',
          output: '7.5',
          explanation: 'Minute hand at 90°, hour hand at 97.5° (90 + 15·0.5); the small gap is 7.5°.',
        },
      ],
      constraints: [
        '0 <= h <= 12 (0 and 12 both denote the 12 position)',
        '0 <= m <= 59',
        'Minute hand: 6° per minute. Hour hand: 30° per hour + 0.5° per minute',
        'Return the smaller angle, a value in [0, 180]; answers are exact multiples of 0.5 (1e-6 tolerance)',
      ],
      hints: [
        'Place each hand on the dial independently as an absolute angle from 12 o’clock. Does the hour hand sit exactly on the hour mark when m > 0, or has it drifted?',
        'Minute angle is 6·m. Hour angle is 30·(h mod 12) + 0.5·m — the second term is the drift that makes 3:15 not equal 7.5° in the naive reading.',
        'Take the absolute difference of the two angles. It might exceed 180°, in which case the hands are closer measured the other way around, so return min(diff, 360 − diff).',
      ],
      functionName: 'clock_hand_angle',
      starterCode: `def clock_hand_angle(h: int, m: int) -> float:
    pass
`,
      solution: {
        code: `def clock_hand_angle(h: int, m: int) -> float:
    # Each hand as an absolute angle measured clockwise from 12.
    # Minute hand: a full 360-degree sweep every 60 minutes = 6 deg/min.
    minute_angle = 6.0 * m
    # Hour hand: 30 degrees per hour (360/12), PLUS 0.5 deg per minute,
    # because the hour hand drifts continuously between the hour marks.
    # h % 12 folds the 12 o'clock position (h == 12) back to 0.
    hour_angle = 30.0 * (h % 12) + 0.5 * m
    # Raw separation, then take whichever way around the dial is shorter.
    diff = abs(hour_angle - minute_angle)
    return min(diff, 360.0 - diff)
`,
        commentary: `
The only modeling decision is to place each hand as an **absolute angle** from the 12 mark, then subtract — far cleaner than reasoning about relative positions. The minute hand is easy: \`6° per minute\`, so \`6m\`. The hour hand is where the naive answer goes wrong: it does not jump from one hour mark to the next, it **drifts continuously**, covering \`30°\` per hour and an extra \`0.5°\` for each minute elapsed (\`30° / 60 min\`). Forgetting the \`0.5m\` term is the single most common bug — it makes 3:15 read as \`7.5°\` worth of error.

Two small guards finish it. First, \`h % 12\` folds the \`12\` position (and any \`h == 12\` input) back to \`0°\`, matching the dial. Second, the absolute difference of the two angles can exceed \`180°\`; when it does, the hands are actually closer measured the *other* way around the circle, so the answer is \`min(diff, 360 - diff)\`. That wrap is the same odometer thinking as modular arithmetic — the dial is a ring, not a line.

It is \`O(1)\` arithmetic with no loops. Floats appear, but every input is a whole minute, so each result is an exact multiple of \`0.5\` and there is no accumulation of rounding error — the \`1e-6\` judge tolerance is comfortable margin.
`,
        complexity: 'Time O(1), Space O(1)',
      },
      testCases: [
        { input: [3, 0], expected: 90.0, label: 'right angle at 3:00' },
        { input: [12, 30], expected: 165.0, label: 'hour drift at 12:30' },
        { input: [3, 15], expected: 7.5, label: 'small gap, hour-hand drift matters' },
        { input: [12, 0], expected: 0.0, hidden: true, label: 'hands aligned at noon' },
        { input: [6, 0], expected: 180.0, hidden: true, label: 'opposite hands, capped at 180' },
        { input: [0, 0], expected: 0.0, hidden: true, label: 'h = 0 folds to the 12 position' },
        { input: [9, 0], expected: 90.0, hidden: true, label: 'right angle the other way' },
        { input: [11, 59], expected: 5.5, hidden: true, label: 'just before noon' },
      ],
      furtherPractice: [
        { name: 'LeetCode 1344. Angle Between Hands of a Clock', note: 'the same hour-hand drift and wrap-around' },
      ],
    },
    {
      id: 'survey-alignment',
      title: 'Surveyor Sightline Alignment',
      difficulty: 'hard',
      statement: `
A land surveyor has driven a set of stakes into a field at integer grid coordinates. To lay a straight fence, the surveyor wants the **largest number of stakes that lie on a single straight line** — any line, any orientation. Two stakes always lie on a line, so the answer is at least \`min(2, number of stakes)\`.

Given a list \`stakes\` of \`[x, y]\` integer coordinate pairs, return the maximum number of stakes that are collinear.

Stakes may be driven at the **same spot** (duplicate coordinates); duplicates all count toward any line through that spot. The answer is a single integer. An empty field returns \`0\`; one stake returns \`1\`.
`,
      examples: [
        {
          input: 'stakes = [[1, 1], [2, 2], [3, 3]]',
          output: '3',
          explanation: 'All three lie on the line y = x.',
        },
        {
          input: 'stakes = [[1, 1], [3, 2], [5, 3], [4, 1], [2, 3], [1, 4]]',
          output: '4',
          explanation: 'The stakes (1,4), (2,3), (3,2), (4,1) all lie on the line y = 5 − x.',
        },
        {
          input: 'stakes = [[0, 0]]',
          output: '1',
          explanation: 'A single stake is trivially its own line.',
        },
      ],
      constraints: [
        '0 <= number of stakes <= 300',
        '-10^9 <= x, y <= 10^9 for every stake',
        'Duplicate coordinates are allowed and all count toward a shared line',
        'Use exact integer slope keys (reduced direction vectors), never float division, to avoid precision errors',
      ],
      hints: [
        'Two stakes never pin down "the best" line, but a third either lies on the line they define or it does not. If you anchor one stake and look outward at all the others, what shared property do the ones on a common line through the anchor have?',
        'Anchor each stake in turn. For every other stake, the direction from the anchor is a slope. Stakes sharing the same slope (relative to the anchor) are collinear with it. Counting the most common slope per anchor and taking the max over anchors gives the answer.',
        'Represent each slope as a reduced integer vector: divide (dx, dy) by gcd(|dx|, |dy|) and fix a canonical sign so that e.g. (1,2) and (−1,−2) collapse to one key — never use dy/dx as a float. Handle exact duplicates (dx = dy = 0) separately and add them to every line through the anchor.',
      ],
      functionName: 'max_aligned_stakes',
      starterCode: `def max_aligned_stakes(stakes: list[list[int]]) -> int:
    pass
`,
      solution: {
        code: `from math import gcd

def max_aligned_stakes(stakes: list[list[int]]) -> int:
    n = len(stakes)
    # Zero, one, or two stakes are degenerate: the count IS n itself,
    # since any two points are collinear and fewer can't beat that.
    if n <= 2:
        return n

    best = 1
    for i in range(n):
        # Anchor stake i. Group every other stake by the DIRECTION of
        # the segment from the anchor to it. Same direction (reduced)
        # => collinear with the anchor along one line.
        slopes: dict[tuple, int] = {}
        duplicates = 0          # stakes sitting exactly on the anchor
        local_best = 0          # most stakes sharing one slope here
        ax, ay = stakes[i]
        for j in range(n):
            if i == j:
                continue
            dx = stakes[j][0] - ax
            dy = stakes[j][1] - ay
            if dx == 0 and dy == 0:
                # Same spot as the anchor: lies on EVERY line through it.
                duplicates += 1
                continue
            # Reduce the direction vector to lowest terms so that, say,
            # (2, 4) and (1, 2) and (3, 6) all key to the same slope.
            g = gcd(dx, dy)     # gcd is positive for nonzero input
            dx //= g
            dy //= g
            # Canonicalize the sign so (1, 2) and (-1, -2) — opposite
            # directions along the SAME line — collapse to one key.
            if dx < 0 or (dx == 0 and dy < 0):
                dx, dy = -dx, -dy
            key = (dx, dy)
            slopes[key] = slopes.get(key, 0) + 1
            if slopes[key] > local_best:
                local_best = slopes[key]
        # A line through the anchor holds: the anchor itself (+1), every
        # stake duplicated on it, and the largest single-slope group.
        best = max(best, local_best + duplicates + 1)
    return best
`,
        commentary: `
The defining trick is **anchor and group by slope**. A line is hard to pin down from scratch, but if you *fix one stake as an anchor*, every other stake defines a direction (slope) relative to it, and the stakes lying on one line through the anchor are exactly those sharing that slope. So for each anchor, bucket the others by slope, take the biggest bucket, and the best line through that anchor holds \`biggest_bucket + 1\` stakes (the +1 is the anchor). Maximize over all anchors and you have the global best — \`O(n^2)\` total, which is the standard bound for this problem.

Two correctness landmines, both about representing the slope **exactly**. First, never use \`dy / dx\` as a float — equal lines can produce slightly different floats and split a bucket, and a vertical line divides by zero. Instead key on the **reduced integer direction vector**: divide \`(dx, dy)\` by \`gcd(dx, dy)\` so \`(2,4)\`, \`(1,2)\`, \`(3,6)\` all collapse to \`(1,2)\`. Second, a line has two opposite directions — \`(1,2)\` and \`(-1,-2)\` describe the *same* line — so canonicalize the sign (force the first nonzero component positive) to merge them into one key.

The last subtlety is **duplicate stakes** sitting exactly on the anchor (\`dx == dy == 0\`): they have no direction, but they lie on *every* line through the anchor, so they are counted once into \`duplicates\` and added to every candidate. That is why the per-anchor total is \`local_best + duplicates + 1\`. Pure integer arithmetic throughout keeps the whole thing exact.
`,
        complexity: 'Time O(n^2), Space O(n) for the per-anchor slope buckets',
      },
      testCases: [
        { input: [[[1, 1], [2, 2], [3, 3]]], expected: 3, label: 'three on y = x' },
        {
          input: [[[1, 1], [3, 2], [5, 3], [4, 1], [2, 3], [1, 4]]],
          expected: 4,
          label: 'best line is y = 5 - x',
        },
        { input: [[[0, 0]]], expected: 1, label: 'single stake' },
        { input: [[]], expected: 0, hidden: true, label: 'empty field' },
        {
          input: [[[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]]],
          expected: 3,
          hidden: true,
          label: 'vertical line of 3 beats the horizontal of 3? tie at 3',
        },
        { input: [[[1, 1], [1, 1], [1, 1]]], expected: 3, hidden: true, label: 'all stakes on the same spot' },
        {
          input: [[[4, 0], [4, -1], [4, 5], [4, 3]]],
          expected: 4,
          hidden: true,
          label: 'vertical line, no float division',
        },
        {
          input: [[[0, 0], [2, 4], [1, 2], [3, 6], [1, 0]]],
          expected: 4,
          hidden: true,
          label: 'reduced slope (1,2) groups four points',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 149. Max Points on a Line', note: 'the canonical version with the same gcd-slope keying' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt:
        'The classic in-place 90° clockwise rotation of an `n x n` matrix is "transpose, then reverse each row." What is the coordinate-level reason this composition works?',
      choices: [
        'Transposing moves (r, c) to (n-1-r, n-1-c), and reversing each row undoes the vertical half of that move.',
        'Reversing each row performs the rotation by itself; the transpose merely restores the matrix to square shape.',
        'Transposing sends (r, c) to (c, r); reversing each row then sends (c, r) to (c, n-1-r). The composition is (r, c) → (c, n-1-r) — precisely the clockwise destination map.',
        'Each step rotates the matrix by 45°, so applying both yields the full 90° turn.',
      ],
      correctIndex: 2,
      explanation:
        'Track one cell through both steps: the transpose reflects across the main diagonal, mapping (r, c) to (c, r); reversing each row reflects across the vertical midline, mapping column index r to n-1-r. Composing gives (r, c) → (c, n-1-r), which is the clockwise rotation. The "two 45° rotations" answer is the tempting one — but each step is a reflection, not a rotation; it is the *composition of two reflections* that produces a rotation. Transpose does not negate both coordinates (that would be a 180° turn), and a row reversal alone is just a horizontal flip.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt: "Euclid's algorithm replaces gcd(a, b) with gcd(b, a % b) at every step. What justifies that replacement?",
      choices: [
        'a % b is smaller than a, and gcd always grows as its arguments shrink.',
        'Any common divisor d of a and b also divides a − qb = a % b, and any common divisor of b and a % b divides a. Both pairs share the exact same set of common divisors, hence the same greatest one.',
        'Modulo distributes over gcd: gcd(a, b) = gcd(a % b, b % a) for all positive a, b.',
        'The step is only exact when a and b are coprime; otherwise it is an approximation that must be verified by factorization.',
      ],
      correctIndex: 1,
      explanation:
        'Write a = qb + r. If d divides a and b, then d divides a − qb = r; conversely if d divides b and r, it divides qb + r = a. So {common divisors of (a, b)} = {common divisors of (b, r)}, and equal sets have equal maxima — no approximation involved. The "shrinking arguments" answer explains why the algorithm *terminates*, not why it is *correct*, and gcd certainly does not grow as inputs shrink. There is no distributive law of modulo over gcd.',
    },
    {
      id: 'q3',
      kind: 'conceptual',
      prompt: 'Your ring buffer steps backward with `index = (index - 1) % capacity`. In Python, what does `(-1) % 8` evaluate to, and what is the takeaway?',
      choices: [
        "7 — Python's % returns a result with the sign of the divisor, so backward wrap-around indexing is already safe with no extra adjustment.",
        '-1 — like C, the result takes the sign of the dividend, so you must add the capacity before reducing.',
        '1 — Python takes the absolute value of both operands before dividing.',
        'It raises ValueError: Python forbids a negative left operand for %.',
      ],
      correctIndex: 0,
      explanation:
        'Python defines % via floor division, so the remainder always carries the sign of the divisor: (-1) % 8 == 7, and the backward step wraps cleanly to the last slot. The C answer is the dangerous distractor: C, Java, and JavaScript truncate toward zero, yielding -1, which is why ported wrap-around code suddenly indexes out of bounds. Python neither takes absolute values nor raises for negative operands.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt: 'What is the total work done by a Sieve of Eratosthenes crossing off all composites below n, and where does the bound come from?',
      choices: [
        'O(n√n) — each number up to n is tested against candidate divisors up to its square root.',
        'O(n log n) — the harmonic series n/1 + n/2 + n/3 + … taken over all integers.',
        'O(n) — every array cell is written exactly once.',
        'O(n log log n) — the crossing-off cost is n/2 + n/3 + n/5 + n/7 + …, a harmonic-style sum over the primes only, which grows like log log n.',
      ],
      correctIndex: 3,
      explanation:
        'Each prime p sweeps roughly n/p multiples, and only primes get to sweep, so the total is n times the sum of 1/p over primes below n — which grows like log log n (Mertens). The O(n log n) distractor is the harmonic sum over *all* integers, which would apply if every number swept its multiples. O(n√n) is per-number trial division — the very approach the sieve replaces. O(n) is too optimistic: a composite like 30 is struck by 2, 3, and 5, so cells are written more than once.',
    },
    {
      id: 'q5',
      kind: 'complexity',
      prompt: "How many iterations can Euclid's gcd take on inputs up to 10^18, and which inputs realize the worst case?",
      choices: [
        'O(√min(a, b)) — the same bound as trial-division factoring.',
        'O(log min(a, b)) — the remainder at least halves every step, and consecutive Fibonacci numbers realize the worst case.',
        'O(min(a, b)) — in the worst case the arguments decrease by 1 per iteration.',
        'O(1) amortized — modern CPUs evaluate gcd as a single hardware instruction.',
      ],
      correctIndex: 1,
      explanation:
        'If b ≤ a/2 then a % b < b ≤ a/2; if b > a/2 then a % b = a − b < a/2 — either way the leading argument at least halves per step, giving O(log min(a, b)), about 87 steps for 10^18-scale inputs. Fibonacci neighbors are the slowest shrinkers (Lamé\'s theorem). The O(min(a,b)) distractor describes the *subtraction-only* variant of Euclid, not the modulo version. O(√n) belongs to factoring by trial division — gcd is exponentially easier than factoring — and no mainstream CPU has a constant-time gcd instruction.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        "Your physics engine needs a constant-time test for whether two axis-aligned hitboxes collide with positive area. A teammate proposes: \"loop over the four corners of box A and check whether any lies inside box B.\" Which response is right?",
      choices: [
        'Approve it — two axis-aligned rectangles overlap exactly when one contains a corner of the other.',
        'Sort all eight corner coordinates and walk them with two pointers to detect interleaving.',
        'Reject it — a plus-sign configuration (a wide box crossing a tall box) overlaps with zero corners inside either box. Project onto each axis instead: collide iff A.x1 < B.x2 and B.x1 < A.x2 and A.y1 < B.y2 and B.y1 < A.y2.',
        'Reject it — the only robust test is computing the actual intersection polygon with a general clipping algorithm.',
      ],
      correctIndex: 2,
      explanation:
        'The corner test is the seductive trap: it handles most sketches you would draw, then fails the cross/plus case where each box pierces the other side-to-side and every corner sits outside the other box. The per-axis interval test has no blind spot — two rectangles intersect with positive area iff their x-shadows and y-shadows both strictly overlap — and costs four comparisons. Sorting corners with two pointers misapplies a sequence pattern to a constant-size geometric predicate, and polygon clipping is enormous overkill for axis-aligned boxes.',
    },
    {
      id: 'q7',
      kind: 'scenario',
      prompt:
        'You must rotate an 8192×8192 square raster 90° clockwise on a memory-constrained device — no second image buffer. Which plan is correct?',
      choices: [
        'Transpose in place (swap (r, c) with (c, r) across the diagonal), then reverse each row left-to-right.',
        "Reverse each row left-to-right, then transpose — the same two steps, so the order can't matter.",
        'In a single pass, swap grid[r][c] with its destination grid[c][n-1-r] for every cell.',
        'Allocate a fresh matrix and fill it with result[c][n-1-r] = grid[r][c].',
      ],
      correctIndex: 0,
      explanation:
        'Transpose-then-reverse-rows composes two in-place reflections into the clockwise map (r, c) → (c, n-1-r). The order absolutely matters: reversing rows first then transposing composes the mirrors the other way and produces the counterclockwise rotation — the tempting "same two steps" answer is wrong. The single-pass pairwise swap corrupts the image because the rotation permutation is a 4-cycle (each cell displaces three others), not a self-inverse pairing. The fresh-matrix fill computes the right answer but violates the no-second-buffer constraint — 64 megapixels of extra memory.',
    },
    {
      id: 'q8',
      kind: 'scenario',
      prompt:
        'An analytics endpoint answers "how many primes are below k?" thousands of times per minute, with k up to 10^7. What do you build?',
      choices: [
        'Per query, trial-divide every integer below k by candidates up to its square root.',
        'Per query, run a fast probabilistic test like Miller–Rabin on every integer below k.',
        'Memoize a recursion count(k) = count(k-1) + is_prime(k-1), filling entries lazily as queries arrive.',
        'Run one sieve up to 10^7 at startup and build a prefix-count array, so every query becomes a single O(1) lookup.',
      ],
      correctIndex: 3,
      explanation:
        'The access pattern — many queries, one fixed bound — screams precomputation: sieve once in O(n log log n), take a running count, and each request is an array read. Trial division per query is O(k√k) every single time. Miller–Rabin is fast *per number* but still does Θ(k) tests per query. The memoized recursion is the tempting "make it DP" reflex: the recurrence is fine, but it still needs an is_prime oracle per cell, which collapses back into trial division with extra bookkeeping — the sieve IS the right way to fill that table, all at once.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Coordinate map for rotating an n×n grid 90° clockwise?',
      back: 'Cell (r, c) lands at (c, n-1-r). Implement as transpose (swap across the main diagonal) followed by reversing each row — two in-place reflections composing into one rotation.',
    },
    {
      id: 'f2',
      front: 'Pitfall: you reversed each row first, THEN transposed. What did you actually compute?',
      back: 'The 90° counterclockwise rotation. Reflection order matters; and "reverse each row" (horizontal flip) is a different mirror from "reverse the row order" (vertical flip). Re-derive the coordinate map instead of guessing.',
    },
    {
      id: 'f3',
      front: 'Spiral traversal template — what state, and which sweeps need guards?',
      back: 'Four walls: top, bottom, left, right; sweep a wall then move it inward. Guard the bottom-row sweep with top <= bottom and the left-column sweep with left <= right, or a lone middle row/column is emitted twice.',
    },
    {
      id: 'f4',
      front: 'Sieve of Eratosthenes: where does each prime start crossing off, and why is that safe?',
      back: 'At p*p, stepping by p. Every smaller multiple of p has a prime factor smaller than p and was already crossed off during that factor\'s sweep. Outer loop only needs p while p*p < n.',
    },
    {
      id: 'f5',
      front: "Euclid's gcd: the two-line loop and its complexity?",
      back: 'while b: a, b = b, a % b; return a. Runs in O(log min(a, b)) — the leading argument at least halves each step; consecutive Fibonacci numbers are the worst case.',
    },
    {
      id: 'f6',
      front: 'Axis-aligned rectangle overlap test (positive area, touching edges excluded)?',
      back: 'ax1 < bx2 and bx1 < ax2 and ay1 < by2 and by1 < ay2 — strict interval overlap on both axes. Strict < is exactly what makes shared edges and corners count as non-overlapping.',
    },
    {
      id: 'f7',
      front: 'Why does (i - 1) % n work for backward wrap-around in Python but break in C or Java?',
      back: "Python's % takes the sign of the divisor, so -1 % n == n-1. C, Java, and JavaScript truncate toward zero, giving -1 — add n before reducing when porting.",
    },
    {
      id: 'f8',
      front: 'How do you compute lcm safely from gcd?',
      back: 'lcm(a, b) = a // gcd(a, b) * b. Divide before multiplying — in fixed-width languages a*b can overflow even when the lcm itself fits.',
    },
    {
      id: 'f9',
      front: 'Why is the corner-containment test for rectangle overlap wrong, and what replaces it?',
      back: 'A plus-sign configuration overlaps while all eight corners lie outside the other rectangle. Replace it with per-axis interval projection: overlap on x AND overlap on y.',
    },
    {
      id: 'f10',
      front: 'General strategy for "rotate / reflect / spiral the grid" problems?',
      back: 'Transform coordinates, not data: write the destination formula for a single cell first (e.g. (r, c) → (c, n-1-r)), verify it on a 3×3 sketch, then implement the formula. The code falls out of the map.',
    },
  ],
  cheatSheet: {
    tldr:
      'Math & geometry is a toolkit, not a single pattern: modular arithmetic for anything that wraps (rings, clocks, hashes), Euclid\'s gcd for shared structure between numbers, sieves for bulk primality, and coordinate transforms for grid geometry. The unifying move is to find the formula before writing the loop — where does cell (r, c) land, what interval does each box project onto, which multiples can each prime cross off — and then implement the formula directly, in integers, with the edge convention (strict vs inclusive, below vs up-to) stated explicitly.',
    signals: [
      'Reach for modular arithmetic when indices wrap, quantities repeat in cycles, or you see "circular", "clock", or "every k-th".',
      'Reach for Euclid when reducing fractions, aligning periods, or splitting things into equal largest chunks — gcd/lcm in O(log n).',
      'Reach for the coordinate map when a grid problem says rotate, reflect, transpose, spiral, or diagonal — derive (r, c) → (r\', c\') first.',
      'Reach for a sieve when you need primality for MANY numbers below a memory-friendly bound, especially across repeated queries.',
      'Reach for per-axis interval tests for axis-aligned collision or containment — and decide up front whether touching counts.',
    ],
    template: `# Euclid: gcd in O(log min(a, b));  lcm = a // gcd(a, b) * b
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

# Rotate n x n clockwise: (r, c) -> (c, n-1-r)
# = transpose, then reverse each row (both in place)
for r in range(n):
    for c in range(r + 1, n):           # upper triangle only!
        g[r][c], g[c][r] = g[c][r], g[r][c]
for row in g:
    row.reverse()

# Spiral: four closing walls — guard the last two sweeps
while top <= bottom and left <= right:
    # sweep top row L->R, then: top += 1
    # sweep right col T->B, then: right -= 1
    if top <= bottom:   ...  # sweep bottom row R->L, bottom -= 1
    if left <= right:   ...  # sweep left col B->T,  left += 1

# Sieve: count/list primes below n
is_prime = [True] * n
is_prime[0] = is_prime[1] = False
p = 2
while p * p < n:
    if is_prime[p]:
        is_prime[p*p::p] = [False] * len(range(p*p, n, p))
    p += 1

# AABB overlap, positive area (touching edges = no overlap)
hit = ax1 < bx2 and bx1 < ax2 and ay1 < by2 and by1 < ay2`,
    complexity:
      'Euclid O(log min(a, b)); sieve O(n log log n) time, O(n) space; grid rotate/spiral O(m·n) time with O(1) extra in place; AABB overlap O(1).',
  },
}

export default mod
