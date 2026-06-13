import { useEffect, useRef, useState } from 'react'
import type { WriteRung } from '@/content/primitives/types'
import { CodeEditor } from '@/components/practice/CodeEditor'
import { onJudgeStatus, runJudge, warmupJudge, judgeStatus, type RunOutcome } from '@/lib/judge'
import type { JudgeStatus } from '@/lib/judgeTypes'
import type { RungViewProps } from './rungProps'

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** Rung 6 — Write: implement the primitive from scratch; Pyodide judges it. */
export function WriteRungView({ rung, primitive, phase, revealed, onSubmit }: RungViewProps<WriteRung>) {
  const codeRef = useRef(rung.starterCode)
  const [running, setRunning] = useState(false)
  const [outcome, setOutcome] = useState<{ outcome: RunOutcome; scope: 'run' | 'submit' } | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [status, setStatus] = useState<JudgeStatus>(judgeStatus())
  const locked = phase === 'feedback'

  const visible = rung.testCases.filter((t) => !t.hidden)

  useEffect(() => {
    warmupJudge()
    return onJudgeStatus(setStatus)
  }, [])

  useEffect(() => {
    if (locked) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [locked])

  async function run(scope: 'run' | 'submit') {
    if (running || locked) return
    setRunning(true)
    const cases = scope === 'run' ? visible : rung.testCases
    const result = await runJudge(codeRef.current, rung.functionName, cases)
    setRunning(false)
    setOutcome({ outcome: result, scope })

    if (scope === 'submit') {
      const passed =
        !result.timedOut &&
        !result.setupError &&
        result.results.length === cases.length &&
        result.results.every((r) => r.ok)
      const passCount = result.results.filter((r) => r.ok).length
      onSubmit({
        correct: passed,
        message: result.timedOut
          ? 'Timed out (5s).'
          : result.setupError
            ? 'Your code did not load.'
            : `${passCount}/${cases.length} cases passed.`,
      })
    }
  }

  const overPar = elapsed > rung.parSeconds
  const o = outcome?.outcome

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Write <span className="font-mono normal-case text-ink">{rung.functionName}</span>
        </p>
        <span className={`font-mono text-xs ${overPar ? 'text-amber-600 dark:text-amber-400' : 'text-ink-faint'}`}>
          {fmt(elapsed)} / {fmt(rung.parSeconds)}
        </span>
      </div>

      <div className="h-64">
        <CodeEditor
          initialDoc={rung.starterCode}
          docKey={`${primitive.id}:write`}
          onChange={(doc) => (codeRef.current = doc)}
          onRunShortcut={() => run('run')}
        />
      </div>

      {!locked && (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => run('run')}
            disabled={running}
            className="rounded-lg border border-edge bg-surface-raised px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent/60 disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run tests'}
          </button>
          <button
            onClick={() => run('submit')}
            disabled={running}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            Submit
          </button>
          {status !== 'ready' && (
            <span className="text-xs text-ink-faint">
              {status === 'loading' ? 'Loading Python…' : status === 'running' ? 'Running…' : ''}
            </span>
          )}
        </div>
      )}

      {o && (
        <div className="mt-4 space-y-1.5">
          {o.timedOut && <p className="text-sm text-red-600 dark:text-red-400">Timed out after 5 seconds.</p>}
          {o.setupError && (
            <p className="font-mono text-xs text-red-600 dark:text-red-400">{o.setupError}</p>
          )}
          {!o.timedOut &&
            !o.setupError &&
            (outcome.scope === 'run' ? visible : rung.testCases).map((c, i) => {
              const r = o.results[i]
              if (!r) return null
              const hidden = c.hidden
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs ${
                    r.ok
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-red-500/30 bg-red-500/5'
                  }`}
                >
                  <span className={r.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {r.ok ? '✓' : '✗'}
                  </span>
                  <span className="font-mono text-ink-muted">
                    {hidden ? `hidden case ${i + 1}` : `${c.label ?? `case ${i + 1}`}`}
                  </span>
                  {!r.ok && !hidden && (
                    <span className="ml-auto truncate font-mono text-ink-faint">got {r.got}</span>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {revealed && (
        <details className="mt-4 rounded-lg border border-edge bg-surface-sunken p-3" open>
          <summary className="cursor-pointer text-xs font-medium text-ink-muted">Reference solution</summary>
          <pre className="mt-2 overflow-x-auto font-mono text-[12px] leading-6 text-ink">
            <code>{rung.solution}</code>
          </pre>
        </details>
      )}
    </div>
  )
}
