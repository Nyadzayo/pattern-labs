import type { Primitive } from '../types'

/**
 * Push / pop bracket match: a stack remembers every unclosed opener. Each closer
 * must pop the matching opener off the top, and a fully-balanced string drains
 * the stack to empty. The skeleton under "valid parentheses" style problems.
 */
const primitive: Primitive = {
  id: 'stack-push-pop-match',
  name: 'Push / pop bracket match',
  category: 'stack-queue',
  snippet: `stack = []
pairs = {')': '(', ']': '[', '}': '{'}
balanced = True
for c in s:
    if c in '([{':
        stack.append(c)
    elif not stack or stack.pop() != pairs[c]:
        balanced = False
        break
balanced = balanced and not stack`,
  why: 'Push every opener; on a closer, pop the top and check it is the matching opener. The pop turns "most recently opened" into "first to close", so nesting order is enforced for free. After the loop, an empty stack means nothing was left dangling.',
  moduleTags: ['stacks'],
  misconceptions: [
    {
      id: 'ignores-order',
      label: 'only counts brackets',
      feedback:
        'Matching counts of openers and closers is not enough: "([)]" has two of each but the nesting crosses. Popping the most recent opener on each closer is what enforces order.',
    },
    {
      id: 'forgets-leftover',
      label: 'forgets the leftover-stack check',
      feedback:
        'Surviving the loop is not the same as balanced. Unclosed openers like "(((" leave items on the stack, so the final answer must also require not stack.',
    },
    {
      id: 'empty-stack-crash',
      label: 'pops without guarding an empty stack',
      feedback:
        'A closer with nothing open (a leading ")") must fail before popping. The not stack guard short-circuits first; without it, stack.pop() raises on an empty stack.',
    },
    {
      id: 'pairs-wrong-direction',
      label: 'compares against the wrong bracket',
      feedback:
        'On a closer you pop the opener and compare it to pairs[c], the opener that closer expects. Comparing to c itself (the closer) never matches and rejects every valid string.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 6,
      prompt: "With s = '([)]', what is balanced after the loop?",
      choices: ['False', 'True'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'ignores-order'],
      verify: { setup: "s = '([)]'", mode: { expr: 'balanced' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'stack = []', indent: 0 },
        { text: "pairs = {')': '(', ']': '[', '}': '{'}", indent: 0 },
        { text: 'balanced = True', indent: 0 },
        { text: 'for c in s:', indent: 0 },
        { text: "if c in '([{':", indent: 1 },
        { text: 'stack.append(c)', indent: 2 },
        { text: 'elif not stack or stack.pop() != pairs[c]:', indent: 1 },
        { text: 'balanced = False', indent: 2 },
        { text: 'break', indent: 2 },
        { text: 'balanced = balanced and not stack', indent: 0 },
      ],
      distractors: [
        { text: 'balanced = balanced and len(stack) > 0', indent: 0, misconceptionId: 'forgets-leftover' },
        { text: 'elif stack.pop() != pairs[c]:', indent: 1, misconceptionId: 'empty-stack-crash' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'stack = []', indent: 0 },
        { text: "pairs = {')': '(', ']': '[', '}': '{'}", indent: 0 },
        { text: 'balanced = True', indent: 0 },
        { text: 'for c in s:', indent: 0 },
        { text: "if c in '([{':", indent: 1 },
        { text: 'stack.append(c)', indent: 2 },
        { text: 'elif not stack or stack.pop() != pairs[c]:', indent: 1 },
        { text: 'balanced = False', indent: 2 },
        { text: 'break', indent: 2 },
        { text: 'balanced = balanced and not stack', indent: 0 },
      ],
      distractors: [
        { text: 'balanced = balanced and len(stack) > 0', indent: 0, misconceptionId: 'forgets-leftover' },
      ],
      blanks: [
        {
          lineIndex: 6,
          token: 'not stack or stack.pop() != pairs[c]',
          options: [
            'not stack or stack.pop() != pairs[c]',
            'stack.pop() != pairs[c]',
            'not stack or stack.pop() != c',
          ],
          misconceptionByOption: {
            'stack.pop() != pairs[c]': 'empty-stack-crash',
            'not stack or stack.pop() != c': 'pairs-wrong-direction',
          },
        },
        {
          lineIndex: 9,
          token: 'not stack',
          options: ['not stack', 'len(stack) > 0', 'True'],
          misconceptionByOption: { 'len(stack) > 0': 'forgets-leftover' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'stack = []',
        "pairs = {')': '(', ']': '[', '}': '{'}",
        'balanced = True',
        'for c in s:',
        "    if c in '([{':",
        '        stack.append(c)',
        '    elif not stack or stack.pop() != pairs[▢]:',
        '        balanced = False',
        '        break',
        'balanced = balanced and not ▢',
      ],
      blanks: [
        {
          lineIndex: 6,
          accept: ['c'],
          misconceptionByInput: { 'pairs[c]': 'pairs-wrong-direction' },
          placeholder: 'closer char',
        },
        {
          lineIndex: 9,
          accept: ['stack'],
          misconceptionByInput: { 'len(stack)': 'forgets-leftover' },
          placeholder: 'must be empty',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = []',
        "⟦s2⟧ = {')': '(', ']': '[', '}': '{'}",
        'balanced = True',
        'for c in s:',
        "    if c in '([{':",
        '        ⟦s1⟧.append(c)',
        '    elif not ⟦s1⟧ or ⟦s1⟧.pop() != ⟦s2⟧[c]:',
        '        balanced = False',
        '        break',
        'balanced = balanced and not ⟦s1⟧',
      ],
      slots: [
        { id: 's1', correctRole: 'open-bracket stack' },
        { id: 's2', correctRole: 'closer-to-opener map' },
      ],
      roleBank: ['open-bracket stack', 'closer-to-opener map', 'running total', 'visited set'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 3],
          referenceLabel: 'Set up the stack and the closer-to-opener map',
          acceptableKeywords: ['empty stack of openers', 'map closers to openers', 'initialize the lookup', 'prepare the structures'],
          hint: 'What remembers unclosed openers, and what tells each closer which opener it needs?',
          misconception: 'This only prepares the tools — no character has been read yet.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Walk the string character by character',
          acceptableKeywords: ['scan each character', 'iterate the string', 'visit every bracket', 'single pass'],
          hint: 'How are the brackets examined?',
          misconception: 'This drives the scan; it does not itself classify a bracket.',
        },
        {
          lineRange: [5, 6],
          referenceLabel: 'Remember every opener on the stack',
          acceptableKeywords: ['push openers', 'stack the open bracket', 'record an unclosed opener', 'save it for later'],
          hint: 'When an opening bracket appears, what happens to it?',
          misconception: 'This stores openers for later matching — it never closes anything.',
        },
        {
          lineRange: [7, 8],
          referenceLabel: 'A closer must match the most recent opener',
          acceptableKeywords: ['pop and compare', 'closer matches the top', 'reject on mismatch or empty', 'guard then match'],
          hint: 'On a closer, what must be true about the top of the stack, and what guards an empty stack?',
          misconception: 'This enforces nesting order; the empty check must come first so popping nothing fails safely.',
        },
        {
          lineRange: [9, 9],
          referenceLabel: 'Demand nothing was left open',
          acceptableKeywords: ['stack must be empty', 'no leftover openers', 'return whether balanced', 'nothing dangling'],
          hint: 'Surviving the scan is not enough — what about openers that were never closed?',
          misconception: 'This final check rejects unclosed openers; a non-empty stack means the string is not balanced.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'is_balanced',
      starterCode: `def is_balanced(s):
    # Return True if every bracket in s is correctly opened and closed.
    `,
      testCases: [
        { input: ['([{}])'], expected: true, label: 'nested' },
        { input: ['(]'], expected: false, label: 'mismatch' },
        { input: [''], expected: true, hidden: true },
        { input: ['((('], expected: false, hidden: true },
        { input: [')'], expected: false, hidden: true },
        { input: ['{[]}()'], expected: true, hidden: true },
      ],
      parSeconds: 120,
      solution: `def is_balanced(s):
    stack = []
    pairs = {')': '(', ']': '[', '}': '{'}
    for c in s:
        if c in '([{':
            stack.append(c)
        elif not stack or stack.pop() != pairs[c]:
            return False
    return not stack`,
    },
  ],
}

export default primitive
