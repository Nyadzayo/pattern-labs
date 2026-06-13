import type { Primitive } from '../types'

/**
 * Complement lookup: while scanning, record value -> index in a hash map and, at
 * each element, ask whether the partner it needs (target - x) was already seen.
 * The core trick behind two-sum-by-index and many "find the matching pair" scans.
 */
const primitive: Primitive = {
  id: 'hash-complement-lookup',
  name: 'Complement lookup',
  category: 'hashing',
  snippet: `seen = {}
for i, x in enumerate(nums):
    if target - x in seen:
        result = [seen[target - x], i]
        break
    seen[x] = i`,
  why: 'A hash map turns "has the partner I need already appeared?" into an O(1) question. Check the complement BEFORE inserting x so an element can never pair with itself, then record value -> index for everything you pass.',
  moduleTags: ['hash-maps-sets', 'two-pointers'],
  misconceptions: [
    {
      id: 'insert-before-check',
      label: 'inserts x before checking',
      feedback:
        'Storing seen[x] = i before the membership test lets an element match its own complement when target - x == x. Check target - x in seen first, then insert.',
    },
    {
      id: 'stores-value-not-index',
      label: 'stores the value, not the index',
      feedback:
        'The map must remember where each value lives: seen[x] = i. Storing seen[x] = x throws away the index you later need to return.',
    },
    {
      id: 'lookup-x-not-complement',
      label: 'looks up x instead of its complement',
      feedback:
        'You want the partner that completes the target, which is target - x. Testing x in seen just asks whether you have seen x before.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 3,
      prompt: 'With nums = [2, 7, 4, 1] and target = 6, what is result after the loop?',
      choices: ['[0, 2]', '[2, 0]', '[1, 2]', 'None'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'stores-value-not-index', 'lookup-x-not-complement', 'insert-before-check'],
      verify: { setup: 'nums = [2, 7, 4, 1]\ntarget = 6\nresult = None', mode: { expr: 'result' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'seen = {}', indent: 0 },
        { text: 'for i, x in enumerate(nums):', indent: 0 },
        { text: 'if target - x in seen:', indent: 1 },
        { text: 'result = [seen[target - x], i]', indent: 2 },
        { text: 'break', indent: 2 },
        { text: 'seen[x] = i', indent: 1 },
      ],
      distractors: [
        { text: 'if x in seen:', indent: 1, misconceptionId: 'lookup-x-not-complement' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'seen = {}', indent: 0 },
        { text: 'for i, x in enumerate(nums):', indent: 0 },
        { text: 'if target - x in seen:', indent: 1 },
        { text: 'result = [seen[target - x], i]', indent: 2 },
        { text: 'break', indent: 2 },
        { text: 'seen[x] = i', indent: 1 },
      ],
      distractors: [
        { text: 'seen[x] = x', indent: 1, misconceptionId: 'stores-value-not-index' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'target - x',
          options: ['target - x', 'x', 'x - target'],
          misconceptionByOption: { x: 'lookup-x-not-complement' },
        },
        {
          lineIndex: 5,
          token: 'i',
          options: ['i', 'x'],
          misconceptionByOption: { x: 'stores-value-not-index' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'seen = {}',
        'for i, x in enumerate(nums):',
        '    if target - x in seen:',
        '        result = [seen[target - x], i]',
        '        break',
        '    seen[x] = ▢',
      ],
      blanks: [
        {
          lineIndex: 5,
          accept: ['i'],
          misconceptionByInput: { x: 'stores-value-not-index' },
          placeholder: 'what to store',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = {}',
        'for i, x in enumerate(nums):',
        '    if ⟦s2⟧ in ⟦s1⟧:',
        '        result = [⟦s1⟧[⟦s2⟧], i]',
        '        break',
        '    ⟦s1⟧[x] = i',
      ],
      slots: [
        { id: 's1', correctRole: 'value-to-index map' },
        { id: 's2', correctRole: 'needed complement' },
      ],
      roleBank: ['value-to-index map', 'needed complement', 'running total', 'loop bound'],
    },
    {
      kind: 'write',
      functionName: 'two_sum_indices',
      starterCode: `def two_sum_indices(nums, target):
    # Return the two indices whose values add up to target, or [] if none exist.
    `,
      testCases: [
        { input: [[2, 7, 4, 1], 6], expected: [0, 2], label: 'middle match' },
        { input: [[3, 3], 6], expected: [0, 1], label: 'duplicate values' },
        { input: [[1, 2, 3], 7], expected: [], hidden: true },
        { input: [[5, 0, 5], 10], expected: [0, 2], hidden: true },
        { input: [[-1, -2, -3, -4], -6], expected: [1, 3], hidden: true },
      ],
      parSeconds: 120,
      solution: `def two_sum_indices(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
    return []`,
    },
  ],
}

export default primitive
