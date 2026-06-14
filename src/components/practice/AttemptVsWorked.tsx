import { useState } from 'react'
import type { ModuleContent, ModuleId } from '@/content'
import { useAppState } from '@/lib/useAppState'

/**
 * Learn-tab panel that shows the learner's productive-failure first attempt next
 * to the worked approach, so the instruction lands on primed ground. Renders
 * nothing unless a non-skipped, non-empty attempt was captured for this module.
 */
export function AttemptVsWorked({ moduleId, content }: { moduleId: ModuleId; content: ModuleContent }) {
  const state = useAppState()
  const [open, setOpen] = useState(false)
  const attempt = state.productiveFailure[moduleId]
  const problem = content.problems[0]

  if (!attempt || attempt.skipped || !attempt.attemptCode.trim() || !problem) return null

  return (
    <div className="no-print mb-8 rounded-xl border border-edge bg-surface-raised">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <span className="text-sm font-semibold">Your earlier attempt vs the worked approach</span>
          <p className="mt-0.5 text-xs text-ink-muted">
            You took a shot at “{problem.title}” before this lesson — compare as you read.
          </p>
        </div>
        <span className="text-xs text-ink-faint">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="grid gap-3 border-t border-edge p-4 md:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-ink-faint">
              Your first attempt
            </p>
            <pre className="overflow-x-auto rounded-lg border border-edge bg-surface-sunken p-3 font-mono text-[12px] leading-5 text-ink">
              {attempt.attemptCode.replace(/\n+$/, '')}
            </pre>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              The worked approach
            </p>
            <pre className="overflow-x-auto rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 font-mono text-[12px] leading-5 text-ink">
              {problem.solution.code.replace(/\n+$/, '')}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
