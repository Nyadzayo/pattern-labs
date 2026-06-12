/**
 * Greedy Interval Scheduling visualizer: maximize non-overlapping meetings.
 * Sort by END time, then sweep — accept a meeting when it starts at or after
 * the last accepted meeting's end, otherwise skip it. Editable input → pure
 * buildFrames → <StepPlayer>, following the two-pointers exemplar.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { frame, parseIntervals, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizTextInput } from '../inputs'

interface Item {
  id: number
  start: number
  end: number
}

type Phase = 'input' | 'sorted' | 'init' | 'test' | 'accept' | 'frontier' | 'reject' | 'done'

interface GIData {
  /** Intervals in display order (original first, end-sorted afterwards). */
  items: Item[]
  /** Candidate currently being examined. */
  activeId: number | null
  /** Chosen bar that clashes with the current candidate — rendered flashing. */
  conflictId: number | null
  /** Accepted meetings (solid green) in pick order. */
  chosenIds: number[]
  /** Skipped meetings (dimmed red). */
  rejectedIds: number[]
  /** End of the most recently chosen meeting; null = -∞ (nothing chosen). */
  lastEnd: number | null
  count: number
  phase: Phase
  /** Short comparison shown under the timeline, e.g. "2 < 3 → overlaps". */
  note: string | null
  noteTone: 'ok' | 'bad' | 'plain'
}

const PSEUDOCODE = [
  'sort intervals by end time',
  'count, last_end = 0, -inf',
  'for (s, e) in intervals:',
  '    if s >= last_end:    # fits',
  '        count += 1',
  '        last_end = e',
  '    else:                # overlaps',
  '        skip (s, e)',
  'return count',
]

const fmt = (s: number, e: number) => `[${s}–${e}]`
const list = (xs: { start: number; end: number }[]) => xs.map((x) => fmt(x.start, x.end)).join(', ')

function buildFrames(raw: [number, number][]): Frame<GIData>[] {
  const original: Item[] = raw.map(([start, end], id) => ({ id, start, end }))
  const sorted = [...original].sort((a, b) => a.end - b.end || a.start - b.start)
  const frames: Frame<GIData>[] = []

  const chosen: number[] = []
  const rejected: number[] = []
  let count = 0
  let lastEnd: number | null = null
  let lastPick: Item | null = null

  const push = (
    items: Item[],
    activeId: number | null,
    conflictId: number | null,
    phase: Phase,
    caption: string,
    codeLine: number,
    note: string | null = null,
    noteTone: GIData['noteTone'] = 'plain',
  ) => {
    frames.push(
      frame(
        {
          items,
          activeId,
          conflictId,
          chosenIds: [...chosen],
          rejectedIds: [...rejected],
          lastEnd,
          count,
          phase,
          note,
          noteTone,
        },
        caption,
        codeLine,
      ),
    )
  }

  const alreadySorted = original.every((it, i) => it.id === sorted[i].id)
  push(
    original,
    null,
    null,
    'input',
    `Input: ${list(original)}. Goal: schedule as many non-overlapping meetings as possible — start by sorting by END time.`,
    1,
  )
  push(
    sorted,
    null,
    null,
    'sorted',
    alreadySorted
      ? `Already sorted by end time: ${list(sorted)}. The meeting that frees the room earliest comes first.`
      : `Sorted by end time: ${list(sorted)}. The meeting that frees the room earliest comes first.`,
    1,
  )
  push(
    sorted,
    null,
    null,
    'init',
    'count = 0, last_end = −∞ — the room is free from the very beginning.',
    2,
  )

  for (const it of sorted) {
    const fits = lastEnd === null || it.start >= lastEnd
    if (fits) {
      push(
        sorted,
        it.id,
        null,
        'test',
        lastEnd === null
          ? `Test ${fmt(it.start, it.end)}: nothing is chosen yet (last_end = −∞), so it trivially fits.`
          : `Test ${fmt(it.start, it.end)}: start ${it.start} ≥ ${lastEnd} (last_end) → it begins after the room frees up.`,
        4,
        lastEnd === null ? `${it.start} ≥ −∞ → fits` : `${it.start} ≥ ${lastEnd} → fits`,
        'ok',
      )
      chosen.push(it.id)
      count++
      push(
        sorted,
        it.id,
        null,
        'accept',
        lastEnd === null
          ? `Take ${fmt(it.start, it.end)} — it has the earliest end of all remaining meetings, so no other first pick could leave more room. count = ${count}.`
          : `Take ${fmt(it.start, it.end)} — of everything that fits after t = ${lastEnd}, it ends earliest, so greedy can never block a better schedule. count = ${count}.`,
        5,
        `count = ${count}`,
        'ok',
      )
      lastEnd = it.end
      lastPick = it
      push(
        sorted,
        it.id,
        null,
        'frontier',
        `last_end = ${it.end} — the room is busy until t = ${it.end}; every later pick must start at ${it.end} or after.`,
        6,
        `last_end = ${it.end}`,
        'plain',
      )
    } else {
      const clash = lastPick as Item
      push(
        sorted,
        it.id,
        clash.id,
        'test',
        `Test ${fmt(it.start, it.end)}: start ${it.start} < ${lastEnd} (last_end) → it overlaps the chosen ${fmt(clash.start, clash.end)}.`,
        4,
        `${it.start} < ${lastEnd} → overlaps`,
        'bad',
      )
      rejected.push(it.id)
      push(
        sorted,
        it.id,
        clash.id,
        'reject',
        `Skip ${fmt(it.start, it.end)}: it clashes with ${fmt(clash.start, clash.end)}, and since it ends at ${it.end} ≥ ${lastEnd}, swapping it in could never free the room earlier.`,
        8,
        `skip ${fmt(it.start, it.end)}`,
        'bad',
      )
    }
  }

  const picked = chosen.flatMap((id) => {
    const it = sorted.find((x) => x.id === id)
    return it ? [it] : []
  })
  push(
    sorted,
    null,
    null,
    'done',
    `Done — count = ${count}: kept ${list(picked)}${rejected.length ? `, skipped ${rejected.length} conflicting meeting${rejected.length > 1 ? 's' : ''}` : ', nothing had to be skipped'}.`,
    9,
    `count = ${count}`,
    'ok',
  )
  return frames
}

/** Nice integer tick positions for the numeric axis (≤ ~12 ticks). */
function buildTicks(minV: number, maxV: number): number[] {
  const span = Math.max(maxV - minV, 1)
  const step = [1, 2, 5, 10, 20, 25, 50].find((s) => span / s <= 12) ?? 100
  const ticks: number[] = []
  for (let t = Math.ceil(minV / step) * step; t <= maxV; t += step) ticks.push(t)
  return ticks
}

function GIFrame({ data }: { data: GIData }) {
  const { items, activeId, conflictId, chosenIds, rejectedIds, lastEnd, count, phase, note, noteTone } = data
  const minV = Math.min(...items.map((i) => i.start))
  const maxV = Math.max(...items.map((i) => i.end))
  const span = Math.max(maxV - minV, 1)
  const pct = (v: number) => ((v - minV) / span) * 100
  const widthPct = (s: number, e: number) => Math.max(pct(e) - pct(s), 0)
  const ticks = buildTicks(minV, maxV)
  const chosenItems = chosenIds.flatMap((id) => {
    const it = items.find((x) => x.id === id)
    return it ? [it] : []
  })

  return (
    <div className="flex h-full flex-col justify-center py-2">
      <div className="mx-auto w-full max-w-2xl px-3">
        {/* numeric axis */}
        <div className="relative mb-1 h-5">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 -translate-x-1/2 font-mono text-[10px] tabular-nums text-ink-faint"
              style={{ left: `${pct(t)}%` }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="relative">
          {/* gridlines */}
          <div className="pointer-events-none absolute inset-0">
            {ticks.map((t) => (
              <div key={t} className="absolute inset-y-0 w-px bg-edge/60" style={{ left: `${pct(t)}%` }} />
            ))}
          </div>

          {/* frontier marker at last_end — the value the fits-test compares against */}
          <AnimatePresence>
            {lastEnd !== null && (
              <motion.div
                key="frontier"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, left: `${pct(lastEnd)}%` }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-y-0 z-10 w-0 border-l-2 border-dashed border-accent/60"
              />
            )}
          </AnimatePresence>

          {/* candidate lanes, one interval per lane; reorder animates on sort */}
          <div className="flex flex-col gap-1.5">
            {items.map((item) => {
              const isChosen = chosenIds.includes(item.id)
              const isRejected = rejectedIds.includes(item.id)
              const active = item.id === activeId
              const conflict = item.id === conflictId
              const tone = isChosen
                ? `border-emerald-600 bg-emerald-500 font-semibold text-white ${
                    conflict ? 'ring-2 ring-amber-400/90' : ''
                  }`
                : isRejected
                  ? 'border-red-500/60 bg-red-500/10 text-red-500'
                  : active
                    ? 'border-accent bg-accent/15 font-semibold text-ink'
                    : 'border-edge bg-surface-sunken text-ink-muted'
              return (
                <motion.div layout key={item.id} className="relative h-7" transition={{ duration: 0.35 }}>
                  <motion.div
                    animate={{
                      opacity: isRejected ? 0.45 : 1,
                      scale: conflict ? [1, 1.08, 1] : active && !isRejected ? 1.04 : 1,
                    }}
                    className={`absolute inset-y-0.5 flex items-center justify-center whitespace-nowrap rounded-md border px-1 font-mono text-[10px] tabular-nums ${tone}`}
                    style={{ left: `${pct(item.start)}%`, width: `${widthPct(item.start, item.end)}%`, minWidth: 14 }}
                  >
                    {item.start}–{item.end}
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* tally: chosen meetings + running count + frontier value */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 font-mono text-xs tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="text-ink-faint">chosen:</span>
            {chosenItems.length === 0 && <span className="text-ink-faint">—</span>}
            <AnimatePresence>
              {chosenItems.map((c) => (
                <motion.span
                  key={c.id}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="rounded border border-emerald-500/60 bg-emerald-500/15 px-1.5 py-0.5 font-semibold text-emerald-600 dark:text-emerald-400"
                >
                  {c.start}–{c.end}
                </motion.span>
              ))}
            </AnimatePresence>
          </span>
          <span className="text-ink-muted">
            count ={' '}
            <span
              className={
                phase === 'done' ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-ink'
              }
            >
              {count}
            </span>
          </span>
          <span className="text-ink-muted">
            last_end = <span className="font-semibold text-ink">{lastEnd ?? '−∞'}</span>
          </span>
        </div>

        {/* fits-test readout */}
        <div className="mt-2 h-5 text-center font-mono text-xs tabular-nums">
          {note ? (
            <span
              className={
                noteTone === 'ok'
                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                  : noteTone === 'bad'
                    ? 'font-semibold text-red-500'
                    : 'text-ink-muted'
              }
            >
              {note}
            </span>
          ) : (
            <span className="text-ink-faint">—</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GreedyIntervalsVisualizer() {
  const [intervals, setIntervals] = useState<[number, number][]>([
    [1, 3],
    [2, 5],
    [4, 7],
    [6, 8],
  ])

  const frames = useMemo(() => buildFrames(intervals), [intervals])
  const resetKey = intervals.map(([a, b]) => `${a}:${b}`).join(',')

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="Meetings"
          defaultValue={intervals.map(([a, b]) => `${a}-${b}`).join(', ')}
          hint="Comma-separated start-end pairs, e.g. 1-3, 2-5 (max 8, values 0–99)"
          onParsed={(raw) => {
            const parsed = parseIntervals(raw, 8)
            if (parsed && parsed.every(([a, b]) => a >= 0 && b <= 99)) {
              setIntervals(parsed)
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
        renderFrame={(f) => <GIFrame data={f.data} />}
      />
    </div>
  )
}
