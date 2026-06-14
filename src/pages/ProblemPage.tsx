import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getModuleContent, getModuleMeta, MODULE_IDS } from '@/content'
import type { Difficulty, ModuleId, Problem, TestCase } from '@/content'
import { useAppState } from '@/lib/useAppState'
import { saveDraft, updateProblemProgress, recordSubgoalAttempt } from '@/lib/storage'
import { SubgoalLabeler } from '@/components/subgoals/SubgoalLabeler'
import { runJudge, warmupJudge, judgeStatus, onJudgeStatus, type RunOutcome } from '@/lib/judge'
import type { JudgeStatus } from '@/lib/judgeTypes'
import { Markdown } from '@/components/markdown/Markdown'
import { CodeBlock } from '@/components/markdown/CodeBlock'
import { CodeEditor } from '@/components/practice/CodeEditor'

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hard: 'bg-red-500/10 text-red-500',
}

const JUDGE_LABEL: Record<JudgeStatus, string> = {
  cold: 'Python runtime not loaded',
  loading: 'Loading Python runtime…',
  ready: 'Python ready',
  running: 'Running…',
}

interface DisplayResult {
  label: string
  hidden: boolean
  input?: string
  expected?: string
  got?: string
  error?: string
  stdout?: string
  ms: number
  ok: boolean
}

export function ProblemPage() {
  const { moduleId, problemId } = useParams()
  const valid = MODULE_IDS.includes(moduleId as ModuleId)
  const meta = valid ? getModuleMeta(moduleId as ModuleId) : undefined
  const content = valid ? getModuleContent(moduleId as ModuleId) : undefined
  const problem = content?.problems.find((p) => p.id === problemId)

  if (!meta || !content || !problem) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <h1 className="text-2xl font-semibold">Problem not found</h1>
        <Link to="/" className="mt-2 inline-block text-sm text-accent underline">
          Back to dashboard
        </Link>
      </div>
    )
  }
  return <ProblemView moduleId={meta.id} moduleTitle={meta.title} problem={problem} />
}

export interface MockHooks {
  /** Called after every Submit with (casesPassed, casesTotal, submittedCode). */
  onSubmitOutcome: (passed: number, total: number, code: string) => void
}

export function ProblemView({
  moduleId,
  moduleTitle,
  problem,
  mock,
}: {
  moduleId: ModuleId
  moduleTitle: string
  problem: Problem
  /** Mock-interview mode: hides hints/solution/back-link, reports outcomes. */
  mock?: MockHooks
}) {
  const state = useAppState()
  const problemKey = `${moduleId}/${problem.id}`
  const progress = state.problems[problemKey]

  const [code, setCode] = useState<string>(() => state.drafts[problemKey] ?? problem.starterCode)
  const [docKey, setDocKey] = useState(`${problemKey}:0`)
  const [judge, setJudge] = useState<JudgeStatus>(judgeStatus())
  const [outcome, setOutcome] = useState<{ kind: 'run' | 'submit'; data: RunOutcome } | null>(null)
  const [busy, setBusy] = useState(false)
  const [hintsShown, setHintsShown] = useState(progress?.hintsUsed ?? 0)
  const [hintGate, setHintGate] = useState(false)
  const [solutionShown, setSolutionShown] = useState(false)
  const [solutionGate, setSolutionGate] = useState(false)
  const [labelerOpen, setLabelerOpen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => onJudgeStatus(setJudge), [])
  useEffect(() => {
    warmupJudge()
  }, [])

  // Reset per-problem UI state when navigating between problems.
  useEffect(() => {
    setCode(state.drafts[problemKey] ?? problem.starterCode)
    setDocKey(`${problemKey}:0`)
    setOutcome(null)
    setHintsShown(state.problems[problemKey]?.hintsUsed ?? 0)
    setHintGate(false)
    setSolutionShown(false)
    setSolutionGate(false)
    setCelebrate(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemKey])

  const visibleCases = useMemo(() => problem.testCases.filter((c) => !c.hidden), [problem])

  const onCodeChange = useCallback(
    (doc: string) => {
      setCode(doc)
      saveDraft(problemKey, doc)
    },
    [problemKey],
  )

  async function execute(kind: 'run' | 'submit') {
    if (busy) return
    setBusy(true)
    setOutcome(null)
    setCelebrate(false)
    const cases = kind === 'run' ? visibleCases : problem.testCases
    const data = await runJudge(code, problem.functionName, cases)
    setOutcome({ kind, data })
    setBusy(false)

    if (kind === 'submit') {
      const passed = data.results.filter((r) => r.ok).length
      const allPassed = !data.timedOut && !data.setupError && passed === problem.testCases.length
      mock?.onSubmitOutcome(passed, problem.testCases.length, code)
      if (allPassed) {
        updateProblemProgress(problemKey, {
          status: solutionShown || progress?.viewedSolution ? 'solved-with-help' : 'solved-clean',
          solvedAt: progress?.solvedAt ?? new Date().toISOString(),
          bestPassed: problem.testCases.length,
          totalCases: problem.testCases.length,
        })
        setCelebrate(true)
      } else {
        updateProblemProgress(problemKey, {
          bestPassed: Math.max(progress?.bestPassed ?? 0, passed),
          totalCases: problem.testCases.length,
        })
      }
    }
  }

  function revealNextHint() {
    const next = hintsShown + 1
    setHintsShown(next)
    setHintGate(false)
    updateProblemProgress(problemKey, { hintsUsed: Math.max(progress?.hintsUsed ?? 0, next) })
  }

  function revealSolution() {
    setSolutionShown(true)
    setSolutionGate(false)
    updateProblemProgress(problemKey, { viewedSolution: true })
  }

  const display: DisplayResult[] | null = useMemo(() => {
    if (!outcome || outcome.data.timedOut || outcome.data.setupError) return null
    const cases = outcome.kind === 'run' ? visibleCases : problem.testCases
    let hiddenN = 0
    return outcome.data.results.map((r, i) => {
      const c: TestCase | undefined = cases[i]
      const hidden = !!c?.hidden
      if (hidden) hiddenN++
      return {
        label: hidden ? `Hidden case ${hiddenN}` : (c?.label ?? `Case ${i + 1}`),
        hidden,
        input: hidden ? undefined : JSON.stringify(c?.input),
        expected: hidden && !r.ok ? undefined : JSON.stringify(c?.expected),
        got: r.got,
        error: r.error,
        stdout: r.stdout,
        ms: r.ms,
        ok: r.ok,
      }
    })
  }, [outcome, visibleCases, problem])

  const passedCount = display?.filter((r) => r.ok).length ?? 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-edge px-6 py-3">
        {!mock && (
          <Link
            to={`/module/${moduleId}?tab=practice`}
            className="text-sm text-ink-muted hover:text-accent"
          >
            ← {moduleTitle}
          </Link>
        )}
        <h1 className="flex-1 truncate text-base font-semibold">{problem.title}</h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_STYLE[problem.difficulty]}`}
        >
          {problem.difficulty}
        </span>
        {progress?.status === 'solved-clean' && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ Solved</span>
        )}
        {progress?.status === 'solved-with-help' && (
          <span className="text-sm text-amber-600 dark:text-amber-400">✓ Solved with help</span>
        )}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-2">
        {/* Left: statement */}
        <div className="overflow-y-auto border-b border-edge px-6 py-5 lg:border-b-0 lg:border-r">
          <Markdown>{problem.statement}</Markdown>

          <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-ink-faint">
            Examples
          </h2>
          {problem.examples.map((ex, i) => (
            <div key={i} className="mb-3 rounded-lg border border-edge bg-surface-raised p-3 font-mono text-[13px]">
              <div>
                <span className="text-ink-faint">Input: </span>
                {ex.input}
              </div>
              <div>
                <span className="text-ink-faint">Output: </span>
                {ex.output}
              </div>
              {ex.explanation && (
                <div className="mt-1 font-sans text-[13px] text-ink-muted">{ex.explanation}</div>
              )}
            </div>
          ))}

          <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-ink-faint">
            Constraints
          </h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {problem.constraints.map((c, i) => (
              <li key={i}>
                <code className="font-mono text-[13px]">{c}</code>
              </li>
            ))}
          </ul>

          {/* Hints (hidden during mock interviews) */}
          {mock ? (
            <div className="mt-6 rounded-lg border border-dashed border-edge p-3 text-center text-xs text-ink-faint">
              Hints and the solution are hidden during a mock interview.
            </div>
          ) : (
            <>
          <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-ink-faint">
            Hints
          </h2>
          <div className="space-y-2">
            {problem.hints.slice(0, hintsShown).map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"
              >
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Hint {i + 1}:
                </span>{' '}
                {h}
              </motion.div>
            ))}
            {hintsShown < problem.hints.length &&
              (hintGate ? (
                <div className="rounded-lg border border-edge p-3 text-sm">
                  <p className="text-ink-muted">
                    Hints are most valuable after you&apos;ve wrestled with the problem. Reveal hint{' '}
                    {hintsShown + 1} of {problem.hints.length}?
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={revealNextHint}
                      className="rounded-md bg-amber-500/15 px-3 py-1 text-sm font-medium text-amber-600 dark:text-amber-400"
                    >
                      Yes, show it
                    </button>
                    <button
                      onClick={() => setHintGate(false)}
                      className="rounded-md border border-edge px-3 py-1 text-sm text-ink-muted"
                    >
                      Keep trying
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setHintGate(true)}
                  className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
                >
                  Reveal hint {hintsShown + 1} of {problem.hints.length}
                </button>
              ))}
          </div>

          {/* Solution */}
          <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-ink-faint">
            Solution
          </h2>
          {solutionShown ? (
            <div>
              <div className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-600 dark:text-amber-400">
                Solving after viewing the solution is tracked as “solved with help”.
              </div>
              <CodeBlock code={problem.solution.code} showLineNumbers />
              <div className="mt-3">
                <Markdown>{problem.solution.commentary}</Markdown>
              </div>
              <p className="mt-2 text-sm font-medium">
                Complexity: <code className="font-mono text-[13px]">{problem.solution.complexity}</code>
              </p>
              {problem.solution.subgoals && problem.solution.subgoals.length > 0 && (
                <div className="mt-5 rounded-xl border border-edge bg-surface-raised p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">Label the subgoals</h3>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        Name what each block is for in your own words, then reveal the canonical roles
                        and compare — this is what makes the structure transfer to new problems.
                      </p>
                    </div>
                    {!labelerOpen && (
                      <button
                        onClick={() => setLabelerOpen(true)}
                        className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
                      >
                        Start
                      </button>
                    )}
                  </div>
                  {labelerOpen && (
                    <div className="mt-4">
                      <SubgoalLabeler
                        code={problem.solution.code}
                        subgoals={problem.solution.subgoals}
                        onSubmit={({ scores, understood }) =>
                          recordSubgoalAttempt(problemKey, scores, understood)
                        }
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : solutionGate ? (
            <div className="rounded-lg border border-edge p-3 text-sm">
              <p className="text-ink-muted">
                Viewing the solution marks this problem as solved-with-help (kept separate from
                clean solves). Sure?
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={revealSolution}
                  className="rounded-md bg-red-500/10 px-3 py-1 text-sm font-medium text-red-500"
                >
                  Show me the solution
                </button>
                <button
                  onClick={() => setSolutionGate(false)}
                  className="rounded-md border border-edge px-3 py-1 text-sm text-ink-muted"
                >
                  Not yet
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setSolutionGate(true)}
              className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Show solution
            </button>
          )}

          {problem.furtherPractice && problem.furtherPractice.length > 0 && (
            <>
              <h2 className="mb-2 mt-6 text-sm font-semibold uppercase tracking-wider text-ink-faint">
                Further practice
              </h2>
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
                {problem.furtherPractice.map((f, i) => (
                  <li key={i}>
                    {f.name}
                    {f.note && <span className="text-ink-faint"> — {f.note}</span>}
                  </li>
                ))}
              </ul>
            </>
          )}
            </>
          )}
        </div>

        {/* Right: editor + results */}
        <div className="flex min-h-0 flex-col">
          <div className="min-h-[260px] flex-1 p-4">
            <CodeEditor
              initialDoc={code}
              docKey={docKey}
              onChange={onCodeChange}
              onRunShortcut={() => void execute('run')}
            />
          </div>
          <div className="flex items-center gap-2 border-t border-edge px-4 py-3">
            <button
              onClick={() => void execute('run')}
              disabled={busy}
              className="rounded-lg border border-edge bg-surface-raised px-4 py-2 text-sm font-medium transition-colors hover:border-accent/60 disabled:opacity-50"
              title="Run visible cases (⌘↵)"
            >
              {busy && outcome === null ? 'Running…' : 'Run'}
            </button>
            <button
              onClick={() => void execute('submit')}
              disabled={busy}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Submit
            </button>
            <button
              onClick={() => {
                setCode(problem.starterCode)
                saveDraft(problemKey, problem.starterCode)
                setDocKey(`${problemKey}:${Date.now()}`)
              }}
              className="rounded-lg px-3 py-2 text-sm text-ink-faint hover:text-ink"
            >
              Reset code
            </button>
            <div className="flex-1" />
            <span
              className={`text-xs ${judge === 'ready' ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink-faint'}`}
            >
              {JUDGE_LABEL[judge]}
            </span>
          </div>

          {/* Results */}
          <div className="max-h-[40%] overflow-y-auto border-t border-edge">
            <AnimatePresence>
              {celebrate && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="m-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center"
                >
                  <div className="text-2xl">🎉</div>
                  <div className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    All {problem.testCases.length} cases passed
                  </div>
                  <div className="mt-0.5 text-sm text-ink-muted">
                    {solutionShown || progress?.viewedSolution
                      ? 'Solved with help — come back later and try it clean.'
                      : 'Clean solve. This pattern is becoming yours.'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {outcome?.data.timedOut && (
              <div className="m-4 rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-sm text-red-500">
                Execution exceeded 5 seconds and was stopped — check for an infinite loop. The
                Python runtime is reloading; give it a moment before the next run.
              </div>
            )}
            {outcome?.data.setupError && (
              <div className="m-4 rounded-lg border border-red-500/40 bg-red-500/5 p-3">
                <div className="text-sm font-medium text-red-500">Your code failed to load</div>
                <pre className="mt-1 overflow-x-auto font-mono text-xs text-red-400">
                  {outcome.data.setupError}
                </pre>
              </div>
            )}

            {display && (
              <div className="space-y-2 p-4">
                <div className="text-sm font-medium">
                  {outcome!.kind === 'run' ? 'Example cases' : 'Submission'}:{' '}
                  <span className={passedCount === display.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}>
                    {passedCount}/{display.length} passed
                  </span>
                </div>
                {display.map((r, i) => (
                  <details
                    key={i}
                    open={!r.ok && !r.hidden}
                    className={`rounded-lg border p-2 text-sm ${
                      r.ok ? 'border-emerald-500/30' : 'border-red-500/40'
                    }`}
                  >
                    <summary className="flex cursor-pointer items-center gap-2">
                      <span className={r.ok ? 'text-emerald-500' : 'text-red-500'}>
                        {r.ok ? '✓' : '✗'}
                      </span>
                      <span className="flex-1">{r.label}</span>
                      <span className="font-mono text-xs text-ink-faint">{r.ms.toFixed(1)} ms</span>
                    </summary>
                    <div className="mt-2 space-y-1 pl-6 font-mono text-xs">
                      {r.input !== undefined && (
                        <div>
                          <span className="text-ink-faint">input    </span>
                          {r.input}
                        </div>
                      )}
                      {r.error ? (
                        <div className="text-red-400">{r.error}</div>
                      ) : (
                        <>
                          {r.expected !== undefined && (
                            <div>
                              <span className="text-ink-faint">expected </span>
                              {r.expected}
                            </div>
                          )}
                          <div className={r.ok ? '' : 'text-red-400'}>
                            <span className="text-ink-faint">got      </span>
                            {r.got}
                          </div>
                        </>
                      )}
                      {r.stdout && (
                        <div className="text-ink-muted">
                          <span className="text-ink-faint">stdout   </span>
                          {r.stdout}
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
