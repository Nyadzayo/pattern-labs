import { useMemo, useState, type ReactNode } from 'react'
import type { CodeLine, FadeRung } from '@/content/primitives/types'
import { checkFade } from '@/lib/drillCheckers'
import { mulberry32, shuffle } from '@/lib/drillEngine'
import type { RungViewProps } from './rungProps'

interface PoolEntry {
  key: number
  line: CodeLine
}

function lineStyle(indent: number) {
  return { paddingLeft: `${indent * 1.25 + 0.75}rem` }
}

/** Rung 3 — Fade (Parsons + blanks): order the lines AND fill the faded tokens. */
export function FadeRungView({ rung, phase, revealed, seed, onSubmit }: RungViewProps<FadeRung>) {
  const pool = useMemo<PoolEntry[]>(() => {
    const entries: PoolEntry[] = [
      // Correct lines keep key === their index, so blank.lineIndex maps to a key.
      ...rung.lines.map((line, i) => ({ key: i, line })),
      ...rung.distractors.map((d, i) => ({
        key: rung.lines.length + i,
        line: { text: d.text, indent: d.indent },
      })),
    ]
    return shuffle(entries, mulberry32(seed))
  }, [rung, seed])

  const byKey = useMemo(() => new Map(pool.map((e) => [e.key, e.line])), [pool])
  const [arranged, setArranged] = useState<number[]>([])
  const [blankSel, setBlankSel] = useState<Record<number, string>>({})
  const locked = phase === 'feedback'
  const available = pool.filter((e) => !arranged.includes(e.key))

  const blankInputs = rung.blanks.map((_, i) => blankSel[i] ?? '')
  const allBlanksFilled = rung.blanks.every((_, i) => blankSel[i])
  const result = locked ? checkFade(rung, arranged.map((k) => byKey.get(k)!), blankInputs) : null

  function add(key: number) {
    if (!locked) setArranged((a) => [...a, key])
  }
  function remove(key: number) {
    if (!locked) setArranged((a) => a.filter((k) => k !== key))
  }
  function check() {
    if (locked || arranged.length === 0 || !allBlanksFilled) return
    onSubmit(checkFade(rung, arranged.map((k) => byKey.get(k)!), blankInputs))
  }

  function blankFor(key: number) {
    const i = rung.blanks.findIndex((b) => b.lineIndex === key)
    return i === -1 ? null : { index: i, blank: rung.blanks[i] }
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        Your program
      </p>
      <div className="min-h-[3rem] rounded-xl border border-dashed border-edge bg-surface-sunken p-2">
        {arranged.length === 0 ? (
          <p className="px-2 py-3 text-sm text-ink-faint">Tap lines below, then fill each blank.</p>
        ) : (
          <ol className="space-y-1">
            {arranged.map((key) => {
              const line = byKey.get(key)!
              const b = blankFor(key)
              return (
                <li
                  key={key}
                  style={lineStyle(line.indent)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-edge bg-surface-raised py-1.5 pr-2 font-mono text-[13px] text-ink"
                >
                  <span className="flex flex-wrap items-center gap-x-0.5">
                    {b ? <FadedLine text={line.text} token={b.blank.token} render={() => (
                      <select
                        value={blankSel[b.index] ?? ''}
                        disabled={locked}
                        onChange={(e) => setBlankSel((s) => ({ ...s, [b.index]: e.target.value }))}
                        className={`mx-0.5 rounded border bg-surface-sunken px-1 py-0.5 font-mono text-[12px] ${
                          locked
                            ? blankSel[b.index] === b.blank.token
                              ? 'border-emerald-500/60 text-emerald-600 dark:text-emerald-400'
                              : 'border-red-500/60 text-red-600 dark:text-red-400'
                            : 'border-accent/60 text-ink'
                        }`}
                      >
                        <option value="" disabled>
                          …
                        </option>
                        {b.blank.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    )} /> : (
                      <span>{line.text}</span>
                    )}
                  </span>
                  {!locked && (
                    <button onClick={() => remove(key)} className="text-ink-faint hover:text-ink" aria-label="remove">
                      ×
                    </button>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <p className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        Available lines
      </p>
      <div className="flex flex-col gap-1">
        {available.length === 0 ? (
          <p className="px-2 py-2 text-sm text-ink-faint">All lines placed.</p>
        ) : (
          available.map((e) => (
            <button
              key={e.key}
              onClick={() => add(e.key)}
              disabled={locked}
              style={lineStyle(e.line.indent)}
              className="rounded-lg border border-edge bg-surface-raised py-1.5 pr-3 text-left font-mono text-[13px] text-ink transition-colors hover:border-accent/60 disabled:opacity-50"
            >
              {/* Mask the faded token in the available chip too. */}
              {maskToken(e)}
            </button>
          ))
        )}
      </div>

      {!locked && (
        <button
          onClick={check}
          disabled={arranged.length === 0 || !allBlanksFilled}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Check
        </button>
      )}

      {revealed && result && !result.correct && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Correct program
          </p>
          <ol className="space-y-1">
            {rung.lines.map((line, i) => (
              <li
                key={i}
                style={lineStyle(line.indent)}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 py-1.5 pr-3 font-mono text-[13px] text-emerald-700 dark:text-emerald-300"
              >
                {line.text}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )

  function maskToken(e: PoolEntry): string {
    const b = blankFor(e.key)
    if (!b) return e.line.text
    return e.line.text.replace(b.blank.token, '▢')
  }
}

/** Render a line with its faded token replaced by `render()` (the dropdown). */
function FadedLine({
  text,
  token,
  render,
}: {
  text: string
  token: string
  render: () => ReactNode
}) {
  const idx = text.indexOf(token)
  if (idx === -1) return <span>{text}</span>
  return (
    <>
      <span>{text.slice(0, idx)}</span>
      {render()}
      <span>{text.slice(idx + token.length)}</span>
    </>
  )
}
