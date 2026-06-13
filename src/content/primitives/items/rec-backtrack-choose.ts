import type { Primitive } from '../types'

/**
 * Backtracking choose / explore / unchoose: append a candidate to the running
 * path, recurse deeper, then pop it to restore the shared path before trying
 * the next candidate. The skeleton under subsets, permutations, and combinations.
 */
const primitive: Primitive = {
  id: 'rec-backtrack-choose',
  name: 'Backtracking choose / explore / unchoose',
  category: 'recursion',
  snippet: `results = []
def backtrack(start, path):
    results.append(path[:])
    for i in range(start, len(nums)):
        path.append(nums[i])
        backtrack(i + 1, path)
        path.pop()
backtrack(0, [])`,
  why: 'One shared path list is mutated in place: append to choose, recurse to explore, pop to unchoose. The pop after the recursive call is what restores state so the next sibling candidate starts from a clean slate.',
  moduleTags: ['backtracking'],
  misconceptions: [
    {
      id: 'forgets-unchoose',
      label: 'never pops (no unchoose)',
      feedback:
        'Without path.pop() after backtrack(...), the chosen element is never removed, so siblings inherit a path that keeps growing instead of restarting clean.',
    },
    {
      id: 'appends-reference',
      label: 'stores the path itself, not a copy',
      feedback:
        'results.append(path) stores a reference to the one shared list. Every later append/pop mutates it, so all results end up identical. Snapshot with path[:].',
    },
    {
      id: 'wrong-recursion-cursor',
      label: 'advances the wrong cursor',
      feedback:
        'Recurse with i + 1 so the next level starts past the element just chosen. Passing start + 1 advances a cursor that does not track the current pick, revisiting elements and producing duplicates.',
    },
    {
      id: 'snapshot-too-late',
      label: 'records after the loop instead of on entry',
      feedback:
        'results.append(path[:]) belongs at the top of the call so every partial path is captured. Recording only after the for-loop would miss most prefixes.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With nums = [1, 2, 3], how many lists are in results after backtrack(0, []) runs?',
      choices: ['8', '16', '7', '4'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'wrong-recursion-cursor', 'snapshot-too-late', 'appends-reference'],
      verify: { setup: 'nums = [1, 2, 3]', mode: { expr: 'len(results)' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'results = []', indent: 0 },
        { text: 'def backtrack(start, path):', indent: 0 },
        { text: 'results.append(path[:])', indent: 1 },
        { text: 'for i in range(start, len(nums)):', indent: 1 },
        { text: 'path.append(nums[i])', indent: 2 },
        { text: 'backtrack(i + 1, path)', indent: 2 },
        { text: 'path.pop()', indent: 2 },
        { text: 'backtrack(0, [])', indent: 0 },
      ],
      distractors: [
        { text: 'backtrack(start + 1, path)', indent: 2, misconceptionId: 'wrong-recursion-cursor' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'results = []', indent: 0 },
        { text: 'def backtrack(start, path):', indent: 0 },
        { text: 'results.append(path[:])', indent: 1 },
        { text: 'for i in range(start, len(nums)):', indent: 1 },
        { text: 'path.append(nums[i])', indent: 2 },
        { text: 'backtrack(i + 1, path)', indent: 2 },
        { text: 'path.pop()', indent: 2 },
        { text: 'backtrack(0, [])', indent: 0 },
      ],
      distractors: [
        { text: 'results.append(path)', indent: 1, misconceptionId: 'appends-reference' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'path[:]',
          options: ['path[:]', 'path'],
          misconceptionByOption: { path: 'appends-reference' },
        },
        {
          lineIndex: 5,
          token: 'i + 1',
          options: ['i + 1', 'start + 1', 'i'],
          misconceptionByOption: { 'start + 1': 'wrong-recursion-cursor', i: 'wrong-recursion-cursor' },
        },
        {
          lineIndex: 6,
          token: 'path.pop()',
          options: ['path.pop()', 'pass'],
          misconceptionByOption: { pass: 'forgets-unchoose' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'results = []',
        'def backtrack(start, path):',
        '    results.append(▢)',
        '    for i in range(start, len(nums)):',
        '        path.append(nums[i])',
        '        backtrack(▢, path)',
        '        ▢',
        'backtrack(0, [])',
      ],
      blanks: [
        {
          lineIndex: 2,
          accept: ['path[:]', 'path.copy()', 'list(path)'],
          misconceptionByInput: { path: 'appends-reference' },
          placeholder: 'snapshot',
        },
        {
          lineIndex: 5,
          accept: ['i + 1', 'i+1'],
          misconceptionByInput: { 'start + 1': 'wrong-recursion-cursor', 'start+1': 'wrong-recursion-cursor', i: 'wrong-recursion-cursor' },
          placeholder: 'next start',
        },
        {
          lineIndex: 6,
          accept: ['path.pop()'],
          misconceptionByInput: { pass: 'forgets-unchoose', '': 'forgets-unchoose' },
          placeholder: 'unchoose',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        'results = []',
        'def backtrack(⟦s1⟧, ⟦s2⟧):',
        '    results.append(⟦s2⟧[:])',
        '    for ⟦s3⟧ in range(⟦s1⟧, len(nums)):',
        '        ⟦s2⟧.append(nums[⟦s3⟧])',
        '        backtrack(⟦s3⟧ + 1, ⟦s2⟧)',
        '        ⟦s2⟧.pop()',
        'backtrack(0, [])',
      ],
      slots: [
        { id: 's1', correctRole: 'start cursor' },
        { id: 's2', correctRole: 'current path' },
        { id: 's3', correctRole: 'candidate index' },
      ],
      roleBank: ['start cursor', 'current path', 'candidate index', 'result collection'],
    },
    {
      kind: 'write',
      functionName: 'subsets',
      starterCode: `def subsets(nums):
    # Return every subset of nums (including [] and nums itself).
    # Use choose / explore / unchoose: append, recurse, pop.
    `,
      testCases: [
        { input: [[1, 2]], expected: [[], [1], [1, 2], [2]], label: 'two elements', unordered: true },
        { input: [[1]], expected: [[], [1]], label: 'single', unordered: true },
        { input: [[]], expected: [[]], hidden: true, unordered: true },
        {
          input: [[1, 2, 3]],
          expected: [[], [1], [1, 2], [1, 2, 3], [1, 3], [2], [2, 3], [3]],
          hidden: true,
          unordered: true,
        },
        { input: [[4, 5]], expected: [[], [4], [4, 5], [5]], hidden: true, unordered: true },
      ],
      parSeconds: 150,
      solution: `def subsets(nums):
    results = []
    def backtrack(start, path):
        results.append(path[:])
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()
    backtrack(0, [])
    return results`,
    },
  ],
}

export default primitive
