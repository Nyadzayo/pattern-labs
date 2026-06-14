import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { getModuleMeta, MODULE_IDS } from '@/content'
import type { ModuleId } from '@/content'
import { useAppState } from '@/lib/useAppState'
import { calibrationReport } from '@/lib/calibration'

function moduleTitle(id: string): string {
  return MODULE_IDS.includes(id as ModuleId) ? getModuleMeta(id as ModuleId)?.title ?? id : id
}

/**
 * Dashboard card: how well predicted confidence matches actual outcomes. Shows
 * accuracy per confidence level ("when you felt Certain, you were right X%") and
 * calls out the module where confidence most outruns performance.
 */
export function CalibrationCard() {
  const state = useAppState()
  const report = useMemo(() => calibrationReport(state.calibration), [state.calibration])

  if (report.total < 4) {
    return (
      <div className="rounded-2xl border border-edge bg-surface-raised p-5">
        <h2 className="text-sm font-semibold">Calibration</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Before each answer, kata, or reveal, you’ll get a one-tap confidence pick. After a few,
          this shows whether you’re as right as you feel — and where you’re overconfident.
        </p>
        <p className="mt-2 text-xs text-ink-faint">{report.total}/4 picks logged so far.</p>
      </div>
    )
  }

  const top = report.topOverconfident
  return (
    <div className="rounded-2xl border border-edge bg-surface-raised p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">Calibration</h2>
        <span className="text-xs text-ink-faint">{report.total} picks</span>
      </div>

      <div className="mt-3 space-y-2">
        {report.byConfidence.map((b) => (
          <div key={b.level} className={b.n === 0 ? 'opacity-40' : ''}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ink-muted">{b.label}</span>
              <span className="tabular-nums text-ink-faint">
                {b.n === 0 ? '—' : `${Math.round(b.accuracy * 100)}% right · ${b.n}`}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${Math.round(b.accuracy * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {top ? (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Most overconfident in{' '}
            <Link to={`/module/${top.moduleId}`} className="font-semibold underline underline-offset-2">
              {moduleTitle(top.moduleId)}
            </Link>{' '}
            — {Math.round(top.accuracy * 100)}% right when you felt {Math.round(top.avgConfidence * 100)}% sure. Drill it.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-xs text-emerald-600 dark:text-emerald-400">
          Well-calibrated so far — your confidence tracks your results.
        </p>
      )}
    </div>
  )
}
