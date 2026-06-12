import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getModuleContent, getModuleMeta, hasContent } from '@/content'
import type { ModuleId } from '@/content'

/**
 * Interactive "Which pattern do I use?" decision tree. Answer questions
 * about the problem's shape; get routed to a pattern module.
 */

interface ResultNode {
  kind: 'result'
  moduleId: ModuleId
  reason: string
}

interface QuestionNode {
  kind: 'question'
  question: string
  options: { label: string; next: string }[]
}

type Node = QuestionNode | ResultNode

const TREE: Record<string, Node> = {
  start: {
    kind: 'question',
    question: 'What is the main thing the problem hands you?',
    options: [
      { label: 'An array or string', next: 'array' },
      { label: 'A linked chain of nodes', next: 'linked' },
      { label: 'A tree, hierarchy, or dictionary of words', next: 'tree' },
      { label: 'A graph, grid, or network of connections', next: 'graphs-r' },
      { label: 'Time ranges, bookings, or intervals', next: 'intervals-q' },
      { label: 'Plain integers, bits, or geometry', next: 'numbers' },
    ],
  },

  array: {
    kind: 'question',
    question: 'What is it asking you to find?',
    options: [
      { label: 'A pair/combination, or compare from both ends', next: 'array-sorted' },
      { label: 'The best contiguous run (subarray/substring)', next: 'array-window' },
      { label: 'Fast lookups: “have I seen this?”, grouping, counting', next: 'hash-r' },
      { label: 'Sums over many ranges of the array', next: 'prefix-r' },
      { label: 'A position/threshold, or k-th / custom ordering', next: 'array-order' },
      { label: 'All possible configurations, or an optimal value built from choices', next: 'choices' },
    ],
  },
  'array-sorted': {
    kind: 'question',
    question: 'Is the data sorted (or would sorting it not destroy the answer)?',
    options: [
      { label: 'Yes — sorted or sortable', next: 'two-pointers-r' },
      { label: 'No — order must be preserved', next: 'hash-r' },
    ],
  },
  'array-window': {
    kind: 'question',
    question: 'Does growing the run ever make it invalid again (a constraint like “at most K distinct”)?',
    options: [
      { label: 'Yes — a window must stretch and shrink', next: 'sliding-r' },
      { label: 'It is about most-recent unresolved items (matching, undo, next-greater)', next: 'stacks-r' },
    ],
  },
  'array-order': {
    kind: 'question',
    question: 'Which flavor of ordering?',
    options: [
      { label: 'Search a sorted space for a position or threshold — even an abstract answer space', next: 'binary-r' },
      { label: 'Repeatedly need the current min/max (top-k, streaming)', next: 'heaps-r' },
      { label: 'Sort as preprocessing, k-th element, custom comparison', next: 'sort-r' },
    ],
  },
  choices: {
    kind: 'question',
    question: 'Do you need every valid configuration, or just the best score/count?',
    options: [
      { label: 'Enumerate them all (or count by building each)', next: 'backtracking-r' },
      { label: 'Just the optimum — and subproblems repeat', next: 'dp-r' },
      { label: 'Just the optimum — and a local rule never needs undoing', next: 'greedy-r' },
    ],
  },

  linked: {
    kind: 'question',
    question: 'What about the chain?',
    options: [
      { label: 'Rewire it: reverse, merge, splice, delete', next: 'linked-r' },
      { label: 'Detect a cycle, find the middle, or k-th from the end', next: 'fastslow-r' },
    ],
  },

  tree: {
    kind: 'question',
    question: 'Which kind of hierarchy?',
    options: [
      { label: 'A general tree / BST — traverse, validate, aggregate', next: 'trees-r' },
      { label: 'Many strings sharing prefixes (autocomplete, dictionaries)', next: 'tries-r' },
    ],
  },

  'intervals-q': {
    kind: 'question',
    question: 'What is the goal with the ranges?',
    options: [
      { label: 'Merge/insert/measure overlaps', next: 'intervals-r' },
      { label: 'Pick the largest compatible subset (scheduling)', next: 'greedy-r' },
    ],
  },

  numbers: {
    kind: 'question',
    question: 'Closer to bits or to math?',
    options: [
      { label: 'Bit flags, XOR tricks, masks, shifts', next: 'bits-r' },
      { label: 'Primes, GCD, matrices, coordinates', next: 'math-r' },
    ],
  },

  'two-pointers-r': { kind: 'result', moduleId: 'two-pointers', reason: 'Sorted data + a pair/combination target means converging pointers can discard candidates from both ends without missing the answer.' },
  'hash-r': { kind: 'result', moduleId: 'hash-maps-sets', reason: 'Membership, counting, and grouping questions are O(1) lookups once you trade memory for a hash table.' },
  'sliding-r': { kind: 'result', moduleId: 'sliding-windows', reason: 'A contiguous run whose validity can break as it grows is exactly what an expand/contract window handles in one pass.' },
  'binary-r': { kind: 'result', moduleId: 'binary-search', reason: 'A monotonic “too small / too big” test over a sorted (or conceptual) space lets you halve it every step.' },
  'stacks-r': { kind: 'result', moduleId: 'stacks', reason: 'When the most recent unresolved item is always the next to resolve, a stack models the deferral naturally.' },
  'heaps-r': { kind: 'result', moduleId: 'heaps', reason: 'Repeated access to the current extreme without full sorting is the heap’s entire job.' },
  'intervals-r': { kind: 'result', moduleId: 'intervals', reason: 'Sort by start, then sweep once, merging or measuring as ranges touch.' },
  'prefix-r': { kind: 'result', moduleId: 'prefix-sums', reason: 'Precompute running totals once; any range sum becomes a single subtraction.' },
  'linked-r': { kind: 'result', moduleId: 'linked-lists', reason: 'Pointer surgery — keep prev/curr/next straight and never lose a node.' },
  'fastslow-r': { kind: 'result', moduleId: 'fast-slow-pointers', reason: 'Two speeds over the same chain answer cycle and midpoint questions in O(1) space.' },
  'trees-r': { kind: 'result', moduleId: 'trees', reason: 'Recursive structure, recursive solution: solve each subtree and combine.' },
  'tries-r': { kind: 'result', moduleId: 'tries', reason: 'Shared prefixes deserve a shared path — a trie makes prefix queries proportional to the word, not the dictionary.' },
  'graphs-r': { kind: 'result', moduleId: 'graphs', reason: 'Reachability, components, and shortest unweighted paths are BFS/DFS territory.' },
  'backtracking-r': { kind: 'result', moduleId: 'backtracking', reason: 'Build candidates choice by choice, undo on dead ends — the decision tree is the algorithm.' },
  'dp-r': { kind: 'result', moduleId: 'dynamic-programming', reason: 'Optimal value + overlapping subproblems = solve each state once and reuse it.' },
  'greedy-r': { kind: 'result', moduleId: 'greedy', reason: 'When a local choice is provably safe (exchange argument), commit and never look back.' },
  'sort-r': { kind: 'result', moduleId: 'sort-search', reason: 'Ordering as preprocessing unlocks binary search, two pointers, and k-th element tricks.' },
  'bits-r': { kind: 'result', moduleId: 'bit-manipulation', reason: 'Masks, XOR, and shifts turn set logic into single-cycle arithmetic.' },
  'math-r': { kind: 'result', moduleId: 'math-geometry', reason: 'Number theory and coordinate manipulation have their own toolbox.' },
}

export function DecisionTreePage() {
  const [path, setPath] = useState<{ nodeId: string; choice?: string }[]>([{ nodeId: 'start' }])
  const current = TREE[path[path.length - 1].nodeId]

  function choose(option: { label: string; next: string }) {
    setPath((p) => [
      ...p.slice(0, -1),
      { ...p[p.length - 1], choice: option.label },
      { nodeId: option.next },
    ])
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Which pattern do I use?</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Describe the problem; get routed to the right tool.
      </p>

      {path.length > 1 && (
        <div className="mt-5 space-y-1">
          {path.slice(0, -1).map((step, i) => (
            <button
              key={i}
              onClick={() => setPath(path.slice(0, i + 1))}
              className="block text-left text-xs text-ink-faint transition-colors hover:text-accent"
              title="Go back to this question"
            >
              {i + 1}. {(TREE[step.nodeId] as QuestionNode).question}{' '}
              <span className="font-medium text-ink-muted">→ {step.choice}</span>
            </button>
          ))}
        </div>
      )}

      <motion.div
        key={path.length}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-5"
      >
        {current.kind === 'question' ? (
          <div className="rounded-xl border border-edge bg-surface-raised p-5">
            <div className="font-medium">{current.question}</div>
            <div className="mt-3 space-y-2">
              {current.options.map((o) => (
                <button
                  key={o.label}
                  onClick={() => choose(o)}
                  className="block w-full rounded-lg border border-edge px-4 py-2.5 text-left text-sm transition-colors hover:border-accent/60 hover:bg-accent-soft/20"
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ResultCard node={current} onRestart={() => setPath([{ nodeId: 'start' }])} />
        )}
      </motion.div>

      {path.length > 1 && (
        <button
          onClick={() => setPath([{ nodeId: 'start' }])}
          className="mt-4 text-sm text-ink-faint underline underline-offset-2 hover:text-ink"
        >
          Start over
        </button>
      )}
    </div>
  )
}

function ResultCard({ node, onRestart }: { node: ResultNode; onRestart: () => void }) {
  const meta = getModuleMeta(node.moduleId)!
  const content = getModuleContent(node.moduleId)
  const ready = hasContent(node.moduleId)
  return (
    <div className="rounded-xl border border-accent/50 bg-accent-soft/20 p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-accent">
        Reach for
      </div>
      <div className="mt-1 text-xl font-semibold">{meta.title}</div>
      <p className="mt-2 text-sm leading-6 text-ink-muted">{node.reason}</p>
      {content && (
        <p className="mt-2 text-sm leading-6 text-ink-muted">{content.cheatSheet.tldr}</p>
      )}
      <div className="mt-4 flex gap-2">
        {ready ? (
          <Link
            to={`/module/${meta.id}`}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Open the module →
          </Link>
        ) : (
          <span className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-faint">
            Module coming soon
          </span>
        )}
        <button
          onClick={onRestart}
          className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-muted hover:text-ink"
        >
          Ask again
        </button>
      </div>
    </div>
  )
}
