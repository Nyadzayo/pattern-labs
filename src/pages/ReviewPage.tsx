/**
 * Global review deck (/review): every due card across all modules, grouped
 * by module, feeding one CardReviewSession. Empty state hints at the next
 * scheduled card.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { MODULE_TITLES } from '@/content'
import type { ModuleId } from '@/content'
import { useAppState } from '@/lib/useAppState'
import { dueCards } from '@/lib/sm2'
import type { DueCard } from '@/lib/sm2'
import { todayISO } from '@/lib/storage'
import { CardReviewSession, dueLabel } from '@/components/flashcards/CardReviewSession'

export function ReviewPage() {
  const state = useAppState()
  /** Deck snapshot taken when the session starts; null = summary view. */
  const [session, setSession] = useState<DueCard[] | null>(null)

  const due = dueCards(state)

  // Count due cards per module, preserving curriculum order.
  const byModule: { moduleId: ModuleId; count: number }[] = []
  for (const card of due) {
    const last = byModule[byModule.length - 1]
    if (last && last.moduleId === card.moduleId) last.count += 1
    else byModule.push({ moduleId: card.moduleId as ModuleId, count: 1 })
  }

  // Earliest future due date, for the empty-state hint.
  const today = todayISO()
  let nextDue: string | null = null
  for (const schedule of Object.values(state.cards)) {
    if (schedule.due > today && (nextDue === null || schedule.due < nextDue)) {
      nextDue = schedule.due
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Spaced repetition across every module — short sessions, long memory.
      </p>

      <div className="mt-8">
        {session ? (
          <CardReviewSession cards={session} onDone={() => setSession(null)} />
        ) : due.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-dashed border-edge p-10 text-center"
          >
            <div className="font-medium text-emerald-600 dark:text-emerald-400">
              Nothing due — come back tomorrow
            </div>
            <div className="mt-1 text-sm text-ink-muted">
              {nextDue
                ? `Next card due ${dueLabel(nextDue)}.`
                : 'Grade some flashcards in a module to start a schedule.'}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-xl border border-edge bg-surface-raised p-6"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-3xl font-semibold tabular-nums">{due.length}</span>
                <span className="ml-2 text-sm text-ink-muted">
                  card{due.length === 1 ? '' : 's'} due today
                </span>
              </div>
              <button
                onClick={() => setSession(due)}
                className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
              >
                Start review
              </button>
            </div>

            <div className="mt-5 divide-y divide-edge border-t border-edge">
              {byModule.map(({ moduleId, count }) => (
                <div key={moduleId} className="flex items-center justify-between py-2.5">
                  <span className="text-sm">{MODULE_TITLES[moduleId]}</span>
                  <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
