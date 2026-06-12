/**
 * Heap visualizer: a min-heap shown as array and tree side by side.
 * Values are inserted one-by-one (animated sift-up), then popped N times
 * (animated sift-down), with the compared/swapped pair highlighted in
 * both views simultaneously.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { frame, parseIntList, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizSelect, VizTextInput } from '../inputs'

interface HeapNode {
  /** Stable identity (insertion order) so both views animate the same chip. */
  id: number
  value: number
}

type Kind = 'none' | 'insert' | 'compare' | 'swap' | 'settled' | 'pop' | 'done'

interface HeapData {
  heap: HeapNode[]
  /** Indices currently highlighted (a compared/swapped pair, or one slot). */
  active: number[]
  kind: Kind
  popped: number[]
  /** Current operation badge, e.g. "insert 4" or "pop #2". */
  opLabel: string
}

const PSEUDOCODE = [
  'def insert(v):',
  '    heap.append(v); i = last',
  '    while i > 0 and heap[i] < heap[par(i)]:',
  '        swap(i, par(i)); i = par(i)',
  '',
  'def pop():',
  '    min = heap[0]',
  '    heap[0] = heap.pop(); i = 0',
  '    while smaller_child(i) < heap[i]:',
  '        swap(i, child); i = child',
  '    return min',
]

export function buildFrames(values: number[], pops: number): Frame<HeapData>[] {
  const frames: Frame<HeapData>[] = []
  const heap: HeapNode[] = []
  const popped: number[] = []
  const popCount = Math.min(pops, values.length)

  const snap = (active: number[], kind: Kind, opLabel: string, caption: string, codeLine: number) => {
    frames.push(
      frame(
        { heap: heap.map((n) => ({ ...n })), active: [...active], kind, popped: [...popped], opLabel },
        caption,
        codeLine,
      ),
    )
  }

  snap(
    [],
    'none',
    '',
    `Start with an empty min-heap. Insert ${values.join(', ')}${
      popCount ? `, then pop ${popCount} time${popCount === 1 ? '' : 's'}` : ''
    }.`,
    1,
  )

  values.forEach((v, id) => {
    const op = `insert ${v}`
    heap.push({ id, value: v })
    let i = heap.length - 1
    snap(
      [i],
      'insert',
      op,
      i === 0
        ? `${op}: the heap is empty, so ${v} becomes the root.`
        : `${op}: append ${v} at index ${i} — the next free slot, bottom of the tree — then sift up.`,
      2,
    )
    let swapped = false
    while (i > 0) {
      const p = (i - 1) >> 1
      const child = heap[i].value
      const parent = heap[p].value
      if (child < parent) {
        snap(
          [i, p],
          'compare',
          op,
          `Compare ${child} (index ${i}) with its parent ${parent} (index ${p}): ${child} < ${parent} breaks min-heap order — swap.`,
          3,
        )
        ;[heap[i], heap[p]] = [heap[p], heap[i]]
        snap([p, i], 'swap', op, `Swap: ${child} bubbles up to index ${p}, ${parent} sinks to index ${i}.`, 4)
        i = p
        swapped = true
      } else {
        snap(
          [i, p],
          'compare',
          op,
          `Compare ${child} (index ${i}) with its parent ${parent} (index ${p}): ${child} ≥ ${parent}, order holds — sift-up stops.`,
          3,
        )
        break
      }
    }
    if (i === 0 && swapped) {
      snap([0], 'settled', op, `${v} reached the root — it is the new minimum.`, 3)
    }
  })

  for (let k = 1; k <= popCount; k++) {
    const op = `pop #${k}`
    const rootVal = heap[0].value
    snap([0], 'pop', op, `${op}: in a min-heap the root is always the minimum — ${rootVal} comes out.`, 7)
    popped.push(rootVal)
    if (heap.length === 1) {
      heap.pop()
      snap([], 'done', op, `${op} returns ${rootVal}. That was the last element — the heap is now empty.`, 11)
      continue
    }
    const lastIdx = heap.length - 1
    const moved = heap.pop()!
    heap[0] = moved
    snap(
      [0],
      'insert',
      op,
      `Fill the hole: move the last element ${moved.value} (index ${lastIdx}) to the root; size shrinks to ${heap.length}. Now sift down.`,
      8,
    )
    let i = 0
    for (;;) {
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l >= heap.length) {
        snap([i], 'settled', op, `${heap[i].value} (index ${i}) has no children — sift-down stops.`, 9)
        break
      }
      const c = r < heap.length && heap[r].value < heap[l].value ? r : l
      const childVal = heap[c].value
      const curVal = heap[i].value
      const pick =
        r < heap.length
          ? `Children of ${curVal} are ${heap[l].value} and ${heap[r].value}; the smaller is ${childVal} (index ${c})`
          : `The only child of ${curVal} is ${childVal} (index ${c})`
      if (childVal < curVal) {
        snap([i, c], 'compare', op, `${pick}. ${childVal} < ${curVal} — swap.`, 9)
        ;[heap[i], heap[c]] = [heap[c], heap[i]]
        snap([i, c], 'swap', op, `Swap: ${childVal} rises to index ${i}, ${curVal} sinks to index ${c}.`, 10)
        i = c
      } else {
        snap([i, c], 'compare', op, `${pick}. ${curVal} ≤ ${childVal}, order holds — sift-down stops.`, 9)
        break
      }
    }
    snap([], 'done', op, `${op} returns ${rootVal}. Popped so far: ${popped.join(', ')} — always ascending.`, 11)
  }

  const finalCaption = popCount
    ? heap.length === 0
      ? `Done. Every value popped in sorted order: ${popped.join(', ')} — that is heapsort.`
      : `Done. The heap still holds ${heap.length} value${heap.length === 1 ? '' : 's'}; pops came out ascending: ${popped.join(', ')}.`
    : `Done. All ${values.length} values inserted — every parent ≤ its children.`
  snap([], 'done', '', finalCaption, popCount ? 11 : 3)
  return frames
}

// ---------- rendering ----------

const CELL_CLS: Record<Kind, string> = {
  none: 'border-edge bg-surface-sunken',
  done: 'border-edge bg-surface-sunken',
  insert: 'border-accent bg-accent/10 font-semibold',
  compare: 'border-amber-500 bg-amber-500/15 font-semibold text-amber-600 dark:text-amber-400',
  swap: 'border-violet-500 bg-violet-500/15 font-semibold text-violet-600 dark:text-violet-400',
  settled: 'border-emerald-500 bg-emerald-500/15 font-semibold text-emerald-600 dark:text-emerald-400',
  pop: 'border-red-500 bg-red-500/15 font-semibold text-red-600 dark:text-red-400',
}

const NODE_CLS: Record<Kind, string> = {
  none: 'fill-surface-sunken stroke-edge',
  done: 'fill-surface-sunken stroke-edge',
  insert: 'fill-accent/10 stroke-accent',
  compare: 'fill-amber-500/15 stroke-amber-500',
  swap: 'fill-violet-500/15 stroke-violet-500',
  settled: 'fill-emerald-500/15 stroke-emerald-500',
  pop: 'fill-red-500/15 stroke-red-500',
}

const R = 16
const V_GAP = 62
const PAD_X = 10
const PAD_TOP = 24
const SPRING = { type: 'spring', stiffness: 350, damping: 28 } as const

function HeapFrame({ data, maxSize }: { data: HeapData; maxSize: number }) {
  const { heap, active, kind, popped, opLabel } = data

  const levels = Math.max(1, Math.ceil(Math.log2(maxSize + 1)))
  const innerW = 2 ** (levels - 1) * 66
  const W = innerW + PAD_X * 2
  const H = PAD_TOP + (levels - 1) * V_GAP + R + 14

  const posOf = (i: number) => {
    const level = Math.floor(Math.log2(i + 1))
    const j = i - (2 ** level - 1)
    return { x: PAD_X + ((j + 0.5) * innerW) / 2 ** level, y: PAD_TOP + level * V_GAP }
  }
  const stateOf = (i: number): Kind => (active.includes(i) ? kind : 'none')
  const pairActive = (i: number, p: number) =>
    active.includes(i) && active.includes(p) && (kind === 'compare' || kind === 'swap')

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-1">
      <div className="flex h-6 items-center">
        <AnimatePresence initial={false}>
          {opLabel && (
            <motion.span
              key={opLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md bg-accent/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-accent"
            >
              {opLabel}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap items-start justify-center gap-x-10 gap-y-5">
        {/* tree view */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Tree</div>
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="max-w-full overflow-visible">
            <AnimatePresence initial={false}>
              {heap.map((_, i) => {
                if (i === 0) return null
                const p = (i - 1) >> 1
                const a = posOf(p)
                const b = posOf(i)
                const hot = pairActive(i, p)
                return (
                  <motion.line
                    key={`edge-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    strokeWidth={hot ? 2 : 1.5}
                    className={hot ? (kind === 'swap' ? 'stroke-violet-500' : 'stroke-amber-500') : 'stroke-edge'}
                  />
                )
              })}
            </AnimatePresence>
            <AnimatePresence initial={false}>
              {heap.map((node, i) => {
                const pos = posOf(i)
                const s = stateOf(i)
                return (
                  <motion.g
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.4, x: pos.x, y: pos.y }}
                    animate={{ opacity: 1, scale: 1, x: pos.x, y: pos.y }}
                    exit={{ opacity: 0, scale: 0.4 }}
                    transition={SPRING}
                  >
                    <circle r={R} strokeWidth={1.5} className={NODE_CLS[s]} />
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      className={`fill-ink font-mono text-[11px] ${s !== 'none' ? 'font-semibold' : ''}`}
                    >
                      {node.value}
                    </text>
                  </motion.g>
                )
              })}
            </AnimatePresence>
            {heap.length === 0 && (
              <text x={W / 2} y={H / 2} textAnchor="middle" className="fill-ink-faint text-[11px]">
                empty
              </text>
            )}
          </svg>
        </div>

        {/* array view + popped tray */}
        <div className="flex flex-col items-center gap-3 pt-1">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Array</div>
          <div className="flex flex-col items-center gap-1">
            <div className="flex min-h-[40px] gap-1.5">
              {heap.length === 0 && (
                <div className="flex h-10 items-center font-mono text-xs text-ink-faint">[ empty ]</div>
              )}
              <AnimatePresence initial={false} mode="popLayout">
                {heap.map((node, i) => (
                  <motion.div
                    layout
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: active.includes(i) ? 1.08 : 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={SPRING}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-sm tabular-nums ${CELL_CLS[stateOf(i)]}`}
                  >
                    {node.value}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="flex gap-1.5">
              {heap.map((_, i) => (
                <div key={i} className="w-10 text-center font-mono text-[10px] text-ink-faint">
                  {i}
                </div>
              ))}
            </div>
          </div>
          <div className="flex min-h-[28px] items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">popped</span>
            {popped.length === 0 ? (
              <span className="font-mono text-xs text-ink-faint">—</span>
            ) : (
              <AnimatePresence initial={false}>
                {popped.map((v, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex h-7 min-w-7 items-center justify-center rounded-md border border-emerald-500/50 bg-emerald-500/10 px-1.5 font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
                  >
                    {v}
                  </motion.span>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-ink-faint">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-amber-500 bg-amber-500/20" /> compare
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-violet-500 bg-violet-500/20" /> swap
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-red-500 bg-red-500/20" /> pop min
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-emerald-500 bg-emerald-500/20" /> settled
        </span>
      </div>
    </div>
  )
}

const POP_OPTIONS = ['0', '1', '2', '3', '4', '5', '6', '7'] as const
type PopCount = (typeof POP_OPTIONS)[number]

export default function HeapVisualizer() {
  const [values, setValues] = useState<number[]>([9, 4, 7, 1, 6, 3])
  const [pops, setPops] = useState<PopCount>('3')

  const frames = useMemo(() => buildFrames(values, Number(pops)), [values, pops])
  const resetKey = `${values.join(',')}|${pops}`

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="Values to insert"
          defaultValue={values.join(', ')}
          hint="Comma-separated integers, inserted one by one (max 7)"
          onParsed={(raw) => {
            const parsed = parseIntList(raw, { min: -99, max: 999, maxLen: 7 })
            if (parsed && parsed.length >= 1) {
              setValues(parsed)
              return true
            }
            return false
          }}
        />
        <VizSelect
          label="Pops after inserts"
          value={pops}
          options={POP_OPTIONS.map((v) => ({ value: v, label: v }))}
          onChange={setPops}
        />
      </VizInputRow>
      <StepPlayer
        frames={frames}
        pseudocode={PSEUDOCODE}
        resetKey={resetKey}
        renderFrame={(f) => <HeapFrame data={f.data} maxSize={values.length} />}
      />
    </div>
  )
}
