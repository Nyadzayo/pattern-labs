import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'prefix-sums-01',
    text: 'A sensor logs hourly rainfall for a whole year, and the totals never change once recorded. Thousands of dashboard widgets each ask for the combined rainfall between two arbitrary hours, and every answer must come back instantly.',
    pattern: 'prefix-sums',
    lookalikes: ['sliding-windows', 'two-pointers', 'binary-search'],
    tell: 'Many repeated range-total queries over a fixed array → precompute one running-total array so each query is a single subtraction.',
  },
  {
    id: 'prefix-sums-02',
    text: 'A cashier app records the signed change to a till after each transaction, including refunds that go negative. Count how many spans of consecutive transactions net out to exactly zero.',
    pattern: 'prefix-sums',
    lookalikes: ['sliding-windows', 'hash-maps-sets', 'two-pointers'],
    tell: 'Counting subarrays that hit a target sum with negatives present → track running sums and look up how often each value appeared, since a window cannot shrink reliably when totals can fall.',
  },
  {
    id: 'prefix-sums-03',
    text: 'Each student earns or loses points across a fixed sequence of rounds, and losses are common. Report whether any unbroken stretch of rounds adds up to a given target swing in score.',
    pattern: 'prefix-sums',
    lookalikes: ['sliding-windows', 'hash-maps-sets', 'dynamic-programming'],
    tell: 'A contiguous-stretch sum equals a target but values may be negative → store each running total seen and check for one that differs by the target, rather than growing or shrinking a window.',
  },
  {
    id: 'prefix-sums-04',
    text: 'A warehouse grid stores how many crates sit in each cell, and the counts stay put all day. Auditors keep requesting the total crates inside many different rectangular sub-regions and want each tally immediately.',
    pattern: 'prefix-sums',
    lookalikes: ['dynamic-programming', 'sliding-windows', 'intervals'],
    tell: 'Repeated rectangle-sum queries on a static grid → build a cumulative 2D table so any rectangle is four lookups combined, not a fresh scan each time.',
  },
  {
    id: 'prefix-sums-05',
    text: 'Toll booths along a one-way highway each add or subtract balance from a transponder. For every booth, decide if the running balance there equals the combined balance of all booths before it.',
    pattern: 'prefix-sums',
    lookalikes: ['two-pointers', 'hash-maps-sets', 'math-geometry'],
    tell: 'Comparing a position\'s value against the accumulated total of everything to its left → carry a forward running sum and test the pivot against it in one pass.',
  },
]

export default stems
