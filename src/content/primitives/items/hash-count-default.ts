import type { Primitive } from '../types'

/**
 * Count with get-default: tally occurrences into a dict, using .get(key, 0) so
 * the first sighting of a key starts cleanly at 1. The frequency-map workhorse.
 */
const primitive: Primitive = {
  id: 'hash-count-default',
  name: 'Count with get-default',
  category: 'hashing',
  snippet: `counts = {}
for ch in text:
    counts[ch] = counts.get(ch, 0) + 1`,
  why: 'counts.get(ch, 0) returns the running tally for ch, or 0 if it is the first sighting, so the same line handles new and repeat keys without a branch.',
  moduleTags: ['hash-maps-sets'],
  misconceptions: [
    {
      id: 'overwrites-each-time',
      label: 'resets the count to 1',
      feedback:
        'counts[ch] = 1 throws away the previous tally, so every key ends at 1. You want counts.get(ch, 0) + 1 to build on what is already there.',
    },
    {
      id: 'skips-first-occurrence',
      label: 'misses the first sighting',
      feedback:
        'get(ch, 0) counts the first occurrence too. In "banana", a appears at indices 1, 3, and 5 — three times, not two.',
    },
    {
      id: 'counts-total-not-per-key',
      label: 'counts the whole string',
      feedback:
        'This builds a per-character tally, not one running total. counts[ch] is how many times ch appeared, independent of the others.',
    },
    {
      id: 'missing-default',
      label: 'no default for new keys',
      feedback:
        'counts.get(ch) with no default returns None on the first sighting, and None + 1 raises TypeError. Pass 0 as the default.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 2,
      prompt: "With text = 'banana', what is counts['a'] after the loop?",
      choices: ['3', '1', '2', '6'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'overwrites-each-time', 'skips-first-occurrence', 'counts-total-not-per-key'],
      verify: { setup: "text = 'banana'", mode: { expr: "counts['a']" } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'counts = {}', indent: 0 },
        { text: 'for ch in text:', indent: 0 },
        { text: 'counts[ch] = counts.get(ch, 0) + 1', indent: 1 },
      ],
      distractors: [{ text: 'counts[ch] = 1', indent: 1, misconceptionId: 'overwrites-each-time' }],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'counts = {}', indent: 0 },
        { text: 'for ch in text:', indent: 0 },
        { text: 'counts[ch] = counts.get(ch, 0) + 1', indent: 1 },
      ],
      distractors: [
        { text: 'counts[ch] = counts.get(ch) + 1', indent: 1, misconceptionId: 'missing-default' },
      ],
      blanks: [
        {
          lineIndex: 2,
          token: 'counts.get(ch, 0)',
          options: ['counts.get(ch, 0)', 'counts.get(ch)', 'counts[ch]'],
          misconceptionByOption: { 'counts.get(ch)': 'missing-default', 'counts[ch]': 'missing-default' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: ['counts = {}', 'for ch in text:', '    counts[ch] = counts.get(ch, ▢) + 1'],
      blanks: [{ lineIndex: 2, accept: ['0'], placeholder: 'default' }],
    },
    {
      kind: 'roles',
      lines: ['⟦s1⟧ = {}', 'for ⟦s2⟧ in text:', '    ⟦s1⟧[⟦s2⟧] = ⟦s1⟧.get(⟦s2⟧, 0) + 1'],
      slots: [
        { id: 's1', correctRole: 'frequency map' },
        { id: 's2', correctRole: 'current element' },
      ],
      roleBank: ['frequency map', 'current element', 'running total', 'seen set'],
    },
    {
      kind: 'label',
      subgoals: [
        {
          lineRange: [1, 2],
          referenceLabel: 'Start an empty tally to collect counts into',
          acceptableKeywords: ['create an empty map', 'start the tally', 'empty dictionary', 'somewhere to count'],
          hint: 'Before counting anything, what container do you need ready?',
          misconception: 'This only prepares the storage; no counting has happened yet.',
        },
        {
          lineRange: [3, 4],
          referenceLabel: 'Walk each item and bump its count, defaulting new keys to zero',
          acceptableKeywords: ['increment the count', 'default missing to zero', 'add one per item', 'tally each element'],
          hint: 'How do you add one even the very first time a key appears?',
          misconception: 'This builds the counts; the default keeps a first sighting from crashing, but it does not reset the tally.',
        },
        {
          lineRange: [5, 5],
          referenceLabel: 'Hand back the completed tally',
          acceptableKeywords: ['return the map', 'give back the counts', 'return the result', 'output the tally'],
          hint: 'Once every item is counted, what does the caller get?',
          misconception: 'This only returns the finished map; it does no counting itself.',
        },
      ],
    },
    {
      kind: 'write',
      functionName: 'char_counts',
      starterCode: `def char_counts(text):
    # Return a dict mapping each character of text to how many times it appears.
    `,
      testCases: [
        { input: ['banana'], expected: { b: 1, a: 3, n: 2 }, label: 'banana' },
        { input: [''], expected: {}, label: 'empty' },
        { input: ['aaa'], expected: { a: 3 }, hidden: true },
        { input: ['abcabc'], expected: { a: 2, b: 2, c: 2 }, hidden: true },
        { input: ['z'], expected: { z: 1 }, hidden: true },
      ],
      parSeconds: 60,
      solution: `def char_counts(text):
    counts = {}
    for ch in text:
        counts[ch] = counts.get(ch, 0) + 1
    return counts`,
    },
  ],
}

export default primitive
