/**
 * Mock interview: a timed two-problem session drawn from unsolved problems,
 * weighted toward weak modules, followed by pattern identification and a
 * persisted report. Phases: INTRO → RUNNING → IDENTIFY → REPORT.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { MODULE_TITLES, allLoadedContent, getModuleMeta } from '@/content'
import type { ModuleId, Problem } from '@/content'
import { recordMockReport } from '@/lib/storage'
import type { AppState, MockProblemReport, MockReport } from '@/lib/storage'
import { useAppState } from '@/lib/useAppState'
import { moduleMastery } from '@/lib/progress'
import { ProblemView } from '@/pages/ProblemPage'
import { detectWeakPrimitives } from '@/lib/primitiveTells'
import { primitiveName } from '@/lib/drills'

const TOTAL_SECONDS = 45 * 60
const AMBER_AT = 10 * 60
const RED_AT = 3 * 60

type Phase = 'INTRO' | 'RUNNING' | 'IDENTIFY' | 'REPORT'

interface PickedProblem {
  moduleId: ModuleId
  problem: Problem
}

interface ProblemRun extends PickedProblem {
  bestPassed: number
  casesTotal: number
  submitted: boolean
  secondsSpent: number
  /** Last code the learner submitted (for weakest-primitive detection). */
  lastCode?: string
}

interface IdentifyQuestion {
  correctTitle: string
  choices: string[]
}

// ---------- helpers ----------

function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

function weightedPick<T>(items: T[], weightOf: (item: T) => number): T {
  let total = 0
  for (const item of items) total += Math.max(0.0001, weightOf(item))
  let r = Math.random() * total
  let last = items[0]
  for (const item of items) {
    last = item
    r -= Math.max(0.0001, weightOf(item))
    if (r <= 0) return item
  }
  return last
}

/** Every problem in loaded content the learner has not yet solved. */
function eligibleProblems(state: AppState): PickedProblem[] {
  const out: PickedProblem[] = []
  for (const content of allLoadedContent()) {
    for (const problem of content.problems) {
      const status = state.problems[`${content.id}/${problem.id}`]?.status
      if (status === 'solved-clean' || status === 'solved-with-help') continue
      out.push({ moduleId: content.id, problem })
    }
  }
  return out
}

/**
 * Pick two distinct problems by weighted random sampling without replacement.
 * Weight = (1.05 − module mastery), so weak modules come up more often.
 * Prefers two different modules when the pool allows it.
 */
function pickTwo(state: AppState): PickedProblem[] {
  const candidates = eligibleProblems(state)
  if (candidates.length < 2) return []
  const mastery = new Map(moduleMastery(state).map((m) => [m.id, m.score]))
  const weightOf = (c: PickedProblem) => 1.05 - (mastery.get(c.moduleId) ?? 0.5)
  const first = weightedPick(candidates, weightOf)
  const otherModules = candidates.filter((c) => c.moduleId !== first.moduleId)
  const pool = otherModules.length > 0 ? otherModules : candidates.filter((c) => c !== first)
  return [first, weightedPick(pool, weightOf)]
}

function buildQuestion(moduleId: ModuleId): IdentifyQuestion {
  const correctTitle = MODULE_TITLES[moduleId]
  const distractors = shuffle(
    Object.values(MODULE_TITLES).filter((t) => t !== correctTitle),
  ).slice(0, 3)
  return { correctTitle, choices: shuffle([correctTitle, ...distractors]) }
}

// ---------- page ----------

export function MockInterviewPage() {
  const state = useAppState()

  const [phase, setPhase] = useState<Phase>('INTRO')
  const [runs, setRuns] = useState<ProblemRun[]>([])
  const [current, setCurrent] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS)
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [confirmSkip, setConfirmSkip] = useState(false)
  const [questions, setQuestions] = useState<IdentifyQuestion[]>([])
  const [qIndex, setQIndex] = useState(0)
  const [guesses, setGuesses] = useState<(string | null)[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [report, setReport] = useState<MockReport | null>(null)

  const deadlineRef = useRef(0)
  const interviewStartRef = useRef(0)
  const problemStartRef = useRef(0)
  const elapsedRef = useRef(0)

  const eligibleCount = useMemo(() => eligibleProblems(state).length, [state])

  // Countdown clock — only ticks during RUNNING; cleaned up on phase change/unmount.
  useEffect(() => {
    if (phase !== 'RUNNING') return
    const id = setInterval(() => {
      setSecondsLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)))
    }, 250)
    return () => clearInterval(id)
  }, [phase])

  // Time's up: stop the clock (phase change kills the interval) and auto-advance.
  useEffect(() => {
    if (phase === 'RUNNING' && secondsLeft <= 0 && runs.length > 0) {
      finishRunning()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, secondsLeft])

  function start(): void {
    const picks = pickTwo(state)
    if (picks.length < 2) return
    setRuns(
      picks.map((p) => ({
        ...p,
        bestPassed: 0,
        casesTotal: p.problem.testCases.length,
        submitted: false,
        secondsSpent: 0,
      })),
    )
    setCurrent(0)
    setConfirmEnd(false)
    setConfirmSkip(false)
    setReport(null)
    const now = Date.now()
    interviewStartRef.current = now
    problemStartRef.current = now
    deadlineRef.current = now + TOTAL_SECONDS * 1000
    setSecondsLeft(TOTAL_SECONDS)
    setPhase('RUNNING')
  }

  /** Runs array with the active problem's time finalized from its Date.now() delta. */
  function withFinalizedCurrent(): ProblemRun[] {
    const spent = Math.max(0, Math.round((Date.now() - problemStartRef.current) / 1000))
    return runs.map((r, i) => (i === current ? { ...r, secondsSpent: spent } : r))
  }

  function recordOutcome(index: number, passed: number, total: number, code: string): void {
    setRuns((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              submitted: true,
              bestPassed: Math.max(r.bestPassed, passed),
              casesTotal: total,
              lastCode: code,
            }
          : r,
      ),
    )
  }

  function advance(): void {
    const finalized = withFinalizedCurrent()
    setConfirmSkip(false)
    setConfirmEnd(false)
    if (current + 1 < finalized.length) {
      setRuns(finalized)
      setCurrent(current + 1)
      problemStartRef.current = Date.now()
    } else {
      enterIdentify(finalized, finalized.length)
    }
  }

  /** Early end or timer expiry: only the problems actually shown get scored. */
  function finishRunning(): void {
    enterIdentify(withFinalizedCurrent(), current + 1)
  }

  function enterIdentify(finalRuns: ProblemRun[], shownCount: number): void {
    const shown = finalRuns.slice(0, shownCount)
    elapsedRef.current = Math.min(
      TOTAL_SECONDS,
      Math.max(0, Math.round((Date.now() - interviewStartRef.current) / 1000)),
    )
    setRuns(shown)
    // Stable shuffle: choices are computed once at phase entry and stored.
    setQuestions(shown.map((r) => buildQuestion(r.moduleId)))
    setGuesses(shown.map(() => null))
    setQIndex(0)
    setSelected(null)
    setPhase('IDENTIFY')
  }

  function confirmAnswer(): void {
    if (selected === null) return
    const nextGuesses = guesses.map((g, i) => (i === qIndex ? selected : g))
    setGuesses(nextGuesses)
    setSelected(null)
    if (qIndex + 1 < questions.length) {
      setQIndex(qIndex + 1)
    } else {
      enterReport(nextGuesses)
    }
  }

  /** The one and only place the report is persisted. */
  function enterReport(finalGuesses: (string | null)[]): void {
    const problems: MockProblemReport[] = runs.map((r, i) => {
      const guess = finalGuesses[i] ?? undefined
      return {
        problemKey: `${r.moduleId}/${r.problem.id}`,
        title: r.problem.title,
        secondsSpent: r.secondsSpent,
        casesPassed: r.bestPassed,
        casesTotal: r.casesTotal,
        patternGuess: guess,
        patternCorrect: guess === undefined ? undefined : guess === MODULE_TITLES[r.moduleId],
      }
    })
    const weakPrimitiveIds = detectWeakPrimitives(
      runs.map((r) => ({
        moduleId: r.moduleId,
        code: r.lastCode ?? '',
        passedAll: r.casesTotal > 0 && r.bestPassed === r.casesTotal,
      })),
      state,
    )
    const rep: MockReport = {
      at: new Date().toISOString(),
      durationSeconds: elapsedRef.current,
      problems,
      weakPrimitiveIds,
    }
    recordMockReport(rep)
    setReport(rep)
    setPhase('REPORT')
  }

  // ---------- render ----------

  if (phase === 'RUNNING') {
    const run = runs[current]
    if (!run) return null
    const clockTone =
      secondsLeft < RED_AT
        ? 'text-red-500'
        : secondsLeft < AMBER_AT
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-ink'
    return (
      <div className="flex h-full flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-edge bg-surface/95 px-6 py-2.5 backdrop-blur">
          <span className={`text-lg font-semibold tabular-nums ${clockTone}`}>
            {fmtClock(secondsLeft)}
          </span>
          <span className="text-sm text-ink-muted">
            Problem {current + 1} of {runs.length}
          </span>
          <span className="text-xs tabular-nums text-ink-faint">
            {run.submitted ? `Best ${run.bestPassed}/${run.casesTotal} cases` : 'No submission yet'}
          </span>
          <span className="flex-1" />
          {confirmSkip ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-amber-600 dark:text-amber-400">No submission yet — move on?</span>
              <button
                onClick={advance}
                className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
              >
                Yes, move on
              </button>
              <button
                onClick={() => setConfirmSkip(false)}
                className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
              >
                Keep working
              </button>
            </span>
          ) : (
            <button
              onClick={() => (run.submitted ? advance() : setConfirmSkip(true))}
              className="rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              {current + 1 < runs.length ? 'Next problem →' : 'Finish →'}
            </button>
          )}
          {confirmEnd ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="text-red-500">End now?</span>
              <button
                onClick={finishRunning}
                className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20"
              >
                End interview
              </button>
              <button
                onClick={() => setConfirmEnd(false)}
                className="rounded-lg border border-edge px-3 py-1.5 text-xs text-ink-muted transition-colors hover:text-ink"
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmEnd(true)}
              className="rounded-lg border border-edge px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-red-500/50 hover:text-red-500"
            >
              End interview early
            </button>
          )}
        </header>

        <div className="min-h-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${run.moduleId}/${run.problem.id}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ProblemView
                moduleId={run.moduleId}
                moduleTitle={MODULE_TITLES[run.moduleId]}
                problem={run.problem}
                mock={{
                  onSubmitOutcome: (passed, total, code) =>
                    recordOutcome(current, passed, total, code),
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    )
  }

  if (phase === 'IDENTIFY') {
    const question = questions[qIndex]
    const run = runs[qIndex]
    if (!question || !run) return null
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Name the pattern</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Recognition is half the interview. Which pattern was each problem testing?
        </p>

        <AnimatePresence mode="wait">
          <motion.div
            key={qIndex}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
            className="mt-8 rounded-xl border border-edge bg-surface-raised p-6"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Question {qIndex + 1} of {questions.length}
            </div>
            <h2 className="mt-2 text-lg font-semibold">
              Which pattern was problem {qIndex + 1}?
            </h2>
            <p className="mt-1 text-sm text-ink-muted">“{run.problem.title}”</p>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {question.choices.map((choice) => (
                <button
                  key={choice}
                  onClick={() => setSelected(choice)}
                  className={`rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    selected === choice
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-edge bg-surface-sunken text-ink-muted hover:border-accent/50 hover:text-ink'
                  }`}
                >
                  {choice}
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={confirmAnswer}
                disabled={selected === null}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {qIndex + 1 < questions.length ? 'Next question →' : 'View report →'}
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

  if (phase === 'REPORT' && report) {
    const totalPassed = report.problems.reduce((s, p) => s + p.casesPassed, 0)
    const totalCases = report.problems.reduce((s, p) => s + p.casesTotal, 0)
    const identified = report.problems.filter((p) => p.patternCorrect).length
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Mock report</h1>
        <p className="mt-1 text-sm tabular-nums text-ink-muted">
          {identified}/{report.problems.length} patterns identified · {totalPassed}/{totalCases}{' '}
          cases passed · {fmtClock(report.durationSeconds)} elapsed
        </p>

        <div className="mt-6 space-y-4">
          {report.problems.map((p, i) => {
            const run = runs[i]
            const moduleTitle = run
              ? (getModuleMeta(run.moduleId)?.title ?? MODULE_TITLES[run.moduleId])
              : ''
            const allPassed = p.casesTotal > 0 && p.casesPassed === p.casesTotal
            return (
              <motion.div
                key={p.problemKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.1 }}
                className="rounded-xl border border-edge bg-surface-raised p-5"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.title}</div>
                    <div className="mt-0.5 text-sm text-ink-muted">{moduleTitle}</div>
                  </div>
                  <div className="text-xs tabular-nums text-ink-faint">
                    {fmtClock(p.secondsSpent)} spent
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <span
                    className={`tabular-nums ${
                      allPassed
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : p.casesPassed > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-500'
                    }`}
                  >
                    {p.casesPassed}/{p.casesTotal} cases passed
                  </span>
                  {p.patternCorrect !== undefined &&
                    (p.patternCorrect ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        ✓ Pattern identified
                      </span>
                    ) : (
                      <span className="text-red-500">
                        ✗ Guessed “{p.patternGuess}” — it was {moduleTitle}
                      </span>
                    ))}
                </div>
              </motion.div>
            )
          })}
        </div>

        {report.weakPrimitiveIds && report.weakPrimitiveIds.length > 0 && (
          <div className="mt-6 rounded-xl border border-edge bg-surface-raised p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Primitives to review
            </div>
            <p className="mt-1 text-sm text-ink-muted">
              Based on what you wrote, these micro-patterns are worth a quick drill.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {report.weakPrimitiveIds.map((id) => (
                <Link
                  key={id}
                  to={`/drills/${id}`}
                  className="rounded-full border border-accent/40 bg-accent-soft/40 px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
                >
                  {primitiveName(id)} →
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center gap-4">
          <Link
            to="/"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Back to dashboard
          </Link>
          <button
            onClick={() => setPhase('INTRO')}
            className="text-sm text-ink-muted transition-colors hover:text-accent"
          >
            Run another mock
          </button>
        </div>
      </div>
    )
  }

  // INTRO (default)
  const pastReports = [...state.mockReports].reverse()
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Mock interview</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Interview conditions: a clock, two unfamiliar problems, and no safety net.
      </p>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-6 rounded-xl border border-edge bg-surface-raised p-6"
      >
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
          The format
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm leading-6 text-ink-muted">
          <li>
            <span className="font-medium text-ink">Two problems</span> — drawn from ones you
            haven’t solved, weighted toward your weaker patterns.
          </li>
          <li>
            <span className="font-medium text-ink">45 minutes total</span> — one shared clock
            across both problems. Pace yourself.
          </li>
          <li>
            <span className="font-medium text-ink">No hints, no solutions</span> — just you, the
            editor, and the judge. Submit as often as you like; your best run counts.
          </li>
          <li>
            <span className="font-medium text-ink">Then, name the pattern</span> — after time is
            up you’ll identify which pattern each problem was testing.
          </li>
        </ul>

        <div className="mt-6">
          {eligibleCount >= 2 ? (
            <button
              onClick={start}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Start mock interview
            </button>
          ) : (
            <div className="rounded-lg border border-dashed border-edge p-5 text-center">
              <div className="font-medium text-emerald-600 dark:text-emerald-400">
                You’ve solved nearly everything here
              </div>
              <div className="mt-1 text-sm text-ink-muted">
                A mock needs at least two problems you haven’t solved yet — right now there{' '}
                {eligibleCount === 1 ? 'is only one' : 'are none'}. Come back when more modules
                land, or reset a module’s progress to re-run it cold.
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {pastReports.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
            Past mocks
          </h2>
          <div className="mt-3 space-y-3">
            {pastReports.map((r, i) => {
              const passed = r.problems.reduce((s, p) => s + p.casesPassed, 0)
              const total = r.problems.reduce((s, p) => s + p.casesTotal, 0)
              const named = r.problems.filter((p) => p.patternCorrect).length
              return (
                <motion.div
                  key={`${r.at}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 6) * 0.04 }}
                  className="rounded-xl border border-edge bg-surface-raised p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="text-sm font-medium">{fmtDate(r.at)}</span>
                    <span className="text-xs tabular-nums text-ink-muted">
                      {passed}/{total} cases · {named}/{r.problems.length} patterns ·{' '}
                      {fmtClock(r.durationSeconds)}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-sm text-ink-muted">
                    {r.problems.map((p) => p.title).join(' · ')}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
