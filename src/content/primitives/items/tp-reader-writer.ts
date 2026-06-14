import type { Primitive } from '../types'

/**
 * Reader / writer compaction: a write index trails a read index, copying only
 * the elements worth keeping. The in-place skeleton under remove-zeros,
 * remove-duplicates, and any "filter without a second array" task.
 */
const primitive: Primitive = {
  id: 'tp-reader-writer',
  name: 'Reader / writer compaction',
  category: 'two-pointers',
  snippet: `w = 0
for r in range(len(a)):
    if a[r] != 0:
        a[w] = a[r]
        w += 1`,
  why: 'The read pointer r visits every slot; the write pointer w only advances when an element is kept. Because w never gets ahead of r, the overwrite a[w] = a[r] is always safe, and w ends as the count of kept elements — the new length.',
  moduleTags: ['two-pointers', 'linked-lists'],
  misconceptions: [
    {
      id: 'advance-write-always',
      label: 'write pointer advances every step',
      feedback:
        'w must only move forward when you actually keep an element. Putting w += 1 outside the if (or advancing it on every r) leaves gaps and copies the discarded values too.',
    },
    {
      id: 'inverted-keep-test',
      label: 'keeps the wrong elements',
      feedback:
        'The condition selects what to KEEP. To drop zeros, keep the non-zeros: a[r] != 0. Writing a[r] == 0 keeps exactly the elements you meant to remove.',
    },
    {
      id: 'overwrite-with-write-index',
      label: 'copies from the write slot',
      feedback:
        'You read from the scan position and write to the compacted position: a[w] = a[r]. Reversing it to a[r] = a[w] corrupts the data the read pointer still has to visit.',
    },
    {
      id: 'count-includes-dropped',
      label: 'counts every element, not the kept ones',
      feedback:
        'w increments only inside the if, so it tallies kept elements. Counting all of range(len(a)) just gives the original length back.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 4,
      prompt: 'With a = [0, 3, 0, 5, 7, 0, 2], what is w after the loop finishes?',
      choices: ['4', '7', '3', '0'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'count-includes-dropped', 'inverted-keep-test', 'advance-write-always'],
      verify: { setup: 'a = [0, 3, 0, 5, 7, 0, 2]', mode: { expr: 'w' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'w = 0', indent: 0 },
        { text: 'for r in range(len(a)):', indent: 0 },
        { text: 'if a[r] != 0:', indent: 1 },
        { text: 'a[w] = a[r]', indent: 2 },
        { text: 'w += 1', indent: 2 },
      ],
      distractors: [
        { text: 'a[r] = a[w]', indent: 2, misconceptionId: 'overwrite-with-write-index' },
        { text: 'if a[r] == 0:', indent: 1, misconceptionId: 'inverted-keep-test' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'w = 0', indent: 0 },
        { text: 'for r in range(len(a)):', indent: 0 },
        { text: 'if a[r] != 0:', indent: 1 },
        { text: 'a[w] = a[r]', indent: 2 },
        { text: 'w += 1', indent: 2 },
      ],
      distractors: [{ text: 'w += 1', indent: 1, misconceptionId: 'advance-write-always' }],
      blanks: [
        {
          lineIndex: 2,
          token: 'a[r] != 0',
          options: ['a[r] != 0', 'a[r] == 0'],
          misconceptionByOption: { 'a[r] == 0': 'inverted-keep-test' },
        },
        {
          lineIndex: 3,
          token: 'a[w] = a[r]',
          options: ['a[w] = a[r]', 'a[r] = a[w]'],
          misconceptionByOption: { 'a[r] = a[w]': 'overwrite-with-write-index' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['w = 0', 'for r in range(len(a)):', '    if a[r] != 0:', '        ▢', '        ▢'],
      blanks: [
        {
          lineIndex: 3,
          accept: ['a[w] = a[r]', 'a[w]=a[r]'],
          misconceptionByInput: { 'a[r] = a[w]': 'overwrite-with-write-index', 'a[r]=a[w]': 'overwrite-with-write-index' },
          placeholder: 'copy kept value',
        },
        {
          lineIndex: 4,
          accept: ['w += 1', 'w+=1'],
          placeholder: 'advance write pointer',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = 0',
        'for ⟦s2⟧ in range(len(a)):',
        '    if a[⟦s2⟧] != 0:',
        '        a[⟦s1⟧] = a[⟦s2⟧]',
        '        ⟦s1⟧ += 1',
      ],
      slots: [
        { id: 's1', correctRole: 'write pointer' },
        { id: 's2', correctRole: 'read pointer' },
      ],
      roleBank: ['write pointer', 'read pointer', 'running total', 'loop bound'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Place the write cursor at the front',
          acceptableKeywords: ['initialize the write index', 'start write at zero', 'set up the slow cursor', 'write position at front'],
          hint: 'Before any element is kept, where does the destination cursor sit?',
          misconception: 'This sets the destination; the scan has not started.',
        },
        {
          lineRange: [3, 3],
          referenceLabel: 'Walk the read cursor across every slot',
          acceptableKeywords: ['scan every index', 'advance the read pointer', 'iterate all elements', 'visit each slot'],
          hint: 'Which positions does the reading pointer have to examine?',
          misconception: 'This visits every element; it does not decide what survives.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Decide whether this element is worth keeping',
          acceptableKeywords: ['test what to keep', 'check the keep condition', 'filter the elements', 'is it non-zero'],
          hint: 'What property separates the values you save from the ones you drop?',
          misconception: 'This selects survivors; the copy and advance happen only when it passes.',
        },
        {
          lineRange: [5, 6],
          referenceLabel: 'Copy the kept value forward and advance the write cursor',
          acceptableKeywords: ['copy to write slot', 'advance the write index', 'overwrite at the cursor', 'keep then step'],
          hint: 'When a value is kept, where does it go and how does the cursor react?',
          misconception: 'The write cursor moves only on a keep — this is not part of the read scan.',
        },
        {
          lineRange: [7, 7],
          referenceLabel: 'Return the count of kept elements',
          acceptableKeywords: ['return the write index', 'report the new length', 'count of survivors', 'kept element count'],
          hint: 'After compaction, what does the write cursor now represent?',
          misconception: 'The write index doubles as the new length; this reports it, it does not advance.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'remove_zeros',
      starterCode: `def remove_zeros(a):
    # Compact a in place so the non-zero values come first, in order.
    # Return the count of non-zero values (the new logical length).
    `,
      testCases: [
        { input: [[0, 3, 0, 5, 7, 0, 2]], expected: 4, label: 'mixed' },
        { input: [[1, 2, 3]], expected: 3, label: 'no zeros' },
        { input: [[0, 0, 0]], expected: 0, hidden: true },
        { input: [[]], expected: 0, hidden: true },
        { input: [[0, 0, 9]], expected: 1, hidden: true },
        { input: [[4, 0, 0, 0, 6]], expected: 2, hidden: true },
      ],
      parSeconds: 90,
      solution: `def remove_zeros(a):
    w = 0
    for r in range(len(a)):
        if a[r] != 0:
            a[w] = a[r]
            w += 1
    return w`,
    },
  ],
}

export default primitive
