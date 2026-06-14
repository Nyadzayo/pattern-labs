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
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define the chained-record node type',
            acceptableKeywords: ['node class with value and next', 'linked node definition', 'declare the list node', 'val and pointer fields'],
            hint: 'What data type holds a value plus a link to its successor?',
            misconception: 'This only declares the building block — it does no traversal or detection itself.',
          },
          {
            lineRange: [5, 14],
            referenceLabel: 'Construct the chain, optionally bending the tail back',
            acceptableKeywords: ['build the linked structure', 'wire nodes in sequence', 'connect last node to an earlier one', 'assemble chain from values'],
            hint: 'How do raw values become a chain whose end may point back inward?',
            misconception: 'This is test scaffolding that shapes the input — it is not the cycle test.',
          },
          {
            lineRange: [15, 21],
            referenceLabel: 'Anchor both cursors at the start before stepping',
            acceptableKeywords: ['place both pointers at head', 'slow and fast start together', 'initialize the two cursors', 'set up before the loop'],
            hint: 'Where do the two differently-paced cursors begin?',
            misconception: 'Comparing the cursors here, before any move, would falsely report a cycle on every nonempty chain.',
          },
          {
            lineRange: [22, 26],
            referenceLabel: 'Advance at two speeds and test for a collision',
            acceptableKeywords: ['move slow one fast two', 'check identity after stepping', 'detect the cursors meeting', 'two-speed advance and compare'],
            hint: 'How does a faster cursor reveal a loop without recording visited nodes?',
            misconception: 'Equal payloads do not mean a meeting — only the same object identity proves the lap.',
          },
          {
            lineRange: [27, 28],
            referenceLabel: 'Falling off the end means no loop',
            acceptableKeywords: ['reached the end no cycle', 'fast hit null return false', 'chain terminates', 'exit without a meeting'],
            hint: 'If the fast cursor runs off the end, what does that prove?',
            misconception: 'Reaching here is the acyclic verdict, not an unfinished search.',
          },
        ],
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
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define the chained-record node type',
            acceptableKeywords: ['node class with value and next', 'linked node definition', 'declare the list node', 'val and pointer fields'],
            hint: 'What data type holds a value plus a link to its successor?',
            misconception: 'This is just the element definition — it computes no midpoint on its own.',
          },
          {
            lineRange: [5, 11],
            referenceLabel: 'Materialize the values into a forward chain',
            acceptableKeywords: ['build the linked structure', 'turn list into chain', 'prepend to keep head first', 'assemble chain from values'],
            hint: 'How do the input values become a chain whose first value is the head?',
            misconception: 'This setup prepares the input; the one-pass scan happens afterward.',
          },
          {
            lineRange: [12, 16],
            referenceLabel: 'Anchor both cursors at the front',
            acceptableKeywords: ['place both pointers at head', 'slow and fast start together', 'initialize the two cursors', 'set up before the loop'],
            hint: 'Before measuring, where do the two cursors both begin?',
            misconception: 'No distance is measured here yet — this only positions the cursors.',
          },
          {
            lineRange: [17, 21],
            referenceLabel: 'Drive the fast cursor to the end at double pace',
            acceptableKeywords: ['move slow one fast two', 'advance until fast exhausts', 'two-speed walk to the end', 'guard before double step'],
            hint: 'What loop makes one cursor reach the end while the other covers half?',
            misconception: 'The length is never counted — it is implied by where the fast cursor stops.',
          },
          {
            lineRange: [22, 24],
            referenceLabel: 'Read the half-distance cursor as the answer',
            acceptableKeywords: ['return the slow cursor value', 'slow sits at the middle', 'report the midpoint', 'half-distance node value'],
            hint: 'When the fast cursor finishes, what does the slow cursor now point at?',
            misconception: 'This reports the midpoint position, not a per-step decision inside the walk.',
          },
        ],
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
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define the chained-record node type',
            acceptableKeywords: ['node class with value and next', 'linked node definition', 'declare the list node', 'val and pointer fields'],
            hint: 'What data type holds a value plus a link to its successor?',
            misconception: 'This declares the element only — locating the loop start happens later.',
          },
          {
            lineRange: [5, 13],
            referenceLabel: 'Construct the chain, optionally bending the tail back',
            acceptableKeywords: ['build the linked structure', 'wire nodes in sequence', 'connect last node to an earlier one', 'assemble chain from values'],
            hint: 'How do raw values become a chain whose end may loop inward?',
            misconception: 'This input scaffolding shapes the test case; it is not the entry search.',
          },
          {
            lineRange: [14, 17],
            referenceLabel: 'Anchor both cursors at the start',
            acceptableKeywords: ['place both pointers at head', 'slow and fast start together', 'initialize the two cursors', 'set up before the loop'],
            hint: 'Where do the two differently-paced cursors begin?',
            misconception: 'No detection happens here; this only positions the cursors for phase one.',
          },
          {
            lineRange: [18, 32],
            referenceLabel: 'Collide inside the loop, then re-walk to its start',
            acceptableKeywords: ['two-speed collision then reset', 'restart one cursor at head', 'walk single speed to the entry', 'find where the loop begins'],
            hint: 'After the cursors meet, how does a head-reset cursor reveal the loop entrance?',
            misconception: 'The first meeting point is somewhere inside the loop, not the loop start — a second equal-speed phase is required.',
          },
          {
            lineRange: [33, 34],
            referenceLabel: 'A terminating chain has no entry',
            acceptableKeywords: ['no loop return negative one', 'fast reached the end', 'chain terminates', 'fall through to none'],
            hint: 'If the fast cursor exits the loop, what entry index can exist?',
            misconception: 'Reaching here is the acyclic verdict, not an incomplete traversal.',
          },
        ],
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
        subgoals: [
          {
            lineRange: [1, 9],
            referenceLabel: 'Define the deterministic successor function',
            acceptableKeywords: ['the step rule on a value', 'next state transform', 'one transition function', 'how a value maps to its successor'],
            hint: 'On an implicit chain, what plays the role that a next-pointer plays on a real list?',
            misconception: 'This is the edge of the implicit graph, not yet any cycle search.',
          },
          {
            lineRange: [10, 21],
            referenceLabel: 'Race two paces until the states coincide',
            acceptableKeywords: ['advance one and two transforms', 'collide somewhere in the orbit', 'compare states by value equality', 'two-speed walk over states'],
            hint: 'How do two cursors over an implicit chain detect that it eventually repeats?',
            misconception: 'On value-states the comparison is equality, not object identity; and the fast cursor must apply the step twice or it degenerates to the same pace.',
          },
          {
            lineRange: [22, 32],
            referenceLabel: 'Re-walk from the origin to find the loop entry',
            acceptableKeywords: ['restart one cursor at the start', 'count steps to the entry', 'single-speed walk to first repeat point', 'measure the lead-in length'],
            hint: 'After collision, how do you locate the first state that lies on the cycle?',
            misconception: 'This measures where the loop begins, distinct from how long the loop is.',
          },
          {
            lineRange: [33, 39],
            referenceLabel: 'Lap the cycle once to size its period',
            acceptableKeywords: ['step around the loop once', 'count until returning to the entry', 'measure the cycle length', 'one full lap of the orbit'],
            hint: 'Starting from a state on the cycle, how do you measure its length?',
            misconception: 'This counts the loop length, not where the loop starts.',
          },
          {
            lineRange: [40, 41],
            referenceLabel: 'Report the two measured quantities',
            acceptableKeywords: ['return warmup and period', 'emit both measurements', 'package the result pair', 'output lead-in and cycle length'],
            hint: 'What final pair of numbers does the routine hand back?',
            misconception: 'This is the result hand-off, not any further computation.',
          },
        ],
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
    {
      id: 'freight-wagon-spotcheck',
      title: 'Freight Wagon Spot-Check',
      difficulty: 'easy',
      statement: `
A rail yard receives freight trains as chains of coupled wagons: each wagon carries a numeric cargo code and a coupling to the wagon behind it; the last wagon's coupling is empty. Safety regulations require sampling the cargo code of the \`k\`-th wagon **counting from the rear** — \`k = 1\` means the very last wagon.

The catch: the manifest listing the train's length was lost, couplings can only be walked front-to-back, and the inspector refuses to walk the train twice. Given the cargo codes \`cargo_codes\` in front-to-back order (the starter code builds the chain — treat the chain, not the Python list, as your input) and the offset \`k\`, return the sampled cargo code after a **single forward pass** using \`O(1)\` extra space.
`,
      examples: [
        {
          input: 'cargo_codes = [12, 7, 33, 9, 18], k = 2',
          output: '9',
          explanation: 'Counting from the rear: 18 is wagon 1, 9 is wagon 2 — return 9.',
        },
        {
          input: 'cargo_codes = [5], k = 1',
          output: '5',
          explanation: 'A one-wagon train: the last wagon is also the first.',
        },
        {
          input: 'cargo_codes = [4, 4, 4, 8], k = 4',
          output: '4',
          explanation:
            'k equals the train length, so the sample is the front wagon. Repeated codes are irrelevant — position is what matters.',
        },
      ],
      constraints: [
        '1 <= len(cargo_codes) <= 100_000',
        '1 <= k <= len(cargo_codes)',
        '-10^9 <= cargo_codes[i] <= 10^9',
        'Single forward pass over the couplings; O(1) extra space',
        'Do not index into the cargo_codes list or call len() on it — walk the chain',
      ],
      hints: [
        'Walking to the rear to count wagons and then walking again is two passes. Is there something you could arrange early in a single walk so that reaching the rear instantly tells you where the answer is?',
        'Send a lead cursor exactly k couplings ahead, then advance a trailing cursor and the lead together, one wagon per tick. The gap between them never changes — what does that mean when the lead runs out of train?',
        'Advance lead k times from the head. Then loop while lead is not None, stepping both cursors once per tick. When lead falls off the rear, the trailer sits exactly k wagons from the end — return trailer.val.',
      ],
      functionName: 'wagon_from_rear',
      starterCode: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_chain(values: list[int]) -> 'ListNode | None':
    """Build the wagon chain in order. Treat the chain as your input."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def wagon_from_rear(cargo_codes: list[int], k: int) -> int:
    head = _build_chain(cargo_codes)
    # One forward pass, O(1) extra space. Do not use cargo_codes below.
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

def wagon_from_rear(cargo_codes: list[int], k: int) -> int:
    head = _build_chain(cargo_codes)
    # Give a lead cursor a head start of exactly k couplings.
    lead = head
    for _ in range(k):            # k <= train length, so this never falls off
        lead = lead.next          # after the loop, lead is k wagons ahead
    # Now march a trailing cursor and the lead in lockstep. The k-wagon gap
    # is frozen: when lead steps past the rear, trail is k from the end.
    trail = head
    while lead:
        lead = lead.next
        trail = trail.next
    return trail.val
`,
        commentary: `
This is the fast/slow family with the speeds equal and the **gap** doing the work. The middle-finding trick encodes "half the distance" in a 2:1 speed ratio; here the requirement is an *absolute* offset from the rear, so instead of different speeds we use identical speeds and a fixed head start of \`k\` links. An invariant makes it correct: after the setup loop, \`lead\` is always exactly \`k\` wagons ahead of \`trail\`, and lockstep stepping preserves that gap forever. The rear is unobservable until you hit it — but the instant \`lead\` becomes \`None\` (one step past the last wagon), the frozen gap converts that event into "\`trail\` is exactly \`k\` from the end."

The boundary that decides correctness is the head-start count. Advancing the lead \`k\` times (not \`k - 1\`, not \`k + 1\`) makes \`k = 1\` land the trailer on the final wagon and \`k = len\` leave the trailer parked on the head — both verified by the tests. Since the problem guarantees \`1 <= k <= len\`, the setup loop needs no null guard; in an interview, say that assumption out loud, because dropping the guarantee is the most common follow-up.

One pass, two references, and the train's length is never computed — it is implied, exactly as in the midpoint problem, by where the lead cursor dies.
`,
        complexity: 'Time O(n), Space O(1)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define the chained-record node type',
            acceptableKeywords: ['node class with value and next', 'linked node definition', 'declare the list node', 'val and pointer fields'],
            hint: 'What data type holds a value plus a link to its successor?',
            misconception: 'This declares the element only — no offset counting happens here.',
          },
          {
            lineRange: [5, 11],
            referenceLabel: 'Materialize the values into a forward chain',
            acceptableKeywords: ['build the linked structure', 'turn list into chain', 'prepend to keep head first', 'assemble chain from values'],
            hint: 'How do the input values become a chain whose first value is the head?',
            misconception: 'This is input setup; the offset walk comes afterward.',
          },
          {
            lineRange: [12, 18],
            referenceLabel: 'Advance one cursor a fixed offset ahead',
            acceptableKeywords: ['give the lead a head start', 'move one pointer k steps', 'open a fixed gap', 'pre-advance the front cursor'],
            hint: 'How do you create a frozen gap of exactly k between the two cursors?',
            misconception: 'Moving k steps (not k-1 or k+1) is what makes the offset exact — an off-by-one here misplaces the answer.',
          },
          {
            lineRange: [19, 24],
            referenceLabel: 'March both in lockstep until the lead exits',
            acceptableKeywords: ['advance both at equal pace', 'preserve the gap stepping together', 'walk until the lead falls off', 'keep the fixed distance'],
            hint: 'With the gap frozen, what event signals the trailing cursor has reached its target?',
            misconception: 'Equal speeds here, not a 2:1 ratio — the gap, not the pace difference, does the work.',
          },
          {
            lineRange: [25, 25],
            referenceLabel: 'Read the trailing cursor as the answer',
            acceptableKeywords: ['return the trailing value', 'report the k-from-end node', 'output the lagging cursor', 'the trailer holds the result'],
            hint: 'When the lead runs off the end, what does the trailing cursor point at?',
            misconception: 'This reports the located node, not part of the stepping loop.',
          },
        ],
      },
      testCases: [
        { input: [[12, 7, 33, 9, 18], 2], expected: 9, label: 'second from the rear' },
        { input: [[5], 1], expected: 5, label: 'single wagon' },
        { input: [[4, 4, 4, 8], 4], expected: 4, label: 'k equals length: front wagon' },
        { input: [[1, 2], 1], expected: 2, hidden: true, label: 'two wagons, last one' },
        { input: [[10, 20, 30, 40, 50, 60, 70], 7], expected: 10, hidden: true, label: 'k equals length on a longer train' },
        { input: [[10, 20, 30, 40, 50, 60, 70], 1], expected: 70, hidden: true, label: 'rear wagon of a longer train' },
        { input: [[-3, -1, -4, -1, -5, -9], 3], expected: -1, hidden: true, label: 'negative codes, mid-train' },
        { input: [[9, 9, 9, 9, 9], 5], expected: 9, hidden: true, label: 'all-equal codes' },
      ],
      furtherPractice: [
        { name: 'LeetCode 19. Remove Nth Node From End of List', note: 'the classic: same gap trick plus a deletion' },
        { name: 'LeetCode 1721. Swapping Nodes in a Linked List', note: 'front offset and rear offset in one pass' },
      ],
    },
    {
      id: 'meal-route-split',
      title: 'Two-Driver Route Split',
      difficulty: 'medium',
      statement: `
A community kitchen plans its evening meal run as a chain of delivery stops: each stop is a node holding a house number and a link to the next stop. Tonight a second volunteer driver showed up, so dispatch wants the route cut into a **front route** and a **back route** of as-equal-as-possible size — and when the stop count is odd, the **front** route takes the extra stop.

Given the house numbers \`house_numbers\` in route order (the starter builds the chain; treat the chain, not the Python list, as your input), return \`[front, back]\`: two lists of house numbers, each in original route order. The dispatcher's radio protocol allows only **one pass** to locate the cut point and \`O(1)\` extra space beyond the two output lists — counting the stops first is not an option.
`,
      examples: [
        {
          input: 'house_numbers = [101, 105, 110, 112, 120]',
          output: '[[101, 105, 110], [112, 120]]',
          explanation: 'Five stops: the front route takes the extra one (3 stops), the back route takes 2.',
        },
        {
          input: 'house_numbers = [8, 6, 4, 2]',
          output: '[[8, 6], [4, 2]]',
          explanation: 'An even count splits cleanly into 2 and 2.',
        },
        {
          input: 'house_numbers = [77]',
          output: '[[77], []]',
          explanation: 'One stop: the front driver takes it, the back driver gets the night off.',
        },
      ],
      constraints: [
        '1 <= len(house_numbers) <= 100_000',
        '-10^9 <= house_numbers[i] <= 10^9',
        'When the count is odd, the front route receives the extra stop',
        'One pass to find the cut point; O(1) extra space beyond the output lists',
        'Do not index into house_numbers or call len() on it — traverse the chain',
      ],
      hints: [
        'The obvious plan — count the stops, then walk count // 2 links and cut — is two passes. Before optimizing, pin down the parity rule: with 7 stops, exactly which node must be the LAST stop of the front route?',
        'Reuse the 2:1 speed ratio, but notice the standard guard (while fast and fast.next) parks the slow cursor on the SECOND middle for even counts. You need the node just before the cut. How can the guard stop the fast cursor one step earlier?',
        "Loop while fast.next and fast.next.next, stepping slow once and fast twice. Slow halts on the front route's last stop; record back = slow.next, sever with slow.next = None, then walk each half collecting values.",
      ],
      functionName: 'split_delivery_route',
      starterCode: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_chain(values: list[int]) -> 'ListNode | None':
    """Build the stop chain in order. Treat the chain as your input."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def split_delivery_route(house_numbers: list[int]) -> list[list[int]]:
    head = _build_chain(house_numbers)
    # One pass to find the cut, O(1) extra space beyond the output.
    # Do not use house_numbers below.
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

def split_delivery_route(house_numbers: list[int]) -> list[list[int]]:
    head = _build_chain(house_numbers)
    # Find the LAST node of the front half. The tightened guard
    # (fast.next and fast.next.next) stops fast one step earlier than the
    # classic template, which parks slow on the first middle — so the front
    # route keeps the extra stop when the count is odd.
    slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    # Sever the chain right after slow.
    back_head = slow.next
    slow.next = None
    # Read off both halves (the only allocation is the answer itself).
    front: list[int] = []
    node = head
    while node:
        front.append(node.val)
        node = node.next
    back: list[int] = []
    node = back_head
    while node:
        back.append(node.val)
        node = node.next
    return [front, back]
`,
        commentary: `
The midpoint problem earlier in this module needed the middle *node*; a split needs the node **just before the cut**, and that shifts which template variant is correct. The classic guard \`while fast and fast.next\` lands slow on the second middle — cutting there would hand the extra stop to the *back* route on odd counts and, worse, leave you without a handle on the node preceding the cut (singly linked chains cannot step backwards). Tightening the guard to \`fast.next and fast.next.next\` stops the fast cursor one step sooner, parking \`slow\` on the **first** middle: the final stop of the front route, with \`slow.next\` as the back route's head.

Walk the parities to trust it. Five stops: fast visits 1 → 3 → 5 and stops (no \`fast.next.next\`); slow moved twice, to stop 3; front = 3 stops, back = 2 — the odd rule satisfied. Four stops: fast visits 1 → 3 and stops (\`fast.next.next\` missing); slow is on stop 2; the split is 2 and 2. One stop: the guard fails immediately, \`slow.next\` is already \`None\`, and the back route is empty — no special case needed.

The single mutation \`slow.next = None\` is what makes this a true split rather than two overlapping views of one chain: after it, the two halves are independent chains, each readable in route order. Choosing the guard variant *deliberately* — rather than memorizing one template — is the skill this problem isolates.
`,
        complexity: 'Time O(n), Space O(1) beyond the output lists',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define the chained-record node type',
            acceptableKeywords: ['node class with value and next', 'linked node definition', 'declare the list node', 'val and pointer fields'],
            hint: 'What data type holds a value plus a link to its successor?',
            misconception: 'This declares the element only — it performs no splitting.',
          },
          {
            lineRange: [5, 11],
            referenceLabel: 'Materialize the values into a forward chain',
            acceptableKeywords: ['build the linked structure', 'turn list into chain', 'prepend to keep head first', 'assemble chain from values'],
            hint: 'How do the input values become a chain whose first value is the head?',
            misconception: 'This is input setup; finding the split point comes next.',
          },
          {
            lineRange: [12, 22],
            referenceLabel: 'Walk a two-speed scan to the node before the cut',
            acceptableKeywords: ['tightened guard stops one early', 'park slow on the first middle', 'find the last front-half node', 'two-speed to the pre-cut point'],
            hint: 'Which guard variant lands the slow cursor on the FINAL node of the front half?',
            misconception: 'The classic midpoint guard lands on the second middle; the tighter guard is needed so the front half keeps the extra element and you hold the node before the cut.',
          },
          {
            lineRange: [23, 25],
            referenceLabel: 'Detach the tail to make two independent chains',
            acceptableKeywords: ['cut the link after slow', 'set next to none', 'sever into two halves', 'capture the back head then break'],
            hint: 'What single mutation turns one chain into two separate ones?',
            misconception: 'Without nulling the link the halves still overlap — this physical cut is what separates them.',
          },
          {
            lineRange: [26, 37],
            referenceLabel: 'Serialize each half into the answer',
            acceptableKeywords: ['collect values of both halves', 'walk each chain into a list', 'read off the two routes', 'flatten halves to arrays'],
            hint: 'How do the two detached chains become the returned pair of lists?',
            misconception: 'This is just the read-out; the split decision already happened above.',
          },
        ],
      },
      testCases: [
        { input: [[101, 105, 110, 112, 120]], expected: [[101, 105, 110], [112, 120]], label: 'odd count: front takes extra' },
        { input: [[8, 6, 4, 2]], expected: [[8, 6], [4, 2]], label: 'even count: clean split' },
        { input: [[77]], expected: [[77], []], label: 'single stop' },
        { input: [[1, 2]], expected: [[1], [2]], hidden: true, label: 'two stops' },
        { input: [[5, 5, 5, 5, 5, 5]], expected: [[5, 5, 5], [5, 5, 5]], hidden: true, label: 'all-equal house numbers' },
        { input: [[9, 8, 7]], expected: [[9, 8], [7]], hidden: true, label: 'three stops' },
        { input: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], expected: [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]], hidden: true, label: 'ten stops' },
        { input: [[-1, 0, 1, 2, 3, 4, 5]], expected: [[-1, 0, 1, 2], [3, 4, 5]], hidden: true, label: 'seven stops, negatives' },
      ],
      furtherPractice: [
        { name: 'LeetCode 876. Middle of the Linked List', note: 'the other parity variant of the same walk' },
        { name: 'LeetCode 725. Split Linked List in Parts', note: 'generalizes the cut to k pieces' },
      ],
    },
    {
      id: 'river-confluence',
      title: 'Gauge Stations at the Confluence',
      difficulty: 'medium',
      statement: `
A hydrology service instruments two mountain streams. Each stream is a chain of gauge stations — a node holding a station ID and a link to the next station downstream. The streams may **merge**: from the confluence onward they flow through the *same physical stations* (the same node objects), sharing one downstream chain. Or they may drain into separate basins and never meet.

You are given three lists: \`a_ids\` and \`b_ids\` — the stations belonging only to stream A and only to stream B — and \`shared_ids\`, the common downstream section (empty when the streams never meet). The starter's \`_build_rivers\` wires these into two chains that physically share their tail; your logic receives only the two heads and must walk links alone. Station IDs **repeat across streams**, so matching IDs proves nothing — only node identity does.

Return the **ID of the first shared station**, or \`-1\` if the streams never meet. \`O(1)\` extra space: no set of visited stations.
`,
      examples: [
        {
          input: 'a_ids = [4, 1], b_ids = [5, 6, 1], shared_ids = [8, 4, 5]',
          output: '8',
          explanation:
            'Stream A runs 4 → 1 → 8 → 4 → 5; stream B runs 5 → 6 → 1 → 8 → 4 → 5. The first physically shared station is the one with ID 8. Note the decoy repeats: both streams pass an ID-1 station upstream, but those are different objects.',
        },
        {
          input: 'a_ids = [2, 6, 4], b_ids = [1, 5], shared_ids = []',
          output: '-1',
          explanation: 'No shared section — the streams drain into different basins.',
        },
        {
          input: 'a_ids = [], b_ids = [3], shared_ids = [7, 9]',
          output: '7',
          explanation: 'Stream A begins at the confluence itself: its head is already a shared station.',
        },
      ],
      constraints: [
        '0 <= len(a_ids), len(b_ids), len(shared_ids) <= 100_000',
        '-10^9 <= every station ID <= 10^9',
        'IDs may repeat within and across streams — compare nodes by identity, not by ID',
        'O(1) extra space; no set/dict of visited stations; do not read the input lists in your logic',
      ],
      hints: [
        'Walking both streams from their sources in lockstep and comparing nodes fails. Why? Think about what is true at the confluence for each stream separately — and what is NOT necessarily true for both at the same tick.',
        'Every shared station sits at the same distance from the END of both chains. So the misalignment between the two walks is exactly the difference of the chain lengths — a number you can compute cheaply.',
        'Measure both lengths, advance the cursor of the longer chain by the difference, then step both cursors together comparing with "is". The first identical node is the confluence; if both reach None together, return -1.',
      ],
      functionName: 'confluence_station_id',
      starterCode: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_rivers(
    a_ids: list[int], b_ids: list[int], shared_ids: list[int]
) -> 'tuple[ListNode | None, ListNode | None]':
    """Build both streams; they physically share the shared_ids tail."""
    shared = None
    for v in reversed(shared_ids):
        shared = ListNode(v, shared)
    a_head = shared
    for v in reversed(a_ids):
        a_head = ListNode(v, a_head)
    b_head = shared
    for v in reversed(b_ids):
        b_head = ListNode(v, b_head)
    return a_head, b_head

def confluence_station_id(a_ids: list[int], b_ids: list[int], shared_ids: list[int]) -> int:
    a_head, b_head = _build_rivers(a_ids, b_ids, shared_ids)
    # Walk the chains from a_head and b_head only. Do not use the lists below.
    pass
`,
      solution: {
        code: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_rivers(
    a_ids: list[int], b_ids: list[int], shared_ids: list[int]
) -> 'tuple[ListNode | None, ListNode | None]':
    # The shared tail is built ONCE; both upstream sections link into the
    # same node objects — that physical sharing is what we must detect.
    shared = None
    for v in reversed(shared_ids):
        shared = ListNode(v, shared)
    a_head = shared
    for v in reversed(a_ids):
        a_head = ListNode(v, a_head)
    b_head = shared
    for v in reversed(b_ids):
        b_head = ListNode(v, b_head)
    return a_head, b_head

def confluence_station_id(a_ids: list[int], b_ids: list[int], shared_ids: list[int]) -> int:
    a_head, b_head = _build_rivers(a_ids, b_ids, shared_ids)

    def _length(node: 'ListNode | None') -> int:
        # One cheap pass per stream: just count links to the end.
        n = 0
        while node:
            n += 1
            node = node.next
        return n

    len_a = _length(a_head)
    len_b = _length(b_head)

    # Burn off the longer stream's surplus so both cursors stand at the
    # same distance from the end — and therefore from any shared station.
    a, b = a_head, b_head
    for _ in range(len_a - len_b):      # empty range when len_a <= len_b
        a = a.next
    for _ in range(len_b - len_a):
        b = b.next

    # In lockstep now: once aligned, the cursors hit the confluence on the
    # same tick. Identity comparison — equal IDs on distinct nodes must NOT
    # match. Both reaching None together means the streams never meet.
    while a is not b:
        a = a.next
        b = b.next
    return a.val if a is not None else -1
`,
        commentary: `
The naive lockstep walk from both sources fails for one precise reason: the confluence sits at some distance \`d_a\` from A's source and \`d_b\` from B's, and nothing makes \`d_a = d_b\`. The repair comes from changing the reference point. Every shared station is at the **same distance from the end** of both chains, because past the confluence the chains *are* the same nodes. So if both cursors start at equal distance from their ends, they stay aligned forever and must arrive at the first shared node on the same tick.

Equalizing "distance from the end" costs two counting passes and one head start: the longer chain's cursor pre-walks \`|len_a - len_b|\` links. After that, the lockstep loop needs no length bookkeeping at all — the first \`a is b\` is the answer. The no-confluence case falls out with zero special-casing: aligned cursors on disjoint chains run off their ends on the same tick, \`None is None\` terminates the loop, and the final expression maps that to \`-1\`.

Two traps are planted in the tests. The all-ones case puts equal IDs on *distinct* upstream nodes, so any solution comparing \`a.val == b.val\` reports a confluence one tick early — identity (\`is\`) is non-negotiable. And the empty-upstream case makes one head itself a shared node, which the alignment handles naturally since a zero or negative range simply doesn't advance. A neat variant replaces measuring with pointer-switching (each cursor restarts on the other stream after its first end), but the length-difference form is the one that generalizes to "how far upstream of the confluence is each source?" follow-ups.
`,
        complexity: 'Time O(m + n), Space O(1)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define the chained-record node type',
            acceptableKeywords: ['node class with value and next', 'linked node definition', 'declare the list node', 'val and pointer fields'],
            hint: 'What data type holds a value plus a link to its successor?',
            misconception: 'This declares the element only — no intersection logic lives here.',
          },
          {
            lineRange: [5, 20],
            referenceLabel: 'Build two chains that physically share a tail',
            acceptableKeywords: ['shared suffix built once', 'two heads into the same nodes', 'wire both streams to a common tail', 'construct the merging inputs'],
            hint: 'How are two chains arranged so they truly share the same node objects past a join?',
            misconception: 'The sharing is by object identity, not by equal values — this scaffolding is what makes that real.',
          },
          {
            lineRange: [21, 34],
            referenceLabel: 'Measure each chain length to the end',
            acceptableKeywords: ['count nodes in each chain', 'compute both lengths', 'walk to the end counting', 'measure the two stream sizes'],
            hint: 'What quantity must you know about each chain before aligning the cursors?',
            misconception: 'This measurement enables the alignment; it is not the meeting search itself.',
          },
          {
            lineRange: [35, 42],
            referenceLabel: 'Advance the longer chain to equalize the remaining distance',
            acceptableKeywords: ['skip the length difference', 'advance the longer cursor', 'align distances from the end', 'burn off the surplus prefix'],
            hint: 'How do you make both cursors stand the same number of steps from the end?',
            misconception: 'Aligning by distance-from-end (not from start) is the key — the shared nodes sit at equal distance from the end of both chains.',
          },
          {
            lineRange: [43, 50],
            referenceLabel: 'March in lockstep to the first common node',
            acceptableKeywords: ['advance both until identical', 'meet at the shared node', 'lockstep identity comparison', 'find the convergence point'],
            hint: 'Once aligned, what loop lands both cursors on the join simultaneously?',
            misconception: 'Equal IDs on distinct nodes must not count as a meeting — only object identity, and reaching the end together means no shared tail.',
          },
        ],
      },
      testCases: [
        { input: [[4, 1], [5, 6, 1], [8, 4, 5]], expected: 8, label: 'merge with decoy repeated IDs' },
        { input: [[2, 6, 4], [1, 5], []], expected: -1, label: 'separate basins' },
        { input: [[], [3], [7, 9]], expected: 7, label: 'stream A starts at the confluence' },
        { input: [[], [], []], expected: -1, hidden: true, label: 'both streams empty' },
        { input: [[1, 1, 1], [1, 1], [1]], expected: 1, hidden: true, label: 'all-equal IDs: identity only' },
        { input: [[10, 20, 30, 40, 50], [60], [99]], expected: 99, hidden: true, label: 'very unequal lengths' },
        { input: [[], [], [5, 6]], expected: 5, hidden: true, label: 'both heads are the confluence' },
        { input: [[7], [8], []], expected: -1, hidden: true, label: 'short disjoint streams' },
      ],
      furtherPractice: [
        { name: 'LeetCode 160. Intersection of Two Linked Lists', note: 'the classic; try the pointer-switching variant too' },
      ],
    },
    {
      id: 'redirect-ring-size',
      title: 'Redirect Ring Audit',
      difficulty: 'medium',
      statement: `
A legacy CMS models its pages as nodes: each page holds a numeric page ID and a redirect pointer to one other page; a landing page redirects nowhere and ends the trail. A botched migration can bend some page's redirect back to an earlier page on its own trail, trapping every visitor in a **ring** of redirects. Before scheduling the cleanup, operations needs to know **how many pages the ring contains**, to budget the rewiring.

You are given the page IDs \`page_ids\` in trail order plus a build parameter \`pos\` — the index the final page redirects back to, or \`-1\` for a clean trail. As elsewhere in this module, \`pos\` feeds **only** the chain builder in the starter code; your audit must discover everything by following redirects.

Return the number of pages in the ring, or \`0\` if the trail terminates at a landing page. The audit container is tiny: \`O(1)\` extra space, no visited-set.
`,
      examples: [
        {
          input: 'page_ids = [100, 200, 300, 400, 500], pos = 2',
          output: '3',
          explanation:
            'The last page redirects back to index 2, so pages at indices 2, 3, 4 form the ring — three pages. The two pages before the ring do not count.',
        },
        {
          input: 'page_ids = [10, 20, 30], pos = -1',
          output: '0',
          explanation: 'The trail reaches a landing page; there is no ring.',
        },
        {
          input: 'page_ids = [55], pos = 0',
          output: '1',
          explanation: 'A single page redirecting to itself is the smallest possible ring.',
        },
      ],
      constraints: [
        '0 <= len(page_ids) <= 100_000',
        '-10^9 <= page_ids[i] <= 10^9',
        'pos == -1 or 0 <= pos < len(page_ids)',
        'O(1) extra space; no visited-set; do not read pos in your logic',
      ],
      hints: [
        'You cannot measure a ring you have not proven exists, and you cannot store visited pages. What event — observable with constant memory — would leave you provably STANDING ON a page inside the ring?',
        'Two cursors at speeds 1 and 2 must collide inside the ring if there is one. At the moment they collide, you do not know where the ring begins — but do you need to, for THIS question?',
        'After slow and fast collide, freeze one as an anchor and send the other stepping around: count steps until it returns to the anchor (identity comparison). If fast falls off the end instead, return 0.',
      ],
      functionName: 'redirect_ring_size',
      starterCode: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_loop(values: list[int], pos: int) -> 'ListNode | None':
    """Build the redirect trail; the last node links back to index pos (-1 = none)."""
    nodes = [ListNode(v) for v in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if nodes and pos != -1:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

def redirect_ring_size(page_ids: list[int], pos: int) -> int:
    head = _build_loop(page_ids, pos)
    # Follow redirects from head. Do not use pos below this line.
    pass
`,
      solution: {
        code: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_loop(values: list[int], pos: int) -> 'ListNode | None':
    # Straight trail of pages; the final redirect optionally bends back.
    nodes = [ListNode(v) for v in values]
    for i in range(len(nodes) - 1):
        nodes[i].next = nodes[i + 1]
    if nodes and pos != -1:
        nodes[-1].next = nodes[pos]
    return nodes[0] if nodes else None

def redirect_ring_size(page_ids: list[int], pos: int) -> int:
    head = _build_loop(page_ids, pos)
    slow = fast = head
    # ---- Phase 1: standard two-speed collision proves a ring exists AND
    # leaves slow parked on a page that is definitely inside it.
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            # ---- Phase 2: anchor-and-lap. From any page inside the ring,
            # one full lap returns to that page in exactly ring-size steps.
            size = 1
            probe = slow.next       # one step already taken, hence size = 1
            while probe is not slow:
                probe = probe.next
                size += 1
            return size
    # fast reached a landing page: the trail terminates, no ring.
    return 0
`,
        commentary: `
The collision in phase 1 is usually treated as a yes/no signal, but it delivers something stronger: a **guaranteed position inside the ring**. Both cursors can only meet after both have entered the ring (outside it, fast is strictly ahead and pulling away), so the meeting page — wherever it is — is a valid base camp for measurement. That is the whole insight this problem isolates: you do *not* need to know where the ring begins to know how big it is.

Phase 2 is then the simplest loop in the module: pin one cursor as an anchor, send a probe forward, and count steps until the probe comes home. Because every page in the ring has exactly one successor inside the ring, the probe's walk is a single clean lap — no page is skipped, none repeats early — so the counter reads the ring size exactly. Starting the probe at \`slow.next\` with \`size = 1\` keeps the self-redirect case honest: a one-page ring sends the probe straight back to the anchor and the loop body never runs.

Contrast this with the daisy-chain entry problem: finding *where* the orbit begins needs the full phase-2 head-reset argument, while finding *how big* it is needs only an odometer. Knowing which question is being asked — entry point, size, or mere existence — and spending only the machinery that question requires is the practical skill. Identity comparison and the \`fast and fast.next\` guard carry over unchanged, and the empty trail returns 0 by never entering the loop.
`,
        complexity: 'Time O(n), Space O(1)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define the chained-record node type',
            acceptableKeywords: ['node class with value and next', 'linked node definition', 'declare the list node', 'val and pointer fields'],
            hint: 'What data type holds a value plus a link to its successor?',
            misconception: 'This declares the element only — it measures no loop length.',
          },
          {
            lineRange: [5, 13],
            referenceLabel: 'Construct the chain, optionally bending the tail back',
            acceptableKeywords: ['build the linked structure', 'wire nodes in sequence', 'connect last node to an earlier one', 'assemble chain from values'],
            hint: 'How do raw values become a chain whose end may loop inward?',
            misconception: 'This input scaffolding shapes the test case; it is not the sizing step.',
          },
          {
            lineRange: [14, 17],
            referenceLabel: 'Anchor both cursors at the start',
            acceptableKeywords: ['place both pointers at head', 'slow and fast start together', 'initialize the two cursors', 'set up before the loop'],
            hint: 'Where do the two differently-paced cursors begin?',
            misconception: 'No measurement happens here; this only positions the cursors for phase one.',
          },
          {
            lineRange: [18, 31],
            referenceLabel: 'Collide inside the loop, then lap it to count its size',
            acceptableKeywords: ['two-speed collision proves a loop', 'anchor a node and circle once', 'count steps for one full lap', 'measure the cycle length'],
            hint: 'After the cursors meet inside the loop, how do you measure how many nodes it holds?',
            misconception: 'The meeting point need not be the loop start — but any in-loop node is a fine anchor to lap once and count size, no entry-finding required.',
          },
          {
            lineRange: [32, 33],
            referenceLabel: 'A terminating chain has size zero',
            acceptableKeywords: ['no loop return zero', 'fast reached the end', 'chain terminates', 'fall through with no ring'],
            hint: 'If the fast cursor exits the chain, what loop size can there be?',
            misconception: 'Reaching here is the no-loop verdict, not an incomplete count.',
          },
        ],
      },
      testCases: [
        { input: [[100, 200, 300, 400, 500], 2], expected: 3, label: 'three-page ring after a tail' },
        { input: [[10, 20, 30], -1], expected: 0, label: 'clean trail' },
        { input: [[55], 0], expected: 1, label: 'single page self-redirect' },
        { input: [[], -1], expected: 0, hidden: true, label: 'no pages at all' },
        { input: [[1, 2, 3, 4, 5, 6], 0], expected: 6, hidden: true, label: 'entire trail is the ring' },
        { input: [[7, 7, 7, 7], 3], expected: 1, hidden: true, label: 'tail self-redirect, equal IDs' },
        { input: [[1, 2, 3, 4, 5, 6, 7, 8, 9], 4], expected: 5, hidden: true, label: 'five-page ring, four-page tail' },
        { input: [[9, 8], 1], expected: 1, hidden: true, label: 'last page redirects to itself' },
      ],
      furtherPractice: [
        { name: 'LeetCode 142. Linked List Cycle II', note: 'locates the entry; this problem measures the lap instead' },
        { name: 'LeetCode 457. Circular Array Loop', note: 'ring-hunting over an implicit array chain' },
      ],
    },
    {
      id: 'setlist-weave',
      title: 'Ends-Inward Setlist',
      difficulty: 'hard',
      statement: `
A festival promoter stores the night's draft setlist as a chain: each node holds a song ID and a link to the next song. The headliner wants the energy to **alternate between openers and closers**: the final running order takes the first song, then the last, then the second, then the second-to-last — weaving the two ends inward until every song is placed.

Given \`song_ids\` in draft order (the starter builds the chain; treat the chain, not the Python list, as your input), return the woven running order as a list of song IDs. House rule: the rearrangement must be performed by **re-linking nodes** in \`O(1)\` auxiliary space — copying the IDs into an array and indexing from both ends is forbidden; only the final read-off of the finished chain may allocate the answer list.
`,
      examples: [
        {
          input: 'song_ids = [11, 22, 33, 44, 55]',
          output: '[11, 55, 22, 44, 33]',
          explanation:
            'First, last, second, second-to-last, and the lone middle song 33 closes the night.',
        },
        {
          input: 'song_ids = [1, 2, 3, 4]',
          output: '[1, 4, 2, 3]',
          explanation: 'Even count: the weave consumes both ends until the two streams meet.',
        },
        {
          input: 'song_ids = [40]',
          output: '[40]',
          explanation: 'A single song is already woven.',
        },
      ],
      constraints: [
        '1 <= len(song_ids) <= 100_000',
        '-10^9 <= song_ids[i] <= 10^9',
        'Rearrange by re-linking nodes in O(1) auxiliary space',
        'Do not copy song_ids (or the node values) into an array to index from both ends; only the final read-off may allocate',
      ],
      hints: [
        "Write out the target order's draft indices for n = 6: 0, 5, 1, 4, 2, 3. The output alternates between two streams of songs. What are those two streams — and what is awkward about producing the second one from a singly linked chain?",
        'Cut the chain at its midpoint; the back half must then be read back-to-front. A singly linked chain can be reversed in place with three pointers and zero allocation. That leaves two forward-walkable chains to combine.',
        'Three phases: find the middle with fast/slow (stop fast early — guard on fast.next and fast.next.next — so the FRONT half keeps the extra node when n is odd), reverse the back half in place, then splice alternately: one node from the front, one from the back. Read off the values last.',
      ],
      functionName: 'weave_setlist',
      starterCode: `class ListNode:
    def __init__(self, val: int, next: 'ListNode | None' = None):
        self.val = val
        self.next = next

def _build_chain(values: list[int]) -> 'ListNode | None':
    """Build the setlist chain in order. Treat the chain as your input."""
    head = None
    for v in reversed(values):
        head = ListNode(v, head)
    return head

def weave_setlist(song_ids: list[int]) -> list[int]:
    head = _build_chain(song_ids)
    # Re-link nodes in O(1) auxiliary space; allocate only the final answer.
    # Do not use song_ids below.
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

def weave_setlist(song_ids: list[int]) -> list[int]:
    head = _build_chain(song_ids)

    # ---- Phase 1: find the cut point. The tightened guard parks slow on
    # the FIRST middle, so the front half keeps the extra song when n is
    # odd — the lone middle song must end the night, not lead the back half.
    slow = fast = head
    while fast.next and fast.next.next:
        slow = slow.next
        fast = fast.next.next
    back = slow.next                # head of the back half (may be None)
    slow.next = None                # sever: two independent chains now

    # ---- Phase 2: reverse the back half in place. Three pointers, no
    # allocation: peel each node off the front, push it onto 'prev'.
    prev = None
    node = back
    while node:
        nxt = node.next             # save the rest before rewiring
        node.next = prev            # flip this node's link backwards
        prev = node                 # reversed chain grows by one
        node = nxt                  # advance into the unreversed remainder
    back = prev                     # 'prev' is the old tail: new back head

    # ---- Phase 3: splice alternately. The front half is never shorter
    # than the back half, so the back cursor is the one that runs out.
    first = head
    second = back
    while second:
        f_next = first.next         # save both continuations first --
        s_next = second.next        # -- the splice destroys them
        first.next = second         # opener -> closer
        second.next = f_next        # closer -> next opener
        first = f_next
        second = s_next

    # ---- Read-off: the only allocation in the whole routine.
    order: list[int] = []
    node = head
    while node:
        order.append(node.val)
        node = node.next
    return order
`,
        commentary: `
The weave looks like one exotic operation, but writing the target indices (0, n-1, 1, n-2, ...) exposes it as two interleaved streams: the front half forwards and the back half **backwards**. A singly linked chain cannot be walked backwards — that is the real obstacle — so the play is to make the backward stream forward: cut the chain in half and physically reverse the back half. After that, the problem collapses to zipping two forward chains, and every phase is a tool this module (or the linked-lists module) has already built in isolation. Recognizing that a hard problem is three rehearsed moves in a trench coat is the actual lesson.

Each phase hides one decision. The cut must leave the *front* half longer on odd counts — the lone middle song belongs at the very end of the weave, which only happens if it ends the front stream after the back stream is exhausted; hence the \`fast.next and fast.next.next\` guard rather than the classic one. The reversal must capture \`node.next\` *before* overwriting it, the eternal three-pointer dance. And the splice must save **both** continuations before rewiring, because \`first.next = second\` destroys the front chain's path forward; the loop condition \`while second\` works precisely because the front half is never the shorter one, so the back cursor exhausts first (or simultaneously).

Edge behavior falls out rather than being patched in: one song means the guard fails instantly, the back half is empty, the splice never runs. Two songs splice once and stop. Everything is \`O(n)\` with three small constant-space loops, and the only allocation is the answer the caller asked for.
`,
        complexity: 'Time O(n), Space O(1) beyond the output list',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define the chained-record node type',
            acceptableKeywords: ['node class with value and next', 'linked node definition', 'declare the list node', 'val and pointer fields'],
            hint: 'What data type holds a value plus a link to its successor?',
            misconception: 'This declares the element only — none of the weaving happens here.',
          },
          {
            lineRange: [5, 11],
            referenceLabel: 'Materialize the values into a forward chain',
            acceptableKeywords: ['build the linked structure', 'turn list into chain', 'prepend to keep head first', 'assemble chain from values'],
            hint: 'How do the input values become a chain whose first value is the head?',
            misconception: 'This is input setup; the three weaving phases follow.',
          },
          {
            lineRange: [12, 24],
            referenceLabel: 'Locate the midpoint and detach the back half',
            acceptableKeywords: ['two-speed scan to the middle', 'tightened guard keeps front longer', 'cut into two independent halves', 'split at the pre-cut node'],
            hint: 'How do you halve the chain so the front keeps the extra element on odd counts?',
            misconception: 'This is the locate-and-sever step; the back half is not yet reversed or interleaved.',
          },
          {
            lineRange: [25, 35],
            referenceLabel: 'Reverse the second half in place',
            acceptableKeywords: ['flip the back half links', 'three-pointer reversal', 'reverse without allocation', 'turn the tail backward'],
            hint: 'A singly linked chain cannot be walked backward — what transforms it so it can be read in reverse forward?',
            misconception: 'You must save the successor before rewiring each link, or the reversal loses the rest of the chain.',
          },
          {
            lineRange: [36, 47],
            referenceLabel: 'Interleave the two halves node by node',
            acceptableKeywords: ['splice front and back alternately', 'zip the two chains', 'weave one from each side', 'interleave the halves'],
            hint: 'How do you merge a forward and a reversed half into the alternating order?',
            misconception: 'Both continuations must be saved before rewiring, or the splice destroys the path forward; the shorter back half is what exhausts the loop.',
          },
          {
            lineRange: [48, 55],
            referenceLabel: 'Serialize the woven chain into the answer',
            acceptableKeywords: ['collect values into a list', 'walk the result chain', 'read off the final order', 'flatten to the output array'],
            hint: 'How does the rewired chain become the returned list?',
            misconception: 'This is just the read-out; all the weaving was done in the prior phases.',
          },
        ],
      },
      testCases: [
        { input: [[11, 22, 33, 44, 55]], expected: [11, 55, 22, 44, 33], label: 'odd count, middle song last' },
        { input: [[1, 2, 3, 4]], expected: [1, 4, 2, 3], label: 'even count' },
        { input: [[40]], expected: [40], label: 'single song' },
        { input: [[7, 8]], expected: [7, 8], hidden: true, label: 'two songs' },
        { input: [[1, 2, 3, 4, 5, 6]], expected: [1, 6, 2, 5, 3, 4], hidden: true, label: 'six songs' },
        { input: [[5, 5, 5, 5, 5]], expected: [5, 5, 5, 5, 5], hidden: true, label: 'all-equal IDs' },
        { input: [[9, 1, 8, 2, 7, 3, 6]], expected: [9, 6, 1, 3, 8, 7, 2], hidden: true, label: 'seven songs' },
        { input: [[-1, -2, -3]], expected: [-1, -3, -2], hidden: true, label: 'three songs, negative IDs' },
      ],
      furtherPractice: [
        { name: 'LeetCode 143. Reorder List', note: 'the classic formulation' },
        { name: 'LeetCode 234. Palindrome Linked List', note: 'same split-and-reverse machinery, different final check' },
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
