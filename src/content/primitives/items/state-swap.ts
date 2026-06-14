import type { Primitive } from '../types'

/**
 * Tuple swap: exchange the contents of two list slots in a single statement —
 * a[i], a[j] = a[j], a[i] — with no temp variable. Python builds the
 * right-hand tuple first, then unpacks it, so both reads happen before either
 * write. The bedrock move under reversals, sorting swaps, and partitioning.
 */
const primitive: Primitive = {
  id: 'state-swap',
  name: 'Tuple swap',
  category: 'state',
  snippet: `i = 0
j = len(nums) - 1
nums[i], nums[j] = nums[j], nums[i]`,
  why: 'Python evaluates the whole right-hand side into a tuple before assigning, so a[i], a[j] = a[j], a[i] swaps both slots at once with no temp variable. Writing the two assignments separately clobbers one value before it is read.',
  moduleTags: ['sort-search', 'two-pointers', 'linked-lists'],
  misconceptions: [
    {
      id: 'sequential-clobber',
      label: 'splits the swap into two assignments',
      feedback:
        'nums[i] = nums[j] first overwrites nums[i], so the second line copies the new value back and both slots end up equal. The simultaneous tuple form reads both before writing either.',
    },
    {
      id: 'same-order-no-swap',
      label: 'right side mirrors the left',
      feedback:
        'nums[i], nums[j] = nums[i], nums[j] assigns each slot its own value — nothing changes. To swap, the right side must list the slots in the opposite order.',
    },
    {
      id: 'last-index-off',
      label: 'last index is len, not len - 1',
      feedback:
        'The final position is len(nums) - 1. Using len(nums) as an index raises IndexError because valid indices stop one before the length.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With nums = [3, 8, 5, 1], what is nums after these lines run?',
      choices: ['[1, 8, 5, 3]', '[3, 8, 5, 1]', '[1, 8, 5, 1]', '[8, 3, 5, 1]'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'same-order-no-swap', 'sequential-clobber', null],
      verify: { setup: 'nums = [3, 8, 5, 1]', mode: { expr: 'nums' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'i = 0', indent: 0 },
        { text: 'j = len(nums) - 1', indent: 0 },
        { text: 'nums[i], nums[j] = nums[j], nums[i]', indent: 0 },
      ],
      distractors: [
        { text: 'j = len(nums)', indent: 0, misconceptionId: 'last-index-off' },
        { text: 'nums[i] = nums[j]', indent: 0, misconceptionId: 'sequential-clobber' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'i = 0', indent: 0 },
        { text: 'j = len(nums) - 1', indent: 0 },
        { text: 'nums[i], nums[j] = nums[j], nums[i]', indent: 0 },
      ],
      distractors: [
        { text: 'nums[i] = nums[j]', indent: 0, misconceptionId: 'sequential-clobber' },
      ],
      blanks: [
        {
          lineIndex: 1,
          token: 'len(nums) - 1',
          options: ['len(nums) - 1', 'len(nums)', '0'],
          misconceptionByOption: { 'len(nums)': 'last-index-off' },
        },
        {
          lineIndex: 2,
          token: 'nums[j], nums[i]',
          options: ['nums[j], nums[i]', 'nums[i], nums[j]'],
          misconceptionByOption: { 'nums[i], nums[j]': 'same-order-no-swap' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['i = 0', 'j = len(nums) - 1', 'nums[i], nums[j] = ▢'],
      blanks: [
        {
          lineIndex: 2,
          accept: ['nums[j], nums[i]'],
          misconceptionByInput: {
            'nums[i], nums[j]': 'same-order-no-swap',
          },
          placeholder: 'right-hand tuple',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = 0', '⟦s2⟧ = len(nums) - 1', 'nums[⟦s1⟧], nums[⟦s2⟧] = nums[⟦s2⟧], nums[⟦s1⟧]'],
      slots: [
        { id: 's1', correctRole: 'first index' },
        { id: 's2', correctRole: 'last index' },
      ],
      roleBank: ['first index', 'last index', 'temp holder', 'loop bound'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 3],
          referenceLabel: 'Bail out when there is nothing to exchange',
          acceptableKeywords: ['guard the edge case', 'too few elements', 'return early', 'nothing to swap'],
          hint: 'What sizes make a swap pointless or impossible?',
          misconception: 'This is the early guard, not the exchange that follows.',
        },
        {
          lineRange: [4, 5],
          referenceLabel: 'Pin the two positions to exchange',
          acceptableKeywords: ['choose the indices', 'first and last position', 'mark the slots', 'set the endpoints'],
          hint: 'Which two slots are about to trade contents?',
          misconception: 'This only locates the slots — neither value has moved yet.',
        },
        {
          lineRange: [6, 6],
          referenceLabel: 'Exchange both slots simultaneously',
          acceptableKeywords: ['swap the two slots', 'simultaneous exchange', 'trade the values', 'tuple swap'],
          hint: 'How do both slots change value without losing one to the other?',
          misconception: 'This is the swap itself, distinct from picking the indices above.',
        },
        {
          lineRange: [7, 7],
          referenceLabel: 'Hand back the mutated list',
          acceptableKeywords: ['return the list', 'give back the result', 'output the array', 'final list'],
          hint: 'After the in-place change, what gets returned?',
          misconception: 'This reports the result; it does not perform the exchange.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'swap_ends',
      starterCode: `def swap_ends(nums):
    # Swap the first and last elements in place and return the list.
    `,
      testCases: [
        { input: [[3, 8, 5, 1]], expected: [1, 8, 5, 3], label: 'four items' },
        { input: [[7, 2]], expected: [2, 7], label: 'two items' },
        { input: [[9]], expected: [9], hidden: true },
        { input: [[]], expected: [], hidden: true },
        { input: [[1, 2, 3, 4, 5]], expected: [5, 2, 3, 4, 1], hidden: true },
      ],
      parSeconds: 60,
      solution: `def swap_ends(nums):
    if len(nums) < 2:
        return nums
    i = 0
    j = len(nums) - 1
    nums[i], nums[j] = nums[j], nums[i]
    return nums`,
    },
  ],
}

export default primitive
