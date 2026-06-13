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
    {
      id: 'promenade-pair-swap',
      title: 'Promenade Pair Swap',
      difficulty: 'easy',
      statement: `
A village folk dance opens with a promenade: dancers stand in single file, each holding a streamer that runs back to the dancer behind them. When the caller shouts **"trade!"**, every adjacent pair swaps places — the 1st and 2nd dancers trade, the 3rd and 4th trade, and so on down the line. If the line has an odd number of dancers, the last one holds their spot.

Costumes, props, and streamers travel with their dancer, so you must move the **people**, not repaint their numbers: relink the nodes themselves rather than exchanging the values stored inside them.

Given the dancer numbers in current front-to-back order, return the line after one "trade!" call, front to back.
`,
      examples: [
        {
          input: 'dancers = [1, 2, 3, 4]',
          output: '[2, 1, 4, 3]',
          explanation: 'Dancers 1 and 2 trade, then 3 and 4 trade; each pair stays in its own part of the line.',
        },
        {
          input: 'dancers = [5, 6, 7]',
          output: '[6, 5, 7]',
          explanation: 'The odd dancer out, 7, has no partner and keeps their spot at the back.',
        },
        {
          input: 'dancers = [9]',
          output: '[9]',
          explanation: 'A single dancer has nobody to trade with.',
        },
      ],
      constraints: [
        '0 <= len(dancers) <= 100_000',
        '-10^9 <= dancers[i] <= 10^9; numbers may repeat',
        'Swap by relinking nodes — do not exchange the values held inside them',
        'One pass, O(1) extra space beyond the chain',
      ],
      hints: [
        'Draw a four-dancer line on paper and perform one trade. Count how many streamers (links) end up pointing somewhere new — it is more than two, and the extra one is the heart of the problem.',
        'Each swap rewires three links: into the pair, between the pair, and out of the pair. "Into the pair" needs the node just *before* it — and the very first pair has no such node unless you manufacture one.',
        'Anchor prev at a dummy in front of the head. While prev.next and prev.next.next exist: first = prev.next; second = first.next; first.next = second.next; second.next = first; prev.next = second; prev = first. Return to_list(dummy.next).',
      ],
      functionName: 'swap_dance_pairs',
      starterCode: `class ListNode:
    """One dancer: a number plus the streamer to the dancer behind."""
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

def swap_dance_pairs(dancers: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `class ListNode:
    """One dancer: a number plus the streamer to the dancer behind."""
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

def swap_dance_pairs(dancers: list[int]) -> list[int]:
    head = build_list(dancers)
    dummy = ListNode(0, head)     # sentinel: gives the first pair a predecessor
    prev = dummy                  # the node just before the pair being traded
    while prev.next is not None and prev.next.next is not None:
        first = prev.next         # front dancer of the pair
        second = first.next       # back dancer of the pair
        first.next = second.next  # 1) first re-aims past the pair (read second.next first!)
        second.next = first       # 2) second steps in front of first
        prev.next = second        # 3) the line ahead now leads into second
        prev = first              # first is the back of the swapped pair: next anchor
    # Odd dancer (or empty line): the loop guard leaves them untouched.
    return to_list(dummy.next)
`,
        commentary: `
A pair swap looks like two nodes' business but is really **three links'** business: the link *into* the pair (from \`prev\`), the link *between* the pair, and the link *out of* the pair to the rest of the line. Miss the first one and the two dancers trade correctly while the line ahead of them still points at the old leader.

The write order matters for the same reason it does in reversal: \`second.next\` is the only route to the rest of the line, so step 1 reads it (\`first.next = second.next\`) before step 2 overwrites it. The dummy node makes the very first pair unremarkable — without it, swapping the head pair needs its own branch and its own return value.

After a swap, \`first\` is the rear dancer of its pair, so it becomes \`prev\` for the next pair. The loop guard (\`prev.next\` and \`prev.next.next\`) does double duty: it stops cleanly on even lines (nothing left) and odd lines (one partner-less dancer left untouched), and it makes the empty line a non-event.
`,
        complexity: 'Time O(n), Space O(1) beyond the chain',
      },
      testCases: [
        { input: [[1, 2, 3, 4]], expected: [2, 1, 4, 3], label: 'two full pairs' },
        { input: [[5, 6, 7]], expected: [6, 5, 7], label: 'odd dancer keeps spot' },
        { input: [[9]], expected: [9], label: 'single dancer' },
        { input: [[1, 2]], expected: [2, 1], label: 'one pair' },
        { input: [[]], expected: [], hidden: true, label: 'empty line' },
        { input: [[4, 4, 4, 4]], expected: [4, 4, 4, 4], hidden: true, label: 'repeating numbers' },
        {
          input: [[1, 2, 3, 4, 5, 6, 7]],
          expected: [2, 1, 4, 3, 6, 5, 7],
          hidden: true,
          label: 'longer odd line',
        },
        { input: [[-1, -2, -3, -4]], expected: [-2, -1, -4, -3], hidden: true, label: 'negative numbers' },
      ],
      furtherPractice: [
        { name: 'LeetCode 24. Swap Nodes in Pairs', note: 'the canonical version' },
        { name: 'LeetCode 25. Reverse Nodes in k-Group', note: 'the same surgery generalized from pairs to blocks of k' },
      ],
    },
    {
      id: 'overnight-playlist-rotation',
      title: 'Overnight Playlist Rotation',
      difficulty: 'medium',
      statement: `
A community radio station runs its overnight show from a playlist stored as a chain of track IDs, played head to tail. Station policy says each new broadcast night must **open with the final k tracks of the previous night**, in their original order, followed by everything else: the last k tracks are detached as a block and re-attached at the front.

Automation sometimes queues the same rotation many nights in a row, so \`k\` can be far larger than the playlist itself — and rotating a playlist by exactly its own length plays it unchanged.

Given the track IDs head-to-tail and the integer \`k\`, return the rotated playlist head-to-tail, produced by relinking the existing chain.
`,
      examples: [
        {
          input: 'tracks = [10, 20, 30, 40, 50], k = 2',
          output: '[40, 50, 10, 20, 30]',
          explanation: 'The final block 40, 50 moves to the front in its original order; everything else follows unchanged.',
        },
        {
          input: 'tracks = [1, 2, 3], k = 4',
          output: '[3, 1, 2]',
          explanation: 'Rotating by 3 returns the playlist unchanged, so k = 4 behaves exactly like k = 1.',
        },
        {
          input: 'tracks = [8, 9], k = 0',
          output: '[8, 9]',
          explanation: 'A zero rotation plays the night unchanged.',
        },
      ],
      constraints: [
        '0 <= len(tracks) <= 100_000',
        '0 <= k <= 10^9 (k may far exceed the playlist length)',
        '-10^9 <= tracks[i] <= 10^9; IDs may repeat',
        'Rotate by relinking nodes: O(n) time, O(1) extra space beyond the chain',
      ],
      hints: [
        'Before touching any links, work out what rotating by exactly the playlist length does — and therefore how much of an enormous k is actually observable.',
        'A rotation never reorders anything: the chain is cut once into a front block and a back block, then reattached the other way around. Which node has to become the new tail, counted from the old head?',
        'Walk once to find the tail and count n; reduce k to k % n (done if 0). Close a ring with tail.next = head, step n - k - 1 hops from the old head to the new tail, set new_head = new_tail.next, then cut the ring with new_tail.next = None.',
      ],
      functionName: 'rotate_playlist',
      starterCode: `class ListNode:
    """One track: an ID plus the link to the next track."""
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

def rotate_playlist(tracks: list[int], k: int) -> list[int]:
    pass
`,
      solution: {
        code: `class ListNode:
    """One track: an ID plus the link to the next track."""
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

def rotate_playlist(tracks: list[int], k: int) -> list[int]:
    head = build_list(tracks)
    # Zero or one track: every rotation is a no-op.
    if head is None or head.next is None:
        return to_list(head)

    # One walk measures the length AND lands on the tail.
    n = 1
    tail = head
    while tail.next is not None:
        tail = tail.next
        n += 1

    k %= n                        # only the remainder of k is observable
    if k == 0:
        return to_list(head)      # nothing moves; skip the surgery entirely

    tail.next = head              # close the chain into a temporary ring
    new_tail = head
    for _ in range(n - k - 1):    # the new tail sits n-k-1 hops from the old head
        new_tail = new_tail.next
    new_head = new_tail.next      # the first of the final k tracks
    new_tail.next = None          # cut the ring: the rotation falls out
    return to_list(new_head)
`,
        commentary: `
The decisive observation is that a rotation is **one cut, not many moves**. The output contains the same nodes in the same relative order, split into two blocks that swap positions — so the whole job reduces to finding the cut point and rewiring two links.

Reducing \`k\` modulo \`n\` first is a correctness requirement, not an optimization: \`k\` can be a billion while the chain holds three nodes, and only \`k % n\` of that is observable. Conveniently, the walk that counts \`n\` ends on the tail — exactly the node the next step needs.

Closing the chain into a temporary ring (\`tail.next = head\`) is the tidy trick: once the chain is circular, "move the last k to the front" becomes "open the ring at a different spot." The node \`n - k - 1\` hops from the old head is the new tail; cut there and the ring unrolls into the rotated chain. Two pointer writes total — close, then cut — and no node is ever detached individually. Forgetting the final \`new_tail.next = None\` is the classic failure: the chain stays circular and the next traversal never ends.
`,
        complexity: 'Time O(n), Space O(1) beyond the chain',
      },
      testCases: [
        { input: [[10, 20, 30, 40, 50], 2], expected: [40, 50, 10, 20, 30], label: 'last two tracks open the night' },
        { input: [[1, 2, 3], 4], expected: [3, 1, 2], label: 'k wraps past the length' },
        { input: [[8, 9], 0], expected: [8, 9], label: 'zero rotation' },
        { input: [[1, 2], 1], expected: [2, 1], label: 'pair swap-around' },
        { input: [[], 3], expected: [], hidden: true, label: 'empty playlist' },
        { input: [[5], 1000000000], expected: [5], hidden: true, label: 'single track, huge k' },
        { input: [[1, 2, 3, 4], 4], expected: [1, 2, 3, 4], hidden: true, label: 'k equals the length' },
        {
          input: [[1, 2, 3, 4, 5, 6], 10],
          expected: [3, 4, 5, 6, 1, 2],
          hidden: true,
          label: 'k = 10 acts like k = 4',
        },
        { input: [[7, 7, 1, 7], 3], expected: [7, 1, 7, 7], hidden: true, label: 'repeating IDs' },
      ],
      furtherPractice: [
        { name: 'LeetCode 61. Rotate List', note: 'the canonical version' },
        { name: 'LeetCode 189. Rotate Array', note: 'the same idea on contiguous memory — compare what each representation pays' },
      ],
    },
    {
      id: 'triage-queue-split',
      title: 'Triage Queue Split',
      difficulty: 'medium',
      statement: `
A walk-in clinic tracks the day's waiting room as a chain of patients in order of arrival; each node holds that patient's triage score, where **lower scores mean more urgent cases**. When the duty physician arrives, the queue is reorganized once: every patient whose score is **strictly below** a threshold \`t\` moves ahead of every patient at or above it.

Fairness is non-negotiable: within the urgent group, and within the routine group, patients must keep their original arrival order. And patient records are bulky — reorganize by **relinking the existing nodes**, never by copying scores between them.

Given the arrival-order scores and the threshold \`t\`, return the reorganized queue front to back.
`,
      examples: [
        {
          input: 'scores = [5, 1, 8, 3, 9, 2], t = 4',
          output: '[1, 3, 2, 5, 8, 9]',
          explanation: 'Urgent patients 1, 3, 2 keep their arrival order and move ahead; routine patients 5, 8, 9 keep theirs too.',
        },
        {
          input: 'scores = [7, 7, 7], t = 7',
          output: '[7, 7, 7]',
          explanation: 'Strictly below means a score equal to t counts as routine; nobody moves.',
        },
        {
          input: 'scores = [2, 9, 1], t = 10',
          output: '[2, 9, 1]',
          explanation: 'Everyone is urgent, so the queue is unchanged — stability forbids any other answer.',
        },
      ],
      constraints: [
        '0 <= len(scores) <= 100_000',
        '-10^9 <= scores[i] <= 10^9; -10^9 <= t <= 10^9',
        'Patients with score == t belong to the routine (second) group',
        'Arrival order must be preserved within each group (stable partition)',
        'Relink existing nodes: O(n) time, O(1) extra space beyond the chain',
      ],
      hints: [
        'Try shuffling urgent patients forward inside the single queue on example 1 and watch what happens to arrival order. The stability requirement is the real constraint — let it shape your plan before you write anything.',
        'One chain fighting itself is hard; two chains are easy. Each patient makes a single yes/no decision, and appending to the back of a growing chain never disturbs the order of those already in it.',
        'Build two chains, each with its own dummy head and tail cursor; walk the queue once, appending every node to the urgent or routine tail. Then set routine_tail.next = None (the stale-link cycle bug lives here) and splice urgent_tail.next = routine_dummy.next.',
      ],
      functionName: 'split_triage_queue',
      starterCode: `class ListNode:
    """One patient: a triage score plus the link to the next in line."""
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

def split_triage_queue(scores: list[int], t: int) -> list[int]:
    pass
`,
      solution: {
        code: `class ListNode:
    """One patient: a triage score plus the link to the next in line."""
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

def split_triage_queue(scores: list[int], t: int) -> list[int]:
    head = build_list(scores)
    urgent_dummy = ListNode(0)    # builder chain for scores strictly below t
    urgent_tail = urgent_dummy
    routine_dummy = ListNode(0)   # builder chain for everyone else
    routine_tail = routine_dummy
    curr = head
    while curr is not None:
        if curr.val < t:          # strictly below: urgent group
            urgent_tail.next = curr
            urgent_tail = curr
        else:                     # at or above t: routine group
            routine_tail.next = curr
            routine_tail = curr
        curr = curr.next          # nodes keep their old .next until overwritten
    # Cut the stale link FIRST: the last routine patient may still point at a
    # node that now lives in the urgent chain — splicing without this builds a cycle.
    routine_tail.next = None
    urgent_tail.next = routine_dummy.next   # urgent block, then routine block
    return to_list(urgent_dummy.next)
`,
        commentary: `
The instinct to do this inside one chain — bubbling urgent nodes forward past routine ones — collides head-on with stability: every hop past a routine patient is a chance to scramble somebody's relative order, and the bookkeeping balloons. The clean move is to admit the queue wants to be **two queues**: append-only builders preserve insertion order by construction, so stability stops being something you maintain and becomes something you get for free.

Each node is examined once, appended once, and never revisited; the finale is two pointer writes — terminate the routine chain, splice it behind the urgent chain. The dummy heads mean neither builder ever asks "am I empty?", and they also make the all-urgent and all-routine extremes fall out of the same code path.

The one genuine trap is the **stale link**. Appending a node does not clear its old \`.next\`; the last routine patient can still point back into a node that now lives in the urgent chain, and splicing without \`routine_tail.next = None\` quietly builds a cycle that hangs the next traversal. Cut first, then splice.
`,
        complexity: 'Time O(n), Space O(1) beyond the chain',
      },
      testCases: [
        { input: [[5, 1, 8, 3, 9, 2], 4], expected: [1, 3, 2, 5, 8, 9], label: 'mixed queue' },
        { input: [[7, 7, 7], 7], expected: [7, 7, 7], label: 'scores equal to t stay routine' },
        { input: [[2, 9, 1], 10], expected: [2, 9, 1], label: 'everyone urgent' },
        { input: [[6, 2], 5], expected: [2, 6], label: 'urgent patient at the back' },
        { input: [[], 5], expected: [], hidden: true, label: 'empty waiting room' },
        { input: [[3], 3], expected: [3], hidden: true, label: 'single patient at threshold' },
        { input: [[9, 8, 7, 1, 2], 5], expected: [1, 2, 9, 8, 7], hidden: true, label: 'urgent block at the back' },
        { input: [[4, 6, 4, 6, 4], 5], expected: [4, 4, 4, 6, 6], hidden: true, label: 'alternating groups' },
        { input: [[1, 2, 3], 0], expected: [1, 2, 3], hidden: true, label: 'nobody urgent' },
      ],
      furtherPractice: [
        { name: 'LeetCode 86. Partition List', note: 'the canonical version' },
        { name: 'LeetCode 328. Odd Even Linked List', note: 'the same two-builder splice keyed on position instead of value' },
      ],
    },
    {
      id: 'alternating-mic-lines',
      title: 'Alternating Mic Lines',
      difficulty: 'medium',
      statement: `
A developer-conference Q&A runs two microphone lines: one in the auditorium and one for remote viewers, each stored as a chain of question-ticket numbers in the order people queued. The moderator alternates strictly — the first question comes from the **auditorium line**, the next from the remote line, and so on — until one line empties, after which the remaining line proceeds uninterrupted in its own queued order.

Build the single speaking order by **splicing the existing nodes** of the two chains together; ticket records are bulky and must not be copied.

Given the two lines as lists, return the complete speaking order.
`,
      examples: [
        {
          input: 'room = [1, 3, 5], remote = [2, 4, 6]',
          output: '[1, 2, 3, 4, 5, 6]',
          explanation: 'Perfect alternation: room, remote, room, remote, room, remote.',
        },
        {
          input: 'room = [10, 30], remote = [20, 40, 60, 80]',
          output: '[10, 20, 30, 40, 60, 80]',
          explanation: 'After the room line empties, remote tickets 60 and 80 follow in their queued order.',
        },
        {
          input: 'room = [9, 1], remote = [5, 5]',
          output: '[9, 5, 1, 5]',
          explanation: 'Ticket values are never compared — only whose turn it is matters. This is not a sorted merge.',
        },
      ],
      constraints: [
        '0 <= len(room), len(remote) <= 100_000',
        '-10^9 <= ticket numbers <= 10^9; tickets may repeat across lines',
        'Alternation starts with the auditorium line and stays strict while both lines are non-empty',
        'Splice existing nodes: O(m + n) time, O(1) extra space beyond the chains',
      ],
      hints: [
        "This module's replica-log merge looks tantalizingly close. Run its comparison logic by hand on example 3 and find exactly where the two problems part ways.",
        'No values are inspected at all: the only state deciding the next splice is whose turn it is. One boolean, flipped after every splice, plus the dummy-and-tail scaffolding you already know.',
        'dummy/tail as in a merge. While both heads exist: splice from room if the turn flag says so, otherwise from remote; advance that chain, advance tail, flip the flag. When either line empties, attach the survivor whole and return to_list(dummy.next).',
      ],
      functionName: 'interleave_mic_lines',
      starterCode: `class ListNode:
    """One questioner: a ticket number plus the link to the next in line."""
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

def interleave_mic_lines(room: list[int], remote: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `class ListNode:
    """One questioner: a ticket number plus the link to the next in line."""
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

def interleave_mic_lines(room: list[int], remote: list[int]) -> list[int]:
    a = build_list(room)
    b = build_list(remote)
    dummy = ListNode(0)           # sentinel for the speaking order under construction
    tail = dummy
    room_turn = True              # the auditorium line always opens the session
    while a is not None and b is not None:
        if room_turn:
            tail.next = a         # splice the auditorium head onto the order
            a = a.next
        else:
            tail.next = b         # splice the remote head onto the order
            b = b.next
        tail = tail.next
        room_turn = not room_turn # strict alternation: flip every splice
    # One line is empty; the survivor proceeds whole, already in queue order.
    tail.next = a if a is not None else b
    return to_list(dummy.next)
`,
        commentary: `
Structurally this is the merge skeleton — dummy head, tail cursor, splice-and-advance — with the comparison ripped out. That substitution is the lesson: the dummy/tail scaffolding is **not about sorting**. It is a general way to build a chain left-to-right out of existing nodes, and the only thing that varies between problems is the *chooser* that picks the next node. Here the chooser is a turn flag flipped on every splice; in the replica merge it was a value comparison; in a partition it is a predicate.

The tail-attachment move carries over unchanged and is still the efficiency play: when one line empties, the survivor is already in its required order, so a single pointer write attaches the entire remainder — no per-node loop.

The strict-alternation contract is also why example 3 matters: \`[9, 1]\` interleaved with \`[5, 5]\` yields \`9, 5, 1, 5\` — wrong for a merge, exactly right here. If your output comes back sorted, you have solved the previous problem again instead of this one.
`,
        complexity: 'Time O(m + n), Space O(1) beyond the chains',
      },
      testCases: [
        { input: [[1, 3, 5], [2, 4, 6]], expected: [1, 2, 3, 4, 5, 6], label: 'perfect alternation' },
        { input: [[10, 30], [20, 40, 60, 80]], expected: [10, 20, 30, 40, 60, 80], label: 'remote line runs long' },
        { input: [[9, 1], [5, 5]], expected: [9, 5, 1, 5], label: 'not a sorted merge' },
        { input: [[], [9, 9]], expected: [9, 9], label: 'auditorium empty' },
        { input: [[], []], expected: [], hidden: true, label: 'no questions at all' },
        { input: [[1, 2, 3, 4], [5]], expected: [1, 5, 2, 3, 4], hidden: true, label: 'remote exhausted immediately' },
        { input: [[5], []], expected: [5], hidden: true, label: 'remote line empty' },
        {
          input: [[2, 4, 6, 8], [1, 3, 5, 7]],
          expected: [2, 1, 4, 3, 6, 5, 8, 7],
          hidden: true,
          label: 'alternation, not sorting',
        },
        { input: [[7], [8]], expected: [7, 8], hidden: true, label: 'one question each' },
      ],
      furtherPractice: [
        { name: 'LeetCode 328. Odd Even Linked List', note: 'the inverse operation — de-interleave one chain by position' },
        { name: 'LeetCode 143. Reorder List', note: 'interleave a chain with its own reversed back half' },
      ],
    },
    {
      id: 'digit-wheel-addition',
      title: 'Digit-Wheel Addition',
      difficulty: 'hard',
      statement: `
A museum restores antique mechanical adding machines. Each machine's counter stores a non-negative integer as a chain of digit wheels with the **ones wheel first** — exactly the order the hardware consumes digits, least significant to most. So 342 is stored as \`2 → 4 → 3\`.

To certify a restoration, you must add two counters the way the machine does: wheel by wheel with a running carry. Brass wheels are scarce, so the sum must be written **onto the wheels of the longer chain in place**; you may fabricate **at most one** new wheel, for a final carry that overflows past the highest existing wheel.

Given the two counters' digits (ones wheel first), return the sum's digits, ones wheel first.
`,
      examples: [
        {
          input: 'a_digits = [2, 4, 3], b_digits = [5, 6, 4]',
          output: '[7, 0, 8]',
          explanation: '342 + 465 = 807, stored ones-first as 7 → 0 → 8.',
        },
        {
          input: 'a_digits = [9, 9], b_digits = [1]',
          output: '[0, 0, 1]',
          explanation: '99 + 1 = 100: the carry ripples through both wheels and overflows into one newly fabricated wheel.',
        },
        {
          input: 'a_digits = [0], b_digits = [0]',
          output: '[0]',
          explanation: 'Zero plus zero is the single wheel 0 — no spurious extra wheels.',
        },
      ],
      constraints: [
        '1 <= len(a_digits), len(b_digits) <= 100_000',
        'Each element is a single digit 0–9, stored ones wheel first',
        'No counter has unused high wheels: the last digit is nonzero unless the counter is exactly [0]',
        "Write the result into the longer chain's wheels; allocate at most one new node (the overflow wheel)",
      ],
      hints: [
        'Add 47 and 88 with pencil and paper. Notice which digit you write down first and what small piece of information flows from one column to the next — the chains already hand you the digits in that order.',
        'Walk both chains in lockstep with a running carry; divmod(column_total, 10) yields the wheel digit and the next carry. The wrinkle is the wheel budget: whose nodes will hold the answer when the chains have different lengths?',
        'Measure both lengths and let the longer chain be the accumulator (swap the names if needed). Overwrite each of its wheel values with the column digit, advancing the shorter chain alongside while it lasts, and keep a cursor on the last wheel written; if a carry survives the final column, hang exactly one new wheel off it.',
      ],
      functionName: 'add_digit_wheels',
      starterCode: `class ListNode:
    """One digit wheel: a digit 0-9 plus the link to the next-higher wheel."""
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

def add_digit_wheels(a_digits: list[int], b_digits: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `class ListNode:
    """One digit wheel: a digit 0-9 plus the link to the next-higher wheel."""
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

def _length(head: "ListNode | None") -> int:
    """Count the wheels in a chain."""
    n = 0
    while head is not None:
        n += 1
        head = head.next
    return n

def add_digit_wheels(a_digits: list[int], b_digits: list[int]) -> list[int]:
    a = build_list(a_digits)
    b = build_list(b_digits)
    # The longer chain becomes the accumulator: its wheels store the sum.
    if _length(a) < _length(b):
        a, b = b, a
    head = a                      # remember the answer chain's ones wheel
    carry = 0
    last = None                   # trails the walk: the most recent wheel written
    while a is not None:          # the accumulator drives; it never ends early
        column = a.val + carry
        if b is not None:         # the shorter chain rides along while it lasts
            column += b.val
            b = b.next
        carry, a.val = divmod(column, 10)   # write this column's digit in place
        last = a
        a = a.next
    if carry:                     # overflow past the highest wheel:
        last.next = ListNode(carry)         # the single allowed new wheel
    return to_list(head)
`,
        commentary: `
Ones-wheel-first storage is the gift in this problem: it hands you digits in exactly the order column addition consumes them, so one forward walk with a \`carry\` integer reproduces pencil-and-paper arithmetic. The carry can never exceed 1 (\`9 + 9 + 1 = 19\` at worst), which is the whole reason "at most one new wheel" is even promisable — only a final ripple past the highest column can need new hardware.

The wheel budget converts a textbook exercise into pointer discipline. Instead of allocating a result node per column, the longer chain is drafted as the **accumulator**: its values are overwritten in place while the shorter chain rides along until it runs dry. Swapping the two names when the first chain is shorter costs two cheap counting walks and buys an enormously simpler main loop — one chain drives, the other follows, and there is no "which one ended first?" tangle.

Keeping the \`last\` cursor one step behind the walk is the standard idiom for "I may need to append after the end": when the loop finishes, \`a\` is \`None\` and useless, but \`last\` still grips the highest wheel, ready to hang the overflow wheel if the carry survived. Zero inputs need no special case — \`[0] + [0]\` walks one column, writes 0, carries nothing.
`,
        complexity: 'Time O(m + n), Space O(1) beyond the chains (at most one new node)',
      },
      testCases: [
        { input: [[2, 4, 3], [5, 6, 4]], expected: [7, 0, 8], label: '342 + 465 = 807' },
        { input: [[9, 9], [1]], expected: [0, 0, 1], label: 'carry overflows into a new wheel' },
        { input: [[0], [0]], expected: [0], label: 'zero plus zero' },
        { input: [[5], [5]], expected: [0, 1], label: 'single wheels overflow' },
        {
          input: [[9, 9, 9, 9], [9, 9, 9, 9]],
          expected: [8, 9, 9, 9, 1],
          hidden: true,
          label: '9999 + 9999 = 19998',
        },
        {
          input: [[1, 0, 0, 0, 0, 1], [3]],
          expected: [4, 0, 0, 0, 0, 1],
          hidden: true,
          label: 'short counter into a long one',
        },
        { input: [[9], [9, 9, 9]], expected: [8, 0, 0, 1], hidden: true, label: 'shorter first argument' },
        { input: [[7], [0]], expected: [7], hidden: true, label: 'adding zero' },
      ],
      furtherPractice: [
        { name: 'LeetCode 2. Add Two Numbers', note: 'the canonical version — allocates a fresh result chain' },
        { name: 'LeetCode 445. Add Two Numbers II', note: 'most-significant wheel first — pair with reversal or a stack' },
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
