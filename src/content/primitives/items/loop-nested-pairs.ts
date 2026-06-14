import type { Primitive } from '../types'

/**
 * Nested pair enumeration: the inner index starts at i + 1 so each unordered
 * pair {i, j} is visited exactly once, never (i, i) and never both (i, j) and
 * (j, i). The bedrock double loop under pair-counting and brute-force pair scans.
 */
const primitive: Primitive = {
  id: 'loop-nested-pairs',
  name: 'Nested pair enumeration (j = i+1)',
  category: 'loops',
  snippet: `count = 0
for i in range(n):
    for j in range(i + 1, n):
        if nums[i] + nums[j] == target:
            count += 1`,
  why: 'Starting the inner loop at i + 1 enumerates every unordered pair once. It skips j == i (no element paired with itself) and never revisits a pair in the other order, so you count each pair a single time.',
  moduleTags: ['two-pointers', 'math-geometry'],
  misconceptions: [
    {
      id: 'inner-starts-zero',
      label: 'inner loop starts at 0',
      feedback:
        'for j in range(n) revisits every pair twice (once as (i, j), once as (j, i)) and also pairs each element with itself when j == i. Start j at i + 1 to count each unordered pair once.',
    },
    {
      id: 'inner-starts-at-i',
      label: 'inner loop starts at i',
      feedback:
        'for j in range(i, n) includes j == i, so each element gets paired with itself. Start at i + 1 to skip the self-pair.',
    },
    {
      id: 'counts-instead-of-checks',
      label: 'counts every pair, ignoring the condition',
      feedback:
        'count += 1 on its own tallies all pairs. Guard it with the if so you only count pairs that satisfy the condition.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 0,
      prompt: 'With nums = [1, 3, 2, 4], n = 4, target = 5, how many unordered pairs sum to target?',
      choices: ['2', '4', '1', '0'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'inner-starts-zero', 'inner-starts-at-i', 'counts-instead-of-checks'],
      verify: { setup: 'nums = [1, 3, 2, 4]\nn = 4\ntarget = 5', mode: { expr: 'count' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'count = 0', indent: 0 },
        { text: 'for i in range(n):', indent: 0 },
        { text: 'for j in range(i + 1, n):', indent: 1 },
        { text: 'if nums[i] + nums[j] == target:', indent: 2 },
        { text: 'count += 1', indent: 3 },
      ],
      distractors: [
        { text: 'for j in range(n):', indent: 1, misconceptionId: 'inner-starts-zero' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'count = 0', indent: 0 },
        { text: 'for i in range(n):', indent: 0 },
        { text: 'for j in range(i + 1, n):', indent: 1 },
        { text: 'if nums[i] + nums[j] == target:', indent: 2 },
        { text: 'count += 1', indent: 3 },
      ],
      distractors: [
        { text: 'for j in range(i, n):', indent: 1, misconceptionId: 'inner-starts-at-i' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'i + 1',
          options: ['i + 1', 'i', '0'],
          misconceptionByOption: { i: 'inner-starts-at-i', '0': 'inner-starts-zero' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'count = 0',
        'for i in range(n):',
        '    for j in range(▢, n):',
        '        if nums[i] + nums[j] == target:',
        '            count += 1',
      ],
      blanks: [
        {
          lineIndex: 2,
          accept: ['i + 1', 'i+1'],
          misconceptionByInput: { i: 'inner-starts-at-i', '0': 'inner-starts-zero' },
          placeholder: 'inner start',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        'count = 0',
        'for ⟦s1⟧ in range(n):',
        '    for ⟦s2⟧ in range(⟦s1⟧ + 1, n):',
        '        if nums[⟦s1⟧] + nums[⟦s2⟧] == target:',
        '            count += 1',
      ],
      slots: [
        { id: 's1', correctRole: 'outer index' },
        { id: 's2', correctRole: 'inner index' },
      ],
      roleBank: ['outer index', 'inner index', 'running count', 'pair sum'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 3],
          referenceLabel: 'Record the size and seed the tally',
          acceptableKeywords: ['initialize counter', 'capture the length', 'seed the tally', 'start at zero'],
          hint: 'What does the enumeration need to know and track before it starts?',
          misconception: 'This only primes the bounds and count; no pair has been examined yet.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Pick the first member of each pair',
          acceptableKeywords: ['outer loop', 'choose first element', 'fix the left index', 'pick anchor'],
          hint: 'Which loop fixes the earlier element of a pair?',
          misconception: 'This chooses one side only; the partner is selected by the inner loop.',
        },
        {
          lineRange: [5, 5],
          referenceLabel: 'Pair it only with later members to avoid repeats',
          acceptableKeywords: ['inner starts after i', 'only later elements', 'skip self and duplicates', 'partner from i plus one'],
          hint: 'Where must the inner index begin so each unordered pair is seen once?',
          misconception: 'Starting elsewhere would either re-pair an element with itself or count each pair twice.',
        },
        {
          lineRange: [6, 7],
          referenceLabel: 'Count the pair only when it qualifies',
          acceptableKeywords: ['check the condition', 'count if it matches', 'tally qualifying pairs', 'guard the increment'],
          hint: 'What must be true before a pair adds to the total?',
          misconception: 'The increment is gated by the test — it does not count every pair blindly.',
        },
        {
          lineRange: [8, 8],
          referenceLabel: 'Hand back the qualifying count',
          acceptableKeywords: ['return count', 'give back the tally', 'output the total', 'return the answer'],
          hint: 'After all pairs are seen, what is produced?',
          misconception: 'Reaching here means every pair was checked; this just returns the tally.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'count_pairs_with_sum',
      starterCode: `def count_pairs_with_sum(nums, target):
    # Count unordered pairs (i, j), i < j, whose values sum to target.
    `,
      testCases: [
        { input: [[1, 3, 2, 4], 5], expected: 2, label: 'two pairs' },
        { input: [[1, 1, 1], 2], expected: 3, label: 'all pairs match' },
        { input: [[], 0], expected: 0, hidden: true },
        { input: [[5], 5], expected: 0, hidden: true },
        { input: [[2, 2, 4, 6], 8], expected: 2, hidden: true },
        { input: [[0, 0, 0, 0], 1], expected: 0, hidden: true },
      ],
      parSeconds: 90,
      solution: `def count_pairs_with_sum(nums, target):
    n = len(nums)
    count = 0
    for i in range(n):
        for j in range(i + 1, n):
            if nums[i] + nums[j] == target:
                count += 1
    return count`,
    },
  ],
}

export default primitive
