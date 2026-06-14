import type { Primitive } from '../types'

/**
 * Window length math: an inclusive window spanning indices left..right holds
 * right - left + 1 elements. The +1 is the whole game — both endpoints count.
 * The arithmetic under "longest subarray", "size of current window", and friends.
 */
const primitive: Primitive = {
  id: 'sw-length-math',
  name: 'Window length math',
  category: 'sliding-window',
  snippet: `best = 0
for right in range(len(starts)):
    left = starts[right]
    length = right - left + 1
    best = max(best, length)`,
  why: 'A window covering indices left..right inclusive has right - left + 1 elements. Forget the +1 and every length is one short, which silently breaks "longest window" answers by exactly one.',
  moduleTags: ['sliding-windows', 'prefix-sums'],
  misconceptions: [
    {
      id: 'drops-plus-one',
      label: 'forgets the +1',
      feedback:
        'right - left counts the gaps between the two indices, not the elements. An inclusive window needs right - left + 1 so both endpoints are counted.',
    },
    {
      id: 'extra-plus-one',
      label: 'adds one too many',
      feedback:
        'right - left + 2 over-counts. The single +1 already accounts for both endpoints being inclusive; a second +1 reaches past the window.',
    },
    {
      id: 'tracks-min-not-max',
      label: 'shrinks instead of growing',
      feedback:
        'best should track the LONGEST window seen, so use max(best, length). min() would keep the smallest window instead.',
    },
    {
      id: 'best-init-too-high',
      label: 'best starts too high',
      feedback:
        'Seed best = 0 (no window seen yet) and let max() raise it. Starting best at a large number leaves max() unable to ever lower it.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 3,
      prompt: 'With starts = [0, 0, 0, 2, 2], what is best after the loop?',
      choices: ['3', '5', '2', '4'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'drops-plus-one', 'tracks-min-not-max', 'extra-plus-one'],
      verify: { setup: 'starts = [0, 0, 0, 2, 2]', mode: { expr: 'best' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'best = 0', indent: 0 },
        { text: 'for right in range(len(starts)):', indent: 0 },
        { text: 'left = starts[right]', indent: 1 },
        { text: 'length = right - left + 1', indent: 1 },
        { text: 'best = max(best, length)', indent: 1 },
      ],
      distractors: [
        { text: 'best = 999', indent: 0, misconceptionId: 'best-init-too-high' },
        { text: 'length = right - left', indent: 1, misconceptionId: 'drops-plus-one' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'best = 0', indent: 0 },
        { text: 'for right in range(len(starts)):', indent: 0 },
        { text: 'left = starts[right]', indent: 1 },
        { text: 'length = right - left + 1', indent: 1 },
        { text: 'best = max(best, length)', indent: 1 },
      ],
      distractors: [
        { text: 'best = min(best, length)', indent: 1, misconceptionId: 'tracks-min-not-max' },
      ],
      blanks: [
        {
          lineIndex: 3,
          token: 'right - left + 1',
          options: ['right - left + 1', 'right - left', 'right - left + 2'],
          misconceptionByOption: {
            'right - left': 'drops-plus-one',
            'right - left + 2': 'extra-plus-one',
          },
        },
        {
          lineIndex: 4,
          token: 'max',
          options: ['max', 'min'],
          misconceptionByOption: { min: 'tracks-min-not-max' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'best = 0',
        'for right in range(len(starts)):',
        '    left = starts[right]',
        '    length = right - left ▢',
        '    best = max(best, length)',
      ],
      blanks: [
        {
          lineIndex: 3,
          accept: ['+ 1', '+1'],
          misconceptionByInput: { '+ 2': 'extra-plus-one', '+2': 'extra-plus-one' },
          placeholder: 'inclusive offset',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = 0',
        'for ⟦s2⟧ in range(len(starts)):',
        '    ⟦s3⟧ = starts[⟦s2⟧]',
        '    length = ⟦s2⟧ - ⟦s3⟧ + 1',
        '    ⟦s1⟧ = max(⟦s1⟧, length)',
      ],
      slots: [
        { id: 's1', correctRole: 'longest length seen' },
        { id: 's2', correctRole: 'window right end' },
        { id: 's3', correctRole: 'window left end' },
      ],
      roleBank: ['longest length seen', 'window right end', 'window left end', 'element value'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Seed the best length at nothing-seen-yet',
          acceptableKeywords: ['initialize the best', 'start best at zero', 'no window yet', 'seed the maximum'],
          hint: 'Before any window is measured, what is the largest length known?',
          misconception: 'This sets the floor for the answer; it has not measured any window.',
        },
        {
          lineRange: [3, 4],
          referenceLabel: 'Scan each right end and recover its matching left end',
          acceptableKeywords: ['advance the right end', 'look up the left end', 'iterate the right edge', 'find window start'],
          hint: 'For each ending position, where does its window begin?',
          misconception: 'This locates the two endpoints; the count itself comes next.',
        },
        {
          lineRange: [5, 5],
          referenceLabel: 'Count the elements inside the inclusive span',
          acceptableKeywords: ['compute the length', 'right minus left plus one', 'inclusive element count', 'size of the window'],
          hint: 'Both endpoints belong to the window — how many elements is that?',
          misconception: 'This is the span size, not yet compared against the best.',
        },
        {
          lineRange: [6, 6],
          referenceLabel: 'Keep the longest span observed so far',
          acceptableKeywords: ['update the best', 'take the maximum', 'keep the longest', 'raise the running max'],
          hint: 'After measuring this window, when should the record change?',
          misconception: 'This compares against the running best; it does not compute the span.',
        },
        {
          lineRange: [7, 7],
          referenceLabel: 'Return the longest span found',
          acceptableKeywords: ['return the best', 'report the longest', 'give back the maximum', 'final answer'],
          hint: 'Once every window is measured, what is reported?',
          misconception: 'This reports the result after the scan; it tracks nothing itself.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'longest_window',
      starterCode: `def longest_window(starts):
    # starts[right] is the left index of the window ending at right.
    # Return the largest inclusive window length right - left + 1.
    `,
      testCases: [
        { input: [[0, 0, 0, 2, 2]], expected: 3, label: 'grows then resets' },
        { input: [[0, 1, 2, 3]], expected: 1, label: 'always single element' },
        { input: [[0]], expected: 1, hidden: true },
        { input: [[0, 0, 0, 0, 0]], expected: 5, hidden: true },
        { input: [[0, 0, 2, 2, 4]], expected: 2, hidden: true },
      ],
      parSeconds: 75,
      solution: `def longest_window(starts):
    best = 0
    for right in range(len(starts)):
        left = starts[right]
        length = right - left + 1
        best = max(best, length)
    return best`,
    },
  ],
}

export default primitive
