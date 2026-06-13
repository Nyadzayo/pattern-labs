import { Link } from 'react-router-dom'
import { useAppState } from '@/lib/useAppState'
import { katas, automaticCount } from '@/lib/katas'
import type { PrimitiveCategory } from '@/content/primitives/types'

const CATEGORY_LABELS: Record<PrimitiveCategory, string> = {
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

export function KatasPage() {
  const state = useAppState()
  const all = katas()
  const categories = [...new Set(all.map((k) => k.category))]
  const automatic = automaticCount(state)

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Code Katas</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
        Type the core idioms until they're automatic. Each kata is a real, runnable function — drill it
        guided, from a fading reference, or on a blank page, and watch your speed and accuracy climb.
      </p>

      <div className="mt-4 flex gap-4 text-sm text-ink-muted">
        <span>
          <span className="font-semibold text-ink tabular-nums">{all.length}</span> katas
        </span>
        <span>
          <span className="font-semibold text-ink tabular-nums">{automatic}</span> automatic
        </span>
      </div>

      {categories.map((cat) => (
        <section key={cat} className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
            {CATEGORY_LABELS[cat] ?? cat}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {all
              .filter((k) => k.category === cat)
              .map((k) => {
                const prog = state.katas[k.id]
                return (
                  <Link
                    key={k.id}
                    to={`/katas/${k.id}`}
                    className="group rounded-xl border border-edge bg-surface-raised p-4 transition-colors hover:border-accent/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">{k.name}</span>
                      {prog?.automatic ? (
                        <span className="shrink-0 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          automatic
                        </span>
                      ) : prog?.bestSeconds != null ? (
                        <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">
                          best {prog.bestSeconds.toFixed(0)}s
                        </span>
                      ) : (
                        <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">
                          par {k.parSeconds}s
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{k.intent}</p>
                  </Link>
                )
              })}
          </div>
        </section>
      ))}
    </div>
  )
}
