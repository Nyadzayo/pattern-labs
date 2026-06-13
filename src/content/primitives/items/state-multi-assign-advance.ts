import type { Primitive } from '../types'

/**
 * Multi-assign advance: roll several variables forward in one statement so each
 * new value reads from the OLD values. Python evaluates the whole right side
 * before binding anything, which is what makes the Fibonacci-style two-variable
 * roll work without a temporary.
 */
const primitive: Primitive = {
  id: 'state-multi-assign-advance',
  name: 'Multi-assign pointer advance',
  category: 'state',
  snippet: `a, b = 0, 1
for _ in range(n):
    a, b = b, a + b`,
  why: 'a, b = b, a + b advances both variables at once: Python fully evaluates the right-hand tuple from the OLD values before assigning, so no temporary is needed. The same trick walks a pair of pointers down a linked list one step in lockstep.',
  moduleTags: ['linked-lists', 'fast-slow-pointers'],
  misconceptions: [
    {
      id: 'sequential-overwrite',
      label: 'assigns left to right, reusing the new value',
      feedback:
        'Tuple assignment is not two separate statements. a, b = b, a + b evaluates b and a + b from the OLD values first, then binds both. Writing a = b then b = a + b would feed the already-updated a back in and corrupt the sequence.',
    },
    {
      id: 'off-by-one-iterations',
      label: 'loops the wrong number of times',
      feedback:
        'range(n) runs the body exactly n times. Each step pushes a one Fibonacci position forward from a = 0, so after n steps a is the nth value.',
    },
    {
      id: 'wrong-seed',
      label: 'starts from the wrong seeds',
      feedback:
        'The roll needs a = 0, b = 1 to seed the sequence. Seeding a, b = 1, 1 (or any other pair) shifts every later value.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With n = 8, what is a after the loop finishes?',
      choices: ['21', '34', '13', '8'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'off-by-one-iterations', 'sequential-overwrite', 'wrong-seed'],
      verify: { setup: 'n = 8', mode: { expr: 'a' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'a, b = 0, 1', indent: 0 },
        { text: 'for _ in range(n):', indent: 0 },
        { text: 'a, b = b, a + b', indent: 1 },
      ],
      distractors: [
        { text: 'a, b = 1, 1', indent: 0, misconceptionId: 'wrong-seed' },
        { text: 'a = b; b = a + b', indent: 1, misconceptionId: 'sequential-overwrite' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'a, b = 0, 1', indent: 0 },
        { text: 'for _ in range(n):', indent: 0 },
        { text: 'a, b = b, a + b', indent: 1 },
      ],
      distractors: [
        { text: 'a = b; b = a + b', indent: 1, misconceptionId: 'sequential-overwrite' },
      ],
      blanks: [
        {
          lineIndex: 0,
          token: '0, 1',
          options: ['0, 1', '1, 1', '1, 0'],
          misconceptionByOption: { '1, 1': 'wrong-seed', '1, 0': 'wrong-seed' },
        },
        {
          lineIndex: 2,
          token: 'b, a + b',
          options: ['b, a + b', 'a + b, b', 'a, a + b'],
          misconceptionByOption: { 'a + b, b': 'sequential-overwrite', 'a, a + b': 'sequential-overwrite' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['a, b = 0, 1', 'for _ in range(n):', '    a, b = ▢'],
      blanks: [
        {
          lineIndex: 2,
          accept: ['b, a + b', 'b, b + a'],
          misconceptionByInput: { 'a + b, b': 'sequential-overwrite', 'a, a + b': 'sequential-overwrite' },
          placeholder: 'new a, new b',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧, ⟦s2⟧ = 0, 1', 'for _ in range(n):', '    ⟦s1⟧, ⟦s2⟧ = ⟦s2⟧, ⟦s1⟧ + ⟦s2⟧'],
      slots: [
        { id: 's1', correctRole: 'current value' },
        { id: 's2', correctRole: 'next value' },
      ],
      roleBank: ['current value', 'next value', 'loop counter', 'accumulator'],
    },
    {
      kind: 'write',
      functionName: 'fib',
      starterCode: `def fib(n):
    # Return the nth Fibonacci number, with fib(0) = 0 and fib(1) = 1.
    `,
      testCases: [
        { input: [0], expected: 0, label: 'seed a' },
        { input: [1], expected: 1, label: 'seed b' },
        { input: [2], expected: 1, hidden: true },
        { input: [8], expected: 21, hidden: true },
        { input: [12], expected: 144, hidden: true },
      ],
      parSeconds: 90,
      solution: `def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a`,
    },
  ],
}

export default primitive
