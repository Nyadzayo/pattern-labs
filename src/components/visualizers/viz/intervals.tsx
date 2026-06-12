/**
 * Merge Intervals visualizer: sort by start, then sweep left→right keeping a
 * working bar `cur`; each interval either extends cur's right edge (overlap)
 * or commits cur and starts fresh (gap). Editable input → pure buildFrames →
 * <StepPlayer>, following the two-pointers exemplar.
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

interface MergedBar {
  start: number
  end: number
}

interface CurBar {
  start: number
  end: number
  /** Increments per fresh cur so AnimatePresence treats it as a new bar. */
  key: number
}

type Phase =
  | 'input'
  | 'sorted'
  | 'start'
  | 'test-overlap'
  | 'test-gap'
  | 'extend'
  | 'commit'
  | 'newcur'
  | 'done'

interface IVData {
  /** Intervals in display order (original first, sorted afterwards). */
  items: Item[]
  /** Interval currently being examined. */
  activeId: number | null
  /** Intervals already absorbed into cur/merged — rendered dimmed. */
  processedIds: number[]
  /** The growing working bar. */
  cur: CurBar | null
  /** Committed bars in the result lane. */
  merged: MergedBar[]
  phase: Phase
  /** Short formula shown under the timeline, e.g. "8 > 6 → gap". */
  note: string | null
  noteTone: 'ok' | 'warn' | 'plain'
}

const PSEUDOCODE = [
  'sort intervals by start',
  'merged = []',
  'cur = intervals[0]',
  'for (s, e) in intervals[1:]:',
  '    if s <= cur.end:        # overlap',
  '        cur.end = max(cur.end, e)',
  '    else:                   # gap',
  '        merged.append(cur)',
  '        cur = (s, e)',
  'merged.append(cur)',
]

const fmt = (s: number, e: number) => `[${s}–${e}]`
const list = (xs: { start: number; end: number }[]) => xs.map((x) => fmt(x.start, x.end)).join(', ')

function buildFrames(raw: [number, number][]): Frame<IVData>[] {
  const original: Item[] = raw.map(([start, end], id) => ({ id, start, end }))
  const sorted = [...original].sort((a, b) => a.start - b.start || a.end - b.end)
  const frames: Frame<IVData>[] = []

  const processed: number[] = []
  const merged: MergedBar[] = []

  const push = (
    items: Item[],
    activeId: number | null,
    curSnap: CurBar | null,
    phase: Phase,
    caption: string,
    codeLine: number,
    note: string | null = null,
    noteTone: IVData['noteTone'] = 'plain',
  ) => {
    frames.push(
      frame(
        {
          items,
          activeId,
          processedIds: [...processed],
          cur: curSnap ? { ...curSnap } : null,
          merged: merged.map((m) => ({ ...m })),
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
    original.length === 1
      ? `Input: ${list(original)} — a single interval, so sorting is trivial.`
      : `Input: ${list(original)}. First, sort by start so any overlapping intervals become neighbors.`,
    1,
  )
  push(
    sorted,
    null,
    null,
    'sorted',
    alreadySorted ? `Already sorted by start: ${list(sorted)}.` : `Sorted by start: ${list(sorted)}.`,
    1,
  )

  let cur: CurBar = { start: sorted[0].start, end: sorted[0].end, key: 0 }
  processed.push(sorted[0].id)
  push(
    sorted,
    sorted[0].id,
    cur,
    'start',
    `merged starts empty; take the first interval as the working bar: cur = ${fmt(cur.start, cur.end)}.`,
    3,
  )

  for (let i = 1; i < sorted.length; i++) {
    const it = sorted[i]
    if (it.start <= cur.end) {
      push(
        sorted,
        it.id,
        cur,
        'test-overlap',
        `Test ${fmt(it.start, it.end)}: start ${it.start} ≤ ${cur.end} (cur.end) → it overlaps cur ${fmt(cur.start, cur.end)}.`,
        5,
        `${it.start} ≤ ${cur.end} → overlap`,
        'ok',
      )
      const oldEnd = cur.end
      cur = { ...cur, end: Math.max(cur.end, it.end) }
      processed.push(it.id)
      push(
        sorted,
        it.id,
        cur,
        'extend',
        cur.end === oldEnd
          ? `cur.end = max(${oldEnd}, ${it.end}) = ${cur.end} — ${fmt(it.start, it.end)} sits entirely inside, so cur stays ${fmt(cur.start, cur.end)}.`
          : `cur.end = max(${oldEnd}, ${it.end}) = ${cur.end} — cur's right edge grows to ${fmt(cur.start, cur.end)}.`,
        6,
        `cur.end = max(${oldEnd}, ${it.end}) = ${cur.end}`,
        'ok',
      )
    } else {
      push(
        sorted,
        it.id,
        cur,
        'test-gap',
        `Test ${fmt(it.start, it.end)}: start ${it.start} > ${cur.end} (cur.end) → a gap, no overlap with cur ${fmt(cur.start, cur.end)}.`,
        5,
        `${it.start} > ${cur.end} → gap`,
        'warn',
      )
      merged.push({ start: cur.start, end: cur.end })
      push(
        sorted,
        it.id,
        null,
        'commit',
        `Commit ${fmt(cur.start, cur.end)} to the result — later intervals start at ${it.start} or beyond, so none can reach back into it.`,
        8,
      )
      cur = { start: it.start, end: it.end, key: cur.key + 1 }
      processed.push(it.id)
      push(sorted, it.id, cur, 'newcur', `Start a fresh working bar: cur = ${fmt(cur.start, cur.end)}.`, 9)
    }
  }

  merged.push({ start: cur.start, end: cur.end })
  push(
    sorted,
    null,
    null,
    'done',
    `End of list — commit the last working bar ${fmt(cur.start, cur.end)}. Merged result: ${list(merged)}.`,
    10,
    `merged = ${list(merged)}`,
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

function IVFrame({ data }: { data: IVData }) {
  const { items, activeId, processedIds, cur, merged, phase, note, noteTone } = data
  const minV = Math.min(...items.map((i) => i.start))
  const maxV = Math.max(...items.map((i) => i.end))
  const span = Math.max(maxV - minV, 1)
  const pct = (v: number) => ((v - minV) / span) * 100
  const widthPct = (s: number, e: number) => Math.max(pct(e) - pct(s), 0)
  const ticks = buildTicks(minV, maxV)
  const testing = phase === 'test-overlap' || phase === 'test-gap'

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

          {/* frontier marker at cur.end — the value the overlap test compares against */}
          <AnimatePresence>
            {cur && (
              <motion.div
                key="frontier"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, left: `${pct(cur.end)}%` }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-y-0 z-10 w-0 border-l-2 border-dashed border-accent/60"
              />
            )}
          </AnimatePresence>

          {/* input lanes, one interval per lane, reorder animates on sort */}
          <div className="flex flex-col gap-1.5">
            {items.map((item) => {
              const active = item.id === activeId
              const done = processedIds.includes(item.id)
              const tone =
                active && (phase === 'test-overlap' || phase === 'extend')
                  ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : active && (phase === 'test-gap' || phase === 'commit')
                    ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : active
                      ? 'border-accent bg-accent/15 text-ink'
                      : 'border-edge bg-surface-sunken text-ink-muted'
              return (
                <motion.div layout key={item.id} className="relative h-7" transition={{ duration: 0.35 }}>
                  <motion.div
                    animate={{ opacity: done && !active ? 0.35 : 1, scale: active ? 1.04 : 1 }}
                    className={`absolute inset-y-0.5 flex items-center justify-center whitespace-nowrap rounded-md border px-1 font-mono text-[10px] tabular-nums ${tone} ${
                      active ? 'font-semibold' : ''
                    }`}
                    style={{ left: `${pct(item.start)}%`, width: `${widthPct(item.start, item.end)}%`, minWidth: 14 }}
                  >
                    {item.start}–{item.end}
                  </motion.div>
                </motion.div>
              )
            })}
          </div>

          {/* result lane */}
          <div className="mt-2 border-t border-dashed border-edge pt-1">
            <span className="relative z-10 bg-surface-raised pr-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              merged result
            </span>
            <div className="relative h-9">
              <AnimatePresence>
                {merged.map((m, i) => (
                  <motion.div
                    key={`m${i}`}
                    initial={{ opacity: 0, scaleY: 0.4 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-y-1 flex items-center justify-center whitespace-nowrap rounded-md border border-emerald-500 bg-emerald-500/15 px-1 font-mono text-[10px] font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
                    style={{ left: `${pct(m.start)}%`, width: `${widthPct(m.start, m.end)}%`, minWidth: 14 }}
                  >
                    {m.start}–{m.end}
                  </motion.div>
                ))}
                {cur && (
                  <motion.div
                    key={`cur${cur.key}`}
                    initial={{ opacity: 0, scaleY: 0.4 }}
                    animate={{ opacity: 1, scaleY: 1, width: `${widthPct(cur.start, cur.end)}%` }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-y-0.5 z-10 flex items-center justify-center whitespace-nowrap rounded-md border-2 border-accent bg-accent/20 px-1 font-mono text-[10px] font-bold tabular-nums text-ink ${
                      phase === 'extend' ? 'ring-2 ring-accent/40' : ''
                    }`}
                    style={{ left: `${pct(cur.start)}%`, minWidth: 14 }}
                  >
                    {cur.start}–{cur.end}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* overlap-test readout */}
        <div className="mt-3 h-5 text-center font-mono text-xs tabular-nums">
          {note ? (
            <span
              className={
                noteTone === 'ok'
                  ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                  : noteTone === 'warn'
                    ? 'font-semibold text-amber-600 dark:text-amber-400'
                    : 'text-ink-muted'
              }
            >
              {note}
            </span>
          ) : testing ? null : (
            <span className="text-ink-faint">—</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function IntervalsVisualizer() {
  const [intervals, setIntervals] = useState<[number, number][]>([
    [2, 6],
    [1, 4],
    [9, 12],
    [8, 10],
    [15, 18],
  ])

  const frames = useMemo(() => buildFrames(intervals), [intervals])
  const resetKey = intervals.map(([a, b]) => `${a}:${b}`).join(',')

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="Intervals"
          defaultValue={intervals.map(([a, b]) => `${a}-${b}`).join(', ')}
          hint="Comma-separated start-end pairs, e.g. 2-6, 1-4 (max 8, values 0–99)"
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
        renderFrame={(f) => <IVFrame data={f.data} />}
      />
    </div>
  )
}
