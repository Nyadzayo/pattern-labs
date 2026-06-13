import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { allPrimitives, getPrimitive } from '@/content/primitives/registry'
import { DrillSession } from '@/components/drills/DrillSession'
import type { DrillItem } from '@/lib/drillEngine'
import { useAppState } from '@/lib/useAppState'
import { clampRung, dailyDrillItems, ladderItems } from '@/lib/drills'

const CATEGORY_LABELS: Record<string, string> = {
  loops: 'Loops',
  state: 'State',
  'two-pointers': 'Two pointers',
  'sliding-window': 'Sliding window',
  hashing: 'Hashing',
  'binary-search': 'Binary search',
  'stack-queue': 'Stacks & queues',
  recursion: 'Recursion',
  dp: 'Dynamic programming',
  arrays: 'Arrays',
}

export function DrillsPage() {
  const { primitiveId } = useParams()
  const navigate = useNavigate()
  const state = useAppState()
  const [daily, setDaily] = useState<DrillItem[] | null>(null)

  // Single-primitive ladder.
  if (primitiveId) {
    const primitive = getPrimitive(primitiveId)
    if (!primitive) {
      return (
        <div className="mx-auto max-w-3xl px-8 py-8">
          <Link to="/drills" className="text-sm text-accent">
            ← Primitives Lab
          </Link>
          <p className="mt-6 text-sm text-ink-muted">No primitive “{primitiveId}”.</p>
        </div>
      )
    }
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <Link to="/drills" className="text-sm text-accent">
          ← Primitives Lab
        </Link>
        <p className="mt-3 text-sm leading-6 text-ink-muted">{primitive.why}</p>
        <div className="mt-6">
          <DrillSession
            key={primitiveId}
            initialItems={ladderItems(primitive, state)}
            title="Primitive drill"
            onExit={() => navigate('/drills')}
          />
        </div>
      </div>
    )
  }

  // Daily Drill session in progress.
  if (daily) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <button onClick={() => setDaily(null)} className="text-sm text-accent">
          ← Primitives Lab
        </button>
        <div className="mt-6">
          <DrillSession initialItems={daily} title="Daily Drill" onExit={() => setDaily(null)} />
        </div>
      </div>
    )
  }

  // Catalog.
  const primitives = allPrimitives()
  const categories = [...new Set(primitives.map((p) => p.category))]
  const dueCount = dailyDrillItems(state).length

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Primitives Lab</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
        Drill the recurring micro-patterns — loop idioms, pointer setups, window mechanics — on a
        fading ladder: predict, order, fill in, and finally write each one from scratch.
      </p>

      <div className="mt-6 rounded-2xl border border-edge bg-surface-raised p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold">Daily Drill</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {dueCount} primitive{dueCount === 1 ? '' : 's'} due, interleaved across modules.
            </p>
          </div>
          <button
            onClick={() => setDaily(dailyDrillItems(state))}
            disabled={dueCount === 0}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Start
          </button>
        </div>
      </div>

      {categories.map((cat) => (
        <section key={cat} className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
            {CATEGORY_LABELS[cat] ?? cat}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {primitives
              .filter((p) => p.category === cat)
              .map((p) => {
                const prog = state.drills[p.id]
                return (
                  <Link
                    key={p.id}
                    to={`/drills/${p.id}`}
                    className="group rounded-xl border border-edge bg-surface-raised p-4 transition-colors hover:border-accent/60"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-ink">{p.name}</span>
                      {prog?.mastered ? (
                        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          mastered
                        </span>
                      ) : prog ? (
                        <span className="text-[11px] text-ink-faint">rung {clampRung(prog.rung)}</span>
                      ) : null}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{p.why}</p>
                  </Link>
                )
              })}
          </div>
        </section>
      ))}
    </div>
  )
}
