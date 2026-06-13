import { useMemo, useState } from 'react'
import type { CodeLine, OrderRung } from '@/content/primitives/types'
import { checkOrder } from '@/lib/drillCheckers'
import { mulberry32, shuffle } from '@/lib/drillEngine'
import type { RungViewProps } from './rungProps'

interface PoolEntry {
  key: number
  line: CodeLine
}

function lineStyle(indent: number) {
  return { paddingLeft: `${indent * 1.25 + 0.75}rem` }
}

/** Rung 2 — Order (Parsons): tap lines into the right order; leave traps out. */
export function OrderRungView({ rung, phase, revealed, seed, onSubmit }: RungViewProps<OrderRung>) {
  const pool = useMemo<PoolEntry[]>(() => {
    const entries: PoolEntry[] = [
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
  const locked = phase === 'feedback'

  const available = pool.filter((e) => !arranged.includes(e.key))

  function add(key: number) {
    if (locked) return
    setArranged((a) => [...a, key])
  }
  function remove(key: number) {
    if (locked) return
    setArranged((a) => a.filter((k) => k !== key))
  }
  function check() {
    if (locked || arranged.length === 0) return
    onSubmit(checkOrder(rung, arranged.map((k) => byKey.get(k)!)))
  }

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        Your program
      </p>
      <div className="min-h-[3rem] rounded-xl border border-dashed border-edge bg-surface-sunken p-2">
        {arranged.length === 0 ? (
          <p className="px-2 py-3 text-sm text-ink-faint">Tap lines below to build the program.</p>
        ) : (
          <ol className="space-y-1">
            {arranged.map((key, idx) => {
              const line = byKey.get(key)!
              return (
                <li key={key}>
                  <button
                    onClick={() => remove(key)}
                    disabled={locked}
                    style={lineStyle(line.indent)}
                    className="flex w-full items-center justify-between rounded-lg border border-edge bg-surface-raised py-1.5 pr-3 font-mono text-[13px] text-ink transition-colors hover:border-accent/60 disabled:opacity-70"
                  >
                    <span>{line.text}</span>
                    <span className="ml-3 text-ink-faint">{locked ? '' : '×'}</span>
                  </button>
                  <span className="sr-only">position {idx + 1}</span>
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
              {e.line.text}
            </button>
          ))
        )}
      </div>

      {!locked && (
        <button
          onClick={check}
          disabled={arranged.length === 0}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Check order
        </button>
      )}

      {revealed && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Correct order
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
}
