import type { Primitive } from '../types'

/**
 * Transition references prior states: each dp cell is decided by reading earlier
 * dp values. The house-robber recurrence dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])
 * — skip i and keep the best so far, or take nums[i] and add the best up to i - 2.
 */
const primitive: Primitive = {
  id: 'dp-transition-ref',
  name: 'Transition references prior states',
  category: 'dp',
  snippet: `dp = [0] * len(nums)
dp[0] = nums[0]
dp[1] = max(nums[0], nums[1])
for i in range(2, len(nums)):
    dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])
result = dp[-1]`,
  why: 'A bottom-up dp transition builds each cell from already-computed earlier cells. The house-robber choice — skip (dp[i - 1]) versus take (dp[i - 2] + nums[i]) — reaches back two steps so taking nums[i] never lands on an adjacent pick. Seeding dp[0] and dp[1] is what lets the i >= 2 loop reference dp[i - 2].',
  moduleTags: ['dynamic-programming'],
  misconceptions: [
    {
      id: 'greedy-take-all',
      label: 'sums every element',
      feedback:
        'Taking every element ignores the no-adjacent rule. The transition must choose between skipping and taking, not add all of nums.',
    },
    {
      id: 'reads-adjacent',
      label: 'take branch reads dp[i - 1]',
      feedback:
        'The take branch must read dp[i - 2] + nums[i]. Using dp[i - 1] + nums[i] lets the picked element sit next to the previous pick, which the rule forbids.',
    },
    {
      id: 'seed-second-cell',
      label: 'seeds dp[1] with nums[1]',
      feedback:
        'dp[1] is the best over the first two elements, so it must be max(nums[0], nums[1]). Seeding dp[1] = nums[1] forgets that skipping index 1 might be better.',
    },
    {
      id: 'wrong-final-read',
      label: 'reads the wrong final cell',
      feedback:
        'The answer is the last dp cell, dp[-1] (equivalently dp[len(nums) - 1]). dp[0] is only the best over the first element.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 5,
      prompt: 'With nums = [2, 7, 9, 3, 1], what is result after the loop?',
      choices: ['12', '22', '20', '9'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'greedy-take-all', 'reads-adjacent', 'wrong-final-read'],
      verify: { setup: 'nums = [2, 7, 9, 3, 1]', mode: { expr: 'result' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'dp = [0] * len(nums)', indent: 0 },
        { text: 'dp[0] = nums[0]', indent: 0 },
        { text: 'dp[1] = max(nums[0], nums[1])', indent: 0 },
        { text: 'for i in range(2, len(nums)):', indent: 0 },
        { text: 'dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])', indent: 1 },
        { text: 'result = dp[-1]', indent: 0 },
      ],
      distractors: [
        { text: 'dp[1] = nums[1]', indent: 0, misconceptionId: 'seed-second-cell' },
        { text: 'dp[i] = max(dp[i - 1], dp[i - 1] + nums[i])', indent: 1, misconceptionId: 'reads-adjacent' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'dp = [0] * len(nums)', indent: 0 },
        { text: 'dp[0] = nums[0]', indent: 0 },
        { text: 'dp[1] = max(nums[0], nums[1])', indent: 0 },
        { text: 'for i in range(2, len(nums)):', indent: 0 },
        { text: 'dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])', indent: 1 },
        { text: 'result = dp[-1]', indent: 0 },
      ],
      distractors: [
        { text: 'result = dp[0]', indent: 0, misconceptionId: 'wrong-final-read' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'max(nums[0], nums[1])',
          options: ['max(nums[0], nums[1])', 'nums[1]'],
          misconceptionByOption: { 'nums[1]': 'seed-second-cell' },
        },
        {
          lineIndex: 4,
          token: 'dp[i - 2] + nums[i]',
          options: ['dp[i - 2] + nums[i]', 'dp[i - 1] + nums[i]'],
          misconceptionByOption: { 'dp[i - 1] + nums[i]': 'reads-adjacent' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'dp = [0] * len(nums)',
        'dp[0] = nums[0]',
        'dp[1] = max(nums[0], nums[1])',
        'for i in range(2, len(nums)):',
        '    dp[i] = max(dp[i - 1], ▢)',
        'result = dp[-1]',
      ],
      blanks: [
        {
          lineIndex: 4,
          accept: ['dp[i - 2] + nums[i]', 'dp[i-2] + nums[i]', 'dp[i-2]+nums[i]'],
          misconceptionByInput: {
            'dp[i - 1] + nums[i]': 'reads-adjacent',
            'dp[i-1] + nums[i]': 'reads-adjacent',
            'dp[i-1]+nums[i]': 'reads-adjacent',
          },
          placeholder: 'take branch',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = [0] * len(nums)',
        '⟦s1⟧[0] = nums[0]',
        '⟦s1⟧[1] = max(nums[0], nums[1])',
        'for ⟦s2⟧ in range(2, len(nums)):',
        '    ⟦s1⟧[⟦s2⟧] = max(⟦s1⟧[⟦s2⟧ - 1], ⟦s1⟧[⟦s2⟧ - 2] + nums[⟦s2⟧])',
        'result = ⟦s1⟧[-1]',
      ],
      slots: [
        { id: 's1', correctRole: 'dp table' },
        { id: 's2', correctRole: 'loop index' },
      ],
      roleBank: ['dp table', 'loop index', 'input collection', 'accumulator'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 5],
          referenceLabel: 'Short-circuit the inputs too small for the recurrence',
          acceptableKeywords: ['handle the base cases', 'guard tiny inputs', 'too small to recurse', 'edge cases first'],
          hint: 'Which inputs are too short for a transition that reaches back two steps?',
          misconception: 'These guards answer the trivial sizes directly; the real recurrence has not started.',
        },
        {
          lineRange: [6, 8],
          referenceLabel: 'Allocate the table and seed its first two cells',
          acceptableKeywords: ['set up the table', 'seed the first cells', 'initialize the base values', 'prime the recurrence'],
          hint: 'What must already hold a value before the loop can look two steps back?',
          misconception: 'This primes the starting states; the loop, not this block, fills the rest.',
        },
        {
          lineRange: [9, 10],
          referenceLabel: 'Resolve each cell by choosing skip versus take',
          acceptableKeywords: ['choose skip or take', 'best of two options', 'apply the transition', 'reach back two cells'],
          hint: 'For each position, what two competing choices are being compared?',
          misconception: 'This is the decision per cell; it is not the base-case seeding nor the final read.',
        },
        {
          lineRange: [11, 11],
          referenceLabel: 'Return the best total at the last state',
          acceptableKeywords: ['return the last cell', 'final best total', 'answer at the end', 'read the last state'],
          hint: 'Where does the optimal answer sit once every cell is decided?',
          misconception: 'This only reports the finished answer; no choice is made here.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'max_non_adjacent',
      starterCode: `def max_non_adjacent(nums):
    # Return the largest sum of nums with no two chosen elements adjacent.
    # Assume every element is non-negative.
    `,
      testCases: [
        { input: [[2, 7, 9, 3, 1]], expected: 12, label: 'classic' },
        { input: [[5, 1, 1, 5]], expected: 10, label: 'take both ends' },
        { input: [[]], expected: 0, hidden: true },
        { input: [[4]], expected: 4, hidden: true },
        { input: [[3, 2]], expected: 3, hidden: true },
        { input: [[1, 2, 3, 1]], expected: 4, hidden: true },
        { input: [[10, 5, 5, 10]], expected: 20, hidden: true },
      ],
      parSeconds: 150,
      solution: `def max_non_adjacent(nums):
    if not nums:
        return 0
    if len(nums) == 1:
        return nums[0]
    dp = [0] * len(nums)
    dp[0] = nums[0]
    dp[1] = max(nums[0], nums[1])
    for i in range(2, len(nums)):
        dp[i] = max(dp[i - 1], dp[i - 2] + nums[i])
    return dp[-1]`,
    },
  ],
}

export default primitive
