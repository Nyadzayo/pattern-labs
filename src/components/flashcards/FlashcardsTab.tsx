/**
 * Module page Flashcards tab. Shows this module's due cards and starts a
 * CardReviewSession; when nothing is due, peeks at each card's schedule and
 * offers an off-schedule practice run over the whole deck.
 */
import { useState } from 'react'
import { motion } from 'framer-motion'
import { getModuleContent, MODULE_TITLES } from '@/content'
import type { ModuleId } from '@/content'
import { useAppState } from '@/lib/useAppState'
import { dueCards } from '@/lib/sm2'
import type { DueCard } from '@/lib/sm2'
import { CardReviewSession, dueLabel } from './CardReviewSession'

export function FlashcardsTab({ moduleId }: { moduleId: ModuleId }) {
  const state = useAppState()
  const content = getModuleContent(moduleId)
  /** Deck snapshot taken when a session starts; null = idle summary view. */
  const [session, setSession] = useState<DueCard[] | null>(null)

  if (!content || content.flashcards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-edge p-8 text-center text-sm text-ink-muted">
        No flashcards for this module yet.
      </div>
    )
  }

  if (session) {
    return <CardReviewSession cards={session} onDone={() => setSession(null)} />
  }

  const due = dueCards(state).filter((c) => c.moduleId === moduleId)

  if (due.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl border border-edge bg-surface-raised p-8 text-center"
      >
        <div className="text-4xl font-semibold tabular-nums">{due.length}</div>
        <div className="mt-1 text-sm text-ink-muted">
          card{due.length === 1 ? '' : 's'} due in {MODULE_TITLES[moduleId]}
        </div>
        <button
          onClick={() => setSession(due)}
          className="mt-5 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Study {due.length} due card{due.length === 1 ? '' : 's'}
        </button>
      </motion.div>
    )
  }

  const allCards: DueCard[] = content.flashcards.map((card) => ({
    moduleId,
    cardId: card.id,
    front: card.front,
    back: card.back,
    schedule: state.cards[`${moduleId}/${card.id}`],
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="rounded-xl border border-edge bg-surface-raised p-6 text-center">
        <div className="font-medium text-emerald-600 dark:text-emerald-400">All caught up</div>
        <div className="mt-1 text-sm text-ink-muted">
          Nothing due in {MODULE_TITLES[moduleId]} today.
        </div>
        <button
          onClick={() => setSession(allCards)}
          className="mt-4 rounded-lg border border-edge bg-surface-sunken px-5 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/50 hover:text-accent"
        >
          Practice all {allCards.length} anyway
        </button>
      </div>

      <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        Schedule
      </h3>
      <div className="mt-2 divide-y divide-edge rounded-xl border border-edge bg-surface-raised">
        {content.flashcards.map((card) => {
          const schedule = state.cards[`${moduleId}/${card.id}`]
          return (
            <div key={card.id} className="flex items-center gap-4 px-4 py-3">
              <div className="min-w-0 flex-1 truncate text-sm text-ink">{card.front}</div>
              {schedule ? (
                <div className="shrink-0 text-xs tabular-nums text-ink-faint">
                  {dueLabel(schedule.due)}
                </div>
              ) : (
                <div className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                  new
                </div>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
