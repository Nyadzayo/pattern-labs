import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'fast-slow-pointers-01',
    text: 'A treasure map gives each tile a single arrow pointing to exactly one other tile. Starting from the entrance and always following the arrow, decide whether you will ever revisit a tile, using only a constant amount of scratch paper.',
    pattern: 'fast-slow-pointers',
    lookalikes: ['linked-lists', 'hash-maps-sets', 'graphs'],
    tell: 'Each node has one deterministic successor and you must detect a repeat in O(1) memory → run one walker at single speed and one at double speed until they collide.',
  },
  {
    id: 'fast-slow-pointers-02',
    text: 'A counter repeatedly transforms a number by squaring each digit and summing the results; it keeps going forever unless it lands on 1. Determine whether a given starting number eventually settles on 1 without storing the numbers it passes through.',
    pattern: 'fast-slow-pointers',
    lookalikes: ['hash-maps-sets', 'math-geometry', 'dynamic-programming'],
    tell: 'A deterministic next-value function that either reaches a fixed point or loops, with no extra storage allowed → advance two iterators at different rates and watch for them meeting.',
  },
  {
    id: 'fast-slow-pointers-03',
    text: 'A train of carriages is chained front to back, but the final coupling may secretly clip back onto an earlier carriage. With a single forward pass and no log of which carriages you have already walked through, find the carriage where the loop rejoins.',
    pattern: 'fast-slow-pointers',
    lookalikes: ['linked-lists', 'hash-maps-sets', 'two-pointers'],
    tell: 'Locating the exact entry of a cycle in a singly-linked chain without marking nodes → after a fast/slow meeting, reset one walker to the start and step both one at a time.',
  },
  {
    id: 'fast-slow-pointers-04',
    text: 'A playlist of songs is connected one after another in a single forward chain of unknown length. In one sweep, without first counting the songs, stop on the middle track so it can start playing from there.',
    pattern: 'fast-slow-pointers',
    lookalikes: ['linked-lists', 'two-pointers', 'binary-search'],
    tell: 'Finding the midpoint of a forward-only sequence in a single pass with no length known up front → one pointer moves one step while another moves two, and the slow one lands in the middle when the fast one reaches the end.',
  },
  {
    id: 'fast-slow-pointers-05',
    text: 'An array of size n holds values from 1 to n, and exactly one value is repeated. Treating each value as an index that points to the next position, find the duplicated value while leaving the array untouched and using no auxiliary set.',
    pattern: 'fast-slow-pointers',
    lookalikes: ['hash-maps-sets', 'two-pointers', 'binary-search'],
    tell: 'The "value points to next index" mapping turns a duplicate into a cycle, so with read-only access and no extra space you chase a fast and slow index until they meet, then find the cycle entrance.',
  },
]

export default stems
