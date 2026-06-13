import type { SprintStem } from '../types'

const stems: SprintStem[] = [
  {
    id: 'tries-01',
    text: 'A search box holds millions of saved product names. As the shopper types each letter, instantly list every saved name that begins with what they have typed so far.',
    pattern: 'tries',
    lookalikes: ['hash-maps-sets', 'binary-search', 'sort-search'],
    tell: 'Live "starts-with" lookup over a growing keystroke prefix → store the words along a shared character path so you can walk down to the prefix and read off the subtree.',
  },
  {
    id: 'tries-02',
    text: 'You maintain a dictionary that must answer two kinds of question: is this exact word stored, and does any stored word start with this fragment.',
    pattern: 'tries',
    lookalikes: ['hash-maps-sets', 'trees', 'binary-search'],
    tell: 'Needing BOTH exact-membership and prefix-membership on the same set → a hash only does exact match; branch on each character so a partial walk answers the prefix question.',
  },
  {
    id: 'tries-03',
    text: 'Given a large vocabulary, scan a sentence and replace each word with the shortest stored root that is a leading piece of it, such as turning "rebuilding" into "build" if "build" is a known root.',
    pattern: 'tries',
    lookalikes: ['hash-maps-sets', 'greedy', 'sort-search'],
    tell: 'Matching the shortest stored prefix of a query word → walk the query letter by letter down the shared-prefix structure and stop at the first complete root you reach.',
  },
  {
    id: 'tries-04',
    text: 'A spelling helper stores a word list and must support queries that may contain a single wildcard symbol, where the wildcard matches any one letter at that position.',
    pattern: 'tries',
    lookalikes: ['backtracking', 'hash-maps-sets', 'graphs'],
    tell: 'Wildcard-in-pattern matching against a stored word set → descend the character branches, and at a wildcard fan out into every child edge; a flat hash table has no per-character branching to explore.',
  },
  {
    id: 'tries-05',
    text: 'Many device IDs are stored as fixed-length binary strings. For an incoming ID, find the stored one whose bits agree on the longest leading run before they first diverge.',
    pattern: 'tries',
    lookalikes: ['bit-manipulation', 'hash-maps-sets', 'trees'],
    tell: 'Longest shared leading run across many keys → branch bit by bit so common prefixes collapse onto one path and divergence shows up as the point where the paths split.',
  },
]

export default stems
