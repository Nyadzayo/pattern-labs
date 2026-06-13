import type { Primitive } from '../types'

/**
 * Converging binary search on a half-open range [lo, hi). The loop runs while
 * lo < hi and shrinks toward a single survivor; the reject side uses hi = mid
 * (never mid - 1) so the candidate at mid is kept in the live range. When the
 * loop ends, lo == hi is the leftmost index whose value is >= target.
 */
const primitive: Primitive = {
  id: 'bs-boundary-condition',
  name: 'lo<hi vs lo<=hi boundary',
  category: 'binary-search',
  snippet: `lo = 0
hi = len(nums)
while lo < hi:
    mid = (lo + hi) // 2
    if nums[mid] < target:
        lo = mid + 1
    else:
        hi = mid`,
  why: 'On a half-open range [lo, hi) the loop runs while lo < hi and stops when they collide on the single survivor. Pair that with hi = mid (not mid - 1) so mid stays in the live range — using <= or mid - 1 either loops forever or skips the answer.',
  moduleTags: ['binary-search', 'sort-search'],
  misconceptions: [
    {
      id: 'inclusive-bound',
      label: 'uses lo <= hi on a half-open range',
      feedback:
        'With hi = len(nums) the range is half-open, so the guard is lo < hi. Writing lo <= hi pairs an exclusive upper bound with an inclusive test — mid can reach len(nums) and index out of range or never converge.',
    },
    {
      id: 'rejects-mid-minus-one',
      label: 'shrinks with hi = mid - 1',
      feedback:
        'On the keep-or-reject side use hi = mid, not hi = mid - 1. The half-open form already excludes hi, so mid - 1 throws away the very candidate that may be the answer and lands one index too low.',
    },
    {
      id: 'returns-value-not-index',
      label: 'reports the value instead of the index',
      feedback:
        'The loop converges lo to an index into nums, not to the element stored there. The survivor you want is lo (the position), not nums[lo].',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With nums = [1, 3, 5, 7, 9, 11] and target = 7, what is lo after the loop finishes?',
      choices: ['3', '2', '4', '7'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'rejects-mid-minus-one', 'inclusive-bound', 'returns-value-not-index'],
      verify: { setup: 'nums = [1, 3, 5, 7, 9, 11]\ntarget = 7', mode: { expr: 'lo' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'lo = 0', indent: 0 },
        { text: 'hi = len(nums)', indent: 0 },
        { text: 'while lo < hi:', indent: 0 },
        { text: 'mid = (lo + hi) // 2', indent: 1 },
        { text: 'if nums[mid] < target:', indent: 1 },
        { text: 'lo = mid + 1', indent: 2 },
        { text: 'else:', indent: 1 },
        { text: 'hi = mid', indent: 2 },
      ],
      distractors: [
        { text: 'while lo <= hi:', indent: 0, misconceptionId: 'inclusive-bound' },
        { text: 'hi = mid - 1', indent: 2, misconceptionId: 'rejects-mid-minus-one' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'lo = 0', indent: 0 },
        { text: 'hi = len(nums)', indent: 0 },
        { text: 'while lo < hi:', indent: 0 },
        { text: 'mid = (lo + hi) // 2', indent: 1 },
        { text: 'if nums[mid] < target:', indent: 1 },
        { text: 'lo = mid + 1', indent: 2 },
        { text: 'else:', indent: 1 },
        { text: 'hi = mid', indent: 2 },
      ],
      distractors: [
        { text: 'lo = mid', indent: 2, misconceptionId: 'rejects-mid-minus-one' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'lo < hi',
          options: ['lo < hi', 'lo <= hi'],
          misconceptionByOption: { 'lo <= hi': 'inclusive-bound' },
        },
        {
          lineIndex: 7,
          token: 'mid',
          options: ['mid', 'mid - 1'],
          misconceptionByOption: { 'mid - 1': 'rejects-mid-minus-one' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'lo = 0',
        'hi = len(nums)',
        'while lo ▢ hi:',
        '    mid = (lo + hi) // 2',
        '    if nums[mid] < target:',
        '        lo = mid + 1',
        '    else:',
        '        hi = ▢',
      ],
      blanks: [
        {
          lineIndex: 2,
          accept: ['<'],
          misconceptionByInput: { '<=': 'inclusive-bound' },
          placeholder: 'comparison',
        },
        {
          lineIndex: 7,
          accept: ['mid'],
          misconceptionByInput: { 'mid - 1': 'rejects-mid-minus-one', 'mid-1': 'rejects-mid-minus-one' },
          placeholder: 'reject side',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = 0',
        '⟦s2⟧ = len(nums)',
        'while ⟦s1⟧ < ⟦s2⟧:',
        '    ⟦s3⟧ = (⟦s1⟧ + ⟦s2⟧) // 2',
        '    if nums[⟦s3⟧] < target:',
        '        ⟦s1⟧ = ⟦s3⟧ + 1',
        '    else:',
        '        ⟦s2⟧ = ⟦s3⟧',
      ],
      slots: [
        { id: 's1', correctRole: 'inclusive lower bound' },
        { id: 's2', correctRole: 'exclusive upper bound' },
        { id: 's3', correctRole: 'midpoint probe' },
      ],
      roleBank: ['inclusive lower bound', 'exclusive upper bound', 'midpoint probe', 'match counter'],
    },
    {
      kind: 'write',
      functionName: 'lower_bound',
      starterCode: `def lower_bound(nums, target):
    # nums is sorted ascending. Return the leftmost index i where nums[i] >= target.
    # If target is larger than every element, return len(nums).
    `,
      testCases: [
        { input: [[1, 3, 5, 7, 9, 11], 7], expected: 3, label: 'exact match' },
        { input: [[1, 3, 5, 7, 9, 11], 6], expected: 3, label: 'between elements' },
        { input: [[2, 4, 6], 1], expected: 0, hidden: true },
        { input: [[2, 4, 6], 9], expected: 3, hidden: true },
        { input: [[], 5], expected: 0, hidden: true },
        { input: [[5, 5, 5, 5], 5], expected: 0, hidden: true },
      ],
      parSeconds: 120,
      solution: `def lower_bound(nums, target):
    lo = 0
    hi = len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo`,
    },
  ],
}

export default primitive
