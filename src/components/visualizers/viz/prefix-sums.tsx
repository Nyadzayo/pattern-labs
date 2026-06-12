/**
 * Prefix Sums visualizer: build the running-sum array P cell by cell above
 * the input array, then answer a range-sum query a[i..j] with a single
 * subtraction P[j+1] − P[i]. Follows the canonical step-engine pattern.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { frame, parseIntList, parseIntervals, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizTextInput } from '../inputs'

type Phase = 'init' | 'build' | 'built' | 'mark-end' | 'mark-start' | 'answer'

interface PSData {
  array: number[]
  /** P, length n+1; null = slot not filled in yet. */
  prefix: (number | null)[]
  /** Build-loop index k while computing P[k+1] = P[k] + a[k]. */
  k: number | null
  phase: Phase
  qi: number
  qj: number
  answer: number | null
}

const PSEUDOCODE = [
  'P = [0] * (n + 1)',
  'for k in range(n):',
  '    P[k+1] = P[k] + a[k]',
  '',
  'def range_sum(i, j):',
  '    return P[j+1] - P[i]',
]

/** Wrap negatives in parens so captions read "7 + (-2)" not "7 + -2". */
const paren = (n: number) => (n < 0 ? `(${n})` : `${n}`)

function buildFrames(a: number[], qi: number, qj: number): Frame<PSData>[] {
  const n = a.length
  const frames: Frame<PSData>[] = []
  const prefix: (number | null)[] = Array<number | null>(n + 1).fill(null)
  prefix[0] = 0

  const snap = (over: Partial<PSData>): PSData => ({
    array: a,
    prefix: [...prefix],
    k: null,
    phase: 'init',
    qi,
    qj,
    answer: null,
    ...over,
  })

  frames.push(
    frame(
      snap({}),
      `Allocate P with ${n + 1} slots and set P[0] = 0 — the empty prefix sums to 0.`,
      1,
    ),
  )

  for (let k = 0; k < n; k++) {
    const prev = prefix[k] ?? 0
    prefix[k + 1] = prev + a[k]
    frames.push(
      frame(
        snap({ phase: 'build', k }),
        `P[${k + 1}] = P[${k}] + a[${k}] = ${prev} + ${paren(a[k])} = ${prefix[k + 1]} — sum of the first ${k + 1} element${k === 0 ? '' : 's'}.`,
        3,
      ),
    )
  }

  frames.push(
    frame(
      snap({ phase: 'built' }),
      `Prefix array done after one O(n) pass — P[k] holds the sum of the first k elements. Now answer range_sum(${qi}, ${qj}).`,
      5,
    ),
  )

  const pj = prefix[qj + 1] ?? 0
  const pi = prefix[qi] ?? 0

  frames.push(
    frame(
      snap({ phase: 'mark-end' }),
      `P[j+1] = P[${qj + 1}] = ${pj} — the sum of a[0..${qj}], everything up to and including a[${qj}].`,
      6,
    ),
  )
  frames.push(
    frame(
      snap({ phase: 'mark-start' }),
      qi === 0
        ? 'P[i] = P[0] = 0 — nothing comes before index 0, so there is nothing to subtract.'
        : `P[i] = P[${qi}] = ${pi} — the sum of a[0..${qi - 1}], the unwanted prefix before the range. Subtract it.`,
      6,
    ),
  )
  frames.push(
    frame(
      snap({ phase: 'answer', answer: pj - pi }),
      `P[${qj + 1}] − P[${qi}] = ${pj} − ${paren(pi)} = ${pj - pi}: the sum of a[${qi}..${qj}], answered in O(1).`,
      6,
    ),
  )
  return frames
}

function PSFrame({ data }: { data: PSData }) {
  const { array, prefix, k, phase, qi, qj, answer } = data
  const n = array.length
  const inQuery = phase === 'mark-end' || phase === 'mark-start' || phase === 'answer'
  const showStart = phase === 'mark-start' || phase === 'answer'

  const pCellClass = (idx: number): string => {
    if (prefix[idx] === null) return 'border-dashed border-edge bg-surface-sunken text-ink-faint'
    if (phase === 'build') {
      if (idx === (k ?? -1) + 1) return 'border-accent bg-accent/15 font-bold'
      if (idx === k)
        return 'border-violet-500 bg-violet-500/10 font-semibold text-violet-600 dark:text-violet-400'
    }
    if (inQuery) {
      if (idx === qj + 1) return 'border-accent bg-accent/15 font-bold'
      if (showStart && idx === qi)
        return 'border-violet-500 bg-violet-500/15 font-bold text-violet-600 dark:text-violet-400'
    }
    return 'border-edge bg-surface-sunken'
  }

  const aCellClass = (idx: number): string => {
    if (phase === 'build' && idx === k)
      return 'border-amber-500 bg-amber-500/15 font-semibold text-amber-600 dark:text-amber-400'
    if (phase === 'mark-end' && idx <= qj) return 'border-accent/60 bg-accent/10'
    if (showStart) {
      if (idx >= qi && idx <= qj)
        return phase === 'answer'
          ? 'border-emerald-500 bg-emerald-500/15 font-semibold text-emerald-600 dark:text-emerald-400'
          : 'border-accent/60 bg-accent/10'
      if (idx < qi) return 'border-violet-500/60 bg-violet-500/10 text-ink-muted'
    }
    return 'border-edge bg-surface-sunken'
  }

  const pActive = (idx: number) =>
    (phase === 'build' && idx === (k ?? -1) + 1) ||
    (inQuery && (idx === qj + 1 || (showStart && idx === qi)))

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-2">
      <div className="max-w-full overflow-x-auto px-1">
        <div className="w-max">
          {/* P row: n+1 running-sum cells, each above a boundary of a */}
          <div className="flex items-end gap-3">
            <div className="flex h-10 w-5 items-center justify-end font-mono text-xs font-semibold text-ink-faint">
              P
            </div>
            <div className="flex gap-1.5">
              {prefix.map((v, idx) => (
                <div key={idx} className="flex flex-col items-center gap-0.5">
                  <div className="h-4 font-mono text-[10px] tabular-nums text-ink-faint">{idx}</div>
                  <motion.div
                    layout
                    animate={{
                      scale: pActive(idx) ? 1.08 : 1,
                      opacity: inQuery && !pActive(idx) ? 0.45 : 1,
                    }}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-sm tabular-nums ${pCellClass(idx)}`}
                  >
                    <motion.span
                      key={`${idx}-${v === null ? 'empty' : 'val'}`}
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      {v === null ? '·' : v}
                    </motion.span>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>

          {/* a row, offset half a cell so a[k] sits between P[k] and P[k+1] */}
          <div className="mt-2 flex items-start gap-3">
            <div className="flex h-10 w-5 items-center justify-end font-mono text-xs font-semibold text-ink-faint">
              a
            </div>
            <div className="ml-[23px] flex gap-1.5">
              {array.map((v, idx) => {
                const marker = inQuery && (idx === qi || idx === qj)
                return (
                  <div key={idx} className="flex flex-col items-center gap-0.5">
                    <motion.div
                      layout
                      animate={{
                        scale: phase === 'build' && idx === k ? 1.08 : 1,
                        opacity: phase === 'build' && idx > (k ?? n) ? 0.45 : 1,
                      }}
                      className={`flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-sm tabular-nums ${aCellClass(idx)}`}
                    >
                      {v}
                    </motion.div>
                    <div className="h-5 font-mono text-[10px] font-semibold tabular-nums">
                      {marker ? (
                        <span
                          className={
                            phase === 'answer'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-accent'
                          }
                        >
                          ▲ {idx === qi && idx === qj ? 'i·j' : idx === qi ? 'i' : 'j'}
                        </span>
                      ) : (
                        <span className="font-normal text-ink-faint">{idx}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* live equation for the current step */}
      <div className="h-6 font-mono text-sm tabular-nums text-ink-muted">
        {phase === 'build' && k !== null ? (
          <>
            P[{k + 1}] = {prefix[k] ?? 0} + {paren(array[k])} ={' '}
            <span className="font-semibold text-ink">{prefix[k + 1] ?? 0}</span>
          </>
        ) : phase === 'mark-end' ? (
          <>
            sum(a[0..{qj}]) = P[{qj + 1}] ={' '}
            <span className="font-semibold text-ink">{prefix[qj + 1] ?? 0}</span>
          </>
        ) : phase === 'mark-start' ? (
          <>
            P[{qj + 1}] − P[{qi}] = {prefix[qj + 1] ?? 0} − {paren(prefix[qi] ?? 0)} = ?
          </>
        ) : phase === 'answer' ? (
          <>
            P[{qj + 1}] − P[{qi}] = {prefix[qj + 1] ?? 0} − {paren(prefix[qi] ?? 0)} ={' '}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{answer}</span>
          </>
        ) : (
          '—'
        )}
      </div>
    </div>
  )
}

export default function PrefixSumsVisualizer() {
  const [nums, setNums] = useState<number[]>([3, -1, 4, 1, -5, 9, 2, 6])
  const [range, setRange] = useState<[number, number]>([2, 5])

  // Clamp the query to the current array so shrinking the array never
  // produces out-of-bounds frames (the raw inputs are edited independently).
  const [qi, qj] = useMemo(() => {
    const j = Math.min(range[1], nums.length - 1)
    const i = Math.min(range[0], j)
    return [i, j]
  }, [nums, range])

  const frames = useMemo(() => buildFrames(nums, qi, qj), [nums, qi, qj])
  const resetKey = `${nums.join(',')}|${qi}-${qj}`

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="Array"
          defaultValue={nums.join(', ')}
          hint="Comma-separated integers, negatives OK (max 12)"
          onParsed={(raw) => {
            const parsed = parseIntList(raw, { min: -99, max: 999, maxLen: 12 })
            if (parsed && parsed.length >= 1) {
              setNums(parsed)
              return true
            }
            return false
          }}
        />
        <VizTextInput
          label="Query range i-j"
          defaultValue={`${range[0]}-${range[1]}`}
          hint="0-based, inclusive, e.g. 2-5"
          onParsed={(raw) => {
            const parsed = parseIntervals(raw, 1)
            if (parsed && parsed.length === 1) {
              const [i, j] = parsed[0]
              if (i >= 0 && j < nums.length) {
                setRange([i, j])
                return true
              }
            }
            return false
          }}
        />
      </VizInputRow>
      <StepPlayer
        frames={frames}
        pseudocode={PSEUDOCODE}
        resetKey={resetKey}
        renderFrame={(f) => <PSFrame data={f.data} />}
      />
    </div>
  )
}
