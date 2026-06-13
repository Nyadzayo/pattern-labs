import type { Primitive } from '../types'

/**
 * Loop-and-a-half / early exit: a `while True` loop that does some work, then
 * tests for the exit condition in the *middle* and breaks. The break-in-the-
 * middle shape under "advance until you land on the target / sentinel".
 */
const primitive: Primitive = {
  id: 'loop-and-a-half',
  name: 'Loop-and-a-half / early exit',
  category: 'loops',
  snippet: `count = 0
value = start
while True:
    count += 1
    if value == target:
        break
    value += 1`,
  why: 'When the natural exit test lands in the middle of the loop body, write while True and break there. The work above the break always runs; the work below it is skipped on the exit step.',
  moduleTags: ['linked-lists', 'fast-slow-pointers'],
  misconceptions: [
    {
      id: 'breaks-before-counting',
      label: 'tests before doing the work',
      feedback:
        'The point of loop-and-a-half is that the work above the break runs on every iteration, including the exit step. Checking the target before count += 1 drops the final step from the count.',
    },
    {
      id: 'wrong-exit-comparison',
      label: 'wrong exit condition',
      feedback:
        'break should fire the instant value equals target. Using value != target inverts the test, so it breaks on the very first step instead of at the target.',
    },
    {
      id: 'forgets-to-advance',
      label: 'never advances value',
      feedback:
        'Without value += 1 below the break, value never reaches target and the while True loop spins forever.',
    },
    {
      id: 'while-condition-instead',
      label: 'puts the test in the while header',
      feedback:
        'Hoisting the test into while value != target turns this into an ordinary pre-checked loop, which cannot run the body once when start already equals target.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 4,
      prompt: 'With start = 3 and target = 7, what is count after the loop breaks?',
      choices: ['5', '4', '1', '0'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'breaks-before-counting', 'wrong-exit-comparison', 'forgets-to-advance'],
      verify: { setup: 'start = 3\ntarget = 7', mode: { expr: 'count' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'count = 0', indent: 0 },
        { text: 'value = start', indent: 0 },
        { text: 'while True:', indent: 0 },
        { text: 'count += 1', indent: 1 },
        { text: 'if value == target:', indent: 1 },
        { text: 'break', indent: 2 },
        { text: 'value += 1', indent: 1 },
      ],
      distractors: [
        { text: 'while value != target:', indent: 0, misconceptionId: 'while-condition-instead' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'count = 0', indent: 0 },
        { text: 'value = start', indent: 0 },
        { text: 'while True:', indent: 0 },
        { text: 'count += 1', indent: 1 },
        { text: 'if value == target:', indent: 1 },
        { text: 'break', indent: 2 },
        { text: 'value += 1', indent: 1 },
      ],
      distractors: [
        { text: 'if value != target:', indent: 1, misconceptionId: 'wrong-exit-comparison' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'True',
          options: ['True', 'value != target', 'False'],
          misconceptionByOption: { 'value != target': 'while-condition-instead' },
        },
        {
          lineIndex: 5,
          token: 'break',
          options: ['break', 'continue', 'pass'],
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'count = 0',
        'value = start',
        'while True:',
        '    count += 1',
        '    if value ▢ target:',
        '        break',
        '    value += 1',
      ],
      blanks: [
        {
          lineIndex: 4,
          accept: ['=='],
          misconceptionByInput: { '!=': 'wrong-exit-comparison' },
          placeholder: 'comparison',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = 0',
        '⟦s2⟧ = start',
        'while True:',
        '    ⟦s1⟧ += 1',
        '    if ⟦s2⟧ == ⟦s3⟧:',
        '        break',
        '    ⟦s2⟧ += 1',
      ],
      slots: [
        { id: 's1', correctRole: 'step counter' },
        { id: 's2', correctRole: 'moving cursor' },
        { id: 's3', correctRole: 'exit target' },
      ],
      roleBank: ['step counter', 'moving cursor', 'exit target', 'loop bound'],
    },
    {
      kind: 'write',
      functionName: 'steps_to_reach',
      starterCode: `def steps_to_reach(start, target):
    # Count how many +1 steps it takes to go from start up to target,
    # counting the step that lands on target. Assume target >= start.
    `,
      testCases: [
        { input: [3, 7], expected: 5, label: 'forward' },
        { input: [4, 4], expected: 1, label: 'already there' },
        { input: [0, 1], expected: 2, hidden: true },
        { input: [10, 15], expected: 6, hidden: true },
        { input: [-2, 2], expected: 5, hidden: true },
      ],
      parSeconds: 90,
      solution: `def steps_to_reach(start, target):
    count = 0
    value = start
    while True:
        count += 1
        if value == target:
            break
        value += 1
    return count`,
    },
  ],
}

export default primitive
