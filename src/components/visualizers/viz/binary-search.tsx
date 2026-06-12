/**
 * Binary Search visualizer: repeatedly halving a sorted array's search
 * window to locate a target. Follows the step-engine pattern — editable
 * input → pure buildFrames → <StepPlayer>.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { frame, parseIntList, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizTextInput } from '../inputs'

interface BSData {
  array: number[]
  lo: number
  hi: number
  /** Index last probed; stays on the old mid during a discard frame. */
  mid: number | null
  status: 'start' | 'probe' | 'discard' | 'found' | 'not-found'
}

const PSEUDOCODE = [
  'lo, hi = 0, len(a) - 1',
  'while lo <= hi:',
  '    mid = (lo + hi) // 2',
  '    if a[mid] == target:',
  '        return mid',
  '    elif a[mid] < target:',
  '        lo = mid + 1',
  '    else:',
  '        hi = mid - 1',
  'return "not present"',
]

function buildFrames(sorted: number[], target: number): Frame<BSData>[] {
  const frames: Frame<BSData>[] = []
  const n = sorted.length
  let lo = 0
  let hi = n - 1
  frames.push(
    frame(
      { array: sorted, lo, hi, mid: null, status: 'start' },
      `Searching for ${target}. lo = 0, hi = ${hi} — all ${n} sorted element${n === 1 ? ' is' : 's are'} in play.`,
      1,
    ),
  )
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const v = sorted[mid]
    frames.push(
      frame(
        { array: sorted, lo, hi, mid, status: 'probe' },
        `mid = (${lo} + ${hi}) // 2 = ${mid}. Probe a[${mid}] = ${v} against target ${target}.`,
        3,
      ),
    )
    if (v === target) {
      frames.push(
        frame(
          { array: sorted, lo, hi, mid, status: 'found' },
          `a[${mid}] = ${v} equals the target ${target} — found at index ${mid}.`,
          5,
        ),
      )
      return frames
    }
    if (v < target) {
      const oldLo = lo
      lo = mid + 1
      frames.push(
        frame(
          { array: sorted, lo, hi, mid, status: 'discard' },
          `a[${mid}] = ${v} < ${target}, and the array is sorted — every value at index ≤ ${mid} is also too small. Discard indices ${oldLo}–${mid}; lo = ${mid + 1}.`,
          7,
        ),
      )
    } else {
      const oldHi = hi
      hi = mid - 1
      frames.push(
        frame(
          { array: sorted, lo, hi, mid, status: 'discard' },
          `a[${mid}] = ${v} > ${target}, and the array is sorted — every value at index ≥ ${mid} is also too big. Discard indices ${mid}–${oldHi}; hi = ${mid - 1}.`,
          9,
        ),
      )
    }
  }
  frames.push(
    frame(
      { array: sorted, lo, hi, mid: null, status: 'not-found' },
      `lo (${lo}) has crossed hi (${hi}) — the window is empty, so ${target} is not present.`,
      10,
    ),
  )
  return frames
}

function BSFrame({ data, target }: { data: BSData; target: number }) {
  const { array, lo, hi, mid, status } = data
  const compact = array.length > 12
  const windowSize = Math.max(0, hi - lo + 1)
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-4">
      <div className="flex gap-1.5">
        {array.map((v, i) => {
          const isLo = i === lo
          const isHi = i === hi
          const isMid = mid !== null && i === mid
          const inWindow = i >= lo && i <= hi
          const isFound = status === 'found' && isMid
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <motion.div
                layout
                animate={{
                  scale: isMid ? 1.08 : 1,
                  opacity: inWindow || isFound ? 1 : 0.3,
                }}
                className={`flex items-center justify-center rounded-lg border font-mono tabular-nums ${
                  compact ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm'
                } ${
                  isFound
                    ? 'border-emerald-500 bg-emerald-500/15 font-bold text-emerald-600 dark:text-emerald-400'
                    : isMid
                      ? 'border-amber-500 bg-amber-500/15 font-semibold text-amber-600 dark:text-amber-400'
                      : 'border-edge bg-surface-sunken'
                }`}
              >
                {v}
              </motion.div>
              <div
                className={`flex h-10 flex-col items-center font-mono font-semibold leading-tight ${
                  compact ? 'text-[9px]' : 'text-[10px]'
                }`}
              >
                {isLo && (
                  <motion.span layoutId="bs-lo" className="text-accent">
                    ▲lo
                  </motion.span>
                )}
                {isMid && (
                  <motion.span layoutId="bs-mid" className="text-amber-500">
                    ▲mid
                  </motion.span>
                )}
                {isHi && (
                  <motion.span layoutId="bs-hi" className="text-violet-500">
                    ▲hi
                  </motion.span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div className="font-mono text-sm tabular-nums text-ink-muted">
        {status === 'found' && mid !== null ? (
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            found at index {mid}
          </span>
        ) : status === 'not-found' ? (
          <span className="font-semibold text-red-500">{target} not present</span>
        ) : (
          <>
            target = <span className="font-semibold text-ink">{target}</span>
            <span className="mx-2 text-ink-faint">·</span>
            window [{lo}..{hi}] holds {windowSize} of {array.length}
            {mid !== null && (
              <>
                <span className="mx-2 text-ink-faint">·</span>
                a[{mid}] ={' '}
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  {array[mid]}
                </span>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function BinarySearchVisualizer() {
  const [nums, setNums] = useState<number[]>([1, 3, 5, 7, 9, 11, 14, 17, 21, 25])
  const [target, setTarget] = useState(11)

  const sorted = useMemo(() => [...nums].sort((a, b) => a - b), [nums])
  const frames = useMemo(() => buildFrames(sorted, target), [sorted, target])
  const resetKey = `${sorted.join(',')}|${target}`

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="Sorted array"
          defaultValue={nums.join(', ')}
          hint="Comma-separated integers (auto-sorted, max 16)"
          onParsed={(raw) => {
            const parsed = parseIntList(raw, { min: -99, max: 999, maxLen: 16 })
            if (parsed && parsed.length >= 1) {
              setNums(parsed)
              return true
            }
            return false
          }}
        />
        <VizTextInput
          label="Target"
          defaultValue={String(target)}
          onParsed={(raw) => {
            const parsed = parseIntList(raw, { min: -999, max: 9999, maxLen: 1 })
            if (parsed) {
              setTarget(parsed[0])
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
        renderFrame={(f) => <BSFrame data={f.data} target={target} />}
      />
    </div>
  )
}
