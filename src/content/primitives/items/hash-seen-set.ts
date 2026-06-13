import type { Primitive } from '../types'

/**
 * Seen-set membership: keep a set of everything visited so far, and before
 * recording a new element check whether it is already present. The instant the
 * membership test succeeds you have found a repeat. The bedrock idiom under
 * duplicate detection, cycle checks, and "have I been here before" scans.
 */
const primitive: Primitive = {
  id: 'hash-seen-set',
  name: 'Seen-set membership',
  category: 'hashing',
  snippet: `seen = set()
has_dup = False
for x in a:
    if x in seen:
        has_dup = True
        break
    seen.add(x)`,
  why: 'A set gives O(1) membership tests. Test "x in seen" BEFORE adding x: if it is already there, this is the first repeat. Add x afterwards so the current element never matches itself.',
  moduleTags: ['hash-maps-sets', 'graphs'],
  misconceptions: [
    {
      id: 'inverted-membership',
      label: 'inverts the membership test',
      feedback:
        'Checking "x not in seen" flags the first time you see a value, not a repeat. You want "x in seen" — true only when x was recorded on an earlier iteration.',
    },
    {
      id: 'list-instead-of-set',
      label: 'uses a list instead of a set',
      feedback:
        'A list makes "x in seen" an O(n) scan, turning the loop into O(n squared). A set keeps membership O(1) on average — that is the whole point of this idiom.',
    },
    {
      id: 'never-records',
      label: 'never records the seen element',
      feedback:
        'Without seen.add(x), the set stays empty and "x in seen" is never true, so no duplicate is ever found.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 3,
      prompt: 'With a = [3, 7, 4, 7, 9], what is has_dup after the loop finishes?',
      choices: ['True', 'False'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'never-records'],
      verify: { setup: 'a = [3, 7, 4, 7, 9]', mode: { expr: 'has_dup' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'seen = set()', indent: 0 },
        { text: 'has_dup = False', indent: 0 },
        { text: 'for x in a:', indent: 0 },
        { text: 'if x in seen:', indent: 1 },
        { text: 'has_dup = True', indent: 2 },
        { text: 'break', indent: 2 },
        { text: 'seen.add(x)', indent: 1 },
      ],
      distractors: [
        { text: 'seen = []', indent: 0, misconceptionId: 'list-instead-of-set' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'seen = set()', indent: 0 },
        { text: 'has_dup = False', indent: 0 },
        { text: 'for x in a:', indent: 0 },
        { text: 'if x in seen:', indent: 1 },
        { text: 'has_dup = True', indent: 2 },
        { text: 'break', indent: 2 },
        { text: 'seen.add(x)', indent: 1 },
      ],
      distractors: [
        { text: 'seen = []', indent: 0, misconceptionId: 'list-instead-of-set' },
      ],
      blanks: [
        {
          lineIndex: 0,
          token: 'set()',
          options: ['set()', '[]', '{}'],
          misconceptionByOption: { '[]': 'list-instead-of-set' },
        },
        {
          lineIndex: 3,
          token: 'x in seen',
          options: ['x in seen', 'x not in seen'],
          misconceptionByOption: { 'x not in seen': 'inverted-membership' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'seen = set()',
        'has_dup = False',
        'for x in a:',
        '    if x in seen:',
        '        has_dup = True',
        '        break',
        '    seen.▢',
      ],
      blanks: [
        {
          lineIndex: 6,
          accept: ['add(x)'],
          misconceptionByInput: { 'append(x)': 'list-instead-of-set' },
          placeholder: 'record x',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = set()',
        'has_dup = False',
        'for ⟦s2⟧ in a:',
        '    if ⟦s2⟧ in ⟦s1⟧:',
        '        has_dup = True',
        '        break',
        '    ⟦s1⟧.add(⟦s2⟧)',
      ],
      slots: [
        { id: 's1', correctRole: 'set of seen values' },
        { id: 's2', correctRole: 'current element' },
      ],
      roleBank: ['set of seen values', 'current element', 'running total', 'loop bound'],
    },
    {
      kind: 'write',
      functionName: 'has_duplicate',
      starterCode: `def has_duplicate(a):
    # Return True if any value in a appears more than once, else False.
    `,
      testCases: [
        { input: [[3, 7, 4, 7, 9]], expected: true, label: 'repeat present' },
        { input: [[1, 2, 3, 4]], expected: false, label: 'all unique' },
        { input: [[]], expected: false, hidden: true },
        { input: [[5, 5]], expected: true, hidden: true },
        { input: [[0, 1, 2, 3, 0]], expected: true, hidden: true },
        { input: [[9]], expected: false, hidden: true },
      ],
      parSeconds: 75,
      solution: `def has_duplicate(a):
    seen = set()
    for x in a:
        if x in seen:
            return True
        seen.add(x)
    return False`,
    },
  ],
}

export default primitive
