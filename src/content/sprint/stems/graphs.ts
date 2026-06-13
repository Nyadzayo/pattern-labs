import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'graphs-01',
    text: 'A city subway map lists which stations connect directly by a single line. Given a start and a destination, find the fewest transfers needed to ride from one to the other, where any two directly-linked stations count as one hop.',
    pattern: 'graphs',
    lookalikes: ['trees', 'dynamic-programming', 'hash-maps-sets'],
    tell: 'Fewest hops across arbitrary connections that may loop back → breadth-first search over a graph, not a rooted hierarchy or an ordered subproblem table.',
  },
  {
    id: 'graphs-02',
    text: 'Friendship records say who follows whom on a small network; following is one-directional. Count how many separate clusters exist where everyone is reachable from everyone else when you ignore the direction of the links.',
    pattern: 'graphs',
    lookalikes: ['hash-maps-sets', 'trees', 'backtracking'],
    tell: 'Counting reachable clusters over entities joined by links → flood-fill connected components, not just hashing identities or walking a parent-child tree.',
  },
  {
    id: 'graphs-03',
    text: 'A build system has tasks that each declare which other tasks must finish before they can start. Produce any order to run all tasks that never starts a task before its prerequisites, or report that no valid order exists.',
    pattern: 'graphs',
    lookalikes: ['dynamic-programming', 'backtracking', 'trees'],
    tell: 'Ordering items under "must-come-before" dependencies and detecting an impossible cycle → topological sort on a directed graph, not enumerating permutations or filling a DP table.',
  },
  {
    id: 'graphs-04',
    text: 'A grid map marks dry land as 1 and water as 0. Two land squares belong to the same island if they touch edge-to-edge. Report how many distinct islands the map contains.',
    pattern: 'graphs',
    lookalikes: ['dynamic-programming', 'backtracking', 'hash-maps-sets'],
    tell: 'A grid where adjacent cells form regions you must group → treat cells as nodes and sweep each region with DFS/BFS, not a DP recurrence or exhaustive path search.',
  },
  {
    id: 'graphs-05',
    text: 'Airports are linked by flights, and each flight lists a price. Starting from your home airport, compute the cheapest total fare to reach a target airport, where prices are never negative.',
    pattern: 'graphs',
    lookalikes: ['dynamic-programming', 'heaps', 'trees'],
    tell: 'Cheapest cumulative cost across a weighted network with cycles → shortest-path search (Dijkstra) expanding the lowest-cost frontier, not a linear DP or a plain hierarchy.',
  },
]

export default stems
