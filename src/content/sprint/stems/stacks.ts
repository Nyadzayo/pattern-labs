import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'stacks-01',
    text: 'A string mixes three kinds of brackets. Decide whether every opening bracket is closed by the right kind, in the right order.',
    pattern: 'stacks',
    lookalikes: ['hash-maps-sets', 'backtracking', 'trees'],
    tell: 'Nested open/close that must match most-recent-first → push each opener and pop when its matching closer arrives.',
  },
  {
    id: 'stacks-02',
    text: 'For each day in a temperature log, report how many days you must wait until a warmer day (0 if none).',
    pattern: 'stacks',
    lookalikes: ['heaps', 'sliding-windows', 'two-pointers'],
    tell: '"Next greater element to the right" for every position → a monotonic stack holding indices still waiting to be resolved.',
  },
  {
    id: 'stacks-03',
    text: 'Evaluate an arithmetic expression written in reverse Polish (postfix) notation.',
    pattern: 'stacks',
    lookalikes: ['trees', 'math-geometry', 'backtracking'],
    tell: 'Each operator acts on the two most recent results → push operands, and on an operator pop two and push the outcome.',
  },
  {
    id: 'stacks-04',
    text: 'Design a structure supporting push, pop, and a getMin that returns the current minimum, all in constant time.',
    pattern: 'stacks',
    lookalikes: ['heaps', 'hash-maps-sets', 'two-pointers'],
    tell: 'Constant-time min alongside LIFO push/pop → carry the running minimum beside each pushed value (a heap would be log-time and cannot pop in LIFO order).',
  },
]

export default stems
