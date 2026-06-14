import type { Primitive } from '../types'

/**
 * Accumulator identity: seed a fold with the value that leaves its operation
 * unchanged — product with 1, sum with 0, running max with float('-inf').
 * Pick the wrong seed and the very first element is corrupted.
 */
const primitive: Primitive = {
  id: 'state-accumulator-identity',
  name: 'Accumulator identities (0 / 1 / +/-inf)',
  category: 'state',
  snippet: `prod = 1
for x in nums:
    prod *= x`,
  why: 'A fold needs a seed that its operation ignores: 0 for +, 1 for *, float("-inf") for max. Seed a product with 0 and every result collapses to 0; the identity keeps the first element honest.',
  moduleTags: ['prefix-sums', 'dynamic-programming', 'math-geometry'],
  misconceptions: [
    {
      id: 'product-seed-zero',
      label: 'product seeded with 0',
      feedback:
        'A product accumulator starts at 1, the identity for multiplication. Seeding with 0 makes 0 * anything == 0, so the result is always 0.',
    },
    {
      id: 'product-uses-plus',
      label: 'adds instead of multiplies',
      feedback:
        'To build a product, fold with *=. Using += sums the elements instead, which is a different accumulator entirely.',
    },
    {
      id: 'forgets-accumulate',
      label: 'never folds into the accumulator',
      feedback:
        'Without prod *= x in the loop body, prod keeps its seed value of 1 no matter what nums contains.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 0,
      prompt: 'With nums = [2, 3, 4], what is prod after the loop finishes?',
      choices: ['24', '0', '9', '1'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'product-seed-zero', 'product-uses-plus', 'forgets-accumulate'],
      verify: { setup: 'nums = [2, 3, 4]', mode: { expr: 'prod' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'prod = 1', indent: 0 },
        { text: 'for x in nums:', indent: 0 },
        { text: 'prod *= x', indent: 1 },
      ],
      distractors: [
        { text: 'prod = 0', indent: 0, misconceptionId: 'product-seed-zero' },
        { text: 'prod += x', indent: 1, misconceptionId: 'product-uses-plus' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'prod = 1', indent: 0 },
        { text: 'for x in nums:', indent: 0 },
        { text: 'prod *= x', indent: 1 },
      ],
      distractors: [
        { text: 'prod += x', indent: 1, misconceptionId: 'product-uses-plus' },
      ],
      blanks: [
        {
          lineIndex: 0,
          token: '1',
          options: ['1', '0'],
          misconceptionByOption: { '0': 'product-seed-zero' },
        },
        {
          lineIndex: 2,
          token: '*=',
          options: ['*=', '+='],
          misconceptionByOption: { '+=': 'product-uses-plus' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['prod = ▢', 'for x in nums:', '    prod ▢ x'],
      blanks: [
        {
          lineIndex: 0,
          accept: ['1'],
          misconceptionByInput: { '0': 'product-seed-zero' },
          placeholder: 'identity',
        },
        {
          lineIndex: 2,
          accept: ['*='],
          misconceptionByInput: { '+=': 'product-uses-plus' },
          placeholder: 'operator',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = 1', 'for ⟦s2⟧ in nums:', '    ⟦s1⟧ *= ⟦s2⟧'],
      slots: [
        { id: 's1', correctRole: 'running product' },
        { id: 's2', correctRole: 'current element' },
      ],
      roleBank: ['running product', 'current element', 'loop index', 'identity seed'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Seed the fold with its neutral value',
          acceptableKeywords: ['identity seed', 'neutral starting value', 'initialize accumulator', 'start at the identity'],
          hint: 'What starting value does the combining operation leave untouched?',
          misconception: 'This only sets the seed — no element has been folded in yet.',
        },
        {
          lineRange: [3, 4],
          referenceLabel: 'Fold each element into the accumulator',
          acceptableKeywords: ['combine each element', 'fold into accumulator', 'apply the operation', 'walk every value'],
          hint: 'How does each item get merged into the running result?',
          misconception: 'This is the per-element combine, not the seed that precedes it.',
        },
        {
          lineRange: [5, 5],
          referenceLabel: 'Hand back the folded result',
          acceptableKeywords: ['return the result', 'final accumulator', 'give back the total', 'output the fold'],
          hint: 'Once every element is folded in, what gets returned?',
          misconception: 'This reports the finished fold; it does not perform the combining.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'product',
      starterCode: `def product(nums):
    # Multiply every element of nums together and return the result.
    # The product of no numbers is 1.
    `,
      testCases: [
        { input: [[2, 3, 4]], expected: 24, label: 'positives' },
        { input: [[]], expected: 1, label: 'empty -> identity' },
        { input: [[5]], expected: 5, hidden: true },
        { input: [[-2, 3, -4]], expected: 24, hidden: true },
        { input: [[7, 0, 9]], expected: 0, hidden: true },
      ],
      parSeconds: 60,
      solution: `def product(nums):
    prod = 1
    for x in nums:
        prod *= x
    return prod`,
    },
  ],
}

export default primitive
