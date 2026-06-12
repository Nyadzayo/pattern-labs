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
