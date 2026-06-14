import type { Primitive } from '../types'

/**
 * Reverse index scan: walk the indices from the last position down to 0 and
 * append each element to a fresh list. The idiom under reversing, suffix
 * accumulation, and any pass that must run right to left.
 */
const primitive: Primitive = {
  id: 'loop-reverse-index',
  name: 'Reverse index scan',
  category: 'loops',
  snippet: `out = []
for i in range(len(a) - 1, -1, -1):
    out.append(a[i])`,
  why: 'range(len(a) - 1, -1, -1) counts down from the last index to 0 inclusive, so the loop visits every position right to left. Appending a[i] as you go reverses the array into a new list.',
  moduleTags: ['dynamic-programming', 'math-geometry', 'stacks'],
  misconceptions: [
    {
      id: 'stop-excludes-zero',
      label: 'stop value skips index 0',
      feedback:
        'range(start, -1, -1) goes down to and includes 0, because the stop bound is exclusive. range(start, 0, -1) stops at 1 and never touches index 0.',
    },
    {
      id: 'missing-negative-step',
      label: 'forgets the negative step',
      feedback:
        'Without step -1, range(len(a) - 1, -1) is empty (you cannot count up from a high start to a low stop). The third argument -1 makes it count down.',
    },
    {
      id: 'start-out-of-range',
      label: 'start index is out of range',
      feedback:
        'The first index to read is len(a) - 1, the last valid position. Starting at len(a) raises IndexError on a[i].',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With a = [3, 8, 5, 1], what is out after the loop finishes?',
      choices: ['[1, 5, 8, 3]', '[5, 8, 3]', '[1, 5, 8]', '[3, 8, 5, 1]'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'start-out-of-range', 'stop-excludes-zero', 'missing-negative-step'],
      verify: { setup: 'a = [3, 8, 5, 1]', mode: { expr: 'out' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'out = []', indent: 0 },
        { text: 'for i in range(len(a) - 1, -1, -1):', indent: 0 },
        { text: 'out.append(a[i])', indent: 1 },
      ],
      distractors: [
        { text: 'for i in range(len(a) - 1, 0, -1):', indent: 0, misconceptionId: 'stop-excludes-zero' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'out = []', indent: 0 },
        { text: 'for i in range(len(a) - 1, -1, -1):', indent: 0 },
        { text: 'out.append(a[i])', indent: 1 },
      ],
      distractors: [
        { text: 'for i in range(len(a), -1, -1):', indent: 0, misconceptionId: 'start-out-of-range' },
      ],
      blanks: [
        {
          lineIndex: 1,
          token: '-1, -1',
          options: ['-1, -1', '0, -1', '-1'],
          misconceptionByOption: { '0, -1': 'stop-excludes-zero', '-1': 'missing-negative-step' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['out = []', 'for i in range(len(a) - 1, ▢):', '    out.append(a[i])'],
      blanks: [
        {
          lineIndex: 1,
          accept: ['-1, -1'],
          misconceptionByInput: { '0, -1': 'stop-excludes-zero', '-1': 'missing-negative-step' },
          placeholder: 'stop, step',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = []', 'for ⟦s2⟧ in range(len(a) - 1, -1, -1):', '    ⟦s1⟧.append(a[⟦s2⟧])'],
      slots: [
        { id: 's1', correctRole: 'result accumulator' },
        { id: 's2', correctRole: 'descending index' },
      ],
      roleBank: ['result accumulator', 'descending index', 'input collection', 'loop bound'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Start an empty collector for results',
          acceptableKeywords: ['initialize output', 'empty result list', 'start accumulator', 'fresh collection'],
          hint: 'Where will the reversed elements be gathered?',
          misconception: 'This only prepares the container; nothing has been placed in it yet.',
        },
        {
          lineRange: [3, 3],
          referenceLabel: 'Walk the positions from last down to first',
          acceptableKeywords: ['count down', 'loop right to left', 'descend through indices', 'iterate backward'],
          hint: 'How does the loop reach the last index first and index zero last?',
          misconception: 'This sets the descending traversal; it does not itself store any element.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Append each visited element in order',
          acceptableKeywords: ['append the element', 'add to result', 'collect this item', 'push onto output'],
          hint: 'What happens to each element as the loop visits it?',
          misconception: 'This builds the reversed list; it reads from the source, not the result.',
        },
        {
          lineRange: [5, 5],
          referenceLabel: 'Return the reversed collection',
          acceptableKeywords: ['return output', 'give back the list', 'output the result', 'return reversed'],
          hint: 'Once every position is visited, what is produced?',
          misconception: 'Reaching here means the full reverse is built; this just hands it back.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'reverse_list',
      starterCode: `def reverse_list(a):
    # Return a new list with the elements of a in reverse order.
    `,
      testCases: [
        { input: [[3, 8, 5, 1]], expected: [1, 5, 8, 3], label: 'four elements' },
        { input: [[]], expected: [], label: 'empty' },
        { input: [[9]], expected: [9], hidden: true },
        { input: [[1, 2]], expected: [2, 1], hidden: true },
        { input: [[4, 4, 7, 7]], expected: [7, 7, 4, 4], hidden: true },
      ],
      parSeconds: 75,
      solution: `def reverse_list(a):
    out = []
    for i in range(len(a) - 1, -1, -1):
        out.append(a[i])
    return out`,
    },
  ],
}

export default primitive
