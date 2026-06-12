/**
 * Linked List visualizer: two classic pointer dances on a singly linked
 * list — in-place reversal (prev/curr/nxt surgery, arrows flipping one by
 * one) and Floyd's cycle detection (fast lapping slow until they meet).
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { frame, parseIntList, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizSelect, VizTextInput } from '../inputs'

type Mode = 'reverse' | 'cycle'

interface ReverseData {
  kind: 'reverse'
  values: number[]
  /** next[i] = index node i points to, or null. Copied per frame. */
  next: (number | null)[]
  prev: number | null
  curr: number | null
  nxt: number | null
  showNxt: boolean
  justFlipped: number | null
  done: boolean
}

interface CycleData {
  kind: 'cycle'
  values: number[]
  cycleTo: number
  slow: number
  fast: number | null
  status: 'start' | 'running' | 'met' | 'no-cycle'
  /** True when a pointer just traversed the back-edge this frame. */
  wrapped: boolean
}

type LLData = ReverseData | CycleData

const REVERSE_CODE = [
  'prev, curr = None, head',
  'while curr:',
  '    nxt = curr.next',
  '    curr.next = prev   # flip',
  '    prev, curr = curr, nxt',
  'return prev   # new head',
]

const CYCLE_CODE = [
  'slow, fast = head, head',
  'while fast and fast.next:',
  '    slow = slow.next',
  '    fast = fast.next.next',
  '    if slow == fast:',
  '        return True   # cycle!',
  'return False   # hit the end',
]

// ---------- frame builders (pure) ----------

function buildReverseFrames(values: number[]): Frame<ReverseData>[] {
  const n = values.length
  const next: (number | null)[] = values.map((_, i) => (i < n - 1 ? i + 1 : null))
  const frames: Frame<ReverseData>[] = []
  let prev: number | null = null
  let curr: number | null = 0
  let nxt: number | null = null
  let showNxt = false
  const snap = (justFlipped: number | null, done = false): ReverseData => ({
    kind: 'reverse',
    values,
    next: [...next],
    prev,
    curr,
    nxt,
    showNxt,
    justFlipped,
    done,
  })

  frames.push(
    frame(
      snap(null),
      `prev = None, curr = head — node 0 (value ${values[0]}). Walk the list, flipping one arrow at a time.`,
      1,
    ),
  )
  let flips = 0
  while (curr !== null) {
    const c: number = curr
    nxt = next[c]
    showNxt = true
    frames.push(
      frame(
        snap(null),
        nxt === null
          ? `nxt = curr.next = None — node ${c} (value ${values[c]}) is the last node.`
          : `nxt = curr.next — save node ${nxt} (value ${values[nxt]}) so the rest of the list isn't lost.`,
        3,
      ),
    )
    next[c] = prev
    flips += 1
    frames.push(
      frame(
        snap(c),
        prev === null
          ? `Flip: node ${c} (${values[c]}).next now points to None — it becomes the new tail. ${flips}/${n} arrows flipped.`
          : `Flip: node ${c} (${values[c]}).next now points back to node ${prev} (${values[prev]}). ${flips}/${n} arrows flipped.`,
        4,
      ),
    )
    prev = c
    curr = nxt
    frames.push(
      frame(
        snap(null),
        curr === null
          ? `Advance: prev = node ${prev} (${values[prev]}), curr = nxt = None — we've walked off the end.`
          : `Advance: prev = node ${prev} (${values[prev]}), curr = node ${curr} (${values[curr]}).`,
        5,
      ),
    )
  }
  const head = prev ?? 0
  frames.push(
    frame(
      snap(null, true),
      `curr is None, the loop ends. Return prev — node ${head} (value ${values[head]}) is the new head of the reversed list.`,
      6,
    ),
  )
  return frames
}

function buildCycleFrames(values: number[], cycleTo: number): Frame<CycleData>[] {
  const n = values.length
  const hasCycle = cycleTo >= 0
  const nextOf = (i: number): number | null => (i < n - 1 ? i + 1 : hasCycle ? cycleTo : null)
  const base = { kind: 'cycle' as const, values, cycleTo }
  const frames: Frame<CycleData>[] = []
  let slow = 0
  let fast: number | null = 0

  frames.push(
    frame(
      { ...base, slow, fast, status: 'start', wrapped: false },
      `slow and fast start together at the head — node 0 (value ${values[0]}).${
        hasCycle ? ` The tail (node ${n - 1}) secretly links back to node ${cycleTo}.` : ''
      }`,
      1,
    ),
  )

  let guard = 0
  while (fast !== null && nextOf(fast) !== null && guard < 64) {
    guard += 1
    const sFrom = slow
    slow = nextOf(slow) ?? slow
    const sWrap = hasCycle && sFrom === n - 1
    frames.push(
      frame(
        { ...base, slow, fast, status: 'running', wrapped: sWrap },
        sWrap
          ? `slow follows the back-edge: node ${sFrom} (${values[sFrom]}) → node ${slow} (${values[slow]}).`
          : `slow steps once: node ${sFrom} (${values[sFrom]}) → node ${slow} (${values[slow]}).`,
        3,
      ),
    )

    const f0 = fast
    const f1 = nextOf(f0)
    if (f1 === null) break // unreachable: guarded by the while condition
    fast = nextOf(f1)
    if (fast === null) {
      frames.push(
        frame(
          { ...base, slow, fast, status: 'running', wrapped: false },
          `fast jumps twice: node ${f0} (${values[f0]}) → node ${f1} → None. It fell off the end.`,
          4,
        ),
      )
      break
    }
    const fWrap = hasCycle && (f0 === n - 1 || f1 === n - 1)
    frames.push(
      frame(
        { ...base, slow, fast, status: 'running', wrapped: fWrap },
        fWrap
          ? `fast laps through the back-edge: node ${f0} (${values[f0]}) → node ${f1} → node ${fast} (${values[fast]}). It's now chasing slow from behind!`
          : `fast jumps twice: node ${f0} (${values[f0]}) → node ${f1} → node ${fast} (${values[fast]}).`,
        4,
      ),
    )
    if (slow === fast) {
      frames.push(
        frame(
          { ...base, slow, fast, status: 'met', wrapped: false },
          `slow == fast — they meet at node ${slow} (value ${values[slow]}). Fast lapped slow inside the cycle: cycle detected!`,
          6,
        ),
      )
      return frames
    }
  }

  const tailNote =
    fast === null
      ? 'fast ran past the end (fast is None)'
      : `fast sits at node ${fast} (value ${values[fast]}) and fast.next is None`
  frames.push(
    frame(
      { ...base, slow, fast, status: 'no-cycle', wrapped: false },
      `${tailNote} — the list terminates, so there is no cycle.`,
      7,
    ),
  )
  return frames
}

// ---------- rendering ----------

const PAD = 18
const NODE_W = 54
const NODE_H = 38
const GAP = 38
const PITCH = NODE_W + GAP
const NULL_R = 11
const TRACK_H = 20

/** Straight arrow with an inline arrowhead, drawn left→right or right→left. */
function arrowD(x1: number, x2: number, y: number): string {
  const s = x2 > x1 ? 1 : -1
  return `M ${x1} ${y} L ${x2} ${y} M ${x2 - 7 * s} ${y - 4.5} L ${x2} ${y} M ${x2 - 7 * s} ${y + 4.5} L ${x2} ${y}`
}

function PointerMarker({
  x,
  label,
  colorClass,
  track,
}: {
  x: number
  label: string
  colorClass: string
  track: number
}) {
  const yText = PAD + track * TRACK_H + 10
  return (
    <motion.g
      initial={false}
      animate={{ x }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className={colorClass}
    >
      <text x={0} y={yText} textAnchor="middle" fill="currentColor" className="font-mono text-[10px] font-bold">
        {label}
      </text>
      <path d={`M -4 ${yText + 3} L 4 ${yText + 3} L 0 ${yText + 8} Z`} fill="currentColor" />
    </motion.g>
  )
}

function NullSlot({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={NULL_R} strokeDasharray="3 3" strokeWidth={1.5} className="fill-transparent stroke-edge" />
      <text x={cx} y={cy + 3.5} textAnchor="middle" fill="currentColor" className="text-[11px] text-ink-faint">
        ∅
      </text>
    </g>
  )
}

function NodeBox({
  x,
  y,
  value,
  index,
  className,
  emphasized,
}: {
  x: number
  y: number
  value: number
  index: number
  className: string
  emphasized: boolean
}) {
  return (
    <g>
      <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={8} strokeWidth={emphasized ? 2 : 1.5} className={className} />
      <text
        x={x + NODE_W / 2}
        y={y + NODE_H / 2 + 4.5}
        textAnchor="middle"
        fill="currentColor"
        className="font-mono text-[13px] font-semibold text-ink"
      >
        {value}
      </text>
      <text x={x + NODE_W - 5} y={y + 11} textAnchor="end" fill="currentColor" className="font-mono text-[8px] text-ink-faint">
        {index}
      </text>
    </g>
  )
}

function ReverseFrame({ data }: { data: ReverseData }) {
  const { values, next, prev, curr, nxt, showNxt, justFlipped, done } = data
  const n = values.length
  const leftNullCx = PAD + NULL_R
  const startX = PAD + NULL_R * 2 + GAP
  const left = (i: number) => startX + i * PITCH
  const cxOf = (i: number) => left(i) + NODE_W / 2
  const rightNullCx = left(n - 1) + NODE_W + GAP + NULL_R
  const width = rightNullCx + NULL_R + PAD
  const nodesTop = PAD + 3 * TRACK_H + 6
  const midY = nodesTop + NODE_H / 2
  const height = nodesTop + NODE_H + 16
  const flippedCount = next.filter((t, i) => t === i - 1 || (i === 0 && t === null)).length
  const markerX = (idx: number | null, nullSide: 'L' | 'R') =>
    idx === null ? (nullSide === 'L' ? leftNullCx : rightNullCx) : cxOf(idx)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: width }} role="img" aria-label="Linked list reversal">
        <NullSlot cx={leftNullCx} cy={midY} />
        <NullSlot cx={rightNullCx} cy={midY} />

        <AnimatePresence initial={false}>
          {values.map((_, i) => {
            const t = next[i]
            let x1: number
            let x2: number
            if (t === i + 1) {
              x1 = left(i) + NODE_W
              x2 = left(i + 1)
            } else if (t === i - 1) {
              x1 = left(i)
              x2 = left(i - 1) + NODE_W
            } else if (t === null && i === n - 1) {
              x1 = left(i) + NODE_W
              x2 = rightNullCx - NULL_R
            } else if (t === null && i === 0) {
              x1 = left(0)
              x2 = leftNullCx + NULL_R
            } else {
              return null
            }
            const reversed = t === i - 1 || (i === 0 && t === null)
            return (
              <motion.path
                key={`e${i}-${t ?? 'x'}`}
                d={arrowD(x1, x2, midY)}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                strokeWidth={1.75}
                strokeLinecap="round"
                fill="none"
                className={reversed ? 'stroke-emerald-500' : 'stroke-ink-faint'}
              />
            )
          })}
        </AnimatePresence>

        {values.map((v, i) => {
          const isCurr = i === curr
          const isJust = i === justFlipped
          const isHead = done && i === prev
          const cls = isHead || isJust
            ? 'fill-emerald-500/15 stroke-emerald-500'
            : isCurr
              ? 'fill-accent/10 stroke-accent'
              : done
                ? 'fill-emerald-500/5 stroke-emerald-500/50'
                : 'fill-surface-sunken stroke-edge'
          return <NodeBox key={i} x={left(i)} y={nodesTop} value={v} index={i} className={cls} emphasized={isCurr || isJust || isHead} />
        })}

        {!done && <PointerMarker x={markerX(prev, 'L')} label="prev" colorClass="text-violet-500" track={0} />}
        {!done && <PointerMarker x={markerX(curr, 'R')} label="curr" colorClass="text-accent" track={1} />}
        {!done && showNxt && <PointerMarker x={markerX(nxt, 'R')} label="nxt" colorClass="text-amber-500" track={2} />}
        {done && <PointerMarker x={markerX(prev, 'R')} label="head" colorClass="text-emerald-500" track={1} />}
      </svg>

      <div className="font-mono text-xs tabular-nums text-ink-muted">
        {done ? (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            reversed — new head: node {prev ?? 0} (value {values[prev ?? 0]})
          </span>
        ) : (
          <>
            arrows flipped: <span className="font-semibold text-ink">{flippedCount}</span> / {n}
          </>
        )}
      </div>
    </div>
  )
}

function CycleFrame({ data }: { data: CycleData }) {
  const { values, cycleTo, slow, fast, status, wrapped } = data
  const n = values.length
  const hasCycle = cycleTo >= 0
  const left = (i: number) => PAD + i * PITCH
  const cxOf = (i: number) => left(i) + NODE_W / 2
  const lastRight = left(n - 1) + NODE_W
  const rightNullCx = lastRight + GAP + NULL_R
  const width = (hasCycle ? lastRight : rightNullCx + NULL_R) + PAD
  const nodesTop = PAD + 2 * TRACK_H + 6
  const midY = nodesTop + NODE_H / 2
  const yB = nodesTop + NODE_H
  const depth = hasCycle ? (cycleTo === n - 1 ? 44 : 30 + (n - 1 - cycleTo) * 4) : 0
  const height = yB + (hasCycle ? depth + 16 : 24)
  const selfLoop = cycleTo === n - 1
  const sx = selfLoop ? cxOf(n - 1) + 14 : cxOf(n - 1)
  const ex = hasCycle ? (selfLoop ? cxOf(n - 1) - 14 : cxOf(cycleTo)) : 0

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxWidth: width }} role="img" aria-label="Cycle detection with fast and slow pointers">
        {/* forward arrows */}
        {values.slice(0, -1).map((_, i) => (
          <path
            key={`f${i}`}
            d={arrowD(left(i) + NODE_W, left(i + 1), midY)}
            strokeWidth={1.75}
            strokeLinecap="round"
            fill="none"
            className="stroke-ink-faint"
          />
        ))}
        {!hasCycle && (
          <>
            <path
              d={arrowD(lastRight, rightNullCx - NULL_R, midY)}
              strokeWidth={1.75}
              strokeLinecap="round"
              fill="none"
              className="stroke-ink-faint"
            />
            <NullSlot cx={rightNullCx} cy={midY} />
          </>
        )}

        {/* back-edge, drawn distinctly */}
        {hasCycle && (
          <g>
            <motion.path
              d={`M ${sx} ${yB} C ${sx} ${yB + depth}, ${ex} ${yB + depth}, ${ex} ${yB + 7}`}
              fill="none"
              strokeDasharray="5 4"
              strokeLinecap="round"
              initial={false}
              animate={{ opacity: wrapped ? 1 : 0.55, strokeWidth: wrapped ? 2.5 : 1.75 }}
              transition={{ duration: 0.3 }}
              className="stroke-amber-500"
            />
            <motion.path
              d={`M ${ex - 4.5} ${yB + 13} L ${ex} ${yB + 3} L ${ex + 4.5} ${yB + 13} Z`}
              initial={false}
              animate={{ opacity: wrapped ? 1 : 0.7 }}
              className="fill-amber-500"
            />
            <text
              x={(sx + ex) / 2}
              y={yB + depth * 0.75 + 12}
              textAnchor="middle"
              fill="currentColor"
              className="font-mono text-[9px] text-amber-500"
            >
              back-edge → node {cycleTo}
            </text>
          </g>
        )}

        {values.map((v, i) => {
          const isMeet = status === 'met' && i === slow
          const isSlow = i === slow
          const isFast = i === fast
          const cls = isMeet
            ? 'fill-emerald-500/15 stroke-emerald-500'
            : isSlow && isFast
              ? 'fill-accent/15 stroke-violet-500'
              : isSlow
                ? 'fill-accent/10 stroke-accent'
                : isFast
                  ? 'fill-violet-500/10 stroke-violet-500'
                  : hasCycle && i === cycleTo
                    ? 'fill-amber-500/5 stroke-amber-500/60'
                    : 'fill-surface-sunken stroke-edge'
          return <NodeBox key={i} x={left(i)} y={nodesTop} value={v} index={i} className={cls} emphasized={isSlow || isFast} />
        })}

        <PointerMarker x={cxOf(slow)} label="slow" colorClass={status === 'met' ? 'text-emerald-500' : 'text-accent'} track={0} />
        <PointerMarker
          x={fast === null ? rightNullCx : cxOf(fast)}
          label="fast"
          colorClass={status === 'met' ? 'text-emerald-500' : 'text-violet-500'}
          track={1}
        />
      </svg>

      <div className="font-mono text-xs tabular-nums text-ink-muted">
        {status === 'met' ? (
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            cycle detected — pointers met at node {slow}
          </span>
        ) : status === 'no-cycle' ? (
          <span className="font-semibold text-red-500">no cycle — the list terminates</span>
        ) : (
          <>
            slow @ node {slow} · fast @ {fast === null ? '∅' : `node ${fast}`}
          </>
        )}
      </div>
    </div>
  )
}

// ---------- component ----------

export default function LinkedListVisualizer() {
  const [mode, setMode] = useState<Mode>('reverse')
  const [values, setValues] = useState<number[]>([3, 7, 1, 9, 5])
  const [cycleTo, setCycleTo] = useState(2)

  // Clamp the cycle target if the list shrinks below it.
  const cyc = cycleTo < 0 ? -1 : Math.min(cycleTo, values.length - 1)
  const frames = useMemo<Frame<LLData>[]>(
    () => (mode === 'reverse' ? buildReverseFrames(values) : buildCycleFrames(values, cyc)),
    [mode, values, cyc],
  )
  const resetKey = `${mode}|${values.join(',')}|${cyc}`

  return (
    <div>
      <VizInputRow>
        <VizSelect
          label="Mode"
          value={mode}
          options={[
            { value: 'reverse', label: 'Reverse list' },
            { value: 'cycle', label: 'Detect cycle (fast & slow)' },
          ]}
          onChange={setMode}
        />
        <VizTextInput
          label="Values"
          defaultValue={values.join(', ')}
          hint="2–8 comma-separated integers"
          onParsed={(raw) => {
            const parsed = parseIntList(raw, { min: -99, max: 999, maxLen: 8 })
            if (parsed && parsed.length >= 2) {
              setValues(parsed)
              return true
            }
            return false
          }}
        />
        {mode === 'cycle' && (
          <VizTextInput
            label="Cycle to index"
            defaultValue={String(cycleTo)}
            hint="Tail links back to this index (−1 = no cycle)"
            onParsed={(raw) => {
              const parsed = parseIntList(raw, { min: -1, max: 7, maxLen: 1 })
              if (parsed) {
                setCycleTo(parsed[0])
                return true
              }
              return false
            }}
          />
        )}
      </VizInputRow>
      <StepPlayer
        frames={frames}
        pseudocode={mode === 'reverse' ? REVERSE_CODE : CYCLE_CODE}
        resetKey={resetKey}
        renderFrame={(f) => (f.data.kind === 'reverse' ? <ReverseFrame data={f.data} /> : <CycleFrame data={f.data} />)}
      />
    </div>
  )
}
