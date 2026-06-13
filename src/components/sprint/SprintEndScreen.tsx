import type { RoundSummary } from './SprintRound'

interface SprintEndScreenProps {
  summary: RoundSummary
  isBest: boolean
  onAgain: () => void
  onHome: () => void
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-edge bg-surface-raised p-4 text-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs uppercase tracking-wider text-ink-faint">{label}</div>
    </div>
  )
}

export function SprintEndScreen({ summary, isBest, onAgain, onHome }: SprintEndScreenProps) {
  const accuracy =
    summary.answered > 0 ? Math.round((summary.correct / summary.answered) * 100) : 0
  const timed = summary.round !== 'warmup'

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {summary.round === 'sudden-death'
          ? 'Sudden Death over'
          : summary.round === 'warmup'
            ? 'Warmup complete'
            : 'Sprint complete'}
      </h1>
      {isBest && timed && (
        <p className="mt-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          New high score!
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {timed && <Stat label="Score" value={String(summary.score)} />}
        <Stat label="Best streak" value={String(summary.bestStreak)} />
        <Stat label="Accuracy" value={`${accuracy}%`} />
        <Stat label="Answered" value={`${summary.correct}/${summary.answered}`} />
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onAgain}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Play again
        </button>
        <button
          onClick={onHome}
          className="rounded-lg border border-edge px-5 py-2.5 text-sm font-medium hover:border-accent/60"
        >
          Back to rounds
        </button>
      </div>
    </div>
  )
}
