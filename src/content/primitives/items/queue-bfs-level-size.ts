import type { Primitive } from '../types'

/**
 * BFS by level size: snapshot len(queue) at the top of each pass, then pop
 * exactly that many nodes. Each pass drains one whole level — the backbone of
 * level-order traversal, shortest unweighted distance, and per-depth grouping.
 */
const primitive: Primitive = {
  id: 'queue-bfs-level-size',
  name: 'BFS by level size',
  category: 'stack-queue',
  snippet: `q = deque([start])
seen = {start}
levels = 0
while q:
    size = len(q)
    levels += 1
    for _ in range(size):
        node = q.popleft()
        for nxt in graph[node]:
            if nxt not in seen:
                seen.add(nxt)
                q.append(nxt)`,
  why: 'Read size = len(q) before draining the queue: that count is the current level. for _ in range(size) pops exactly those nodes while newly discovered neighbours queue behind them for the next pass, so each pass handles one full level.',
  moduleTags: ['graphs', 'trees'],
  misconceptions: [
    {
      id: 'size-recomputed',
      label: 'recomputes len(q) inside the inner loop',
      feedback:
        'Snapshot size = len(q) once before the inner loop. Looping over len(q) live keeps consuming nodes you just enqueued, collapsing every level into one pass.',
    },
    {
      id: 'wrong-end-pop',
      label: 'pops the wrong end of the queue',
      feedback:
        'BFS is FIFO: q.popleft() takes the oldest node. q.pop() takes the newest and turns the traversal into a DFS-like stack order.',
    },
    {
      id: 'no-seen-guard',
      label: 'enqueues without a visited guard',
      feedback:
        'Mark a node seen the moment you enqueue it. Without the if nxt not in seen check, shared neighbours get queued many times and levels is overcounted.',
    },
    {
      id: 'count-nodes-not-levels',
      label: 'counts nodes instead of levels',
      feedback:
        'levels increments once per outer pass — one per BFS level. Incrementing inside the inner loop counts individual nodes instead.',
    },
  ],
  rungs: [
    {
      kind: 'predict',
      markedLine: 5,
      prompt:
        'With graph = {0: [1, 2], 1: [3], 2: [3], 3: []} and start = 0, what is levels after the loop?',
      choices: ['3', '4', '2', '1'],
      correctIndex: 0,
      distractorMisconceptions: [null, 'no-seen-guard', 'size-recomputed', 'count-nodes-not-levels'],
      verify: {
        setup: `from collections import deque
graph = {0: [1, 2], 1: [3], 2: [3], 3: []}
start = 0`,
        mode: { expr: 'levels' },
      },
    },
    {
      kind: 'order',
      lines: [
        { text: 'q = deque([start])', indent: 0 },
        { text: 'seen = {start}', indent: 0 },
        { text: 'levels = 0', indent: 0 },
        { text: 'while q:', indent: 0 },
        { text: 'size = len(q)', indent: 1 },
        { text: 'levels += 1', indent: 1 },
        { text: 'for _ in range(size):', indent: 1 },
        { text: 'node = q.popleft()', indent: 2 },
        { text: 'for nxt in graph[node]:', indent: 2 },
        { text: 'if nxt not in seen:', indent: 3 },
        { text: 'seen.add(nxt)', indent: 4 },
        { text: 'q.append(nxt)', indent: 4 },
      ],
      distractors: [
        { text: 'node = q.pop()', indent: 2, misconceptionId: 'wrong-end-pop' },
      ],
    },
    {
      kind: 'fade',
      lines: [
        { text: 'q = deque([start])', indent: 0 },
        { text: 'seen = {start}', indent: 0 },
        { text: 'levels = 0', indent: 0 },
        { text: 'while q:', indent: 0 },
        { text: 'size = len(q)', indent: 1 },
        { text: 'levels += 1', indent: 1 },
        { text: 'for _ in range(size):', indent: 1 },
        { text: 'node = q.popleft()', indent: 2 },
        { text: 'for nxt in graph[node]:', indent: 2 },
        { text: 'if nxt not in seen:', indent: 3 },
        { text: 'seen.add(nxt)', indent: 4 },
        { text: 'q.append(nxt)', indent: 4 },
      ],
      distractors: [
        { text: 'levels += 1', indent: 2, misconceptionId: 'count-nodes-not-levels' },
      ],
      blanks: [
        {
          lineIndex: 4,
          token: 'len(q)',
          options: ['len(q)', 'size', 'len(graph)'],
          misconceptionByOption: { size: 'size-recomputed' },
        },
        {
          lineIndex: 7,
          token: 'q.popleft()',
          options: ['q.popleft()', 'q.pop()'],
          misconceptionByOption: { 'q.pop()': 'wrong-end-pop' },
        },
      ],
    },
    {
      kind: 'cloze',
      lines: [
        'q = deque([start])',
        'seen = {start}',
        'levels = 0',
        'while q:',
        '    size = len(q)',
        '    levels += 1',
        '    for _ in range(▢):',
        '        node = q.popleft()',
        '        for nxt in graph[node]:',
        '            if nxt not in seen:',
        '                seen.add(nxt)',
        '                q.append(nxt)',
      ],
      blanks: [
        {
          lineIndex: 6,
          accept: ['size'],
          misconceptionByInput: { 'len(q)': 'size-recomputed' },
          placeholder: 'snapshotted count',
        },
      ],
    },
    {
      kind: 'roles',
      lines: [
        '⟦s1⟧ = deque([start])',
        'seen = {start}',
        '⟦s2⟧ = 0',
        'while ⟦s1⟧:',
        '    ⟦s3⟧ = len(⟦s1⟧)',
        '    ⟦s2⟧ += 1',
        '    for _ in range(⟦s3⟧):',
        '        node = ⟦s1⟧.popleft()',
        '        for nxt in graph[node]:',
        '            if nxt not in seen:',
        '                seen.add(nxt)',
        '                ⟦s1⟧.append(nxt)',
      ],
      slots: [
        { id: 's1', correctRole: 'BFS queue' },
        { id: 's2', correctRole: 'level counter' },
        { id: 's3', correctRole: 'current level size' },
      ],
      roleBank: ['BFS queue', 'level counter', 'current level size', 'visited set'],
    },
    {
      kind: 'write',
      functionName: 'bfs_depth',
      starterCode: `def bfs_depth(graph, start):
    # Return the number of BFS levels reachable from start
    # (1 for just the start node, 2 once its neighbours are reached, ...).
    from collections import deque
    `,
      testCases: [
        {
          input: [{ a: ['b', 'c'], b: ['d'], c: ['d'], d: [] }, 'a'],
          expected: 3,
          label: 'diamond',
        },
        { input: [{ a: [] }, 'a'], expected: 1, label: 'single node' },
        {
          input: [{ a: ['b'], b: ['c'], c: ['d'], d: [] }, 'a'],
          expected: 4,
          hidden: true,
        },
        {
          input: [{ a: ['b', 'c', 'd'], b: [], c: [], d: [] }, 'a'],
          expected: 2,
          hidden: true,
        },
        { input: [{ a: ['b'], b: ['a'] }, 'a'], expected: 2, hidden: true },
      ],
      parSeconds: 150,
      solution: `def bfs_depth(graph, start):
    from collections import deque
    q = deque([start])
    seen = {start}
    levels = 0
    while q:
        size = len(q)
        levels += 1
        for _ in range(size):
            node = q.popleft()
            for nxt in graph[node]:
                if nxt not in seen:
                    seen.add(nxt)
                    q.append(nxt)
    return levels`,
    },
  ],
}

export default primitive
