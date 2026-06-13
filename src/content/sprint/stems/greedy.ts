import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'greedy-01',
    text: 'A street performer collects coins of fixed denominations and wants to pay out a refund of a given amount using as few coins as possible. The denominations are the usual canonical set where each larger coin is a multiple that dominates the smaller ones.',
    pattern: 'greedy',
    lookalikes: ['dynamic-programming', 'backtracking', 'math-geometry'],
    tell: 'Canonical (multiple-dominating) denominations means always grabbing the largest coin that fits is provably optimal — no table of subproblems, just commit to the biggest at each step.',
  },
  {
    id: 'greedy-02',
    text: 'A delivery rider starts with a full tank and passes fuel stations along a one-way route, each offering a known number of liters. Decide the minimum number of refuel stops needed to reach the depot, given the tank range between stops.',
    pattern: 'greedy',
    lookalikes: ['dynamic-programming', 'heaps', 'sliding-windows'],
    tell: 'You never refuel until you must, then refuel at the best reachable station already passed — defer the choice and take the locally-best option, rather than scoring every subsequence with a DP table.',
  },
  {
    id: 'greedy-03',
    text: 'Each task gives a reward only if finished by its own deadline, and every task takes one unit of time on a single machine. Pick the subset of tasks, and an order for them, that earns the largest total reward.',
    pattern: 'greedy',
    lookalikes: ['intervals', 'dynamic-programming', 'sort-search'],
    tell: 'Process tasks by descending reward and slot each into the latest free time before its deadline — an exchange-argument choice, not an overlap sweep over intervals or a value-vs-weight DP.',
  },
  {
    id: 'greedy-04',
    text: 'Two strings of digits represent the lengths of fences you can paint per day for two crews; you must concatenate every length into one continuous wall so the resulting number is as large as possible. Order the pieces however you like.',
    pattern: 'greedy',
    lookalikes: ['sort-search', 'dynamic-programming', 'two-pointers'],
    tell: 'The optimum comes from sorting with a custom pairwise rule (a before b iff "ab" > "ba") — a greedy comparator decision, not a plain numeric sort or a search over permutations.',
  },
  {
    id: 'greedy-05',
    text: 'Children stand in a line with happiness scores and you hand out candies so that each child gets at least one, and any child scoring higher than an immediate neighbor gets strictly more candies than that neighbor. Use the fewest candies overall.',
    pattern: 'greedy',
    lookalikes: ['dynamic-programming', 'prefix-sums', 'two-pointers'],
    tell: 'One left-to-right and one right-to-left pass, each locally bumping a count by one when the rule demands it, settles every child — a two-sweep greedy fix-up, not a memoized recurrence.',
  },
]

export default stems
