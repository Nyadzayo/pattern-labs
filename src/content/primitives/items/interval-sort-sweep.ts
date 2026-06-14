import type { Primitive } from '../types'

/**
 * Sort + sweep-merge overlaps: order intervals by start, then walk left to
 * right folding each one into the last kept interval whenever it overlaps.
 * The backbone of every "merge overlapping intervals" problem.
 */
const primitive: Primitive = {
  id: 'interval-sort-sweep',
  name: 'Sort + sweep-merge overlaps',
  category: 'arrays',
  snippet: `intervals.sort()
merged = []
for s, e in intervals:
    if merged and s <= merged[-1][1]:
        merged[-1][1] = max(merged[-1][1], e)
    else:
        merged.append([s, e])`,
  why: 'Sorting by start guarantees every overlap is adjacent, so one left-to-right sweep settles them all. Compare each start against the last kept interval\'s end: overlap means extend that end, otherwise open a new interval.',
  moduleTags: ['intervals', 'greedy', 'sort-search'],
  misconceptions: [
    {
      id: 'forgets-sort',
      label: 'sweeps without sorting first',
      feedback:
        'Without intervals.sort(), overlapping pieces are not adjacent, so the sweep compares against the wrong neighbor and merges the input in arrival order.',
    },
    {
      id: 'strict-less-than',
      label: 'uses strict < so touching intervals split',
      feedback:
        's <= merged[-1][1] merges intervals that touch at a boundary (start equals previous end). Using s < merged[-1][1] leaves those as two separate intervals.',
    },
    {
      id: 'overwrites-end',
      label: 'assigns e instead of max(prev_end, e)',
      feedback:
        'A later interval can end before the current merged end (it sits fully inside). max(merged[-1][1], e) keeps the larger end; assigning e alone can shrink the interval.',
    },
    {
      id: 'always-extends',
      label: 'never opens a new interval',
      feedback:
        'When the current start sits past the last end there is no overlap. You must append [s, e] as a fresh interval instead of extending the previous one.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 1,
      prompt:
        'With intervals = [[2, 5], [1, 9], [9, 11], [3, 4]], what is merged after the loop?',
      choices: ['[[1, 11]]', '[[2, 11]]', '[[1, 9], [9, 11]]', '[[1, 4], [9, 11]]'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'forgets-sort', 'strict-less-than', 'overwrites-end'],
      verify: {
        setup: 'intervals = [[2, 5], [1, 9], [9, 11], [3, 4]]',
        mode: { expr: 'merged' },
      },
    },
    {
      kind: 'order',
      lines: [
        { text: 'intervals.sort()', indent: 0 },
        { text: 'merged = []', indent: 0 },
        { text: 'for s, e in intervals:', indent: 0 },
        { text: 'if merged and s <= merged[-1][1]:', indent: 1 },
        { text: 'merged[-1][1] = max(merged[-1][1], e)', indent: 2 },
        { text: 'else:', indent: 1 },
        { text: 'merged.append([s, e])', indent: 2 },
      ],
      distractors: [
        { text: 'if merged and s < merged[-1][1]:', indent: 1, misconceptionId: 'strict-less-than' },
        { text: 'merged[-1][1] = e', indent: 2, misconceptionId: 'overwrites-end' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'intervals.sort()', indent: 0 },
        { text: 'merged = []', indent: 0 },
        { text: 'for s, e in intervals:', indent: 0 },
        { text: 'if merged and s <= merged[-1][1]:', indent: 1 },
        { text: 'merged[-1][1] = max(merged[-1][1], e)', indent: 2 },
        { text: 'else:', indent: 1 },
        { text: 'merged.append([s, e])', indent: 2 },
      ],
      distractors: [
        { text: 'merged.append(e)', indent: 2, misconceptionId: 'always-extends' },
      ],
      blanks: [
        {
          lineIndex: 3,
          token: 's <= merged[-1][1]',
          options: ['s <= merged[-1][1]', 's < merged[-1][1]', 's >= merged[-1][1]'],
          misconceptionByOption: { 's < merged[-1][1]': 'strict-less-than' },
        },
        {
          lineIndex: 4,
          token: 'max(merged[-1][1], e)',
          options: ['max(merged[-1][1], e)', 'e', 'min(merged[-1][1], e)'],
          misconceptionByOption: { e: 'overwrites-end', 'min(merged[-1][1], e)': 'overwrites-end' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'intervals.sort()',
        'merged = []',
        'for s, e in intervals:',
        '    if merged and s ▢ merged[-1][1]:',
        '        merged[-1][1] = ▢',
        '    else:',
        '        merged.append([s, e])',
      ],
      blanks: [
        {
          lineIndex: 3,
          accept: ['<='],
          misconceptionByInput: { '<': 'strict-less-than' },
          placeholder: 'overlap test',
        },
        {
          lineIndex: 4,
          accept: ['max(merged[-1][1], e)', 'max(merged[-1][1],e)', 'max(e, merged[-1][1])'],
          misconceptionByInput: { e: 'overwrites-end' },
          placeholder: 'new end',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        'intervals.sort()',
        '⟦s1⟧ = []',
        'for ⟦s2⟧, ⟦s3⟧ in intervals:',
        '    if ⟦s1⟧ and ⟦s2⟧ <= ⟦s1⟧[-1][1]:',
        '        ⟦s1⟧[-1][1] = max(⟦s1⟧[-1][1], ⟦s3⟧)',
        '    else:',
        '        ⟦s1⟧.append([⟦s2⟧, ⟦s3⟧])',
      ],
      slots: [
        { id: 's1', correctRole: 'kept intervals' },
        { id: 's2', correctRole: 'current start' },
        { id: 's3', correctRole: 'current end' },
      ],
      roleBank: ['kept intervals', 'current start', 'current end', 'sort key'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Order the inputs so overlaps become neighbors',
          acceptableKeywords: ['sort by start', 'order the intervals', 'make overlaps adjacent', 'sort first'],
          hint: 'What arrangement guarantees overlapping pieces sit next to each other?',
          misconception: 'This only reorders the data; nothing has been merged or stored yet.',
        },
        {
          lineRange: [3, 3],
          referenceLabel: 'Start an empty bucket of kept results',
          acceptableKeywords: ['initialize output', 'empty result list', 'bucket of kept intervals', 'start accumulator'],
          hint: 'Where will the surviving intervals be collected?',
          misconception: 'This prepares the output container — it does not yet decide overlaps.',
        },
        {
          lineRange: [4, 4],
          referenceLabel: 'Walk each piece left to right',
          acceptableKeywords: ['loop over intervals', 'sweep one at a time', 'visit each piece', 'iterate in order'],
          hint: 'How does the single pass move through the ordered pieces?',
          misconception: 'This drives the sweep; it does not itself test for overlap.',
        },
        {
          lineRange: [5, 6],
          referenceLabel: 'Overlap with the last kept piece, so stretch its far edge',
          acceptableKeywords: ['extend the last end', 'merge overlap', 'stretch the interval', 'absorb into previous'],
          hint: 'When the current piece touches the one already kept, what changes?',
          misconception: 'This grows an existing interval — it is not the case that opens a new one.',
        },
        {
          lineRange: [7, 8],
          referenceLabel: 'No overlap, so begin a fresh kept piece',
          acceptableKeywords: ['open new interval', 'append fresh piece', 'start a separate interval', 'add as new'],
          hint: 'When the current piece sits past everything kept, what should happen?',
          misconception: 'This records a disjoint interval — it is the opposite of extending the previous one.',
        },
        {
          lineRange: [9, 9],
          referenceLabel: 'Hand back the settled collection',
          acceptableKeywords: ['return merged', 'give back result', 'return the kept list', 'output the answer'],
          hint: 'After the sweep is done, what does the function produce?',
          misconception: 'Reaching here means every piece has been placed; this is just the handoff.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'merge_intervals',
      starterCode: `def merge_intervals(intervals):
    # Merge all overlapping intervals and return the list, sorted by start.
    # Each interval is a [start, end] list.
    `,
      testCases: [
        {
          input: [[[1, 3], [2, 6], [8, 10], [15, 18]]],
          expected: [[1, 6], [8, 10], [15, 18]],
          label: 'classic merge',
        },
        { input: [[[1, 4], [4, 5]]], expected: [[1, 5]], label: 'touching boundary' },
        { input: [[]], expected: [], hidden: true },
        { input: [[[5, 7]]], expected: [[5, 7]], hidden: true },
        { input: [[[2, 5], [1, 9], [9, 11], [3, 4]]], expected: [[1, 11]], hidden: true },
        { input: [[[6, 8], [1, 3], [2, 5]]], expected: [[1, 5], [6, 8]], hidden: true },
      ],
      parSeconds: 150,
      solution: `def merge_intervals(intervals):
    intervals.sort()
    merged = []
    for s, e in intervals:
        if merged and s <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])
    return merged`,
    },
  ],
}

export default primitive
