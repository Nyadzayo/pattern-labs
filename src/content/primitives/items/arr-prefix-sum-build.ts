import type { Primitive } from '../types'

/**
 * Prefix-sum build: seed with a leading 0, then each entry is the previous
 * prefix plus the current value. Turns any range-sum into an O(1) subtraction.
 */
const primitive: Primitive = {
  id: 'arr-prefix-sum-build',
  name: 'Prefix-sum build',
  category: 'arrays',
  snippet: `prefix = [0]
for x in nums:
    prefix.append(prefix[-1] + x)`,
  why: 'The leading 0 represents the empty prefix, so prefix[k] is the sum of the first k elements and the array has len(nums)+1 entries. Each step extends it by previous-total + current value.',
  moduleTags: ['prefix-sums'],
  misconceptions: [
    {
      id: 'forgets-running-sum',
      label: 'appends the value, not the total',
      feedback:
        'Each entry is the running total: prefix[-1] + x. Appending just x (or x alone) stores the raw values, not their prefixes.',
    },
    {
      id: 'off-by-one-length',
      label: 'wrong length / last value',
      feedback:
        'A prefix array over n values has n+1 entries because of the leading 0. The last entry is the sum of all elements, not the last element.',
    },
    {
      id: 'forgets-append',
      label: 'never extends the array',
      feedback:
        'Without prefix.append(...) inside the loop, prefix stays [0] and prefix[-1] is always 0.',
    },
    {
      id: 'missing-seed',
      label: 'no leading 0',
      feedback:
        'Seed the array with [0]. Starting from [] makes prefix[-1] raise IndexError on the first append and shifts every index by one.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With nums = [2, 4, 1, 3], what is prefix[-1] after the loop?',
      choices: ['10', '7', '3', '0'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'forgets-running-sum', 'off-by-one-length', 'forgets-append'],
      verify: { setup: 'nums = [2, 4, 1, 3]', mode: { expr: 'prefix[-1]' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'prefix = [0]', indent: 0 },
        { text: 'for x in nums:', indent: 0 },
        { text: 'prefix.append(prefix[-1] + x)', indent: 1 },
      ],
      distractors: [{ text: 'prefix = []', indent: 0, misconceptionId: 'missing-seed' }],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'prefix = [0]', indent: 0 },
        { text: 'for x in nums:', indent: 0 },
        { text: 'prefix.append(prefix[-1] + x)', indent: 1 },
      ],
      distractors: [{ text: 'prefix = []', indent: 0, misconceptionId: 'missing-seed' }],
      blanks: [
        {
          lineIndex: 2,
          token: 'prefix[-1] + x',
          options: ['prefix[-1] + x', 'x', 'prefix[0] + x'],
          misconceptionByOption: { x: 'forgets-running-sum', 'prefix[0] + x': 'forgets-running-sum' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['prefix = [0]', 'for x in nums:', '    prefix.append(prefix[-1] + ▢)'],
      blanks: [
        {
          lineIndex: 2,
          accept: ['x'],
          misconceptionByInput: { '0': 'forgets-running-sum' },
          placeholder: 'current value',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = [0]', 'for ⟦s2⟧ in nums:', '    ⟦s1⟧.append(⟦s1⟧[-1] + ⟦s2⟧)'],
      slots: [
        { id: 's1', correctRole: 'prefix array' },
        { id: 's2', correctRole: 'current element' },
      ],
      roleBank: ['prefix array', 'current element', 'running maximum', 'window size'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Seed the accumulator with an empty-prefix value',
          acceptableKeywords: ['seed with zero', 'leading empty total', 'start the accumulator', 'initial empty prefix'],
          hint: 'What value represents the sum of nothing before any element is added?',
          misconception: 'This only plants the starting total — no real elements have been folded in yet.',
        },
        {
          lineRange: [3, 3],
          referenceLabel: 'Walk through each incoming value',
          acceptableKeywords: ['iterate the values', 'for each element', 'loop over input', 'visit every item'],
          hint: 'What drives one accumulation step per element?',
          misconception: 'This only sequences the work; the running total is computed inside.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Extend by the previous total plus the new value',
          acceptableKeywords: ['previous total plus value', 'running sum extend', 'carry the accumulator', 'add to last entry'],
          hint: 'How does each new entry build on the one before it?',
          misconception: 'This stores a cumulative total, not the raw element on its own.',
        },
        {
          lineRange: [5, 5],
          referenceLabel: 'Return the completed cumulative table',
          acceptableKeywords: ['return the array', 'give back prefixes', 'yield the totals', 'final result'],
          hint: 'After every value is folded in, what gets handed back?',
          misconception: 'This is the exit after the loop, not part of the accumulation.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'prefix_sums',
      starterCode: `def prefix_sums(nums):
    # Return out where out[k] is the sum of the first k elements; out[0] = 0.
    `,
      testCases: [
        { input: [[2, 4, 1, 3]], expected: [0, 2, 6, 7, 10], label: 'mixed' },
        { input: [[]], expected: [0], label: 'empty' },
        { input: [[5]], expected: [0, 5], hidden: true },
        { input: [[1, 1, 1, 1]], expected: [0, 1, 2, 3, 4], hidden: true },
        { input: [[-2, 2, -2, 2]], expected: [0, -2, 0, -2, 0], hidden: true },
      ],
      parSeconds: 75,
      solution: `def prefix_sums(nums):
    prefix = [0]
    for x in nums:
        prefix.append(prefix[-1] + x)
    return prefix`,
    },
  ],
}

export default primitive
