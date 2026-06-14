import type { Primitive } from '../types'

/**
 * Expand the right edge: a window grows by advancing its right boundary and
 * folding the freshly exposed element into a running aggregate. The forward
 * half of every sliding-window scan, prefix sum, and streaming accumulate.
 */
const primitive: Primitive = {
  id: 'sw-expand-right',
  name: 'Expand right edge',
  category: 'sliding-window',
  snippet: `total = 0
for right in range(len(a)):
    total += a[right]`,
  why: 'A window with a fixed left edge at 0 expands by moving right one step at a time, adding a[right] each step. The running total always reflects everything from the start up to and including the current right edge.',
  moduleTags: ['sliding-windows'],
  misconceptions: [
    {
      id: 'right-skips-last',
      label: 'right stops one short',
      feedback:
        'range(len(a)) advances right across every index 0..len-1. range(len(a) - 1) leaves the right edge short of the final element, so it never enters the window.',
    },
    {
      id: 'counts-not-adds',
      label: 'counts steps instead of folding values',
      feedback:
        'total += 1 just tallies how many times the edge moved. To accumulate the window, fold in the new value with total += a[right].',
    },
    {
      id: 'overwrites-total',
      label: 'replaces total instead of accumulating',
      feedback:
        'total = a[right] throws away everything already in the window and keeps only the last element. Use += so the right edge adds onto the running aggregate.',
    },
    {
      id: 'reset-inside-loop',
      label: 'resets the accumulator each step',
      feedback:
        'total must be initialized once, before the loop. Setting total = 0 inside the body wipes the window on every expansion.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With a = [3, 1, 4, 1, 5], what is total after the right edge has swept the whole array?',
      choices: ['14', '9', '5', '0'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'right-skips-last', 'counts-not-adds', 'reset-inside-loop'],
      verify: { setup: 'a = [3, 1, 4, 1, 5]', mode: { expr: 'total' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'total = 0', indent: 0 },
        { text: 'for right in range(len(a)):', indent: 0 },
        { text: 'total += a[right]', indent: 1 },
      ],
      distractors: [
        { text: 'for right in range(len(a) - 1):', indent: 0, misconceptionId: 'right-skips-last' },
        { text: 'total = 0', indent: 1, misconceptionId: 'reset-inside-loop' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'total = 0', indent: 0 },
        { text: 'for right in range(len(a)):', indent: 0 },
        { text: 'total += a[right]', indent: 1 },
      ],
      distractors: [
        { text: 'total += 1', indent: 1, misconceptionId: 'counts-not-adds' },
      ],
      blanks: [
        {
          lineIndex: 1,
          token: 'len(a)',
          options: ['len(a)', 'len(a) - 1', 'a'],
          misconceptionByOption: { 'len(a) - 1': 'right-skips-last' },
        },
        {
          lineIndex: 2,
          token: '+=',
          options: ['+=', '='],
          misconceptionByOption: { '=': 'overwrites-total' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['total = 0', 'for right in range(len(a)):', '    total ▢ a[right]'],
      blanks: [
        {
          lineIndex: 2,
          accept: ['+='],
          misconceptionByInput: { '=': 'overwrites-total' },
          placeholder: 'fold operator',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = 0', 'for ⟦s2⟧ in range(len(a)):', '    ⟦s1⟧ += a[⟦s2⟧]'],
      slots: [
        { id: 's1', correctRole: 'running aggregate' },
        { id: 's2', correctRole: 'right edge index' },
      ],
      roleBank: ['running aggregate', 'right edge index', 'left edge index', 'window length'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Start the running aggregate at its empty value',
          acceptableKeywords: ['initialize the accumulator', 'start total at zero', 'empty running sum', 'seed the aggregate'],
          hint: 'Before anything is folded in, what should the accumulator hold?',
          misconception: 'This sets the starting point; it does not yet visit any element.',
        },
        {
          lineRange: [3, 4],
          referenceLabel: 'Sweep the right edge and fold each new element in',
          acceptableKeywords: ['advance the right edge', 'add each element', 'fold in new value', 'accumulate while scanning'],
          hint: 'As the edge moves forward, what happens to each freshly exposed value?',
          misconception: 'This grows the window and accumulates; it is not the final answer being returned.',
        },
        {
          lineRange: [5, 5],
          referenceLabel: 'Hand back the fully accumulated total',
          acceptableKeywords: ['return the total', 'give back the sum', 'report the aggregate', 'final accumulated value'],
          hint: 'Once the edge has covered everything, what gets reported?',
          misconception: 'This reports the result after the sweep; it does no accumulating itself.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'window_sum',
      starterCode: `def window_sum(a):
    # Expand the right edge across a and return the sum of every element.
    `,
      testCases: [
        { input: [[3, 1, 4, 1, 5]], expected: 14, label: 'mixed' },
        { input: [[]], expected: 0, label: 'empty' },
        { input: [[8]], expected: 8, hidden: true },
        { input: [[-2, 2, -2, 2]], expected: 0, hidden: true },
        { input: [[1, 1, 1, 1, 1, 1]], expected: 6, hidden: true },
      ],
      parSeconds: 60,
      solution: `def window_sum(a):
    total = 0
    for right in range(len(a)):
        total += a[right]
    return total`,
    },
  ],
}

export default primitive
