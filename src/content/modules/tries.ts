import type { ModuleContent } from '../types'

const mod: ModuleContent = {
  id: 'tries',
  visualizer: 'trie',
  concept: `
## The mental model

Picture the lobby of a huge office building that holds every word in your dictionary. There's no front desk and no list on the wall. Instead, the lobby has up to 26 doors, one per letter. Walk through the \`c\` door and you're in a hallway that belongs to *every word starting with c*. That hallway has its own doors — go through \`a\`, then \`r\`, and you're standing in the room for the prefix \`car\`. A small brass plaque on the wall says whether "car" itself is a registered word, or merely a hallway on the way to \`carpet\` and \`cargo\`.

That building is a **trie** (prefix tree). The crucial economy: words that share a beginning share hallways. You pay for the prefix \`inter\` once, no matter how many words — \`internal\`, \`interval\`, \`internet\` — live behind it. And answering "what starts with \`ca\`?" doesn't require looking at any word that doesn't: you just walk two doors and everything below you is, by construction, the answer.

## Mechanics

A node is nothing more than a map from characters to child nodes, plus a flag. The flag matters more than beginners expect: because every word's path *also* spells all of its prefixes, you can't tell "this is a stored word" from "this is just a hallway" without an explicit end-of-word marker.

\`\`\`python
class TrieNode:
    def __init__(self):
        self.children = {}    # char -> TrieNode
        self.is_word = False  # a stored word ends exactly here

def insert(root, word):
    node = root
    for ch in word:
        node = node.children.setdefault(ch, TrieNode())
    node.is_word = True

def walk(root, prefix):
    node = root
    for ch in prefix:
        node = node.children.get(ch)
        if node is None:
            return None       # nothing stored starts with this prefix
    return node               # check node.is_word for exact-word membership
\`\`\`

Insertion walks the word's characters, creating doors as needed, and stamps the plaque at the end. Lookup walks the same way; falling off the structure means "no word here, and no word *starting* here either" — a freebie a hash set can't give you.

The real power move is **decorating nodes with payloads**. Store a pass-through counter on each node and you can answer "how many words start with this prefix?" by reading one integer after a short walk. Store the marker and stop at the *first* one you meet, and you've found the *shortest* stored prefix of a word — the heart of root-replacement problems. Run a DFS that fans out across all children whenever the query character is a wildcard, and you get pattern matching that only explores letters the dictionary actually contains.

## When to reach for it

Concrete signals:

- The problem involves **many strings** and questions about their **beginnings**: "starts with", "autocomplete", "longest common prefix", "shortest root".
- You must answer **many prefix queries against one fixed dictionary** — build once, query cheap.
- Matching proceeds **character by character with branching**, e.g. a \`.\` wildcard that could be any letter. A hash map would need to enumerate every concrete string; a trie just tries each existing child.
- You're tempted to call \`startswith\` on every word for every query. That's the \`O(n * q)\` smell a trie removes.
- You need **counts or aggregates grouped by prefix** — hang the aggregate on the nodes themselves.

If you only ever need exact-membership tests, a hash set is simpler and faster in practice. If queries are about *substrings* anywhere in the text (not prefixes), you're in suffix-structure territory instead.

## Complexity

Everything is governed by string length, not dictionary size. Inserting or looking up a word of length \`L\` costs \`O(L)\` — walking \`L\` doors — no matter whether the trie holds ten words or ten million. Building from a dictionary costs \`O(total characters)\`. Space is the trie's weak spot: worst case \`O(total characters)\` nodes (each with its own child map), though shared prefixes compress that substantially in real dictionaries. A wildcard query is the exception to the cheap-query rule: each \`.\` fans out to every child, so the DFS is bounded by the size of the trie, not the length of the query — still far better than enumerating \`26^dots\` candidate strings against a hash set.

## Common pitfalls

- **No end-of-word marker.** Then \`"app"\` looks stored just because \`"apple"\` is. Node existence proves a *prefix* exists, never a word.
- **Confusing the two failure modes of lookup**: falling off the trie (prefix absent) versus reaching a node whose flag is false (prefix present, word absent). Many bugs live in that gap.
- **Forgetting duplicates** when nodes carry counters — decide explicitly whether repeated words bump the count, and say so in your invariant.
- **Memory blow-ups** from allocating a 26-slot array per node for sparse data. Use a dict of children unless profiling says otherwise.
- **Wildcard DFS that returns too early.** \`any()\` over children is correct; a hand-rolled loop that returns the *first child's* result (instead of trying all of them) silently drops matches.
- **Treating a trie as a hash-map replacement.** For plain membership it's slower and heavier. It earns its memory only when prefix structure is part of the question.
`,
  realWorldUses: [
    {
      title: 'Longest-prefix match in IP routers',
      description:
        'A router forwarding table maps CIDR prefixes (e.g. 10.24.0.0/16) to next hops. Routers store these in binary tries (Patricia/radix trees) over the address bits and walk the destination address bit by bit, remembering the deepest matching prefix — millions of longest-prefix lookups per second ride on trie walks.',
    },
    {
      title: 'Search-as-you-type autocomplete',
      description:
        'Typeahead services keep query logs or product catalogs in trie-shaped indexes, often with popularity counts or top-k suggestion lists cached on each node. Each keystroke is one more step down an existing walk, so suggestions update in time proportional to the prefix typed, not the catalog size.',
    },
    {
      title: 'Term dictionaries in full-text search engines',
      description:
        "Lucene (and therefore Elasticsearch) stores each segment's term dictionary as an FST — a minimized, shared-prefix-and-suffix automaton in the trie family. It maps terms to posting-list offsets while compressing the enormous shared structure of real-world vocabularies into a few megabytes.",
    },
  ],
  problems: [
    {
      id: 'autocomplete-counter',
      title: 'Autocomplete Hit Counter',
      difficulty: 'easy',
      statement: `
A grocery delivery app shows a live counter under its search bar: as the shopper types, it displays how many catalog products start with what's been typed so far. The analytics team wants to replay a day of keystrokes against the catalog offline.

You're given \`words\`, the product name catalog (duplicates are real — two suppliers can list the same name, and **each occurrence counts separately**), and \`prefixes\`, the list of typed prefixes to replay.

Return a list of integers, one per prefix **in the same order as \`prefixes\`**, where each integer is the number of entries in \`words\` that start with that prefix. The empty prefix matches every entry. A word counts as starting with itself.

The catalog is large and the replay contains many prefixes, so per-query scans of the whole catalog are off the table.
`,
      examples: [
        {
          input: 'words = ["apple", "app", "apricot", "banana"], prefixes = ["ap", "app", "b", "c"]',
          output: '[3, 2, 1, 0]',
          explanation:
            '"ap" starts apple, app, and apricot. "app" starts apple and app. "b" starts only banana. Nothing starts with "c".',
        },
        {
          input: 'words = ["code", "coder", "coding", "co"], prefixes = ["co", "cod", "coding", "codingx"]',
          output: '[4, 3, 1, 0]',
          explanation:
            'Every word starts with "co". "cod" excludes "co" itself. "coding" matches exactly one word, and "codingx" is longer than anything stored.',
        },
        {
          input: 'words = ["log", "log", "logger"], prefixes = ["log", "logg", ""]',
          output: '[3, 1, 3]',
          explanation:
            'The duplicate "log" counts twice, so "log" matches 3 entries. Only "logger" continues past "log". The empty prefix matches all 3 entries.',
        },
      ],
      constraints: [
        '0 <= len(words) <= 10_000',
        '1 <= len(word) <= 50 for every word; lowercase letters a-z only',
        '0 <= len(prefixes) <= 10_000',
        '0 <= len(prefix) <= 50 for every prefix; lowercase letters a-z only',
        'Duplicate catalog entries count separately',
      ],
      hints: [
        'Checking every word against every prefix repeats enormous amounts of work — "app" and "apricot" agree on their first two letters, yet a scan re-reads them for every query. What shared structure is being ignored?',
        'Build a prefix tree from the catalog once. While inserting a word, every node you pass through corresponds to one of its prefixes — that is exactly where a "how many words pass here" counter belongs.',
        'Give each node (including the root) a count. On insert, bump the count of every node along the word\'s path, root included. Per query: walk the prefix character by character; if a child is missing answer 0, otherwise answer the final node\'s count. The root\'s count handles the empty prefix.',
      ],
      functionName: 'count_prefix_matches',
      starterCode: `class TrieNode:
    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.count = 0


def count_prefix_matches(words: list[str], prefixes: list[str]) -> list[int]:
    pass
`,
      solution: {
        code: `class TrieNode:
    def __init__(self):
        self.children = {}  # char -> TrieNode
        self.count = 0      # how many catalog entries pass through this node


def count_prefix_matches(words: list[str], prefixes: list[str]) -> list[int]:
    root = TrieNode()

    # Build phase: one pass over the catalog. Every node on a word's path
    # represents one of its prefixes, so bump the counter at each step.
    for word in words:
        root.count += 1            # root "contains" every entry -> "" works
        node = root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
            node.count += 1        # one more entry starts with this prefix

    # Query phase: each prefix is a short walk; the answer is precomputed.
    results = []
    for prefix in prefixes:
        node = root
        for ch in prefix:
            node = node.children.get(ch)
            if node is None:       # fell off the trie: nothing starts here
                break
        results.append(node.count if node is not None else 0)
    return results
`,
        commentary: `
The brute force answers each query by scanning the whole catalog with \`startswith\` — \`O(n * L)\` per query, ruinous when both lists are large. The trie flips the cost structure: spend \`O(total characters)\` once at build time, then every query is a walk of at most \`L\` steps ending at a precomputed integer.

The one design decision worth noticing is **where the counter lives**. It is a *pass-through* count, incremented on every node along an inserted word's path (root included), not an end-of-word count. That makes the invariant clean: *a node's count equals the number of catalog entries whose path goes through it*, which is by definition the number of entries starting with the prefix that node spells. Duplicates need no special handling — inserting "log" twice bumps the same three nodes twice.

Counting the root per insertion is what makes the empty prefix fall out for free: the walk over \`""\` takes zero steps and reads \`root.count\`. The other edge — a prefix that walks off the structure — is the trie's other gift: missing child means *nothing* stored starts this way, so the answer is 0 without inspecting a single word.
`,
        complexity: 'Time O(total chars in words + total chars in prefixes), Space O(total chars in words)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define the node carrying a per-prefix aggregate',
            acceptableKeywords: ['node with children map', 'per-node counter field', 'trie node definition', 'children plus running tally'],
            hint: 'What state does each node need so a single read answers a prefix query?',
            misconception: 'This declares storage shape only — nothing is counted or inserted yet.',
          },
          {
            lineRange: [5, 8],
            referenceLabel: 'Open the routine and create the empty root',
            acceptableKeywords: ['create the root node', 'function entry point', 'initialise empty trie', 'start with a bare root'],
            hint: 'Before any word goes in, what single object does every walk begin from?',
            misconception: 'This only allocates the starting point; no data has been ingested.',
          },
          {
            lineRange: [9, 19],
            referenceLabel: 'Ingest entries, bumping the tally along each path',
            acceptableKeywords: ['insert each word', 'increment count on every node', 'build phase one pass', 'tally entries through nodes'],
            hint: 'As you thread a word in, where do you record that one more entry passes through?',
            misconception: 'The tally is a pass-through count on every node, not a marker only at word ends.',
          },
          {
            lineRange: [20, 28],
            referenceLabel: 'Walk each query down the structure',
            acceptableKeywords: ['descend by each character', 'follow child links', 'walk the prefix', 'break when child missing'],
            hint: 'How do you locate the node that represents a given query string?',
            misconception: 'Falling off mid-walk means nothing stored starts that way — distinct from reaching a node with a zero tally.',
          },
          {
            lineRange: [29, 30],
            referenceLabel: 'Read off the precomputed answer per query',
            acceptableKeywords: ['collect the counts', 'read the node tally', 'append result then return', 'zero when off the trie'],
            hint: 'Once the walk lands (or fails), what value is the answer for that query?',
            misconception: 'This harvests the already-computed tally; it does no counting of its own.',
          },
        ],
      },
      testCases: [
        { input: [['apple', 'app', 'apricot', 'banana'], ['ap', 'app', 'b', 'c']], expected: [3, 2, 1, 0], label: 'basic catalog' },
        { input: [['code', 'coder', 'coding', 'co'], ['co', 'cod', 'coding', 'codingx']], expected: [4, 3, 1, 0], label: 'nested prefixes' },
        { input: [['log', 'log', 'logger'], ['log', 'logg', '']], expected: [3, 1, 3], label: 'duplicates and empty prefix' },
        { input: [['hi'], ['hill']], expected: [0], label: 'prefix longer than every word' },
        { input: [[], ['a', '']], expected: [0, 0], hidden: true, label: 'empty catalog' },
        { input: [['x'], []], expected: [], hidden: true, label: 'no queries' },
        { input: [['aaa', 'aaa', 'aaa'], ['a', 'aa', 'aaa', 'aaaa']], expected: [3, 3, 3, 0], hidden: true, label: 'all entries equal' },
        { input: [['a', 'ab', 'abc', 'b'], ['a', 'ab', 'b', 'abc']], expected: [3, 2, 1, 1], hidden: true, label: 'chain of one-char extensions' },
      ],
      furtherPractice: [
        { name: 'LeetCode 208. Implement Trie (Prefix Tree)', note: 'the bare data structure, no payloads' },
        { name: 'LeetCode 1268. Search Suggestions System', note: 'prefix walks that return top suggestions instead of counts' },
        { name: 'LeetCode 677. Map Sum Pairs', note: 'same pass-through-aggregate trick with sums instead of counts' },
      ],
    },
    {
      id: 'shared-sku-stem',
      title: 'Shared SKU Stem',
      difficulty: 'medium',
      statement: `
A fulfillment warehouse prints a header label for each storage tote. To save label width, the header shows only the **stem** shared by every SKU code in the tote — the longest string that is a prefix of *all* of them — and the per-item labels print just the remainders.

Given \`skus\`, the list of SKU codes in one tote, return the longest common prefix of all of them as a string. If the tote is empty, or the codes share no leading characters at all, return the empty string \`""\`.

Build a prefix tree from the codes and derive the answer from its **shape**: think about what the corridor from the root looks like while all codes still agree, and what two different structural events can end that agreement.
`,
      examples: [
        {
          input: 'skus = ["flowchart", "flowmeter", "flows"]',
          output: '"flow"',
          explanation: 'All three agree through "flow"; the next characters (c, m, s) disagree, so the corridor forks there.',
        },
        {
          input: 'skus = ["data", "database", "datapoint"]',
          output: '"data"',
          explanation:
            'The shared stem is "data". Note the stem here is itself one of the codes — agreement ends not at a fork but because a code ends.',
        },
        {
          input: 'skus = ["dog", "racecar", "car"]',
          output: '""',
          explanation: 'The codes disagree on their very first character, so the shared stem is empty.',
        },
      ],
      constraints: [
        '0 <= len(skus) <= 5_000',
        '1 <= len(sku) <= 100 for every code; lowercase letters a-z only',
        'Duplicate codes may appear',
        'Return "" for an empty list',
      ],
      hints: [
        'Lay the codes out and underline the region where they all still agree. What is true about that region that stops being true at the exact character where the answer ends?',
        'In a trie of the codes, the shared stem is a corridor from the root with no forks. Walk down while that holds — but a fork is not the only thing that can end the stem (look at the second example).',
        'Insert every code, marking end-of-word nodes. Then from the root: while the current node has exactly one child AND is not an end-of-word node, append that child\'s character and descend. Stop on a fork (2+ children) or a marker (a whole code ends here); the characters collected are the answer.',
      ],
      functionName: 'longest_shared_prefix',
      starterCode: `class TrieNode:
    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


def longest_shared_prefix(skus: list[str]) -> str:
    pass
`,
      solution: {
        code: `class TrieNode:
    def __init__(self):
        self.children = {}    # char -> TrieNode
        self.is_word = False  # a complete SKU code ends exactly here


def longest_shared_prefix(skus: list[str]) -> str:
    if not skus:
        return ""              # empty tote: nothing to share

    # Build the trie. Shared beginnings collapse into shared paths,
    # so the common prefix becomes literal geometry: an unbranched corridor.
    root = TrieNode()
    for code in skus:
        node = root
        for ch in code:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True    # remember where complete codes end

    # Walk the corridor from the root. Two events end the shared stem:
    #   1. a fork (>= 2 children): codes disagree on the next character
    #   2. an end-of-word marker: some code stops here, so nothing longer
    #      can be a prefix of THAT code
    stem = []
    node = root
    while len(node.children) == 1 and not node.is_word:
        ch, child = next(iter(node.children.items()))
        stem.append(ch)
        node = child
    return "".join(stem)
`,
        commentary: `
The character-by-character scan (compare column 0 of every code, then column 1, ...) works fine, but the trie version is worth knowing because it turns the answer into **structure you can see**: after inserting all codes, the longest common prefix is precisely the unbranched, unmarked corridor hanging off the root.

Both stopping conditions carry real meaning and both are required:

- **Fork** (\`len(children) >= 2\`): two codes disagree on the next character, so agreement is over.
- **Marker** (\`is_word\`): some code *ends* at this node. A string longer than a code can't be a prefix of it, so the stem can't continue — this is exactly the \`["data", "database", ...]\` case, where there's no fork at all (the \`data\` node has one child) but the stem must still stop.

Forgetting the marker check is the classic bug here: the code passes every test built from forking inputs, then returns \`"datab..."\`-style nonsense the first time one code is a prefix of another. Duplicates are harmless — inserting the same code twice re-walks the same path. The single-code tote also falls out correctly: the walk descends the whole word and stops at its end marker, returning the word itself.
`,
        complexity: 'Time O(total characters), Space O(total characters)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define a node that can mark where an entry ends',
            acceptableKeywords: ['node with children', 'end-of-entry flag', 'trie node with marker', 'children plus terminal bit'],
            hint: 'Besides links to next characters, what one fact must a node remember?',
            misconception: 'The end marker records termination, not the count of entries passing through.',
          },
          {
            lineRange: [5, 9],
            referenceLabel: 'Enter and short-circuit the empty input',
            acceptableKeywords: ['handle empty list', 'guard no entries', 'function start', 'return empty when nothing'],
            hint: 'What is the shared stem of a collection with no members?',
            misconception: 'This degenerate exit returns before any structure exists, not a stem of length zero found by walking.',
          },
          {
            lineRange: [10, 18],
            referenceLabel: 'Collapse shared openings into shared paths',
            acceptableKeywords: ['insert every entry', 'build the trie', 'mark each entry end', 'shared prefixes merge'],
            hint: 'How does inserting all entries turn the common opening into a single corridor?',
            misconception: 'Insertion only forms the structure; the stem is not yet extracted from it.',
          },
          {
            lineRange: [19, 29],
            referenceLabel: 'Descend the unbranched, unmarked corridor',
            acceptableKeywords: ['walk while single child', 'stop at a fork', 'stop at end marker', 'follow the one corridor'],
            hint: 'Which two events force agreement among entries to stop?',
            misconception: 'A node with one child can still end the stem if an entry terminates there — a fork is not the only stopping condition.',
          },
          {
            lineRange: [30, 30],
            referenceLabel: 'Assemble the corridor characters into the answer',
            acceptableKeywords: ['join collected characters', 'build the result string', 'return the stem', 'stitch the prefix'],
            hint: 'The walk gathered characters in order — what is the final return?',
            misconception: 'This only materialises the already-determined path into text.',
          },
        ],
      },
      testCases: [
        { input: [['flowchart', 'flowmeter', 'flows']], expected: 'flow', label: 'stem ends at a fork' },
        { input: [['data', 'database', 'datapoint']], expected: 'data', label: 'stem ends at an end-of-word marker' },
        { input: [['dog', 'racecar', 'car']], expected: '', label: 'no shared stem' },
        { input: [['interspace', 'interstellar', 'interstate']], expected: 'inters', label: 'longer shared run' },
        { input: [['echo']], expected: 'echo', hidden: true, label: 'single code: stem is the code itself' },
        { input: [[]], expected: '', hidden: true, label: 'empty tote' },
        { input: [['same', 'same', 'same']], expected: 'same', hidden: true, label: 'all codes identical' },
        { input: [['ab', 'a']], expected: 'a', hidden: true, label: 'one code is a prefix of another' },
      ],
      furtherPractice: [
        { name: 'LeetCode 14. Longest Common Prefix', note: 'the classic; try both the scan and the trie shape argument' },
        { name: 'LeetCode 720. Longest Word in Dictionary', note: 'another problem solved by reading trie structure, not just membership' },
      ],
    },
    {
      id: 'wildcard-service-lookup',
      title: 'Wildcard Service Lookup',
      difficulty: 'medium',
      statement: `
A platform team keeps a registry of deployed service names. Their on-call tooling accepts lookup patterns where the character \`.\` stands for **exactly one** unknown lowercase letter — handy when someone half-remembers a name ("it was \`pay....\`-something").

Given \`services\`, the registered names, and \`patterns\`, the lookup patterns, return a list of booleans **aligned with \`patterns\` in order**: \`true\` if at least one registered service matches the whole pattern, \`false\` otherwise. A match must consume the entire name and the entire pattern — same length, and every non-dot pattern character equal to the name's character at that position. A \`.\` matches any single letter, and different dots in one pattern may match different letters.

Expanding each dot into all 26 letters and checking a set explodes exponentially in the number of dots; your structure should only ever explore letters that actually occur in the registry.
`,
      examples: [
        {
          input: 'services = ["mail", "main", "map"], patterns = ["ma..", "m.p", "ma.", ".ail", "mall"]',
          output: '[true, true, true, true, false]',
          explanation:
            '"ma.." matches mail and main. "m.p" and "ma." match map. ".ail" matches mail. "mall" matches nothing — after "ma", only i and p exist in the registry.',
        },
        {
          input: 'services = ["red", "row", "rust"], patterns = ["r..", "ro..", "r.d", "...."]',
          output: '[true, false, true, true]',
          explanation:
            '"ro.." needs a 4-letter name starting "ro" — row has only 3 letters and rust starts "ru", so it fails. "...." matches rust by length.',
        },
        {
          input: 'services = ["a"], patterns = [".", "..", "a", "b"]',
          output: '[true, false, true, false]',
          explanation: 'Length must match exactly: "." matches the 1-letter name, ".." matches nothing.',
        },
      ],
      constraints: [
        '0 <= len(services) <= 5_000',
        '1 <= len(service) <= 25 for every name; lowercase letters a-z only',
        '0 <= len(patterns) <= 5_000',
        "1 <= len(pattern) <= 25; each pattern character is a lowercase letter or '.'",
        'A dot matches exactly one letter; matches must span the full pattern and full name',
      ],
      hints: [
        "A '.' could be any of 26 letters, but most of those letters lead nowhere — no registered name continues that way. What could tell you, at each position, which letters are even worth trying?",
        'Store the registry in a prefix tree. Matching a pattern is then a walk: a letter follows one specific child, while a dot must try every child this node actually has. Trying several children means the walk branches — recursion.',
        'Write matches(node, i): if i == len(pattern), return node.is_word; if pattern[i] is a letter, recurse into that child (false if absent); if it is ".", return any(matches(child, i+1)) over all children. Launch from the root at i = 0 for each pattern.',
      ],
      functionName: 'match_patterns',
      starterCode: `class TrieNode:
    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


def match_patterns(services: list[str], patterns: list[str]) -> list[bool]:
    pass
`,
      solution: {
        code: `class TrieNode:
    def __init__(self):
        self.children = {}    # char -> TrieNode
        self.is_word = False  # a registered name ends exactly here


def match_patterns(services: list[str], patterns: list[str]) -> list[bool]:
    # Build the registry trie once; every pattern reuses it.
    root = TrieNode()
    for name in services:
        node = root
        for ch in name:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    def matches(node, pattern, i):
        # Base case: pattern consumed. A match needs a name to END here,
        # not merely pass through (length must be exact).
        if i == len(pattern):
            return node.is_word
        ch = pattern[i]
        if ch == ".":
            # Wildcard: try every letter the registry actually contains
            # at this position. any() short-circuits on first success.
            return any(matches(child, pattern, i + 1)
                       for child in node.children.values())
        # Literal letter: exactly one child can continue the match.
        child = node.children.get(ch)
        return child is not None and matches(child, pattern, i + 1)

    return [matches(root, p, 0) for p in patterns]
`,
        commentary: `
The naive fix for wildcards — expand each \`.\` into all 26 letters and probe a hash set — multiplies candidates by 26 per dot: a pattern like \`".....\"\` generates ~11.8 million strings, nearly all of which were never deployed. The trie inverts the question: instead of asking "is this concrete guess registered?", the DFS asks "which continuations does the registry *actually have*?" and only follows those.

The recursion has exactly three shapes. A **literal letter** is deterministic: one child or bust, identical to a plain trie walk. A **dot** branches: try every existing child, succeeding if any branch succeeds — and \`any()\` short-circuits, so the search stops at the first witness. The **base case** is where exact-length matching is enforced: when the pattern is consumed we require \`node.is_word\`, not just node existence, otherwise \`"ma."\` would falsely match the registry entry \`mail\` by stopping at its third letter.

Worst case (a pattern of all dots against an adversarial registry) the DFS can touch nearly every node in the trie — \`O(total characters)\` — but it can never do worse than the trie's actual size, and literal characters prune aggressively in practice.
`,
        complexity: 'Time O(build: total chars) + per pattern O(L) for literal patterns, up to O(trie size) with dots; Space O(total chars)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define a node that marks complete entries',
            acceptableKeywords: ['node with children', 'end-of-entry flag', 'trie node definition', 'children plus terminal marker'],
            hint: 'For exact-length matching later, what must each node be able to signal?',
            misconception: 'The marker means an entry ends here, distinct from a node merely existing on a path.',
          },
          {
            lineRange: [5, 14],
            referenceLabel: 'Build the searchable registry once up front',
            acceptableKeywords: ['insert each name', 'build the trie once', 'mark word ends', 'register all entries'],
            hint: 'The same structure serves every query — when do you pay to build it?',
            misconception: 'This one-time build is amortised across all queries, not redone per pattern.',
          },
          {
            lineRange: [15, 20],
            referenceLabel: 'Anchor the recursion on a consumed pattern',
            acceptableKeywords: ['base case of recursion', 'pattern fully consumed', 'require an end marker', 'stop when index reaches length'],
            hint: 'When the pattern runs out, what must be true of the node for a real match?',
            misconception: 'Reaching a node is not enough — an exact match demands the node be an entry end, not a pass-through.',
          },
          {
            lineRange: [21, 29],
            referenceLabel: 'Branch on wildcard versus literal at this position',
            acceptableKeywords: ['wildcard tries all children', 'literal follows one child', 'dot explores every branch', 'fixed letter is deterministic'],
            hint: 'A normal letter follows one link; what does the any-character symbol do instead?',
            misconception: 'The wildcard explores only children the registry actually has — it never invents missing letters.',
          },
          {
            lineRange: [30, 31],
            referenceLabel: 'Resolve every pattern against the registry',
            acceptableKeywords: ['evaluate each pattern', 'collect boolean results', 'run the matcher per query', 'map over patterns'],
            hint: 'With the matcher defined, how do you produce one verdict per input pattern?',
            misconception: 'This driver only invokes the recursion; the matching logic lives above it.',
          },
        ],
      },
      testCases: [
        { input: [['mail', 'main', 'map'], ['ma..', 'm.p', 'ma.', '.ail', 'mall']], expected: [true, true, true, true, false], label: 'mixed literals and dots' },
        { input: [['red', 'row', 'rust'], ['r..', 'ro..', 'r.d', '....']], expected: [true, false, true, true], label: 'length must match exactly' },
        { input: [['a'], ['.', '..', 'a', 'b']], expected: [true, false, true, false], label: 'minimal registry' },
        { input: [['x'], []], expected: [], hidden: true, label: 'no patterns' },
        { input: [[], ['a', '.']], expected: [false, false], hidden: true, label: 'empty registry' },
        { input: [['abc', 'abd', 'abe'], ['ab.', 'a..', '.b.', '..', 'abcd']], expected: [true, true, true, false, false], hidden: true, label: 'sibling fan-out under one prefix' },
        { input: [['zz', 'zz'], ['..', 'z.', '.z', 'zz', 'z']], expected: [true, true, true, true, false], hidden: true, label: 'duplicate names, prefix is not a word' },
        { input: [['aaaa', 'aaab', 'aaba', 'abaa', 'baaa'], ['a...', '.a.a', '..b.', '.bb.']], expected: [true, true, true, false], hidden: true, label: 'heavy wildcard branching' },
      ],
      furtherPractice: [
        { name: 'LeetCode 211. Design Add and Search Words Data Structure', note: 'the classic dot-wildcard trie, phrased as a class' },
        { name: 'LeetCode 212. Word Search II', note: 'the same prune-by-dictionary idea driving a grid DFS' },
      ],
    },
    {
      id: 'codename-canonicalizer',
      title: 'Codename Canonicalizer',
      difficulty: 'hard',
      statement: `
An engineering org's incident reports are a mess: people write \`authservice\`, \`authsvc-v2\`-era names, \`networking\`, when the official component registry has crisp short codes like \`auth\` and \`net\`. Compliance wants reports normalized automatically.

You're given \`codes\`, the registry of official component codes, and \`report\`, a sentence of words separated by **single spaces** (no leading or trailing spaces; \`report\` may be the empty string). Rewrite the sentence: for each word, if one or more codes are a **prefix** of that word, replace the word with the **shortest** such code; if several codes of that same shortest length apply they are identical strings, so the choice is unambiguous. Words with no matching code prefix stay unchanged. Return the rewritten sentence with words in their **original order**, joined by single spaces.

A code that equals a word exactly counts as a prefix of it. The registry may contain duplicates and codes that are prefixes of other codes. The registry can hold tens of thousands of codes, and reports run long — re-testing every code against every word is too slow.
`,
      examples: [
        {
          input: 'codes = ["auth", "net", "db"], report = "the authservice hit a network timeout before dbwrite"',
          output: '"the auth hit a net timeout before db"',
          explanation:
            '"authservice" starts with "auth", "network" with "net", "dbwrite" with "db". The other words match no code — note "a" is untouched because no code is a prefix of it.',
        },
        {
          input: 'codes = ["a", "ab", "abc"], report = "abcdef ab xyz"',
          output: '"a a xyz"',
          explanation:
            'All three codes are prefixes of "abcdef", and "a" is the shortest, so it wins. "ab" also collapses to "a". "xyz" matches nothing.',
        },
        {
          input: 'codes = ["zip"], report = "nothing matches here"',
          output: '"nothing matches here"',
          explanation: 'No word starts with "zip"; the report is returned unchanged.',
        },
      ],
      constraints: [
        '0 <= len(codes) <= 20_000',
        '1 <= len(code) <= 20 for every code; lowercase letters a-z only',
        '0 <= len(report) <= 100_000; words are lowercase letters separated by single spaces',
        'report has no leading or trailing spaces; it may be the empty string',
        'Replace each word with the SHORTEST code that is a prefix of it; otherwise leave the word unchanged',
      ],
      hints: [
        "For one word, the candidate replacements are its own beginnings, checked shortest-first: w[:1], w[:2], ... What kind of structure lets you test all of those in a single pass over the word, without slicing or re-hashing each one?",
        'Put the codes in a prefix tree with end-of-word markers. Walking a word character by character visits its prefixes in increasing length — so the first marker you encounter belongs to the shortest matching code.',
        'Per word: walk its characters from the root. If the next child is missing, no code can ever match — keep the word. If you land on a marked node after character i, return word[:i+1] immediately. If the word runs out before any marker, keep it. Split the report on spaces, map each word, join with spaces (return "" for an empty report).',
      ],
      functionName: 'canonicalize_report',
      starterCode: `class TrieNode:
    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


def canonicalize_report(codes: list[str], report: str) -> str:
    pass
`,
      solution: {
        code: `class TrieNode:
    def __init__(self):
        self.children = {}    # char -> TrieNode
        self.is_word = False  # an official code ends exactly here


def canonicalize_report(codes: list[str], report: str) -> str:
    # Build the registry trie once. Duplicates just re-mark the same node;
    # codes that are prefixes of other codes put markers at different depths.
    root = TrieNode()
    for code in codes:
        node = root
        for ch in code:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    def shorten(word):
        # Walk the word through the trie. The walk visits the word's
        # prefixes shortest-first, so the FIRST marker we meet is the
        # shortest matching code -- stop right there.
        node = root
        for i, ch in enumerate(word):
            node = node.children.get(ch)
            if node is None:
                return word          # fell off: no code prefixes this word
            if node.is_word:
                return word[:i + 1]  # shortest code found; replace
        return word                  # word exhausted before any marker

    if not report:
        return ""                    # empty report stays empty
    # Single-space separation is guaranteed, so split/join is lossless.
    return " ".join(shorten(w) for w in report.split(" "))
`,
        commentary: `
The brute force tests every code against every word (\`word.startswith(code)\`), keeping the shortest hit: \`O(words x codes x code length)\` — hopeless at registry scale. Sorting codes by length helps the constant but not the shape. The trie makes the cost per word **independent of how many codes exist**.

The load-bearing observation: walking a word through the code trie visits that word's prefixes *in increasing length order*. So shortest-match-wins isn't something you compute — it's the order the walk hands you candidates in. The first end-of-word marker encountered IS the shortest matching code, and you can return on the spot. No collecting candidates, no \`min()\`, no comparisons.

Each word's walk also distinguishes the three outcomes cleanly: **fall off** the trie (some character has no child) — no code can prefix this word, not now, not deeper, so bail with the original; **hit a marker** at depth \`i\` — return \`word[:i+1]\`; **run out of word** while still on unmarked nodes — every code on this path is *longer* than the word, so nothing matches (this is why \`"alpha"\` survives a registry containing only \`"alphabet"\`).

Each word costs at most its own length, so the whole rewrite is linear in the report plus the one-time build — and an empty registry or empty report degrade gracefully to identity and \`""\`.
`,
        complexity: 'Time O(total chars in codes + len(report)), Space O(total chars in codes)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define a node that marks where entries end',
            acceptableKeywords: ['node with children', 'end-of-entry flag', 'trie node definition', 'children plus terminal bit'],
            hint: 'To detect a matching code mid-walk later, what must each node carry?',
            misconception: 'The marker flags a code ending here; passing through a node is not the same as a match.',
          },
          {
            lineRange: [5, 15],
            referenceLabel: 'Register all canonical entries once',
            acceptableKeywords: ['insert each code', 'build the registry trie', 'mark code ends', 'one-time structure build'],
            hint: 'Every word in the report consults the same set of codes — build it when?',
            misconception: 'Duplicates and nested codes are absorbed by re-marking; no per-word rebuild happens.',
          },
          {
            lineRange: [16, 28],
            referenceLabel: 'Map one token to its shortest matching code',
            acceptableKeywords: ['walk the word', 'return on first marker', 'shortest prefix wins', 'fall off keeps original'],
            hint: 'Walking a word visits its prefixes shortest-first — what does the first marker mean?',
            misconception: 'The first marker is already the shortest match; running off the trie means keep the word unchanged, a different outcome.',
          },
          {
            lineRange: [29, 31],
            referenceLabel: 'Short-circuit an empty report',
            acceptableKeywords: ['guard empty input', 'return empty string', 'handle no tokens', 'degenerate report case'],
            hint: 'What should the canonical form of an empty report be?',
            misconception: 'This is a degenerate exit, not the result of splitting and rejoining nothing.',
          },
          {
            lineRange: [32, 33],
            referenceLabel: 'Rewrite every token and reassemble the line',
            acceptableKeywords: ['split on spaces', 'shorten each token', 'join the results', 'rebuild the report'],
            hint: 'How do you apply the per-token rewrite across the whole line losslessly?',
            misconception: 'This orchestrates the helper over each token; the matching decision belongs to the helper.',
          },
        ],
      },
      testCases: [
        {
          input: [['auth', 'net', 'db'], 'the authservice hit a network timeout before dbwrite'],
          expected: 'the auth hit a net timeout before db',
          label: 'basic rewrite',
        },
        { input: [['a', 'ab', 'abc'], 'abcdef ab xyz'], expected: 'a a xyz', label: 'shortest of several matching codes wins' },
        { input: [['zip'], 'nothing matches here'], expected: 'nothing matches here', label: 'no replacements' },
        { input: [['pre'], 'prefix'], expected: 'pre', label: 'single-word report' },
        { input: [['log', 'met'], 'log met logs metrics'], expected: 'log met log met', hidden: true, label: 'code equals word exactly' },
        { input: [['a'], ''], expected: '', hidden: true, label: 'empty report' },
        { input: [['kube'], 'kubepod kubepod kubepod'], expected: 'kube kube kube', hidden: true, label: 'all words identical' },
        { input: [['alphabet'], 'alpha beta'], expected: 'alpha beta', hidden: true, label: 'code longer than the word never matches' },
        { input: [['mono', 'mono', 'mon'], 'monorepo monitor monsoon'], expected: 'mon mon mon', hidden: true, label: 'duplicate codes and nested codes' },
        { input: [[], 'hello world'], expected: 'hello world', hidden: true, label: 'empty registry' },
      ],
      furtherPractice: [
        { name: 'LeetCode 648. Replace Words', note: 'the classic shortest-root replacement' },
        { name: 'LeetCode 820. Short Encoding of Words', note: 'flip the idea: suffix sharing via a reversed-word trie' },
      ],
    },
    {
      id: 'keypad-code-audit',
      title: 'Audio Guide Keypad Audit',
      difficulty: 'easy',
      statement: `
A museum's handheld audio guide has a numeric keypad and no confirm button: playback starts the instant the digits entered so far match a registered exhibit code. That design only works if the code list is **instantly decodable** — no code may be a prefix of another, or the longer exhibit could never be played (the guide fires on the shorter code first). A duplicated code is equally broken: two exhibits would claim the same input.

Given \`codes\`, the list of exhibit codes (strings of digits), return \`true\` if no code is a prefix of any other code — where a duplicate counts as a violation — and \`false\` otherwise. A code counts as a prefix of itself only when it appears twice. An empty list or a single code is trivially valid.

Curators upload tens of thousands of codes at a time, so comparing every pair of codes is too slow.
`,
      examples: [
        {
          input: 'codes = ["302", "45", "718"]',
          output: 'true',
          explanation:
            'No code opens another: the three first digits already differ, so nothing can be a prefix of anything else.',
        },
        {
          input: 'codes = ["91", "915", "30"]',
          output: 'false',
          explanation:
            '"91" is a prefix of "915": the moment a visitor keys 9 then 1, the guide starts exhibit 91 and exhibit 915 becomes unreachable.',
        },
        {
          input: 'codes = ["555", "55"]',
          output: 'false',
          explanation: 'Order does not matter — "55" prefixes "555" no matter which was registered first.',
        },
      ],
      constraints: [
        '0 <= len(codes) <= 50_000',
        "1 <= len(code) <= 12 for every code; characters are digits '0'-'9'",
        'Duplicate codes may appear and make the list invalid',
        'Return true for an empty list or a single code',
      ],
      hints: [
        'Two codes conflict only when one is a wholesale copy of the other\'s opening digits. Comparing every code against every other re-reads the same openings thousands of times — and most comparisons fail on the very first digit. What would let codes that share openings also share the comparison work?',
        'Insert the codes one at a time into a digit-keyed prefix tree, marking the node where each code ends. A violation is visible DURING an insertion walk — think about what an in-progress insert can bump into.',
        'Two observable events cover every violation: if the walk passes a marked node (including at its own last digit), an earlier code is a prefix of this one — or its duplicate; if the walk ends on a node that already has children, this code is a prefix of an earlier, longer one. Either way return false on the spot; otherwise mark the final node and continue. All inserts clean: return true.',
      ],
      functionName: 'is_prefix_free',
      starterCode: `class TrieNode:
    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.is_code = False


def is_prefix_free(codes: list[str]) -> bool:
    pass
`,
      solution: {
        code: `class TrieNode:
    def __init__(self):
        self.children = {}    # digit -> TrieNode
        self.is_code = False  # a registered exhibit code ends exactly here


def is_prefix_free(codes: list[str]) -> bool:
    root = TrieNode()
    for code in codes:
        node = root
        for ch in code:
            node = node.children.setdefault(ch, TrieNode())
            if node.is_code:
                # An earlier code ends on this node. Either it is a proper
                # prefix of the new code (digits remain) or the new code
                # duplicates it (this was the last digit). Both break
                # instant decodability, so stop immediately.
                return False
        if node.children:
            # The new code stops at a node that already continues deeper,
            # so the new code is a prefix of some earlier, longer code.
            return False
        node.is_code = True   # clean insert: mark and keep going
    return True
`,
        commentary: `
The pairwise check (\`a.startswith(b)\` over all ordered pairs) is \`O(n^2 * L)\` and re-reads shared openings endlessly. Sorting and comparing neighbors cuts that to \`O(n L log n)\`, but the trie does better AND exposes the structure of the problem: build incrementally, and every violation becomes a geometric event you can observe mid-insertion.

There are only two ways prefix-freeness can die, and one insertion walk witnesses both. **Passing a marked node** means a previously registered code ends strictly inside the code being inserted (a proper prefix) or exactly at its end (a duplicate). **Finishing on a node that already has children** means the structure continues below the new code's endpoint, so the new code is a prefix of something inserted earlier. Insertion order never matters because the two checks are mirror images: whichever member of a conflicting pair arrives second, one of the two events fires.

The early return is not just politeness — it is what keeps the whole audit \`O(total digits)\`: each digit of each code is touched at most once before a verdict. The "instant playback" framing is the everyday face of a classic idea: a code set where no entry prefixes another is exactly a set a device can decode with no terminator symbol — the same property that makes variable-length schemes like Huffman codes decodable.
`,
        complexity: 'Time O(total digits across all codes), Space O(total digits)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define a node that marks a registered entry',
            acceptableKeywords: ['node with children', 'end-of-entry flag', 'trie node definition', 'children plus terminal marker'],
            hint: 'To catch a conflict while inserting, what must each node be able to signal?',
            misconception: 'The marker means an entry terminates here; an internal node having children is a separate signal.',
          },
          {
            lineRange: [5, 8],
            referenceLabel: 'Open the audit with an empty structure',
            acceptableKeywords: ['create the root', 'function entry point', 'start empty trie', 'begin with bare root'],
            hint: 'Before testing any code, what does the first insertion start from?',
            misconception: 'This only sets up the loop; no conflict can be detected yet.',
          },
          {
            lineRange: [9, 18],
            referenceLabel: 'Insert a code and catch an earlier entry inside it',
            acceptableKeywords: ['thread the code in', 'pass a marked node', 'earlier entry is a prefix', 'detect conflict mid-insert'],
            hint: 'While descending a new code, what does meeting an existing end marker reveal?',
            misconception: 'Hitting a marker mid-walk means a shorter entry prefixes this one — different from this code prefixing a longer one.',
          },
          {
            lineRange: [19, 23],
            referenceLabel: 'Catch this entry being a prefix, then commit it',
            acceptableKeywords: ['ends on internal node', 'has children below', 'this code is a prefix', 'mark on clean insert'],
            hint: 'If a finished code lands on a node that already continues deeper, what does that mean?',
            misconception: 'Finishing on a node with children is the mirror conflict; only a truly clean stop earns the end marker.',
          },
          {
            lineRange: [24, 24],
            referenceLabel: 'Declare the whole set conflict-free',
            acceptableKeywords: ['all inserts clean', 'return true', 'no prefix collisions', 'set is prefix-free'],
            hint: 'If every code inserts without firing either check, what is the verdict?',
            misconception: 'Reaching here proves no entry prefixes another across the entire set.',
          },
        ],
      },
      testCases: [
        { input: [['302', '45', '718']], expected: true, label: 'distinct openings' },
        { input: [['91', '915', '30']], expected: false, label: 'shorter code inserted first' },
        { input: [['555', '55']], expected: false, label: 'longer code inserted first' },
        { input: [['12345']], expected: true, label: 'single code' },
        { input: [['7', '7']], expected: false, hidden: true, label: 'exact duplicate' },
        { input: [[]], expected: true, hidden: true, label: 'empty list' },
        { input: [['1', '21', '321', '4321']], expected: true, hidden: true, label: 'shared digits but never at the start' },
        { input: [['604', '60', '6']], expected: false, hidden: true, label: 'chain of nested prefixes, longest first' },
      ],
      furtherPractice: [
        { name: 'Phone List (Kattis)', note: 'the classic prefix-consistency check over phone numbers' },
        { name: 'LeetCode 1804. Implement Trie II (Prefix Tree)', note: 'counted markers that make prefix bookkeeping richer' },
      ],
    },
    {
      id: 'letter-ladder-champion',
      title: 'Spelling Ladder Champion',
      difficulty: 'medium',
      statement: `
A children's spelling app awards its **ladder badge** for words a learner can grow one letter at a time: starting from a single letter and appending one letter per step, every intermediate stage must itself be a word on the learner's practice list. For example, \`sand\` earns the badge only if \`s\`, \`sa\`, \`san\`, and \`sand\` are all on the list.

Given \`words\`, the practice list (duplicates may appear), return the longest word that earns the ladder badge. If several qualifying words tie for the longest, return the one that comes first alphabetically. If no word qualifies at all, return the empty string \`""\`.

The practice list can be large, and most of it may be dead weight — words whose ladders break on the very first letter — so avoid paying for words that can never qualify.
`,
      examples: [
        {
          input: 'words = ["w", "wo", "wor", "worl", "world"]',
          output: '"world"',
          explanation: 'Every stage from "w" upward is on the list, so "world" can be grown letter by letter.',
        },
        {
          input: 'words = ["a", "banana", "app", "appl", "ap", "apply", "apple"]',
          output: '"apple"',
          explanation:
            '"apple" and "apply" are both fully buildable and tie at five letters; "apple" wins alphabetically. "banana" never qualifies because "b" is not on the list.',
        },
        {
          input: 'words = ["cat", "cats"]',
          output: '""',
          explanation: 'No single-letter word exists, so no ladder can even start.',
        },
      ],
      constraints: [
        '0 <= len(words) <= 10_000',
        '1 <= len(word) <= 30 for every word; lowercase letters a-z only',
        'Duplicates may appear',
        'Ties on length break to the alphabetically smallest word',
        'Return "" if no word qualifies',
      ],
      hints: [
        '"sand" can only qualify if "san" qualifies, which needs "sa", which needs "s". Qualification flows down a chain of one-letter extensions — what shape do all those chains form if you draw each word connected to the word one letter shorter than it?',
        'Build a prefix tree of the practice list with end-of-word markers. A word is buildable exactly when EVERY node on its root-to-end path is marked, so the buildable words form one connected region hanging off the root. Nothing outside that region can ever matter.',
        'DFS from the root, but descend into a child only if that child is marked; remember the deepest prefix reached. Visit children in alphabetical order and replace your best only on a STRICTLY longer find — the first word reached at any depth is then automatically the alphabetically smallest, settling ties for free.',
      ],
      functionName: 'longest_buildable_word',
      starterCode: `class TrieNode:
    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


def longest_buildable_word(words: list[str]) -> str:
    pass
`,
      solution: {
        code: `class TrieNode:
    def __init__(self):
        self.children = {}    # char -> TrieNode
        self.is_word = False  # a practice-list word ends exactly here


def longest_buildable_word(words: list[str]) -> str:
    # Build the trie; duplicates just re-mark the same node.
    root = TrieNode()
    for word in words:
        node = root
        for ch in word:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    best = ""

    def dfs(node, prefix):
        nonlocal best
        # Strictly-longer check: within one depth, the FIRST word reached
        # (alphabetical child order) is the lexicographically smallest,
        # so it must not be displaced by a later tie.
        if len(prefix) > len(best):
            best = prefix
        for ch in sorted(node.children):
            child = node.children[ch]
            if child.is_word:        # inheritance: extend only through
                dfs(child, prefix + ch)  # stages that are themselves words

    dfs(root, "")
    return best
`,
        commentary: `
The trie turns an inductive definition into geometry. "Buildable" is defined by inheritance — a word qualifies only if its one-letter-shorter prefix qualifies — and in a trie that inheritance is literal adjacency: a word is buildable exactly when **every node on its root path carries the end-of-word marker**. The buildable words therefore form one connected marked subtree at the top of the structure, and everything outside it is unreachable no matter how long or numerous those words are ("banana" dies at the unmarked \`b\` node; its other five letters are never visited).

That connectivity is what justifies the pruned DFS: descending only into marked children is not a heuristic, it is the definition restated. The search does work proportional to the qualifying region, not to the dictionary.

The tie-break costs nothing extra, which is the second idea worth keeping. A preorder walk that visits children in alphabetical order enumerates stored strings in exact lexicographic order, so among words of equal maximal length the FIRST one encountered is the alphabetically smallest — updating \`best\` only on a strictly longer find bakes the tie-break into the traversal itself. The common alternative (sort the words, grow a hash set of buildable words) also runs near-linear, but it re-derives per word what the trie states once, structurally: qualification is a property of the path, not of the word in isolation.
`,
        complexity: 'Time O(total characters), Space O(total characters)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define a node that marks a valid stage',
            acceptableKeywords: ['node with children', 'end-of-entry flag', 'trie node definition', 'children plus terminal marker'],
            hint: 'Buildability depends on every prefix being a word — what must each node record?',
            misconception: 'The marker says a word ends here; it is what makes a node a legal rung, not mere existence.',
          },
          {
            lineRange: [5, 14],
            referenceLabel: 'Build the structure from every entry',
            acceptableKeywords: ['insert each word', 'build the trie', 'mark word ends', 'collapse shared prefixes'],
            hint: 'How does inserting all words make the inheritance relation into adjacency?',
            misconception: 'Building only forms the structure; which words qualify is decided by the later traversal.',
          },
          {
            lineRange: [15, 17],
            referenceLabel: 'Initialise the running best answer',
            acceptableKeywords: ['track the best so far', 'start best empty', 'running champion', 'seed the answer'],
            hint: 'Before searching, what placeholder holds the longest qualifying word found?',
            misconception: 'This seeds the comparison state; it is updated during the search, not here.',
          },
          {
            lineRange: [18, 28],
            referenceLabel: 'Search only through fully-valid extensions',
            acceptableKeywords: ['recurse through marked children', 'strictly longer wins', 'visit children in order', 'prune unmarked branches'],
            hint: 'Which children may the descent follow, and when do you update the champion?',
            misconception: 'Descending only into marked children is the definition restated, not a heuristic; updating only on strictly longer keeps the alphabetical tie-break.',
          },
          {
            lineRange: [29, 31],
            referenceLabel: 'Launch the search and return the winner',
            acceptableKeywords: ['kick off the dfs', 'start from the root', 'return the best', 'run then report'],
            hint: 'With the search defined, how do you start it and surface the answer?',
            misconception: 'This driver only invokes and reports; the qualifying logic lives in the recursion.',
          },
        ],
      },
      testCases: [
        { input: [['w', 'wo', 'wor', 'worl', 'world']], expected: 'world', label: 'one complete ladder' },
        { input: [['a', 'banana', 'app', 'appl', 'ap', 'apply', 'apple']], expected: 'apple', label: 'length tie broken alphabetically' },
        { input: [['t', 'talk', 'ta', 'tal']], expected: 'talk', label: 'ladder given out of order' },
        { input: [['cat', 'cats']], expected: '', label: 'no ladder can start' },
        { input: [[]], expected: '', hidden: true, label: 'empty practice list' },
        { input: [['b', 'a']], expected: 'a', hidden: true, label: 'tie among single letters' },
        { input: [['a', 'a', 'ab', 'ab']], expected: 'ab', hidden: true, label: 'duplicates are harmless' },
        { input: [['m', 'mo', 'moo', 'mood', 'moon']], expected: 'mood', hidden: true, label: 'two ladders share every rung but the last' },
      ],
      furtherPractice: [
        { name: 'LeetCode 720. Longest Word in Dictionary', note: 'the classic one-letter-at-a-time build' },
        { name: 'LeetCode 1858. Longest Word With All Prefixes', note: 'the same inheritance idea, slightly relaxed' },
      ],
    },
    {
      id: 'kiosk-typeahead',
      title: 'Check-In Kiosk Typeahead',
      difficulty: 'medium',
      statement: `
An airline's self-service kiosk asks travelers to type their destination. After **each keystroke** it shows up to three suggestions: the alphabetically smallest destination names that start with everything typed so far.

You're given \`destinations\`, the route catalog (duplicates may appear — several partner carriers can sell the same route — but a name must never be suggested twice), and \`query\`, the full string the traveler will type, one character per keystroke.

Return a list with one entry per keystroke: entry \`i\` is the list of up to three suggestions for the prefix \`query[:i+1]\`, **sorted in ascending alphabetical order**. Once a prefix matches no destination, that entry and every later entry is the empty list. The catalog is huge and travelers type fast, so re-scanning the catalog per keystroke is not acceptable.
`,
      examples: [
        {
          input: 'destinations = ["lima", "lisbon", "london", "lagos", "lyon"], query = "li"',
          output: '[["lagos", "lima", "lisbon"], ["lima", "lisbon"]]',
          explanation:
            'After "l" all five names match and the three alphabetically smallest are shown. After "li" only lima and lisbon remain.',
        },
        {
          input: 'destinations = ["oslo", "osaka"], query = "osl"',
          output: '[["osaka", "oslo"], ["osaka", "oslo"], ["oslo"]]',
          explanation: 'Fewer than three matches means show them all; the third keystroke narrows things to oslo.',
        },
        {
          input: 'destinations = ["rome", "rio"], query = "rya"',
          output: '[["rio", "rome"], [], []]',
          explanation:
            'Nothing starts with "ry", and once a prefix matches nothing, no longer prefix can match either.',
        },
      ],
      constraints: [
        '0 <= len(destinations) <= 20_000',
        '1 <= len(name) <= 30 for every name; lowercase letters a-z only',
        '1 <= len(query) <= 30; lowercase letters a-z only',
        'Duplicate catalog entries may appear, but each name is suggested at most once',
        'Each suggestion list holds at most 3 names, sorted in ascending alphabetical order',
      ],
      hints: [
        'Keystroke i+1 searches inside the survivors of keystroke i — the candidate pool only ever shrinks as the prefix grows. Re-filtering and re-sorting the whole catalog on every keystroke throws that away, and it re-pays the full sort even when almost nothing changed.',
        'Hold the catalog in a prefix tree with end-of-word markers (inserting a duplicate re-marks the same node, so deduplication is automatic). The candidates for any prefix are exactly the names stored in the subtree below that prefix\'s node.',
        'Advance one child link per keystroke from the previous node (once it goes missing, every later answer is []). From the current node run a preorder DFS that visits children in sorted order, appends the running string at every marked node, and stops as soon as 3 names are collected — preorder in sorted child order emits names in exact alphabetical order.',
      ],
      functionName: 'suggest_destinations',
      starterCode: `class TrieNode:
    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.is_word = False


def suggest_destinations(destinations: list[str], query: str) -> list[list[str]]:
    pass
`,
      solution: {
        code: `class TrieNode:
    def __init__(self):
        self.children = {}    # char -> TrieNode
        self.is_word = False  # a catalog name ends exactly here


def suggest_destinations(destinations: list[str], query: str) -> list[list[str]]:
    # Build once. Inserting a duplicate name re-walks the same path and
    # re-marks the same node, so the catalog is deduplicated by construction.
    root = TrieNode()
    for name in destinations:
        node = root
        for ch in name:
            node = node.children.setdefault(ch, TrieNode())
        node.is_word = True

    def collect(node, prefix, out):
        # Preorder DFS in sorted child order emits names in exact
        # lexicographic order; appending at a marked node BEFORE recursing
        # puts a name ahead of its own extensions ("york" before "yorkdale").
        if node.is_word:
            out.append(prefix)
        for ch in sorted(node.children):
            if len(out) == 3:     # already have the three smallest: stop
                return
            collect(node.children[ch], prefix + ch, out)

    results = []
    node = root
    for i, ch in enumerate(query):
        # One child link per keystroke. Once we fall off the trie, no
        # longer prefix can ever match again, so node stays None.
        node = node.children.get(ch) if node is not None else None
        if node is None:
            results.append([])
        else:
            out = []
            collect(node, query[: i + 1], out)
            results.append(out)
    return results
`,
        commentary: `
Per keystroke, the brute force filters the whole catalog with \`startswith\`, dedupes, sorts, and slices three — \`O(n log n)\` per keystroke with \`n\` never shrinking. The trie exploits the two monotonicities the keystroke stream hands you for free: each prefix extends the previous one (so the walk advances ONE child link per keystroke instead of restarting), and each candidate pool nests inside the previous one (the subtree below the new node lives inside the subtree below the old).

The deterministic ordering rests on a fact worth memorizing: **a preorder DFS that visits children in sorted order emits the stored strings in exact lexicographic order**. Appending at a marked node before recursing into its children is what places a name ahead of its own extensions — shorter prefix-words sort first, which matches string ordering. Because emission order is already sorted, the cap of three is a clean short-circuit: the DFS touches only the leftmost sliver of the subtree, so a keystroke sitting above a million-name subtree still does only enough work to find three names.

Deduplication never appears in the code because the structure absorbs it: duplicates re-mark one node, and the DFS reads each marker once. And carrying the \`None\` forward after falling off encodes the obvious-but-easy-to-botch invariant that no longer prefix can ever match again.
`,
        complexity: 'Time O(total catalog chars) to build + O(len(query)) walk with a 3-capped DFS per keystroke; Space O(total catalog chars)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define a node that marks a catalog entry',
            acceptableKeywords: ['node with children', 'end-of-entry flag', 'trie node definition', 'children plus terminal marker'],
            hint: 'To emit only real names during a traversal, what must each node signal?',
            misconception: 'The marker distinguishes a real name from an intermediate node on the way to longer names.',
          },
          {
            lineRange: [5, 15],
            referenceLabel: 'Build the catalog structure once',
            acceptableKeywords: ['insert each name', 'build the trie once', 'mark name ends', 'dedupe by construction'],
            hint: 'Every keystroke reuses the same structure — when is it built?',
            misconception: 'Duplicates collapse onto one path; the build is amortised, not redone per keystroke.',
          },
          {
            lineRange: [16, 26],
            referenceLabel: 'Gather the smallest few names under a node',
            acceptableKeywords: ['preorder dfs sorted', 'emit in lexicographic order', 'append before recursing', 'cap the result count'],
            hint: 'How does a sorted-order traversal hand you names already ranked, and when do you stop?',
            misconception: 'Appending at a marked node before recursing places a shorter name ahead of its own extensions; the cap is a clean short-circuit, not a post-hoc slice.',
          },
          {
            lineRange: [27, 39],
            referenceLabel: 'Advance one link per keystroke and harvest',
            acceptableKeywords: ['one child per keystroke', 'walk the growing prefix', 'collect suggestions per step', 'stay none after falling off'],
            hint: 'Each keystroke extends the previous prefix — how far does the walk move, and what then?',
            misconception: 'The walk advances a single link per keystroke rather than restarting; once it falls off, no longer prefix can match again.',
          },
          {
            lineRange: [40, 40],
            referenceLabel: 'Return the per-keystroke suggestion lists',
            acceptableKeywords: ['return all results', 'one list per keystroke', 'final answer', 'report the suggestions'],
            hint: 'After processing every keystroke, what is handed back?',
            misconception: 'This only returns the accumulated lists; the ranking happened during collection.',
          },
        ],
      },
      testCases: [
        { input: [['lima', 'lisbon', 'london', 'lagos', 'lyon'], 'li'], expected: [['lagos', 'lima', 'lisbon'], ['lima', 'lisbon']], label: 'narrowing pool' },
        { input: [['oslo', 'osaka'], 'osl'], expected: [['osaka', 'oslo'], ['osaka', 'oslo'], ['oslo']], label: 'fewer than three matches' },
        { input: [['rome', 'rio'], 'rya'], expected: [['rio', 'rome'], [], []], label: 'dead prefix stays dead' },
        { input: [['nara', 'nairobi', 'nanjing', 'nantes'], 'nan'], expected: [['nairobi', 'nanjing', 'nantes'], ['nairobi', 'nanjing', 'nantes'], ['nanjing', 'nantes']], label: 'cap of three applies' },
        { input: [['bonn', 'bonn', 'boston'], 'bo'], expected: [['bonn', 'boston'], ['bonn', 'boston']], hidden: true, label: 'duplicate routes suggested once' },
        { input: [['pa', 'pb', 'pc', 'pd'], 'p'], expected: [['pa', 'pb', 'pc']], hidden: true, label: 'exactly the three smallest survive' },
        { input: [[], 'ab'], expected: [[], []], hidden: true, label: 'empty catalog' },
        { input: [['york', 'yorkdale', 'yorkton'], 'york'], expected: [['york', 'yorkdale', 'yorkton'], ['york', 'yorkdale', 'yorkton'], ['york', 'yorkdale', 'yorkton'], ['york', 'yorkdale', 'yorkton']], hidden: true, label: 'a name that equals the prefix sorts first' },
      ],
      furtherPractice: [
        { name: 'LeetCode 1268. Search Suggestions System', note: 'the classic three-suggestions-per-keystroke problem' },
        { name: 'LeetCode 642. Design Search Autocomplete System', note: 'typeahead ranked by frequency instead of alphabet' },
      ],
    },
    {
      id: 'barcode-plate-pooling',
      title: 'Sequencer Plate Pooling',
      difficulty: 'easy',
      statement: `
A genomics core facility tags every incoming sample with a DNA barcode — a string over the bases \`a\`, \`c\`, \`g\`, \`t\`. Samples are pooled onto sequencing plates by **stem**: two samples share a plate exactly when their barcodes agree on the first \`k\` bases. Barcodes shorter than \`k\` bases cannot define a stem and are skipped entirely.

Given \`barcodes\` and the stem length \`k\`, return one entry per non-empty plate as a two-element list \`[stem, count]\` — the shared length-\`k\` stem and how many samples landed on that plate — **sorted by stem in ascending alphabetical order**. Duplicate barcodes are distinct physical samples, and each one counts.

Runs hold tens of thousands of samples and stems are deliberately designed to collide, so route each sample without re-reading work another sample already did.
`,
      examples: [
        {
          input: 'barcodes = ["acgt", "acgg", "actt", "gggg"], k = 2',
          output: '[["ac", 3], ["gg", 1]]',
          explanation:
            'acgt, acgg, and actt share the stem "ac"; gggg sits alone on plate "gg". Plates are listed in ascending stem order.',
        },
        {
          input: 'barcodes = ["tagc", "ta", "t", "tagg"], k = 3',
          output: '[["tag", 2]]',
          explanation: '"ta" and "t" are shorter than 3 bases and are skipped; the two remaining barcodes share stem "tag".',
        },
        {
          input: 'barcodes = ["gattaca", "gatt", "gacc", "tact", "taga"], k = 3',
          output: '[["gac", 1], ["gat", 2], ["tac", 1], ["tag", 1]]',
          explanation: 'Four distinct stems, sorted ascending; only "gat" pools two samples.',
        },
      ],
      constraints: [
        '0 <= len(barcodes) <= 20_000',
        "1 <= len(barcode) <= 30; characters are only 'a', 'c', 'g', 't'",
        '1 <= k <= 30',
        'Barcodes shorter than k bases are skipped',
        'Output pairs [stem, count] sorted by stem in ascending alphabetical order',
      ],
      hints: [
        'Only the first k bases of a barcode decide where its sample goes; everything after that is noise for this task. And two barcodes that agree on those k bases should not each pay separately to be routed — agreement is the whole point of pooling.',
        'Insert just the first k bases of each long-enough barcode into a prefix tree, bumping a counter on the node where the stem ends. Stems shared by many samples collapse into one shared path with a single counter.',
        'Skip short barcodes before inserting, so every path in the tree has length exactly k. Then DFS from the root to depth k, visiting children in sorted base order, and emit [stem, count] at each depth-k node — sorted order at every level means the plate list comes out already sorted, no extra sort step.',
      ],
      functionName: 'pool_by_stem',
      starterCode: `class TrieNode:
    def __init__(self):
        self.children: dict[str, "TrieNode"] = {}
        self.count = 0


def pool_by_stem(barcodes: list[str], k: int) -> list[list]:
    pass
`,
      solution: {
        code: `class TrieNode:
    def __init__(self):
        self.children = {}  # base -> TrieNode
        self.count = 0      # samples whose stem ends exactly here


def pool_by_stem(barcodes: list[str], k: int) -> list[list]:
    root = TrieNode()

    # Routing phase: only the first k bases matter, and barcodes too short
    # to have a length-k stem never enter the structure at all.
    for code in barcodes:
        if len(code) < k:
            continue
        node = root
        for ch in code[:k]:
            node = node.children.setdefault(ch, TrieNode())
        node.count += 1     # one more sample lands on this plate

    # Harvest phase: every stored path has length exactly k, so depth-k
    # nodes are precisely the non-empty plates. Sorted child order at every
    # level makes the stems come out in ascending order automatically.
    plates = []

    def dfs(node, stem):
        if len(stem) == k:
            plates.append([stem, node.count])
            return
        for ch in sorted(node.children):
            dfs(node.children[ch], stem + ch)

    dfs(root, "")
    return plates
`,
        commentary: `
A counter dict keyed on \`code[:k]\` also solves this — the reason to reach for the trie is what the slicing version hides. First, routing cost: the trie never reads past base \`k\` of any barcode, and barcodes that share a stem share the walk, so heavy collision (the normal case in pooled sequencing, where stems are DESIGNED to coincide) creates proportionally fewer nodes. Second, and more important for the pattern: **the sorted output requires no sort step**. A DFS that visits children in sorted base order reaches the depth-k nodes in ascending stem order by construction, so the plate list falls out of the traversal pre-ordered — the hash-map version pays an extra \`O(p log p)\` sort over the plates every time.

The skip rule (barcodes shorter than \`k\`) is enforced before insertion rather than patched up during traversal, and that placement is the quiet design decision: it keeps the invariant "every path has length exactly k, every depth-k node is a real plate with count >= 1" airtight, so the harvest DFS needs no existence checks, no pruning, and no special cases. Structure built to a clean invariant makes the traversal almost embarrassingly simple — which is exactly the trade you want.
`,
        complexity: 'Time O(total bases read, at most k per barcode) + O(plates) for the harvest; Space O(distinct stem characters)',
        subgoals: [
          {
            lineRange: [1, 4],
            referenceLabel: 'Define a node carrying a bucket tally',
            acceptableKeywords: ['node with children', 'per-node counter', 'trie node definition', 'children plus tally'],
            hint: 'Each group needs a count — where does that live in the structure?',
            misconception: 'The tally sits at the stem-ending node, not on every node along the path.',
          },
          {
            lineRange: [5, 8],
            referenceLabel: 'Open the routine with an empty structure',
            acceptableKeywords: ['create the root', 'function entry point', 'start empty trie', 'begin with bare root'],
            hint: 'Before routing any barcode, what does every path begin from?',
            misconception: 'This only allocates the starting point; no routing has happened.',
          },
          {
            lineRange: [9, 18],
            referenceLabel: 'Route each entry by its leading segment only',
            acceptableKeywords: ['use first k characters', 'skip entries too short', 'insert the prefix segment', 'bump the bucket count'],
            hint: 'Only the opening segment decides the group — and which entries get skipped?',
            misconception: 'Filtering short entries before insertion keeps every stored path exactly length k; it is not patched during harvest.',
          },
          {
            lineRange: [19, 30],
            referenceLabel: 'Set up an ordered traversal of the groups',
            acceptableKeywords: ['collect at full depth', 'visit children sorted', 'depth-k nodes are buckets', 'ordered harvest dfs'],
            hint: 'Depth-k nodes are the groups — how do you reach them already sorted?',
            misconception: 'Sorted child order yields ascending stems for free; no separate sort over the groups is needed.',
          },
          {
            lineRange: [31, 33],
            referenceLabel: 'Run the harvest and return the buckets',
            acceptableKeywords: ['launch the dfs', 'start from the root', 'return the plates', 'run then report'],
            hint: 'With the traversal defined, how do you start it and surface the groups?',
            misconception: 'This driver only invokes and returns; the ordering came from the traversal.',
          },
        ],
      },
      testCases: [
        { input: [['acgt', 'acgg', 'actt', 'gggg'], 2], expected: [['ac', 3], ['gg', 1]], label: 'basic pooling' },
        { input: [['gattaca', 'gatt', 'gacc', 'tact', 'taga'], 3], expected: [['gac', 1], ['gat', 2], ['tac', 1], ['tag', 1]], label: 'several plates, sorted output' },
        { input: [['tagc', 'ta', 't', 'tagg'], 3], expected: [['tag', 2]], label: 'short barcodes skipped' },
        { input: [['a', 'c', 'g', 't'], 1], expected: [['a', 1], ['c', 1], ['g', 1], ['t', 1]], label: 'k equals barcode length' },
        { input: [['ac', 'ag', 'ac'], 2], expected: [['ac', 2], ['ag', 1]], hidden: true, label: 'duplicate barcodes both count' },
        { input: [['aaa'], 5], expected: [], hidden: true, label: 'every barcode too short' },
        { input: [[], 3], expected: [], hidden: true, label: 'no samples' },
        { input: [['ccc', 'ccc', 'cca'], 2], expected: [['cc', 3]], hidden: true, label: 'all samples on one plate' },
      ],
      furtherPractice: [
        { name: 'LeetCode 2416. Sum of Prefix Scores of Strings', note: 'pass-through counters interrogated per word' },
        { name: 'LeetCode 1233. Remove Sub-Folders from the Filesystem', note: 'prefix grouping over path segments instead of characters' },
      ],
    },
    {
      id: 'dimmer-pack-pairing',
      title: 'Dimmer Pack Pairing',
      difficulty: 'hard',
      statement: `
A touring concert-lighting crew is calibrating wireless dimmer packs. Each pack carries a numeric radio ID, and the frequency-hopping scheme works best when the two packs chosen as synchronization anchors have IDs that are **as different as possible bit-for-bit**: a candidate pair is scored by the bitwise XOR of the two IDs, and the crew wants the pair with the maximum score.

Given \`ids\`, the list of pack IDs (non-negative integers; two packs may carry the same ID), return the maximum value of \`ids[i] XOR ids[j]\` over all pairs with \`i != j\`.

The fleet runs to tens of thousands of packs, so scoring every pair is too slow — you need a structure that can find the best partner for any given ID without trying them all.
`,
      examples: [
        {
          input: 'ids = [3, 10, 5, 25, 2, 8]',
          output: '28',
          explanation: '5 XOR 25 = 0b00101 XOR 0b11001 = 0b11100 = 28, the best of all fifteen pairs.',
        },
        {
          input: 'ids = [8, 7]',
          output: '15',
          explanation: '0b1000 XOR 0b0111 = 0b1111 — the two IDs disagree at every bit position.',
        },
        {
          input: 'ids = [0, 0]',
          output: '0',
          explanation: 'Two packs may share an ID; identical IDs score 0, and with only one pair available that is the answer.',
        },
      ],
      constraints: [
        '2 <= len(ids) <= 50_000',
        '0 <= ids[i] < 2**31',
        'IDs may repeat; the chosen pair must use two distinct positions i != j',
      ],
      hints: [
        'Write a few XOR scores out in binary. A pair that first disagrees at bit 20 beats ANY pair whose first disagreement is lower — a high bit outweighs every bit beneath it combined. The all-pairs scan ignores this entirely and treats every pair as equally worth scoring.',
        'Treat each ID as a fixed-width bit string, most significant bit first, and store the fleet in a binary prefix tree whose nodes have at most two children, 0 and 1. Finding the best partner for one ID becomes a single greedy root-to-leaf walk: at each level, which child do you WISH existed?',
        'Pad every ID to the bit-length of the maximum. Insert the first ID; then for each later ID, walk down preferring the opposite-bit child (adding 1 << i to the running score) and falling back to the same-bit child, then insert it. Query-before-insert means every walk scores a pair of two distinct packs; the answer is the maximum walk score.',
      ],
      functionName: 'max_xor_pairing',
      starterCode: `class BitNode:
    def __init__(self):
        self.children: dict[int, "BitNode"] = {}


def max_xor_pairing(ids: list[int]) -> int:
    pass
`,
      solution: {
        code: `class BitNode:
    def __init__(self):
        self.children = {}  # bit (0 or 1) -> BitNode


def max_xor_pairing(ids: list[int]) -> int:
    # Fixed width: pad every ID to the bit-length of the largest, so depth
    # d means the same bit position on every path (handle the all-zero
    # fleet with a minimum width of 1).
    bits = max(max(ids).bit_length(), 1)
    root = BitNode()

    def insert(x):
        node = root
        for i in range(bits - 1, -1, -1):
            b = (x >> i) & 1
            node = node.children.setdefault(b, BitNode())

    def best_score(x):
        # Greedy walk, most significant bit first: the opposite-bit child
        # sets this bit of the XOR, and no combination of lower bits can
        # make up for passing that chance by -- take it whenever it exists.
        node = root
        score = 0
        for i in range(bits - 1, -1, -1):
            b = (x >> i) & 1
            if (1 - b) in node.children:
                score |= 1 << i           # this bit of the XOR is winnable
                node = node.children[1 - b]
            else:
                node = node.children[b]   # paths run full width: present
        return score

    # Query-before-insert covers each unordered pair exactly once and
    # guarantees the partner is a DIFFERENT pack than the one querying.
    insert(ids[0])
    best = 0
    for x in ids[1:]:
        best = max(best, best_score(x))
        insert(x)
    return best
`,
        commentary: `
The all-pairs scan treats every pair as equal, but XOR is radically top-heavy: a disagreement at bit \`i\` outweighs ALL lower bits combined (\`2^i > 2^(i-1) + ... + 1\`). That inequality is the entire correctness argument for the greedy walk — when hunting the best partner for \`x\`, taking the opposite-bit child at the current level is never wrong, because nothing the lower levels offer can compensate for surrendering this one. Greed needs a structure that answers "does any candidate disagree with x at this bit, GIVEN the high bits already committed to?" in O(1) — and that is precisely a binary trie's child map. The "given" clause is why it must be a trie rather than 31 independent per-bit buckets: the walk's current node encodes the full shared history of higher bits.

Fixed width matters more than it looks. Inserting raw bit strings of varying lengths would misalign bit 5 of one ID with bit 9 of another; padding everything to the maximum's bit-length makes depth synonymous with bit position, and it guarantees the fallback child always exists because every stored path runs the full width.

The query-before-insert loop is a small idiom with two payoffs: it enforces \`i != j\` (an ID is never offered itself as a partner — only earlier packs are in the trie), and it covers every unordered pair exactly once, because whichever element comes later does the querying. Total work \`O(n * B)\` with \`B <= 31\` versus the scan's \`O(n^2)\`: at fifty thousand packs, roughly 1.5 million steps instead of 2.5 billion.
`,
        complexity: 'Time O(n * B) where B = bit-length of the max ID (<= 31), Space O(n * B)',
        subgoals: [
          {
            lineRange: [1, 3],
            referenceLabel: 'Define a node branching on a single bit',
            acceptableKeywords: ['binary trie node', 'children keyed by bit', 'node with two branches', 'bit-indexed node'],
            hint: 'For a bitwise structure, what are the outgoing links of each node keyed on?',
            misconception: 'Branching is on one bit (0 or 1), not on a full character or value.',
          },
          {
            lineRange: [4, 11],
            referenceLabel: 'Fix a uniform width and start the structure',
            acceptableKeywords: ['pad to common bit-length', 'align bit positions', 'compute the width', 'create the root'],
            hint: 'Why must every value be considered at the same number of bits before inserting?',
            misconception: 'Fixed width makes depth mean a single bit position across all paths; without it bits would misalign.',
          },
          {
            lineRange: [12, 18],
            referenceLabel: 'Thread a value in bit by bit, high first',
            acceptableKeywords: ['insert most significant first', 'descend by each bit', 'build the bit path', 'create children per bit'],
            hint: 'Going from the top bit down, how does one value get stored?',
            misconception: 'Insertion lays down a full-width path; it does no scoring, only storage.',
          },
          {
            lineRange: [19, 32],
            referenceLabel: 'Greedily chase the opposite bit for the best partner',
            acceptableKeywords: ['greedy walk top bit first', 'prefer the opposite bit child', 'maximise high bits first', 'accumulate the score'],
            hint: 'At each level, which child grows the result, and why take it without hesitation?',
            misconception: 'Taking the opposite-bit child whenever it exists is optimal because a high bit outweighs all lower bits combined.',
          },
          {
            lineRange: [33, 41],
            referenceLabel: 'Query each value before storing it, tracking the best',
            acceptableKeywords: ['query before insert', 'each pair counted once', 'keep the running maximum', 'partner is a different element'],
            hint: 'How does asking before inserting cover every pair once and forbid self-pairing?',
            misconception: 'Querying before inserting both ensures the partner is a distinct earlier element and visits each unordered pair exactly once.',
          },
        ],
      },
      testCases: [
        { input: [[3, 10, 5, 25, 2, 8]], expected: 28, label: 'classic small fleet' },
        { input: [[8, 7]], expected: 15, label: 'total disagreement' },
        { input: [[1, 2, 4, 8]], expected: 12, label: 'single-bit ids' },
        { input: [[0, 0]], expected: 0, label: 'all-zero fleet' },
        { input: [[5, 5, 5]], expected: 0, hidden: true, label: 'every id identical' },
        { input: [[1023, 0]], expected: 1023, hidden: true, label: 'zero against all-ones' },
        { input: [[14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70]], expected: 127, hidden: true, label: 'larger fleet with duplicate' },
        { input: [[2147483647, 1]], expected: 2147483646, hidden: true, label: 'top of the id range' },
      ],
      furtherPractice: [
        { name: 'LeetCode 421. Maximum XOR of Two Numbers in an Array', note: 'the classic binary-trie greedy' },
        { name: 'LeetCode 1707. Maximum XOR With an Element From an Array', note: 'the same trie with an extra constraint per query' },
      ],
    },
  ],
  quiz: [
    {
      id: 'q1',
      kind: 'conceptual',
      prompt: 'In a trie, what does a single node fundamentally represent?',
      choices: [
        'One complete word from the dictionary',
        'The prefix spelled by the path from the root down to that node',
        'A hash bucket holding all words of the same length',
        'One character, independent of where it appears in a word',
      ],
      correctIndex: 1,
      explanation:
        'A node stands for the string spelled by walking root-to-node — a prefix shared by every word stored beneath it. "One complete word" is the tempting answer because leaf nodes do end words, but words can also end at internal nodes ("app" inside "apple"), which is exactly why nodes represent prefixes and a separate marker flags which prefixes are complete words. A node is not "one character in isolation" either: the same letter appears in many nodes, each meaning something different because of the path above it.',
    },
    {
      id: 'q2',
      kind: 'conceptual',
      prompt: 'Why does a trie need an explicit end-of-word marker on its nodes?',
      choices: [
        'Because inserting a word creates a path for every one of its prefixes, so node existence alone cannot distinguish a stored word from a mere prefix of one',
        'To make lookups O(1) instead of O(L)',
        'Because child dictionaries cannot store the empty string',
        'It does not — leaves always coincide exactly with word ends',
      ],
      correctIndex: 0,
      explanation:
        'Storing "apple" creates nodes for "a", "ap", "app"... — paths exist for every prefix whether or not it was inserted. Only the marker distinguishes "app is stored" from "app is just a hallway". The "leaves always coincide with word ends" claim is the tempting trap: it holds only when no stored word is a prefix of another, which real dictionaries violate constantly. And markers change correctness, not asymptotic cost — lookup stays O(L) either way.',
    },
    {
      id: 'q3',
      kind: 'complexity',
      prompt: 'A trie holds N words totaling C characters. What does it cost to check whether one word of length L is stored?',
      choices: ['O(log N)', 'O(L), independent of N and C', 'O(N)', 'O(L * N)'],
      correctIndex: 1,
      explanation:
        'Lookup walks at most L child links and reads one flag — the dictionary size never enters the loop. That independence from N is the trie\'s core complexity promise. O(log N) is the tempting answer because "dictionary lookup" sounds like search, but it describes balanced BSTs or binary search over a sorted list, where each of the log N comparisons can itself cost up to O(L).',
    },
    {
      id: 'q4',
      kind: 'complexity',
      prompt: "A pattern like \"..a.\" (dots match exactly one letter) is matched against a trie. What bounds the worst-case cost of one such query?",
      choices: [
        'O(L) — a dot costs the same as a literal letter',
        'O(26^L) with no dependence on what the trie contains',
        'The number of nodes in the trie — each dot fans out to every existing child, so the DFS can touch nearly the whole structure but never more',
        'O(log N) per pattern character',
      ],
      correctIndex: 2,
      explanation:
        'Literal characters follow one child; each dot branches into all children the node actually has. In the worst case (all dots, adversarial dictionary) the DFS explores almost every trie node — bounded by trie size, i.e. O(total stored characters). Plain O(L) is the tempting answer, but it holds only for patterns with no dots. 26^L is the cost of enumerating concrete strings against a hash set, which is precisely what the trie avoids by only following children that exist.',
    },
    {
      id: 'q5',
      kind: 'scenario',
      prompt:
        'A product search bar must show, for each keystroke, how many catalog items start with the text typed so far. The catalog is fixed; millions of prefix queries arrive per day. Which approach fits?',
      choices: [
        'Keep a hash set of the catalog; for each query, scan every item with startswith and count the hits',
        'Build a trie once with a pass-through counter on every node; answer each query by walking its characters and reading the final node\'s counter',
        'Run a sliding window over the concatenation of all catalog names',
        'Re-sort the catalog on every query and linearly scan the block of matches',
      ],
      correctIndex: 1,
      explanation:
        'Counters maintained at build time turn every query into an O(L) walk plus one integer read — dictionary size never appears in query cost. The hash-set scan is the tempting wrong pattern: hash sets are great for exact membership, but prefix questions force an O(N * L) scan per query, ruinous at millions of queries. A sliding window answers contiguous-subarray questions, not string-prefix aggregation, and re-sorting per query does strictly more work than the scan it replaces.',
    },
    {
      id: 'q6',
      kind: 'scenario',
      prompt:
        "Lookups against a fixed name registry may contain '.' wildcards, each matching exactly one letter (e.g. \"pay....\"). Which approach handles this without exponential blow-up?",
      choices: [
        'Expand every dot into all 26 letters, then test each concrete candidate against a hash set',
        'Binary-search each pattern in a sorted list of the names',
        'Store the names in a trie and DFS: follow the single matching child for a literal, branch into every existing child for a dot',
        'Hash each pattern with the dots removed and compare against hashes of the names',
      ],
      correctIndex: 2,
      explanation:
        'The trie DFS only ever explores letters the registry actually contains, so its cost is capped by trie size regardless of dot count. Expanding dots against a hash set is the tempting reflex: it generates 26^(#dots) candidates — about 12 million for five dots — almost all of which exist nowhere. Binary search cannot handle a leading dot at all, since the first character determines where to look, and hashing with the dots removed conflates patterns of different lengths and positions.',
    },
    {
      id: 'q7',
      kind: 'complexity',
      prompt: 'What is the space complexity of a trie storing N words with C total characters?',
      choices: [
        'O(N) nodes, regardless of word lengths',
        'O(26^L) where L is the longest word',
        'O(C) nodes in the worst case, with shared prefixes reducing it in practice',
        'O(L) — only the longest word matters',
      ],
      correctIndex: 2,
      explanation:
        'Each inserted character creates at most one new node, so C characters bound the node count; words sharing prefixes reuse nodes, which is the whole compression story. O(N) is the tempting undercount — node count tracks characters, not words, so one very long word can dominate. 26^L is the size of the space of possible strings, not of the structure, which only materializes paths that were actually inserted.',
    },
    {
      id: 'q8',
      kind: 'conceptual',
      prompt:
        'When replacing each word with its shortest dictionary root, why does a single trie walk find the right root without ever comparing candidates?',
      choices: [
        'The walk visits the word\'s prefixes in increasing length, so the first end-of-word marker encountered belongs to the shortest matching root — return immediately',
        'The trie stores roots in alphabetical order, so the first child checked is always the shortest root',
        'You must collect every marker along the path and take the minimum-length one afterwards',
        'Tries deduplicate roots that share letters, leaving only the shortest one in the structure',
      ],
      correctIndex: 0,
      explanation:
        'Depth in a trie equals prefix length, so a root-to-node walk enumerates candidates shortest-first by construction; the first marker wins and the walk can stop. Collect-every-marker-then-minimize is the tempting over-engineered version — it gives the same answer but does provably unnecessary work by ignoring the early exit. Alphabetical order says nothing about length, and tries never discard longer roots — markers for nested roots coexist at different depths on the same path.',
    },
  ],
  flashcards: [
    {
      id: 'f1',
      front: 'Signal: when does a problem call for a trie?',
      back: 'Many strings plus questions about their beginnings: starts-with queries, autocomplete counts, longest common prefix, shortest-root replacement, or character-level wildcard matching against a fixed dictionary.',
    },
    {
      id: 'f2',
      front: 'Anatomy of a trie node?',
      back: 'A children map (char → node) plus an is_word flag, optionally decorated with payloads like pass-through counts. The node itself represents the prefix spelled by the root-to-node path.',
    },
    {
      id: 'f3',
      front: 'Insert template (Python)?',
      back: 'node = root; for ch in word: node = node.children.setdefault(ch, TrieNode()); then node.is_word = True. Each character either follows or creates exactly one link.',
    },
    {
      id: 'f4',
      front: 'Lookup has two distinct failure modes — what are they?',
      back: 'Falling off the trie (a child is missing: the prefix exists nowhere) versus finishing on an unmarked node (the prefix exists but no stored word ends there). Conflating them causes "app" to look stored because "apple" is.',
    },
    {
      id: 'f5',
      front: 'Insert / lookup complexity for a word of length L in a trie of N words?',
      back: 'O(L) for both — you walk at most L links. Dictionary size N never appears, which is the trie\'s core promise.',
    },
    {
      id: 'f6',
      front: 'Trie space complexity, and what tames it?',
      back: 'O(total characters) nodes in the worst case. Shared prefixes collapse into shared paths, so real vocabularies compress heavily; use dict children rather than 26-slot arrays for sparse data.',
    },
    {
      id: 'f7',
      front: "Template move: count how many words start with each queried prefix?",
      back: 'Store a pass-through counter on every node (root included) and increment it along each inserted word\'s path. A query is then a walk plus one read; a missing child means 0.',
    },
    {
      id: 'f8',
      front: "Template move: '.' wildcard matching against a dictionary?",
      back: 'DFS over the trie: literal characters follow the one matching child; a dot recurses into every existing child via any(). Base case requires is_word, not mere node existence, so lengths match exactly.',
    },
    {
      id: 'f9',
      front: 'Template move: replace a word with its shortest dictionary root?',
      back: 'Walk the word through the root trie and return word[:i+1] at the FIRST is_word marker — depth equals prefix length, so the walk visits candidates shortest-first. Fall off or exhaust the word: keep it unchanged.',
    },
    {
      id: 'f10',
      front: 'Pitfall: when is a trie the wrong tool for string lookups?',
      back: 'Plain exact-membership tests — a hash set is simpler, faster in practice, and lighter on memory. A trie earns its overhead only when prefix structure (counts, walks, wildcards, shortest-prefix) is part of the question.',
    },
  ],
  cheatSheet: {
    tldr:
      'A trie stores strings as paths in a character-labeled tree, so words sharing a beginning share structure. Build it once in O(total characters); afterwards any prefix question — membership, starts-with counts, shortest matching root, single-character wildcards — reduces to a walk of at most word-length steps, independent of dictionary size. The end-of-word marker separates "stored word" from "mere prefix", and payloads hung on nodes (counters, ranks) turn aggregate prefix queries into a single read at the end of a walk.',
    signals: [
      'Reach for this when many queries ask about string beginnings: "starts with", autocomplete, longest common prefix, shortest root.',
      'Reach for this when you would otherwise run startswith over the whole dictionary per query — the O(n * q) scan smell.',
      'Reach for this when matching proceeds character by character with branching, e.g. a "." wildcard that should only explore letters the dictionary actually contains.',
      'Reach for this when you need counts or aggregates grouped by prefix — decorate the nodes with the aggregate.',
      'Skip it for plain exact membership (hash set wins) or substring-anywhere queries (suffix structures win).',
    ],
    template: `class TrieNode:
    def __init__(self):
        self.children = {}    # char -> TrieNode
        self.is_word = False  # a stored word ends exactly here
        self.count = 0        # optional payload: words passing through

def insert(root, word):
    root.count += 1           # count the root too: the empty prefix matches every word
    node = root
    for ch in word:
        node = node.children.setdefault(ch, TrieNode())
        node.count += 1       # maintain payloads on the way down
    node.is_word = True

def walk(root, prefix):       # -> node or None
    node = root
    for ch in prefix:
        node = node.children.get(ch)
        if node is None:
            return None       # nothing stored starts with this prefix
    return node               # read node.is_word / node.count as needed`,
    complexity:
      'Build O(total chars); insert/lookup/prefix-walk O(L) per string, independent of dictionary size; space O(total chars). Wildcard DFS worst case bounded by trie size.',
  },
}

export default mod
