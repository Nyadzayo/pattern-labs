import type { Primitive } from '../types'

/**
 * While with a compound (and) condition: advance an index while two things stay
 * true at once, guarding the bound BEFORE the index access so short-circuit
 * evaluation keeps a[i] from ever running out of range.
 */
const primitive: Primitive = {
  id: 'loop-while-compound',
  name: 'While with compound condition',
  category: 'loops',
  snippet: `i = 0
while i < len(a) and a[i] == a[0]:
    i += 1`,
  why: 'When a loop both walks an index and inspects the element there, put the in-bounds guard (i < len(a)) first and join it with and. Python short-circuits, so a[i] is only evaluated once i is known to be valid — even when every element matches and i reaches len(a).',
  moduleTags: ['two-pointers', 'sliding-windows', 'binary-search'],
  misconceptions: [
    {
      id: 'index-before-guard',
      label: 'index access before the bound check',
      feedback:
        'a[i] == a[0] and i < len(a) reads a[i] first. When i reaches len(a) that access raises IndexError, because and only short-circuits left to right — the guard must come first.',
    },
    {
      id: 'or-instead-of-and',
      label: 'joins with or instead of and',
      feedback:
        'Both parts must hold to keep going, so join them with and. With or the loop keeps running as long as either is true, walking i past the matching run.',
    },
    {
      id: 'compares-to-neighbor',
      label: 'compares to the previous element',
      feedback:
        'This idiom counts the leading run equal to the FIRST element, so compare a[i] to a[0]. Comparing a[i] to a[i - 1] measures a different thing (any equal-adjacent run).',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 1,
      prompt: 'With a = [5, 5, 5], what is i after the loop finishes?',
      choices: ['3', '2', '0', 'IndexError'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'compares-to-neighbor', 'or-instead-of-and', 'index-before-guard'],
      verify: { setup: 'a = [5, 5, 5]', mode: { expr: 'i' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'i = 0', indent: 0 },
        { text: 'while i < len(a) and a[i] == a[0]:', indent: 0 },
        { text: 'i += 1', indent: 1 },
      ],
      distractors: [
        { text: 'while a[i] == a[0] and i < len(a):', indent: 0, misconceptionId: 'index-before-guard' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'i = 0', indent: 0 },
        { text: 'while i < len(a) and a[i] == a[0]:', indent: 0 },
        { text: 'i += 1', indent: 1 },
      ],
      distractors: [
        { text: 'while i < len(a) or a[i] == a[0]:', indent: 0, misconceptionId: 'or-instead-of-and' },
      ],
      blanks: [
        {
          lineIndex: 1,
          token: 'and',
          options: ['and', 'or'],
          misconceptionByOption: { or: 'or-instead-of-and' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['i = 0', 'while i < len(a) and a[i] == a[▢]:', '    i += 1'],
      blanks: [
        {
          lineIndex: 1,
          accept: ['0'],
          misconceptionByInput: { 'i - 1': 'compares-to-neighbor', 'i-1': 'compares-to-neighbor' },
          placeholder: 'index',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = 0', 'while ⟦s1⟧ < len(⟦s2⟧) and ⟦s2⟧[⟦s1⟧] == ⟦s2⟧[0]:', '    ⟦s1⟧ += 1'],
      slots: [
        { id: 's1', correctRole: 'loop index' },
        { id: 's2', correctRole: 'input collection' },
      ],
      roleBank: ['loop index', 'input collection', 'bound guard', 'match target'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Start the counter at the beginning',
          acceptableKeywords: ['start at zero', 'initialize the index', 'counter begins', 'set up the cursor'],
          hint: 'Before any element is inspected, where does the walk begin?',
          misconception: 'This only places the starting point — no element has been examined yet.',
        },
        {
          lineRange: [3, 4],
          referenceLabel: 'Advance while both conditions still hold',
          acceptableKeywords: ['keep going while in bounds and matching', 'guard then compare', 'advance while still equal', 'short-circuit before access'],
          hint: 'What two things must both stay true for the walk to continue, and in what order are they checked?',
          misconception: 'This advances the cursor; it is not where the final count is reported.',
        },
        {
          lineRange: [5, 5],
          referenceLabel: 'Report how far the walk reached',
          acceptableKeywords: ['return the count', 'how far it got', 'final index is the length', 'hand back the result'],
          hint: 'Once the run ends, what value answers the question?',
          misconception: 'This returns the tally — it is not part of the looping condition.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'leading_run',
      starterCode: `def leading_run(a):
    # Return how many elements at the start of a equal a[0].
    # An empty list has a leading run of 0.
    `,
      testCases: [
        { input: [[3, 3, 3, 7, 3]], expected: 3, label: 'run then break' },
        { input: [[5, 5, 5]], expected: 3, label: 'all equal' },
        { input: [[]], expected: 0, hidden: true },
        { input: [[9]], expected: 1, hidden: true },
        { input: [[1, 2, 2, 2]], expected: 1, hidden: true },
        { input: [[4, 4, 4, 4, 1]], expected: 4, hidden: true },
      ],
      parSeconds: 75,
      solution: `def leading_run(a):
    i = 0
    while i < len(a) and a[i] == a[0]:
        i += 1
    return i`,
    },
  ],
}

export default primitive
