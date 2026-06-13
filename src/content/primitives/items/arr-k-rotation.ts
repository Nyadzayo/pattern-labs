import type { Primitive } from '../types'

/**
 * In-place right rotation by k: normalize k with modulo, then splice the last k
 * elements in front of the first n-k. The slice-and-concat trick that turns a
 * rotation into one assignment, guarded so empty lists and k==0 stay safe.
 */
const primitive: Primitive = {
  id: 'arr-k-rotation',
  name: 'k-rotation',
  category: 'arrays',
  snippet: `if a and k % len(a):
    k %= len(a)
    a[:] = a[-k:] + a[:-k]`,
  why: 'k %= len(a) collapses any k (even k larger than the list) into a real offset, and a[-k:] + a[:-k] splices the tail in front of the head. The if a guard keeps the modulo from dividing by zero on an empty list, and skipping when k % len(a) == 0 leaves a no-op rotation untouched.',
  moduleTags: ['math-geometry'],
  misconceptions: [
    {
      id: 'forgets-modulo',
      label: 'never reduces k mod n',
      feedback:
        'Without k %= len(a), a k larger than the list slices past both ends — a[-7:] on a length-5 list is the whole list and a[:-7] is empty, so the list comes back unrotated. Reduce k first.',
    },
    {
      id: 'rotates-left',
      label: 'rotates the wrong way',
      feedback:
        'a[k:] + a[:k] moves the front k elements to the back — that is a LEFT rotation. A right rotation lifts the LAST k elements to the front: a[-k:] + a[:-k].',
    },
    {
      id: 'wrong-second-slice',
      label: 'wrong split point for the head',
      feedback:
        'The head is everything except the last k items, which is a[:-k], not a[:k]. Using a[:k] grabs the first k and drops elements, so the result loses length.',
    },
    {
      id: 'forgets-empty-guard',
      label: 'no empty-list guard',
      feedback:
        'Dropping the a and part means k %= len(a) runs on an empty list, and len([]) == 0 raises ZeroDivisionError. The a and short-circuits before the modulo when the list is empty.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With a = [10, 20, 30, 40, 50] and k = 7, what is a after this runs?',
      choices: [
        '[40, 50, 10, 20, 30]',
        '[30, 40, 50, 10, 20]',
        '[10, 20, 30, 40, 50]',
        '[40, 50, 10, 20]',
      ],
      correctIndex: 0,
      distractorMisconceptions: [null, 'rotates-left', 'forgets-modulo', 'wrong-second-slice'],
      verify: { setup: 'a = [10, 20, 30, 40, 50]\nk = 7', mode: { expr: 'a' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'if a and k % len(a):', indent: 0 },
        { text: 'k %= len(a)', indent: 1 },
        { text: 'a[:] = a[-k:] + a[:-k]', indent: 1 },
      ],
      distractors: [
        { text: 'if k % len(a):', indent: 0, misconceptionId: 'forgets-empty-guard' },
        { text: 'a[:] = a[k:] + a[:k]', indent: 1, misconceptionId: 'rotates-left' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'if a and k % len(a):', indent: 0 },
        { text: 'k %= len(a)', indent: 1 },
        { text: 'a[:] = a[-k:] + a[:-k]', indent: 1 },
      ],
      distractors: [{ text: 'a[:] = a[k:] + a[:k]', indent: 1, misconceptionId: 'rotates-left' }],
      blanks: [
        {
          lineIndex: 0,
          token: 'a and k % len(a)',
          options: ['a and k % len(a)', 'k % len(a)', 'a and k'],
          misconceptionByOption: { 'k % len(a)': 'forgets-empty-guard' },
        },
        {
          lineIndex: 2,
          token: 'a[-k:] + a[:-k]',
          options: ['a[-k:] + a[:-k]', 'a[k:] + a[:k]', 'a[-k:] + a[:k]'],
          misconceptionByOption: {
            'a[k:] + a[:k]': 'rotates-left',
            'a[-k:] + a[:k]': 'wrong-second-slice',
          },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['if a and k % len(a):', '    k %= len(a)', '    a[:] = a[-k:] + ▢'],
      blanks: [
        {
          lineIndex: 2,
          accept: ['a[:-k]'],
          misconceptionByInput: {
            'a[:k]': 'wrong-second-slice',
            'a[k:]': 'rotates-left',
          },
          placeholder: 'head slice',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['if ⟦s1⟧ and ⟦s2⟧ % len(⟦s1⟧):', '    ⟦s2⟧ %= len(⟦s1⟧)', '    ⟦s1⟧[:] = ⟦s1⟧[-⟦s2⟧:] + ⟦s1⟧[:-⟦s2⟧]'],
      slots: [
        { id: 's1', correctRole: 'list being rotated' },
        { id: 's2', correctRole: 'rotation amount' },
      ],
      roleBank: ['list being rotated', 'rotation amount', 'loop index', 'accumulator'],
    },
    {
      kind: 'write',
      functionName: 'rotate_right',
      starterCode: `def rotate_right(nums, k):
    # Return a new list equal to nums rotated right by k positions.
    # k may be 0 or larger than len(nums); nums may be empty.
    `,
      testCases: [
        { input: [[1, 2, 3, 4, 5], 2], expected: [4, 5, 1, 2, 3], label: 'basic right by 2' },
        { input: [[1, 2, 3, 4, 5], 7], expected: [4, 5, 1, 2, 3], label: 'k larger than n' },
        { input: [[], 3], expected: [], hidden: true },
        { input: [[9], 100], expected: [9], hidden: true },
        { input: [[1, 2, 3, 4], 4], expected: [1, 2, 3, 4], hidden: true },
        { input: [[1, 2, 3], 0], expected: [1, 2, 3], hidden: true },
      ],
      parSeconds: 90,
      solution: `def rotate_right(nums, k):
    a = list(nums)
    if a and k % len(a):
        k %= len(a)
        a[:] = a[-k:] + a[:-k]
    return a`,
    },
  ],
}

export default primitive
