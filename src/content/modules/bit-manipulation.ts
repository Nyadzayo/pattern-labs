import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'bit-manipulation',
  visualizer: 'bitwise',
  concept: `
## The mental model

Stop thinking of an integer as a number for a moment. Think of it as a row of 32 tiny switches bolted side by side, and of every bitwise operator as a tool that acts on **all 32 switches at once**, in a single machine instruction. The fluent way to read bitwise code is to think in **stencils**, not arithmetic:

- **AND** with a mask is a stencil that *keeps* only the positions where the mask has a 1 and zeroes everything else. \`x & 0x0F\` keeps the low four switches.
- **OR** with a mask *paints 1s through* the stencil without disturbing anything else. \`x | (1 << k)\` forces switch \`k\` on.
- **XOR** with a mask *flips* exactly the stenciled positions — and flipping twice undoes itself. \`x ^ (1 << k)\` toggles switch \`k\`.
- **Shifts** slide the whole row sideways. \`x << k\` slides left (multiply by \`2^k\`); \`x >> k\` slides right (floor-divide by \`2^k\`).

Once you see masks as stencils, most "tricks" become obvious moves: you are selecting, painting, flipping, or sliding groups of switches in parallel.

## Mechanics

The toolbox you will use constantly:

\`\`\`python
def bit_toolbox(n: int, k: int) -> None:
    read   = (n >> k) & 1     # what is switch k?
    set_k  = n | (1 << k)     # force switch k on
    clear  = n & ~(1 << k)    # force switch k off
    flip   = n ^ (1 << k)     # toggle switch k
    lowest = n & -n           # keep ONLY the lowest set bit
    erased = n & (n - 1)      # erase the lowest set bit
\`\`\`

The star of the module is \`n & (n - 1)\`. Why does it erase exactly the lowest 1? Subtracting 1 from a binary number turns the lowest set bit into a 0 and every 0 *below* it into a 1 — borrowing ripples up only that far, leaving all higher bits untouched. So \`n\` and \`n - 1\` agree above the lowest set bit and disagree everywhere at or below it; ANDing keeps the agreeing top and wipes the whole disagreeing tail. Two famous consequences:

1. **Kernighan's popcount**: \`while n: n &= n - 1; count += 1\` runs once per *set* bit, not once per bit.
2. **Power-of-two test**: a positive \`n\` has exactly one set bit iff erasing the lowest one leaves nothing — \`n > 0 and n & (n - 1) == 0\`. No loops, no division.

XOR has its own superpower: it is associative, commutative, and **self-inverse** (\`a ^ a = 0\`, \`a ^ 0 = a\`). Fold a whole list with XOR and every value that appears an even number of times annihilates itself, regardless of order or position. That turns "find the element that appears once among pairs" into one pass with one variable of state.

Shifts and masks also compose into **word-level parallelism**: to reverse all 32 bits you don't move bits one at a time — you swap the two 16-bit halves, then the bytes inside each half, then nibbles, pairs, and single bits. Five mask-and-shift stages instead of a 32-step loop, because each stage moves *every* bit simultaneously.

## When to reach for it

- The statement guarantees things appear **an even number of times except one** (or parity is the question) — XOR fold.
- You see the words **flags, mask, register, permissions, "32-bit", "without extra memory", "constant space"** — the answer is probably a stencil.
- You need set operations over a **tiny fixed universe** (≤ 64 items): a bitmask *is* a set, with union \`|\`, intersection \`&\`, and membership \`(s >> i) & 1\`, all in \`O(1)\`.
- Checks shaped like **alignment or powers of two** (buffer sizes, tree levels, texture dimensions) — \`n & (n - 1)\` territory.
- A hash map "works" but feels heavy for what is really a question **about the binary representation itself** — counting bits, mirroring bits, packing fields.

## Complexity

Operations on a single word are \`O(1)\`. Folding or scanning \`n\` values is \`O(n)\` time, \`O(1)\` space — this is the pattern's signature win over hash-map bookkeeping at \`O(n)\` space. Kernighan's loop is \`O(s)\` for \`s\` set bits. Per-number popcount over a range costs \`O(n log n)\`, but the DP \`bits[i] = bits[i >> 1] + (i & 1)\` reuses earlier answers for \`O(n)\` total. Divide-and-conquer word tricks (bit reversal, parallel popcount) take \`O(log w)\` stages for a \`w\`-bit word.

## Common pitfalls

- **Python ints never overflow.** There is no 33rd switch falling off the end: \`x << 40\` just grows, and \`~x\` is the *negative* number \`-x - 1\`, not a flipped 32-bit pattern. When a problem says "32-bit", mask with \`& 0xFFFFFFFF\` to emulate the width.
- **Operator precedence bites.** In Python (and C), \`==\` binds tighter than \`&\`, so \`n & 1 == 0\` parses as \`n & (1 == 0)\` — always 0. Parenthesize: \`(n & 1) == 0\`.
- **Right-shifting negatives** in Python floors toward negative infinity and keeps the sign bit conceptually infinite — there is no unsigned \`>>>\`. Mask first if you want logical-shift behavior.
- **XOR cancellation needs the precondition.** If some value appears an odd number of times *other than once*, or two values appear once, the plain fold's answer means something different. Re-read the guarantee.
- **Power of four ≠ power of two.** 8 passes the single-bit test but is not a power of four; the lone bit must also sit at an even position.
- **Off-by-one on width.** The top of a 32-bit word is bit 31. \`1 << 32\` is outside the word.
`,
  realWorldUses: [
    {
      title: 'Memory-mapped device registers in embedded drivers',
      description:
        'Hardware exposes peripherals as 32-bit registers where individual bits enable a clock, raise an interrupt, or report status. Driver code is wall-to-wall stencils: reg |= ENABLE to set, reg &= ~FAULT to clear, (reg >> READY_BIT) & 1 to poll — read-modify-write of single switches without disturbing neighbors.',
    },
    {
      title: 'Unix permissions and syscall flag words',
      description:
        'A file mode like 0o754 packs nine permission switches into one int, and open() takes O_RDWR | O_CREAT | O_APPEND — flags ORed into a single word, tested with AND in the kernel. One integer replaces a dictionary of booleans on every file operation.',
    },
    {
      title: 'Bitboards in chess engines',
      description:
        'Engines like Stockfish encode "which of the 64 squares holds a white pawn" as one 64-bit word per piece type. Move generation becomes shifts and masks, attack-set intersection is a single AND, and popcount scores material — millions of positions per second hinge on these word-parallel ops.',
    },
  ],
  problems: [
    {
      id: 'lone-badge',
      title: 'The Badge Still Inside',
      difficulty: 'easy',
      statement: `
An office security system appends a badge ID to its day log every time someone passes the turnstile. Everyone who came in also left — so their ID appears **exactly twice** — except one person who is still in the building: their ID appears **exactly once**.

Given the log \`scans\` as a list of non-negative integers (in arbitrary order, entries and exits interleaved), return the badge ID that appears exactly once.

The night-shift scanner is a tiny embedded device: your solution must run in a **single pass** using **O(1) extra memory** — no dictionaries, no sets, no sorting.
`,
      examples: [
        {
          input: 'scans = [2, 2, 5]',
          output: '5',
          explanation: 'Badge 2 entered and left; badge 5 only entered. 5 is still inside.',
        },
        {
          input: 'scans = [1, 2, 1, 2, 9]',
          output: '9',
          explanation: 'Badges 1 and 2 each appear twice and cancel out of consideration; 9 appears once.',
        },
        {
          input: 'scans = [7]',
          output: '7',
          explanation: 'Only one scan all day — that badge is the one inside.',
        },
      ],
      constraints: [
        '1 <= len(scans) <= 100_000 and len(scans) is odd',
        '0 <= scans[k] <= 10^9',
        'Exactly one ID appears once; every other ID appears exactly twice',
        'Single pass, O(1) extra space',
      ],
      hints: [
        'A dictionary tally works but the device has almost no RAM. Could you combine all the scans into a single running value — one that does not care about the order the scans arrived in?',
        'XOR is associative, commutative, and self-inverse: a ^ a = 0 and a ^ 0 = a. What is left if you XOR every scan in the log together?',
        'Fold the list: acc = 0, then acc ^= s for each scan. Every badge that appears twice cancels itself to 0 no matter where its two scans sit, leaving exactly the lone badge in acc.',
      ],
      functionName: 'find_lone_badge',
      starterCode: `def find_lone_badge(scans: list[int]) -> int:
    pass
`,
      solution: {
        code: `def find_lone_badge(scans: list[int]) -> int:
    # Running XOR of everything seen so far.
    acc = 0
    for s in scans:
        # XOR is self-inverse: the second occurrence of any ID
        # flips back exactly the bits its first occurrence flipped.
        acc ^= s
    # All paired IDs have annihilated; only the lone badge remains.
    return acc
`,
        commentary: `
The dictionary solution counts occurrences and scans for the count of 1 — correct, but \`O(n)\` space and two conceptual passes. The log's guarantee is much stronger than a dictionary exploits: every ID except one appears **exactly twice**.

XOR turns that guarantee into cancellation. Because XOR is commutative and associative, the fold's result is independent of how entries and exits interleave — you may mentally reorder the log so each ID's two scans sit adjacent. Each adjacent pair contributes \`x ^ x = 0\`, and \`0\` is the identity, so the entire log collapses to the one unpaired ID. One integer of state, one pass, no allocation — exactly what the firmware constraint demands.

Note the precondition does real work here: if two different badges were still inside, the fold would return their XOR — a number that may not be any badge in the log. The trick is only as good as the "everyone else appears exactly twice" guarantee.
`,
        complexity: 'Time O(n), Space O(1)',
      },
      testCases: [
        { input: [[2, 2, 5]], expected: 5, label: 'basic pair plus lone' },
        { input: [[1, 2, 1, 2, 9]], expected: 9, label: 'interleaved pairs' },
        { input: [[7]], expected: 7, label: 'single scan' },
        { input: [[0, 4, 4]], expected: 0, hidden: true, label: 'lone badge is zero' },
        {
          input: [[1000000000, 999999999, 1000000000]],
          expected: 999999999,
          hidden: true,
          label: 'large IDs',
        },
        { input: [[6, 1, 3, 3, 1, 6, 8]], expected: 8, hidden: true, label: 'lone at the end' },
        { input: [[31, 17, 31]], expected: 17, hidden: true, label: 'lone in the middle' },
        { input: [[10, 20, 30, 20, 10]], expected: 30, label: 'symmetric interleave' },
      ],
      furtherPractice: [
        { name: 'LeetCode 136. Single Number', note: 'the classic form of this exact fold' },
        { name: 'LeetCode 137. Single Number II', note: 'others appear three times — per-bit counting mod 3' },
        { name: 'LeetCode 260. Single Number III', note: 'two lone values — split the fold by a differing bit' },
      ],
    },
    {
      id: 'popcount-table',
      title: 'Sparsity Scores for the Compressor',
      difficulty: 'medium',
      statement: `
A telemetry compressor scores every sample value by its **sparsity**: the number of 1 bits in its binary representation (sparser samples encode more cheaply). To avoid recomputing this on the hot path, the firmware precomputes a lookup table at boot.

Given a non-negative integer \`n\`, return a list \`weights\` of length \`n + 1\` where \`weights[i]\` is the number of 1 bits in the binary representation of \`i\`, for every \`i\` from \`0\` to \`n\` **in increasing order of i**.

Boot time is budgeted: counting each number's bits from scratch costs \`O(log i)\` per entry. Build the whole table in \`O(n)\` total by reusing entries you have already computed.
`,
      examples: [
        {
          input: 'n = 2',
          output: '[0, 1, 1]',
          explanation: '0 = 0b0 has zero set bits, 1 = 0b1 has one, 2 = 0b10 has one.',
        },
        {
          input: 'n = 5',
          output: '[0, 1, 1, 2, 1, 2]',
          explanation: '3 = 0b11 has two set bits; 4 = 0b100 has one; 5 = 0b101 has two.',
        },
        {
          input: 'n = 8',
          output: '[0, 1, 1, 2, 1, 2, 2, 3, 1]',
          explanation: '7 = 0b111 peaks at three; 8 = 0b1000 drops back to one.',
        },
      ],
      constraints: [
        '0 <= n <= 100_000',
        'Return exactly n + 1 entries, index i holding the popcount of i',
        'Target O(n) total time — O(1) amortized per entry',
      ],
      hints: [
        'Write 0 through 8 in binary in a column. Each row looks suspiciously like some earlier row with one small, predictable difference. Which earlier row?',
        'Chopping off the last binary digit of i gives i >> 1 — a smaller number whose answer is already in your table. How do the bit counts of i and i >> 1 relate?',
        'bits[i] = bits[i >> 1] + (i & 1): the shifted number has all the same bits except the dropped low one, which (i & 1) reads directly. (Equivalently bits[i] = bits[i & (i - 1)] + 1.) Seed bits[0] = 0.',
      ],
      functionName: 'build_popcount_table',
      starterCode: `def build_popcount_table(n: int) -> list[int]:
    pass
`,
      solution: {
        code: `def build_popcount_table(n: int) -> list[int]:
    # weights[i] will hold the number of set bits in i.
    weights = [0] * (n + 1)
    for i in range(1, n + 1):
        # i >> 1 is i with its lowest binary digit chopped off — a smaller
        # index whose answer is already final in the table.
        # (i & 1) reads back that chopped digit: 0 or 1.
        weights[i] = weights[i >> 1] + (i & 1)
    return weights
`,
        commentary: `
This is dynamic programming where the subproblem structure comes from the **binary representation itself**. Every number \`i\` is just \`i >> 1\` with one extra digit glued on the right. The shift never invents or destroys other bits, so:

\`popcount(i) = popcount(i >> 1) + (lowest bit of i)\`

Because \`i >> 1 < i\`, a single left-to-right pass always finds the needed sub-answer already filled in — no recursion, no memo dictionary, just an array indexed by the numbers themselves.

The alternative recurrence \`weights[i] = weights[i & (i - 1)] + 1\` leans on the module's signature trick instead: \`i & (i - 1)\` is \`i\` with its lowest set bit erased, so it has exactly one fewer 1, and it is also strictly smaller than \`i\`. Both recurrences make every entry an \`O(1)\` lookup-plus-add, replacing the naive \`O(n log n)\` (an \`O(log i)\` count per entry) with \`O(n)\` total — the difference between a noticeable boot stall and a blink at \`n = 100{,}000\`.
`,
        complexity: 'Time O(n), Space O(n) for the output table',
      },
      testCases: [
        { input: [0], expected: [0], label: 'minimal: n = 0' },
        { input: [2], expected: [0, 1, 1], label: 'tiny table' },
        { input: [5], expected: [0, 1, 1, 2, 1, 2], label: 'first example' },
        { input: [1], expected: [0, 1], label: 'n = 1' },
        { input: [8], expected: [0, 1, 1, 2, 1, 2, 2, 3, 1], hidden: true, label: 'crosses a power of two' },
        {
          input: [16],
          expected: [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1],
          hidden: true,
          label: 'through 16',
        },
        {
          input: [31],
          expected: [
            0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1, 2, 2, 3, 2, 3, 3, 4, 2, 3, 3, 4, 3,
            4, 4, 5,
          ],
          hidden: true,
          label: 'full 5-bit range, ends at all-ones',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 338. Counting Bits', note: 'the canonical version of this table' },
        { name: 'LeetCode 191. Number of 1 Bits', note: 'single-word popcount — try Kernighan' },
      ],
    },
    {
      id: 'quadtree-level',
      title: 'Quadtree Level Validator',
      difficulty: 'medium',
      statement: `
A map-tile server stores the world as a quadtree: zoom level 0 is a single tile, and every level down splits each tile into four — so a complete level contains exactly \`4^k\` tiles for some integer \`k >= 0\` (1, 4, 16, 64, ...).

An ingestion job reports the tile count \`n\` it produced. Return \`True\` if \`n\` could be a complete quadtree level — that is, if \`n\` is an exact power of four — and \`False\` otherwise.

This check runs inside a tight validation loop over millions of job reports, so the reviewer's rule is strict: **no loops, no recursion, no string conversion** — a constant number of arithmetic and bitwise operations.
`,
      examples: [
        {
          input: 'n = 16',
          output: 'True',
          explanation: '16 = 4^2: a complete level two layers down.',
        },
        {
          input: 'n = 8',
          output: 'False',
          explanation: '8 is a power of two but not of four — no quadtree level has 8 tiles.',
        },
        {
          input: 'n = 1',
          output: 'True',
          explanation: '1 = 4^0: the root level.',
        },
        {
          input: 'n = 0',
          output: 'False',
          explanation: 'No level is empty; 0 is not a power of four.',
        },
      ],
      constraints: [
        '-2^31 <= n <= 2^31 - 1 (negative and zero inputs must return False)',
        'No loops, no recursion, no string/format conversion',
        'O(1) time and space',
      ],
      hints: [
        'Write a few powers of four in binary next to the powers of two that are NOT powers of four. Two separate facts must both hold — what are they?',
        'For n > 0, the test n & (n - 1) == 0 says "exactly one set bit," which captures all powers of two. What additionally distinguishes 1, 4, 16, 64 from 2, 8, 32 in binary?',
        'The lone bit must sit at an EVEN index (0, 2, 4, ...). The 32-bit mask 0x55555555 = 0b0101...0101 has ones at exactly the even positions, so: n > 0 and n & (n - 1) == 0 and (n & 0x55555555) != 0.',
      ],
      functionName: 'is_power_of_four',
      starterCode: `def is_power_of_four(n: int) -> bool:
    pass
`,
      solution: {
        code: `def is_power_of_four(n: int) -> bool:
    # 0x55555555 is 0b0101_0101_..._0101: ones at the even bit
    # positions (0, 2, 4, ..., 30) of a 32-bit word.
    EVEN_POSITIONS = 0x55555555
    return (
        n > 0                          # powers of four are positive
        and n & (n - 1) == 0           # exactly one set bit (power of two)
        and (n & EVEN_POSITIONS) != 0  # ...and it sits at an even index
    )
`,
        commentary: `
A power of four is two facts stacked together, and each fact has a constant-time bitwise test.

**Fact 1 — exactly one set bit.** Since \`4^k = 2^(2k)\`, every power of four is a power of two: a single 1 in the word. \`n & (n - 1)\` erases the lowest set bit, so for positive \`n\` the result is zero iff that lowest bit was the *only* bit. The \`n > 0\` guard matters: \`0 & -1 == 0\` would pass otherwise, and negative inputs must fail.

**Fact 2 — that bit is at an even position.** \`2^(2k)\` puts its single 1 at index \`2k\`: bit 0 for 1, bit 2 for 4, bit 4 for 16. The impostors (2, 8, 32, ...) put it at odd indices. \`0x55555555\` is a stencil over exactly the even positions of a 32-bit word — bits 0 through 30 — which covers every power of four representable in the signed-32-bit input range (the largest is \`4^15 = 2^30\`). If ANDing with that stencil keeps anything, the lone bit is even.

Because Python short-circuits \`and\`, invalid inputs exit at the first failing fact. Three comparisons, two bitwise ops, zero iterations — exactly the budget the reviewer demanded. (Loop-based repeated division by 4 is also correct, but costs \`O(log n)\` and was ruled out.)
`,
        complexity: 'Time O(1), Space O(1)',
      },
      testCases: [
        { input: [16], expected: true, label: '4^2' },
        { input: [8], expected: false, label: 'power of two, wrong parity of position' },
        { input: [1], expected: true, label: '4^0, the root' },
        { input: [0], expected: false, label: 'zero tiles' },
        { input: [-4], expected: false, hidden: true, label: 'negative input' },
        { input: [64], expected: true, hidden: true, label: '4^3' },
        { input: [1073741824], expected: true, hidden: true, label: '4^15 = 2^30, largest in range' },
        { input: [2], expected: false, hidden: true, label: 'smallest impostor' },
        { input: [2147483647], expected: false, hidden: true, label: 'all 31 low bits set' },
        { input: [12], expected: false, label: 'multiple of 4 but two set bits' },
      ],
      furtherPractice: [
        { name: 'LeetCode 231. Power of Two', note: 'just fact 1' },
        { name: 'LeetCode 342. Power of Four', note: 'the classic form' },
        { name: 'LeetCode 326. Power of Three', note: 'no bit trick exists — notice why' },
      ],
    },
    {
      id: 'mirror-word',
      title: 'The Mirrored Sensor Word',
      difficulty: 'hard',
      statement: `
A legacy seismic sensor shifts each 32-bit sample out over a serial line **least-significant bit first**. The new acquisition board latches incoming bits **most-significant bit first** into its register. The net effect: every sample arrives with its 32 bits exactly mirrored — bit 0 has swapped with bit 31, bit 1 with bit 30, and so on.

Given the latched value \`v\`, interpreted as an **unsigned 32-bit integer** (\`0 <= v <= 2^32 - 1\`), return the corrected sample: the value whose 32-bit binary representation is the reverse of \`v\`'s, also as an unsigned integer in \`[0, 2^32 - 1]\`.

The word is always **exactly 32 bits wide** — leading zeros are real bit positions and must land at the other end. The correction runs inside an interrupt handler with a budget of roughly a dozen operations per sample, so a 32-iteration bit-by-bit loop is over budget: aim for the divide-and-conquer mask-and-shift method.
`,
      examples: [
        {
          input: 'v = 1',
          output: '2147483648',
          explanation:
            '0x00000001 mirrors to 0x80000000: the lone bit travels from position 0 to position 31. The 31 leading zeros are part of the word.',
        },
        {
          input: 'v = 4294967295',
          output: '4294967295',
          explanation: '0xFFFFFFFF is all ones — its own mirror image.',
        },
        {
          input: 'v = 305419896',
          output: '510274632',
          explanation: '0x12345678 mirrors to 0x1E6A2C48: each bit k moves to position 31 - k.',
        },
        {
          input: 'v = 0',
          output: '0',
          explanation: 'All zeros mirrors to all zeros.',
        },
      ],
      constraints: [
        '0 <= v <= 2^32 - 1 (unsigned; the input is never negative)',
        'The width is exactly 32 bits; bit k must move to bit 31 - k',
        'Return an unsigned integer in [0, 2^32 - 1]',
        'Target O(log w) mask-and-shift stages for the w = 32 bit word, not an O(w) loop',
      ],
      hints: [
        'Mirroring a 32-character string is trivial; the challenge is doing it with arithmetic on the word itself. Before optimizing anything, write down exactly which position bit k must end up at — and check your answer on v = 1.',
        'A full reversal can be built from swaps of progressively smaller blocks, and swaps of disjoint blocks can all happen in the same instruction. What is left to do after you swap the two 16-bit halves? After you then swap the bytes inside each half?',
        'Five stages of v = ((v >> s) & m) | ((v & m) << s), with (s, m) = (16, 0x0000FFFF), (8, 0x00FF00FF), (4, 0x0F0F0F0F), (2, 0x33333333), (1, 0x55555555) — each stage swaps every adjacent pair of s-bit blocks at once. The order of stages does not matter.',
      ],
      functionName: 'mirror_word',
      starterCode: `def mirror_word(v: int) -> int:
    pass
`,
      solution: {
        code: `def mirror_word(v: int) -> int:
    # Each stage swaps every adjacent pair of equal-size blocks in
    # parallel: halves, then bytes, then nibbles, pairs, single bits.
    # In v = ((v >> s) & m) | ((v & m) << s):
    #   - m stencils the LOW block of each pair,
    #   - (v >> s) & m pulls each high block down into the low slot,
    #   - (v & m) << s pushes each low block up into the high slot.
    v = ((v >> 16) & 0x0000FFFF) | ((v & 0x0000FFFF) << 16)  # swap 16-bit halves
    v = ((v >> 8) & 0x00FF00FF) | ((v & 0x00FF00FF) << 8)    # swap bytes in each half
    v = ((v >> 4) & 0x0F0F0F0F) | ((v & 0x0F0F0F0F) << 4)    # swap nibbles in each byte
    v = ((v >> 2) & 0x33333333) | ((v & 0x33333333) << 2)    # swap bit-pairs in each nibble
    v = ((v >> 1) & 0x55555555) | ((v & 0x55555555) << 1)    # swap bits in each pair
    # Every mask already clears anything above bit 31, so v is a
    # valid unsigned 32-bit value; no final & 0xFFFFFFFF needed.
    return v
`,
        commentary: `
The obvious loop peels off one bit at a time — read bit \`k\`, plant it at \`31 - k\` — and takes 32 iterations of several operations each. The divide-and-conquer insight is that **a reversal is a recursion of block swaps**: reversing a 32-bit word is "swap the two halves, then reverse each half." Unrolling that recursion gives five levels (32 → 16 → 8 → 4 → 2 → 1), and the magic is that all the swaps *at one level* are disjoint, so a single mask-and-shift expression performs every one of them simultaneously.

Each constant is a stencil selecting the low block of every pair at that level: \`0x0000FFFF\` is one 16-bit low half; \`0x00FF00FF\` selects the low byte of each half; down to \`0x55555555\`, the low bit of every 2-bit pair. \`(v >> s) & m\` drops every high block into its partner's slot; \`(v & m) << s\` lifts every low block up; OR stitches the halves back together. Five stages, two shifts + two ANDs + one OR each — about 25 single-cycle operations, comfortably under the ISR budget and constant regardless of input.

A Python-specific check: left shifts can normally grow past bit 31 because Python ints are unbounded, but here every \`<< s\` operates on a value already stenciled by \`m\`, whose highest set bit plus \`s\` never exceeds 31. The structure itself keeps the word 32 bits wide — and is why bit k provably lands at \`31 - k\`: its offset within every block gets mirrored exactly once per level.
`,
        complexity: 'Time O(log w) stages = O(1) for w = 32, Space O(1)',
      },
      testCases: [
        { input: [1], expected: 2147483648, label: 'lone low bit crosses the word' },
        { input: [0], expected: 0, label: 'all zeros' },
        { input: [4294967295], expected: 4294967295, label: 'all ones is its own mirror' },
        { input: [305419896], expected: 510274632, label: '0x12345678 -> 0x1E6A2C48' },
        {
          input: [2863311530],
          expected: 1431655765,
          hidden: true,
          label: '0xAAAAAAAA mirrors to 0x55555555',
        },
        {
          input: [65535],
          expected: 4294901760,
          hidden: true,
          label: 'low half mirrors onto the high half',
        },
        {
          input: [2147483649],
          expected: 2147483649,
          hidden: true,
          label: '0x80000001 is palindromic',
        },
        { input: [12648430], expected: 2013201152, hidden: true, label: '0x00C0FFEE' },
        {
          input: [3735879681],
          expected: 2147530107,
          hidden: true,
          label: 'high bit set: 0xDEAD0001',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 190. Reverse Bits', note: 'the classic form of this mirror' },
        { name: 'LeetCode 191. Number of 1 Bits', note: 'the same masks do parallel popcount' },
        { name: 'LeetCode 393. UTF-8 Validation', note: 'byte-level stencils on a real wire format' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt: 'For a positive integer `n`, what does `n & (n - 1)` evaluate to?',
      choices: [
        '`n` with its lowest set bit cleared',
        '`n` with its highest set bit cleared',
        '`n` with its lowest zero bit set',
        '`n // 2` (a right shift by one)',
      ],
      correctIndex: 0,
      explanation:
        'Subtracting 1 turns the lowest set bit into 0 and every 0 below it into 1, leaving all higher bits untouched; ANDing keeps the agreeing high part and wipes the disagreeing tail — erasing exactly the lowest 1. The "divide by two" distractor is tempting because both shrink n, but n >> 1 moves every bit, while n & (n - 1) touches only the bottom of the word. Try n = 12 (0b1100): n & (n - 1) = 8, but n // 2 = 6.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt:
        'XOR-folding a list finds the element that appears once among exact pairs. Which two properties of XOR make the fold order-independent and make the pairs vanish?',
      choices: [
        'Associativity/commutativity (terms can be freely regrouped) and self-inversion (a ^ a = 0, with 0 as identity)',
        'Distributivity over AND, and idempotence (a ^ a = a)',
        'XOR is a rotation, so paired values align after a full pass',
        'Monotonicity: the running accumulator never decreases',
      ],
      correctIndex: 0,
      explanation:
        'Associativity and commutativity let you mentally reorder the fold so each pair sits adjacent; self-inversion makes each adjacent pair contribute a ^ a = 0, and XOR with 0 changes nothing — leaving only the lone element. Idempotence (a ^ a = a) is the property of AND and OR, not XOR; if XOR were idempotent, pairs would NOT cancel. XOR is neither a rotation nor monotonic (the accumulator can go up or down).',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt:
        "Kernighan's popcount — `while n: n &= n - 1; count += 1` — runs in time proportional to what, for a single word?",
      choices: [
        'The full bit-width of the word, regardless of value',
        'The number of SET bits in the word',
        'The logarithm of the number of set bits',
        'Constant: one operation regardless of input',
      ],
      correctIndex: 1,
      explanation:
        'Each iteration erases exactly one set bit (that is what n & (n - 1) does), so the loop runs once per 1 in the word — for example, 3 iterations for 0b10100001000... with three set bits, versus 32 for a naive check-every-position loop. It is not constant (the loop genuinely iterates) and not the full width unless the word is all ones.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'Building the table `bits[0..n]` via the recurrence `bits[i] = bits[i >> 1] + (i & 1)` costs how much total time, compared with calling an O(log i) per-number popcount for each entry?',
      choices: [
        'O(n) for the recurrence versus O(n log n) for per-number counting',
        'O(n log n) for the recurrence versus O(n^2) for per-number counting',
        'Both are O(n) — the recurrence saves nothing asymptotically',
        'O(log n) for the recurrence versus O(n) for per-number counting',
      ],
      correctIndex: 0,
      explanation:
        'The recurrence fills each of the n + 1 entries with one array lookup, one AND, and one add — O(1) per entry, O(n) total — because the sub-answer bits[i >> 1] is already final. Counting each number independently costs O(log i) per entry (one step per bit), which sums to O(n log n). Any answer below O(n) is impossible: the output itself has n + 1 entries to write.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'A memory-constrained logger streams millions of 32-bit event IDs; every ID appears exactly twice except one. RAM holds only a few scalar variables. What do you reach for?',
      choices: [
        'A hash set: insert an ID on first sight, delete on second; the survivor is the answer',
        'Buffer and sort the stream, then scan adjacent entries for the unpaired one',
        'XOR every ID into a single running accumulator and return it at end of stream',
        'A sliding window over the most recent IDs',
      ],
      correctIndex: 2,
      explanation:
        'The XOR fold needs exactly one word of state and one pass: pairs annihilate wherever they sit in the stream. The hash set is the tempting habit — it is correct, but at its peak it can hold roughly half the distinct IDs, blowing the RAM budget; sorting requires the whole stream to be resident (or external sort machinery). A sliding window is the wrong pattern entirely: the two copies of an ID can be arbitrarily far apart, so no bounded window can pair them.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'You must test whether a positive integer `n` (at most 2^31 - 1) is a power of FOUR using a constant number of operations — no loops, no strings. Which check is correct?',
      choices: [
        '`n & (n - 1) == 0`',
        '`n % 4 == 0`',
        '`n & (n - 1) == 0 and (n & 0x55555555) != 0`',
        "`bin(n).count('1') == 1 and len(bin(n)) % 2 == 0`",
      ],
      correctIndex: 2,
      explanation:
        'Two facts must hold: exactly one set bit (n & (n - 1) == 0) AND that bit at an even position, which the even-position stencil 0x55555555 verifies. The first choice alone is the tempting near-miss — it accepts 8 and 32, powers of two that no quadtree level matches. n % 4 == 0 accepts 12. The bin() option violates the no-strings rule and is also wrong on its own terms: powers of four have ODD bin() length (bin(16) = "0b10000", length 7), so its parity test rejects every true power of four.',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt:
        'You port C code that computes `~x` and `x << 4` on a uint32 into Python. What must you add, and why?',
      choices: [
        'Nothing — Python int operations behave identically to C uint32 operations',
        'Mask with `& 0xFFFFFFFF`, because Python ints are arbitrary-precision: shifted bits never fall off the top, and `~x` produces the negative value `-x - 1` rather than a flipped 32-bit pattern',
        'Use the unsigned shift operator `x >>> 4` instead of `<<`',
        'Round-trip through `bin()` and slice off the overflowing characters',
      ],
      correctIndex: 1,
      explanation:
        'Python has no fixed word width: x << 4 keeps growing past bit 31, and ~x is defined arithmetically as -x - 1 (an infinite conceptual sign extension), so both diverge from C uint32 semantics until you stencil back to 32 bits with & 0xFFFFFFFF. There is no >>> operator in Python at all, and string slicing is a slow, error-prone imitation of what one AND does directly.',
    },
    {
      id: 'q8',
      kind: 'complexity',
      prompt:
        'Reversing the bits of a w-bit word with the mask-and-shift method ("swap halves, then quarters, then ...") takes how many stages, as a function of the width w?',
      choices: [
        'O(w) stages — one per bit position',
        'O(log w) stages — the block size halves at each stage',
        'O(w log w) stages',
        'O(1) — a single well-chosen AND reverses the word',
      ],
      correctIndex: 1,
      explanation:
        'The method unrolls the recursion "swap the halves, then reverse each half": block sizes go w/2, w/4, ..., 1, which is log2(w) levels (5 for a 32-bit word), and each level is a constant number of shifts/ANDs/ORs because all swaps at that level happen in parallel. O(w) describes the bit-by-bit loop the trick replaces. No single AND can reverse a word — AND can only clear bits, never move them.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'What does n & (n - 1) do, and what are its two headline uses?',
      back: 'Erases the lowest set bit of n. Uses: Kernighan popcount (loop once per set bit) and the power-of-two test (n > 0 and n & (n - 1) == 0).',
    },
    {
      id: 'f2',
      front: 'What does n & -n give you, and why does it work?',
      back: "Isolates the lowest set bit (e.g. 12 & -12 = 4). Two's complement negation flips all bits and adds 1, so n and -n agree only at that lowest set bit.",
    },
    {
      id: 'f3',
      front: 'Which XOR properties power the "find the element appearing once among pairs" fold?',
      back: 'Self-inversion (a ^ a = 0), identity (a ^ 0 = a), plus associativity and commutativity so the order of the stream never matters. Pairs annihilate; the loner survives.',
    },
    {
      id: 'f4',
      front: 'One-liners: read, set, clear, and toggle bit k of n?',
      back: 'Read: (n >> k) & 1. Set: n | (1 << k). Clear: n & ~(1 << k). Toggle: n ^ (1 << k).',
    },
    {
      id: 'f5',
      front: 'Constant-time power-of-four test (no loops)?',
      back: 'n > 0 and n & (n - 1) == 0 and (n & 0x55555555) != 0 — exactly one set bit, AND that bit at an even position (the 0x55555555 stencil covers bits 0, 2, ..., 30).',
    },
    {
      id: 'f6',
      front: 'O(n) recurrence for a popcount table over 0..n?',
      back: 'bits[i] = bits[i >> 1] + (i & 1): i is just i >> 1 with one extra low digit. Equivalent: bits[i] = bits[i & (i - 1)] + 1. Seed bits[0] = 0.',
    },
    {
      id: 'f7',
      front: 'Pitfall: emulating 32-bit unsigned math in Python — what breaks and what is the fix?',
      back: 'Python ints never overflow: left shifts grow forever and ~x is -x - 1, not a flipped word. Stencil back with & 0xFFFFFFFF wherever C would have wrapped; there is no >>> operator.',
    },
    {
      id: 'f8',
      front: 'Pitfall: why is `n & 1 == 0` a bug in Python and C?',
      back: '== binds tighter than &, so it parses as n & (1 == 0) = n & 0 = 0 (falsy) for every n. Always parenthesize: (n & 1) == 0.',
    },
    {
      id: 'f9',
      front: 'Template move: reverse all bits of a 32-bit word without a loop?',
      back: 'Five parallel block swaps — v = ((v >> s) & m) | ((v & m) << s) for (s, m) = (16, 0x0000FFFF), (8, 0x00FF00FF), (4, 0x0F0F0F0F), (2, 0x33333333), (1, 0x55555555). O(log w) stages for a w-bit word.',
    },
    {
      id: 'f10',
      front: 'Signals that a problem wants bit manipulation rather than a hash map?',
      back: 'Everything-appears-an-even-number-of-times-except-one (XOR), explicit "32-bit"/flags/mask language, O(1)-space demands, power-of-two-shaped checks, or set operations over a universe of at most ~64 items (a bitmask IS the set).',
    },
  ],
  cheatSheet: {
    tldr:
      'Treat an integer as a row of switches and operators as stencils acting on all of them at once: AND keeps stenciled bits, OR paints them on, XOR flips them (and undoes itself), shifts slide the row. Two workhorse identities do most interview damage: n & (n - 1) erases the lowest set bit (popcount, power-of-two tests), and XOR self-inversion cancels anything appearing an even number of times (lone-element folds). For fixed-width work, masks compose into word-parallel tricks — reversing 32 bits in five swap stages — but in Python you must impose the width yourself with & 0xFFFFFFFF, because ints never overflow.',
    signals: [
      'Reach for this when every value appears an even number of times except one (or parity is the question) — XOR fold, one variable of state.',
      'Reach for this when you see flags, masks, registers, permissions, or an explicit fixed width like "32-bit unsigned" — the problem is about the representation itself.',
      'Reach for this for power-of-two-shaped checks (alignment, tree levels, texture sizes): n > 0 and n & (n - 1) == 0, plus a position stencil like 0x55555555 for powers of four.',
      'Reach for this when a set lives in a tiny universe (<= 64 elements): a bitmask is the set, with union |, intersection &, membership (s >> i) & 1.',
      'Be suspicious when values are unbounded and you need counts or indices — a hash map wins; bits only beat it when the guarantee is parity-shaped or the width is fixed.',
    ],
    template: `# Stencil toolbox (k = bit index)
read   = (n >> k) & 1          # test bit k
n |= (1 << k)                  # set bit k
n &= ~(1 << k)                 # clear bit k
n ^= (1 << k)                  # toggle bit k
low    = n & -n                # isolate lowest set bit
n &= n - 1                     # erase lowest set bit

# XOR fold: lone value among exact pairs
acc = 0
for x in values:
    acc ^= x                   # pairs annihilate, loner survives

# Power of two / four (constant time, no loops)
is_pow2 = n > 0 and n & (n - 1) == 0
is_pow4 = is_pow2 and (n & 0x55555555) != 0

# Fixed-width discipline in Python
MASK32 = 0xFFFFFFFF
n = (n << 4) & MASK32          # impose the word width yourself`,
    complexity:
      'Single-word ops O(1); folding/scanning n values O(n) time with O(1) space; word-parallel tricks O(log w) stages for a w-bit word.',
  },
}

export default mod
