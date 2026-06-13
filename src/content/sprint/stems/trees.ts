import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'trees-01',
    text: 'A company org chart records, for each employee, their direct manager. For any two staff members, find the most junior person who still supervises both of them, directly or indirectly.',
    pattern: 'trees',
    lookalikes: ['graphs', 'hash-maps-sets', 'linked-lists'],
    tell: 'Each node has exactly one parent and no cycles, and you want a lowest common ancestor → climb or recurse the hierarchy, not a general graph search.',
  },
  {
    id: 'trees-02',
    text: 'Files and folders nest inside one root directory. Report the length of the longest path from the root down to any single file, counting the names along the way.',
    pattern: 'trees',
    lookalikes: ['graphs', 'dynamic-programming', 'backtracking'],
    tell: 'A strictly downward-branching hierarchy with one root and a max root-to-leaf depth → a single recursive descent returning depth from each child.',
  },
  {
    id: 'trees-03',
    text: 'A genealogy database stores each person with a left and right child pointer. Produce the family members level by level, top generation first, reading each generation left to right.',
    pattern: 'trees',
    lookalikes: ['graphs', 'stacks', 'sliding-windows'],
    tell: 'Two children per node and an explicit level-by-level ordering → a breadth-first sweep that processes one tier of the hierarchy at a time.',
  },
  {
    id: 'trees-04',
    text: 'Numbers are stored so that at every node, everything to the left is smaller and everything to the right is larger. Given a value, locate it while touching as few nodes as possible.',
    pattern: 'trees',
    lookalikes: ['binary-search', 'hash-maps-sets', 'dynamic-programming'],
    tell: 'The ordered-children invariant lives in a node structure, not a flat sorted array → halve the search by descending left or right at each node.',
  },
  {
    id: 'trees-05',
    text: 'A tournament bracket branches in two at every match. Add up the prize values written on every match slot, including the championship root and all the early-round leaves.',
    pattern: 'trees',
    lookalikes: ['graphs', 'backtracking', 'prefix-sums'],
    tell: 'A finite two-way-branching structure with a single top and no revisits → sum each subtree recursively, with no need to mark visited nodes as a graph would.',
  },
]

export default stems
