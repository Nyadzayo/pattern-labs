import { useState } from 'react'
import type { PredictRung } from '@/content/primitives/types'
import { checkPredict } from '@/lib/drillCheckers'
import { CodeView } from './CodeView'
import type { RungViewProps } from './rungProps'

/** Rung 1 — Predict: read the snippet, pick the value it produces. */
export function PredictRungView({ primitive, rung, phase, revealed, onSubmit }: RungViewProps<PredictRung>) {
  const [picked, setPicked] = useState<number | null>(null)
  const locked = phase === 'feedback'

  function choose(i: number) {
    if (locked) return
    setPicked(i)
    onSubmit(checkPredict(rung, i))
  }

  return (
    <div>
      <CodeView code={primitive.snippet} markedLine={rung.markedLine} />
      <p className="mt-4 text-sm leading-6 text-ink">{rung.prompt}</p>
      <div className="mt-4 grid gap-2">
        {rung.choices.map((choice, i) => {
          const isCorrect = i === rung.correctIndex
          const isPicked = i === picked
          let cls = 'border-edge bg-surface-raised hover:border-accent/60'
          if (locked) {
            if (isCorrect) cls = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
            else if (isPicked) cls = 'border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400'
            else cls = 'border-edge opacity-60'
          } else if (isPicked) {
            cls = 'border-accent bg-accent-soft/40'
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={locked}
              className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-left font-mono text-sm transition-colors ${cls}`}
            >
              <span>{choice}</span>
              {locked && isCorrect && <span aria-hidden>✓</span>}
              {locked && isPicked && !isCorrect && <span aria-hidden>✗</span>}
            </button>
          )
        })}
      </div>
      {revealed && (
        <p className="mt-3 text-xs text-ink-muted">
          The answer is{' '}
          <span className="font-mono text-ink">{rung.choices[rung.correctIndex]}</span>.
        </p>
      )}
    </div>
  )
}
