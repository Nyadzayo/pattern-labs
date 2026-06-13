import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'bit-manipulation-01',
    text: 'A relay logs every sensor ping by its id, and every device pings an even number of times except one faulty unit that pings an odd number. Identify the faulty unit in a single pass using only a fixed amount of extra space.',
    pattern: 'bit-manipulation',
    lookalikes: ['hash-maps-sets', 'prefix-sums', 'two-pointers'],
    tell: 'Everything pairs off except one outlier and you may not use a count table → XOR all the ids together so equal pairs cancel to zero, leaving the loner.',
  },
  {
    id: 'bit-manipulation-02',
    text: 'A loyalty program encodes each member\'s claimed perks as a small set of flags. Given two members, report whether one\'s perks are a subset of the other\'s and which perks they hold in common, without expanding the flags into lists.',
    pattern: 'bit-manipulation',
    lookalikes: ['hash-maps-sets', 'two-pointers', 'greedy'],
    tell: 'Set membership over a tiny fixed universe packed into one integer → AND/OR the masks and check containment, instead of building real set objects.',
  },
  {
    id: 'bit-manipulation-03',
    text: 'A meter reports a non-negative integer. Determine in constant time whether that reading is an exact power of two, and if not, how far it sits above the largest power of two below it.',
    pattern: 'bit-manipulation',
    lookalikes: ['math-geometry', 'binary-search', 'prefix-sums'],
    tell: 'Power-of-two test on a single integer → exactly one set bit, detectable by n & (n - 1) == 0, not by repeated division or logarithms.',
  },
  {
    id: 'bit-manipulation-04',
    text: 'A ticketing kiosk hands out wristbands numbered 0 through n, but one number in that range is never issued. Given the issued numbers in any order, recover the missing one using addition or cancellation rather than a lookup structure.',
    pattern: 'bit-manipulation',
    lookalikes: ['math-geometry', 'hash-maps-sets', 'two-pointers'],
    tell: 'A complete 0..n range with exactly one gap → XOR the full range against the issued values so all present numbers cancel and the absent one survives.',
  },
  {
    id: 'bit-manipulation-05',
    text: 'A controller stores a 32-slot configuration word and needs to mirror it end to end, so the slot at one edge swaps with its mirror at the other edge, the next pair swaps inward, and so on across all slots.',
    pattern: 'bit-manipulation',
    lookalikes: ['two-pointers', 'math-geometry', 'stacks'],
    tell: 'Reversing the order of bits inside one fixed-width word → shift-and-mask each position into its mirror slot, operating on the integer itself rather than an array of elements.',
  },
]

export default stems
