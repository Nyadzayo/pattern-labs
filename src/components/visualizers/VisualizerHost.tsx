import { lazy, Suspense } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import type { VisualizerId } from '@/content'

/**
 * One lazily-loaded component per visualizer family. Each file in ./viz
 * default-exports a self-contained visualizer (input controls + StepPlayer).
 */
const REGISTRY: Record<VisualizerId, LazyExoticComponent<ComponentType>> = {
  'two-pointers': lazy(() => import('./viz/two-pointers')),
  'sliding-window': lazy(() => import('./viz/sliding-window')),
  'binary-search': lazy(() => import('./viz/binary-search')),
  'linked-list': lazy(() => import('./viz/linked-list')),
  stack: lazy(() => import('./viz/stack')),
  heap: lazy(() => import('./viz/heap')),
  intervals: lazy(() => import('./viz/intervals')),
  'prefix-sums': lazy(() => import('./viz/prefix-sums')),
  'tree-traversal': lazy(() => import('./viz/tree-traversal')),
  trie: lazy(() => import('./viz/trie')),
  'graph-traversal': lazy(() => import('./viz/graph-traversal')),
  backtracking: lazy(() => import('./viz/backtracking')),
  'dp-table': lazy(() => import('./viz/dp-table')),
  'greedy-intervals': lazy(() => import('./viz/greedy-intervals')),
  bitwise: lazy(() => import('./viz/bitwise')),
}

export function VisualizerHost({ id }: { id: VisualizerId }) {
  const Viz = REGISTRY[id]
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-edge p-8 text-center text-sm text-ink-muted">
          Loading visualizer…
        </div>
      }
    >
      <Viz />
    </Suspense>
  )
}
