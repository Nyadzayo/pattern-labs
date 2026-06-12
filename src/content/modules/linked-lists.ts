import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'linked-lists',
  visualizer: 'linked-list',
  concept: `
## The mental model

A linked list is a scavenger hunt. Each clue — a **node** — holds exactly two things: a prize (the value) and the location of the next clue (the pointer). Nobody gives you a map of all the locations. To reach clue 500 you walk clues 1 through 499, one hop at a time. That sounds strictly worse than an array until you notice the superpower: **rerouting**. Rewrite one address on one slip of paper and you have deleted a clue, inserted a brand-new one, or redirected the entire back half of the hunt — without moving a single other node. Arrays buy \`O(1)\` random access by paying \`O(n)\` to shuffle elements on every mid-list edit; linked lists make exactly the opposite trade.

Interview problems tagged "linked list" are rarely about the structure itself. They are about **pointer surgery**: re-aiming \`next\` references in the right order without ever dropping your only handle on part of the chain. There is no undo. One careless assignment and the back half of the list floats away, unreachable forever. The whole craft is sequencing your writes so that something always points at everything you still need.

## Mechanics

A node is tiny:

\`\`\`python
class ListNode:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next
\`\`\`

Three moves cover almost every classic.

**Move 1 — save, then rewire.** This is the reversal idiom and the single most important loop in the module. \`prev\` is the already-reversed prefix, \`curr\` is the node under the knife, and the cardinal rule is: stash \`curr.next\` *before* you overwrite it, because it is your only reference to the unvisited remainder.

\`\`\`python
def reverse_chain(head):
    prev = None                 # reversed prefix (starts empty)
    curr = head
    while curr is not None:
        nxt = curr.next         # save the remainder FIRST
        curr.next = prev        # flip this one arrow
        prev = curr             # prefix grows by one node
        curr = nxt              # step into the saved remainder
    return prev                 # prev is the new head
\`\`\`

**Move 2 — the dummy (sentinel) head.** Any operation that might replace or delete the head forces an ugly special case — unless you bolt a throwaway node in front: \`dummy = ListNode(0, head)\`. Now *every real node has a predecessor*, deletion is uniformly "make the predecessor skip the victim," and you return \`dummy.next\` at the end. Merging two sorted chains uses the same trick: grow the result from a dummy via a \`tail\` pointer, repeatedly splicing on whichever input head is smaller.

**Move 3 — runner pointers.** Send two cursors down the chain at an offset. To unlink the k-th node from the end in one pass, advance a \`lead\` pointer \`k\` hops, then march \`lead\` and \`trail\` together; when \`lead\` falls off the end, \`trail\` sits exactly one node before the victim. A slow/fast pair (one hop vs. two) finds the middle in one pass — the gateway to "reverse the back half and compare" palindrome checks. (Cycle detection with slow/fast gets its own module.)

## When to reach for it

- The input *is* a chain of nodes, or the problem says **"in place"**, **"O(1) extra space"**, or "without converting to an array." That bans the copy-out-and-index shortcut.
- You must **restructure order** — reverse a run, splice one chain into another, partition around a value — while reusing the existing nodes.
- A position is described **relative to the end or the middle** ("k-th from the end," "second half") and you only get **one pass**: runner pointers.
- The head itself might be deleted or replaced: reach for a dummy node before writing any branches.
- You're designing for **O(1) insert/delete at a known position** under churn (queues, free lists, LRU chains) where arrays would shuffle.

If instead you need random access, repeated indexing, or binary search, a linked list is the wrong vehicle — pointers buy splicing, not jumping.

## Complexity

Traversal touches each node once: \`O(n)\` time. The headline win is that a splice — insert or delete *given the predecessor* — is \`O(1)\`, but *finding* that predecessor is \`O(n)\`, and reading index \`k\` costs \`O(k)\` versus an array's \`O(1)\`. The classics all land in the same place: reversal is \`O(n)\` time and \`O(1)\` space; merging chains of lengths m and n is \`O(m + n)\` time with \`O(1)\` extra space because you relink existing nodes instead of allocating; the one-pass k-from-end delete and the in-place palindrome check are both \`O(n)\` time, \`O(1)\` space. Recursion is the quiet exception: a recursive reversal looks elegant but hides an \`O(n)\` call stack — say so out loud in an interview.

## Common pitfalls

- **Losing the remainder.** Writing \`curr.next = prev\` before saving \`curr.next\` orphans the rest of the chain. Save first, always.
- **Head special cases.** Code that works mid-list but crashes when the head is deleted or the list is empty. A dummy node erases the entire bug class.
- **None dereferences.** Guard \`fast.next\` before touching \`fast.next.next\`; check empty and single-node chains explicitly.
- **Off-by-one in the runner gap.** Starting \`trail\` at the head instead of the dummy leaves you *on* the victim instead of *before* it — and you cannot unlink a node you have no predecessor for.
- **Accidental cycles.** Forgetting to set the final \`next\` to \`None\` after a splice or partial reversal turns your next traversal into an infinite loop.
- **Trashing the caller's data.** If you reverse a sub-chain to inspect it (palindrome check), restore it before returning unless the contract says otherwise.
`,
  realWorldUses: [
    {
      title: 'Free lists inside memory allocators',
      description:
        'Allocators like dlmalloc and jemalloc keep freed blocks of each size class threaded into linked lists. A malloc pops the head of the right list and a free pushes a block back — pure O(1) pointer splicing on chains that live inside the freed memory itself.',
    },
    {
      title: 'Intrusive lists in the Linux kernel',
      description:
        'The kernel embeds a list_head struct directly inside tasks, timers, and inodes, threading them onto doubly linked lists. A process can be unlinked from a scheduler queue in O(1) without searching, because the node carries its own prev/next pointers.',
    },
    {
      title: 'LRU eviction chains in caches',
      description:
        'memcached and countless in-process caches pair a hash map with a doubly linked list: a cache hit unlinks the entry and relinks it at the head in O(1), and eviction pops from the tail — exactly the unlink/splice surgery this module drills.',
    },
  ],
  problems: [
    {
      id: 'turntable-recoupling',
      title: 'Turntable Re-Coupling',
      difficulty: 'easy',
      statement: `
A freight depot stores a train as a chain of coupled wagons: the locomotive grabs the first wagon, that wagon's coupling points to the second, and so on down the line. Tonight's departure leaves in the **opposite direction**, so the yard crew must re-couple the entire chain in reverse: the last wagon becomes the first, every coupling flips to point the other way, and the old first wagon becomes the tail.

You receive the wagon IDs in their current front-to-back order as a plain list. Build the chain with the provided helpers, reverse it **by re-aiming the couplings** (no fair just reading the values out backwards — practice the pointer surgery), and return the new front-to-back order as a plain list.

Given \`wagon_ids\`, return the list of IDs in reversed order.
`,
      examples: [
        {
          input: 'wagon_ids = [3, 1, 4, 1, 5]',
          output: '[5, 1, 4, 1, 3]',
          explanation: 'Wagon 5 was at the back; after re-coupling it leads, and the old leader 3 is now the tail.',
        },
        {
          input: 'wagon_ids = [7]',
          output: '[7]',
          explanation: 'A single wagon has no couplings to flip; the chain is unchanged.',
        },
        {
          input: 'wagon_ids = []',
          output: '[]',
          explanation: 'An empty siding stays empty.',
        },
      ],
      constraints: [
        '0 <= len(wagon_ids) <= 100_000',
        '-10^9 <= wagon_ids[k] <= 10^9',
        'IDs may repeat (wagons from different fleets share numbers)',
        'Reverse by relinking nodes; aim for one pass and O(1) extra space beyond the chain itself',
      ],
      hints: [
        'Walk the chain one wagon at a time. At each stop, what is the one piece of information you must not lose before you touch anything?',
        'Keep two cursors: prev (the chain you have already re-coupled, growing behind you) and curr (the wagon in hand). Each step flips exactly one coupling.',
        'Loop while curr is not None: nxt = curr.next; curr.next = prev; prev = curr; curr = nxt. When curr falls off the end, prev is the new head — convert it with to_list.',
      ],
      functionName: 'reverse_wagons',
      starterCode: `class ListNode:
    """One wagon: a value plus the coupling to the next wagon."""
    def __init__(self, val: int, next: "ListNode | None" = None):
        self.val = val
        self.next = next

def build_list(values: list[int]) -> "ListNode | None":
    """Build a chain from a plain list; returns the head node (or None)."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def to_list(head: "ListNode | None") -> list[int]:
    """Walk a chain and collect its values into a plain list."""
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out

def reverse_wagons(wagon_ids: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `class ListNode:
    """One wagon: a value plus the coupling to the next wagon."""
    def __init__(self, val: int, next: "ListNode | None" = None):
        self.val = val
        self.next = next

def build_list(values: list[int]) -> "ListNode | None":
    """Build a chain from a plain list; returns the head node (or None)."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)   # prepend, so the chain matches list order
    return head

def to_list(head: "ListNode | None") -> list[int]:
    """Walk a chain and collect its values into a plain list."""
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out

def reverse_wagons(wagon_ids: list[int]) -> list[int]:
    head = build_list(wagon_ids)
    prev = None                  # the already re-coupled chain (starts empty)
    curr = head                  # the wagon being re-coupled right now
    while curr is not None:
        nxt = curr.next          # save the rest of the train BEFORE cutting it
        curr.next = prev         # flip this coupling to point backwards
        prev = curr              # the reversed chain grows by one wagon
        curr = nxt               # step into the saved remainder
    # curr fell off the end, so prev is the head of the reversed train.
    return to_list(prev)
`,
        commentary: `
The loop maintains a clean invariant: everything reachable from \`prev\` is **fully reversed**, everything reachable from \`curr\` is **untouched**, and the two chains share no nodes. Each iteration moves exactly one wagon across that frontier by flipping a single coupling.

The order of the four statements is the whole exercise. \`curr.next\` is the *only* reference to the unvisited suffix; assign \`curr.next = prev\` before saving it and the back half of the train is orphaned — Python will happily garbage-collect your cargo. So: save (\`nxt = curr.next\`), rewire, advance, advance.

When \`curr\` becomes \`None\`, the frontier has swept the whole train and \`prev\` holds the new head. Empty input never enters the loop and \`to_list(None)\` returns \`[]\` — no special cases needed. One pass, three pointers, no allocation beyond the nodes themselves.
`,
        complexity: 'Time O(n), Space O(1) beyond the chain',
      },
      testCases: [
        { input: [[3, 1, 4, 1, 5]], expected: [5, 1, 4, 1, 3], label: 'basic reversal' },
        { input: [[7]], expected: [7], label: 'single wagon' },
        { input: [[1, 2]], expected: [2, 1], label: 'minimal pair' },
        { input: [[-1, 0, 1]], expected: [1, 0, -1], label: 'negative IDs' },
        { input: [[]], expected: [], hidden: true, label: 'empty siding' },
        { input: [[2, 2, 2, 2]], expected: [2, 2, 2, 2], hidden: true, label: 'all-equal IDs' },
        {
          input: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]],
          expected: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
          hidden: true,
          label: 'longer train',
        },
        { input: [[5, 4, 3, 2, 1]], expected: [1, 2, 3, 4, 5], hidden: true, label: 'already descending' },
      ],
      furtherPractice: [
        { name: 'LeetCode 206. Reverse Linked List', note: 'the canonical version, iterative and recursive' },
        { name: 'LeetCode 92. Reverse Linked List II', note: 'reverse only a sub-range — dummy node practice' },
      ],
    },
    {
      id: 'replica-log-merge',
      title: 'Replica Log Merge',
      difficulty: 'medium',
      statement: `
Two database replicas each keep an append-only audit log as a chain of records, already sorted by integer timestamp in non-decreasing order. During nightly reconciliation, the two chains must be merged into **one** sorted chain — by **relinking the existing records**, not by copying them into a buffer and sorting (the records are large; only their couplings may move).

Given the timestamps of the primary's log and the replica's log as two plain lists, return the merged timeline as a plain list, sorted in non-decreasing order. When a primary record and a replica record carry the **same timestamp**, the primary's record must come first (it is the authoritative copy), which is exactly what a stable merge produces.

Either log may be empty.
`,
      examples: [
        {
          input: 'primary = [1, 3, 5], replica = [2, 4, 6]',
          output: '[1, 2, 3, 4, 5, 6]',
          explanation: 'The two sorted chains interleave perfectly; each step splices on whichever head is smaller.',
        },
        {
          input: 'primary = [1, 2, 8], replica = [3, 4]',
          output: '[1, 2, 3, 4, 8]',
          explanation: 'After the replica chain is exhausted, the rest of the primary (just 8) is attached in one splice.',
        },
        {
          input: 'primary = [2, 2], replica = [2]',
          output: '[2, 2, 2]',
          explanation: 'On timestamp ties the primary records go first; with equal values the output reads the same either way.',
        },
      ],
      constraints: [
        '0 <= len(primary), len(replica) <= 100_000',
        '-10^9 <= timestamps <= 10^9',
        'Both input logs are sorted in non-decreasing order',
        'Merge by relinking nodes: O(m + n) time, O(1) extra space beyond the chains',
      ],
      hints: [
        'Both chains are already sorted. At any moment, where can the smallest not-yet-merged record possibly be?',
        'Grow the result chain from its tail: repeatedly compare the two current heads, splice the smaller one onto the result, and advance that chain. A throwaway node in front of the result kills the "what starts the merged chain?" special case.',
        'dummy = ListNode(0); tail = dummy. While both heads exist: if a.val <= b.val splice a, else splice b; advance tail. When one chain runs dry, set tail.next to the other chain whole — it is already sorted. Return to_list(dummy.next).',
      ],
      functionName: 'merge_replica_logs',
      starterCode: `class ListNode:
    """One log record: a timestamp plus the link to the next record."""
    def __init__(self, val: int, next: "ListNode | None" = None):
        self.val = val
        self.next = next

def build_list(values: list[int]) -> "ListNode | None":
    """Build a chain from a plain list; returns the head node (or None)."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def to_list(head: "ListNode | None") -> list[int]:
    """Walk a chain and collect its values into a plain list."""
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out

def merge_replica_logs(primary: list[int], replica: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `class ListNode:
    """One log record: a timestamp plus the link to the next record."""
    def __init__(self, val: int, next: "ListNode | None" = None):
        self.val = val
        self.next = next

def build_list(values: list[int]) -> "ListNode | None":
    """Build a chain from a plain list; returns the head node (or None)."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def to_list(head: "ListNode | None") -> list[int]:
    """Walk a chain and collect its values into a plain list."""
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out

def merge_replica_logs(primary: list[int], replica: list[int]) -> list[int]:
    a = build_list(primary)
    b = build_list(replica)
    dummy = ListNode(0)          # sentinel: the merged head needs no special case
    tail = dummy                 # last record of the merged chain so far
    while a is not None and b is not None:
        if a.val <= b.val:       # <= keeps primary records first on ties (stable)
            tail.next = a        # splice the primary's head onto the result
            a = a.next
        else:
            tail.next = b        # splice the replica's head onto the result
            b = b.next
        tail = tail.next         # the merged chain grew by one record
    # One chain is exhausted; the survivor is already sorted, attach it whole.
    tail.next = a if a is not None else b
    return to_list(dummy.next)   # skip the sentinel
`,
        commentary: `
Because both chains are sorted, the globally smallest unmerged record is always one of the two current heads — so a single comparison per step is enough, and no record ever needs revisiting. That one observation turns merging into a linear zipper.

Two idioms carry the implementation. The **dummy node** means we never ask "is this the first record of the result?" — \`tail\` always has somewhere real to write, and the answer is just \`dummy.next\`. And the **wholesale splice** at the end matters for both correctness and speed: once one log runs dry, the remainder of the other is already sorted, so one pointer assignment attaches all of it; looping over it node by node would be wasted work.

The \`<=\` (rather than \`<\`) is the stability guarantee from the statement: on equal timestamps the primary's record is spliced first. No new record objects are created — every node in the output is a relinked input node, which is exactly why this runs in \`O(1)\` extra space.
`,
        complexity: 'Time O(m + n), Space O(1) beyond the chains',
      },
      testCases: [
        { input: [[1, 3, 5], [2, 4, 6]], expected: [1, 2, 3, 4, 5, 6], label: 'perfect interleave' },
        { input: [[1, 2, 8], [3, 4]], expected: [1, 2, 3, 4, 8], label: 'leftover tail spliced whole' },
        { input: [[], []], expected: [], label: 'both logs empty' },
        { input: [[2, 2], [2]], expected: [2, 2, 2], label: 'all-equal timestamps' },
        { input: [[], [4, 5]], expected: [4, 5], hidden: true, label: 'primary empty' },
        { input: [[4, 5], []], expected: [4, 5], hidden: true, label: 'replica empty' },
        { input: [[-3, 0, 9], [-5, 7]], expected: [-5, -3, 0, 7, 9], hidden: true, label: 'negative timestamps' },
        { input: [[1, 1, 1], [1, 1]], expected: [1, 1, 1, 1, 1], hidden: true, label: 'ties everywhere' },
        { input: [[10], [1, 2, 3, 4]], expected: [1, 2, 3, 4, 10], hidden: true, label: 'one log dominates' },
      ],
      furtherPractice: [
        { name: 'LeetCode 21. Merge Two Sorted Lists', note: 'the canonical version' },
        { name: 'LeetCode 23. Merge k Sorted Lists', note: 'same splice, k chains — add a heap' },
      ],
    },
    {
      id: 'one-pass-rollback',
      title: 'One-Pass Release Rollback',
      difficulty: 'medium',
      statement: `
A deployment system keeps every release of a service as a chain of build numbers, oldest first: the head is the very first release ever shipped and the tail is the newest. An incident review just found that the **k-th newest release** (so \`k = 1\` means the newest of all, at the tail) introduced a regression and must be unlinked from the chain.

The catch: the chain is streamed from cold storage, and the operations budget allows the stream to be read **once**. You may not first traverse to count the releases and then traverse again to find the victim.

Given the build numbers \`builds\` (oldest first) and the integer \`k\`, return the chain after unlinking the k-th node from the end, as a plain list in the same oldest-first order. The chain is non-empty and \`k\` is always valid.
`,
      examples: [
        {
          input: 'builds = [101, 102, 103, 104, 105], k = 2',
          output: '[101, 102, 103, 105]',
          explanation: 'The 2nd-newest release is 104; it is unlinked and 103 now couples directly to 105.',
        },
        {
          input: 'builds = [7], k = 1',
          output: '[]',
          explanation: 'The only release is also the newest; removing it leaves an empty chain.',
        },
        {
          input: 'builds = [40, 50], k = 2',
          output: '[50]',
          explanation: 'k equals the length, so the victim is the head itself — the case a dummy node handles for free.',
        },
      ],
      constraints: [
        '1 <= len(builds) <= 100_000',
        '1 <= k <= len(builds)',
        '-10^9 <= builds[i] <= 10^9',
        'Single pass over the chain: do not count nodes first, then traverse again',
      ],
      hints: [
        'You cannot know how far the end is until you reach it. Could a second cursor, positioned cleverly, tell you something about distance-to-the-end before you get there?',
        'Send a lead cursor k nodes ahead, then move lead and a trail cursor together one hop at a time. When lead steps off the end of the chain, how far is trail from the victim?',
        'Start trail at a dummy node in front of the head, and lead at the head. Advance lead k times, then advance both until lead is None: trail now sits just before the victim, so trail.next = trail.next.next unlinks it. Return to_list(dummy.next).',
      ],
      functionName: 'drop_kth_newest',
      starterCode: `class ListNode:
    """One release: a build number plus the link to the next release."""
    def __init__(self, val: int, next: "ListNode | None" = None):
        self.val = val
        self.next = next

def build_list(values: list[int]) -> "ListNode | None":
    """Build a chain from a plain list; returns the head node (or None)."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def to_list(head: "ListNode | None") -> list[int]:
    """Walk a chain and collect its values into a plain list."""
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out

def drop_kth_newest(builds: list[int], k: int) -> list[int]:
    pass
`,
      solution: {
        code: `class ListNode:
    """One release: a build number plus the link to the next release."""
    def __init__(self, val: int, next: "ListNode | None" = None):
        self.val = val
        self.next = next

def build_list(values: list[int]) -> "ListNode | None":
    """Build a chain from a plain list; returns the head node (or None)."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def to_list(head: "ListNode | None") -> list[int]:
    """Walk a chain and collect its values into a plain list."""
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out

def drop_kth_newest(builds: list[int], k: int) -> list[int]:
    head = build_list(builds)
    dummy = ListNode(0, head)    # sentinel: makes deleting the head uniform
    lead = head
    for _ in range(k):           # open a gap of exactly k nodes...
        lead = lead.next         # (k is valid, so this never falls off early)
    trail = dummy                # trail starts ONE BEFORE the head
    while lead is not None:      # ...then slide the whole gap to the end
        lead = lead.next
        trail = trail.next
    # lead walked off the end, so trail is exactly one node before the
    # k-th-from-the-end node. Unlink the victim with one splice.
    trail.next = trail.next.next
    return to_list(dummy.next)   # dummy.next is the (possibly new) head
`,
        commentary: `
The trick is to convert "k from the end" — which you cannot see — into "k behind another cursor" — which you can enforce. After the warm-up loop, \`lead\` is exactly \`k\` nodes ahead of the victim's predecessor-to-be. Moving both cursors in lockstep preserves that gap rigidly, so the moment \`lead\` steps past the tail, \`trail\` must be sitting one node before the k-th-from-the-end node. No counting, no second pass; every node is visited at most once between the two cursors.

The dummy node earns its keep on the \`k == len(builds)\` case: the victim is the head, which has no real predecessor. Starting \`trail\` at the sentinel means the head's predecessor *exists*, and the same one-line splice \`trail.next = trail.next.next\` covers every position, including a single-node chain collapsing to empty. Start \`trail\` at \`head\` instead and you end up standing *on* the victim with no way to unlink it — the classic off-by-one of this problem.
`,
        complexity: 'Time O(n), Space O(1) beyond the chain',
      },
      testCases: [
        { input: [[101, 102, 103, 104, 105], 2], expected: [101, 102, 103, 105], label: 'mid-chain unlink' },
        { input: [[7], 1], expected: [], label: 'only release removed' },
        { input: [[40, 50], 2], expected: [50], label: 'victim is the head' },
        { input: [[9, 8, 7], 3], expected: [8, 7], label: 'head removal, length 3' },
        { input: [[10, 20], 1], expected: [10], hidden: true, label: 'victim is the tail' },
        { input: [[4, 4, 4, 4], 3], expected: [4, 4, 4], hidden: true, label: 'all-equal builds' },
        {
          input: [[1, 2, 3, 4, 5, 6, 7, 8], 8],
          expected: [2, 3, 4, 5, 6, 7, 8],
          hidden: true,
          label: 'k equals full length',
        },
        { input: [[-5, 0, 5], 1], expected: [-5, 0], hidden: true, label: 'negative build numbers' },
      ],
      furtherPractice: [
        { name: 'LeetCode 19. Remove Nth Node From End of List', note: 'the canonical version' },
        { name: 'LeetCode 876. Middle of the Linked List', note: 'the other famous runner-gap trick' },
      ],
    },
    {
      id: 'mirrored-pulse-burst',
      title: 'Mirrored Pulse Burst',
      difficulty: 'hard',
      statement: `
An optical relay receives calibration bursts as chains of pulse amplitudes. A burst is **mirrored** if the sequence of amplitudes reads identically front-to-back and back-to-front — the relay uses such bursts to cancel out directional drift. Your validator must decide whether a burst is mirrored.

The constraint that makes this hard: the relay's firmware has almost no working memory. You may **not** copy the amplitudes into an array, a stack, or a reversed buffer and compare — the check must run in \`O(1)\` auxiliary space by operating on the chain's links directly. (The \`build_list\`/\`to_list\` helpers exist only to translate at the boundary; the algorithm between them must be pointer surgery.) The burst chain must also be left **intact** when you return: other validators read it after you.

Given the amplitudes \`pulses\`, return \`True\` if the burst is mirrored and \`False\` otherwise. An empty burst and a single-pulse burst are both mirrored.
`,
      examples: [
        {
          input: 'pulses = [3, 7, 7, 3]',
          output: 'True',
          explanation: 'Read backwards the amplitudes are 3, 7, 7, 3 — identical, so the burst is mirrored.',
        },
        {
          input: 'pulses = [1, 2, 3, 2, 1]',
          output: 'True',
          explanation: 'Odd length: the middle pulse 3 mirrors itself and needs no partner.',
        },
        {
          input: 'pulses = [1, 2, 3]',
          output: 'False',
          explanation: 'Backwards this reads 3, 2, 1, which differs at the very first pulse.',
        },
      ],
      constraints: [
        '0 <= len(pulses) <= 100_000',
        '-10^9 <= pulses[i] <= 10^9',
        'O(1) auxiliary space: no array/stack/string copies of the amplitudes',
        'The chain must be restored to its original order before returning',
      ],
      hints: [
        'Comparing the two ends of a singly linked chain is awkward — you can only walk forward. Is there a way to make the back half walkable in the order you need, using only the chain itself?',
        'Two sub-skills you already have combine here: a slow/fast cursor pair can find the middle in one pass, and the reversal loop can flip a half-chain in place. After both, what two walks line up?',
        'Find the middle (slow one hop, fast two), reverse everything after it in place, then walk one cursor from the head and one from the reversed back half, comparing values. Reverse the back half again and re-attach it before returning, so the chain is restored.',
      ],
      functionName: 'is_mirrored_burst',
      starterCode: `class ListNode:
    """One pulse: an amplitude plus the link to the next pulse."""
    def __init__(self, val: int, next: "ListNode | None" = None):
        self.val = val
        self.next = next

def build_list(values: list[int]) -> "ListNode | None":
    """Build a chain from a plain list; returns the head node (or None)."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def to_list(head: "ListNode | None") -> list[int]:
    """Walk a chain and collect its values into a plain list."""
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out

def is_mirrored_burst(pulses: list[int]) -> bool:
    pass
`,
      solution: {
        code: `class ListNode:
    """One pulse: an amplitude plus the link to the next pulse."""
    def __init__(self, val: int, next: "ListNode | None" = None):
        self.val = val
        self.next = next

def build_list(values: list[int]) -> "ListNode | None":
    """Build a chain from a plain list; returns the head node (or None)."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def to_list(head: "ListNode | None") -> list[int]:
    """Walk a chain and collect its values into a plain list."""
    out = []
    while head is not None:
        out.append(head.val)
        head = head.next
    return out

def _reverse(head: "ListNode | None") -> "ListNode | None":
    """Standard in-place reversal; returns the new head."""
    prev = None
    while head is not None:
        nxt = head.next          # save the remainder before rewiring
        head.next = prev
        prev = head
        head = nxt
    return prev

def is_mirrored_burst(pulses: list[int]) -> bool:
    head = build_list(pulses)
    # Empty or single-pulse bursts are mirrored by definition.
    if head is None or head.next is None:
        return True

    # Step 1: find the end of the FIRST half with a slow/fast cursor pair.
    # fast moves two hops per slow hop, so when fast runs out of road,
    # slow sits on the last node of the front half (for both parities).
    slow, fast = head, head
    while fast.next is not None and fast.next.next is not None:
        slow = slow.next
        fast = fast.next.next

    # Step 2: detach and reverse the back half in place.
    back = _reverse(slow.next)

    # Step 3: walk both halves in lockstep, comparing amplitudes.
    # The reversed back half is never longer than the front half, so it
    # drives the loop; an odd-length middle pulse is skipped (it always
    # mirrors itself).
    mirrored = True
    left, right = head, back
    while right is not None:
        if left.val != right.val:
            mirrored = False
            break
        left = left.next
        right = right.next

    # Step 4: restore the chain — reverse the back half again and reattach.
    slow.next = _reverse(back)
    return mirrored
`,
        commentary: `
A singly linked chain only walks forward, but a mirror check needs one forward walk and one *backward* walk. The insight: reversing the back half **in place** manufactures that backward walk out of the chain's own links — zero auxiliary structures, just the reversal loop you already own.

Step 1's slow/fast pair stops \`slow\` on the **last node of the front half** for both parities, because the loop condition checks \`fast.next.next\` before stepping. For odd lengths the middle node ends up at the front of nothing — it stays attached to the front half and is simply never compared, which is correct: a lone middle pulse always mirrors itself. This is why the comparison loop runs on \`right\` (the reversed back half, the shorter or equal half) rather than \`left\`.

Step 4 is the part interviews use to separate careful engineers from fast ones: the burst is shared state, so the back half is reversed *again* and spliced back onto \`slow\`, restoring the original chain even when the check fails early (note the \`break\` — we still fall through to the restore). The whole routine is three linear walks and two half-reversals: \`O(n)\` time, and the only extra memory is a handful of cursors.
`,
        complexity: 'Time O(n), Space O(1) beyond the chain',
      },
      testCases: [
        { input: [[3, 7, 7, 3]], expected: true, label: 'even-length mirror' },
        { input: [[1, 2, 3]], expected: false, label: 'not mirrored' },
        { input: [[1, 2, 3, 2, 1]], expected: true, label: 'odd-length mirror' },
        { input: [[1, 2, 2, 1, 1]], expected: false, label: 'near-mirror with extra pulse' },
        { input: [[]], expected: true, hidden: true, label: 'empty burst' },
        { input: [[5]], expected: true, hidden: true, label: 'single pulse' },
        { input: [[5, 5, 5, 5, 5]], expected: true, hidden: true, label: 'all-equal amplitudes' },
        { input: [[9, 9]], expected: true, hidden: true, label: 'two equal pulses' },
        { input: [[4, 8]], expected: false, hidden: true, label: 'two unequal pulses' },
      ],
      furtherPractice: [
        { name: 'LeetCode 234. Palindrome Linked List', note: 'the canonical version' },
        { name: 'LeetCode 143. Reorder List', note: 'same middle-find + half-reversal toolkit' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q-save-before-rewire',
      prompt:
        'In the iterative reversal loop, why must you save `curr.next` into a temporary **before** executing `curr.next = prev`?',
      choices: [
        'Because Python forbids assigning to an attribute that is about to be read in the same loop iteration',
        'Because `curr.next` is your only reference to the not-yet-reversed remainder of the chain; overwriting it first would strand every node after `curr`',
        'Because skipping the temporary changes the time complexity from O(n) to O(n^2)',
        'Because `prev` must always be assigned before `curr` in pointer algorithms',
      ],
      correctIndex: 1,
      explanation:
        'A singly linked node holds the sole route to its successor. The instant `curr.next = prev` runs, the old successor — and everything behind it — becomes unreachable unless you saved a reference first. Choice A invents a language rule that does not exist; choice C is wrong because the bug is correctness (lost nodes), not speed; choice D is a superstition, not a reason.',
      kind: 'conceptual',
    },
    {
      id: 'q-dummy-node',
      prompt: 'What does adding a dummy (sentinel) node in front of the head actually buy you?',
      choices: [
        'Faster traversal, because the dummy caches a pointer to the first real node',
        'Protection against accidentally creating cycles during reversal',
        'It removes head-only special cases: every real node now has a predecessor, so deleting or replacing the head uses the same splice code as any other node',
        'Lower memory usage, since one shared sentinel is reused across all lists',
      ],
      correctIndex: 2,
      explanation:
        'Operations like "delete this node" need the predecessor, and the head is the one node that has none — until a sentinel gives it one. With a dummy, head-deletion, empty results, and mid-list deletion all share one code path, and you return `dummy.next`. The dummy changes nothing about traversal speed (A), does nothing for cycles (B), and adds a node rather than saving memory (D).',
      kind: 'conceptual',
    },
    {
      id: 'q-reversal-complexity',
      prompt: 'Iteratively reversing a singly linked chain of `n` nodes costs:',
      choices: [
        'O(n) time, O(n) auxiliary space',
        'O(n log n) time, O(1) auxiliary space',
        'O(n) time, O(1) auxiliary space',
        'O(n^2) time, O(1) auxiliary space',
      ],
      correctIndex: 2,
      explanation:
        'The loop visits each node exactly once and flips one pointer per visit — linear time — while using only three cursors (`prev`, `curr`, `nxt`) regardless of n, so constant extra space. O(n) space (choice A) describes the *recursive* reversal, whose call stack grows with the list; nothing in the loop sorts or nests, so the log and quadratic options have no source.',
      kind: 'complexity',
    },
    {
      id: 'q-merge-complexity',
      prompt:
        'Merging two sorted chains of lengths `m` and `n` by relinking their existing nodes (dummy + tail splice) costs:',
      choices: [
        'O(m + n) time, O(1) auxiliary space',
        'O(m + n) time, O(m + n) auxiliary space',
        'O(m × n) time, O(1) auxiliary space',
        'O((m + n) log(m + n)) time, O(1) auxiliary space',
      ],
      correctIndex: 0,
      explanation:
        'Each comparison permanently consumes one node from one chain, so at most m + n comparisons happen; relinking means no new nodes are allocated, so extra space is just the dummy and a couple of cursors. O(m + n) space (B) would describe copying into a new buffer; the log factor (D) belongs to merging *k* lists with a heap, and nothing here is quadratic (C).',
      kind: 'complexity',
    },
    {
      id: 'q-indexing-cost',
      prompt: 'Reading the element at index `k` in a singly linked list, versus in a dynamic array, costs:',
      choices: [
        'O(1) for both — both store elements contiguously',
        'O(k) for the linked list, O(1) for the array',
        'O(log k) for the linked list, O(1) for the array',
        'O(k) for both — arrays must also scan to position k',
      ],
      correctIndex: 1,
      explanation:
        'A linked list has no address arithmetic: reaching node k means following k pointers from the head. An array computes the address of slot k directly, in constant time. There is no tree structure to give the list O(log k) (C), and arrays absolutely do not scan (D) — constant-time indexing is the array’s defining trade.',
      kind: 'complexity',
    },
    {
      id: 'q-one-pass-kth',
      prompt:
        'A telemetry chain streams from cold storage: it may be traversed **once**, and you have working memory for only a few cursors. You must unlink the k-th record from the end, in place. Which approach fits?',
      choices: [
        'First pass to count the n records, second pass to stop at node n−k and splice — simple and O(n)',
        'Copy all values into a Python list, delete index −k, and rebuild the chain from the copy',
        'Maintain two cursors with a gap of exactly k nodes: advance the lead k hops, then move both together; when the lead falls off the end, the trail sits just before the victim',
        'Recursively walk to the end and count back k frames on the way up, deleting when the count hits k',
      ],
      correctIndex: 2,
      explanation:
        'The gap-runner keeps an invariant — lead is always k ahead of trail — so the end-of-chain event *located* the victim without ever counting, in one pass and a few cursors of space. The two-pass count (A) is the tempting classic but explicitly violates the single-traversal budget; copying to a Python list (B) does read the stream only once, but it rebuilds a brand-new chain rather than unlinking the record from the existing one — and the O(n) copy blows the few-cursors memory budget anyway; recursion (D) is one pass in disguise but burns O(n) stack frames, the same memory you were told you don’t have.',
      kind: 'scenario',
    },
    {
      id: 'q-palindrome-memory',
      prompt:
        'Firmware with a few dozen bytes of working memory must check whether a chain of sensor readings is a palindrome. Which plan satisfies the memory budget?',
      choices: [
        'Push the first half of the values onto a stack, then compare pops against the second half as you walk it',
        'Find the middle with a slow/fast cursor pair, reverse the back half in place, compare the two halves in lockstep, then reverse the back half again to restore the chain',
        'Build the reversed chain as a fresh copy and walk both chains together comparing values',
        'Concatenate the values into a string and compare it to its reverse',
      ],
      correctIndex: 1,
      explanation:
        'Reversing the back half reuses the chain’s own links as the "backward walk," so the only memory cost is a handful of cursors — O(1). The stack approach (A) is the tempting interview reflex and is perfectly correct, but it stores n/2 values: O(n) memory, exactly what the firmware lacks. A reversed copy (C) and a string (D) are even heavier, both O(n).',
      kind: 'scenario',
    },
    {
      id: 'q-lru-structure',
      prompt:
        'You are building an LRU cache: every read must move an entry to "most recent" in O(1), and eviction must drop the least-recent entry in O(1). Which structure delivers both?',
      choices: [
        'A min-heap keyed on last-access timestamp — pop-min gives the eviction victim',
        'A hash map alone — O(1) lookups cover everything the cache needs',
        'A sorted array of entries by access time, with binary search for repositioning',
        'A doubly linked list threaded through the hash-map entries: lookup finds the node in O(1), unlinking and relinking at the head is O(1), and the tail is always the eviction victim',
      ],
      correctIndex: 3,
      explanation:
        'The doubly linked list gives O(1) unlink (each node knows both neighbors) and O(1) insert-at-head, while the hash map jumps straight to any node — together they meet both requirements. The heap (A) is the tempting wrong pattern: updating an entry’s recency is a decrease-key, O(log n), and on *every read*. A hash map alone (B) has no recency ordering at all, and the sorted array (C) pays O(n) shifts to reposition entries.',
      kind: 'scenario',
    },
  ],
  flashcards: [
    {
      id: 'fc-signal',
      front: 'Top signals that a problem wants linked-list pointer surgery',
      back: 'The input is a chain of nodes; the statement says "in place" or "O(1) extra space"; a position is relative to the end or middle with a one-pass budget; or the head itself might be deleted or replaced.',
    },
    {
      id: 'fc-reversal',
      front: 'The iterative reversal loop, in one breath',
      back: 'prev = None; while curr: save nxt = curr.next, flip curr.next = prev, advance prev = curr, curr = nxt. Return prev — it is the new head.',
    },
    {
      id: 'fc-save-first',
      front: 'Pitfall: what breaks if you rewire curr.next before saving it?',
      back: 'curr.next is the only reference to the unvisited remainder. Overwrite it first and every node after curr becomes unreachable — the back half of the list is silently lost.',
    },
    {
      id: 'fc-dummy',
      front: 'When to bolt a dummy (sentinel) node in front of the head',
      back: 'Whenever the head might change: deleting the head, merging into a new chain, or any splice that could produce an empty result. Every real node gains a predecessor; return dummy.next.',
    },
    {
      id: 'fc-gap-runner',
      front: 'Template move: find/delete the k-th node from the end in one pass',
      back: 'Advance a lead cursor k hops, then move lead and trail (starting at a dummy) together. When lead falls off the end, trail sits one node before the victim: trail.next = trail.next.next.',
    },
    {
      id: 'fc-middle',
      front: 'Template move: find the middle of a chain in one pass',
      back: 'Slow/fast cursors — slow moves one hop, fast moves two. Guard fast.next and fast.next.next; when fast runs out of road, slow marks the end of the front half.',
    },
    {
      id: 'fc-merge',
      front: 'Template move: merge two sorted chains stably',
      back: 'Grow from a dummy via a tail cursor: splice on whichever head is smaller (use <= for stability), and when one chain empties, attach the survivor whole with a single pointer assignment.',
    },
    {
      id: 'fc-splice-cost',
      front: 'Complexity: insert or delete at a known position vs. finding that position',
      back: 'Given the predecessor node, a splice is O(1). But finding the predecessor costs O(n), and reading index k costs O(k) — linked lists trade away random access for cheap restructuring.',
    },
    {
      id: 'fc-recursion-space',
      front: 'Hidden cost of recursive linked-list solutions',
      back: 'Recursive reversal/traversal looks elegant but stacks one frame per node: O(n) auxiliary space and a real stack-overflow risk on long chains. The iterative loop is O(1). Say this trade-off out loud.',
    },
    {
      id: 'fc-restore',
      front: 'Pitfall: mutating a shared chain during a read-only check',
      back: 'In-place tricks (reversing a half for a palindrome check) modify state other code may read. Restore the structure before returning — including on early-exit failure paths — and set the final next to None to avoid accidental cycles.',
    },
  ],
  cheatSheet: {
    tldr:
      'A linked list is a chain of nodes where each node holds a value and the sole reference to its successor, so the craft is pointer surgery: re-aim next references in a deliberate order, never dropping your only handle on part of the chain. Three moves cover nearly every classic — save-then-rewire (reversal), a dummy node to erase head special cases, and runner cursors at an offset to locate ends and middles in one pass. The payoff is O(1) splicing and O(1) extra space where arrays would shuffle or copy.',
    signals: [
      'The data arrives as a chain of nodes, or the statement bans copying out to an array ("in place", "O(1) extra space")',
      'You must restructure order — reverse, merge, partition, reorder — while reusing the existing nodes',
      'A target position is relative to the end or the middle, and you only get one pass: runner/gap pointers',
      'The head itself might be deleted or replaced — reach for a dummy node before writing branches',
      'The design needs O(1) insert/delete under churn (LRU chains, free lists, queues)',
    ],
    template: `# Reversal: the save-then-rewire loop
def reverse_chain(head):
    prev = None
    while head is not None:
        nxt = head.next       # save the remainder FIRST
        head.next = prev      # flip one arrow
        prev = head
        head = nxt
    return prev               # new head

# Dummy-node splice (delete/merge without head special cases)
dummy = ListNode(0, head)
trail = dummy                 # trail.next is always a real candidate
# ... position trail just before the victim, then:
trail.next = trail.next.next  # O(1) unlink
new_head = dummy.next`,
    complexity:
      'Traversal O(n) time; splice O(1) given the predecessor; reversal, merge, k-from-end, and palindrome checks all O(n) time, O(1) extra space (recursion silently costs O(n) stack).',
  },
}

export default mod
