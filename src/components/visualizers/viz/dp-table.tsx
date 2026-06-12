/**
 * DP Table visualizer: edit distance (Levenshtein) between two words.
 * Fills the classic (m+1)×(n+1) grid base-cases-first, then cell by cell,
 * showing the recurrence (match → copy diagonal, else 1 + min(del, ins, sub))
 * and finally traces the optimal edit path back from dp[m][n].
 */
import { Fragment, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { frame, parseWord, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizTextInput } from '../inputs'

type SrcKind = 'diag' | 'up' | 'left'

interface DPData {
  a: string
  b: string
  /** Committed cell values; null = not filled yet. Fresh copy per frame. */
  grid: (number | null)[][]
  /** Cell currently being computed. */
  active: { i: number; j: number } | null
  /** Highlight the three recurrence sources of the active cell? */
  showSrcs: boolean
  /** Source emphasized after the choice is made (diag on match). */
  chosen: SrcKind | null
  /** Characters being compared at the active cell. */
  compare: { ca: string; cb: string; match: boolean } | null
  /** Candidate costs for a mismatch (del = up, ins = left, sub = diag). */
  mins: { del: number; ins: number; sub: number } | null
  /** Value just committed into the active cell. */
  result: number | null
  /** Highlight dp[m][n] as the final answer. */
  answer: boolean
  /** Cells on the traced-back optimal path (grows during trace). */
  path: { i: number; j: number }[]
}

const PSEUDOCODE = [
  'm, n = len(a), len(b)',
  'dp[i][0] = i  # i deletions',
  'dp[0][j] = j  # j insertions',
  'for i in 1..m, j in 1..n:',
  '  if a[i-1] == b[j-1]:',
  '    dp[i][j] = dp[i-1][j-1]',
  '  else:',
  '    dp[i][j] = 1 + min(del,ins,sub)',
  'return dp[m][n]',
]

interface TraceOp {
  kind: 'keep' | 'sub' | 'del' | 'ins'
  /** Cell arrived at after the move. */
  to: { i: number; j: number }
  ca: string
  cb: string
}

/** Walk dp[m][n] → dp[0][0], preferring keep, then sub, del, ins. */
function backtrack(a: string, b: string, dp: number[][]): TraceOp[] {
  const ops: TraceOp[] = []
  let i = a.length
  let j = b.length
  while (i > 0 || j > 0) {
    const ca = i > 0 ? a[i - 1] : ''
    const cb = j > 0 ? b[j - 1] : ''
    if (i > 0 && j > 0 && ca === cb && dp[i][j] === dp[i - 1][j - 1]) {
      i--
      j--
      ops.push({ kind: 'keep', to: { i, j }, ca, cb })
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      i--
      j--
      ops.push({ kind: 'sub', to: { i, j }, ca, cb })
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      i--
      ops.push({ kind: 'del', to: { i, j }, ca, cb })
    } else {
      j--
      ops.push({ kind: 'ins', to: { i, j }, ca, cb })
    }
  }
  return ops
}

function buildFrames(a: string, b: string): Frame<DPData>[] {
  const m = a.length
  const n = b.length
  const frames: Frame<DPData>[] = []
  const g: (number | null)[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => null),
  )
  const base = {
    a,
    b,
    active: null,
    showSrcs: false,
    chosen: null,
    compare: null,
    mins: null,
    result: null,
    answer: false,
    path: [] as { i: number; j: number }[],
  }
  const snap = () => g.map((row) => [...row])

  frames.push(
    frame(
      { ...base, grid: snap() },
      `dp[i][j] = fewest edits turning the first i letters of "${a}" into the first j letters of "${b}". Build a ${m + 1}×${n + 1} table.`,
      1,
    ),
  )

  // Base column: dp[i][0] = i (delete everything).
  for (let i = 0; i <= m; i++) {
    g[i][0] = i
    frames.push(
      frame(
        { ...base, grid: snap(), active: { i, j: 0 }, result: i },
        i === 0
          ? 'dp[0][0] = 0: turning the empty string into the empty string needs no edits.'
          : `dp[${i}][0] = ${i}: erasing "${a.slice(0, i)}" down to nothing takes ${i} deletion${i === 1 ? '' : 's'}.`,
        2,
      ),
    )
  }

  // Base row: dp[0][j] = j (insert everything).
  for (let j = 1; j <= n; j++) {
    g[0][j] = j
    frames.push(
      frame(
        { ...base, grid: snap(), active: { i: 0, j }, result: j },
        `dp[0][${j}] = ${j}: building "${b.slice(0, j)}" from nothing takes ${j} insertion${j === 1 ? '' : 's'}.`,
        3,
      ),
    )
  }

  // Fill the table cell by cell.
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const ca = a[i - 1]
      const cb = b[j - 1]
      const match = ca === cb
      const sub = g[i - 1][j - 1] as number
      const del = g[i - 1][j] as number
      const ins = g[i][j - 1] as number
      const compare = { ca, cb, match }
      const mins = match ? null : { del, ins, sub }

      frames.push(
        frame(
          { ...base, grid: snap(), active: { i, j }, showSrcs: true, compare, mins },
          match
            ? `dp[${i}][${j}]: '${ca}' vs '${cb}' — match! The last letters agree, so no new edit is needed.`
            : `dp[${i}][${j}]: '${ca}' vs '${cb}' — mismatch. Candidates: delete ${del}, insert ${ins}, substitute ${sub}.`,
          5,
        ),
      )

      let value: number
      let chosen: SrcKind
      let caption: string
      if (match) {
        value = sub
        chosen = 'diag'
        caption = `Copy the diagonal: dp[${i}][${j}] = dp[${i - 1}][${j - 1}] = ${sub}. Matching '${ca}' costs nothing.`
      } else {
        const best = Math.min(sub, del, ins)
        value = best + 1
        if (sub === best) {
          chosen = 'diag'
          caption = `min(${del}, ${ins}, ${sub}) + 1 = ${value} — substituting '${ca}'→'${cb}' is cheapest. dp[${i}][${j}] = ${value}.`
        } else if (del === best) {
          chosen = 'up'
          caption = `min(${del}, ${ins}, ${sub}) + 1 = ${value} — deleting '${ca}' is cheapest. dp[${i}][${j}] = ${value}.`
        } else {
          chosen = 'left'
          caption = `min(${del}, ${ins}, ${sub}) + 1 = ${value} — inserting '${cb}' is cheapest. dp[${i}][${j}] = ${value}.`
        }
      }
      g[i][j] = value
      frames.push(
        frame(
          { ...base, grid: snap(), active: { i, j }, showSrcs: true, chosen, compare, mins, result: value },
          caption,
          match ? 6 : 8,
        ),
      )
    }
  }

  const ans = g[m][n] as number
  const done = snap()
  frames.push(
    frame(
      { ...base, grid: done, answer: true, result: ans, path: [{ i: m, j: n }] },
      `Done: dp[${m}][${n}] = ${ans}. "${a}" becomes "${b}" in ${ans} edit${ans === 1 ? '' : 's'}. Now trace back how.`,
      9,
    ),
  )

  // Bonus: trace the optimal path back to dp[0][0].
  const ops = backtrack(a, b, g as number[][])
  const path: { i: number; j: number }[] = [{ i: m, j: n }]
  for (const op of ops) {
    path.push(op.to)
    const captions: Record<TraceOp['kind'], string> = {
      keep: `'${op.ca}' already matches '${op.cb}' — keep it and step diagonally to dp[${op.to.i}][${op.to.j}].`,
      sub: `Edit: substitute '${op.ca}'→'${op.cb}' (cost 1), step diagonally to dp[${op.to.i}][${op.to.j}].`,
      del: `Edit: delete '${op.ca}' (cost 1), step up to dp[${op.to.i}][${op.to.j}].`,
      ins: `Edit: insert '${op.cb}' (cost 1), step left to dp[${op.to.i}][${op.to.j}].`,
    }
    frames.push(
      frame({ ...base, grid: done.map((r) => [...r]), answer: true, result: ans, path: [...path] }, captions[op.kind], 9),
    )
  }
  const edits = [...ops]
    .reverse()
    .filter((o) => o.kind !== 'keep')
    .map((o) => (o.kind === 'sub' ? `${o.ca}→${o.cb}` : o.kind === 'del' ? `delete ${o.ca}` : `insert ${o.cb}`))
  frames.push(
    frame(
      { ...base, grid: done.map((r) => [...r]), answer: true, result: ans, path: [...path] },
      edits.length
        ? `Optimal path: ${edits.length} edit${edits.length === 1 ? '' : 's'} — ${edits.join(', ')}.`
        : 'Optimal path: the words already match — zero edits needed.',
      9,
    ),
  )
  return frames
}

const SRC_CLS: Record<SrcKind, string> = {
  diag: 'border-violet-500/70 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  up: 'border-red-500/70 bg-red-500/10 text-red-600 dark:text-red-400',
  left: 'border-amber-500/70 bg-amber-500/10 text-amber-600 dark:text-amber-400',
}

function DPFrame({ data }: { data: DPData }) {
  const { a, b, grid, active, showSrcs, chosen, compare, mins, result, answer, path } = data
  const m = a.length
  const n = b.length
  const onPath = new Set(path.map((p) => `${p.i},${p.j}`))

  const srcKindOf = (i: number, j: number): SrcKind | null => {
    if (!active || !showSrcs) return null
    if (i === active.i - 1 && j === active.j - 1) return 'diag'
    if (i === active.i - 1 && j === active.j) return 'up'
    if (i === active.i && j === active.j - 1) return 'left'
    return null
  }

  const headerCls = (hl: boolean) =>
    `flex h-9 w-9 items-center justify-center font-mono text-sm transition-colors ${
      hl ? 'font-bold text-accent' : 'text-ink-faint'
    }`

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-2">
      <div className="max-w-full overflow-x-auto px-1 py-1">
        <div className="grid w-max gap-1" style={{ gridTemplateColumns: `repeat(${n + 2}, 2.25rem)` }}>
          {/* Column headers: corner, ε, then the letters of b. */}
          <div />
          <div className={headerCls(false)}>ε</div>
          {Array.from({ length: n }, (_, j) => (
            <div key={`ch${j}`} className={headerCls(active?.j === j + 1)}>
              {b[j]}
            </div>
          ))}

          {Array.from({ length: m + 1 }, (_, i) => (
            <Fragment key={`r${i}`}>
              <div className={headerCls(active?.i === i && i > 0)}>{i === 0 ? 'ε' : a[i - 1]}</div>
              {Array.from({ length: n + 1 }, (_, j) => {
                const v = grid[i][j]
                const isActive = active?.i === i && active?.j === j
                const src = srcKindOf(i, j)
                const isChosen = src !== null && chosen === src
                const isAnswer = answer && i === m && j === n
                const inPath = onPath.has(`${i},${j}`) && !isAnswer

                let cls = 'border-dashed border-edge text-ink-faint' // unfilled
                if (v !== null) cls = 'border-edge bg-surface-sunken text-ink-muted'
                if (inPath) cls = 'border-accent/70 bg-accent/15 font-semibold text-ink'
                if (src) cls = SRC_CLS[src]
                if (isChosen)
                  cls = 'border-emerald-500 bg-emerald-500/20 font-bold text-emerald-600 ring-2 ring-emerald-500/30 dark:text-emerald-400'
                if (isActive) cls = 'border-accent bg-accent/10 font-semibold text-ink'
                if (isAnswer)
                  cls = 'border-emerald-500 bg-emerald-500/15 font-bold text-emerald-600 dark:text-emerald-400'

                return (
                  <motion.div
                    key={`c${i}-${j}`}
                    animate={{ scale: isActive || isAnswer ? 1.08 : 1 }}
                    className={`relative flex h-9 w-9 items-center justify-center rounded-md border font-mono text-sm tabular-nums ${cls}`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="dp-active-ring"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute -inset-px rounded-md ring-2 ring-accent"
                      />
                    )}
                    {v !== null && (
                      <motion.span
                        initial={{ scale: 0.3, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      >
                        {v}
                      </motion.span>
                    )}
                  </motion.div>
                )
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Recurrence readout for the active cell. */}
      <div className="flex min-h-[24px] items-center font-mono text-sm tabular-nums text-ink-muted">
        {compare && active ? (
          compare.match ? (
            <span>
              '{compare.ca}' = '{compare.cb}' →{' '}
              <span className={chosen ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400'}>
                copy diagonal{result !== null ? ` = ${result}` : ''}
              </span>
            </span>
          ) : mins ? (
            <span>
              '{compare.ca}' ≠ '{compare.cb}' → 1 + min(
              <span className={chosen === 'up' ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                del {mins.del}
              </span>
              ,{' '}
              <span className={chosen === 'left' ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                ins {mins.ins}
              </span>
              ,{' '}
              <span className={chosen === 'diag' ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'text-violet-600 dark:text-violet-400'}>
                sub {mins.sub}
              </span>
              )
              {result !== null && <span className="font-bold text-ink"> = {result}</span>}
            </span>
          ) : null
        ) : answer ? (
          <span>
            edit distance ={' '}
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{result}</span>
          </span>
        ) : active ? (
          <span>
            dp[{active.i}][{active.j}] = <span className="font-semibold text-ink">{result}</span>
          </span>
        ) : (
          '—'
        )}
      </div>
    </div>
  )
}

export default function DPTableVisualizer() {
  const [wordA, setWordA] = useState('horse')
  const [wordB, setWordB] = useState('ros')

  const frames = useMemo(() => buildFrames(wordA, wordB), [wordA, wordB])
  const resetKey = `${wordA}|${wordB}`

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="From word (rows)"
          defaultValue={wordA}
          hint="Letters only, max 8"
          onParsed={(raw) => {
            const parsed = parseWord(raw, 8)
            if (parsed) {
              setWordA(parsed.toLowerCase())
              return true
            }
            return false
          }}
        />
        <VizTextInput
          label="To word (columns)"
          defaultValue={wordB}
          hint="Letters only, max 8"
          onParsed={(raw) => {
            const parsed = parseWord(raw, 8)
            if (parsed) {
              setWordB(parsed.toLowerCase())
              return true
            }
            return false
          }}
        />
      </VizInputRow>
      <StepPlayer
        frames={frames}
        pseudocode={PSEUDOCODE}
        resetKey={resetKey}
        renderFrame={(f) => <DPFrame data={f.data} />}
      />
    </div>
  )
}
