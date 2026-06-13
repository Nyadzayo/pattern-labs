import type { Primitive } from '../types'

/**
 * Trie descend via children map: walk a nested-dict trie one character at a
 * time, bailing the instant a character is missing, then check an end marker.
 * The lookup core behind word search, autocomplete, and prefix membership.
 */
const primitive: Primitive = {
  id: 'trie-descend-children',
  name: 'Trie descend via children map',
  category: 'hashing',
  snippet: `node = root
found = True
for ch in word:
    if ch not in node:
        found = False
        break
    node = node[ch]
found = found and node.get('$', False)`,
  why: "A trie node is just a dict mapping the next character to its child node, so descending a word is one dict lookup per character. Bail the moment a character is absent, then confirm a whole word ended here by checking an end marker like '$'.",
  moduleTags: ['tries'],
  misconceptions: [
    {
      id: 'no-break-keyerror',
      label: 'never bails on a missing child',
      feedback:
        'When ch is not in node you must stop descending — node[ch] would raise KeyError. Set found = False and break out of the loop.',
    },
    {
      id: 'descends-into-self',
      label: 'forgets to move to the child',
      feedback:
        'node = node[ch] is what advances you down the trie. Without it the loop inspects the same root dict every step and never reaches the leaf.',
    },
    {
      id: 'prefix-not-word',
      label: 'treats any prefix as a full word',
      feedback:
        "Reaching a node only proves the prefix exists. A complete word is recorded by an end marker, so the final answer must check node.get('$', False).",
    },
    {
      id: 'membership-on-value',
      label: 'tests membership against the wrong thing',
      feedback:
        'A trie node maps characters to children, so ch not in node checks the keys of the current node — not the word, and not the child value.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 7,
      prompt:
        "root is a trie holding the words 'cat' and 'car'. With word = 'car', what is found after the snippet runs?",
      choices: ['True', 'False', "node.get('$', False)", '0'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'prefix-not-word', 'membership-on-value', 'descends-into-self'],
      verify: {
        setup: `root = {'c': {'a': {'t': {'$': True}, 'r': {'$': True}}}}
word = 'car'`,
        mode: { expr: 'found' },
      },
    },
    {
      kind: 'order',
      lines: [
        { text: 'node = root', indent: 0 },
        { text: 'found = True', indent: 0 },
        { text: 'for ch in word:', indent: 0 },
        { text: 'if ch not in node:', indent: 1 },
        { text: 'found = False', indent: 2 },
        { text: 'break', indent: 2 },
        { text: 'node = node[ch]', indent: 1 },
        { text: "found = found and node.get('$', False)", indent: 0 },
      ],
      distractors: [
        { text: 'if ch not in word:', indent: 1, misconceptionId: 'membership-on-value' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'node = root', indent: 0 },
        { text: 'found = True', indent: 0 },
        { text: 'for ch in word:', indent: 0 },
        { text: 'if ch not in node:', indent: 1 },
        { text: 'found = False', indent: 2 },
        { text: 'break', indent: 2 },
        { text: 'node = node[ch]', indent: 1 },
        { text: "found = found and node.get('$', False)", indent: 0 },
      ],
      distractors: [
        { text: 'node = root[ch]', indent: 1, misconceptionId: 'descends-into-self' },
      ],
      blanks: [
        {
          lineIndex: 3,
          token: 'ch not in node',
          options: ['ch not in node', 'ch not in word', 'ch not in node[ch]'],
          misconceptionByOption: {
            'ch not in word': 'membership-on-value',
            'ch not in node[ch]': 'membership-on-value',
          },
        },
        {
          lineIndex: 6,
          token: 'node[ch]',
          options: ['node[ch]', 'root[ch]'],
          misconceptionByOption: { 'root[ch]': 'descends-into-self' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'node = root',
        'found = True',
        'for ch in word:',
        '    if ch not in node:',
        '        found = False',
        '        ▢',
        '    node = node[ch]',
        "found = found and node.get('$', False)",
      ],
      blanks: [
        {
          lineIndex: 5,
          accept: ['break'],
          misconceptionByInput: {
            continue: 'no-break-keyerror',
            pass: 'no-break-keyerror',
          },
          placeholder: 'stop descending',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = root',
        'found = True',
        'for ⟦s2⟧ in word:',
        '    if ⟦s2⟧ not in ⟦s1⟧:',
        '        found = False',
        '        break',
        '    ⟦s1⟧ = ⟦s1⟧[⟦s2⟧]',
        "found = found and ⟦s1⟧.get('$', False)",
      ],
      slots: [
        { id: 's1', correctRole: 'current trie node' },
        { id: 's2', correctRole: 'current character' },
      ],
      roleBank: ['current trie node', 'current character', 'end marker', 'child count'],
    },
    {
      kind: 'write',
      functionName: 'trie_has_word',
      starterCode: `def trie_has_word(root, word):
    # root is a nested-dict trie; '$' marks a completed word.
    # Return True only if word was inserted in full.
    `,
      testCases: [
        {
          input: [{ c: { a: { t: { $: true }, r: { $: true } } } }, 'cat'],
          expected: true,
          label: 'stored word',
        },
        {
          input: [{ c: { a: { t: { $: true }, r: { $: true } } } }, 'ca'],
          expected: false,
          label: 'prefix only',
        },
        {
          input: [{ c: { a: { t: { $: true } } } }, 'car'],
          expected: false,
          hidden: true,
        },
        {
          input: [{ c: { a: { t: { $: true } } } }, 'cats'],
          expected: false,
          hidden: true,
        },
        {
          input: [{}, 'a'],
          expected: false,
          hidden: true,
        },
        {
          input: [{ a: { $: true } }, 'a'],
          expected: true,
          hidden: true,
        },
      ],
      parSeconds: 120,
      solution: `def trie_has_word(root, word):
    node = root
    found = True
    for ch in word:
        if ch not in node:
            found = False
            break
        node = node[ch]
    return bool(found and node.get('$', False))`,
    },
  ],
}

export default primitive
