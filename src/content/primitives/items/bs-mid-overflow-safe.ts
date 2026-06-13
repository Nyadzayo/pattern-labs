import type { Primitive } from '../types'

/**
 * Overflow-safe midpoint: mid = lo + (hi - lo) // 2. Same value as (lo+hi)//2
 * but never overflows fixed-width ints — the habit every binary search wants.
 */
const primitive: Primitive = {
  id: 'bs-mid-overflow-safe',
  name: 'Overflow-safe midpoint',
  category: 'binary-search',
  snippet: `lo = 0
hi = len(nums) - 1
mid = lo + (hi - lo) // 2`,
  why: 'lo + (hi - lo) // 2 lands on the floor midpoint between lo and hi. Writing it as an offset from lo (rather than (lo + hi) // 2) avoids integer overflow in fixed-width languages.',
  moduleTags: ['binary-search'],
  misconceptions: [
    {
      id: 'mid-rounds-up',
      label: 'rounds the midpoint up',
      feedback:
        'Floor division rounds down: (hi - lo) // 2 with lo=0, hi=9 is 4, not 5. Adding 1 before dividing biases mid toward hi and can loop forever.',
    },
    {
      id: 'forgets-floor',
      label: 'uses true division',
      feedback:
        'mid is a list index, so it must be an int. / produces a float (4.5); use // for floor division.',
    },
    {
      id: 'mid-equals-hi',
      label: 'treats mid as an endpoint',
      feedback:
        'mid is the point halfway between lo and hi, not hi itself. Using hi as the probe never narrows the search.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With nums of length 10 (lo = 0, hi = 9), what is mid?',
      choices: ['4', '5', '4.5', '9'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'mid-rounds-up', 'forgets-floor', 'mid-equals-hi'],
      verify: { setup: 'nums = [0] * 10\nlo = 0\nhi = len(nums) - 1', mode: { expr: 'mid' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'lo = 0', indent: 0 },
        { text: 'hi = len(nums) - 1', indent: 0 },
        { text: 'mid = lo + (hi - lo) // 2', indent: 0 },
      ],
      distractors: [{ text: 'mid = (lo + hi) / 2', indent: 0, misconceptionId: 'forgets-floor' }],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'lo = 0', indent: 0 },
        { text: 'hi = len(nums) - 1', indent: 0 },
        { text: 'mid = lo + (hi - lo) // 2', indent: 0 },
      ],
      distractors: [
        { text: 'mid = (lo + hi + 1) // 2', indent: 0, misconceptionId: 'mid-rounds-up' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'lo + (hi - lo) // 2',
          options: ['lo + (hi - lo) // 2', '(lo + hi) / 2', 'hi'],
          misconceptionByOption: { '(lo + hi) / 2': 'forgets-floor', hi: 'mid-equals-hi' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['lo = 0', 'hi = len(nums) - 1', 'mid = lo + (hi - lo) ▢ 2'],
      blanks: [
        { lineIndex: 2, accept: ['//'], misconceptionByInput: { '/': 'forgets-floor' }, placeholder: 'division' },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = 0', '⟦s2⟧ = len(nums) - 1', '⟦s3⟧ = ⟦s1⟧ + (⟦s2⟧ - ⟦s1⟧) // 2'],
      slots: [
        { id: 's1', correctRole: 'low bound' },
        { id: 's2', correctRole: 'high bound' },
        { id: 's3', correctRole: 'midpoint' },
      ],
      roleBank: ['low bound', 'high bound', 'midpoint', 'target value', 'step size'],
    },
    {
      kind: 'write',
      functionName: 'binary_search',
      starterCode: `def binary_search(nums, target):
    # nums is sorted ascending. Return the index of target, or -1 if absent.
    `,
      testCases: [
        { input: [[1, 3, 5, 7, 9], 7], expected: 3, label: 'present' },
        { input: [[1, 3, 5, 7, 9], 4], expected: -1, label: 'absent' },
        { input: [[], 1], expected: -1, hidden: true },
        { input: [[2], 2], expected: 0, hidden: true },
        { input: [[1, 2, 3, 4, 5, 6], 1], expected: 0, hidden: true },
        { input: [[1, 2, 3, 4, 5, 6], 6], expected: 5, hidden: true },
      ],
      parSeconds: 120,
      solution: `def binary_search(nums, target):
    lo = 0
    hi = len(nums) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
    },
  ],
}

export default primitive
