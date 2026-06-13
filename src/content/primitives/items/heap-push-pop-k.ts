import type { Primitive } from '../types'

/**
 * Bounded size-k heap: push every value, then pop the smallest whenever the
 * heap grows past k. A size-k MIN-heap ends up holding the k LARGEST values,
 * with the smallest of those (h[0]) being the kth largest overall.
 */
const primitive: Primitive = {
  id: 'heap-push-pop-k',
  name: 'Maintain a size-k heap',
  category: 'stack-queue',
  snippet: `h = []
for x in nums:
    heapq.heappush(h, x)
    if len(h) > k:
        heapq.heappop(h)`,
  why: 'To keep only the k largest values in O(n log k), push every element into a min-heap and pop the smallest whenever the heap exceeds size k. What survives is the k largest, and h[0] is the kth largest.',
  moduleTags: ['heaps'],
  misconceptions: [
    {
      id: 'max-heap-confusion',
      label: 'thinks a min-heap keeps the smallest',
      feedback:
        'A size-k min-heap evicts its smallest element each time it overflows, so the small values leave and the k LARGEST stay. h[0] is then the smallest survivor — the kth largest overall.',
    },
    {
      id: 'wrong-overflow-bound',
      label: 'pops at the wrong size',
      feedback:
        'Pop only once len(h) > k, so the heap settles at exactly k items. Popping when len(h) >= k leaves just k - 1 survivors and loses the kth largest.',
    },
    {
      id: 'forgets-pop',
      label: 'never evicts, heap grows to n',
      feedback:
        'Without the heappop the heap keeps every element, so h[0] is the global minimum, not the kth largest. The pop is what bounds the heap to size k.',
    },
    {
      id: 'pop-before-push',
      label: 'pops before pushing',
      feedback:
        'Push first, then check the size and pop. Popping before the push can drop the value you just intended to consider and underflows an empty heap.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 4,
      prompt:
        'With nums = [3, 1, 5, 12, 2, 11, 7, 9] and k = 3, what is h[0] after the loop (the 3rd largest)?',
      choices: ['9', '1', '12', '11'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'forgets-pop', 'max-heap-confusion', 'wrong-overflow-bound'],
      verify: {
        setup: `import heapq
nums = [3, 1, 5, 12, 2, 11, 7, 9]
k = 3`,
        mode: { expr: 'h[0]' },
      },
    },
    {
      kind: 'order',
      lines: [
        { text: 'h = []', indent: 0 },
        { text: 'for x in nums:', indent: 0 },
        { text: 'heapq.heappush(h, x)', indent: 1 },
        { text: 'if len(h) > k:', indent: 1 },
        { text: 'heapq.heappop(h)', indent: 2 },
      ],
      distractors: [
        { text: 'if len(h) >= k:', indent: 1, misconceptionId: 'wrong-overflow-bound' },
        { text: 'heapq.heappushpop(h, x)', indent: 1, misconceptionId: 'pop-before-push' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'h = []', indent: 0 },
        { text: 'for x in nums:', indent: 0 },
        { text: 'heapq.heappush(h, x)', indent: 1 },
        { text: 'if len(h) > k:', indent: 1 },
        { text: 'heapq.heappop(h)', indent: 2 },
      ],
      distractors: [
        { text: 'h.append(x)', indent: 1, misconceptionId: 'forgets-pop' },
      ],
      blanks: [
        {
          lineIndex: 3,
          token: '>',
          options: ['>', '>=', '=='],
          misconceptionByOption: { '>=': 'wrong-overflow-bound' },
        },
        {
          lineIndex: 4,
          token: 'heapq.heappop(h)',
          options: ['heapq.heappop(h)', 'heapq.heappush(h, x)'],
          misconceptionByOption: { 'heapq.heappush(h, x)': 'forgets-pop' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'h = []',
        'for x in nums:',
        '    heapq.heappush(h, x)',
        '    if len(h) > k:',
        '        ▢',
      ],
      blanks: [
        {
          lineIndex: 4,
          accept: ['heapq.heappop(h)'],
          misconceptionByInput: {
            'heapq.heappush(h, x)': 'forgets-pop',
            'h.pop()': 'max-heap-confusion',
          },
          placeholder: 'evict smallest',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = []',
        'for ⟦s2⟧ in nums:',
        '    heapq.heappush(⟦s1⟧, ⟦s2⟧)',
        '    if len(⟦s1⟧) > ⟦s3⟧:',
        '        heapq.heappop(⟦s1⟧)',
      ],
      slots: [
        { id: 's1', correctRole: 'size-k min-heap' },
        { id: 's2', correctRole: 'current value' },
        { id: 's3', correctRole: 'size cap' },
      ],
      roleBank: ['size-k min-heap', 'current value', 'size cap', 'running total'],
    },
    {
      kind: 'write',
      functionName: 'kth_largest',
      starterCode: `def kth_largest(nums, k):
    import heapq
    # Return the kth largest value in nums using a size-k min-heap.
    `,
      testCases: [
        { input: [[3, 2, 1, 5, 6, 4], 2], expected: 5, label: 'k=2' },
        { input: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4], expected: 4, label: 'with duplicates' },
        { input: [[1], 1], expected: 1, hidden: true },
        { input: [[7, 7, 7, 7], 2], expected: 7, hidden: true },
        { input: [[10, 9, 8, 7, 6, 5], 3], expected: 8, hidden: true },
        { input: [[2, 1], 2], expected: 1, hidden: true },
      ],
      parSeconds: 120,
      solution: `def kth_largest(nums, k):
    import heapq
    h = []
    for x in nums:
        heapq.heappush(h, x)
        if len(h) > k:
            heapq.heappop(h)
    return h[0]`,
    },
  ],
}

export default primitive
