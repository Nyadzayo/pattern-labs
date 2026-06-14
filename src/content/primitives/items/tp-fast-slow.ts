import type { Primitive } from '../types'

/**
 * Fast / slow advance: two indices march over the same array, slow by one and
 * fast by two. When fast reaches the end, slow has covered exactly half the
 * distance — it sits on the middle index. The array-index twin of the
 * tortoise-and-hare linked-list trick.
 */
const primitive: Primitive = {
  id: 'tp-fast-slow',
  name: 'Fast / slow advance',
  category: 'two-pointers',
  snippet: `slow, fast = 0, 0
while fast < len(a) - 1:
    slow += 1
    fast += 2`,
  why: 'Move one index by 1 and another by 2 each step. Because fast covers twice the ground, it hits the end just as slow reaches the midpoint — so slow names the middle index without a length-divide.',
  moduleTags: ['fast-slow-pointers', 'linked-lists'],
  misconceptions: [
    {
      id: 'fast-step-one',
      label: 'fast advances by 1',
      feedback:
        'fast must move two steps per iteration (fast += 2). If it only moves by 1 it stays level with slow and never reaches the midpoint first.',
    },
    {
      id: 'loop-bound-no-minus',
      label: 'loop bound forgets the -1',
      feedback:
        'while fast < len(a) - 1 stops once fast can no longer take a full double step. Using len(a) lets fast step past the last index on the final iteration.',
    },
    {
      id: 'slow-step-two',
      label: 'slow advances by 2',
      feedback:
        'slow is the half-speed pointer: slow += 1 each step. Advancing it by 2 makes both pointers move together, so slow overshoots the middle.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 0,
      prompt: 'With a = [10, 20, 30, 40, 50], what is slow after the loop finishes?',
      choices: ['2', '4', '3', '0'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'slow-step-two', 'loop-bound-no-minus', 'fast-step-one'],
      verify: { setup: 'a = [10, 20, 30, 40, 50]', mode: { expr: 'slow' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'slow, fast = 0, 0', indent: 0 },
        { text: 'while fast < len(a) - 1:', indent: 0 },
        { text: 'slow += 1', indent: 1 },
        { text: 'fast += 2', indent: 1 },
      ],
      distractors: [
        { text: 'fast += 1', indent: 1, misconceptionId: 'fast-step-one' },
        { text: 'while fast < len(a):', indent: 0, misconceptionId: 'loop-bound-no-minus' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'slow, fast = 0, 0', indent: 0 },
        { text: 'while fast < len(a) - 1:', indent: 0 },
        { text: 'slow += 1', indent: 1 },
        { text: 'fast += 2', indent: 1 },
      ],
      distractors: [{ text: 'slow += 2', indent: 1, misconceptionId: 'slow-step-two' }],
      blanks: [
        {
          lineIndex: 1,
          token: 'len(a) - 1',
          options: ['len(a) - 1', 'len(a)', 'len(a) - 2'],
          misconceptionByOption: { 'len(a)': 'loop-bound-no-minus' },
        },
        {
          lineIndex: 3,
          token: '2',
          options: ['2', '1'],
          misconceptionByOption: { '1': 'fast-step-one' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['slow, fast = 0, 0', 'while fast < len(a) - 1:', '    slow += 1', '    fast += ▢'],
      blanks: [
        {
          lineIndex: 3,
          accept: ['2'],
          misconceptionByInput: { '1': 'fast-step-one' },
          placeholder: 'fast step',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧, ⟦s2⟧ = 0, 0',
        'while ⟦s2⟧ < len(a) - 1:',
        '    ⟦s1⟧ += 1',
        '    ⟦s2⟧ += 2',
      ],
      slots: [
        { id: 's1', correctRole: 'slow pointer' },
        { id: 's2', correctRole: 'fast pointer' },
      ],
      roleBank: ['slow pointer', 'fast pointer', 'midpoint value', 'loop counter'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Place both walkers at the start',
          acceptableKeywords: ['initialize both pointers', 'start at zero', 'two indices at the start', 'set up the walkers'],
          hint: 'Where do the half-speed and double-speed indices begin?',
          misconception: 'This positions the pointers; nothing has moved yet.',
        },
        {
          lineRange: [3, 3],
          referenceLabel: 'Keep going while the fast walker can still take a full leap',
          acceptableKeywords: ['loop while fast in range', 'until fast reaches the end', 'while a double step fits', 'fast bound check'],
          hint: 'When can the faster index no longer advance safely?',
          misconception: 'This bounds the walk; it does not move either pointer.',
        },
        {
          lineRange: [4, 5],
          referenceLabel: 'Advance one walker single and the other double',
          acceptableKeywords: ['step slow by one', 'step fast by two', 'move at different speeds', 'half and double advance'],
          hint: 'How far does each pointer move on a single iteration?',
          misconception: 'This is the speed difference, not where the midpoint is read.',
        },
        {
          lineRange: [6, 6],
          referenceLabel: 'Report the value the slow walker landed on',
          acceptableKeywords: ['return the middle value', 'read at slow', 'give back the midpoint', 'value where slow stopped'],
          hint: 'When the fast index finishes, what does the slow index point at?',
          misconception: 'This reads the midpoint after the walk; it does no advancing.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'middle_value',
      starterCode: `def middle_value(a):
    # Return the value at the middle index of a using a slow/fast advance.
    # For even lengths, return the value at the upper-middle index.
    `,
      testCases: [
        { input: [[10, 20, 30, 40, 50]], expected: 30, label: 'odd length' },
        { input: [[1, 2, 3, 4, 5, 6]], expected: 4, label: 'even length' },
        { input: [[7]], expected: 7, hidden: true },
        { input: [[8, 9]], expected: 9, hidden: true },
        { input: [[2, 4, 6]], expected: 4, hidden: true },
      ],
      parSeconds: 90,
      solution: `def middle_value(a):
    slow, fast = 0, 0
    while fast < len(a) - 1:
        slow += 1
        fast += 2
    return a[slow]`,
    },
  ],
}

export default primitive
