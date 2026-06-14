import type { Primitive } from '../types'

/**
 * DFS base / recurse / combine: the three-part shape of almost every tree
 * recursion. A base case stops the descent, recursive calls handle the
 * children, and a combine step folds the children's answers into this node's.
 * Here it computes the max depth of a tree stored as nested plain dicts.
 */
const primitive: Primitive = {
  id: 'rec-dfs-combine',
  name: 'DFS base / recurse / combine',
  category: 'recursion',
  snippet: `def dfs(node):
    if node is None:
        return 0
    return 1 + max(dfs(node.get('left')), dfs(node.get('right')))`,
  why: 'Every tree DFS has the same skeleton: a base case for the empty subtree, recursive calls on each child, and a combine step that merges the children’s results into this node’s answer. Get those three parts right and the recursion writes itself.',
  moduleTags: ['trees', 'graphs'],
  misconceptions: [
    {
      id: 'missing-base-case',
      label: 'no base case',
      feedback:
        'Without "if node is None: return 0", calling node.get(...) on None raises AttributeError and the recursion never bottoms out. The empty subtree contributes depth 0.',
    },
    {
      id: 'forgets-plus-one',
      label: 'forgets to count this node',
      feedback:
        'The current node adds one level of depth. Returning just max(...) without the leading "1 +" reports 0 for every tree.',
    },
    {
      id: 'min-not-max',
      label: 'combines with min instead of max',
      feedback:
        'Max depth is the longest root-to-leaf path, so combine the children with max. Using min gives the shortest path instead.',
    },
    {
      id: 'sums-children',
      label: 'adds children instead of taking the deeper one',
      feedback:
        'Adding both child results counts nodes, not depth. Take max(left, right) to follow only the deeper branch.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 3,
      prompt:
        "With tree = {'left': {'left': None, 'right': None}, 'right': {'left': {'left': None, 'right': None}, 'right': None}}, what does dfs(tree) return?",
      choices: ['3', '2', '0', '4'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'min-not-max', 'forgets-plus-one', 'sums-children'],
      verify: {
        setup:
          "tree = {'left': {'left': None, 'right': None}, 'right': {'left': {'left': None, 'right': None}, 'right': None}}",
        mode: { expr: 'dfs(tree)' },
      },
    },
    {
      kind: 'order',
      lines: [
        { text: 'def dfs(node):', indent: 0 },
        { text: 'if node is None:', indent: 1 },
        { text: 'return 0', indent: 2 },
        { text: "return 1 + max(dfs(node.get('left')), dfs(node.get('right')))", indent: 1 },
      ],
      distractors: [
        {
          text: "return 1 + dfs(node.get('left')) + dfs(node.get('right'))",
          indent: 1,
          misconceptionId: 'sums-children',
        },
        {
          text: "return 1 + max(dfs(node['left']), dfs(node['right']))",
          indent: 1,
          misconceptionId: 'missing-base-case',
        },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'def dfs(node):', indent: 0 },
        { text: 'if node is None:', indent: 1 },
        { text: 'return 0', indent: 2 },
        { text: "return 1 + max(dfs(node.get('left')), dfs(node.get('right')))", indent: 1 },
      ],
      distractors: [
        {
          text: "return max(dfs(node.get('left')), dfs(node.get('right')))",
          indent: 1,
          misconceptionId: 'forgets-plus-one',
        },
      ],
      blanks: [
        {
          lineIndex: 3,
          token: 'max',
          options: ['max', 'min', 'sum'],
          misconceptionByOption: { min: 'min-not-max', sum: 'sums-children' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'def dfs(node):',
        '    if node is None:',
        '        return ▢',
        "    return 1 + max(dfs(node.get('left')), dfs(node.get('right')))",
      ],
      blanks: [
        {
          lineIndex: 2,
          accept: ['0'],
          placeholder: 'empty-subtree depth',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        'def dfs(⟦s1⟧):',
        '    if ⟦s1⟧ is None:',
        '        return 0',
        "    return 1 + max(dfs(⟦s1⟧.get('left')), dfs(⟦s1⟧.get('right')))",
      ],
      slots: [{ id: 's1', correctRole: 'current node' }],
      roleBank: ['current node', 'accumulated depth', 'child subtree', 'visited set'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 1],
          referenceLabel: 'Define the recursion over one node',
          acceptableKeywords: ['define the recursive function', 'take the current node', 'header for the descent', 'one node at a time'],
          hint: 'What single thing does each call receive?',
          misconception: 'This is just the signature — no decision is made here.',
        },
        {
          lineRange: [2, 3],
          referenceLabel: 'Stop at the empty subtree',
          acceptableKeywords: ['base case for none', 'empty subtree returns zero', 'stop the descent', 'guard against missing child'],
          hint: 'What ends the recursion so it does not run forever?',
          misconception: 'This halts the descent at nothing; it does not yet measure any real node.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Count this node atop the deeper child',
          acceptableKeywords: ['add one plus the deeper child', 'combine with max', 'take the longer branch', 'fold children into this answer'],
          hint: 'How does this node\'s answer fold in the bigger of its two children\'s answers?',
          misconception: 'This combines the children with max and adds one — adding both children would count nodes, not depth.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'max_depth',
      starterCode: `def max_depth(node):
    # node is a nested dict with 'left' and 'right' keys, or None.
    # Return the number of nodes on the longest root-to-leaf path.
    `,
      testCases: [
        {
          input: [{ left: null, right: null }],
          expected: 1,
          label: 'single node',
        },
        {
          input: [
            {
              left: { left: null, right: null },
              right: { left: { left: null, right: null }, right: null },
            },
          ],
          expected: 3,
          label: 'unbalanced',
        },
        { input: [null], expected: 0, hidden: true },
        {
          input: [{ left: { left: null, right: null }, right: { left: null, right: null } }],
          expected: 2,
          hidden: true,
        },
        {
          input: [
            {
              left: { left: { left: { left: null, right: null }, right: null }, right: null },
              right: null,
            },
          ],
          expected: 4,
          hidden: true,
        },
      ],
      parSeconds: 120,
      solution: `def max_depth(node):
    if node is None:
        return 0
    return 1 + max(max_depth(node.get('left')), max_depth(node.get('right')))`,
    },
  ],
}

export default primitive
