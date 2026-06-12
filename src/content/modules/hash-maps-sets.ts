import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'hash-maps-sets',
  visualizer: 'hash-map',
  concept: `
## The coat-check counter

Picture a coat check at a theater. You hand over your coat, get ticket #347, and walk away. At the end of the night you don't watch the attendant rummage through every coat on the rack — you hand over the ticket and the coat appears. The ticket number *is* the location. That's a hash map: a function turns your key into a slot number, and the value is sitting right there in that slot. No searching, no scanning, just "compute the address, go there."

A hash **set** is the same counter with no coats — only tickets. It answers exactly one question, but answers it instantly: *have I seen this before?* That single question, asked cheaply, is the engine behind a huge fraction of interview problems.

The deeper idea: hash maps let you **trade space for time**. Almost every brute-force pair of nested loops is secretly asking "for this element, does a matching partner exist?" — and a hash structure answers that in \`O(1)\` instead of re-scanning in \`O(n)\`. You pay memory to remember what you've already walked past.

## Mechanics

Three moves cover most problems:

**1. Remember-then-check (one pass).** As you scan, ask the map a question about the *current* element ("does my complement exist?"), then record the current element for future iterations. Order matters — check before you insert, or an element can match itself.

**2. Count first, decide second (two passes).** Build a frequency table in one sweep, then make decisions against it: first unique item, multiset containment, majority element.

**3. Canonical keys.** When "equal" means something fuzzier than \`==\` — anagrams, rotated strings, points on the same line — design a key that all equivalent items share. Sort the letters, freeze the counts into a tuple, normalize the fraction. Equivalent things now collide on purpose, and grouping is free.

\`\`\`python
def has_pair_summing_to(nums: list[int], target: int) -> bool:
    seen = set()                      # everything to my left
    for x in nums:
        if target - x in seen:        # ask first...
            return True
        seen.add(x)                   # ...then remember
    return False
\`\`\`

For grouping, the shape is a dictionary of lists keyed by canonical form:

\`\`\`python
from collections import defaultdict
groups = defaultdict(list)
for word in words:
    groups["".join(sorted(word))].append(word)   # canonical key
\`\`\`

## When to reach for it

Concrete signals that a hash map or set is the move:

- The brute force is two nested loops and the inner loop is just *searching* for something — a complement, a duplicate, a match.
- The problem says "first / any / count of" something **unique, repeated, or missing**.
- You need to **group** items that are "the same" under some transformation (anagrams, normalized emails, equivalent fractions).
- You're told the input is **unsorted** and the target complexity is \`O(n)\` — sorting would cost \`O(n log n)\`, so a hash structure is usually how you beat it.
- You need to check containment of one collection inside another, with multiplicities — that's two \`Counter\` objects and a comparison.

And a signal that it's *not* the move: if the data is already sorted, or you need *nearest / smallest greater than / range* queries, a hash map can't help — its whole power is exact-key lookup. Reach for two pointers, binary search, or a sorted container instead.

## Complexity

Insert, lookup, and delete are \`O(1)\` on average — amortized, because resizes occasionally cost \`O(n)\` but are rare enough to wash out. Worst case is \`O(n)\` if every key lands in the same bucket, which in practice means adversarial inputs or a terrible hash function, not everyday code. A full pattern run — one scan with constant-time map operations — is \`O(n)\` time and up to \`O(n)\` extra space. Canonical-key grouping with sorted-string keys costs \`O(n * k log k)\` where \`k\` is the max key length.

## Common pitfalls

- **Inserting before checking.** In complement problems, adding the current element first lets \`x\` pair with itself when \`target == 2x\`. Check, then insert.
- **Unhashable keys.** Lists and dicts can't be keys in Python. Convert to a \`tuple\`, a \`frozenset\`, or a string.
- **Assuming order.** Python dicts preserve *insertion* order, but if the problem demands sorted output, sort explicitly — don't rely on whatever order the map hands back.
- **Forgetting multiplicity.** A set silently collapses duplicates. If "how many" matters, you need a \`Counter\`, not a set.
- **Mutating while iterating.** Adding or deleting keys inside \`for k in d:\` raises at runtime. Iterate over a snapshot (\`list(d)\`) or collect changes and apply after.
- **Worst-case hand-waving.** If an interviewer pushes on guarantees, know that \`O(1)\` is *expected*, not promised — and that a balanced tree gives a true \`O(log n)\` bound when that matters.
`.trim(),
  realWorldUses: [
    {
      title: 'Hash joins in database engines',
      description:
        'When a SQL engine joins two tables on a key, it often builds an in-memory hash table over the smaller table, then streams the larger table through it, probing for matches — the same remember-then-check move as a one-pass complement search, scaled to millions of rows.',
    },
    {
      title: 'Deduplication in crawlers and stream pipelines',
      description:
        'Web crawlers keep a "seen URL" set so they never fetch the same page twice, and stream processors use the same idea for exactly-once semantics — checking event IDs against a hash set (or its probabilistic cousin, a Bloom filter) before doing work.',
    },
    {
      title: 'Caches and session stores',
      description:
        'Redis and Memcached are, at heart, giant networked hash maps: session tokens, rate-limit counters, and memoized API responses all live behind O(1) key lookups, which is why a cache hit is orders of magnitude cheaper than recomputing.',
    },
  ],
  problems: [
    {
      id: 'gift-card-pair',
      title: 'Gift Card Exact Spend',
      difficulty: 'easy',
      statement: `
A boutique runs a promotion: if a customer can pick **exactly two** items whose prices add up to *exactly* the balance on their gift card, both items ship free.

You're given \`prices\`, a list of integer prices in the order items appear on the shelf (a price can be negative — clearance adjustments show up as negative line items), and \`balance\`, the gift card balance.

Return the indices of the two items as a list \`[i, j]\` with \`i < j\`. If several pairs work, return the pair that **completes first when scanning left to right** — that is, the smallest possible \`j\`, and for that \`j\`, the smallest matching \`i\`. If no pair works, return an empty list \`[]\`.

Each item may be used at most once (the two indices must be distinct).
`.trim(),
      examples: [
        {
          input: 'prices = [12, 7, 3, 9], balance = 10',
          output: '[1, 2]',
          explanation: 'prices[1] + prices[2] = 7 + 3 = 10. The pair completes at index 2, earlier than any other.',
        },
        {
          input: 'prices = [6, 2, 4, 2, 6], balance = 8',
          output: '[0, 1]',
          explanation:
            'Several pairs sum to 8 — (0,1), (3,4), (1,4) — but scanning left to right, the first index j whose complement already appeared is j = 1, paired with i = 0.',
        },
        {
          input: 'prices = [1, 2, 3], balance = 100',
          output: '[]',
          explanation: 'No two items sum to 100, so return an empty list.',
        },
      ],
      constraints: [
        '0 <= len(prices) <= 10^5',
        '-10^9 <= prices[i] <= 10^9',
        '-10^9 <= balance <= 10^9',
        'Indices in the answer must satisfy i < j',
      ],
      hints: [
        'The brute force checks every pair — O(n²). What is the inner loop really doing? It is searching for one specific number.',
        'As you walk the list, for the current price x you need to know: "has balance - x appeared earlier, and at what index?" A dictionary mapping price → index answers that in O(1).',
        'Scan left to right. For each j, compute c = balance - prices[j]; if c is in the map, return [map[c], j] immediately. Only insert prices[j] into the map if that price is not already a key — keeping the first occurrence guarantees the smallest i.',
      ],
      functionName: 'gift_card_pair',
      starterCode: `def gift_card_pair(prices: list[int], balance: int) -> list[int]:
    pass
`,
      solution: {
        code: `def gift_card_pair(prices: list[int], balance: int) -> list[int]:
    # Maps a price we've already walked past -> the FIRST index it appeared at.
    seen: dict[int, int] = {}

    for j, price in enumerate(prices):
        complement = balance - price
        # Ask before we insert: has the partner already appeared to my left?
        if complement in seen:
            # seen[complement] < j always holds, so the pair is already ordered.
            return [seen[complement], j]
        # Record only the first occurrence of each price; an earlier index can
        # never be worse, and it guarantees the smallest i for a given j.
        if price not in seen:
            seen[price] = j

    # Walked the whole shelf without completing a pair.
    return []
`,
        commentary: `
The brute force compares every pair — \`O(n^2)\` — but the inner loop is doing nothing except *searching* for one exact value: \`balance - prices[j]\`. Exact-value search is precisely what a hash map turns into an \`O(1)\` question.

So we make a single left-to-right pass. The dictionary \`seen\` holds every price to our left, mapped to the first index where it appeared. At each \`j\` we **ask first** ("is my complement already in the map?") and **insert second**. That ordering matters twice over: it prevents an item from pairing with itself when \`balance == 2 * prices[j]\`, and it means any hit we find has \`i < j\` automatically — no sorting of the answer needed.

The tie-breaking rule falls out of the structure for free. Because we return on the *first* \`j\` whose complement exists, \`j\` is minimal; because we never overwrite an existing key, the stored index for the complement is its earliest occurrence, so \`i\` is minimal for that \`j\`. If the loop ends without a hit, no valid pair exists and we return \`[]\`.
`.trim(),
        complexity: 'Time O(n), Space O(n)',
      },
      testCases: [
        { input: [[12, 7, 3, 9], 10], expected: [1, 2], label: 'basic pair' },
        { input: [[5, 5], 10], expected: [0, 1], label: 'duplicate values pair' },
        { input: [[1, 2, 3], 100], expected: [], label: 'no pair exists' },
        { input: [[-2, 10, 8, 12], 10], expected: [0, 3], label: 'negative price' },
        { input: [[4], 8], expected: [], hidden: true, label: 'single item cannot pair with itself' },
        { input: [[], 5], expected: [], hidden: true, label: 'empty shelf' },
        { input: [[3, 3, 3], 6], expected: [0, 1], hidden: true, label: 'all equal, earliest pair wins' },
        { input: [[0, 0, 7], 0], expected: [0, 1], hidden: true, label: 'zero balance' },
        { input: [[6, 2, 4, 2, 6], 8], expected: [0, 1], hidden: true, label: 'multiple pairs, deterministic tie-break' },
      ],
      furtherPractice: [
        { name: 'LeetCode 1. Two Sum', note: 'the classic version of this exact move' },
        { name: 'LeetCode 219. Contains Duplicate II', note: 'same map-of-indices idea, different question' },
      ],
    },
    {
      id: 'scrambled-tags',
      title: 'Scrambled Inventory Tags',
      difficulty: 'medium',
      statement: `
A warehouse prints inventory tags as lowercase strings, but a firmware bug shuffles the letters of each tag at print time. Two printed tags refer to the **same product** if and only if one is a rearrangement of the other — same letters, same counts, any order.

Given \`tags\`, a list of printed tags (duplicates possible — the same physical tag can be printed twice), group the tags by product and return a list of groups.

To make the output deterministic:

- **within each group**, sort the tags in ascending lexicographic order (keep duplicates — if a tag was printed twice, it appears twice in its group);
- then sort the **groups themselves** in ascending lexicographic order of each group's first tag.
`.trim(),
      examples: [
        {
          input: 'tags = ["pat", "tap", "apt", "dog", "god"]',
          output: '[["apt", "pat", "tap"], ["dog", "god"]]',
          explanation:
            '"pat", "tap", "apt" all use the letters {a, p, t}, so they are one product; "dog" and "god" are another. Each group is sorted, and the groups are ordered by first element ("apt" < "dog").',
        },
        {
          input: 'tags = ["ab", "ba", "ab"]',
          output: '[["ab", "ab", "ba"]]',
          explanation: 'All three printings are the same product. The duplicate "ab" is kept.',
        },
        {
          input: 'tags = []',
          output: '[]',
          explanation: 'No tags, no groups.',
        },
      ],
      constraints: [
        '0 <= len(tags) <= 10^4',
        '0 <= len(tags[i]) <= 100',
        'tags[i] consists of lowercase English letters (may be empty)',
      ],
      hints: [
        'Comparing every tag against every other tag to test "is this a rearrangement?" is O(n²) comparisons. Can you instead compute something identical for all rearrangements of the same tag?',
        'Sort the letters of each tag: "tap" → "apt", "pat" → "apt". Every rearrangement of the same product collapses to the same canonical string — a perfect dictionary key.',
        'Build defaultdict(list) keyed by the sorted-letters string, append each original tag to its bucket, then sort each bucket and sort the list of buckets by their first element.',
      ],
      functionName: 'group_scrambled_tags',
      starterCode: `def group_scrambled_tags(tags: list[str]) -> list[list[str]]:
    pass
`,
      solution: {
        code: `from collections import defaultdict


def group_scrambled_tags(tags: list[str]) -> list[list[str]]:
    # Bucket tags by canonical form: the tag's letters in sorted order.
    # Every rearrangement of the same product produces the same key.
    buckets: dict[str, list[str]] = defaultdict(list)
    for tag in tags:
        key = "".join(sorted(tag))   # "tap" -> "apt", "pat" -> "apt"
        buckets[key].append(tag)     # keep the original spelling (and duplicates)

    # Deterministic output: sort inside each group...
    groups = [sorted(bucket) for bucket in buckets.values()]
    # ...then sort the groups by their first (smallest) member.
    groups.sort(key=lambda g: g[0])
    return groups
`,
        commentary: `
The trap here is treating "is A a rearrangement of B?" as a pairwise question — that road leads to \`O(n^2)\` comparisons. The hash-map move is to ask a different question: *what value do all rearrangements of a product share?* Answer: their letters in sorted order. \`"tap"\`, \`"pat"\`, and \`"apt"\` all sort to \`"apt"\`. That sorted string is a **canonical key** — equivalent items collide on purpose.

With the key in hand, grouping is one pass: \`defaultdict(list)\` means we never check whether a bucket exists, we just append. Note we append the *original* tag, not the key, and we never deduplicate — the problem says a twice-printed tag appears twice.

The last two lines exist purely for determinism. Hash maps make no ordering promises useful here, so we impose one: sort each bucket, then sort the buckets by their first element (which, post-sort, is each group's lexicographic minimum). An alternative canonical key — a 26-tuple of letter counts — avoids the per-tag sort and drops the key cost from \`O(k log k)\` to \`O(k)\`, worth mentioning in an interview.
`.trim(),
        complexity: 'Time O(n · k log k) for n tags of max length k (plus output sorting), Space O(n · k)',
      },
      testCases: [
        {
          input: [['pat', 'tap', 'apt', 'dog', 'god']],
          expected: [
            ['apt', 'pat', 'tap'],
            ['dog', 'god'],
          ],
          label: 'two products',
        },
        { input: [['a']], expected: [['a']], label: 'single tag' },
        { input: [[]], expected: [], label: 'no tags' },
        {
          input: [['lemon', 'melon', 'lime', 'emil', 'mile']],
          expected: [
            ['emil', 'lime', 'mile'],
            ['lemon', 'melon'],
          ],
          label: 'groups ordered by first member',
        },
        { input: [['ab', 'ba', 'ab']], expected: [['ab', 'ab', 'ba']], hidden: true, label: 'duplicates kept' },
        { input: [['x', 'y', 'z']], expected: [['x'], ['y'], ['z']], hidden: true, label: 'all singleton groups' },
        {
          input: [['stone', 'notes', 'onset', 'tones', 'seton']],
          expected: [['notes', 'onset', 'seton', 'stone', 'tones']],
          hidden: true,
          label: 'one big group',
        },
        {
          input: [['', '', 'ab']],
          expected: [['', ''], ['ab']],
          hidden: true,
          label: 'empty-string tags',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 49. Group Anagrams', note: 'the classic canonical-key grouping' },
        { name: 'LeetCode 242. Valid Anagram', note: 'the pairwise version — solvable with one Counter' },
      ],
    },
    {
      id: 'max-kits',
      title: 'Robot Kit Assembly Line',
      difficulty: 'medium',
      statement: `
A robotics workshop sells build-it-yourself kits. A kit's **build order** is a list of part names; a part appearing multiple times means each kit needs that many copies (e.g. \`["bolt", "bolt", "panel"]\` means every kit needs 2 bolts and 1 panel).

The workshop's **inventory** is also a list of part names, one entry per physical part in stock, in no particular order.

Given \`order\` (non-empty) and \`inventory\`, return the **maximum number of complete kits** the workshop can assemble. Parts are consumed: a part used in one kit can't be reused in another. Extra parts in inventory that the order doesn't mention are simply ignored. If even one kit can't be completed, return \`0\`.
`.trim(),
      examples: [
        {
          input: 'order = ["bolt", "bolt", "panel"], inventory = ["bolt", "panel", "bolt", "bolt", "panel"]',
          output: '1',
          explanation:
            'Each kit needs 2 bolts and 1 panel. Stock has 3 bolts and 2 panels: bolts allow 3 // 2 = 1 kit, panels allow 2 // 1 = 2 kits. The scarcest part wins, so the answer is 1.',
        },
        {
          input: 'order = ["wheel"], inventory = ["wheel", "wheel", "wheel"]',
          output: '3',
          explanation: 'One wheel per kit, three wheels in stock: 3 kits.',
        },
        {
          input: 'order = ["a", "b"], inventory = ["a", "a", "a"]',
          output: '0',
          explanation: 'No "b" in stock at all, so not even one kit can be completed.',
        },
      ],
      constraints: [
        '1 <= len(order) <= 10^4',
        '0 <= len(inventory) <= 10^5',
        'Part names are non-empty lowercase strings',
      ],
      hints: [
        'Simulating kit-by-kit assembly works but is slow if the answer is huge. What two summaries of the input would let you answer with arithmetic instead of simulation?',
        'Count both sides: how many of each part one kit NEEDS, and how many of each part you HAVE. For a single part, how many kits does the stock of that part support?',
        'Part p supports have[p] // need[p] kits (integer division; a missing part gives 0). The kit count is the minimum of that ratio across every distinct part in the order — the bottleneck part decides.',
      ],
      functionName: 'max_kits',
      starterCode: `def max_kits(order: list[str], inventory: list[str]) -> int:
    pass
`,
      solution: {
        code: `from collections import Counter


def max_kits(order: list[str], inventory: list[str]) -> int:
    # Multiset of what one kit consumes: part -> copies needed per kit.
    need = Counter(order)
    # Multiset of what's on the shelves: part -> copies in stock.
    have = Counter(inventory)

    # Each part independently caps the kit count at have // need.
    # Counter returns 0 for missing keys, so an absent part yields 0 kits.
    return min(have[part] // need[part] for part in need)
`,
        commentary: `
This is multiset containment with a twist: instead of asking *whether* the order fits inside the inventory once, we ask *how many times* it fits. Both questions start the same way — collapse each list into a frequency table with \`Counter\`, because once you know the counts, the original ordering of either list is irrelevant noise.

The insight that kills the simulation approach: parts are independent. The bolts in stock support \`have["bolt"] // need["bolt"]\` kits no matter what happens with panels. So the whole answer is a min-reduce over the parts the order mentions — the **bottleneck part** decides, exactly like the slowest stage capping a pipeline's throughput.

Two details earn their keep in the code. First, \`Counter\` returns \`0\` for missing keys instead of raising, so a part with zero stock naturally produces \`0 // need = 0\` and drags the min to zero — the "can't build even one" case needs no special branch. Second, we iterate over \`need\`, not \`have\`: parts the order never mentions must not influence the answer. The yes/no containment question is just \`max_kits(...) >= 1\`.
`.trim(),
        complexity: 'Time O(n + m) for order length n and inventory length m, Space O(n + m)',
      },
      testCases: [
        {
          input: [
            ['bolt', 'bolt', 'panel'],
            ['bolt', 'panel', 'bolt', 'bolt', 'panel'],
          ],
          expected: 1,
          label: 'bottleneck part',
        },
        { input: [['wheel'], ['wheel', 'wheel', 'wheel']], expected: 3, label: 'single part type' },
        { input: [['gear'], []], expected: 0, label: 'empty inventory' },
        {
          input: [
            ['nut', 'bolt', 'nut'],
            ['bolt', 'nut', 'bolt', 'nut', 'nut', 'nut', 'bolt'],
          ],
          expected: 2,
          label: 'mixed counts',
        },
        { input: [['a', 'b'], ['a', 'a', 'a']], expected: 0, hidden: true, label: 'missing part entirely' },
        {
          input: [
            ['led', 'led', 'led'],
            ['led', 'led', 'led', 'led', 'led', 'led', 'led', 'led', 'led', 'led'],
          ],
          expected: 3,
          hidden: true,
          label: 'integer division rounds down',
        },
        { input: [['x'], ['x']], expected: 1, hidden: true, label: 'minimal exact fit' },
        {
          input: [
            ['p', 'q'],
            ['q', 'p', 'q', 'p', 'q', 'p'],
          ],
          expected: 3,
          hidden: true,
          label: 'balanced stock',
        },
      ],
      furtherPractice: [
        { name: 'LeetCode 383. Ransom Note', note: 'the yes/no version of this problem' },
        { name: 'LeetCode 1160. Find Words That Can Be Formed by Characters', note: 'containment checked many times' },
      ],
    },
    {
      id: 'badge-streak',
      title: 'Festival Badge Streak',
      difficulty: 'hard',
      statement: `
A music festival issues numbered badges, but attendance is patchy: the scanner log is an **unsorted** list of integer badge numbers, possibly with duplicates (re-entries) and possibly with negative numbers (staff badges use a negative range).

The organizers want to brag about the longest **streak**: the largest set of consecutive integers \`v, v+1, v+2, ..., v+L-1\` such that every one of those badge numbers appears somewhere in the log.

Given \`badges\`, return the length \`L\` of the longest streak. An empty log has streak length \`0\`. Duplicates count once — a badge scanned five times is still one badge.

**Target:** \`O(n)\` time. Sorting the log first is the obvious \`O(n log n)\` route; the interviewer wants you to beat it.
`.trim(),
      examples: [
        {
          input: 'badges = [4, 1, 3, 2, 10]',
          output: '4',
          explanation: 'The numbers 1, 2, 3, 4 are all present — a streak of length 4. Badge 10 stands alone.',
        },
        {
          input: 'badges = [0, -2, 1, -1]',
          output: '4',
          explanation: 'The streak -2, -1, 0, 1 spans negative and non-negative numbers.',
        },
        {
          input: 'badges = [5, 5, 5]',
          output: '1',
          explanation: 'Only one distinct badge number, so the longest streak has length 1.',
        },
        {
          input: 'badges = []',
          output: '0',
          explanation: 'No badges scanned, no streak.',
        },
      ],
      constraints: [
        '0 <= len(badges) <= 10^5',
        '-10^9 <= badges[i] <= 10^9',
        'Duplicates may appear; they count once',
        'Expected solution runs in O(n) time',
      ],
      hints: [
        'Sorting gives O(n log n). To beat it, what cheap question — askable in O(1) — about a single badge number would let you walk a streak step by step?',
        'The question is "is v+1 present?" Dump everything into a set so it costs O(1). From any number v you could walk upward (v+1, v+2, ...) counting hits — but doing that from EVERY number re-walks the same streaks and degrades to O(n²) on input like [1..n].',
        'Only start walking from numbers that BEGIN a streak: n is a start iff n-1 is not in the set. Every streak is then walked exactly once, from its left end, and total work across all walks is O(n).',
      ],
      functionName: 'longest_badge_streak',
      starterCode: `def longest_badge_streak(badges: list[int]) -> int:
    pass
`,
      solution: {
        code: `def longest_badge_streak(badges: list[int]) -> int:
    # The set kills duplicates and gives O(1) "is this number present?" probes.
    present = set(badges)
    best = 0

    for n in present:
        # Gatekeeper: only expand from the LEFT END of a streak.
        # If n-1 exists, n is mid-streak and its run will be (or was)
        # counted from its true start — skip it in O(1).
        if n - 1 not in present:
            length = 1
            # Walk right while the next consecutive number exists.
            while n + length in present:
                length += 1
            best = max(best, length)

    return best
`,
        commentary: `
A set answers "is badge \`v\` present?" in \`O(1)\`, which turns "find consecutive runs" into "stand on a number and walk right while \`n + 1\`, \`n + 2\`, ... keep hitting." The danger is walking from *every* number: on input \`[1, 2, ..., n]\` that re-walks one long streak from \`n\` different starting points — \`O(n^2)\`.

The fix is the gatekeeper check, and it's the whole problem: \`if n - 1 not in present\`. A number passes only if it is the **left end** of its streak. Mid-streak numbers are rejected after a single \`O(1)\` probe, so each streak gets walked exactly once, from its true start, for its full length.

Why is the total \`O(n)\`? Amortize: every element is touched at most twice — once by its own gatekeeper probe, and once when the walk from its streak's start steps over it. Two touches per element is \`O(n)\` overall, even though the code has a loop inside a loop. The nesting is real; the re-work isn't. Duplicates, negatives, and the empty log all fall out for free: the set collapses repeats, integers don't care about sign, and an empty set just never enters the loop, leaving \`best = 0\`.
`.trim(),
        complexity: 'Time O(n), Space O(n)',
      },
      testCases: [
        { input: [[4, 1, 3, 2, 10]], expected: 4, label: 'streak with outlier' },
        { input: [[0, -2, 1, -1]], expected: 4, label: 'negative numbers' },
        { input: [[]], expected: 0, label: 'empty log' },
        { input: [[7]], expected: 1, label: 'single badge' },
        { input: [[5, 5, 5]], expected: 1, hidden: true, label: 'all duplicates' },
        { input: [[10, 30, 20]], expected: 1, hidden: true, label: 'no consecutive pairs' },
        { input: [[1, 2, 0, 1]], expected: 3, hidden: true, label: 'duplicate inside streak' },
        {
          input: [[100, 4, 200, 1, 3, 2, 101, 102, 103, 104, 105]],
          expected: 6,
          hidden: true,
          label: 'two streaks, longer one wins',
        },
        { input: [[9, 8, 7, 6, 5, 4, 3, 2, 1]], expected: 9, hidden: true, label: 'reverse-sorted full streak' },
      ],
      furtherPractice: [
        { name: 'LeetCode 128. Longest Consecutive Sequence', note: 'the classic version' },
        { name: 'LeetCode 41. First Missing Positive', note: 'related presence-probing idea, O(1) space twist' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt: 'Why does a hash map achieve `O(1)` *average* lookup, rather than needing to scan stored entries?',
      choices: [
        'It keeps entries sorted by key so it can binary-search them',
        'The hash function computes a bucket index directly from the key, so lookup jumps straight to the right slot',
        'It stores every possible key up front, so all lookups are array reads',
        'It caches the most recently used keys in a faster structure',
      ],
      correctIndex: 1,
      explanation:
        'The hash function turns the key itself into an address (bucket index), so no search happens at all — that is the coat-check ticket. Sorted-plus-binary-search describes a tree or sorted array and would be O(log n); pre-storing all possible keys is a direct-address table, infeasible for large key spaces; caching recent keys describes an LRU layer, not the core mechanism.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt:
        'In a one-pass complement search (does any pair sum to `target`?), why must you check the map for the complement *before* inserting the current element?',
      choices: [
        'Inserting first would overwrite the complement if the values collide in the same bucket',
        'Checking first is faster because the map is smaller at that moment',
        'Inserting first lets the current element match itself when target equals twice its value',
        'The order does not matter; both versions are correct',
      ],
      correctIndex: 2,
      explanation:
        'If you insert x and then look for target - x, the lookup finds x itself whenever target == 2x, fabricating a "pair" that uses one element twice. Check-then-insert guarantees any hit comes from a strictly earlier element. Bucket collisions do not overwrite distinct keys, and the tiny size difference has no asymptotic effect — so the other options are wrong, including "order does not matter."',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt:
        'You build a frequency `Counter` over a list of `n` items, then answer `m` membership/count queries against it. What is the total time complexity?',
      choices: ['`O(n * m)`', '`O(n + m)`', '`O(n log n + m)`', '`O(m log n)`'],
      correctIndex: 1,
      explanation:
        'Building the counter is one pass at O(1) amortized per insert — O(n) — and each query is an O(1) average lookup, so m queries cost O(m), giving O(n + m) total. O(n * m) is the no-preprocessing brute force where every query rescans the list; the log factors would only appear with sorted structures or trees.',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt: 'What is the *worst-case* time for a single lookup in a hash map, and when does it occur?',
      choices: [
        '`O(1)` — hash lookups are constant time by definition',
        '`O(log n)` — when the buckets form a balanced tree',
        '`O(n)` — when many keys collide into the same bucket',
        '`O(n log n)` — when the table resizes during the lookup',
      ],
      correctIndex: 2,
      explanation:
        'If every key hashes to the same bucket (adversarial keys or a bad hash function), lookup degenerates into scanning a list of n entries — O(n). The O(1) guarantee is average/expected, not absolute. Some implementations (like Java 8 HashMap) tree-ify hot buckets to O(log n), but that is a mitigation, not the general worst case; resizing affects inserts, not lookups.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'Problem: given an **unsorted** array, determine in a single pass whether any two elements sum to `k`. Which approach fits best?',
      choices: [
        'Sort the array, then converge two pointers from both ends',
        'Scan once, keeping a hash set of seen values and probing for k minus the current value',
        'Compute prefix sums and look for a window summing to k',
        'Use a sliding window that grows while the sum is under k',
      ],
      correctIndex: 1,
      explanation:
        'The hash-set scan is O(n) time in one pass, exactly as asked. Two pointers is the tempting distractor — it solves the same question elegantly but requires sorted input, so here it costs O(n log n) and is not single-pass. Prefix sums and sliding windows target contiguous subarray sums, a different question entirely (and sliding windows on sums also assume non-negative values).',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'Problem: given a **sorted** array, find two elements summing to `k` using `O(1)` extra space. Which approach fits best?',
      choices: [
        'A hash set of seen values, probing for complements',
        'A Counter built over the whole array',
        'Two pointers converging from both ends, moving based on the current sum',
        'Binary-searching for the complement of every element',
      ],
      correctIndex: 2,
      explanation:
        'The array is already sorted and the space budget is O(1), which is the two-pointer sweet spot: O(n) time, no extra memory. The hash set is the tempting reflex from the unsorted version, but it spends O(n) space to buy nothing — sortedness already gives cheap complement-finding. The Counter has the same flaw, and binary search per element works in O(1) space but costs O(n log n), strictly worse than the pointer sweep.',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt:
        'When grouping strings that are letter-rearrangements of each other, why use each string\'s sorted characters as the dictionary key?',
      choices: [
        'Sorting makes the keys shorter, saving memory',
        'All rearrangements of the same letters produce the identical sorted string, so equivalent items land in the same bucket',
        'Dictionary keys in Python must be sorted to be hashable',
        'It guarantees the output groups come out in lexicographic order automatically',
      ],
      correctIndex: 1,
      explanation:
        'This is the canonical-key idea: pick a representative that every member of an equivalence class maps to, so "equal under rearrangement" becomes "equal as dict keys" and grouping is a single pass. Sorting does not shorten strings; hashability requires immutability, not sortedness; and bucket iteration order is insertion order — deterministic output ordering still requires an explicit sort afterward.',
    },
    {
      id: 'q8',
      kind: 'complexity',
      prompt:
        'The set-based longest-consecutive-run algorithm has a `while` loop nested inside a `for` loop, yet runs in `O(n)`. Why?',
      choices: [
        'The inner loop runs at most a constant number of times per element',
        'The set makes the inner loop O(log n), and O(n log n) rounds down to O(n)',
        'Only run-start elements (those with no predecessor in the set) trigger the walk, so each element is stepped over once across all walks combined',
        'Python optimizes nested loops over sets into a single pass internally',
      ],
      correctIndex: 2,
      explanation:
        'The n-1-not-in-set gatekeeper means walks begin only at the left end of each run, and a run of length L is walked exactly once, costing L steps total. Amortized over all elements, each is touched O(1) times, so the sum is O(n) despite the nesting. The inner loop is NOT constant per triggering element (a single walk can be long); set probes are O(1) average, not O(log n); and no interpreter magic is involved.',
    },
  ],
  flashcards: [
    {
      id: 'fc1',
      front: 'Average and worst-case cost of insert/lookup/delete in a hash map?',
      back: 'O(1) amortized average; O(n) worst case when keys pile into one bucket (bad hash or adversarial input). Say "expected O(1)" in interviews.',
    },
    {
      id: 'fc2',
      front: 'What fundamental trade does the hash map pattern make?',
      back: 'Space for time: spend O(n) memory remembering what you have seen so each "does X exist?" question costs O(1) instead of a rescan.',
    },
    {
      id: 'fc3',
      front: 'Top signal that a hash set (not a map) is enough?',
      back: 'The only question is membership — "have I seen this before?" — with no associated value, count, or index needed.',
    },
    {
      id: 'fc4',
      front: 'The one-pass complement move (two-sum style)?',
      back: 'For each element x, probe the map for target − x FIRST, then insert x. Check-before-insert prevents x from pairing with itself.',
    },
    {
      id: 'fc5',
      front: 'What is a canonical key and when do you reach for one?',
      back: 'A normalized form shared by all equivalent items (sorted letters, count tuple, reduced fraction). Use it when "equal" means equivalent-under-transformation, so grouping becomes one dict pass.',
    },
    {
      id: 'fc6',
      front: 'Why does longest-consecutive-run check `n - 1 not in seen` before walking?',
      back: 'It restricts walks to run starts, so each run is traversed exactly once — that gatekeeper is what makes the nested loops O(n) total.',
    },
    {
      id: 'fc7',
      front: 'Pitfall: which Python values cannot be dict keys, and the fix?',
      back: 'Mutable ones — lists, dicts, sets. Convert to tuple, frozenset, or string before keying.',
    },
    {
      id: 'fc8',
      front: 'Multiset containment test: can A be assembled from B\'s parts?',
      back: 'Counter both sides and require need[k] <= have[k] for every key in need. For "how many times?", take min(have[k] // need[k]) over keys of need.',
    },
    {
      id: 'fc9',
      front: 'When is a hash map the WRONG tool?',
      back: 'When you need order: nearest key, range queries, min/max, or sorted traversal. Exact-key lookup is its only superpower — use sorted structures, heaps, or two pointers instead.',
    },
    {
      id: 'fc10',
      front: 'What does `defaultdict(list)` buy you when grouping?',
      back: 'Appending to a bucket without checking if the key exists — missing keys auto-create an empty list, collapsing the get-or-create boilerplate to one line.',
    },
  ],
  cheatSheet: {
    tldr:
      'Hash maps and sets buy O(1) average exact-key lookup by spending memory, turning "search for a partner / duplicate / count" inner loops into single probes. The three core moves: remember-then-check in one pass (complements, duplicates), count-first-decide-second (frequency tables, multiset containment), and canonical keys (collapse equivalent items onto one bucket for grouping). They know nothing about order — exact match is the only question they answer fast.',
    signals: [
      'Reach for this when the brute force is nested loops and the inner loop just searches for an exact value (complement, match, duplicate).',
      'Reach for this when the problem says first/any/count of something unique, repeated, or missing.',
      'Reach for this when items must be grouped by an equivalence ("same letters", "same normalized form") — design a canonical key.',
      'Reach for this when input is unsorted and the target is O(n) — beating the O(n log n) sort usually means hashing.',
      'Avoid it when you need ordering, ranges, or nearest-key queries — that is sorted-structure / two-pointer territory.',
    ],
    template: `from collections import Counter, defaultdict

# 1) Remember-then-check: one pass, probe before insert
seen = set()
for x in items:
    if partner_of(x) in seen:   # e.g. target - x
        ...                     # found a pair
    seen.add(x)

# 2) Count first, decide second
freq = Counter(items)
# e.g. multiset containment: all(freq[k] >= need[k] for k in need)

# 3) Canonical-key grouping
groups = defaultdict(list)
for item in items:
    groups[canonical(item)].append(item)   # e.g. "".join(sorted(item))`,
    complexity: 'Build/scan O(n) time, O(n) space; per-op O(1) average (O(n) worst case); canonical keys add O(k log k) per item if sorting.',
  },
}

export default mod
