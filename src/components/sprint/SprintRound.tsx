import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MODULE_IDS, MODULE_TITLES } from '@/content'
import type { ModuleId } from '@/content'
import type { SprintStem } from '@/content/sprint/types'
import { gradeStem } from '@/lib/sprint'
import {
  buildOptions,
  cardPoints,
  endsRound,
  seedFromId,
  type SprintRoundKind,
} from '@/lib/sprintScore'
import { SprintCard } from './SprintCard'

export interface RoundSummary {
  round: SprintRoundKind
  score: number
  bestStreak: number
  correct: number
  answered: number
}

interface SprintRoundProps {
  round: SprintRoundKind
  timerMs: number
  deck: SprintStem[]
  onFinish: (summary: RoundSummary) => void
  onExit: () => void
}

/**
 * Drives one Sprint round: per-card timing, pure scoring (`cardPoints`), SM-2
 * grading, "the tell was…" feedback, and round-end (deck exhausted, or a miss in
 * Sudden Death). The countdown is wall-clock; all scoring is pure.
 */
export function SprintRound({ round, timerMs, deck, onFinish, onExit }: SprintRoundProps) {
  const timed = timerMs > 0
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<'answer' | 'feedback'>('answer')
  const [selected, setSelected] = useState<ModuleId | null>(null)
  const [wasCorrect, setWasCorrect] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [remainingMs, setRemainingMs] = useState(timerMs)

  const startRef = useRef(0)
  const stem = deck[idx]
  const options = useMemo(
    () => (stem ? buildOptions(stem, MODULE_IDS as readonly ModuleId[], seedFromId(stem.id)) : []),
    [stem],
  )

  // (Re)start the per-card clock whenever a fresh card is shown.
  useEffect(() => {
    if (phase !== 'answer' || !stem) return
    startRef.current = performance.now()
    setRemainingMs(timerMs)
  }, [idx, phase, stem, timerMs])

  const answer = useCallback(
    (choice: ModuleId | null) => {
      if (!stem || phase !== 'answer') return
      const elapsedMs = choice === null ? timerMs : performance.now() - startRef.current
      const isCorrect = choice === stem.pattern
      const { points, newStreak } = cardPoints({ correct: isCorrect, elapsedMs, timerMs, streak })
      gradeStem(stem.id, isCorrect)
      setScore((s) => s + points)
      setStreak(newStreak)
      setBestStreak((b) => Math.max(b, newStreak))
      setCorrect((c) => c + (isCorrect ? 1 : 0))
      setAnswered((a) => a + 1)
      setSelected(choice)
      setWasCorrect(isCorrect)
      setGameOver(endsRound(round, isCorrect))
      setPhase('feedback')
    },
    [stem, phase, timerMs, streak, round],
  )

  // Countdown for the timed rounds; on expiry, score as a miss.
  useEffect(() => {
    if (!timed || phase !== 'answer' || !stem) return
    const id = setInterval(() => {
      const left = timerMs - (performance.now() - startRef.current)
      if (left <= 0) {
        clearInterval(id)
        answer(null)
      } else {
        setRemainingMs(left)
      }
    }, 80)
    return () => clearInterval(id)
  }, [timed, phase, stem, idx, timerMs, answer])

  const advance = useCallback(() => {
    if (gameOver || idx + 1 >= deck.length) {
      onFinish({ round, score, bestStreak, correct, answered })
      return
    }
    setIdx((i) => i + 1)
    setSelected(null)
    setWasCorrect(false)
    setPhase('answer')
  }, [gameOver, idx, deck.length, onFinish, round, score, bestStreak, correct, answered])

  // Keyboard-first: 1–6 pick an option, Enter advances after feedback, Esc bails.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onExit()
        return
      }
      if (phase === 'answer') {
        const n = Number(e.key)
        if (n >= 1 && n <= options.length) answer(options[n - 1])
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, options, answer, advance, onExit])

  if (!stem) return null

  const frac = timed ? Math.max(0, Math.min(1, remainingMs / timerMs)) : 1

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between text-sm">
        <button onClick={onExit} className="text-accent">
          ← End round
        </button>
        <div className="flex items-center gap-4 tabular-nums text-ink-muted">
          <span>
            Card {idx + 1}/{deck.length}
          </span>
          <span>
            Streak <span className="font-semibold text-ink">{streak}</span>
          </span>
          {round !== 'warmup' && (
            <span>
              Score <span className="font-semibold text-ink">{score}</span>
            </span>
          )}
        </div>
      </div>

      {timed && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className={`h-full rounded-full transition-[width] duration-75 ${
              frac < 0.25 ? 'bg-rose-500' : 'bg-accent'
            }`}
            style={{ width: `${frac * 100}%` }}
          />
        </div>
      )}

      <div className="mt-4">
        <SprintCard
          text={stem.text}
          options={options}
          selected={selected}
          correctPattern={stem.pattern}
          revealed={phase === 'feedback'}
          onSelect={(p) => answer(p)}
        />
      </div>

      {phase === 'feedback' && (
        <div className="mt-4 rounded-xl border border-edge bg-surface-raised p-4">
          <div className="flex items-center justify-between">
            <span
              className={`text-sm font-semibold ${
                wasCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {wasCorrect ? 'Correct' : selected === null ? 'Out of time' : 'Not quite'}
              {!wasCorrect && ` — it's ${MODULE_TITLES[stem.pattern]}`}
            </span>
            <button
              onClick={advance}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              {gameOver || idx + 1 >= deck.length ? 'Finish' : 'Next'} ↵
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            <span className="font-medium text-ink-faint">The tell: </span>
            {stem.tell}
          </p>
        </div>
      )}
    </div>
  )
}
