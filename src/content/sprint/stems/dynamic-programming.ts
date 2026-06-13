import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'dynamic-programming-01',
    text: 'A vending machine stocks coins of fixed denominations in unlimited supply. For a requested amount, return the smallest number of coins that sums to it exactly, or report that it is impossible.',
    pattern: 'dynamic-programming',
    lookalikes: ['greedy', 'backtracking', 'math-geometry'],
    tell: 'Grabbing the biggest coin first can overshoot the true minimum, so build the best count for every amount up to the target from smaller amounts — overlapping subproblems, not a greedy grab.',
  },
  {
    id: 'dynamic-programming-02',
    text: 'A delivery drone starts at the top-left cell of a rooftop grid and may only step right or down to reach the bottom-right pad. Each cell costs some battery to enter; find the cheapest path.',
    pattern: 'dynamic-programming',
    lookalikes: ['graphs', 'greedy', 'backtracking'],
    tell: 'Every cell is reached only from the one above or the one to its left, so the cheapest cost to a cell is its own cost plus the min of those two precomputed neighbors — a filled cost table, not a frontier search or local choice.',
  },
  {
    id: 'dynamic-programming-03',
    text: 'Two firmware version strings are given. Compute the fewest single-character insertions, deletions, or substitutions needed to turn the first into the second.',
    pattern: 'dynamic-programming',
    lookalikes: ['two-pointers', 'backtracking', 'greedy'],
    tell: 'The cheapest edit for a pair of prefixes depends on the answers for shorter prefix pairs, so fill a 2-D table where each cell combines its three smaller neighbors — overlapping prefix subproblems, not a single sweep of two cursors.',
  },
  {
    id: 'dynamic-programming-04',
    text: 'A hiker has a fixed pack capacity and a set of supplies, each with a weight and a usefulness score. Each item is taken whole or left behind; maximize total usefulness without exceeding the capacity.',
    pattern: 'dynamic-programming',
    lookalikes: ['greedy', 'backtracking', 'sort-search'],
    tell: 'Best score-per-weight ordering can be beaten because items interact through the shared budget, so tabulate the best score for each remaining capacity as items are considered one by one — not a ratio-sorted greedy take.',
  },
  {
    id: 'dynamic-programming-05',
    text: 'Given a daily list of stock prices and an integer cap on the number of completed buy-then-sell trades, find the largest total profit achievable under that trade limit.',
    pattern: 'dynamic-programming',
    lookalikes: ['greedy', 'intervals', 'sliding-windows'],
    tell: 'A trade cap couples decisions across days, so track, per day and per remaining-trade count, the best profit while holding versus not holding — a state table over (day, trades), not a sum of every local up-move.',
  },
]

export default stems
