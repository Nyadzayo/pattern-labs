import type { Primitive } from '../types'

/**
 * Forward index scan: walk every position 0..n-1 and fold each element into a
 * running accumulator. The bedrock loop idiom under sums, counts, and scans.
 */
const primitive: Primitive = {
  id: 'loop-forward-index',
  name: 'Forward index scan',
  category: 'loops',
  snippet: `total = 0
for i in range(len(nums)):
    total += nums[i]`,
  why: 'range(len(nums)) visits every index exactly once, left to right. Pair it with an accumulator initialized before the loop to fold the whole array into one value.',
  moduleTags: ['two-pointers', 'prefix-sums', 'sort-search', 'math-geometry'],
  misconceptions: [
    {
      id: 'range-off-by-one',
      label: 'range stops one short',
      feedback:
        'range(len(nums)) yields 0..len-1 — that is every index. range(len(nums) - 1) silently skips the last element.',
    },
    {
      id: 'counts-instead-of-sums',
      label: 'counts items instead of summing values',
      feedback:
        'Adding 1 each step counts how many elements there are. To total the values, add nums[i].',
    },
    {
      id: 'forgets-accumulate',
      label: 'never updates the accumulator',
      feedback:
        'Without total += nums[i] inside the loop body, total keeps its initial value of 0.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 1,
      prompt: 'With nums = [4, 1, 7, 2], what is total after the loop finishes?',
      choices: ['14', '12', '4', '0'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'range-off-by-one', 'counts-instead-of-sums', 'forgets-accumulate'],
      verify: { setup: 'nums = [4, 1, 7, 2]', mode: { expr: 'total' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'total = 0', indent: 0 },
        { text: 'for i in range(len(nums)):', indent: 0 },
        { text: 'total += nums[i]', indent: 1 },
      ],
      distractors: [
        { text: 'for i in range(len(nums) - 1):', indent: 0, misconceptionId: 'range-off-by-one' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'total = 0', indent: 0 },
        { text: 'for i in range(len(nums)):', indent: 0 },
        { text: 'total += nums[i]', indent: 1 },
      ],
      distractors: [
        { text: 'total += 1', indent: 1, misconceptionId: 'counts-instead-of-sums' },
      ],
      blanks: [
        {
          lineIndex: 1,
          token: 'len(nums)',
          options: ['len(nums)', 'len(nums) - 1', 'nums'],
          misconceptionByOption: { 'len(nums) - 1': 'range-off-by-one' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['total = 0', 'for i in range(▢):', '    total += nums[i]'],
      blanks: [
        {
          lineIndex: 1,
          accept: ['len(nums)'],
          misconceptionByInput: { 'len(nums) - 1': 'range-off-by-one', 'len(nums)-1': 'range-off-by-one' },
          placeholder: 'stop index',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['total = 0', 'for ⟦s1⟧ in range(len(⟦s2⟧)):', '    total += ⟦s2⟧[⟦s1⟧]'],
      slots: [
        { id: 's1', correctRole: 'loop index' },
        { id: 's2', correctRole: 'input collection' },
      ],
      roleBank: ['loop index', 'input collection', 'running total', 'sentinel value'],
    },
    {
      kind: 'write',
      functionName: 'array_sum',
      starterCode: `def array_sum(nums):
    # Add every element of nums and return the total.
    `,
      testCases: [
        { input: [[4, 1, 7, 2]], expected: 14, label: 'mixed' },
        { input: [[]], expected: 0, label: 'empty' },
        { input: [[5]], expected: 5, hidden: true },
        { input: [[-3, 3, -3, 3]], expected: 0, hidden: true },
        { input: [[10, 20, 30, 40]], expected: 100, hidden: true },
      ],
      parSeconds: 60,
      solution: `def array_sum(nums):
    total = 0
    for i in range(len(nums)):
        total += nums[i]
    return total`,
    },
  ],
}

export default primitive
