import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'hash-maps-sets-01',
    text: 'User IDs arrive one at a time in a stream. Report the first ID that you have already seen earlier in the stream.',
    pattern: 'hash-maps-sets',
    lookalikes: ['two-pointers', 'sliding-windows', 'sort-search'],
    tell: 'First element "seen before" over an unordered stream → keep a set of everything already passed and check membership as you go.',
  },
  {
    id: 'hash-maps-sets-02',
    text: 'Two unsorted lists of tags are given. Return the tags that appear in both.',
    pattern: 'hash-maps-sets',
    lookalikes: ['two-pointers', 'sort-search', 'binary-search'],
    tell: 'Membership across two collections with no order to exploit → hash one side, then probe it with the other.',
  },
  {
    id: 'hash-maps-sets-03',
    text: 'Group a list of words so that words which are rearrangements of one another end up in the same bucket.',
    pattern: 'hash-maps-sets',
    lookalikes: ['sort-search', 'tries', 'two-pointers'],
    tell: 'Cluster items that share a canonical key → a map from the normalized key to its group (the sorted letters are just the key).',
  },
  {
    id: 'hash-maps-sets-04',
    text: 'In an unsorted array, find any two values that add up to a target, in a single pass.',
    pattern: 'hash-maps-sets',
    lookalikes: ['two-pointers', 'sliding-windows', 'sort-search'],
    tell: 'Unsorted data and "a pair summing to target" in one pass → store each needed complement in a map (sorting first would invite two pointers instead).',
  },
]

export default stems
