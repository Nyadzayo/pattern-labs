/**
 * Flashcard review loop: front → reveal → grade (Again / Hard / Good / Easy).
 *
 * Cards graded "again" requeue at the end of the session deck (they are due
 * again today) and the loop keeps cycling until every card has earned a
 * non-again grade. A short summary then hands control back via `onDone`.
 */
import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { applyGrade, gradeCard } from '@/lib/sm2'
import type { DueCard, Grade } from '@/lib/sm2'
import { MODULE_TITLES } from '@/content'
import type { ModuleId } from '@/content'
import { todayISO } from '@/lib/storage'
import { Markdown } from '@/components/markdown/Markdown'

/** "today" for 0 days (again/lapse), otherwise "1 d", "6 d", … */
export function formatInterval(days: number): string {
  return days <= 0 ? 'today' : `${days} d`
}

/** Relative label for an ISO due date: "today", "tomorrow", "in N d". */
export function dueLabel(dueISO: string): string {
  const today = todayISO()
  if (dueISO <= today) return 'today'
  const toDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const diff = Math.round((toDate(dueISO).getTime() - toDate(today).getTime()) / 86_400_000)
  return diff <= 1 ? 'tomorrow' : `in ${diff} d`
}

const GRADE_BUTTONS: { grade: Grade; label: string; hotkey: string; classes: string }[] = [
  {
    grade: 'again',
    label: 'Again',
    hotkey: '1',
    classes:
      'border-red-500/40 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400',
  },
  {
    grade: 'hard',
    label: 'Hard',
    hotkey: '2',
    classes:
      'border-amber-500/40 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400',
  },
  {
    grade: 'good',
    label: 'Good',
    hotkey: '3',
    classes:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400',
  },
  {
    grade: 'easy',
    label: 'Easy',
    hotkey: '4',
    classes: 'border-accent/40 bg-accent-soft/60 text-accent hover:bg-accent-soft',
  },
]

const flip = {
  initial: { rotateX: -90, opacity: 0 },
  animate: { rotateX: 0, opacity: 1 },
  exit: { rotateX: 90, opacity: 0 },
} as const

export function CardReviewSession({ cards, onDone }: { cards: DueCard[]; onDone: () => void }) {
  const [queue, setQueue] = useState<DueCard[]>(() => cards.slice())
  const [revealed, setRevealed] = useState(false)
  const [againCount, setAgainCount] = useState(0)
  /** Monotonic per-show counter: animation key + double-grade guard. */
  const [step, setStep] = useState(0)
  const gradedStepRef = useRef(-1)

  const current = queue[0]

  function handleGrade(grade: Grade) {
    if (!current || gradedStepRef.current === step) return
    gradedStepRef.current = step
    gradeCard(current.moduleId, current.cardId, grade)
    if (grade === 'again') {
      // Requeue with the schedule the grade just persisted, so the next
      // interval preview for this card stays accurate.
      const requeued: DueCard = { ...current, schedule: applyGrade(current.schedule, grade) }
      setQueue((prev) => [...prev.slice(1), requeued])
      setAgainCount((c) => c + 1)
    } else {
      setQueue((prev) => prev.slice(1))
    }
    setRevealed(false)
    setStep((s) => s + 1)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (queue.length === 0) return
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault()
        setRevealed(true)
        return
      }
      if (revealed) {
        const btn = GRADE_BUTTONS.find((b) => b.hotkey === e.key)
        if (btn) {
          e.preventDefault()
          handleGrade(btn.grade)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, queue, step])

  if (!current) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="mx-auto w-full max-w-md rounded-xl border border-edge bg-surface-raised p-8 text-center"
      >
        <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          Session complete
        </div>
        <div className="mt-5 flex justify-center gap-10">
          <div>
            <div className="text-3xl font-semibold tabular-nums">{cards.length}</div>
            <div className="mt-0.5 text-xs text-ink-muted">
              card{cards.length === 1 ? '' : 's'} reviewed
            </div>
          </div>
          <div>
            <div
              className={`text-3xl font-semibold tabular-nums ${
                againCount > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {againCount}
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">again</div>
          </div>
        </div>
        <button
          onClick={onDone}
          className="mt-6 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Done
        </button>
      </motion.div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="mb-3 flex items-center justify-between text-xs text-ink-faint">
        <span className="font-medium uppercase tracking-wider">
          {MODULE_TITLES[current.moduleId as ModuleId]}
        </span>
        <span className="tabular-nums">
          {queue.length} left{againCount > 0 ? ` · ${againCount} again` : ''}
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -32 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="flex min-h-[300px] flex-col rounded-xl border border-edge bg-surface-raised p-6 shadow-sm"
        >
          <AnimatePresence mode="wait" initial={false}>
            {!revealed ? (
              <motion.div
                key="front"
                {...flip}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ transformPerspective: 800 }}
                className="flex flex-1 flex-col"
              >
                <div className="flex flex-1 items-center justify-center px-2 py-8 text-center">
                  <div className="[&_p]:text-lg [&_p]:leading-8">
                    <Markdown>{current.front}</Markdown>
                  </div>
                </div>
                <button
                  onClick={() => setRevealed(true)}
                  className="mx-auto rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  Show answer
                </button>
                <div className="mt-2 text-center text-[11px] text-ink-faint">space to reveal</div>
              </motion.div>
            ) : (
              <motion.div
                key="back"
                {...flip}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                style={{ transformPerspective: 800 }}
                className="flex flex-1 flex-col"
              >
                <div className="text-center [&_p]:my-0 [&_p]:text-sm [&_p]:text-ink-muted">
                  <Markdown>{current.front}</Markdown>
                </div>
                <hr className="my-4 border-edge" />
                <div className="flex-1">
                  <Markdown>{current.back}</Markdown>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {GRADE_BUTTONS.map(({ grade, label, hotkey, classes }) => (
                    <button
                      key={grade}
                      onClick={() => handleGrade(grade)}
                      title={`Press ${hotkey}`}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${classes}`}
                    >
                      <span className="block">{label}</span>
                      <span className="mt-0.5 block text-xs font-normal tabular-nums opacity-75">
                        {formatInterval(applyGrade(current.schedule, grade).intervalDays)}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
