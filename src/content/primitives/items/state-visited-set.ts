import type { Primitive } from '../types'

/**
 * Visited-set guard: keep a set of items already handled and `continue` past any
 * repeat. The bedrock of dedupe, cycle avoidance, and "process each node once"
 * in graph and tree traversals.
 */
const primitive: Primitive = {
  id: 'state-visited-set',
  name: 'Visited-set guard',
  category: 'state',
  snippet: `seen = set()
order = []
for x in items:
    if x in seen:
        continue
    seen.add(x)
    order.append(x)`,
  why: 'A set gives O(1) membership tests, so checking "have I handled this already?" is cheap. Guard the top of the loop with `if x in seen: continue`, then record the item — this dedupes a stream and stops a traversal from revisiting nodes (cycle avoidance).',
  moduleTags: ['graphs', 'trees'],
  misconceptions: [
    {
      id: 'add-before-check',
      label: 'records before checking',
      feedback:
        'Add to seen AFTER the membership guard. If you call seen.add(x) before the `if x in seen` check, every item already looks "seen" and nothing is ever kept.',
    },
    {
      id: 'uses-list-not-set',
      label: 'tracks visited in a list',
      feedback:
        'A list works but `x in list` is O(n) per check, turning the scan into O(n^2). A set keeps membership tests O(1).',
    },
    {
      id: 'no-skip-on-repeat',
      label: 'forgets to skip the repeat',
      feedback:
        'Without `continue`, a duplicate falls through to the recording lines and gets added again — the guard has no effect.',
    },
    {
      id: 'skips-everything',
      label: 'guard logic inverted',
      feedback:
        'You want to skip items already in seen. Writing `if x not in seen: continue` skips the fresh items instead and keeps only repeats.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 6,
      prompt: 'With items = [3, 1, 3, 2, 1, 3], what is order after the loop?',
      choices: ['[3, 1, 2]', '[3, 1, 3, 2, 1, 3]', '[3, 1, 3, 2, 1]', '[]'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'no-skip-on-repeat', 'add-before-check', 'skips-everything'],
      verify: { setup: 'items = [3, 1, 3, 2, 1, 3]', mode: { expr: 'order' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'seen = set()', indent: 0 },
        { text: 'order = []', indent: 0 },
        { text: 'for x in items:', indent: 0 },
        { text: 'if x in seen:', indent: 1 },
        { text: 'continue', indent: 2 },
        { text: 'seen.add(x)', indent: 1 },
        { text: 'order.append(x)', indent: 1 },
      ],
      distractors: [
        { text: 'if x not in seen:', indent: 1, misconceptionId: 'skips-everything' },
        { text: 'seen = []', indent: 0, misconceptionId: 'uses-list-not-set' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'seen = set()', indent: 0 },
        { text: 'order = []', indent: 0 },
        { text: 'for x in items:', indent: 0 },
        { text: 'if x in seen:', indent: 1 },
        { text: 'continue', indent: 2 },
        { text: 'seen.add(x)', indent: 1 },
        { text: 'order.append(x)', indent: 1 },
      ],
      distractors: [
        { text: 'seen.add(x)', indent: 2, misconceptionId: 'add-before-check' },
      ],
      blanks: [
        {
          lineIndex: 0,
          token: 'set()',
          options: ['set()', '[]', '{}'],
          misconceptionByOption: { '[]': 'uses-list-not-set' },
        },
        {
          lineIndex: 4,
          token: 'continue',
          options: ['continue', 'pass', 'break'],
          misconceptionByOption: { pass: 'no-skip-on-repeat', break: 'no-skip-on-repeat' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'seen = ▢',
        'order = []',
        'for x in items:',
        '    if x in seen:',
        '        ▢',
        '    seen.add(x)',
        '    order.append(x)',
      ],
      blanks: [
        {
          lineIndex: 0,
          accept: ['set()'],
          misconceptionByInput: { '[]': 'uses-list-not-set', 'list()': 'uses-list-not-set' },
          placeholder: 'empty container',
        },
        {
          lineIndex: 4,
          accept: ['continue'],
          misconceptionByInput: { pass: 'no-skip-on-repeat', break: 'no-skip-on-repeat' },
          placeholder: 'skip to next item',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = set()',
        '⟦s2⟧ = []',
        'for ⟦s3⟧ in items:',
        '    if ⟦s3⟧ in ⟦s1⟧:',
        '        continue',
        '    ⟦s1⟧.add(⟦s3⟧)',
        '    ⟦s2⟧.append(⟦s3⟧)',
      ],
      slots: [
        { id: 's1', correctRole: 'visited set' },
        { id: 's2', correctRole: 'output collection' },
        { id: 's3', correctRole: 'current item' },
      ],
      roleBank: ['visited set', 'output collection', 'current item', 'loop bound'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 3],
          referenceLabel: 'Set up the memory and the output',
          acceptableKeywords: ['initialize the tracker', 'empty set and list', 'prepare the containers', 'set up storage'],
          hint: 'What two empty containers does the scan need before it starts?',
          misconception: 'This only allocates storage — no item has been examined yet.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Walk over every incoming item',
          acceptableKeywords: ['loop over items', 'iterate the input', 'visit each element', 'scan the stream'],
          hint: 'How does each candidate item get reached?',
          misconception: 'This only drives the iteration; the dedupe decision happens inside.',
        },
        {
          lineRange: [5, 6],
          referenceLabel: 'Skip anything already handled',
          acceptableKeywords: ['skip the repeat', 'already seen continue', 'guard against duplicates', 'jump to next'],
          hint: 'What should happen the moment an item is recognized as a repeat?',
          misconception: 'This is the skip guard, separate from recording a fresh item below.',
        },
        {
          lineRange: [7, 8],
          referenceLabel: 'Record a first-time item',
          acceptableKeywords: ['mark as seen', 'record the item', 'add to output', 'remember and keep'],
          hint: 'For an item never seen before, what two things get updated?',
          misconception: 'This runs only for new items — it is not the skip on a repeat.',
        },
        {
          lineRange: [9, 9],
          referenceLabel: 'Hand back the deduped order',
          acceptableKeywords: ['return the result', 'give back the list', 'output the order', 'final collection'],
          hint: 'After the scan, what gets returned?',
          misconception: 'This reports the finished result; it does no filtering itself.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'dedupe_keep_order',
      starterCode: `def dedupe_keep_order(items):
    # Return items with duplicates removed, keeping first-seen order.
    `,
      testCases: [
        { input: [[3, 1, 3, 2, 1, 3]], expected: [3, 1, 2], label: 'repeats' },
        { input: [[1, 2, 3]], expected: [1, 2, 3], label: 'already unique' },
        { input: [[]], expected: [], hidden: true },
        { input: [[7, 7, 7, 7]], expected: [7], hidden: true },
        { input: [['a', 'b', 'a', 'c', 'b']], expected: ['a', 'b', 'c'], hidden: true },
      ],
      parSeconds: 90,
      solution: `def dedupe_keep_order(items):
    seen = set()
    order = []
    for x in items:
        if x in seen:
            continue
        seen.add(x)
        order.append(x)
    return order`,
    },
  ],
}

export default primitive
