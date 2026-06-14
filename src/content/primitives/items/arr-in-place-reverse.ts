import type { Primitive } from '../types'

/**
 * In-place reverse: two pointers start at the ends and swap inward until they
 * meet. Reverses the list with no extra array — the workhorse behind reversing
 * subarrays, rotating blocks, and palindrome construction.
 */
const primitive: Primitive = {
  id: 'arr-in-place-reverse',
  name: 'In-place reverse',
  category: 'arrays',
  snippet: `l, r = 0, len(a) - 1
while l < r:
    a[l], a[r] = a[r], a[l]
    l += 1
    r -= 1`,
  why: 'Swapping the outermost pair and stepping both pointers inward mirrors the list onto itself. The loop stops the instant l meets r, so each element moves at most once and no second array is allocated.',
  moduleTags: ['math-geometry', 'two-pointers'],
  misconceptions: [
    {
      id: 'right-init-len',
      label: 'right starts at len(a)',
      feedback:
        'r must start at the last index, len(a) - 1. Using len(a) indexes one past the end and raises IndexError on the first swap.',
    },
    {
      id: 'stop-condition-off',
      label: 'loops past the middle',
      feedback:
        'while l < r stops the moment the pointers meet. while l <= r runs one extra step that swaps the middle element with itself and, worse, keeps going to swap pairs back to their original spots.',
    },
    {
      id: 'pointers-same-direction',
      label: 'both pointers move the same way',
      feedback:
        'The pointers must converge: l += 1 moves inward from the left and r -= 1 moves inward from the right. Incrementing both never lets them meet correctly.',
    },
    {
      id: 'no-simultaneous-swap',
      label: 'overwrites before reading',
      feedback:
        'a[l], a[r] = a[r], a[l] swaps in one step. Assigning a[l] = a[r] first clobbers the left value before it can be copied to the right.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With a = [5, 9, 2, 7], what is a after the loop finishes?',
      choices: ['[7, 2, 9, 5]', '[7, 9, 2, 5]', '[5, 9, 2, 7]', '[2, 7, 5, 9]'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'stop-condition-off', 'pointers-same-direction', 'no-simultaneous-swap'],
      verify: { setup: 'a = [5, 9, 2, 7]', mode: { expr: 'a' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'l, r = 0, len(a) - 1', indent: 0 },
        { text: 'while l < r:', indent: 0 },
        { text: 'a[l], a[r] = a[r], a[l]', indent: 1 },
        { text: 'l += 1', indent: 1 },
        { text: 'r -= 1', indent: 1 },
      ],
      distractors: [
        { text: 'while l <= r:', indent: 0, misconceptionId: 'stop-condition-off' },
        { text: 'r += 1', indent: 1, misconceptionId: 'pointers-same-direction' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'l, r = 0, len(a) - 1', indent: 0 },
        { text: 'while l < r:', indent: 0 },
        { text: 'a[l], a[r] = a[r], a[l]', indent: 1 },
        { text: 'l += 1', indent: 1 },
        { text: 'r -= 1', indent: 1 },
      ],
      distractors: [
        { text: 'a[l] = a[r]', indent: 1, misconceptionId: 'no-simultaneous-swap' },
      ],
      blanks: [
        {
          lineIndex: 0,
          token: 'len(a) - 1',
          options: ['len(a) - 1', 'len(a)', '0'],
          misconceptionByOption: { 'len(a)': 'right-init-len' },
        },
        {
          lineIndex: 4,
          token: 'r -= 1',
          options: ['r -= 1', 'r += 1'],
          misconceptionByOption: { 'r += 1': 'pointers-same-direction' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'l, r = 0, len(a) - 1',
        'while l ▢ r:',
        '    a[l], a[r] = a[r], a[l]',
        '    l += 1',
        '    r -= 1',
      ],
      blanks: [
        {
          lineIndex: 1,
          accept: ['<'],
          misconceptionByInput: { '<=': 'stop-condition-off' },
          placeholder: 'comparison',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧, ⟦s2⟧ = 0, len(a) - 1',
        'while ⟦s1⟧ < ⟦s2⟧:',
        '    a[⟦s1⟧], a[⟦s2⟧] = a[⟦s2⟧], a[⟦s1⟧]',
        '    ⟦s1⟧ += 1',
        '    ⟦s2⟧ -= 1',
      ],
      slots: [
        { id: 's1', correctRole: 'left pointer' },
        { id: 's2', correctRole: 'right pointer' },
      ],
      roleBank: ['left pointer', 'right pointer', 'swap temporary', 'element count'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Place a pointer at each boundary',
          acceptableKeywords: ['pointer at each end', 'start at the ends', 'left and right bounds', 'anchor both ends'],
          hint: 'Where do the two markers begin before any work happens?',
          misconception: 'This only fixes the starting positions — no element has moved yet.',
        },
        {
          lineRange: [3, 3],
          referenceLabel: 'Keep going while the ends have not met',
          acceptableKeywords: ['loop until they cross', 'while ends apart', 'until pointers meet', 'continue while unmet'],
          hint: 'What condition lets the work continue, and when must it stop?',
          misconception: 'This gates the work; it does not perform the swap.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Exchange the two boundary elements',
          acceptableKeywords: ['swap the ends', 'exchange both values', 'trade outer elements', 'mirror the pair'],
          hint: 'What single action mirrors the outermost pair?',
          misconception: 'This is the mutation itself, not the bound or the advance.',
        },
        {
          lineRange: [5, 6],
          referenceLabel: 'Close the gap from both sides',
          acceptableKeywords: ['move both inward', 'advance the pointers', 'step toward center', 'left up right down'],
          hint: 'After a swap, how do the markers approach each other?',
          misconception: 'The pointers only move after a swap — this is not the exchange step.',
        },
        {
          lineRange: [7, 7],
          referenceLabel: 'Hand back the now-mirrored container',
          acceptableKeywords: ['return the list', 'give back result', 'yield reversed array', 'final answer'],
          hint: 'Once the pointers have met, what gets handed back?',
          misconception: 'Reaching here means every pair has been swapped — this is the exit, not the loop body.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'reverse_in_place',
      starterCode: `def reverse_in_place(a):
    # Reverse the list a in place using two pointers, then return it.
    `,
      testCases: [
        { input: [[5, 9, 2, 7]], expected: [7, 2, 9, 5], label: 'even length' },
        { input: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1], label: 'odd length' },
        { input: [[]], expected: [], hidden: true },
        { input: [[8]], expected: [8], hidden: true },
        { input: [[3, 3, 1, 1]], expected: [1, 1, 3, 3], hidden: true },
      ],
      parSeconds: 75,
      solution: `def reverse_in_place(a):
    l, r = 0, len(a) - 1
    while l < r:
        a[l], a[r] = a[r], a[l]
        l += 1
        r -= 1
    return a`,
    },
  ],
}

export default primitive
