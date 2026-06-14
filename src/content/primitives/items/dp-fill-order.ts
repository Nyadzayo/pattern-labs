import type { Primitive } from '../types'

/**
 * Fill order (dependency direction): build the DP table so each cell's inputs
 * are already computed before you read them. Here dp[i] leans on dp[i-1], so the
 * index sweeps upward — the loop direction is dictated by the dependencies.
 */
const primitive: Primitive = {
  id: 'dp-fill-order',
  name: 'Fill order (dependency direction)',
  category: 'dp',
  snippet: `dp = [0] * (n + 1)
dp[0] = 0
for i in range(1, n + 1):
    dp[i] = dp[i - 1] + a[i - 1]`,
  why: 'A DP recurrence only works if every cell it reads is already filled. dp[i] depends on dp[i-1], so iterate i upward from 1 to n; reverse the loop and you would read cells that are still 0.',
  moduleTags: ['dynamic-programming'],
  misconceptions: [
    {
      id: 'wrong-direction',
      label: 'iterates the wrong way',
      feedback:
        'dp[i] reads dp[i-1], which must already be filled. Sweeping i downward reaches dp[i] before dp[i-1] exists, so the cell reads a stale 0.',
    },
    {
      id: 'range-misses-last',
      label: 'stops one cell short',
      feedback:
        'range(1, n + 1) covers indices 1..n — every real cell. range(1, n) skips dp[n], leaving the final answer at its initial 0.',
    },
    {
      id: 'index-off-by-one',
      label: 'misaligns dp and the input',
      feedback:
        'dp is 1-indexed with an extra slot, so the value feeding dp[i] is a[i-1], not a[i]. Using a[i] either skips a[0] or runs off the end.',
    },
    {
      id: 'size-too-small',
      label: 'allocates too few cells',
      feedback:
        'You touch dp[0] through dp[n], which is n + 1 cells. Sizing dp as [0] * n leaves no room for dp[n].',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 3,
      prompt: 'With a = [3, 1, 4, 1, 5] and n = 5, what is dp[n] after the loop?',
      choices: ['14', '0', '9', '13'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'wrong-direction', 'range-misses-last', 'index-off-by-one'],
      verify: { setup: 'a = [3, 1, 4, 1, 5]\nn = 5', mode: { expr: 'dp[n]' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'dp = [0] * (n + 1)', indent: 0 },
        { text: 'dp[0] = 0', indent: 0 },
        { text: 'for i in range(1, n + 1):', indent: 0 },
        { text: 'dp[i] = dp[i - 1] + a[i - 1]', indent: 1 },
      ],
      distractors: [
        { text: 'for i in range(n, 0, -1):', indent: 0, misconceptionId: 'wrong-direction' },
        { text: 'dp = [0] * n', indent: 0, misconceptionId: 'size-too-small' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'dp = [0] * (n + 1)', indent: 0 },
        { text: 'dp[0] = 0', indent: 0 },
        { text: 'for i in range(1, n + 1):', indent: 0 },
        { text: 'dp[i] = dp[i - 1] + a[i - 1]', indent: 1 },
      ],
      distractors: [
        { text: 'for i in range(1, n):', indent: 0, misconceptionId: 'range-misses-last' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'range(1, n + 1)',
          options: ['range(1, n + 1)', 'range(1, n)', 'range(n, 0, -1)'],
          misconceptionByOption: {
            'range(1, n)': 'range-misses-last',
            'range(n, 0, -1)': 'wrong-direction',
          },
        },
        {
          lineIndex: 3,
          token: 'dp[i - 1]',
          options: ['dp[i - 1]', 'dp[i + 1]', 'dp[i]'],
          misconceptionByOption: { 'dp[i + 1]': 'wrong-direction' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'dp = [0] * (n + 1)',
        'dp[0] = 0',
        'for i in range(1, ▢):',
        '    dp[i] = dp[i - 1] + a[▢]',
      ],
      blanks: [
        {
          lineIndex: 2,
          accept: ['n + 1', 'n+1'],
          misconceptionByInput: { n: 'range-misses-last' },
          placeholder: 'stop index',
        },
        {
          lineIndex: 3,
          accept: ['i - 1', 'i-1'],
          misconceptionByInput: { i: 'index-off-by-one' },
          placeholder: 'source index',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = [0] * (n + 1)',
        '⟦s1⟧[0] = 0',
        'for ⟦s2⟧ in range(1, n + 1):',
        '    ⟦s1⟧[⟦s2⟧] = ⟦s1⟧[⟦s2⟧ - 1] + ⟦s3⟧[⟦s2⟧ - 1]',
      ],
      slots: [
        { id: 's1', correctRole: 'DP table' },
        { id: 's2', correctRole: 'loop index' },
        { id: 's3', correctRole: 'input array' },
      ],
      roleBank: ['DP table', 'loop index', 'input array', 'accumulator', 'sentinel value'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Read how many items there are to process',
          acceptableKeywords: ['get the input size', 'count the elements', 'read length', 'how many items'],
          hint: 'Before sizing anything, what number do you need from the input?',
          misconception: 'This just measures the input; it does not yet reserve any storage.',
        },
        {
          lineRange: [3, 4],
          referenceLabel: 'Reserve the table and seed the base case',
          acceptableKeywords: ['allocate the table', 'reserve the cells', 'set the base case', 'initialize first cell'],
          hint: 'How big must the table be, and which cell starts with a known answer?',
          misconception: 'This lays out empty storage and the starting value; no recurrence runs here yet.',
        },
        {
          lineRange: [5, 6],
          referenceLabel: 'Sweep in dependency order, filling each cell from the prior one',
          acceptableKeywords: ['iterate upward', 'fill in order', 'build from previous cell', 'forward sweep'],
          hint: 'In which direction must you move so every cell you read is already done?',
          misconception: 'This is where the recurrence actually fills cells, not where the answer is returned.',
        },
        {
          lineRange: [7, 7],
          referenceLabel: 'Hand back the final accumulated cell',
          acceptableKeywords: ['return the last cell', 'final answer', 'return the result', 'read the end of the table'],
          hint: 'Once the table is full, which single cell holds the answer?',
          misconception: 'This only reads the finished result; it does no computation of its own.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'prefix_total',
      starterCode: `def prefix_total(a):
    # Fill a DP table where dp[i] is the sum of the first i elements of a,
    # then return dp[len(a)].
    `,
      testCases: [
        { input: [[3, 1, 4, 1, 5]], expected: 14, label: 'mixed' },
        { input: [[]], expected: 0, label: 'empty' },
        { input: [[7]], expected: 7, hidden: true },
        { input: [[2, 2, 2, 2]], expected: 8, hidden: true },
        { input: [[-1, 4, -2]], expected: 1, hidden: true },
      ],
      parSeconds: 90,
      solution: `def prefix_total(a):
    n = len(a)
    dp = [0] * (n + 1)
    dp[0] = 0
    for i in range(1, n + 1):
        dp[i] = dp[i - 1] + a[i - 1]
    return dp[n]`,
    },
  ],
}

export default primitive
