import type { Primitive } from '../types'

/**
 * Inclusive-bounds setup: lo, hi = 0, len(nums) - 1. The span covers the whole
 * array, hi is the last valid index, and the loop runs while lo <= hi.
 */
const primitive: Primitive = {
  id: 'bs-lo-hi-init',
  name: 'lo / hi initialization',
  category: 'binary-search',
  snippet: `lo = 0
hi = len(nums) - 1
width = hi - lo + 1`,
  why: 'Inclusive bounds put hi on the last valid index (len(nums) - 1), so the search window spans every element and the loop condition is lo <= hi. Setting hi to len(nums) instead is the half-open convention, which pairs with lo < hi and a different mid handling.',
  moduleTags: ['binary-search', 'sort-search'],
  misconceptions: [
    {
      id: 'hi-half-open',
      label: 'hi starts at len(nums)',
      feedback:
        'hi = len(nums) is the half-open convention and indexes one past the end. For inclusive bounds (loop while lo <= hi) hi must be the last valid index, len(nums) - 1.',
    },
    {
      id: 'lo-starts-one',
      label: 'lo starts at 1',
      feedback:
        'Python indices begin at 0, so lo = 0 includes the first element. Starting at 1 silently skips nums[0].',
    },
    {
      id: 'width-off-by-one',
      label: 'forgets the +1 in the span',
      feedback:
        'An inclusive range [lo, hi] holds hi - lo + 1 elements, not hi - lo. With lo = 0 and hi = len(nums) - 1 that is exactly len(nums).',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 1,
      prompt: 'With nums of length 8, what is hi right after initialization?',
      choices: ['7', '8', '0', '1'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'hi-half-open', null, 'lo-starts-one'],
      verify: { setup: 'nums = [0] * 8', mode: { expr: 'hi' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'lo = 0', indent: 0 },
        { text: 'hi = len(nums) - 1', indent: 0 },
        { text: 'width = hi - lo + 1', indent: 0 },
      ],
      distractors: [
        { text: 'hi = len(nums)', indent: 0, misconceptionId: 'hi-half-open' },
        { text: 'lo = 1', indent: 0, misconceptionId: 'lo-starts-one' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'lo = 0', indent: 0 },
        { text: 'hi = len(nums) - 1', indent: 0 },
        { text: 'width = hi - lo + 1', indent: 0 },
      ],
      distractors: [
        { text: 'hi = len(nums)', indent: 0, misconceptionId: 'hi-half-open' },
      ],
      blanks: [
        {
          lineIndex: 1,
          token: 'len(nums) - 1',
          options: ['len(nums) - 1', 'len(nums)', '0'],
          misconceptionByOption: { 'len(nums)': 'hi-half-open' },
        },
        {
          lineIndex: 2,
          token: 'hi - lo + 1',
          options: ['hi - lo + 1', 'hi - lo'],
          misconceptionByOption: { 'hi - lo': 'width-off-by-one' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['lo = 0', 'hi = len(nums) ▢', 'width = hi - lo + 1'],
      blanks: [
        {
          lineIndex: 1,
          accept: ['- 1', '-1'],
          misconceptionByInput: { '+ 1': 'hi-half-open', '+1': 'hi-half-open' },
          placeholder: 'offset',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = 0', '⟦s2⟧ = len(nums) - 1', '⟦s3⟧ = ⟦s2⟧ - ⟦s1⟧ + 1'],
      slots: [
        { id: 's1', correctRole: 'low bound' },
        { id: 's2', correctRole: 'high bound' },
        { id: 's3', correctRole: 'window size' },
      ],
      roleBank: ['low bound', 'high bound', 'window size', 'midpoint', 'target value'],
    },
    {
      kind: 'write',
      functionName: 'last_index',
      starterCode: `def last_index(nums):
    # Return the index of the final element using inclusive bounds,
    # or -1 when nums is empty.
    `,
      testCases: [
        { input: [[10, 20, 30]], expected: 2, label: 'three items' },
        { input: [[5]], expected: 0, label: 'single' },
        { input: [[]], expected: -1, hidden: true },
        { input: [[1, 2, 3, 4, 5, 6, 7]], expected: 6, hidden: true },
        { input: [[9, 8]], expected: 1, hidden: true },
      ],
      parSeconds: 60,
      solution: `def last_index(nums):
    lo = 0
    hi = len(nums) - 1
    if hi < lo:
        return -1
    return hi`,
    },
  ],
}

export default primitive
