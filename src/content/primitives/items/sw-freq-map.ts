import type { Primitive } from '../types'

/**
 * Window frequency map: as a fixed-size window slides right, increment the
 * count of the entering element and decrement the count of the leaving one,
 * deleting a key the moment its count hits 0. The bookkeeping under
 * "longest substring with k distinct", anagram windows, and frequency checks.
 */
const primitive: Primitive = {
  id: 'sw-freq-map',
  name: 'Window frequency map add/remove',
  category: 'sliding-window',
  snippet: `freq = {}
left = 0
for right in range(len(a)):
    freq[a[right]] = freq.get(a[right], 0) + 1
    if right - left + 1 > k:
        freq[a[left]] -= 1
        if freq[a[left]] == 0:
            del freq[a[left]]
        left += 1`,
  why: 'A window keeps a live tally only if every step does both halves: add the element entering on the right, subtract the element leaving on the left, and drop a key once its count reaches 0 so len(freq) is the true number of distinct values inside the window.',
  moduleTags: ['sliding-windows', 'hash-maps-sets'],
  misconceptions: [
    {
      id: 'forgets-delete',
      label: 'never deletes zeroed keys',
      feedback:
        'When a count drops to 0 the key still sits in the dict, so len(freq) keeps counting values that already left the window. del freq[a[left]] removes it once it hits 0.',
    },
    {
      id: 'remove-wrong-side',
      label: 'decrements the entering element',
      feedback:
        'The element leaving the window is a[left], not a[right]. Decrement freq[a[left]] — a[right] is the one you just added.',
    },
    {
      id: 'counts-all-seen',
      label: 'counts every element ever seen',
      feedback:
        'freq is the tally for the current window only, not a running log of the whole array. Each slide removes the leaving element, so old values disappear from the map.',
    },
    {
      id: 'shrink-too-early',
      label: 'shrinks before the window is full',
      feedback:
        'The window has size right - left + 1. Shrink only when it exceeds k (> k). Using >= k evicts an element the moment the window first reaches k, so it never actually holds k elements.',
    },
    {
      id: 'default-count-one',
      label: 'wrong default in .get',
      feedback:
        'freq.get(a[right], 0) returns 0 for a brand-new key so the first occurrence becomes 1. A default of 1 would make the first sighting count as 2.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 8,
      prompt:
        'With a = [1, 2, 1, 3, 3, 3] and k = 3, what is len(freq) after the loop finishes?',
      choices: ['1', '3', '2', '6'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'forgets-delete', 'remove-wrong-side', 'counts-all-seen'],
      verify: { setup: 'a = [1, 2, 1, 3, 3, 3]\nk = 3', mode: { expr: 'len(freq)' } },
    },
    {
      kind: 'order',
      lines: [
        { text: 'freq = {}', indent: 0 },
        { text: 'left = 0', indent: 0 },
        { text: 'for right in range(len(a)):', indent: 0 },
        { text: 'freq[a[right]] = freq.get(a[right], 0) + 1', indent: 1 },
        { text: 'if right - left + 1 > k:', indent: 1 },
        { text: 'freq[a[left]] -= 1', indent: 2 },
        { text: 'if freq[a[left]] == 0:', indent: 2 },
        { text: 'del freq[a[left]]', indent: 3 },
        { text: 'left += 1', indent: 2 },
      ],
      distractors: [
        { text: 'freq[a[right]] -= 1', indent: 2, misconceptionId: 'remove-wrong-side' },
        { text: 'if right - left + 1 >= k:', indent: 1, misconceptionId: 'shrink-too-early' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'freq = {}', indent: 0 },
        { text: 'left = 0', indent: 0 },
        { text: 'for right in range(len(a)):', indent: 0 },
        { text: 'freq[a[right]] = freq.get(a[right], 0) + 1', indent: 1 },
        { text: 'if right - left + 1 > k:', indent: 1 },
        { text: 'freq[a[left]] -= 1', indent: 2 },
        { text: 'if freq[a[left]] == 0:', indent: 2 },
        { text: 'del freq[a[left]]', indent: 3 },
        { text: 'left += 1', indent: 2 },
      ],
      distractors: [
        { text: 'del freq[a[right]]', indent: 3, misconceptionId: 'remove-wrong-side' },
      ],
      blanks: [
        {
          lineIndex: 3,
          token: '0',
          options: ['0', '1'],
          misconceptionByOption: { '1': 'default-count-one' },
        },
        {
          lineIndex: 4,
          token: '>',
          options: ['>', '>='],
          misconceptionByOption: { '>=': 'shrink-too-early' },
        },
        {
          lineIndex: 5,
          token: 'a[left]',
          options: ['a[left]', 'a[right]'],
          misconceptionByOption: { 'a[right]': 'remove-wrong-side' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'freq = {}',
        'left = 0',
        'for right in range(len(a)):',
        '    freq[a[right]] = freq.get(a[right], 0) + 1',
        '    if right - left + 1 > k:',
        '        freq[▢] -= 1',
        '        if freq[a[left]] == 0:',
        '            del freq[a[left]]',
        '        left += 1',
      ],
      blanks: [
        {
          lineIndex: 5,
          accept: ['a[left]'],
          misconceptionByInput: { 'a[right]': 'remove-wrong-side' },
          placeholder: 'leaving element',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        'freq = {}',
        '⟦s1⟧ = 0',
        'for ⟦s2⟧ in range(len(a)):',
        '    freq[a[⟦s2⟧]] = freq.get(a[⟦s2⟧], 0) + 1',
        '    if ⟦s2⟧ - ⟦s1⟧ + 1 > k:',
        '        freq[a[⟦s1⟧]] -= 1',
        '        if freq[a[⟦s1⟧]] == 0:',
        '            del freq[a[⟦s1⟧]]',
        '        ⟦s1⟧ += 1',
      ],
      slots: [
        { id: 's1', correctRole: 'left edge of window' },
        { id: 's2', correctRole: 'right edge of window' },
      ],
      roleBank: [
        'left edge of window',
        'right edge of window',
        'window size limit',
        'distinct count',
      ],
    },
    {
      kind: 'write',
      functionName: 'max_distinct_in_window',
      starterCode: `def max_distinct_in_window(a, k):
    # Slide a window of size k across a, maintaining a frequency map.
    # Return the most distinct values any single window of size k contains.
    # If len(a) < k, return 0.
    `,
      testCases: [
        { input: [[1, 2, 1, 3, 3, 3], 3], expected: 3, label: 'shrinking window' },
        { input: [[1, 2, 3], 3], expected: 3, label: 'whole array' },
        { input: [[5, 5, 5, 5], 2], expected: 1, hidden: true },
        { input: [[1, 2, 1, 2, 3], 2], expected: 2, hidden: true },
        { input: [[4, 4, 5, 6], 2], expected: 2, hidden: true },
        { input: [[7], 2], expected: 0, hidden: true },
      ],
      parSeconds: 150,
      solution: `def max_distinct_in_window(a, k):
    freq = {}
    left = 0
    best = 0
    for right in range(len(a)):
        freq[a[right]] = freq.get(a[right], 0) + 1
        if right - left + 1 > k:
            freq[a[left]] -= 1
            if freq[a[left]] == 0:
                del freq[a[left]]
            left += 1
        if right - left + 1 == k:
            best = max(best, len(freq))
    return best`,
    },
  ],
}

export default primitive
