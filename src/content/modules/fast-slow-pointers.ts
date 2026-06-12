import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'fast-slow-pointers',
  visualizer: 'linked-list',
  concept: `
## The mental model

Send two runners down a narrow forest trail at dusk: a walker who steps one stone per tick, and a sprinter who steps two. You can't see the trail, only the runners' radios. If the trail dead-ends, the sprinter reports the end first — simple. But if the trail secretly bends back onto itself, the sprinter enters the loop, circles, and starts **gaining one stone per tick** on the walker. On a circular track, a faster runner always laps a slower one — and because the gap shrinks by exactly one stone per tick, the sprinter doesn't fly past the walker; it lands **exactly on** them. Two runners, two radios, zero map, zero notebook: you learn whether the trail loops without recording a single stone you've visited.

The same speed ratio doubles as a measuring tape. The moment the sprinter reaches the end of a loop-free trail, the walker is standing at the **midpoint** — half the speed, half the distance. One pass, no length known in advance.

That's the whole pattern: two cursors over the *same* sequence at different speeds, exploiting the speed ratio to answer questions about the sequence's **shape** — does it loop, where does the loop begin, where is the middle — in \`O(1)\` memory.

## Mechanics

Cycle detection (Floyd's "tortoise and hare") advances \`slow\` by one node and \`fast\` by two, comparing **node identity** after every move:

\`\`\`python
def has_cycle(head: 'ListNode | None') -> bool:
    slow = fast = head
    while fast and fast.next:        # fast hits the end first if there is one
        slow = slow.next
        fast = fast.next.next
        if slow is fast:             # identity, not value equality
            return True
    return False
\`\`\`

Why must they meet? Say the chain has a tail of \`mu\` nodes before a loop of length \`lam\`. After \`mu\` ticks the walker enters the loop; the sprinter is already somewhere inside it. From then on the gap between them (measured around the loop) shrinks by exactly 1 per tick, so within at most \`lam\` more ticks the gap hits zero. Total work: at most \`mu + lam\` ticks.

The meeting point hides a second gift. When they collide, slow has taken \`mu + s\` steps and fast exactly twice that, so the difference \`mu + s\` is a whole number of laps. Read that modulo \`lam\`: walking \`mu\` more steps from the meeting point lands on the loop's entrance — the **same** place you reach walking \`mu\` steps from the head. So phase 2 is almost anticlimactic: reset one cursor to the head, advance both **one step at a time**, and the node where they coincide is the cycle's start.

Nothing here requires actual \`next\` pointers. Any deterministic step function \`x -> f(x)\` defines an *implicit* chain: repeated digit transforms, PRNG state updates, an array where values act as indices. Run \`slow = f(slow)\` and \`fast = f(f(fast))\` and the same theorems apply.

## When to reach for it

- The words **"cycle"**, **"loop"**, **"repeats forever"**, or **"never terminates"** appear, on a linked structure or an iterated process.
- You need the **middle** (or with an offset gap, the k-th-from-the-end) of a singly linked chain in **one pass** without knowing its length.
- Memory is constrained: "**O(1) space**", "read-only input", "you may not store visited nodes" — the hash-set-of-seen-nodes shortcut is explicitly off the table.
- The input is secretly a **functional graph**: each state has exactly one successor (\`x -> f(x)\`), and the question is about eventual repetition, the loop's entry, or its period.
- A simulation or state machine must be checked for **eventual periodicity** when the state space is far too large to log.

If nodes can have *multiple* successors (general graphs), fast/slow does not apply — that's DFS-with-coloring territory. And if memory is plentiful and you also need *which step* first revisited a state, a hash map of state → index is simpler and still one pass.

## Complexity

Phase 1 meets within \`O(mu + lam)\` steps — \`O(n)\` for an n-node list — and phase 2 adds at most another \`O(mu + lam)\`. Space is \`O(1)\`: two references, full stop. The hash-set alternative is also \`O(n)\` time but pays \`O(n)\` space, which is exactly what tight-memory problems forbid. On implicit chains, multiply by the cost of one application of \`f\` — e.g. \`O(log x)\` for a digit transform. Brent's variant keeps the same asymptotics with fewer calls to \`f\` by letting the fast cursor run in power-of-two bursts.

## Common pitfalls

- **Skipping the null guard.** \`fast.next.next\` explodes on acyclic lists. The loop condition must check \`fast and fast.next\` *before* dereferencing.
- **Comparing values instead of identity.** Two distinct nodes can hold equal payloads. Use \`is\` on node objects (or compare raw states on implicit chains where states *are* the values).
- **Testing for the meeting before moving.** Both cursors start at the head; comparing at the top of the loop reports a bogus instant "cycle". Move first, then compare.
- **Forgetting fast applies \`f\` twice** on implicit chains. \`fast = f(fast)\` silently turns the hare into a second tortoise — the loop never terminates on cyclic inputs.
- **Even-length middle ambiguity.** The standard template lands on the *second* of two middles. If the problem wants the first, stop fast one step earlier — decide deliberately.
- **Assuming phase 1's meeting point is the cycle entry.** It usually isn't; it's just *somewhere* in the loop. Phase 2 exists for a reason.
`,
  realWorldUses: [
    {
      title: "Pollard's rho integer factorization",
      description:
        'Factoring libraries (GMP-based tools, CAS systems) hunt for factors of huge composites by iterating a pseudo-random polynomial mod N and using Floyd or Brent cycle detection to find a collision modulo a hidden prime factor — constant memory where storing the sequence would be hopeless.',
    },
    {
      title: 'PRNG period auditing',
      description:
        "A pseudo-random generator is a deterministic step function on a finite state, so its output must eventually cycle. Test suites measure a generator's period with Brent's algorithm — fast/slow cursors over the state sequence — because logging every state of even a 64-bit generator is physically impossible.",
    },
    {
      title: 'Rho-method collision search in cryptanalysis',
      description:
        'Attacks on hash functions and discrete logarithms (the van Oorschot–Wiener family) iterate the function under attack and detect when the walk enters a cycle, yielding a collision with negligible memory — the same tortoise-and-hare mathematics scaled out across many parallel walkers.',
    },
  ],
  problems: [
    {
      id: 'carousel-loop',
      title: 'Baggage Carousel Loop Check',
      difficulty: 'easy',
      statement: `
An airport baggage hall chains tow carts together: each cart stores a numeric label and a link to the next cart, and the final cart's link normally points to the unloading dock (no cart at all). A mis-scanned routing tag can instead point the final cart **back at an earlier cart**, so any bag placed on the first cart circles the hall forever.

You are given the cart labels \`labels\` in chain order, plus a build parameter \`pos\`: the index of the cart the final cart's link points back to, or \`-1\` if it correctly points to the dock. The starter code uses \`pos\` **only** to construct the chain of \`ListNode\` objects — your logic must not read \`pos\`, because the maintenance scanner that will run your code in production can only walk links.

Return \`True\` if a bag starting at the first cart loops forever, \`False\` if it reaches the dock.

The hall's controller has two pointer registers and no scratch memory: solve it in \`O(1)\` extra space, without recording visited carts.
`,
      examples: [
        {
          input: 'labels = [3, 1, 4, 1], pos = 1',
          output: 'True',
          explanation:
            'The fourth cart links back to the cart at index 1, so the bag circles the carts at indices 1 → 2 → 3 → 1 forever (label sequence 1 → 4 → 1, repeating).',
        },
        {
          input: 'labels = [7, 7, 7], pos = -1',
          output: 'False',
          explanation:
            'Equal labels are fine — the links are what matter, and the last cart points to the dock.',
        },
        {
          input: 'labels = [9], pos = 0',
          output: 'True',
          explanation: 'A single cart linked to itself is the smallest possible loop.',
        },
      ],
      constraints: [
        '0 <= len(labels) <= 100_000',
        '-10^9 <= labels[k] <= 10^9',
        'pos == -1 or 0 <= pos < len(labels)',
        'O(1) extra space; do not store visited carts; do not read pos in your logic',
      ],
      hints: [
        'A bag that loops never reaches the dock — but "never" is hard to observe directly. What could you compare against the bag itself, so a loop becomes a detectable event in finite time?',
        'Release two trackers from the first cart at different speeds: one advances one link per tick, the other two links per tick. Think about what each possible ending of the chain does to them.',
        'Loop while fast and fast.next exist; step slow once, fast twice, then check slow is fast (object identity). Falling out of the loop means fast reached the dock: return False.',
      ],
      functionName: 'conveyor_has_loop',
      starterCode: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_loop(values: list[int], pos: int) -> 'ListNode | None':
    """Build the cart chain; the last node links back to index pos (-1 = none)."""
    nodes = [ListNode(v) for v in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if nodes and pos != -1:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

def conveyor_has_loop(labels: list[int], pos: int) -> bool:
    head = _build_loop(labels, pos)
    # Walk the chain from head. Do not use pos below this line.
    pass
`,
      solution: {
        code: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_loop(values: list[int], pos: int) -> 'ListNode | None':
    # Wire up the chain exactly as the hall does: a straight line of carts,
    # with the last link optionally bent back to an earlier index.
    nodes = [ListNode(v) for v in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if nodes and pos != -1:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

def conveyor_has_loop(labels: list[int], pos: int) -> bool:
    head = _build_loop(labels, pos)
    # Two trackers, both starting on the first cart.
    slow = fast = head
    # fast moves two links per tick, so it is the one that can fall off the
    # end — guard both hops before taking them.
    while fast and fast.next:
        slow = slow.next            # walker: one link
        fast = fast.next.next       # sprinter: two links
        if slow is fast:            # same OBJECT, not same label
            return True             # the sprinter lapped the walker: loop
    # The sprinter reached the dock — the chain ends, no loop.
    return False
`,
        commentary: `
The naive instinct is to remember every cart you have seen and flag a repeat — correct, but it costs \`O(n)\` memory, which the controller doesn't have.

The two-speed trick converts "infinite looping" into a finite, observable event. If the chain ends, the fast tracker reaches the dock within \`n/2\` ticks and we return \`False\` having stored nothing. If the chain loops, both trackers eventually enter the loop, and from that tick onward the gap between them — measured around the loop — shrinks by exactly one cart per tick (fast gains 2, slow gains 1). A gap that shrinks by one cannot skip over zero, so they must land on the **same cart object** within one loop-length of ticks.

Two details carry the correctness. First, the comparison is \`slow is fast\` — object identity — because distinct carts can share a label (see the all-sevens test). Second, the comparison happens *after* moving: both trackers begin on the head, and comparing before the first move would report a loop on every non-empty chain. The empty chain never enters the loop (\`fast\` is \`None\`) and correctly returns \`False\`.
`,
        complexity: 'Time O(n), Space O(1)',
      },
      testCases: [
        { input: [[3, 1, 4, 1], 1], expected: true, label: 'loop back to index 1' },
        { input: [[7, 7, 7], -1], expected: false, label: 'equal labels, no loop' },
        { input: [[9], 0], expected: true, label: 'single cart self-loop' },
        { input: [[9], -1], expected: false, label: 'single cart, dock' },
        { input: [[], -1], expected: false, hidden: true, label: 'empty hall' },
        { input: [[2, 2, 2, 2], 3], expected: true, hidden: true, label: 'all equal, tail self-loop' },
        { input: [[1, 2, 3, 4, 5, 6, 7, 8], 0], expected: true, hidden: true, label: 'full circle back to head' },
        { input: [[5, 4, 3, 2, 1], -1], expected: false, hidden: true, label: 'longer chain, no loop' },
      ],
      furtherPractice: [
        { name: 'LeetCode 141. Linked List Cycle', note: 'the classic formulation' },
        { name: 'LeetCode 202. Happy Number', note: 'same detection on an implicit number chain' },
      ],
    },
    {
      id: 'print-queue-middle',
      title: 'Print Queue Checkpoint',
      difficulty: 'medium',
      statement: `
A legacy print spooler keeps pending jobs as a singly linked chain of \`ListNode\` objects — each node holds a job ID and a link to the next job. A health monitor wants to sample the job sitting at the **middle** of the queue, but the spooler's API is brutal: you may traverse the chain **once**, you don't know its length in advance, and you may not copy nodes into a list or walk the chain a second time.

Given the job IDs \`job_ids\` in queue order (the starter code builds the chain for you — treat the chain, not the Python list, as your input), return the ID of the middle job after a **single pass** using \`O(1)\` extra space.

If the queue has an even number of jobs, return the **second** of the two middle jobs (the one closer to the back of the queue).
`,
      examples: [
        {
          input: 'job_ids = [10, 20, 30]',
          output: '20',
          explanation: 'Three jobs; the middle one is the second job, ID 20.',
        },
        {
          input: 'job_ids = [4, 9]',
          output: '9',
          explanation: 'Even length: of the two middles (4 and 9), return the second, ID 9.',
        },
        {
          input: 'job_ids = [42]',
          output: '42',
          explanation: 'A single job is its own middle.',
        },
      ],
      constraints: [
        '1 <= len(job_ids) <= 100_000',
        '-10^9 <= job_ids[k] <= 10^9',
        'Single pass over the chain; O(1) extra space',
        'Do not index into the job_ids list or call len() on it — traverse the chain',
      ],
      hints: [
        'Counting the jobs and then walking halfway costs two passes. What could pace out "half the distance" while the chain is still being discovered for the first time?',
        'Walk two cursors from the head in the same pass: one advancing one node per tick, the other two nodes per tick. Where is the slower one when the faster one runs out of chain?',
        'Loop while fast and fast.next: slow = slow.next, fast = fast.next.next. When the loop exits, slow sits on the middle (the second middle for even lengths) — return slow.val.',
      ],
      functionName: 'middle_job_id',
      starterCode: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_chain(values: list[int]) -> 'ListNode | None':
    """Build the job chain in order. Treat the chain as your input."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def middle_job_id(job_ids: list[int]) -> int:
    head = _build_chain(job_ids)
    # One pass over the chain, O(1) extra space. Do not use job_ids below.
    pass
`,
      solution: {
        code: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_chain(values: list[int]) -> 'ListNode | None':
    # Build front-to-back by prepending in reverse, so values[0] is the head.
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def middle_job_id(job_ids: list[int]) -> int:
    head = _build_chain(job_ids)
    # Both cursors start at the front of the queue.
    slow = fast = head
    # fast covers two links per tick; when it can no longer take a full
    # double-step, it has reached the back of the queue.
    while fast and fast.next:
        slow = slow.next            # half speed...
        fast = fast.next.next       # ...full speed
    # fast walked the whole queue, so slow walked exactly half of it:
    # the middle node (second middle when the length is even).
    return slow.val
`,
        commentary: `
The obvious plan — count the jobs, then walk \`count // 2\` links — is correct but needs **two** passes, which the spooler forbids. The speed-ratio trick collapses it to one: if one cursor always moves twice as fast as another, then at the instant the fast cursor exhausts the chain, the slow cursor has covered exactly half the distance. The chain's length is never computed; it is *implied* by where fast stops.

The only delicate point is parity. With an odd number of jobs (say 5), fast stops on the last node (\`fast.next\` is \`None\`) after slow has moved twice — slow is on node 3, the true middle. With an even number (say 4), fast runs off the end (\`fast\` is \`None\`) after slow moved twice — slow is on node 3, the **second** of the two middles, exactly what the statement asks for. If a problem ever wants the *first* middle instead, the fix is to drag a trailing pointer or tighten the guard to stop one step earlier; deciding this consciously is the difference between passing and failing even-length cases.

The guard order matters too: \`fast and fast.next\` short-circuits, so we never dereference \`None\` on either parity. One pass, two references, no arithmetic on lengths.
`,
        complexity: 'Time O(n), Space O(1)',
      },
      testCases: [
        { input: [[10, 20, 30]], expected: 20, label: 'odd length' },
        { input: [[4, 9]], expected: 9, label: 'even length: second middle' },
        { input: [[42]], expected: 42, label: 'single job' },
        { input: [[5, 5, 5, 5]], expected: 5, hidden: true, label: 'all-equal IDs' },
        { input: [[2, 4, 6, 8, 10, 12]], expected: 8, hidden: true, label: 'six jobs, index 3' },
        { input: [[-7, -3, 0, 3, 7]], expected: 0, label: 'negative IDs, odd' },
        {
          input: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]],
          expected: 11,
          hidden: true,
          label: 'twenty jobs, second middle',
        },
        { input: [[9, 8, 7, 6, 5, 4, 3]], expected: 6, hidden: true, label: 'seven jobs, descending IDs' },
      ],
      furtherPractice: [
        { name: 'LeetCode 876. Middle of the Linked List', note: 'the classic version' },
        { name: 'LeetCode 19. Remove Nth Node From End of List', note: 'the fixed-gap cousin of the speed trick' },
      ],
    },
    {
      id: 'daisy-chain-entry',
      title: 'Firmware Daisy-Chain Fault',
      difficulty: 'medium',
      statement: `
A factory pushes firmware down a daisy-chain of controllers: each controller holds a device ID and forwards the update to exactly one next controller. A corrupted routing table has made the **last** controller forward back into the chain, so updates orbit a group of devices endlessly, and the maintenance team needs to know **which controller the orbit begins at** so they can splice in a fix there.

You are given the device IDs \`device_ids\` in chain order and a build parameter \`pos\` — the index the final controller forwards back to, or \`-1\` if the chain terminates correctly. As before, \`pos\` is consumed **only** by the chain builder in the starter code; your logic must locate the fault by walking links alone, because the field tool that ships your code cannot see the routing table.

Return the **0-based index** (position in chain order) of the controller where the loop begins, or \`-1\` if there is no loop.

The field tool has two pointer registers: \`O(1)\` extra space, no visited-set.
`,
      examples: [
        {
          input: 'device_ids = [3, 2, 0, -4], pos = 1',
          output: '1',
          explanation:
            'The fourth controller forwards back to index 1, so the orbit is the controllers at indices 1, 2, 3. It begins at index 1.',
        },
        {
          input: 'device_ids = [1, 2], pos = 0',
          output: '0',
          explanation: 'The second controller forwards back to the first: the orbit starts at index 0.',
        },
        {
          input: 'device_ids = [1, 2, 3, 4, 5, 6], pos = -1',
          output: '-1',
          explanation: 'The chain terminates normally — there is no orbit.',
        },
      ],
      constraints: [
        '0 <= len(device_ids) <= 100_000',
        '-10^9 <= device_ids[k] <= 10^9',
        'pos == -1 or 0 <= pos < len(device_ids)',
        'O(1) extra space; locate the fault by walking links only — do not read pos in your logic',
      ],
      hints: [
        'Detecting that an orbit exists is the easy half. Before coding, ask: when your detection method fires, what do you actually know about where you are standing relative to where the orbit begins?',
        'Run the two-speed walk until the cursors collide inside the orbit. The collision point is generally NOT the entry — but the distance from the head to the entry and the distance from the collision point to the entry are related in a very convenient way.',
        'After the collision, reset one cursor to the head and advance both one step per tick, counting ticks. The first node where they coincide is the orbit entry; the tick count is its index. No collision (fast hits the end) means return -1.',
      ],
      functionName: 'loop_entry_index',
      starterCode: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_loop(values: list[int], pos: int) -> 'ListNode | None':
    """Build the daisy-chain; the last node links back to index pos (-1 = none)."""
    nodes = [ListNode(v) for v in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if nodes and pos != -1:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

def loop_entry_index(device_ids: list[int], pos: int) -> int:
    head = _build_loop(device_ids, pos)
    # Walk the chain from head. Do not use pos below this line.
    pass
`,
      solution: {
        code: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_loop(values: list[int], pos: int) -> 'ListNode | None':
    # Straight chain of controllers; the final link optionally bends back.
    nodes = [ListNode(v) for v in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if nodes and pos != -1:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

def loop_entry_index(device_ids: list[int], pos: int) -> int:
    head = _build_loop(device_ids, pos)
    slow = fast = head
    # ---- Phase 1: prove an orbit exists and collide somewhere inside it.
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            # ---- Phase 2: the head and the collision point are the same
            # number of steps away from the orbit entry (modulo orbit size),
            # so two single-speed cursors must first meet exactly there.
            finder = head
            index = 0
            while finder is not slow:
                finder = finder.next
                slow = slow.next
                index += 1          # count chain-order steps from the head
            return index            # steps from head == 0-based entry index
    # fast reached the end of the chain: it terminates, no orbit.
    return -1
`,
        commentary: `
Phase 1 is the standard two-speed collision. The insight that makes phase 2 work is an accounting identity. Let the tail before the orbit have \`mu\` controllers and the orbit have \`lam\`. When the cursors collide, slow has taken \`mu + s\` steps (for some position \`s\` inside the orbit) and fast exactly \`2(mu + s)\`. The difference — also \`mu + s\` — is the number of extra links fast traveled, and those extra links are all laps of the orbit, so \`mu + s\` is a multiple of \`lam\`.

Read that as: starting at the collision point (which sits \`s\` steps past the entry), walking \`mu\` more steps completes a whole number of laps and lands precisely on the entry. But \`mu\` steps from the *head* also lands on the entry, by definition. So two single-speed cursors — one from the head, one from the collision point — stay in lockstep and **first** coincide at the entry, after exactly \`mu\` ticks. Counting those ticks gives the entry's index in chain order for free, since the head-side cursor walks the chain in order.

Identity comparison (\`is\`) matters again: the all-sevens hidden case has five equal IDs, and only object identity distinguishes the orbit entry from its lookalikes. The empty chain and terminating chains never collide and fall through to \`-1\`.
`,
        complexity: 'Time O(n), Space O(1)',
      },
      testCases: [
        { input: [[3, 2, 0, -4], 1], expected: 1, label: 'orbit entry mid-chain' },
        { input: [[1, 2], 0], expected: 0, label: 'orbit entry at head' },
        { input: [[1, 2, 3, 4, 5, 6], -1], expected: -1, label: 'terminating chain' },
        { input: [[1], -1], expected: -1, label: 'single controller, no orbit' },
        { input: [[], -1], expected: -1, hidden: true, label: 'empty chain' },
        { input: [[5], 0], expected: 0, hidden: true, label: 'single controller self-orbit' },
        { input: [[7, 7, 7, 7, 7], 2], expected: 2, hidden: true, label: 'all-equal IDs' },
        { input: [[10, 20, 30, 40, 50, 60, 70], 6], expected: 6, hidden: true, label: 'tail self-orbit' },
        { input: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 3], expected: 3, hidden: true, label: 'long tail before orbit' },
      ],
      furtherPractice: [
        { name: 'LeetCode 142. Linked List Cycle II', note: 'the classic phase-2 problem' },
        { name: 'LeetCode 287. Find the Duplicate Number', note: 'phase 2 on an implicit array chain' },
      ],
    },
    {
      id: 'register-orbit',
      title: 'Watchdog Register Orbit',
      difficulty: 'hard',
      statement: `
A vintage industrial controller scrambles its watchdog register once per tick with a fixed rule: replace the register's value \`n\` with the sum of \`d * d + d\` over every decimal digit \`d\` of \`n\` (the value \`0\` scrambles to \`0\`). Because the result of a scramble is small, the register's trajectory is eventually trapped: after some warm-up it falls into an **orbit** — a sequence of values that repeats forever (a value that maps to itself is an orbit of length 1).

Given the register's starting value \`n\` (which counts as tick 0), return a two-element list \`[warmup, period]\`:

- \`warmup\` — the number of ticks before the register **first** holds a value that belongs to the orbit (0 if \`n\` itself is in the orbit),
- \`period\` — the orbit's length.

The controller's diagnostic port exposes only two scratch words, so your solution must use \`O(1)\` extra space — **no set or dict of seen values**. You never build a linked list here: the scramble rule itself is the "next pointer".
`,
      examples: [
        {
          input: 'n = 42',
          output: '[0, 8]',
          explanation:
            'The trajectory is 42 → 26 → 48 → 92 → 96 → 132 → 20 → 6 → 42 → … — the start value itself sits inside an orbit of 8 values, so the warm-up is 0.',
        },
        {
          input: 'n = 555',
          output: '[1, 1]',
          explanation:
            '555 scrambles to 90 (three times 25 + 5 = 30 each), and 90 scrambles to 81 + 9 + 0 = 90: a fixed point. One warm-up tick, then an orbit of length 1.',
        },
        {
          input: 'n = 0',
          output: '[0, 1]',
          explanation: '0 maps to 0 immediately: already inside a length-1 orbit.',
        },
        {
          input: 'n = 7',
          output: '[4, 8]',
          explanation:
            '7 → 56 → 72 → 62 → 48, and 48 is the first value of the trajectory inside the 8-value orbit, reached after 4 ticks.',
        },
      ],
      constraints: [
        '0 <= n <= 10^9',
        'O(1) extra space — no set/dict of previously seen values',
        'Return [warmup, period] as a list of two non-negative integers',
      ],
      hints: [
        'Each register value has exactly one successor under the scramble rule. What familiar data structure does that make the trajectory, even though there are no nodes or pointers anywhere?',
        'Run the two-speed walk on values: slow = scramble(slow), fast = scramble(scramble(fast)). Values are states here, so == is the right comparison. Once they meet you are inside the orbit — then recall what the meeting point lets you recover.',
        'Three sweeps: (1) collide slow/fast to prove you are in the orbit; (2) reset one cursor to n, step both singly, counting ticks until they are equal — that count is warmup and the meeting value is the orbit entry; (3) walk the orbit once from the entry, counting steps until you return — that is period.',
      ],
      functionName: 'register_orbit',
      starterCode: `def _scramble(n: int) -> int:
    """One watchdog tick: sum d*d + d over the decimal digits d of n."""
    total = 0
    while n:
        d = n % 10
        total += d * d + d
        n //= 10
    return total

def register_orbit(n: int) -> list[int]:
    # Return [warmup, period] using O(1) extra space (no seen-set).
    pass
`,
      solution: {
        code: `def _scramble(n: int) -> int:
    # One watchdog tick: peel decimal digits and sum d*d + d.
    # n == 0 skips the loop and returns 0, making 0 a fixed point.
    total = 0
    while n:
        d = n % 10
        total += d * d + d
        n //= 10
    return total

def register_orbit(n: int) -> list[int]:
    # The scramble rule is a functional graph: every value has exactly one
    # successor, so the trajectory from n is an implicit linked list with a
    # rho shape — a warm-up tail flowing into a closed orbit.

    # ---- Phase 1: collide a 1x and a 2x cursor somewhere inside the orbit.
    slow = _scramble(n)             # one tick ahead of the start
    fast = _scramble(_scramble(n))  # two ticks ahead
    while slow != fast:             # values ARE the states: compare with ==
        slow = _scramble(slow)
        fast = _scramble(_scramble(fast))

    # ---- Phase 2: measure the warm-up. The start and the collision value
    # are equidistant from the orbit entry (mod period), so two single-speed
    # cursors first coincide exactly at the entry.
    warmup = 0
    slow = n                        # restart one cursor at tick 0
    while slow != fast:
        slow = _scramble(slow)
        fast = _scramble(fast)
        warmup += 1
    entry = slow                    # first value of the trajectory in the orbit

    # ---- Phase 3: lap the orbit once to measure its period.
    period = 1
    probe = _scramble(entry)
    while probe != entry:
        probe = _scramble(probe)
        period += 1

    return [warmup, period]
`,
        commentary: `
There is no \`ListNode\` anywhere, yet this is a linked-list problem: a deterministic step function gives every value exactly one successor, so the trajectory from \`n\` traces the classic rho (ρ) shape — a tail of \`warmup\` values flowing into a closed orbit of \`period\` values. The trajectory is trapped because a scramble of any value below \`10^10\` is at most \`10 * (81 + 9) = 900\`, so the reachable state space is finite and repetition is inevitable.

The hash-set solution (record values until one repeats, then read both numbers off the recorded indices) is the tempting move, and the \`O(1)\`-space constraint is what forces full Floyd. Phase 1 collides a 1x and a 2x cursor; the same lap-counting identity as on pointer chains shows the collision value sits \`warmup\` steps short of completing laps, so phase 2 — one cursor restarted at \`n\`, both advancing one tick — first agrees exactly at the orbit's entry, and the tick counter reads off \`warmup\`. Phase 3 is then trivial: lap the orbit once from the entry and count.

Two adaptations from the pointer version are easy to fumble. States are *values*, so the comparison is \`==\`, not \`is\`. And there is no \`None\` to guard against — the chain cannot end — but \`fast\` must still apply the scramble **twice** per step, or the two cursors degenerate to the same speed and the phase-1 loop never exits. Note also that phase 1 must take one step *before* comparing (here, by initializing \`slow\` and \`fast\` one and two ticks in), or a start value already in the orbit would be compared against itself at distance zero in a misleading way.
`,
        complexity: 'Time O((warmup + period) * log n) — each scramble costs O(log n) digit work, Space O(1)',
      },
      testCases: [
        { input: [42], expected: [0, 8], label: 'starts inside the 8-orbit' },
        { input: [555], expected: [1, 1], label: 'one tick to the fixed point 90' },
        { input: [0], expected: [0, 1], label: 'zero is a fixed point' },
        { input: [7], expected: [4, 8], label: 'short warm-up into the 8-orbit' },
        { input: [90], expected: [0, 1], hidden: true, label: 'already at the nonzero fixed point' },
        { input: [8888], expected: [15, 8], hidden: true, label: 'all-equal digits, long warm-up' },
        { input: [999999999], expected: [12, 8], hidden: true, label: 'maximum input' },
        { input: [13], expected: [7, 8], hidden: true, label: 'mid-length warm-up' },
      ],
      furtherPractice: [
        { name: 'LeetCode 202. Happy Number', note: 'the gateway version: detect the orbit, ignore its shape' },
        { name: 'LeetCode 287. Find the Duplicate Number', note: 'the same rho geometry hiding in an array' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt:
        'Inside a cycle, why is the fast pointer guaranteed to land exactly ON the slow pointer rather than repeatedly jumping over it?',
      choices: [
        'Because the fast pointer slows down to one step per tick once it enters the cycle',
        'Because the gap between them, measured around the cycle, shrinks by exactly one node per tick, and a gap shrinking by one cannot skip past zero',
        'Because cycles in linked lists always have an even number of nodes',
        'It is not guaranteed — implementations must also check fast against slow.next',
      ],
      correctIndex: 1,
      explanation:
        'Once both pointers are in the cycle, each tick moves fast 2 and slow 1, so their circular gap decreases by exactly 1 per tick: it walks down through every integer to 0, where they occupy the same node. Choice 4 is the tempting hedge — checking slow.next is unnecessary precisely because a gap of 1 becomes 0 on the next tick, never -1. Cycle lengths can be any size (choice 3), and fast never changes speed (choice 1).',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt:
        "After the two-speed pointers collide, Floyd's phase 2 resets one pointer to the head and advances both ONE step per tick. Why do they meet exactly at the cycle entry?",
      choices: [
        'Because the collision always happens at the node just before the entry',
        'Because the head-to-entry distance equals the collision-to-entry distance modulo the cycle length: slow traveled mu + s steps, fast twice that, so mu + s is a whole number of laps',
        'Because phase 2 compares node values, and the entry node holds the smallest value in the cycle',
        'Because the fast pointer remembers how many laps it completed during phase 1',
      ],
      correctIndex: 1,
      explanation:
        'At collision, fast has traveled exactly twice slow’s mu + s steps; the surplus mu + s consists purely of laps, so mu ≡ -s (mod cycle length). Walking mu from the collision point therefore lands on the entry — the same node reached walking mu from the head — and the two single-speed cursors first coincide there. The collision point is generally NOT adjacent to the entry (choice 1), values are irrelevant (choice 3), and no lap count is stored anywhere (choice 4).',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt:
        "What are the time and space costs of Floyd's cycle detection (both phases) on a chain of n nodes?",
      choices: [
        'O(n) time, O(n) space',
        'O(n log n) time, O(1) space',
        'O(n) time, O(1) space',
        'O(n^2) time, O(1) space',
      ],
      correctIndex: 2,
      explanation:
        'Phase 1 collides within tail-length + cycle-length ≤ n slow-steps (fast does at most 2n), and phase 2 adds at most another n single steps — linear time with just two or three references of state. O(n) space describes the hash-set alternative the pattern exists to avoid; nothing here sorts (no log factor) or nests scans (no n^2).',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'Finding the middle of a linked list with fast/slow pointers, versus counting the length and then walking count // 2 nodes: what is the asymptotic difference?',
      choices: [
        'Fast/slow is O(log n) versus O(n) for count-then-walk',
        'None — both are O(n) time and O(1) space; fast/slow wins by doing it in a single traversal instead of two',
        'Fast/slow is O(n) versus O(n log n) for count-then-walk',
        'Count-then-walk is asymptotically faster but uses more memory',
      ],
      correctIndex: 1,
      explanation:
        'Count-then-walk touches about 1.5n nodes across two passes; fast/slow touches about 1.5n nodes in one pass. Same O(n) time, same O(1) space — the benefit is structural (one traversal, works on stream-like access), not asymptotic. Believing fast/slow is O(log n) confuses it with binary search, which needs random access a linked list does not offer.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'A monitoring agent must check a 10-million-node, READ-ONLY linked structure for a cycle on a device with a few kilobytes of free RAM. Which approach works?',
      choices: [
        'Store each visited node reference in a hash set and flag the first repeat',
        'Two pointers at different speeds; report a cycle if they ever reference the same node',
        'Set a visited flag on each node as you traverse and flag the first already-flagged node',
        'Traverse recursively and report a cycle if the recursion gets unusually deep',
      ],
      correctIndex: 1,
      explanation:
        'The hash set is the tempting default and is correct in unconstrained settings, but 10 million stored references is megabytes — far over budget. Visited flags require mutating a read-only structure, and recursion depth is both an unreliable signal and a stack overflow waiting to happen at 10M frames. Fast/slow needs two references regardless of input size.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        'An array of n + 1 integers, each in the range 1..n, is guaranteed to contain a repeated value. You must find it in O(n) time WITHOUT modifying the array and with O(1) extra space. Which approach fits?',
      choices: [
        'Sort the array and scan for adjacent equal values',
        'Insert values into a hash set and return the first one already present',
        'Treat each value as the index of a "next" element, making an implicit chain from index 0, and run two-speed pointers to find the cycle entry',
        'For each element, scan the rest of the array for a match',
      ],
      correctIndex: 2,
      explanation:
        'Because values lie in 1..n, i -> arr[i] is a step function over valid indices, and a duplicated value is exactly two chain links pointing at the same node — a cycle whose entry is the duplicate. Floyd phases 1 and 2 find it in O(n)/O(1). Sorting violates the no-modification rule (or costs O(n) extra to copy), the hash set is the tempting O(n)-space pattern the constraints forbid, and pairwise scanning is O(n^2).',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt:
        "In the loop 'while <guard>: slow = slow.next; fast = fast.next.next', what must the guard be, and why?",
      choices: [
        'fast is not None and fast.next is not None — otherwise the double step dereferences None when an acyclic chain ends',
        'slow is not None and slow.next is not None — slow is the pointer that falls off the end first',
        'slow is not fast — the loop should run until the pointers meet',
        'fast.next is not None alone — fast itself can never be None inside the loop',
      ],
      correctIndex: 0,
      explanation:
        'On an acyclic list, fast reaches the end first; depending on parity it ends as None or as the last node, so both fast and fast.next need checking before taking a two-link hop. Slow trails behind and is never the first to fall off (choice 2). Guarding only on slow is not fast (choice 3) loops forever or crashes on acyclic input, and checking fast.next without checking fast (choice 4) crashes when fast is already None.',
    },
    {
      id: 'q8',
      kind: 'complexity',
      prompt:
        'A chain has a tail of mu nodes leading into a cycle of lam nodes. How many ticks does phase 1 (the two-speed walk) take to collide, as a function of mu and lam?',
      choices: [
        'O(mu * lam)',
        'O(mu + lam)',
        'O(lam log mu)',
        'O((mu + lam)^2)',
      ],
      correctIndex: 1,
      explanation:
        'Slow enters the cycle after exactly mu ticks. At that moment fast is somewhere in the cycle, at a circular gap of at most lam - 1, and the gap closes by 1 per tick — so at most lam - 1 further ticks. Total: under mu + lam ticks, i.e. linear in the chain size. The product, the log form, and the square all over-count what is a one-directional, never-repeating closing of a gap.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Problem says "cycle", "loops forever", or "does this process repeat?" with O(1) space — which pattern?',
      back: 'Fast & slow pointers (Floyd). One cursor moves 1 step, the other 2; in a cycle the gap shrinks by 1 per tick so they must collide. No visited-set needed.',
    },
    {
      id: 'f2',
      front: 'Phase-1 cycle detection template for a pointer chain?',
      back: 'slow = fast = head; while fast and fast.next: slow = slow.next; fast = fast.next.next; if slow is fast → cycle. Loop exit → no cycle.',
    },
    {
      id: 'f3',
      front: 'You detected a cycle. How do you find the node where it BEGINS?',
      back: 'Phase 2: reset one pointer to head, advance both ONE step per tick; they first coincide at the cycle entry. Works because head→entry ≡ collision→entry (mod cycle length).',
    },
    {
      id: 'f4',
      front: 'Middle of a linked list in one pass — template and even-length behavior?',
      back: 'slow = fast = head; while fast and fast.next: slow = slow.next; fast = fast.next.next. slow ends on the middle — the SECOND middle for even lengths. Stop fast a step earlier if the first middle is wanted.',
    },
    {
      id: 'f5',
      front: 'Why can the hare never jump OVER the tortoise inside a cycle?',
      back: 'Relative speed is exactly 1 node per tick, so the circular gap decreases by 1 each tick. A gap that decreases by 1 passes through every value down to 0 — it cannot skip from 1 to -1.',
    },
    {
      id: 'f6',
      front: 'Complexity of Floyd cycle detection (both phases) vs the hash-set-of-visited approach?',
      back: 'Both are O(n) time. Floyd uses O(1) space (two references); the hash set uses O(n) space. Tight-memory or read-only constraints are the signal to choose Floyd.',
    },
    {
      id: 'f7',
      front: 'Pitfall: the loop guard for the fast pointer.',
      back: 'Always "while fast and fast.next" before stepping. On acyclic chains fast falls off the end first, and either fast or fast.next is None at that moment — fast.next.next without the guard crashes.',
    },
    {
      id: 'f8',
      front: 'Pitfall: how should the two pointers be compared on a node chain, and why?',
      back: 'With identity (slow is fast), never value equality — distinct nodes can hold equal payloads. On implicit chains (number sequences), the state IS the value, so == is correct there.',
    },
    {
      id: 'f9',
      front: 'What is an "implicit" linked list, and what are the classic examples?',
      back: 'Any deterministic step function x → f(x): each state has exactly one successor. Examples: digit-transform processes (happy-number style), PRNG state updates, arrays whose values act as next-indices. Floyd runs unchanged with fast = f(f(fast)).',
    },
    {
      id: 'f10',
      front: "Brent's algorithm — what does it change about the tortoise-and-hare walk?",
      back: 'The fast cursor runs ahead in power-of-two bursts and the slow cursor teleports to it between bursts. Same O(1) space and linear time, but fewer applications of the step function — preferred when f is expensive (e.g. Pollard rho).',
    },
  ],
  cheatSheet: {
    tldr:
      'Fast & slow pointers run two cursors over the same sequence at speeds 1x and 2x and read answers off the speed ratio: in a cycle the 2x cursor gains one node per tick on the 1x cursor and must land exactly on it (cycle detected, O(1) space); resetting one cursor to the start and stepping both 1x finds where the cycle begins; and when the fast cursor exhausts an acyclic chain, the slow one stands on the middle. The sequence can be a real next-pointer chain or any iterated function x → f(x) — digit processes, PRNG states, values-as-indices arrays.',
    signals: [
      'Reach for this when the problem asks whether a linked structure or iterated process cycles / repeats / fails to terminate — especially with O(1)-space or read-only constraints that rule out a visited-set.',
      'Reach for this when you need the middle (or a fixed offset from the end) of a singly linked chain in one pass without knowing its length.',
      'Reach for this when you must locate where a cycle starts or measure its period, not just detect it — Floyd phase 2 and a final lap give both.',
      'Reach for this when each state has exactly one successor (a functional graph) — that is an implicit linked list even with no nodes in sight.',
      'Be suspicious when nodes can have multiple successors (general graph → DFS with coloring) or when memory is plentiful and you also want first-repeat indices (hash map of state → step is simpler).',
    ],
    template: `# Phase 1 — detect: do the pointers ever collide?
slow = fast = head
while fast and fast.next:
    slow = slow.next             # 1x
    fast = fast.next.next        # 2x
    if slow is fast:             # identity on nodes; == on value states
        break
else:
    return None                  # fast hit the end: no cycle

# Phase 2 — locate the cycle entry
finder = head
while finder is not slow:
    finder = finder.next         # both at 1x; they first meet at the entry
    slow = slow.next
# finder is the cycle's first node

# Middle of an acyclic chain (one pass)
slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
# slow is the middle (second middle for even length)`,
    complexity: 'Time O(n) — at most tail + cycle steps per phase; Space O(1) (two references).',
  },
}

export default mod
