import type { Primitive } from '../types'

/**
 * Lower-bound binary search: shrink a half-open window [lo, hi) until lo lands
 * on the leftmost index where target could be inserted while keeping a sorted.
 * The backbone of "first index >= x", "insertion position", and count-by-bound.
 */
const primitive: Primitive = {
  id: 'bs-insertion-point',
  name: 'Insertion point (lower bound)',
  category: 'binary-search',
  snippet: `lo, hi = 0, len(a)
while lo < hi:
    mid = (lo + hi) // 2
    if a[mid] < target:
        lo = mid + 1
    else:
        hi = mid`,
  why: 'Search a half-open window [lo, hi) with hi = len(a) so an insert past the end is reachable. When a[mid] < target the answer is strictly right (lo = mid + 1); otherwise mid is still a candidate (hi = mid). lo converges to the leftmost slot where target fits.',
  moduleTags: ['binary-search', 'sort-search', 'intervals'],
  misconceptions: [
    {
      id: 'hi-init-last-index',
      label: 'hi starts at len(a) - 1',
      feedback:
        'Lower bound uses the half-open window [lo, hi) with hi = len(a). Starting hi at len(a) - 1 makes the past-the-end insertion index unreachable, so targets larger than every element land one slot short.',
    },
    {
      id: 'strict-vs-loose-compare',
      label: 'wrong comparison against target',
      feedback:
        'Use a[mid] < target so equal elements push hi left and lo stops at the FIRST match. Using a[mid] <= target skips past equal values and returns the upper bound instead.',
    },
    {
      id: 'shrink-hi-past-mid',
      label: 'discards mid from the high side',
      feedback:
        'On the else branch mid is still a possible answer, so hi = mid keeps it in the window. Writing hi = mid - 1 throws away a valid candidate and can overshoot the insertion point.',
    },
    {
      id: 'loop-condition-le',
      label: 'loop runs while lo <= hi',
      feedback:
        'With a half-open window the loop must stop when lo == hi (the window is empty). while lo <= hi runs one extra step and indexes a[hi] out of range.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 0,
      prompt: 'With a = [1, 3, 5, 7, 9] and target = 6, what value does lo hold after the loop?',
      choices: ['3', '2', '4', '5'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'strict-vs-loose-compare', 'shrink-hi-past-mid', 'hi-init-last-index'],
      verify: { setup: 'a = [1, 3, 5, 7, 9]\ntarget = 6', mode: { expr: 'lo' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'lo, hi = 0, len(a)', indent: 0 },
        { text: 'while lo < hi:', indent: 0 },
        { text: 'mid = (lo + hi) // 2', indent: 1 },
        { text: 'if a[mid] < target:', indent: 1 },
        { text: 'lo = mid + 1', indent: 2 },
        { text: 'else:', indent: 1 },
        { text: 'hi = mid', indent: 2 },
      ],
      distractors: [
        { text: 'while lo <= hi:', indent: 0, misconceptionId: 'loop-condition-le' },
        { text: 'hi = mid - 1', indent: 2, misconceptionId: 'shrink-hi-past-mid' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'lo, hi = 0, len(a)', indent: 0 },
        { text: 'while lo < hi:', indent: 0 },
        { text: 'mid = (lo + hi) // 2', indent: 1 },
        { text: 'if a[mid] < target:', indent: 1 },
        { text: 'lo = mid + 1', indent: 2 },
        { text: 'else:', indent: 1 },
        { text: 'hi = mid', indent: 2 },
      ],
      distractors: [
        { text: 'lo, hi = 0, len(a) - 1', indent: 0, misconceptionId: 'hi-init-last-index' },
      ],
      blanks: [
        {
          lineIndex: 0,
          token: 'len(a)',
          options: ['len(a)', 'len(a) - 1', '0'],
          misconceptionByOption: { 'len(a) - 1': 'hi-init-last-index' },
        },
        {
          lineIndex: 3,
          token: 'a[mid] < target',
          options: ['a[mid] < target', 'a[mid] <= target'],
          misconceptionByOption: { 'a[mid] <= target': 'strict-vs-loose-compare' },
        },
        {
          lineIndex: 6,
          token: 'mid',
          options: ['mid', 'mid - 1'],
          misconceptionByOption: { 'mid - 1': 'shrink-hi-past-mid' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'lo, hi = 0, len(a)',
        'while lo ▢ hi:',
        '    mid = (lo + hi) // 2',
        '    if a[mid] < target:',
        '        lo = mid + 1',
        '    else:',
        '        hi = mid',
      ],
      blanks: [
        {
          lineIndex: 1,
          accept: ['<'],
          misconceptionByInput: { '<=': 'loop-condition-le' },
          placeholder: 'window-empty test',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧, ⟦s2⟧ = 0, len(a)',
        'while ⟦s1⟧ < ⟦s2⟧:',
        '    ⟦s3⟧ = (⟦s1⟧ + ⟦s2⟧) // 2',
        '    if a[⟦s3⟧] < target:',
        '        ⟦s1⟧ = ⟦s3⟧ + 1',
        '    else:',
        '        ⟦s2⟧ = ⟦s3⟧',
      ],
      slots: [
        { id: 's1', correctRole: 'low bound (inclusive)' },
        { id: 's2', correctRole: 'high bound (exclusive)' },
        { id: 's3', correctRole: 'window midpoint' },
      ],
      roleBank: [
        'low bound (inclusive)',
        'high bound (exclusive)',
        'window midpoint',
        'match counter',
      ],
    },
    {
      kind: 'write',
      functionName: 'lower_bound',
      starterCode: `def lower_bound(a, target):
    # Return the leftmost index where target could be inserted to keep a sorted.
    `,
      testCases: [
        { input: [[1, 3, 5, 7, 9], 6], expected: 3, label: 'between values' },
        { input: [[1, 2, 2, 2, 5], 2], expected: 1, label: 'first of duplicates' },
        { input: [[], 4], expected: 0, hidden: true },
        { input: [[2, 4, 6], 1], expected: 0, hidden: true },
        { input: [[2, 4, 6], 9], expected: 3, hidden: true },
        { input: [[5, 5, 5], 5], expected: 0, hidden: true },
      ],
      parSeconds: 120,
      solution: `def lower_bound(a, target):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo`,
    },
  ],
}

export default primitive
