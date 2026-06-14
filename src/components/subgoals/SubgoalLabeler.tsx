import { useMemo, useState } from 'react'
import type { Subgoal } from '@/content/types'
import { gradeLabel, bestChunkMatch, labelingComplete, type GradeResult } from '@/lib/subgoalGrade'

export interface SubgoalLabelerResult {
  /** Lenient coverage score (0..1) per chunk from the submitted attempt. */
  scores: number[]
  /** True when every chunk was labeled acceptably ("structure understood"). */
  understood: boolean
}

export interface SubgoalLabelerProps {
  /** The full solution code (one multi-line string) the subgoal ranges index into. */
  code: string
  /** Contiguous, non-overlapping chunks covering the solution. */
  subgoals: Subgoal[]
  /** Fired once per submitted attempt with the lenient grade. */
  onSubmit?: (result: SubgoalLabelerResult) => void
  /** Optional instruction line above the chunks. */
  title?: string
}

const FALLBACK_HINT =
  'This block plays one role in the pattern. What job does it do — in terms of the approach, not the variable names?'

/**
 * Self-generated subgoal labeling. The learner types their OWN purpose label for
 * each pre-chunked block of a solution, optionally peeks one context-free hint
 * per chunk, then submits — only THEN is the canonical label revealed beside
 * their attempt with role-aware feedback. Generate-then-reveal: the reference
 * labels are never shown as readable text up front. Hint XOR feedback per chunk:
 * the hint is pre-submission only; the reveal/feedback is post-submission only.
 */
export function SubgoalLabeler({ code, subgoals, onSubmit, title }: SubgoalLabelerProps) {
  const lines = useMemo(() => code.replace(/\n+$/, '').split('\n'), [code])
  const [labels, setLabels] = useState<string[]>(() => subgoals.map(() => ''))
  const [hintsShown, setHintsShown] = useState<boolean[]>(() => subgoals.map(() => false))
  const [results, setResults] = useState<GradeResult[] | null>(null)

  const chunkKeywords = useMemo(() => subgoals.map((s) => s.acceptableKeywords), [subgoals])
  const submitted = results !== null

  function chunkLines(s: Subgoal): string[] {
    const [a, b] = s.lineRange
    return lines.slice(Math.max(0, a - 1), b)
  }

  function submit() {
    const res = subgoals.map((s, i) => gradeLabel(labels[i] ?? '', s.acceptableKeywords))
    setResults(res)
    onSubmit?.({
      scores: res.map((r) => r.score),
      understood: labelingComplete(res.map((r) => r.score)),
    })
  }

  function reset() {
    setLabels(subgoals.map(() => ''))
    setHintsShown(subgoals.map(() => false))
    setResults(null)
  }

  /** Post-submission, role-aware feedback for one chunk. */
  function feedback(i: number): { tone: 'good' | 'close' | 'off'; text: string } {
    const r = results![i]
    const typed = (labels[i] ?? '').trim()
    if (r.matched) return { tone: 'good', text: 'You named the role.' }
    // Did this label actually describe a *different* chunk's job?
    const fit = bestChunkMatch(typed, chunkKeywords)
    if (typed && fit !== -1 && fit !== i) {
      const other = subgoals[fit]
      const base = `That describes step ${fit + 1} ("${other.referenceLabel}"), not this one.`
      return { tone: 'off', text: subgoals[i].misconception ? `${base} ${subgoals[i].misconception}` : base }
    }
    if (r.score > 0) {
      return { tone: 'close', text: subgoals[i].misconception ?? 'Close — sharpen it toward the role below.' }
    }
    return { tone: 'off', text: subgoals[i].misconception ?? 'Not quite — compare with the role below.' }
  }

  const understood = submitted && labelingComplete(results!.map((r) => r.score))
  const anyTyped = labels.some((l) => (l ?? '').trim().length > 0)

  return (
    <div>
      {title && <p className="mb-3 text-sm text-ink-muted">{title}</p>}

      <ol className="space-y-3">
        {subgoals.map((s, i) => {
          const fb = submitted ? feedback(i) : null
          return (
            <li key={i} className="overflow-hidden rounded-xl border border-edge bg-surface-sunken">
              <div className="flex items-center gap-2 border-b border-edge/60 px-3 py-1.5">
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                  Step {i + 1}
                </span>
                <span className="text-[11px] text-ink-faint">
                  lines {s.lineRange[0]}–{s.lineRange[1]}
                </span>
              </div>

              <pre className="overflow-x-auto px-3 py-2 font-mono text-[12.5px] leading-5 text-ink">
                {chunkLines(s).join('\n')}
              </pre>

              <div className="border-t border-edge/60 px-3 py-2.5">
                {!submitted ? (
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-wider text-ink-faint">
                      Its purpose, in your words
                    </label>
                    <input
                      value={labels[i]}
                      onChange={(e) =>
                        setLabels((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && anyTyped) submit()
                      }}
                      placeholder="e.g. shrink the window until it's valid again"
                      className="mt-1 w-full rounded-lg border border-edge bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
                    />
                    <div className="mt-1.5 min-h-[18px]">
                      {hintsShown[i] ? (
                        <p className="text-[12px] italic text-ink-muted">💡 {s.hint ?? FALLBACK_HINT}</p>
                      ) : (
                        <button
                          onClick={() => setHintsShown((prev) => prev.map((v, j) => (j === i ? true : v)))}
                          className="text-[12px] font-medium text-ink-faint transition-colors hover:text-accent"
                        >
                          Need a nudge?
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase tracking-wider text-ink-faint">
                      You wrote
                    </p>
                    <p className="text-sm text-ink">
                      {labels[i]?.trim() ? `"${labels[i].trim()}"` : <span className="text-ink-faint">(left blank)</span>}
                    </p>
                    <p className="text-[11px] uppercase tracking-wider text-ink-faint">The role</p>
                    <p className="text-sm font-medium text-ink">{s.referenceLabel}</p>
                    {fb && (
                      <p
                        className={`text-[12.5px] leading-5 ${
                          fb.tone === 'good'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : fb.tone === 'close'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {fb.text}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {!submitted ? (
        <button
          onClick={submit}
          disabled={!anyTyped}
          className="mt-4 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reveal &amp; compare
        </button>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <span
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              understood
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            }`}
          >
            {understood ? 'Structure understood ✓' : 'Some roles to revisit'}
          </span>
          <button
            onClick={reset}
            className="text-sm font-medium text-ink-muted transition-colors hover:text-accent"
          >
            Label again from blank
          </button>
        </div>
      )}
    </div>
  )
}
