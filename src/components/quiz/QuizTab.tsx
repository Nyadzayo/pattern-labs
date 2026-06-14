/**
 * Quiz tab for a module page.
 *
 * Three phases: IDLE (stats + sparkline + start), ACTIVE (one locked-answer
 * question at a time with instant feedback), DONE (score, per-kind breakdown,
 * missed-question review). The attempt is recorded exactly once, inside the
 * click handler that finishes the quiz — never in an effect.
 */
import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getModuleContent } from '@/content'
import type { ModuleId, QuizKind, QuizQuestion } from '@/content'
import { useAppState } from '@/lib/useAppState'
import { recordQuizAttempt, recordCalibration, type QuizAttempt } from '@/lib/storage'
import { askConfidence } from '@/lib/confidence'
import { Markdown } from '@/components/markdown/Markdown'

type Phase = 'idle' | 'active' | 'done'

const KIND_ORDER: QuizKind[] = ['conceptual', 'complexity', 'scenario']

const KIND_CHIP: Record<QuizKind, string> = {
  conceptual: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  complexity: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  scenario: 'bg-accent-soft/70 text-accent dark:text-indigo-300',
}

/**
 * Minimal inline-markdown renderer for choice/explanation text (`code`,
 * **bold**, *italic*) — the full <Markdown> block styling is too heavy for
 * button labels and callouts.
 */
const INLINE_RE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g

function InlineText({ text }: { text: string }) {
  const parts = text.split(INLINE_RE).filter(Boolean)
  return (
    <>
      {parts.map((part, i) => {
        if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[0.85em] text-ink"
            >
              {part.slice(1, -1)}
            </code>
          )
        }
        if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-ink">
              {part.slice(2, -2)}
            </strong>
          )
        }
        if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
          return <em key={i}>{part.slice(1, -1)}</em>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function pctOf(a: QuizAttempt): number {
  return a.total > 0 ? Math.round((a.score / a.total) * 100) : 0
}

/** ~120x32 polyline of attempt scores over time. Handles 0/1 attempts. */
function Sparkline({ attempts }: { attempts: QuizAttempt[] }) {
  const w = 120
  const h = 32
  const pad = 4
  if (attempts.length === 0) return null
  const points = attempts.map((a, i) => {
    const x =
      attempts.length === 1 ? w / 2 : pad + (i / (attempts.length - 1)) * (w - 2 * pad)
    const y = pad + (1 - (a.total > 0 ? a.score / a.total : 0)) * (h - 2 * pad)
    return { x, y }
  })
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className="shrink-0 text-accent"
      role="img"
      aria-label={`Score trend across ${attempts.length} attempt${attempts.length === 1 ? '' : 's'}`}
    >
      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
      )}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 2.5 : 2}
          fill="currentColor"
          opacity={i === points.length - 1 ? 1 : 0.55}
        />
      ))}
    </svg>
  )
}

function encouragement(pct: number): string {
  if (pct === 100) return 'Perfect score — this pattern is officially yours.'
  if (pct >= 75) return 'Strong showing. Skim the misses below and you are interview-ready.'
  if (pct >= 50) return 'Solid base. Read the explanations for the misses, then take another pass.'
  return 'Rough round — revisit the Learn tab, then come back. The retake will feel different.'
}

export function QuizTab({ moduleId }: { moduleId: ModuleId }) {
  const state = useAppState()
  const questions: QuizQuestion[] = getModuleContent(moduleId)!.quiz
  const attempts = state.quizAttempts[moduleId] ?? []

  const [phase, setPhase] = useState<Phase>('idle')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  // Guards recordQuizAttempt against double-fire (rapid double-click, StrictMode).
  const recordedRef = useRef(false)
  // Guards advance() against double-fire across the AnimatePresence exit
  // window: the frozen outgoing card keeps its (still enabled) Next button
  // wired to the previous render's closure for ~180ms, so a second click
  // would re-run advance() with the old `index` and skip a question.
  // Tracks the last index we advanced from; re-armed in startQuiz.
  const advancedFromRef = useRef(-1)

  // Reset everything if the component is reused for a different module
  // (j/k shortcuts navigate between modules while preserving ?tab=quiz, so
  // React keeps this instance alive). This uses React's "adjust state during
  // render" pattern instead of an effect: an effect-based reset would commit
  // one render with the new module's questions against the old phase/index/
  // answers — crashing ActiveView if the new quiz is shorter than `index`.
  // Setting state during render makes React re-render immediately, before
  // the stale frame is ever shown. recordedRef is re-armed in startQuiz,
  // which is the only path back to the 'active' phase after this reset.
  const [prevModuleId, setPrevModuleId] = useState(moduleId)
  if (prevModuleId !== moduleId) {
    setPrevModuleId(moduleId)
    setPhase('idle')
    setIndex(0)
    setAnswers(questions.map(() => null))
  }

  const score = useMemo(
    () => questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0),
    [questions, answers],
  )

  function startQuiz() {
    setAnswers(questions.map(() => null))
    setIndex(0)
    recordedRef.current = false
    advancedFromRef.current = -1
    setPhase('active')
  }

  async function choose(choiceIndex: number) {
    if (phase !== 'active' || answers[index] !== null) return
    // Predict-then-check: ask confidence before the correctness reveal.
    const level = await askConfidence('quiz', moduleId)
    if (phase !== 'active' || answers[index] !== null) return
    setAnswers((prev) => prev.map((a, i) => (i === index ? choiceIndex : a)))
    if (level !== null) {
      recordCalibration({
        surface: 'quiz',
        moduleId,
        confidence: level,
        correct: choiceIndex === questions[index].correctIndex,
      })
    }
  }

  function advance() {
    if (phase !== 'active' || answers[index] === null) return
    if (index < questions.length - 1) {
      // Advance at most once per question (a stale click from the exiting
      // card re-enters with the old `index`), and clamp so `index` can
      // never run past the last question even if a stale update slips in.
      if (advancedFromRef.current === index) return
      advancedFromRef.current = index
      setIndex((i) => Math.min(i + 1, questions.length - 1))
      return
    }
    // Finishing: record exactly once, inside this click handler.
    if (recordedRef.current) return
    recordedRef.current = true
    const finalScore = questions.reduce(
      (acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0),
      0,
    )
    recordQuizAttempt(moduleId, finalScore, questions.length)
    setPhase('done')
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-edge p-8 text-center text-sm text-ink-muted">
        This module has no quiz questions yet.
      </div>
    )
  }

  if (phase === 'idle') {
    return <IdleView questions={questions} attempts={attempts} onStart={startQuiz} />
  }

  if (phase === 'active') {
    const q = questions[index]
    return (
      <ActiveView
        question={q}
        index={index}
        total={questions.length}
        picked={answers[index]}
        onChoose={choose}
        onAdvance={advance}
      />
    )
  }

  return (
    <DoneView
      questions={questions}
      answers={answers}
      score={score}
      onRetake={startQuiz}
    />
  )
}

// ---------- IDLE ----------

function IdleView({
  questions,
  attempts,
  onStart,
}: {
  questions: QuizQuestion[]
  attempts: QuizAttempt[]
  onStart: () => void
}) {
  const best = attempts.length ? Math.max(...attempts.map(pctOf)) : null
  const latest = attempts.length ? pctOf(attempts[attempts.length - 1]) : null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="rounded-xl border border-edge bg-surface-raised p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Module quiz</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {questions.length} questions — conceptual, complexity, and scenario. Answers lock
            once picked.
          </p>
        </div>
        <button
          onClick={onStart}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {attempts.length > 0 ? 'Start quiz again' : 'Start quiz'}
        </button>
      </div>

      <div className="mt-5 border-t border-edge pt-5">
        {attempts.length === 0 ? (
          <p className="text-sm text-ink-faint">
            No attempts yet — your score history will chart here.
          </p>
        ) : (
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="flex gap-8">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                  Best
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {best}%
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                  Most recent
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{latest}%</div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                  Attempts
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">{attempts.length}</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                Trend
              </div>
              <div className="mt-1.5 rounded-lg bg-surface-sunken px-2 py-1">
                <Sparkline attempts={attempts} />
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ---------- ACTIVE ----------

function ActiveView({
  question,
  index,
  total,
  picked,
  onChoose,
  onAdvance,
}: {
  question: QuizQuestion
  index: number
  total: number
  picked: number | null
  onChoose: (i: number) => void
  onAdvance: () => void
}) {
  const locked = picked !== null
  const correct = locked && picked === question.correctIndex
  const isLast = index === total - 1
  const filled = (index + (locked ? 1 : 0)) / total

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tabular-nums text-ink-faint">
          Question {index + 1} of {total}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${KIND_CHIP[question.kind]}`}
        >
          {question.kind}
        </span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-sunken">
        <motion.div
          className="h-full rounded-full bg-accent"
          initial={false}
          animate={{ width: `${filled * 100}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          // pointerEvents is applied instantly on exit so the frozen outgoing
          // card (still rendered by AnimatePresence for ~180ms) cannot receive
          // a second click on its stale Next/Finish button.
          exit={{ opacity: 0, x: -32, pointerEvents: 'none' }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="mt-5 rounded-xl border border-edge bg-surface-raised p-5"
        >
          <Markdown>{question.prompt}</Markdown>

          <div className="mt-4 space-y-2">
            {question.choices.map((choice, i) => {
              const isCorrect = i === question.correctIndex
              const isPicked = i === picked
              let cls = 'border-edge bg-surface hover:border-accent/60'
              let chip = 'bg-surface-sunken text-ink-faint'
              let marker: string | null = null
              if (locked) {
                if (isCorrect) {
                  cls = 'border-emerald-500/60 bg-emerald-500/10'
                  chip = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  marker = '✓'
                } else if (isPicked) {
                  cls = 'border-red-500/60 bg-red-500/10'
                  chip = 'bg-red-500/15 text-red-600 dark:text-red-400'
                  marker = '✕'
                } else {
                  cls = 'border-edge bg-surface opacity-55'
                }
              }
              return (
                <button
                  key={i}
                  onClick={() => onChoose(i)}
                  disabled={locked}
                  className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm leading-6 transition-colors ${cls} ${
                    locked ? 'cursor-default' : ''
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-semibold ${chip}`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 text-ink">
                    <InlineText text={choice} />
                  </span>
                  {marker && (
                    <span
                      className={`mt-0.5 text-sm font-semibold ${
                        isCorrect
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {marker}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <AnimatePresence initial={false}>
            {locked && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              >
                <div
                  className={`mt-4 rounded-lg border-l-2 p-4 ${
                    correct
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-red-500 bg-red-500/10'
                  }`}
                >
                  <div
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      correct
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {correct ? 'Correct' : 'Not quite'}
                  </div>
                  <p className="mt-1.5 text-sm leading-6 text-ink-muted">
                    <InlineText text={question.explanation} />
                  </p>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={onAdvance}
                    className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                  >
                    {isLast ? 'Finish' : 'Next question'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ---------- DONE ----------

function DoneView({
  questions,
  answers,
  score,
  onRetake,
}: {
  questions: QuizQuestion[]
  answers: (number | null)[]
  score: number
  onRetake: () => void
}) {
  const total = questions.length
  const pct = total > 0 ? Math.round((score / total) * 100) : 0
  const missed = questions
    .map((q, i) => ({ q, picked: answers[i] }))
    .filter(({ q, picked }) => picked !== q.correctIndex)
  const kindStats = KIND_ORDER.map((kind) => {
    const ofKind = questions
      .map((q, i) => ({ q, picked: answers[i] }))
      .filter(({ q }) => q.kind === kind)
    const right = ofKind.filter(({ q, picked }) => picked === q.correctIndex).length
    return { kind, right, total: ofKind.length }
  }).filter((s) => s.total > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div className="rounded-xl border border-edge bg-surface-raised p-6 text-center">
        <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
          Quiz complete
        </div>
        <div
          className={`mt-2 text-3xl font-semibold tabular-nums ${
            pct >= 75
              ? 'text-emerald-600 dark:text-emerald-400'
              : pct >= 50
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
          }`}
        >
          {score}/{total} — {pct}%
        </div>
        <p className="mt-2 text-sm text-ink-muted">{encouragement(pct)}</p>

        <div className="mx-auto mt-5 grid max-w-md gap-3 sm:grid-cols-3">
          {kindStats.map(({ kind, right, total: kindTotal }) => (
            <div key={kind} className="rounded-lg border border-edge bg-surface p-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${KIND_CHIP[kind]}`}
              >
                {kind}
              </span>
              <div className="mt-2 text-sm tabular-nums">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {right} right
                </span>
                <span className="text-ink-faint"> · </span>
                <span
                  className={
                    kindTotal - right > 0
                      ? 'font-semibold text-red-600 dark:text-red-400'
                      : 'text-ink-faint'
                  }
                >
                  {kindTotal - right} wrong
                </span>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onRetake}
          className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Retake quiz
        </button>
      </div>

      {missed.length > 0 ? (
        <>
          <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-ink-faint">
            Review the misses
          </h3>
          <div className="mt-3 space-y-3">
            {missed.map(({ q }) => (
              <div key={q.id} className="rounded-xl border border-edge bg-surface-raised p-4">
                <div className="[&_p]:my-0 [&_p+p]:mt-2">
                  <Markdown>{q.prompt}</Markdown>
                </div>
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm leading-6">
                  <span className="mt-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
                    ✓
                  </span>
                  <span className="text-ink">
                    <InlineText text={q.choices[q.correctIndex] ?? ''} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-6 text-center text-sm text-ink-muted">
          Nothing to review — every answer landed.
        </p>
      )}
    </motion.div>
  )
}
