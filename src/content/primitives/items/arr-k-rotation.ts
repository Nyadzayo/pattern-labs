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
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Work on a private copy of the input',
          acceptableKeywords: ['copy the input', 'avoid mutating caller', 'duplicate the list', 'fresh working list'],
          hint: 'Why touch a duplicate rather than the argument directly?',
          misconception: 'This protects the caller; it does not yet rotate anything.',
        },
        {
          lineRange: [3, 3],
          referenceLabel: 'Skip work that would be empty or a no-op',
          acceptableKeywords: ['guard empty list', 'skip when nothing to do', 'avoid divide by zero', 'only when rotation matters'],
          hint: 'What two situations make any rotation pointless or unsafe?',
          misconception: 'This is the safety gate, not the rotation itself.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Fold an oversized shift back into range',
          acceptableKeywords: ['reduce modulo length', 'wrap the amount', 'normalize the shift', 'collapse big k'],
          hint: 'How is a shift bigger than the list brought down to size?',
          misconception: 'This only tames the amount — the elements have not moved yet.',
        },
        {
          lineRange: [5, 5],
          referenceLabel: 'Splice the tail in front of the head',
          acceptableKeywords: ['tail before head', 'move last part to front', 'concatenate the slices', 'rebuild rotated'],
          hint: 'Which segment leads the result, and which follows it?',
          misconception: 'This is the actual rearrangement, distinct from normalizing the amount.',
        },
        {
          lineRange: [6, 6],
          referenceLabel: 'Return the rearranged container',
          acceptableKeywords: ['return the list', 'give back result', 'yield rotated array', 'final answer'],
          hint: 'After the splice, what gets handed back?',
          misconception: 'This hands back the result whether or not the guard fired — it is the exit, not the splice.',
        },
      ],
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
