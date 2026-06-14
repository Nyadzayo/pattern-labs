import type { Primitive } from '../types'

/**
 * Best-so-far tracking: seed the answer from the first element, then scan the
 * rest and overwrite whenever you find something better. The state idiom under
 * running max/min, greedy choices, and many one-pass DP recurrences.
 */
const primitive: Primitive = {
  id: 'state-best-so-far',
  name: 'Best-so-far tracking',
  category: 'state',
  snippet: `best = a[0]
for x in a[1:]:
    if x > best:
        best = x`,
  why: 'Seed best from the first element so there is always a valid candidate, then walk the rest and replace best only when a strictly better value appears. The end state holds the running maximum (flip the comparison for a minimum).',
  moduleTags: ['greedy', 'intervals', 'dynamic-programming'],
  misconceptions: [
    {
      id: 'seed-from-zero',
      label: 'seeds best from 0',
      feedback:
        'best = a[0] starts from a real element, so it works even when every value is negative. best = 0 wrongly assumes 0 is a valid baseline and breaks on all-negative inputs.',
    },
    {
      id: 'skips-first-element',
      label: 'rescans the first element',
      feedback:
        'a[1:] skips index 0 because best is already seeded from it. Iterating over all of a re-compares a[0] to itself — harmless here, but it signals you forgot the seed already consumed it.',
    },
    {
      id: 'tracks-minimum',
      label: 'comparison finds the minimum',
      feedback:
        'if x > best keeps the largest value seen. Flipping it to if x < best would track the minimum instead.',
    },
    {
      id: 'overwrites-unconditionally',
      label: 'updates without comparing',
      feedback:
        'best = x must sit inside if x > best. Assigning every step makes best equal the last element, not the largest.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 0,
      prompt: 'With a = [3, 9, 2, 9, 5], what is best after the loop finishes?',
      choices: ['9', '5', '2', '3'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'overwrites-unconditionally', 'tracks-minimum', 'skips-first-element'],
      verify: { setup: 'a = [3, 9, 2, 9, 5]', mode: { expr: 'best' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'best = a[0]', indent: 0 },
        { text: 'for x in a[1:]:', indent: 0 },
        { text: 'if x > best:', indent: 1 },
        { text: 'best = x', indent: 2 },
      ],
      distractors: [
        { text: 'best = 0', indent: 0, misconceptionId: 'seed-from-zero' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'best = a[0]', indent: 0 },
        { text: 'for x in a[1:]:', indent: 0 },
        { text: 'if x > best:', indent: 1 },
        { text: 'best = x', indent: 2 },
      ],
      distractors: [
        { text: 'for x in a:', indent: 0, misconceptionId: 'skips-first-element' },
      ],
      blanks: [
        {
          lineIndex: 0,
          token: 'a[0]',
          options: ['a[0]', '0'],
          misconceptionByOption: { '0': 'seed-from-zero' },
        },
        {
          lineIndex: 2,
          token: 'x > best',
          options: ['x > best', 'x < best'],
          misconceptionByOption: { 'x < best': 'tracks-minimum' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'best = a[0]',
        'for x in a[1:]:',
        '    if x ▢ best:',
        '        best = x',
      ],
      blanks: [
        {
          lineIndex: 2,
          accept: ['>'],
          misconceptionByInput: { '<': 'tracks-minimum' },
          placeholder: 'comparison',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = a[0]',
        'for ⟦s2⟧ in a[1:]:',
        '    if ⟦s2⟧ > ⟦s1⟧:',
        '        ⟦s1⟧ = ⟦s2⟧',
      ],
      slots: [
        { id: 's1', correctRole: 'best so far' },
        { id: 's2', correctRole: 'current element' },
      ],
      roleBank: ['best so far', 'current element', 'running total', 'loop bound'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Seed best with the first element',
          acceptableKeywords: ['initialize best to first', 'seed with a real element', 'start best as a zero', 'best equals first value'],
          hint: 'Before comparing, what is a safe initial value for "best"?',
          misconception: 'Seeding from a real element (a[0]) avoids a bad sentinel like 0 for all-negative input.',
        },
        {
          lineRange: [3, 3],
          referenceLabel: 'Scan the remaining elements',
          acceptableKeywords: ['loop over the rest', 'for each remaining element', 'iterate from the second', 'scan the tail'],
          hint: 'Which elements still need checking after the seed?',
          misconception: 'This walks the rest; the comparison itself is inside it.',
        },
        {
          lineRange: [4, 5],
          referenceLabel: 'Keep the larger value',
          acceptableKeywords: ['if greater update best', 'current bigger than best', 'replace best when larger', 'keep the maximum'],
          hint: 'When should the current "best" change?',
          misconception: 'This is the update rule — it only fires when a bigger value appears.',
        },
        {
          lineRange: [6, 6],
          referenceLabel: 'Return the running best',
          acceptableKeywords: ['return best', 'final maximum', 'the running best result', 'answer is best'],
          hint: 'After the scan, what holds the answer?',
          misconception: 'best has tracked the maximum the whole way through.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'max_value',
      starterCode: `def max_value(a):
    # Return the largest value in the non-empty list a.
    `,
      testCases: [
        { input: [[3, 9, 2, 9, 5]], expected: 9, label: 'duplicated max' },
        { input: [[-4, -1, -7, -2]], expected: -1, label: 'all negative' },
        { input: [[42]], expected: 42, hidden: true },
        { input: [[1, 2, 3, 4, 5]], expected: 5, hidden: true },
        { input: [[5, 4, 3, 2, 1]], expected: 5, hidden: true },
      ],
      parSeconds: 75,
      solution: `def max_value(a):
    best = a[0]
    for x in a[1:]:
        if x > best:
            best = x
    return best`,
    },
  ],
}

export default primitive
