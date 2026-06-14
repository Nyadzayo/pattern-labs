import type { Primitive } from '../types'

/**
 * Opposite-ends converge: a pointer at each end walks inward until they meet.
 * The skeleton under palindrome checks, sorted-pair search, and container math.
 */
const primitive: Primitive = {
  id: 'tp-opposite-ends',
  name: 'Opposite-ends converge',
  category: 'two-pointers',
  snippet: `left = 0
right = len(nums) - 1
pairs = 0
while left < right:
    pairs += nums[left] + nums[right]
    left += 1
    right -= 1`,
  why: 'Start one pointer at each end and move them toward each other. The loop halts the moment they meet (left < right), so each element is touched at most once.',
  moduleTags: ['two-pointers', 'sort-search'],
  misconceptions: [
    {
      id: 'stop-condition-off',
      label: 'wrong stop condition',
      feedback:
        'while left < right stops exactly when the pointers meet. while left <= right runs one extra step where left == right, double-counting the middle element.',
    },
    {
      id: 'ignores-right-pointer',
      label: 'only uses one end',
      feedback:
        'Both ends contribute each step. Read nums[left] AND nums[right], and advance both pointers.',
    },
    {
      id: 'right-init-zero',
      label: 'right starts at 0',
      feedback:
        'right must start at the last index, len(nums) - 1. Starting both pointers at 0 means left < right is false immediately and the loop never runs.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 3,
      prompt: 'With nums = [5, 1, 2, 1, 5], what is pairs after the loop?',
      choices: ['12', '16', '6', '0'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'stop-condition-off', 'ignores-right-pointer', 'right-init-zero'],
      verify: { setup: 'nums = [5, 1, 2, 1, 5]', mode: { expr: 'pairs' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'left = 0', indent: 0 },
        { text: 'right = len(nums) - 1', indent: 0 },
        { text: 'pairs = 0', indent: 0 },
        { text: 'while left < right:', indent: 0 },
        { text: 'pairs += nums[left] + nums[right]', indent: 1 },
        { text: 'left += 1', indent: 1 },
        { text: 'right -= 1', indent: 1 },
      ],
      distractors: [
        { text: 'while left <= right:', indent: 0, misconceptionId: 'stop-condition-off' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'left = 0', indent: 0 },
        { text: 'right = len(nums) - 1', indent: 0 },
        { text: 'pairs = 0', indent: 0 },
        { text: 'while left < right:', indent: 0 },
        { text: 'pairs += nums[left] + nums[right]', indent: 1 },
        { text: 'left += 1', indent: 1 },
        { text: 'right -= 1', indent: 1 },
      ],
      distractors: [{ text: 'right = 0', indent: 0, misconceptionId: 'right-init-zero' }],
      blanks: [
        {
          lineIndex: 1,
          token: 'len(nums) - 1',
          options: ['len(nums) - 1', 'len(nums)', '0'],
          misconceptionByOption: { '0': 'right-init-zero' },
        },
        {
          lineIndex: 3,
          token: 'left < right',
          options: ['left < right', 'left <= right'],
          misconceptionByOption: { 'left <= right': 'stop-condition-off' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'left = 0',
        'right = len(nums) - 1',
        'pairs = 0',
        'while left ▢ right:',
        '    pairs += nums[left] + nums[right]',
        '    left += 1',
        '    right -= 1',
      ],
      blanks: [
        {
          lineIndex: 3,
          accept: ['<'],
          misconceptionByInput: { '<=': 'stop-condition-off' },
          placeholder: 'comparison',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = 0',
        '⟦s2⟧ = len(nums) - 1',
        'pairs = 0',
        'while ⟦s1⟧ < ⟦s2⟧:',
        '    pairs += nums[⟦s1⟧] + nums[⟦s2⟧]',
        '    ⟦s1⟧ += 1',
        '    ⟦s2⟧ -= 1',
      ],
      slots: [
        { id: 's1', correctRole: 'left pointer' },
        { id: 's2', correctRole: 'right pointer' },
      ],
      roleBank: ['left pointer', 'right pointer', 'running total', 'loop bound'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 3],
          referenceLabel: 'Anchor a pointer at each end',
          acceptableKeywords: ['pointer at each end', 'start at the ends', 'initialize pointers', 'left and right start', 'both ends'],
          hint: 'Where do the two pointers begin?',
          misconception: 'This only positions where to look from — nothing is compared yet.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Converge until the pointers cross',
          acceptableKeywords: ['loop until they cross', 'while pointers meet', 'converge inward', 'scan until they meet'],
          hint: 'What keeps the scan going, and when does it stop?',
          misconception: 'This bounds the scan; it is not the comparison itself.',
        },
        {
          lineRange: [5, 6],
          referenceLabel: 'Bail out on the first mismatch',
          acceptableKeywords: ['mismatch returns false', 'first difference fails', 'not equal reject', 'unequal exit early'],
          hint: 'What happens the instant two compared elements disagree?',
          misconception: 'This is the early exit, not the normal advance step.',
        },
        {
          lineRange: [7, 8],
          referenceLabel: 'Step both pointers inward',
          acceptableKeywords: ['move both inward', 'advance the pointers', 'step inward', 'left up right down'],
          hint: 'After a successful match, how do the pointers move?',
          misconception: 'The pointers move only after a pair matches — this is not the check.',
        },
        {
          lineRange: [9, 9],
          referenceLabel: 'Nothing mismatched, so it is symmetric',
          acceptableKeywords: ['return true success', 'all pairs matched', 'symmetric result', 'survived the loop'],
          hint: 'If the loop ends without finding a problem, what does that mean?',
          misconception: 'Reaching here means no pair ever differed — the success case.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'is_symmetric',
      starterCode: `def is_symmetric(values):
    # Return True if values reads the same forwards and backwards.
    `,
      testCases: [
        { input: [[1, 2, 3, 2, 1]], expected: true, label: 'odd palindrome' },
        { input: [[1, 2, 2, 1]], expected: true, label: 'even palindrome' },
        { input: [[1, 2, 3]], expected: false, hidden: true },
        { input: [[]], expected: true, hidden: true },
        { input: [[7]], expected: true, hidden: true },
        { input: [[1, 2, 2, 3]], expected: false, hidden: true },
      ],
      parSeconds: 90,
      solution: `def is_symmetric(values):
    left = 0
    right = len(values) - 1
    while left < right:
        if values[left] != values[right]:
            return False
        left += 1
        right -= 1
    return True`,
    },
  ],
}

export default primitive
