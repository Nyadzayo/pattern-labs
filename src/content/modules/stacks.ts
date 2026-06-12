import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'stacks',
  visualizer: 'stack',
  concept: `
## The mental model

You're halfway through telling a story when a friend cuts in with a question. While you're answering it, your phone buzzes, and you deal with that too. Then you finish answering the friend, then you pick the story back up at the exact sentence you left. Notice the order: interruptions resolve newest-first. Your brain keeps a pile of suspended threads and only ever touches the top of it. That pile is a stack — last in, first out — and it's the same structure every language runtime uses to track function calls: each call interrupts its caller and must finish before the caller resumes.

Nearly every interview stack problem is a single move applied over and over: **defer and resolve**. You walk the input left to right and keep meeting things you can't settle yet — an opening bracket whose closer hasn't shown up, a number whose operator is still ahead, a chilly day waiting for a warmer one, a typed character that a future backspace might erase. Push it and move on. Eventually something arrives that *settles* pending work — a closing bracket, an operator, a hot day, a backspace — so you pop and resolve, sometimes several entries in a row. At every moment the stack holds exactly the unresolved past, in the only order resolution can legally happen: most recent first.

## Mechanics

In Python the stack is just a list used at one end: \`append\` to push, \`pop\` to pop, \`stack[-1]\` to peek — all \`O(1)\`. The generic loop:

\`\`\`python
stack = []
for item in items:
    # resolve: item settles pending entries, newest first
    while stack and resolves(item, stack[-1]):
        settle(stack.pop(), item)
    # defer: item itself may now wait for something later
    if must_wait(item):
        stack.append(item)
# anything still on the stack was never resolved
\`\`\`

Bracket matching is the one-pop special case: each closer settles exactly one opener (the top), and a mismatch or an empty stack means the input is invalid. Expression evaluation flips what's stored: operands wait on the stack, and each operator pops two of them, computes, and pushes the result back as a new waiting value.

The many-pop case is the **monotonic stack**, the workhorse for next-greater/next-smaller questions. Keep *indices* on the stack so that their values run non-increasing from bottom to top. When a new value arrives, it is the long-awaited answer for every stacked index holding a strictly smaller value — pop them all, record \`i - popped\` (a distance) or the value itself, then push the new index, which now waits in turn. You never sort anything; the ordering falls out automatically, because anything smaller than the newcomer just got popped.

## When to reach for it

- The problem talks about **nesting or matching**: brackets, tags, quotes, file paths with \`..\`, valid/invalid sequences.
- Each element's answer depends on the **nearest later (or earlier) element with some property** — next warmer day, next greater price, nearest smaller value to the left. That's a monotonic stack.
- You're **evaluating or parsing expressions**: postfix/RPN, calculators, anything with precedence.
- The phrase "**most recent**" appears: undo the most recent action, cancel the latest order, match the most recent unmatched opener.
- A simulation processes events where some events **reverse or consume** earlier ones: backspaces, undo keys, colliding/merging objects.
- You're converting recursion to iteration or tracking state to restore on the way back out (DFS, backtracking) — the stack *is* the recursion, made explicit.

If you need the *oldest* unresolved item instead of the newest, that's a queue. If every element needs the global minimum or maximum rather than the nearest qualifying neighbor, you want a heap or a running aggregate.

## Complexity

Push, pop, and peek are \`O(1)\`. A full defer-and-resolve scan touches each element a constant number of times — pushed at most once, popped at most once — so the whole pass is \`O(n)\` time even when a \`while\` loop nests inside the \`for\`: the inner loop's total iterations across the entire run are bounded by the number of pushes, not multiplied by them. That amortized argument is the answer to "isn't this \`O(n^2)\`?", and interviewers love hearing it stated out loud. Space is \`O(n)\` worst case — think of a string of all openers, or a strictly cooling temperature log where nothing ever pops. The payoff is real: next-greater by brute force re-scans the future for every element at \`O(n^2)\`; the monotonic stack does it in one \`O(n)\` sweep.

## Common pitfalls

- **Popping or peeking an empty stack.** Every \`pop()\` and \`stack[-1]\` needs a \`stack and ...\` guard unless you've proven it can't be empty.
- **Forgetting the end-of-input check.** "Balanced" means the stack is *empty after the scan* — \`"((("\` sails through the loop and must fail afterwards.
- **Wrong operand order.** Pops come out newest-first: the first pop is the *right* operand. Compute \`left - right\`, not the reverse; subtraction and division will punish you.
- **Strict vs non-strict comparisons.** With duplicate values, \`<\` and \`<=\` in the pop condition give different answers. Decide whether equal values resolve each other *before* writing the loop.
- **Storing values when you need indices.** If the answer involves distance or position, stack the index; the value is always one lookup away.
- **Using the wrong end of the list.** \`insert(0, x)\` and \`pop(0)\` are \`O(n)\` each; a Python list is only a stack at its tail.
`,
  realWorldUses: [
    {
      title: 'The call stack in every language runtime',
      description:
        'Each function call pushes a frame (locals, return address); returning pops it. A stack trace is literally a printout of this stack at the moment of a crash, and "stack overflow" is what happens when deep recursion exhausts it — the LIFO discipline is baked into how programs execute.',
    },
    {
      title: 'Undo history in editors and design tools',
      description:
        'IDEs, Photoshop, and Figma implement undo with the command pattern: every action pushes its inverse onto a stack, and Ctrl+Z pops and applies the top one. Redo is a second stack that fills as you undo — two stacks, O(1) per keystroke, unbounded history.',
    },
    {
      title: "Parsers and the browser's HTML tree builder",
      description:
        'The HTML parsing spec mandates a "stack of open elements": each open tag pushes, each close tag pops and attaches the finished node to its parent. Compilers do the same in shift-reduce parsing — tokens are shifted onto a stack and reduced when a grammar rule completes.',
    },
  ],
  problems: [
    {
      id: 'manifest-linter',
      title: 'Pipeline Manifest Linter',
      difficulty: 'easy',
      statement: `
A build tool's pipeline manifests mix free-form payload text with three kinds of delimiters: parentheses \`( )\` group steps, square brackets \`[ ]\` mark optional blocks, and curly braces \`{ }\` wrap variable substitutions. The CI linter must reject a manifest unless its delimiters are well-formed.

Given the manifest string \`manifest\`, return \`True\` if every delimiter is eventually closed by a partner of the **same kind**, and blocks are **properly nested** — a closer must always close the most recently opened, not-yet-closed block. All non-delimiter characters are payload and must be ignored. A manifest with no delimiters at all is valid.
`,
      examples: [
        {
          input: 'manifest = "(deploy [stage {env}])"',
          output: 'True',
          explanation:
            'Each closer matches the most recently opened block: } closes {, ] closes [, ) closes (. Payload text is ignored.',
        },
        {
          input: 'manifest = "([)]"',
          output: 'False',
          explanation:
            "When ')' arrives, the innermost open block is '[' — wrong kind. Per-type counts balance, but the nesting is crossed.",
        },
        {
          input: 'manifest = "{steps"',
          output: 'False',
          explanation: "The '{' is never closed, so the manifest ends with an unresolved block.",
        },
      ],
      constraints: [
        '0 <= len(manifest) <= 100_000',
        'manifest contains printable ASCII characters',
        'The only delimiter characters are ( ) [ ] { }',
      ],
      hints: [
        "Try \"([)]\" by hand. Counting opens and closes per delimiter type says it's fine — yet it isn't. What information does counting throw away?",
        'Keep track of the blocks that are currently open, as you scan. A closer is only legal if it matches the most recently opened, not-yet-closed delimiter — and once matched, that opener is fully settled.',
        'Push openers onto a stack; skip every non-delimiter character. On a closer, fail if the stack is empty or its top is not the partner opener; otherwise pop. After the scan, return True only if the stack is empty.',
      ],
      functionName: 'is_manifest_balanced',
      starterCode: `def is_manifest_balanced(manifest: str) -> bool:
    pass
`,
      solution: {
        code: `def is_manifest_balanced(manifest: str) -> bool:
    # Map each closer to the opener it is allowed to settle.
    partner = {')': '(', ']': '[', '}': '{'}
    openers = set(partner.values())
    stack = []  # openers still waiting for their closer, newest on top
    for ch in manifest:
        if ch in openers:
            stack.append(ch)            # defer: this block just opened
        elif ch in partner:
            # A closer must settle the MOST RECENT open block.
            if not stack or stack.pop() != partner[ch]:
                return False            # nothing open, or wrong kind
        # any other character is payload — ignore it
    # Leftover openers mean blocks that never closed.
    return not stack
`,
        commentary: `
The pitfall this problem is built around: per-type counters are not enough. \`"([)]"\` has one of everything, perfectly balanced by count, but the \`)\` arrives while \`[\` is the innermost open block. Validity is about **order**, not quantity — a closer must settle the *most recently opened* block, and "most recent unresolved thing" is the stack's exact job description.

So the scan is pure defer-and-resolve. An opener can't be judged when we meet it (its closer is somewhere in the future), so it waits on the stack. A closer is judgment day for exactly one opener: the top of the stack. Two failure modes live here — the stack is empty (a closer with nothing to close) or the top is the wrong kind (crossed nesting). Both reject immediately.

The third failure mode hides *after* the loop: \`"((("\` never triggers either check, so the final \`return not stack\` is load-bearing. Forgetting it is probably the single most common bracket-validation bug. Payload characters simply never touch the stack, which is why the same skeleton extends to linting real config formats where delimiters are sparse.
`,
        complexity: 'Time O(n), Space O(n) worst case (all openers)',
      },
      testCases: [
        { input: ['(deploy [stage {env}])'], expected: true, label: 'nested with payload' },
        { input: ['([)]'], expected: false, label: 'crossed nesting' },
        { input: [''], expected: true, label: 'empty manifest' },
        { input: [')'], expected: false, label: 'closer with nothing open' },
        { input: ['(((('], expected: false, hidden: true, label: 'unclosed openers' },
        { input: ['run {a} then [b] and (c)'], expected: true, hidden: true, label: 'payload between blocks' },
        { input: ['{[()]}'], expected: true, hidden: true, label: 'deep pure nesting' },
        { input: ['no delimiters here'], expected: true, label: 'payload only' },
        { input: ['([]{)}'], expected: false, hidden: true, label: 'wrong kind on top' },
      ],
      furtherPractice: [
        { name: 'LeetCode 20. Valid Parentheses', note: 'the classic three-pair version' },
        { name: 'LeetCode 1249. Minimum Remove to Make Valid Parentheses', note: 'now repair instead of judge' },
        { name: 'LeetCode 71. Simplify Path', note: 'same defer-and-resolve idea on path segments' },
      ],
    },
    {
      id: 'rollout-rules',
      title: 'Rollout Rule Evaluator',
      difficulty: 'medium',
      statement: `
A feature-flag service lets operators write small arithmetic rollout rules. To keep the edge servers dumb and fast, the control plane compiles each rule into **postfix** form before shipping it: a list of tokens where every operator appears *after* its two operands. \`["3", "4", "+"]\` means 3 + 4; \`["3", "4", "+", "2", "*"]\` means (3 + 4) * 2.

Given \`tokens\`, evaluate the expression and return the resulting integer. Each token is either an integer (possibly negative, like \`"-11"\`) or one of \`"+"\`, \`"-"\`, \`"*"\`, \`"/"\`. An operator applies to the **two most recently produced values** — operands or earlier results. Division is integer division that **truncates toward zero**: \`7 / -2\` evaluates to \`-3\`, not \`-4\`. The token list is always a well-formed expression and no division by zero occurs.
`,
      examples: [
        {
          input: 'tokens = ["2", "3", "4", "*", "+"]',
          output: '14',
          explanation: '"*" consumes 3 and 4 producing 12; "+" then consumes 2 and 12 producing 14.',
        },
        {
          input: 'tokens = ["7", "-2", "/"]',
          output: '-3',
          explanation: '7 / -2 is -3.5; truncating toward zero gives -3. (Flooring would give -4 — wrong here.)',
        },
        {
          input: 'tokens = ["5", "1", "2", "+", "4", "*", "-"]',
          output: '-7',
          explanation: '1 + 2 = 3, then 3 * 4 = 12, then 5 - 12 = -7. Note the operand order on "-".',
        },
      ],
      constraints: [
        '1 <= len(tokens) <= 10_000',
        'Each token is "+", "-", "*", "/" or an integer in [-10^6, 10^6]',
        'The token list is a valid postfix expression',
        'No division by zero; division truncates toward zero',
      ],
      hints: [
        'Walk ["2", "3", "4", "*", "+"] by hand. When you reach "*", which two numbers does it need, and how recently did each of them appear?',
        'Keep a pile of values that have been produced but not yet consumed. An integer token joins the pile; an operator consumes the two most recent values and replaces them with a single result, which then waits like any other value.',
        "Pop twice: the FIRST pop is the RIGHT operand, the second is the LEFT. For division, Python's // floors toward negative infinity, so divide the absolute values and negate when exactly one operand is negative. The single value left at the end is the answer.",
      ],
      functionName: 'eval_postfix',
      starterCode: `def eval_postfix(tokens: list[str]) -> int:
    pass
`,
      solution: {
        code: `def eval_postfix(tokens: list[str]) -> int:
    stack = []  # values produced but not yet consumed by an operator
    for tok in tokens:
        if tok in ('+', '-', '*', '/'):
            # Newest value is on top, and it arrived LAST,
            # so it is the RIGHT operand.
            right = stack.pop()
            left = stack.pop()
            if tok == '+':
                stack.append(left + right)
            elif tok == '-':
                stack.append(left - right)
            elif tok == '*':
                stack.append(left * right)
            else:
                # Truncate toward zero. Python's // floors instead
                # (-7 // 2 == -4), so divide magnitudes and re-apply sign.
                q = abs(left) // abs(right)
                stack.append(-q if (left < 0) != (right < 0) else q)
        else:
            stack.append(int(tok))  # operand: wait for an operator
    # A well-formed expression leaves exactly one value behind.
    return stack[0]
`,
        commentary: `
Postfix is the format the stack was born for: operands appear before their operator, so by the time an operator shows up, both of its inputs have already been pushed — they're sitting right on top. That's why edge servers (and the JVM, and CPython's old bytecode interpreter) love it: evaluation needs no precedence rules, no parentheses, no lookahead. One pass, one stack.

Two details carry all the difficulty. First, **operand order**: \`pop()\` returns the *newest* value, which arrived last, which makes it the **right** operand. For \`+\` and \`*\` you'd never notice a swap; for \`-\` and \`/\` it flips the sign or the quotient, and that's exactly what hidden tests probe. Second, **truncation toward zero**: Python's \`//\` floors, pulling negative quotients *away* from zero (\`-7 // 2 == -4\`). Dividing absolute values and re-applying the sign sidesteps both that and the float-precision risk of \`int(left / right)\` on large operands.

Note the elegant recursion of the invariant: an operator's result is pushed back and becomes an ordinary waiting value, indistinguishable from a literal. That's why arbitrarily deep expressions need no special handling — the stack depth simply mirrors the expression tree's depth.
`,
        complexity: 'Time O(n), Space O(n)',
      },
      testCases: [
        { input: [['2', '3', '4', '*', '+']], expected: 14, label: 'precedence via structure' },
        { input: [['7', '-2', '/']], expected: -3, label: 'truncation toward zero' },
        { input: [['5', '1', '2', '+', '4', '*', '-']], expected: -7, label: 'operand order on minus' },
        { input: [['42']], expected: 42, label: 'single literal' },
        { input: [['-3']], expected: -3, hidden: true, label: 'single negative literal' },
        { input: [['-7', '2', '/']], expected: -3, hidden: true, label: 'negative left operand' },
        { input: [['-9', '-3', '/']], expected: 3, hidden: true, label: 'both negative' },
        { input: [['6', '-132', '11', '/', '+']], expected: -6, hidden: true, label: 'exact negative division' },
        { input: [['2', '10', '*', '3', '-', '4', '2', '/', '+']], expected: 19, label: 'longer chain' },
        { input: [['0', '5', '*', '1', '-']], expected: -1, hidden: true, label: 'zero in the mix' },
      ],
      furtherPractice: [
        { name: 'LeetCode 150. Evaluate Reverse Polish Notation', note: 'the canonical version' },
        { name: 'LeetCode 224. Basic Calculator', note: 'now you must handle infix and parentheses yourself' },
        { name: 'LeetCode 227. Basic Calculator II', note: 'infix with precedence but no parentheses' },
      ],
    },
    {
      id: 'proofing-room',
      title: 'Proofing-Room Forecast',
      difficulty: 'medium',
      statement: `
A sourdough bakery logs the proofing room's peak temperature once per day. Dough behaves differently in warmth, so for planning the head baker wants, for **each day in the log**, the number of days they would have waited until a **strictly warmer** day arrived.

Given the list \`temps\` where \`temps[i]\` is day \`i\`'s peak temperature, return a list \`answer\` of the same length where \`answer[i]\` is the smallest \`d > 0\` such that \`temps[i + d] > temps[i]\`, or \`0\` if no later day is strictly warmer. The log spans years, so re-scanning the future for every day is too slow — aim for a single pass.
`,
      examples: [
        {
          input: 'temps = [21, 19, 22, 22, 25]',
          output: '[2, 1, 2, 1, 0]',
          explanation:
            'Day 0 (21°) waits 2 days for 22°. Day 1 (19°) waits 1. Day 2 (22°) is not beaten by the equal 22° — it waits 2 days for 25°. Day 4 never sees warmer.',
        },
        {
          input: 'temps = [30, 29, 28, 27]',
          output: '[0, 0, 0, 0]',
          explanation: 'A cooling streak: no day ever gets a strictly warmer successor.',
        },
        {
          input: 'temps = [20, 20, 20]',
          output: '[0, 0, 0]',
          explanation: 'Equal is not warmer — "strictly warmer" means strictly greater.',
        },
      ],
      constraints: [
        '0 <= len(temps) <= 100_000',
        '-50 <= temps[i] <= 60 (degrees Celsius)',
        'answer[i] = 0 when no strictly warmer day follows day i',
      ],
      hints: [
        'Brute force re-scans the future for every day. Notice the reverse view: when one warm day finally arrives, it answers many earlier days all at once. Which earlier days, exactly?',
        "Keep the days that are still waiting for their answer. Today's reading resolves precisely the waiting days that are strictly cooler than today — and those days conveniently sit together at one end of your collection, newest first.",
        "Maintain a stack of indices whose temperatures run non-increasing bottom to top. For each day i: while the top index's temperature is strictly below temps[i], pop it and set its answer to i minus that index; then push i. Whatever remains on the stack keeps answer 0.",
      ],
      functionName: 'days_until_warmer',
      starterCode: `def days_until_warmer(temps: list[int]) -> list[int]:
    pass
`,
      solution: {
        code: `def days_until_warmer(temps: list[int]) -> list[int]:
    n = len(temps)
    answer = [0] * n   # default: no warmer day ever arrives
    stack = []         # indices of days still waiting; temps non-increasing
    for today in range(n):
        # Today's reading is the answer for every waiting day it beats.
        # Those are exactly the stacked indices with strictly lower temps,
        # and they sit on top (the stack is non-increasing by value).
        while stack and temps[stack[-1]] < temps[today]:
            waiting = stack.pop()
            answer[waiting] = today - waiting   # days waited
        # Today now waits for its own strictly-warmer day.
        stack.append(today)
    # Indices left on the stack never met a warmer day: answer stays 0.
    return answer
`,
        commentary: `
The brute force asks, for each day, "when does my warmer day come?" and scans forward — \`O(n^2)\` on a cooling streak. The monotonic stack flips the question: when a new day arrives, it asks "**whose answer am I?**" and settles everyone it beats in one go.

The stack holds the indices of unresolved days. The crucial structural fact: their temperatures are always non-increasing from bottom to top — not because we sort, but because any stacked day strictly cooler than a newcomer gets popped *by* that newcomer before it's pushed. So when today's temperature arrives, the days it resolves are exactly a streak at the top of the stack: pop while strictly cooler, record \`today - waiting\` as the wait in days, stop at the first stacked day that is at least as warm (it shields everything beneath it, which is warmer still).

Two details worth saying in an interview. **Strictness**: the pop condition is \`<\`, so an equal temperature does not resolve a waiting day — equal days pile up on the stack together, all waiting for the same genuinely warmer day. **Why this is \`O(n)\`** despite the nested loops: each index is pushed exactly once and popped at most once, so the inner \`while\` runs at most \`n\` times *total across the whole scan*. Storing indices rather than temperatures is what lets us compute the distance; the temperature is one lookup away.
`,
        complexity: 'Time O(n) amortized, Space O(n)',
      },
      testCases: [
        { input: [[21, 19, 22, 22, 25]], expected: [2, 1, 2, 1, 0], label: 'mixed with duplicates' },
        { input: [[30, 29, 28, 27]], expected: [0, 0, 0, 0], label: 'strictly cooling' },
        { input: [[15, 16, 17, 18]], expected: [1, 1, 1, 0], hidden: true, label: 'strictly warming' },
        { input: [[20, 20, 20]], expected: [0, 0, 0], label: 'all equal — strictness check' },
        { input: [[14]], expected: [0], label: 'single day' },
        { input: [[]], expected: [], hidden: true, label: 'empty log' },
        { input: [[18, 25, 18, 17, 16, 25, 26]], expected: [1, 5, 3, 2, 1, 1, 0], hidden: true, label: 'long waits across a dip' },
        { input: [[-3, -7, -2, -2, 0]], expected: [2, 1, 2, 1, 0], hidden: true, label: 'sub-zero readings' },
      ],
      furtherPractice: [
        { name: 'LeetCode 739. Daily Temperatures', note: 'the canonical next-warmer problem' },
        { name: 'LeetCode 496. Next Greater Element I', note: 'same stack, value instead of distance' },
        { name: 'LeetCode 901. Online Stock Span', note: 'mirror image: nearest greater to the LEFT, streaming' },
        { name: 'LeetCode 84. Largest Rectangle in Histogram', note: 'the boss fight of monotonic stacks' },
      ],
    },
    {
      id: 'draft-sync',
      title: 'Two-Device Draft Sync',
      difficulty: 'hard',
      statement: `
A pitch-deck app lets a founder edit the same text box from a laptop and a phone. Instead of syncing text, each device records its raw **keystroke log**, and the sync layer replays both logs from an empty draft to decide whether the two sessions ended in the same state.

Each character of a log is one keystroke:

- a lowercase letter **types** that character at the end of the draft;
- \`#\` is **backspace**: it deletes the last character of the draft, or does nothing if the draft is empty;
- \`*\` is **undo**: it reverts the most recent keystroke *that actually changed the draft*, restoring the draft to exactly what it was before that keystroke. The reverted keystroke is removed from history, so pressing \`*\` repeatedly walks further and further back. \`*\` does nothing if no changes remain to revert.

Keystrokes that change nothing — a backspace on an empty draft, or an undo with no history — are **not** recorded in history, and \`*\` itself is never undoable (there is no redo).

Given \`log_a\` and \`log_b\`, return \`True\` if replaying both logs produces identical final drafts.
`,
      examples: [
        {
          input: 'log_a = "draft#t", log_b = "draf#ft"',
          output: 'True',
          explanation: 'Both sessions end with "draft": one mistyped the last letter and fixed it, the other fumbled earlier.',
        },
        {
          input: 'log_a = "ab#*", log_b = "ab"',
          output: 'True',
          explanation: 'In log_a, "#" deletes the b, then "*" undoes that deletion and restores it — final draft "ab".',
        },
        {
          input: 'log_a = "abc", log_b = "ab#c"',
          output: 'False',
          explanation: 'log_a ends with "abc" but log_b ends with "ac" — the backspace removed the b for good.',
        },
      ],
      constraints: [
        '0 <= len(log_a), len(log_b) <= 100_000',
        "Logs contain only lowercase letters 'a'-'z', '#', and '*'",
        'Backspace on an empty draft and undo with empty history are silent no-ops',
        "'*' reverts whole keystrokes, never partial ones, and cannot be redone",
      ],
      hints: [
        "Two very different logs can land on the same draft, so comparing the logs themselves is hopeless. Replay each session instead — and think hard about what '*' must know to reverse a backspace.",
        "The draft itself is a stack of characters: letters push, '#' pops. Undo needs a second record alongside it — a history of what each effective keystroke actually did, including WHICH character a backspace deleted.",
        "Record ('typed', ch) when a letter is typed and ('deleted', ch) when a backspace actually removes ch; record nothing for no-ops. On '*', pop the history: undo a type by popping the draft, undo a delete by pushing the saved character back. Join both final drafts and compare.",
      ],
      functionName: 'same_final_draft',
      starterCode: `def same_final_draft(log_a: str, log_b: str) -> bool:
    pass
`,
      solution: {
        code: `def same_final_draft(log_a: str, log_b: str) -> bool:
    def replay(log: str) -> str:
        text = []     # the draft so far — a stack of characters
        history = []  # effective keystrokes: ('typed', ch) / ('deleted', ch)
        for key in log:
            if key == '#':
                # Backspace only counts if it actually deletes something.
                if text:
                    history.append(('deleted', text.pop()))
            elif key == '*':
                # Undo the most recent EFFECTIVE keystroke, if any.
                if history:
                    action, ch = history.pop()
                    if action == 'typed':
                        text.pop()        # un-type: that char is on top
                    else:
                        text.append(ch)   # un-delete: restore the char
            else:
                text.append(key)          # type a letter
                history.append(('typed', key))
        return ''.join(text)

    # Replays are independent; only the final states are compared.
    return replay(log_a) == replay(log_b)
`,
        commentary: `
This is two stacks working in tandem per session. The **draft** stack is the easy half: letters push, backspaces pop. The interesting half is **history** — a stack of *inverse operations*, which is exactly how production editors implement undo (the command pattern). Each effective keystroke records just enough to reverse itself: undoing a type means popping a character, but undoing a backspace means re-inserting a character that is otherwise gone — which is why history must store \`('deleted', ch)\` with the actual character, not merely the fact that a deletion happened.

Why is applying the inverse always safe? Because history is LIFO: when \`*\` fires, the draft is in exactly the state that the top history entry produced. If that entry is \`('typed', ch)\`, then \`ch\` is guaranteed to be sitting on top of the draft — nothing typed after it can still exist, or *that* would be the top history entry instead. The stack discipline is the correctness proof.

The traps are the no-ops. A \`#\` on an empty draft must record nothing — otherwise a later \`*\` would "restore" a character that never existed. Likewise \`*\` with empty history must do nothing rather than crash. And since undone entries are popped off history, a run of \`*\` keys naturally walks backward through time until history runs dry, with no extra bookkeeping. Each keystroke does \`O(1)\` work, so a session replays in linear time.
`,
        complexity: 'Time O(n + m), Space O(n + m)',
      },
      testCases: [
        { input: ['draft#t', 'draf#ft'], expected: true, label: 'different fixes, same draft' },
        { input: ['ab#*', 'ab'], expected: true, label: 'undo restores a deletion' },
        { input: ['abc', 'ab#c'], expected: false, label: 'plain backspace divergence' },
        { input: ['a##', '#a#'], expected: true, label: 'no-op backspaces, both empty' },
        { input: ['*', ''], expected: true, hidden: true, label: 'undo with no history' },
        { input: ['ab**#', 'x#'], expected: true, hidden: true, label: 'undo chain to empty, then no-op backspace' },
        { input: ['code#*#*', 'code'], expected: true, hidden: true, label: 'alternating delete/undo' },
        { input: ['zzzz###z', 'z*z'], expected: false, hidden: true, label: 'all-same letters, different lengths' },
        { input: ['ab#*c', 'axc'], expected: false, label: 'undo then type, middle differs' },
        { input: ['ab*', 'a'], expected: true, hidden: true, label: 'undo a typed letter' },
      ],
      furtherPractice: [
        { name: 'LeetCode 844. Backspace String Compare', note: 'the no-undo version; try the O(1)-space reverse scan' },
        { name: 'LeetCode 1472. Design Browser History', note: 'undo/redo as two stacks, dressed as navigation' },
        { name: 'LeetCode 946. Validate Stack Sequences', note: 'reason about what a stack could have done' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt:
        'In the one-pass next-greater scan, what invariant does the stack maintain just before each new element is processed?',
      choices: [
        'It holds the indices of all elements seen so far, in arrival order',
        'It holds the indices of elements still waiting for their next greater value, with values non-increasing from bottom to top',
        'It holds the running maximum of the array seen so far',
        'It holds elements in ascending sorted order so binary search can locate the next greater value',
      ],
      correctIndex: 1,
      explanation:
        'Resolved elements are popped the moment their answer arrives, so only unresolved (waiting) indices remain — and each newcomer pops everything strictly smaller before being pushed, which forces the non-increasing order without any sorting. Holding ALL elements (choice 1) describes the brute force’s memory, not the stack; a running maximum (choice 3) cannot answer per-element questions; and the stack is never searched, only popped from the top (choice 4).',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt:
        "A postfix evaluator reaches the operator '-' and pops twice: the first pop returns x, the second returns y. What must it push?",
      choices: ['x - y', 'y - x', 'Either order works — the stack makes subtraction symmetric', 'abs(x - y)'],
      correctIndex: 1,
      explanation:
        'The first pop returns the newest value, which arrived last, which makes it the RIGHT operand. So x is the right operand, y is the left, and the result is y - x. Choice 1 is the classic operand-order bug; choice 3 is only harmless for commutative operators like + and *; choice 4 invents semantics the expression never had.',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt:
        'A monotonic-stack scan has a while loop (popping) nested inside its for loop. What is the worst-case total time for n elements?',
      choices: [
        'O(n^2), because a loop nested inside a loop multiplies',
        'O(n log n), because the stack stays partially sorted',
        'O(n) — each index is pushed once and popped at most once, so all while-loop iterations across the entire scan total at most n',
        'O(n), but only when the input is already sorted',
      ],
      correctIndex: 2,
      explanation:
        'The inner loop’s cost is bounded by the number of pops, and every pop consumes a push that happens exactly once per element — so the while loop runs at most n times across the WHOLE scan, not per iteration. That amortized argument defeats the "nested loops mean O(n^2)" instinct of choice 1. No comparison sorting happens (choice 2), and the bound holds for every input, sorted or not (choice 4).',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt:
        'Validating bracket nesting in a string of length n with a stack: what are the time and worst-case extra-space costs?',
      choices: [
        'O(n) time, O(1) space',
        'O(n) time, O(n) space',
        'O(n^2) time, O(n) space',
        'O(n log n) time, O(log n) space',
      ],
      correctIndex: 1,
      explanation:
        'One pass with O(1) work per character gives O(n) time, but the stack can grow to n entries when the input is all openers — like "((((...". O(1) space (choice 1) only works for a SINGLE bracket type, where a counter suffices; nothing in the algorithm is quadratic or logarithmic.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'For each element of an unsorted array, you must find the nearest element to its LEFT that is strictly smaller. Which approach fits best?',
      choices: [
        'Sort the array, then binary search each element for its predecessor',
        'One left-to-right pass with a stack: pop every element >= the current one; whatever remains on top is the answer, then push the current element',
        'Converging two pointers from both ends of the array',
        'For each element, scan leftward until a smaller one appears',
      ],
      correctIndex: 1,
      explanation:
        'This is "nearest smaller to the left" — a monotonic increasing stack solves it in one O(n) pass. Sorting (choice 1) is the tempting trap: it destroys the positions that "nearest to the LEFT" depends on, so the answer it finds is about values, not neighbors. Converging pointers (choice 3) answer pair-property questions on sorted data, not per-element neighbor queries. The leftward rescan (choice 4) is correct but O(n^2) on a decreasing array.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        "A live price feed requires, on each new price, the count of consecutive trailing days (including today) with prices <= today's. Which design handles an unbounded feed efficiently?",
      choices: [
        'Store all prices and walk backwards from today on each update',
        "A fixed-size sliding window over the last k days' prices",
        'A stack of (price, span) pairs: pop while the top price is <= today, accumulating spans, then push (today, total)',
        'A balanced BST over all prices seen so far',
      ],
      correctIndex: 2,
      explanation:
        'This is a span query — nearest STRICTLY GREATER element to the left — and the (price, span) stack answers each update in amortized O(1) because every entry is pushed and popped at most once. The backward walk (choice 1) degrades to O(n) per update on rising streaks. The sliding window (choice 2) is the tempting wrong pattern: spans have no fixed width, so no single k works. A BST (choice 4) orders by value and cannot answer questions about consecutive recency.',
    },
    {
      id: 'q7',
      kind: 'conceptual',
      prompt:
        'Why can’t simple counters (increment on open, decrement on close, never negative, zero at the end) replace a stack once a grammar has multiple delimiter types?',
      choices: [
        'Counters can overflow on long inputs while stacks cannot',
        'Counters cannot detect a closer that arrives before any opener',
        'Counters track how many blocks are open but not WHICH KIND was opened most recently, so crossed interleavings like "([)]" pass every count check yet are invalid',
        'They can — one counter per delimiter type is exactly equivalent to a stack',
      ],
      correctIndex: 2,
      explanation:
        'Validity is an ordering property: a closer must match the most recently opened block, and counts carry no ordering. "([)]" keeps every per-type counter non-negative and ending at zero, yet it is invalid — which is also why choice 4, the tempting one, fails. Choice 2 is something counters CAN catch (the count goes negative), and overflow (choice 1) is irrelevant to the logic.',
    },
    {
      id: 'q8',
      kind: 'scenario',
      prompt:
        'You are building undo for an editor: each press of the undo key must revert the most recent remaining operation in O(1). Which design is right?',
      choices: [
        'Append each operation to a queue and dequeue one to undo',
        'Push an inverse record of each operation onto a stack; undo pops the top record and applies it',
        'Save a full document snapshot after every keystroke and load the previous snapshot to undo',
        'Re-run the entire keystroke log minus its last operation on every undo',
      ],
      correctIndex: 1,
      explanation:
        'Undo is inherently LIFO — the most recent operation must revert first — and a stack of inverse records gives O(1) push per edit and O(1) pop per undo, with repeated undos walking naturally back through time. The queue (choice 1) is the tempting near-miss: it undoes the OLDEST operation first, which is backwards. Snapshots (choice 3) cost O(document) space per keystroke, and replaying the log (choice 4) costs O(history) time per undo.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Problem says "properly nested" or "matching pairs" — which pattern, and what is the often-forgotten final check?',
      back: 'A stack of unresolved openers: push openers, pop-and-match on closers. After the scan the stack must be EMPTY — leftover openers like "(((" mean invalid, even though the loop never failed.',
    },
    {
      id: 'f2',
      front: 'What is a monotonic stack, and which question does it answer in one pass?',
      back: 'A stack whose stored values stay sorted (e.g. non-increasing) because each newcomer pops everything that breaks the order. It answers "nearest greater/smaller element to the left or right" for every element in a single sweep.',
    },
    {
      id: 'f3',
      front: 'Why is a monotonic-stack scan O(n) despite the while loop nested inside the for loop?',
      back: 'Each element is pushed exactly once and popped at most once, so all inner-loop iterations across the entire scan total at most n. Amortized analysis, not per-iteration counting.',
    },
    {
      id: 'f4',
      front: 'Postfix evaluation: an operator token arrives. What is the exact template move?',
      back: 'right = stack.pop(); left = stack.pop(); push(left OP right). The first pop is the RIGHT operand because it arrived last — getting this backwards breaks subtraction and division.',
    },
    {
      id: 'f5',
      front: 'Pitfall: integer division that must truncate toward zero, in Python.',
      back: 'Python’s // floors toward negative infinity (-7 // 2 == -4, but truncation wants -3). Divide absolute values and re-apply the sign, or use int(a / b) only when operands are small enough for float precision.',
    },
    {
      id: 'f6',
      front: 'Monotonic stack: when should you store indices instead of values?',
      back: 'Whenever the answer involves position or distance (days until, width of a span). The value is always recoverable as arr[index]; the index is not recoverable from the value.',
    },
    {
      id: 'f7',
      front: 'Strict (<) vs non-strict (<=) pop condition in a monotonic stack — when does the choice matter?',
      back: 'Whenever duplicates exist. For "strictly greater" answers, pop only strictly smaller values so equal elements keep waiting together for a genuinely bigger one. Decide before writing the loop.',
    },
    {
      id: 'f8',
      front: 'Canonical O(1)-per-operation undo design?',
      back: 'A stack of inverse records: every effective operation pushes how to reverse itself (including any data it destroyed); undo pops and applies the top record. No-ops must record nothing.',
    },
    {
      id: 'f9',
      front: 'Using a Python list as a stack — which operations, and which to avoid?',
      back: 'append(x), pop(), and stack[-1] at the tail are O(1) amortized. Avoid insert(0, x) and pop(0): both are O(n) — if you need the front, you want a deque (queue), not a stack.',
    },
    {
      id: 'f10',
      front: 'Three stack bugs to check before submitting any solution?',
      back: '1) Popping or peeking a possibly-empty stack without a guard. 2) Missing the end-of-scan check (unresolved leftovers). 3) Swapped operand order on pop for non-commutative operations.',
    },
  ],
  cheatSheet: {
    tldr:
      'A stack is a last-in-first-out pile, and stack problems are all one move: defer and resolve. Push whatever cannot be settled yet (an opener, an operand, a day awaiting warmth); when a later item settles pending work (a closer, an operator, a hotter day), pop and resolve — sometimes many entries at once. The stack always holds exactly the unresolved past, newest on top, which is the only order resolution can happen in. The monotonic-stack variant keeps stored values sorted by construction and answers every "nearest greater/smaller" query in one pass; the inverse-record variant gives O(1) undo.',
    signals: [
      'Reach for this when the problem involves nesting or matching: brackets, tags, quotes, path segments, valid sequences.',
      'Reach for this when each element needs its nearest later/earlier element with some property (next greater, next warmer, previous smaller) — monotonic stack.',
      'Reach for this when evaluating expressions: postfix/RPN, calculators, precedence handled by structure instead of parsing tricks.',
      'Reach for this when the wording says "most recent": undo the latest action, cancel the newest order, match the last unmatched opener.',
      'Reach for this when later events reverse or consume earlier ones: backspaces, undo keys, collisions — and when making recursion explicit.',
    ],
    template: `# Defer-and-resolve (bracket matching)
partner = {')': '(', ']': '[', '}': '{'}
stack = []
for ch in s:
    if ch in partner.values():
        stack.append(ch)              # defer the opener
    elif ch in partner:
        if not stack or stack.pop() != partner[ch]:
            return False              # nothing open, or wrong kind
return not stack                      # leftovers = unclosed

# Monotonic stack (next strictly greater, as a distance)
stack = []                            # indices; values non-increasing
ans = [0] * len(a)
for i, x in enumerate(a):
    while stack and a[stack[-1]] < x: # x resolves everything it beats
        j = stack.pop()
        ans[j] = i - j
    stack.append(i)                   # i now waits in turn`,
    complexity:
      'Push/pop/peek O(1); full scans Time O(n) — amortized even with nested pops — and Space O(n) worst case.',
  },
}

export default mod
