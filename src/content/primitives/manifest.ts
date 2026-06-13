/**
 * Primitives Lab — catalog manifest (the authoring work-list + coverage spec).
 *
 * This is the source of truth for *which* primitives exist. The validator
 * (`scripts/validate-primitives.ts`) cross-checks it against the authored
 * primitive files and fails the build if:
 *   - any authored primitive id is absent here (or vice-versa), or
 *   - any of the 19 modules has zero primitives tagging it.
 *
 * ~40 micro-patterns across 10 categories, derived from the Phase-5.5 catalog.
 * Every entry's `moduleTags` is chosen so all 19 curriculum modules are covered.
 */
import type { ModuleId } from '../types'
import type { PrimitiveCategory } from './types'

export interface ManifestEntry {
  id: string
  name: string
  category: PrimitiveCategory
  moduleTags: ModuleId[]
}

export const PRIMITIVE_MANIFEST: ManifestEntry[] = [
  // ── loops (5+1) ──────────────────────────────────────────────────────────
  { id: 'loop-forward-index', name: 'Forward index scan', category: 'loops', moduleTags: ['two-pointers', 'prefix-sums', 'sort-search', 'math-geometry'] },
  { id: 'loop-reverse-index', name: 'Reverse index scan', category: 'loops', moduleTags: ['dynamic-programming', 'math-geometry', 'stacks'] },
  { id: 'loop-nested-pairs', name: 'Nested pair enumeration (j = i+1)', category: 'loops', moduleTags: ['two-pointers', 'math-geometry'] },
  { id: 'loop-while-compound', name: 'While with compound condition', category: 'loops', moduleTags: ['two-pointers', 'sliding-windows', 'binary-search'] },
  { id: 'loop-and-a-half', name: 'Loop-and-a-half / early exit', category: 'loops', moduleTags: ['linked-lists', 'fast-slow-pointers'] },
  { id: 'loop-bit-scan', name: 'Scan set bits', category: 'loops', moduleTags: ['bit-manipulation', 'math-geometry'] },

  // ── state (5+1) ──────────────────────────────────────────────────────────
  { id: 'state-accumulator-identity', name: 'Accumulator identities (0 / 1 / ±inf)', category: 'state', moduleTags: ['prefix-sums', 'dynamic-programming', 'math-geometry'] },
  { id: 'state-best-so-far', name: 'Best-so-far tracking', category: 'state', moduleTags: ['greedy', 'intervals', 'dynamic-programming'] },
  { id: 'state-swap', name: 'Tuple swap', category: 'state', moduleTags: ['sort-search', 'two-pointers', 'linked-lists'] },
  { id: 'state-multi-assign-advance', name: 'Multi-assign pointer advance', category: 'state', moduleTags: ['linked-lists', 'fast-slow-pointers'] },
  { id: 'state-visited-set', name: 'Visited-set guard', category: 'state', moduleTags: ['graphs', 'trees'] },
  { id: 'state-xor-accumulate', name: 'XOR / parity accumulate', category: 'state', moduleTags: ['bit-manipulation'] },

  // ── two-pointers (3) ─────────────────────────────────────────────────────
  { id: 'tp-opposite-ends', name: 'Opposite-ends converge', category: 'two-pointers', moduleTags: ['two-pointers', 'sort-search'] },
  { id: 'tp-reader-writer', name: 'Reader / writer compaction', category: 'two-pointers', moduleTags: ['two-pointers', 'linked-lists'] },
  { id: 'tp-fast-slow', name: 'Fast / slow advance', category: 'two-pointers', moduleTags: ['fast-slow-pointers', 'linked-lists'] },

  // ── sliding-window (4) ───────────────────────────────────────────────────
  { id: 'sw-expand-right', name: 'Expand right edge', category: 'sliding-window', moduleTags: ['sliding-windows'] },
  { id: 'sw-shrink-left', name: 'Shrink while invalid', category: 'sliding-window', moduleTags: ['sliding-windows'] },
  { id: 'sw-length-math', name: 'Window length math', category: 'sliding-window', moduleTags: ['sliding-windows', 'prefix-sums'] },
  { id: 'sw-freq-map', name: 'Window frequency map add/remove', category: 'sliding-window', moduleTags: ['sliding-windows', 'hash-maps-sets'] },

  // ── hashing (3+1) ────────────────────────────────────────────────────────
  { id: 'hash-count-default', name: 'Count with get-default', category: 'hashing', moduleTags: ['hash-maps-sets'] },
  { id: 'hash-seen-set', name: 'Seen-set membership', category: 'hashing', moduleTags: ['hash-maps-sets', 'graphs'] },
  { id: 'hash-complement-lookup', name: 'Complement lookup', category: 'hashing', moduleTags: ['hash-maps-sets', 'two-pointers'] },
  { id: 'trie-descend-children', name: 'Trie descend via children map', category: 'hashing', moduleTags: ['tries'] },

  // ── binary-search (4) ────────────────────────────────────────────────────
  { id: 'bs-lo-hi-init', name: 'lo / hi initialization', category: 'binary-search', moduleTags: ['binary-search', 'sort-search'] },
  { id: 'bs-mid-overflow-safe', name: 'Overflow-safe midpoint', category: 'binary-search', moduleTags: ['binary-search'] },
  { id: 'bs-boundary-condition', name: 'lo<hi vs lo<=hi boundary', category: 'binary-search', moduleTags: ['binary-search', 'sort-search'] },
  { id: 'bs-insertion-point', name: 'Insertion point (lower bound)', category: 'binary-search', moduleTags: ['binary-search', 'sort-search', 'intervals'] },

  // ── stack-queue (3+1) ────────────────────────────────────────────────────
  { id: 'stack-push-pop-match', name: 'Push / pop bracket match', category: 'stack-queue', moduleTags: ['stacks'] },
  { id: 'stack-monotonic-pop', name: 'Monotonic-stack pop-while', category: 'stack-queue', moduleTags: ['stacks'] },
  { id: 'queue-bfs-level-size', name: 'BFS by level size', category: 'stack-queue', moduleTags: ['graphs', 'trees'] },
  { id: 'heap-push-pop-k', name: 'Maintain a size-k heap', category: 'stack-queue', moduleTags: ['heaps'] },

  // ── recursion (2) ────────────────────────────────────────────────────────
  { id: 'rec-dfs-combine', name: 'DFS base / recurse / combine', category: 'recursion', moduleTags: ['trees', 'graphs'] },
  { id: 'rec-backtrack-choose', name: 'Backtracking choose / explore / unchoose', category: 'recursion', moduleTags: ['backtracking'] },

  // ── dp (3) ───────────────────────────────────────────────────────────────
  { id: 'dp-table-init', name: 'Table dimensions + init', category: 'dp', moduleTags: ['dynamic-programming'] },
  { id: 'dp-fill-order', name: 'Fill order (dependency direction)', category: 'dp', moduleTags: ['dynamic-programming'] },
  { id: 'dp-transition-ref', name: 'Transition references prior states', category: 'dp', moduleTags: ['dynamic-programming'] },

  // ── arrays (3+1) ─────────────────────────────────────────────────────────
  { id: 'arr-prefix-sum-build', name: 'Prefix-sum build', category: 'arrays', moduleTags: ['prefix-sums'] },
  { id: 'arr-in-place-reverse', name: 'In-place reverse', category: 'arrays', moduleTags: ['math-geometry', 'two-pointers'] },
  { id: 'arr-k-rotation', name: 'k-rotation', category: 'arrays', moduleTags: ['math-geometry'] },
  { id: 'interval-sort-sweep', name: 'Sort + sweep-merge overlaps', category: 'arrays', moduleTags: ['intervals', 'greedy', 'sort-search'] },
]

export const MANIFEST_IDS: readonly string[] = PRIMITIVE_MANIFEST.map((e) => e.id)

export function manifestEntry(id: string): ManifestEntry | undefined {
  return PRIMITIVE_MANIFEST.find((e) => e.id === id)
}
