import type { Primitive } from '../types'

/**
 * Monotonic-stack pop-while: keep a stack of indices and pop everything that
 * the incoming element breaks the order against before pushing. The engine
 * under next-greater / next-smaller and span-style problems.
 */
const primitive: Primitive = {
  id: 'stack-monotonic-pop',
  name: 'Monotonic-stack pop-while',
  category: 'stack-queue',
  snippet: `stack = []
for i in range(len(a)):
    while stack and a[stack[-1]] < a[i]:
        stack.pop()
    stack.append(i)`,
  why: 'Store indices, not values, so you can still reach each element. The while-loop (never an if) pops every index whose value the new element dominates, which keeps the stack monotonic and answers "next greater element" in one left-to-right pass.',
  moduleTags: ['stacks'],
  misconceptions: [
    {
      id: 'flipped-comparison',
      label: 'comparison points the wrong way',
      feedback:
        'a[stack[-1]] < a[i] pops indices the new element is greater than, leaving a decreasing stack (next-greater). Flipping to > builds the opposite ordering and answers a different question.',
    },
    {
      id: 'pushes-values',
      label: 'pushes values instead of indices',
      feedback:
        'Push i, not a[i]. Indices let you recover positions and still read values with a[stack[-1]]; pushing raw values throws the positions away.',
    },
    {
      id: 'if-not-while',
      label: 'uses if so only one element pops',
      feedback:
        'An if pops at most one index per step, so older indices the new element dominates survive and the stack stops being monotonic. A while drains them all.',
    },
    {
      id: 'forgets-emptiness-guard',
      label: 'peeks stack[-1] without the empty check',
      feedback:
        'The stack and ... guard short-circuits before a[stack[-1]], so an empty stack never gets indexed. Drop it and the first iteration raises IndexError.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With a = [2, 1, 5, 3], what is stack after the loop finishes?',
      choices: ['[2, 3]', '[1, 3]', '[5, 3]', '[0, 2, 3]'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'flipped-comparison', 'pushes-values', 'if-not-while'],
      verify: { setup: 'a = [2, 1, 5, 3]', mode: { expr: 'stack' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'stack = []', indent: 0 },
        { text: 'for i in range(len(a)):', indent: 0 },
        { text: 'while stack and a[stack[-1]] < a[i]:', indent: 1 },
        { text: 'stack.pop()', indent: 2 },
        { text: 'stack.append(i)', indent: 1 },
      ],
      distractors: [
        { text: 'if stack and a[stack[-1]] < a[i]:', indent: 1, misconceptionId: 'if-not-while' },
        { text: 'stack.append(a[i])', indent: 1, misconceptionId: 'pushes-values' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'stack = []', indent: 0 },
        { text: 'for i in range(len(a)):', indent: 0 },
        { text: 'while stack and a[stack[-1]] < a[i]:', indent: 1 },
        { text: 'stack.pop()', indent: 2 },
        { text: 'stack.append(i)', indent: 1 },
      ],
      distractors: [
        { text: 'while a[stack[-1]] < a[i]:', indent: 1, misconceptionId: 'forgets-emptiness-guard' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'a[stack[-1]] < a[i]',
          options: ['a[stack[-1]] < a[i]', 'a[stack[-1]] > a[i]', 'stack[-1] < a[i]'],
          misconceptionByOption: {
            'a[stack[-1]] > a[i]': 'flipped-comparison',
            'stack[-1] < a[i]': 'pushes-values',
          },
        },
        {
          lineIndex: 4,
          token: 'i',
          options: ['i', 'a[i]'],
          misconceptionByOption: { 'a[i]': 'pushes-values' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'stack = []',
        'for i in range(len(a)):',
        '    while ▢ and a[stack[-1]] < a[i]:',
        '        stack.pop()',
        '    stack.append(i)',
      ],
      blanks: [
        {
          lineIndex: 2,
          accept: ['stack'],
          misconceptionByInput: { '': 'forgets-emptiness-guard' },
          placeholder: 'guard before peeking',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = []',
        'for ⟦s2⟧ in range(len(a)):',
        '    while ⟦s1⟧ and a[⟦s1⟧[-1]] < a[⟦s2⟧]:',
        '        ⟦s1⟧.pop()',
        '    ⟦s1⟧.append(⟦s2⟧)',
      ],
      slots: [
        { id: 's1', correctRole: 'monotonic stack of indices' },
        { id: 's2', correctRole: 'current index' },
      ],
      roleBank: ['monotonic stack of indices', 'current index', 'running maximum', 'output array'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 3],
          referenceLabel: 'Prepare the answers and an empty stack',
          acceptableKeywords: ['default the results', 'start an empty stack', 'fill with the not-found value', 'initialize the structures'],
          hint: 'What default answer and what empty helper must exist before the scan?',
          misconception: 'This only sets up storage — nothing has been compared yet.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Sweep every position left to right',
          acceptableKeywords: ['scan each index', 'iterate left to right', 'visit every position', 'single pass over the array'],
          hint: 'In what order are positions visited?',
          misconception: 'This drives the pass; it does not itself resolve any pending answer.',
        },
        {
          lineRange: [5, 6],
          referenceLabel: 'Resolve everyone the new element dominates',
          acceptableKeywords: ['pop while smaller', 'resolve dominated indices', 'answer those the new value beats', 'drain the stack while broken'],
          hint: 'While the top of the stack is beaten by the current value, what gets settled?',
          misconception: 'This empties out indices the new element exceeds; using if instead of while would leave some unresolved.',
        },
        {
          lineRange: [7, 7],
          referenceLabel: 'Park the current index awaiting its answer',
          acceptableKeywords: ['push the index', 'store position not value', 'wait for a greater later', 'add to the stack'],
          hint: 'What gets set aside, still unanswered, after the popping settles?',
          misconception: 'This stows the index for later — it pushes the position, not the value.',
        },
        {
          lineRange: [8, 8],
          referenceLabel: 'Return the resolved answers',
          acceptableKeywords: ['return the results', 'hand back the array', 'leftovers stay at default', 'final answers'],
          hint: 'After the sweep, what is returned, and what value do still-on-the-stack positions keep?',
          misconception: 'This returns the result array — indices never resolved keep the default not-found value.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'next_greater',
      starterCode: `def next_greater(a):
    # For each position, return the first later value that is strictly greater,
    # or -1 if none exists.
    `,
      testCases: [
        { input: [[2, 1, 5, 3]], expected: [5, 5, -1, -1], label: 'mixed' },
        { input: [[1, 2, 3]], expected: [2, 3, -1], label: 'increasing' },
        { input: [[3, 2, 1]], expected: [-1, -1, -1], hidden: true },
        { input: [[]], expected: [], hidden: true },
        { input: [[5]], expected: [-1], hidden: true },
        { input: [[2, 7, 4, 9, 1]], expected: [7, 9, 9, -1, -1], hidden: true },
        { input: [[4, 4, 4]], expected: [-1, -1, -1], hidden: true },
      ],
      parSeconds: 150,
      solution: `def next_greater(a):
    res = [-1] * len(a)
    stack = []
    for i in range(len(a)):
        while stack and a[stack[-1]] < a[i]:
            res[stack.pop()] = a[i]
        stack.append(i)
    return res`,
    },
  ],
}

export default primitive
