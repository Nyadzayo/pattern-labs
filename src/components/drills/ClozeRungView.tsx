import { Fragment, useMemo, useState } from 'react'
import { CLOZE_BLANK, type ClozeRung } from '@/content/primitives/types'
import { checkCloze } from '@/lib/drillCheckers'
import type { RungViewProps } from './rungProps'

/** Rung 4 — Cloze: the lines are given in order; type each blanked token. */
export function ClozeRungView({ rung, phase, revealed, onSubmit }: RungViewProps<ClozeRung>) {
  const [inputs, setInputs] = useState<string[]>(() => rung.blanks.map(() => ''))
  const locked = phase === 'feedback'
  const result = locked ? checkCloze(rung, inputs) : null

  // For each line, the blank indices (in `rung.blanks` order) that target it.
  const blanksByLine = useMemo(() => {
    const map = new Map<number, number[]>()
    rung.blanks.forEach((b, i) => {
      const arr = map.get(b.lineIndex) ?? []
      arr.push(i)
      map.set(b.lineIndex, arr)
    })
    return map
  }, [rung])

  const allFilled = inputs.every((v) => v.trim() !== '')

  function setInput(i: number, v: string) {
    if (locked) return
    setInputs((prev) => prev.map((x, j) => (j === i ? v : x)))
  }
  function check() {
    if (!locked && allFilled) onSubmit(checkCloze(rung, inputs))
  }

  return (
    <div>
      <pre className="overflow-x-auto rounded-xl border border-edge bg-surface-sunken p-4 font-mono text-[13px] leading-7 text-ink">
        <code>
          {rung.lines.map((line, lineIdx) => {
            const blankIdxs = blanksByLine.get(lineIdx) ?? []
            const parts = line.split(CLOZE_BLANK)
            return (
              <div key={lineIdx}>
                {parts.map((part, p) => {
                  const blankIdx = blankIdxs[p] // blank that follows this part
                  return (
                    <Fragment key={p}>
                      <span>{part}</span>
                      {blankIdx !== undefined && (
                        <input
                          value={inputs[blankIdx]}
                          disabled={locked}
                          onChange={(e) => setInput(blankIdx, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') check()
                          }}
                          placeholder={rung.blanks[blankIdx].placeholder ?? ''}
                          size={Math.max(4, (rung.blanks[blankIdx].accept[0] ?? '').length)}
                          spellCheck={false}
                          autoCapitalize="off"
                          autoCorrect="off"
                          className={`mx-0.5 rounded border bg-surface-raised px-1.5 py-0.5 font-mono text-[12px] outline-none ${
                            locked
                              ? result?.perBlank?.[blankIdx]
                                ? 'border-emerald-500/60 text-emerald-600 dark:text-emerald-400'
                                : 'border-red-500/60 text-red-600 dark:text-red-400'
                              : 'border-accent/50 focus:border-accent'
                          }`}
                        />
                      )}
                    </Fragment>
                  )
                })}
              </div>
            )
          })}
        </code>
      </pre>

      {!locked && (
        <button
          onClick={check}
          disabled={!allFilled}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Check
        </button>
      )}

      {revealed && result && !result.correct && (
        <p className="mt-3 text-xs text-ink-muted">
          Answer
          {rung.blanks.length > 1 ? 's' : ''}:{' '}
          {rung.blanks.map((b, i) => (
            <span key={i} className="font-mono text-ink">
              {b.accept[0]}
              {i < rung.blanks.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}
    </div>
  )
}
