import type { Primitive } from '../types'

/**
 * Shrink-while-invalid: after the window grows on the right, drop elements from
 * the left until the window obeys its constraint again. The repair half of every
 * variable-size sliding window.
 */
const primitive: Primitive = {
  id: 'sw-shrink-left',
  name: 'Shrink while invalid',
  category: 'sliding-window',
  snippet: `total = sum(a)
left = 0
while total > target:
    total -= a[left]
    left += 1`,
  why: 'Once the running window total exceeds its budget the window is invalid. A while loop (not an if) keeps removing the leftmost element and advancing left until the invariant holds again, because one removal may not be enough.',
  moduleTags: ['sliding-windows'],
  misconceptions: [
    {
      id: 'shrink-with-if',
      label: 'shrinks once with if instead of while',
      feedback:
        'An if removes at most one left element, so a window that is way over budget stays invalid. Use while total > target so it keeps shrinking until the window is valid again.',
    },
    {
      id: 'forgets-advance-left',
      label: 'subtracts but never moves left',
      feedback:
        'Each pass must do BOTH total -= a[left] and left += 1. Forgetting left += 1 keeps removing the same element forever — an infinite loop.',
    },
    {
      id: 'wrong-invalid-test',
      label: 'shrinks while valid instead of while invalid',
      feedback:
        'The window is invalid when total > target, so that is when you shrink. Using total < target shrinks a window that was already fine and can underflow past the start.',
    },
    {
      id: 'adds-instead-of-removes',
      label: 'adds the left element instead of removing it',
      feedback:
        'Leaving the window means subtracting the element you drop: total -= a[left]. Adding it grows total and never restores the invariant.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With a = [3, 1, 4, 1, 5] and target = 7, what is total after the loop finishes?',
      choices: ['6', '14', '10', '7'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'shrink-with-if', 'forgets-advance-left', 'wrong-invalid-test'],
      verify: { setup: 'a = [3, 1, 4, 1, 5]\ntarget = 7', mode: { expr: 'total' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'total = sum(a)', indent: 0 },
        { text: 'left = 0', indent: 0 },
        { text: 'while total > target:', indent: 0 },
        { text: 'total -= a[left]', indent: 1 },
        { text: 'left += 1', indent: 1 },
      ],
      distractors: [
        { text: 'if total > target:', indent: 0, misconceptionId: 'shrink-with-if' },
        { text: 'total += a[left]', indent: 1, misconceptionId: 'adds-instead-of-removes' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'total = sum(a)', indent: 0 },
        { text: 'left = 0', indent: 0 },
        { text: 'while total > target:', indent: 0 },
        { text: 'total -= a[left]', indent: 1 },
        { text: 'left += 1', indent: 1 },
      ],
      distractors: [
        { text: 'total += a[left]', indent: 1, misconceptionId: 'adds-instead-of-removes' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'while',
          options: ['while', 'if'],
          misconceptionByOption: { if: 'shrink-with-if' },
        },
        {
          lineIndex: 4,
          token: 'left += 1',
          options: ['left += 1', 'left -= 1'],
          misconceptionByOption: { 'left -= 1': 'forgets-advance-left' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'total = sum(a)',
        'left = 0',
        'while total ▢ target:',
        '    total -= a[left]',
        '    left += 1',
      ],
      blanks: [
        {
          lineIndex: 2,
          accept: ['>'],
          misconceptionByInput: { '<': 'wrong-invalid-test', '>=': 'wrong-invalid-test' },
          placeholder: 'comparison',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        'total = sum(a)',
        '⟦s1⟧ = 0',
        'while ⟦s2⟧ > target:',
        '    ⟦s2⟧ -= a[⟦s1⟧]',
        '    ⟦s1⟧ += 1',
      ],
      slots: [
        { id: 's1', correctRole: 'left edge index' },
        { id: 's2', correctRole: 'window total' },
      ],
      roleBank: ['left edge index', 'window total', 'budget cap', 'right edge index'],
    },
    {
      kind: 'write',
      functionName: 'shrink_count',
      starterCode: `def shrink_count(a, target):
    # total starts as sum(a). While total exceeds target, drop the leftmost
    # element and advance left. Return how many elements were dropped (left).
    `,
      testCases: [
        { input: [[3, 1, 4, 1, 5], 7], expected: 3, label: 'drops three' },
        { input: [[1, 2, 3], 100], expected: 0, label: 'already valid' },
        { input: [[10, 1, 1], 5], expected: 1, hidden: true },
        { input: [[5, 5, 5], 0], expected: 3, hidden: true },
        { input: [[2, 2, 2, 2], 3], expected: 3, hidden: true },
        { input: [[1, 1, 1, 1], 4], expected: 0, hidden: true },
      ],
      parSeconds: 90,
      solution: `def shrink_count(a, target):
    total = sum(a)
    left = 0
    while total > target:
        total -= a[left]
        left += 1
    return left`,
    },
  ],
}

export default primitive
