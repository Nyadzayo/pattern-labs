import { useReducer, useState } from 'react'
import { getPrimitive } from '@/content/primitives/registry'
import {
  drillReducer,
  initSession,
  resolutionForSubmit,
  type DrillItem,
} from '@/lib/drillEngine'
import { gradeDrill } from '@/lib/sm2'
import type { CheckResult } from '@/lib/drillCheckers'
import { PredictRungView } from './PredictRungView'
import { OrderRungView } from './OrderRungView'
import { FadeRungView } from './FadeRungView'
import { ClozeRungView } from './ClozeRungView'
import { RolesRungView } from './RolesRungView'
import { stringSeed, type RungViewProps } from './rungProps'

const RUNG_LABELS = ['Predict', 'Order', 'Fade', 'Cloze', 'Roles', 'Write']

export function DrillSession({
  initialItems,
  onExit,
  title,
}: {
  initialItems: DrillItem[]
  onExit?: () => void
  title?: string
}) {
  const [state, dispatch] = useReducer(drillReducer, initialItems, initSession)
  // Bumped on every advance so the rung view remounts fresh per item/attempt,
  // but stays put across the prompt → feedback transition.
  const [round, setRound] = useState(0)

  function handleSubmit(result: CheckResult) {
    if (state.current) {
      const { resolved, passed } = resolutionForSubmit(state, result)
      if (resolved) gradeDrill(state.current.primitiveId, passed, state.current.rung)
    }
    dispatch({ type: 'submit', result })
  }
  function handleNext() {
    dispatch({ type: 'next' })
    setRound((r) => r + 1)
  }
  function handleSkipUp() {
    dispatch({ type: 'skipUp' })
    setRound((r) => r + 1)
  }
  function handleSkipRung() {
    dispatch({ type: 'next' })
    setRound((r) => r + 1)
  }

  if (state.phase === 'done' || !state.current) {
    return (
      <div className="rounded-2xl border border-edge bg-surface-raised p-8 text-center">
        <h2 className="text-lg font-semibold">Session complete</h2>
        <p className="mt-2 text-sm text-ink-muted">
          {state.reviewed} answer{state.reviewed === 1 ? '' : 's'} · best streak kept ·{' '}
          {state.requeued} re-queued for another look.
        </p>
        {onExit && (
          <button
            onClick={onExit}
            className="mt-5 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Done
          </button>
        )}
      </div>
    )
  }

  const primitive = getPrimitive(state.current.primitiveId)
  if (!primitive) {
    return (
      <div className="rounded-2xl border border-edge bg-surface-raised p-6">
        <p className="text-sm text-ink-muted">Unknown primitive: {state.current.primitiveId}</p>
        <button onClick={handleSkipRung} className="mt-3 text-sm text-accent">
          Skip →
        </button>
      </div>
    )
  }

  const rungNumber = state.current.rung
  const rung = primitive.rungs[rungNumber - 1]
  const itemKey = `${state.current.primitiveId}:${rungNumber}:${round}`
  const viewProps: RungViewProps = {
    primitive,
    rung,
    rungNumber,
    phase: state.phase === 'feedback' ? 'feedback' : 'prompt',
    revealed: state.revealed,
    seed: stringSeed(itemKey),
    onSubmit: handleSubmit,
  }

  const misconception =
    state.lastResult?.misconceptionId != null
      ? primitive.misconceptions.find((m) => m.id === state.lastResult!.misconceptionId)
      : undefined

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          {title && <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">{title}</p>}
          <h2 className="text-lg font-semibold tracking-tight">{primitive.name}</h2>
        </div>
        <div className="text-right">
          <span className="rounded-full border border-edge bg-surface-sunken px-2.5 py-1 text-[11px] font-medium text-ink-muted">
            Rung {rungNumber} · {RUNG_LABELS[rungNumber - 1]}
          </span>
          {state.streak > 1 && (
            <span className="ml-2 text-[11px] font-medium text-amber-600 dark:text-amber-400">
              🔥 {state.streak}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-edge bg-surface-raised p-5">
        <RungBody viewProps={viewProps} onSkipRung={handleSkipRung} />
      </div>

      {state.phase === 'prompt' && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleSkipUp}
            className="text-xs font-medium text-ink-muted transition-colors hover:text-accent"
          >
            This is easy — skip up a rung ↗
          </button>
        </div>
      )}

      {state.phase === 'feedback' && state.lastResult && (
        <div
          className={`mt-4 animate-shake rounded-xl border p-4 ${
            state.lastResult.correct
              ? 'border-emerald-500/40 bg-emerald-500/10'
              : 'border-red-500/40 bg-red-500/10'
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              state.lastResult.correct
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {state.lastResult.correct ? 'Correct' : state.revealed ? 'Here’s the answer' : 'Not quite'}
          </p>
          {misconception && (
            <div className="mt-1.5">
              <p className="text-sm font-medium text-ink">{misconception.label}</p>
              <p className="mt-0.5 text-sm leading-6 text-ink-muted">{misconception.feedback}</p>
            </div>
          )}
          {!state.lastResult.correct && !misconception && !state.revealed && (
            <p className="mt-1 text-sm text-ink-muted">Take another look — this one comes back later.</p>
          )}
          <button
            onClick={handleNext}
            className="mt-4 rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  )
}

/** Rung renderers wired so far; rungs 3–6 land in later build steps. */
function RungBody({ viewProps, onSkipRung }: { viewProps: RungViewProps; onSkipRung: () => void }) {
  const { rung } = viewProps
  switch (rung.kind) {
    case 'predict':
      return <PredictRungView {...viewProps} rung={rung} />
    case 'order':
      return <OrderRungView {...viewProps} rung={rung} />
    case 'fade':
      return <FadeRungView {...viewProps} rung={rung} />
    case 'cloze':
      return <ClozeRungView {...viewProps} rung={rung} />
    case 'roles':
      return <RolesRungView {...viewProps} rung={rung} />
    default:
      return (
        <div className="py-6 text-center">
          <p className="text-sm text-ink-muted">
            The “{rung.kind}” rung renderer arrives in the next build step.
          </p>
          <button onClick={onSkipRung} className="mt-3 text-sm font-medium text-accent hover:underline">
            Skip this rung →
          </button>
        </div>
      )
  }
}
