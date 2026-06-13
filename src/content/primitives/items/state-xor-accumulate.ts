import type { Primitive } from '../types'

/**
 * XOR / parity accumulate: fold every element into a running XOR. Because
 * x ^ x == 0 and x ^ 0 == x, any value seen an even number of times cancels
 * itself out, so the accumulator keeps only the unpaired value (or running
 * parity). The trick behind single-number, missing-bit, and toggle problems.
 */
const primitive: Primitive = {
  id: 'state-xor-accumulate',
  name: 'XOR / parity accumulate',
  category: 'state',
  snippet: `acc = 0
for x in nums:
    acc ^= x`,
  why: 'XOR is its own inverse: x ^ x == 0 and x ^ 0 == x. Folding a list with ^ cancels every value that appears an even number of times, leaving the lone unpaired element — in O(n) time and O(1) space, no hash set needed.',
  moduleTags: ['bit-manipulation'],
  misconceptions: [
    {
      id: 'init-nonzero',
      label: 'accumulator starts at the wrong identity',
      feedback:
        'The XOR identity is 0: x ^ 0 == x. Starting acc at 1 (or any non-zero value) corrupts every fold, so the final answer is wrong even when each value is paired correctly.',
    },
    {
      id: 'adds-instead-of-xor',
      label: 'sums instead of XOR-ing',
      feedback:
        'acc += x adds the values, which does NOT cancel duplicates. Only acc ^= x uses XOR, where a repeated value undoes itself back to 0.',
    },
    {
      id: 'overwrites-not-folds',
      label: 'overwrites the accumulator each step',
      feedback:
        'acc = x throws away everything seen so far and keeps only the last element. You must fold with acc ^= x (i.e. acc = acc ^ x) so earlier values still count.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With nums = [4, 1, 2, 1, 2], what is acc after the loop finishes?',
      choices: ['4', '10', '2', '5'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'adds-instead-of-xor', 'overwrites-not-folds', 'init-nonzero'],
      verify: { setup: 'nums = [4, 1, 2, 1, 2]', mode: { expr: 'acc' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'acc = 0', indent: 0 },
        { text: 'for x in nums:', indent: 0 },
        { text: 'acc ^= x', indent: 1 },
      ],
      distractors: [
        { text: 'acc += x', indent: 1, misconceptionId: 'adds-instead-of-xor' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'acc = 0', indent: 0 },
        { text: 'for x in nums:', indent: 0 },
        { text: 'acc ^= x', indent: 1 },
      ],
      distractors: [
        { text: 'acc = x', indent: 1, misconceptionId: 'overwrites-not-folds' },
      ],
      blanks: [
        {
          lineIndex: 0,
          token: '0',
          options: ['0', '1'],
          misconceptionByOption: { '1': 'init-nonzero' },
        },
        {
          lineIndex: 2,
          token: '^=',
          options: ['^=', '+='],
          misconceptionByOption: { '+=': 'adds-instead-of-xor' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['acc = 0', 'for x in nums:', '    acc ▢ x'],
      blanks: [
        {
          lineIndex: 2,
          accept: ['^='],
          misconceptionByInput: { '+=': 'adds-instead-of-xor', '=': 'overwrites-not-folds' },
          placeholder: 'fold operator',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = 0', 'for ⟦s2⟧ in nums:', '    ⟦s1⟧ ^= ⟦s2⟧'],
      slots: [
        { id: 's1', correctRole: 'running XOR accumulator' },
        { id: 's2', correctRole: 'current element' },
      ],
      roleBank: ['running XOR accumulator', 'current element', 'loop index', 'pair count'],
    },
    {
      kind: 'write',
      functionName: 'lone_value',
      starterCode: `def lone_value(nums):
    # Every value appears exactly twice except one. Return the unpaired value.
    `,
      testCases: [
        { input: [[2, 3, 2]], expected: 3, label: 'one extra' },
        { input: [[4, 1, 2, 1, 2]], expected: 4, label: 'leading single' },
        { input: [[7]], expected: 7, hidden: true },
        { input: [[5, 5, 9, 9, 11]], expected: 11, hidden: true },
        { input: [[0, 1, 0]], expected: 1, hidden: true },
      ],
      parSeconds: 75,
      solution: `def lone_value(nums):
    acc = 0
    for x in nums:
        acc ^= x
    return acc`,
    },
  ],
}

export default primitive
