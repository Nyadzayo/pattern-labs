/**
 * Two Pointers visualizer: converging pointers finding a pair sum in a
 * sorted array. Canonical example of the step-engine pattern — editable
 * input → pure buildFrames → <StepPlayer>.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { frame, parseIntList, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizTextInput } from '../inputs'

interface TPData {
  array: number[]
  left: number
  right: number
  sum: number | null
  status: 'start' | 'searching' | 'found' | 'not-found'
}

const PSEUDOCODE = [
  'left, right = 0, len(a) - 1',
  'while left < right:',
  '    s = a[left] + a[right]',
  '    if s == target:',
  '        return left, right',
  '    elif s < target:',
  '        left += 1',
  '    else:',
  '        right -= 1',
  'return "no pair"',
]

function buildFrames(sorted: number[], target: number): Frame<TPData>[] {
  const frames: Frame<TPData>[] = []
  let left = 0
  let right = sorted.length - 1
  frames.push(
    frame(
      { array: sorted, left, right, sum: null, status: 'start' },
      `Start with left at index 0 and right at index ${right}. The array must be sorted for this to work.`,
      1,
      'Anchor a pointer at each end',
    ),
  )
  while (left < right) {
    const sum = sorted[left] + sorted[right]
    frames.push(
      frame(
        { array: sorted, left, right, sum, status: 'searching' },
        `a[${left}] + a[${right}] = ${sorted[left]} + ${sorted[right]} = ${sum}. Target is ${target}.`,
        3,
        'Walk inward, summing the two ends',
      ),
    )
    if (sum === target) {
      frames.push(
        frame(
          { array: sorted, left, right, sum, status: 'found' },
          `Found it: ${sorted[left]} + ${sorted[right]} = ${target}. Pair at indices ${left} and ${right}.`,
          5,
          'On an exact match, return the pair',
        ),
      )
      return frames
    }
    if (sum < target) {
      left++
      frames.push(
        frame(
          { array: sorted, left, right, sum, status: 'searching' },
          `${sum} < ${target}: the sum is too small, and only moving left rightward can increase it.`,
          7,
          'Sum too small — advance left',
        ),
      )
    } else {
      right--
      frames.push(
        frame(
          { array: sorted, left, right, sum, status: 'searching' },
          `${sum} > ${target}: the sum is too big, and only moving right leftward can decrease it.`,
          9,
          'Sum too big — retreat right',
        ),
      )
    }
  }
  frames.push(
    frame(
      { array: sorted, left, right, sum: null, status: 'not-found' },
      'Pointers met without hitting the target — no such pair exists.',
      10,
      'Pointers met — no pair',
    ),
  )
  return frames
}

function TPFrame({ data }: { data: TPData }) {
  const { array, left, right, sum, status } = data
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 py-4">
      <div className="flex gap-1.5">
        {array.map((v, i) => {
          const isLeft = i === left
          const isRight = i === right
          const active = isLeft || isRight
          const dead = i < left || i > right
          return (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <motion.div
                layout
                animate={{
                  scale: active ? 1.08 : 1,
                  opacity: dead && status !== 'found' ? 0.35 : 1,
                }}
                className={`flex h-11 w-11 items-center justify-center rounded-lg border font-mono text-sm tabular-nums ${
                  status === 'found' && active
                    ? 'border-emerald-500 bg-emerald-500/15 font-bold text-emerald-600 dark:text-emerald-400'
                    : active
                      ? 'border-accent bg-accent/10 font-semibold'
                      : 'border-edge bg-surface-sunken'
                }`}
              >
                {v}
              </motion.div>
              <div className="h-5 font-mono text-[11px] font-semibold">
                {isLeft && isRight ? (
                  <span className="text-accent">L·R</span>
                ) : isLeft ? (
                  <motion.span layoutId="tp-left" className="text-accent">
                    ▲ L
                  </motion.span>
                ) : isRight ? (
                  <motion.span layoutId="tp-right" className="text-violet-500">
                    ▲ R
                  </motion.span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
      <div className="font-mono text-sm tabular-nums text-ink-muted">
        {sum !== null ? (
          <>
            sum ={' '}
            <span
              className={
                status === 'found'
                  ? 'font-bold text-emerald-600 dark:text-emerald-400'
                  : 'font-semibold text-ink'
              }
            >
              {sum}
            </span>
          </>
        ) : status === 'not-found' ? (
          <span className="text-red-500">no pair found</span>
        ) : (
          '—'
        )}
      </div>
    </div>
  )
}

export default function TwoPointersVisualizer() {
  const [nums, setNums] = useState<number[]>([1, 3, 4, 6, 8, 11, 14, 17])
  const [target, setTarget] = useState(19)

  const sorted = useMemo(() => [...nums].sort((a, b) => a - b), [nums])
  const frames = useMemo(() => buildFrames(sorted, target), [sorted, target])
  const resetKey = `${sorted.join(',')}|${target}`

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="Sorted array"
          defaultValue={nums.join(', ')}
          hint="Comma-separated integers (auto-sorted, max 12)"
          onParsed={(raw) => {
            const parsed = parseIntList(raw, { min: -99, max: 999, maxLen: 12 })
            if (parsed && parsed.length >= 2) {
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
        renderFrame={(f) => <TPFrame data={f.data} />}
      />
    </div>
  )
}
