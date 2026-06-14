import type { Primitive } from '../types'

/**
 * Allocate a 2D DP table with the right dimensions and independent rows. The
 * list comprehension builds a fresh inner list per row; the [[0]*c]*r shortcut
 * aliases one row r times, so writing dp[1][0] silently mutates every row.
 */
const primitive: Primitive = {
  id: 'dp-table-init',
  name: 'Table dimensions + init',
  category: 'dp',
  snippet: `dp = [[0] * (n + 1) for _ in range(m + 1)]`,
  why: 'A bottom-up DP over two sequences of length m and n needs an (m+1) x (n+1) grid so index 0 holds the empty-prefix base case. Build it with a comprehension — [[0]*(n+1)]*(m+1) makes every row the SAME list, so one update bleeds across all rows.',
  moduleTags: ['dynamic-programming'],
  misconceptions: [
    {
      id: 'aliased-rows',
      label: 'rows are aliased, not independent',
      feedback:
        '[[0] * (n + 1)] * (m + 1) repeats one shared row m+1 times. Writing dp[1][0] then changes every row. The list comprehension makes a new row each iteration.',
    },
    {
      id: 'wrong-row-count',
      label: 'row count off by one',
      feedback:
        'range(m + 1) gives m+1 rows so index m is valid and row 0 is the empty-prefix base case. range(m) leaves no room for the base row.',
    },
    {
      id: 'dimensions-swapped',
      label: 'inner and outer sizes swapped',
      feedback:
        'The inner list length is the column count (n + 1); the comprehension count is the row count (m + 1). Swapping them transposes the table.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 0,
      prompt: 'With m = 3 and n = 4, what is len(dp[0]) (the number of columns)?',
      choices: ['5', '4', '3', '6'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'wrong-row-count', 'dimensions-swapped', 'aliased-rows'],
      verify: { setup: 'm = 3\nn = 4', mode: { expr: 'len(dp[0])' } },
    },
    {
      kind: 'order',
      lines: [{ text: 'dp = [[0] * (n + 1) for _ in range(m + 1)]', indent: 0 }],
      distractors: [
        {
          text: 'dp = [[0] * (n + 1)] * (m + 1)',
          indent: 0,
          misconceptionId: 'aliased-rows',
        },
      ],
    },
    {
      kind: 'fade',
      lines: [{ text: 'dp = [[0] * (n + 1) for _ in range(m + 1)]', indent: 0 }],
      distractors: [
        {
          text: 'dp = [[0] * (m + 1) for _ in range(n + 1)]',
          indent: 0,
          misconceptionId: 'dimensions-swapped',
        },
      ],
      blanks: [
        {
          lineIndex: 0,
          token: 'for _ in range(m + 1)',
          options: ['for _ in range(m + 1)', 'for _ in range(m)', '* (m + 1)'],
          misconceptionByOption: {
            'for _ in range(m)': 'wrong-row-count',
            '* (m + 1)': 'aliased-rows',
          },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['dp = [[0] * (n + 1) ▢ range(m + 1)]'],
      blanks: [
        {
          lineIndex: 0,
          accept: ['for _ in'],
          misconceptionByInput: { '*': 'aliased-rows', 'for i in': 'aliased-rows' },
          placeholder: 'build each row',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['dp = [[0] * (⟦s1⟧ + 1) for _ in range(⟦s2⟧ + 1)]'],
      slots: [
        { id: 's1', correctRole: 'column count source' },
        { id: 's2', correctRole: 'row count source' },
      ],
      roleBank: ['column count source', 'row count source', 'fill value', 'loop accumulator'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 1],
          referenceLabel: 'Take in the two prefix lengths',
          acceptableKeywords: ['accept the dimensions', 'take the two sizes', 'receive the lengths', 'function inputs'],
          hint: 'What two numbers decide the shape of the grid?',
          misconception: 'This only names the inputs; the grid does not exist yet.',
        },
        {
          lineRange: [2, 2],
          referenceLabel: 'Build a grid with independent rows of zeros',
          acceptableKeywords: ['make a fresh row each time', 'separate rows', 'comprehension per row', 'allocate the grid'],
          hint: 'How do you guarantee each row is its own list, not a shared one?',
          misconception: 'This is the safe allocation step; reusing one row here is the bug it avoids.',
        },
        {
          lineRange: [3, 3],
          referenceLabel: 'Hand back the assembled grid',
          acceptableKeywords: ['return the table', 'give back the grid', 'return the result', 'output the table'],
          hint: 'After construction, what does the caller need handed back?',
          misconception: 'This only returns what was built; it does not allocate anything.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'make_dp_table',
      starterCode: `def make_dp_table(m, n):
    # Return an (m + 1) x (n + 1) table of zeros with independent rows.
    `,
      testCases: [
        { input: [3, 4], expected: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], label: '3 x 4' },
        { input: [1, 1], expected: [[0, 0], [0, 0]], label: '1 x 1' },
        { input: [0, 0], expected: [[0]], hidden: true },
        { input: [2, 0], expected: [[0], [0], [0]], hidden: true },
        { input: [0, 3], expected: [[0, 0, 0, 0]], hidden: true },
      ],
      parSeconds: 75,
      solution: `def make_dp_table(m, n):
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    return dp`,
    },
  ],
}

export default primitive
