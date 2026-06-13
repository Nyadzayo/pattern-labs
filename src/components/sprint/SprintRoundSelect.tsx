import type { SprintRoundKind } from '@/lib/sprintScore'

interface RoundDef {
  round: SprintRoundKind
  title: string
  blurb: string
  meta: string
}

interface SprintRoundSelectProps {
  rounds: RoundDef[]
  dueCount: number
  bestSprint: number
  bestSuddenDeath: number
  onPick: (round: SprintRoundKind) => void
}

/** Round picker for Pattern Sprint. The list of rounds is passed in so the page
 * controls which are available. */
export function SprintRoundSelect({
  rounds,
  dueCount,
  bestSprint,
  bestSuddenDeath,
  onPick,
}: SprintRoundSelectProps) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Pattern Sprint</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
        Read the stem, name the pattern before the clock runs out. Every grid is built from the
        patterns this problem looks like — so you're training the discrimination, not just recall.
      </p>

      <div className="mt-4 flex gap-4 text-sm text-ink-muted">
        <span>
          <span className="font-semibold text-ink tabular-nums">{dueCount}</span> stems due
        </span>
        <span>
          Best sprint <span className="font-semibold text-ink tabular-nums">{bestSprint}</span>
        </span>
        {bestSuddenDeath > 0 && (
          <span>
            Sudden-death best{' '}
            <span className="font-semibold text-ink tabular-nums">{bestSuddenDeath}</span>
          </span>
        )}
      </div>

      <div className="mt-6 grid gap-3">
        {rounds.map((r) => (
          <button
            key={r.round}
            onClick={() => onPick(r.round)}
            className="group flex items-center justify-between rounded-2xl border border-edge bg-surface-raised p-5 text-left transition-colors hover:border-accent/60"
          >
            <div>
              <div className="font-semibold group-hover:text-accent">{r.title}</div>
              <div className="mt-1 text-sm text-ink-muted">{r.blurb}</div>
            </div>
            <div className="shrink-0 pl-4 text-xs uppercase tracking-wider text-ink-faint">
              {r.meta}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
