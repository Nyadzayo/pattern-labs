import type { Primitive } from '../types'

/**
 * Set-bit scan (Brian Kernighan): clear the lowest set bit each step so the
 * loop runs once per 1-bit. The core idiom under popcount, power-of-two checks,
 * and Hamming-distance counting.
 */
const primitive: Primitive = {
  id: 'loop-bit-scan',
  name: 'Scan set bits',
  category: 'loops',
  snippet: `count = 0
while x:
    x &= x - 1
    count += 1`,
  why: 'x &= x - 1 erases only the lowest set bit, so the loop body runs exactly once for each 1-bit — making it O(number of set bits) rather than O(bit width).',
  moduleTags: ['bit-manipulation', 'math-geometry'],
  misconceptions: [
    {
      id: 'shift-counts-all-bits',
      label: 'counts bit positions, not set bits',
      feedback:
        'Shifting x >>= 1 every step walks all bit positions, so the loop runs once per bit of width. x &= x - 1 jumps straight to the next 1-bit, running only as many times as there are set bits.',
    },
    {
      id: 'or-never-terminates',
      label: 'uses | instead of &',
      feedback:
        'x &= x - 1 turns the lowest 1-bit off, shrinking x toward 0. x |= x - 1 sets bits instead and x never reaches 0, so the while loop spins forever.',
    },
    {
      id: 'plus-one-not-minus',
      label: 'adds one instead of subtracting',
      feedback:
        'The trick is x & (x - 1): subtracting 1 flips the lowest set bit and the zeros below it, and the AND clears that bit. x & (x + 1) does something different and will not clear the lowest set bit.',
    },
    {
      id: 'forgets-increment',
      label: 'never tallies the cleared bits',
      feedback:
        'Without count += 1 inside the loop, the bits get cleared but nothing records how many — count stays at its initial 0.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: 'With x = 45 (binary 101101), what is count after the loop finishes?',
      choices: ['4', '6', '0', '45'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'shift-counts-all-bits', 'forgets-increment', 'or-never-terminates'],
      verify: { setup: 'x = 45', mode: { expr: 'count' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'count = 0', indent: 0 },
        { text: 'while x:', indent: 0 },
        { text: 'x &= x - 1', indent: 1 },
        { text: 'count += 1', indent: 1 },
      ],
      distractors: [
        { text: 'x >>= 1', indent: 1, misconceptionId: 'shift-counts-all-bits' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'count = 0', indent: 0 },
        { text: 'while x:', indent: 0 },
        { text: 'x &= x - 1', indent: 1 },
        { text: 'count += 1', indent: 1 },
      ],
      distractors: [
        { text: 'x |= x - 1', indent: 1, misconceptionId: 'or-never-terminates' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'x - 1',
          options: ['x - 1', 'x + 1', 'x >> 1'],
          misconceptionByOption: { 'x + 1': 'plus-one-not-minus', 'x >> 1': 'shift-counts-all-bits' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['count = 0', 'while x:', '    x ▢ x - 1', '    count += 1'],
      blanks: [
        {
          lineIndex: 2,
          accept: ['&=', '&= '],
          misconceptionByInput: { '|=': 'or-never-terminates' },
          placeholder: 'update op',
        },
      ],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = 0', 'while ⟦s2⟧:', '    ⟦s2⟧ &= ⟦s2⟧ - 1', '    ⟦s1⟧ += 1'],
      slots: [
        { id: 's1', correctRole: 'set-bit tally' },
        { id: 's2', correctRole: 'value being cleared' },
      ],
      roleBank: ['set-bit tally', 'value being cleared', 'loop index', 'bit width'],
    },
    {
      kind: 'write',
      functionName: 'count_set_bits',
      starterCode: `def count_set_bits(x):
    # Return how many 1-bits are in the binary form of x (x >= 0).
    `,
      testCases: [
        { input: [45], expected: 4, label: '101101' },
        { input: [0], expected: 0, label: 'zero' },
        { input: [7], expected: 3, hidden: true },
        { input: [8], expected: 1, hidden: true },
        { input: [255], expected: 8, hidden: true },
        { input: [1024], expected: 1, hidden: true },
      ],
      parSeconds: 90,
      solution: `def count_set_bits(x):
    count = 0
    while x:
        x &= x - 1
        count += 1
    return count`,
    },
  ],
}

export default primitive
