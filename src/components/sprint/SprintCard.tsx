import { MODULE_TITLES } from '@/content'
import type { ModuleId } from '@/content'

interface SprintCardProps {
  text: string
  options: ModuleId[]
  /** The option the learner picked (null until they answer / on timeout). */
  selected: ModuleId | null
  correctPattern: ModuleId
  /** Once true, the grid colors correct/incorrect and stops accepting input. */
  revealed: boolean
  onSelect: (pattern: ModuleId) => void
}

/**
 * Presentational Sprint card: the stem + a 6-option discriminator grid. All
 * timing, scoring, and feedback copy live in {@link SprintRound}; this component
 * only renders the question and reports the chosen pattern.
 */
export function SprintCard({
  text,
  options,
  selected,
  correctPattern,
  revealed,
  onSelect,
}: SprintCardProps) {
  return (
    <div>
      <div className="rounded-2xl border border-edge bg-surface-raised p-6">
        <p className="text-lg leading-7 text-ink">{text}</p>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {options.map((opt) => {
          const isCorrect = opt === correctPattern
          const isPicked = opt === selected
          let tone =
            'border-edge bg-surface-raised hover:border-accent/60 hover:bg-accent-soft/30'
          if (revealed) {
            if (isCorrect) tone = 'border-emerald-500/70 bg-emerald-500/10 text-ink'
            else if (isPicked) tone = 'border-rose-500/70 bg-rose-500/10 text-ink'
            else tone = 'border-edge bg-surface-raised opacity-55'
          }
          return (
            <button
              key={opt}
              type="button"
              disabled={revealed}
              onClick={() => onSelect(opt)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors disabled:cursor-default ${tone}`}
            >
              <span>{MODULE_TITLES[opt]}</span>
              {revealed && isCorrect && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  correct
                </span>
              )}
              {revealed && isPicked && !isCorrect && (
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  your pick
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
