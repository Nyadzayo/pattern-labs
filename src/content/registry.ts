import type { ModuleContent, ModuleId, ModuleMeta } from './types'

/**
 * Curriculum metadata for all 19 modules. Always available, even before a
 * module's full content file has been written — the UI shows metadata-only
 * modules as "coming soon".
 */
export const MODULES: ModuleMeta[] = [
  { id: 'two-pointers', title: 'Two Pointers', order: 1, blurb: 'Converging indices over sorted data', visualizer: 'two-pointers' },
  { id: 'hash-maps-sets', title: 'Hash Maps & Sets', order: 2, blurb: 'Trade memory for O(1) lookups', visualizer: 'sliding-window' },
  { id: 'linked-lists', title: 'Linked Lists', order: 3, blurb: 'Pointer surgery without losing nodes', visualizer: 'linked-list' },
  { id: 'fast-slow-pointers', title: 'Fast & Slow Pointers', order: 4, blurb: 'Cycle detection by lapping', visualizer: 'linked-list' },
  { id: 'sliding-windows', title: 'Sliding Windows', order: 5, blurb: 'Grow and shrink a moving range', visualizer: 'sliding-window' },
  { id: 'binary-search', title: 'Binary Search', order: 6, blurb: 'Halve the search space every step', visualizer: 'binary-search' },
  { id: 'stacks', title: 'Stacks', order: 7, blurb: 'Last in, first out — defer and resolve', visualizer: 'stack' },
  { id: 'heaps', title: 'Heaps', order: 8, blurb: 'Cheap access to the extreme element', visualizer: 'heap' },
  { id: 'intervals', title: 'Intervals', order: 9, blurb: 'Sort, then sweep overlapping ranges', visualizer: 'intervals' },
  { id: 'prefix-sums', title: 'Prefix Sums', order: 10, blurb: 'Precompute running totals for O(1) range queries', visualizer: 'prefix-sums' },
  { id: 'trees', title: 'Trees', order: 11, blurb: 'Recursive structure, recursive solutions', visualizer: 'tree-traversal' },
  { id: 'tries', title: 'Tries', order: 12, blurb: 'Prefix trees for string sets', visualizer: 'trie' },
  { id: 'graphs', title: 'Graphs', order: 13, blurb: 'BFS ripples and DFS dives', visualizer: 'graph-traversal' },
  { id: 'backtracking', title: 'Backtracking', order: 14, blurb: 'Explore, hit a wall, undo, try again', visualizer: 'backtracking' },
  { id: 'dynamic-programming', title: 'Dynamic Programming', order: 15, blurb: 'Solve each subproblem exactly once', visualizer: 'dp-table' },
  { id: 'greedy', title: 'Greedy', order: 16, blurb: 'Locally best choices that stay globally safe', visualizer: 'greedy-intervals' },
  { id: 'sort-search', title: 'Sort & Search', order: 17, blurb: 'Ordering as a preprocessing superpower', visualizer: 'binary-search' },
  { id: 'bit-manipulation', title: 'Bit Manipulation', order: 18, blurb: 'Arithmetic at the register level', visualizer: 'bitwise' },
  { id: 'math-geometry', title: 'Math & Geometry', order: 19, blurb: 'Number theory and coordinate tricks', visualizer: 'dp-table' },
]

export const MODULE_TITLES: Record<ModuleId, string> = Object.fromEntries(
  MODULES.map((m) => [m.id, m.title]),
) as Record<ModuleId, string>

/**
 * Full content, registered as each content file is written. Content files
 * self-register by being imported in src/content/index.ts.
 */
const contentRegistry = new Map<ModuleId, ModuleContent>()

export function registerModule(content: ModuleContent): void {
  contentRegistry.set(content.id, content)
}

export function getModuleContent(id: ModuleId): ModuleContent | undefined {
  return contentRegistry.get(id)
}

export function getModuleMeta(id: ModuleId): ModuleMeta | undefined {
  return MODULES.find((m) => m.id === id)
}

export function hasContent(id: ModuleId): boolean {
  return contentRegistry.has(id)
}

export function allLoadedContent(): ModuleContent[] {
  return MODULES.filter((m) => contentRegistry.has(m.id)).map(
    (m) => contentRegistry.get(m.id)!,
  )
}
