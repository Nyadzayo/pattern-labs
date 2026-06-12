/**
 * Sliding Window visualizer: longest substring without repeating
 * characters. The right edge expands one char per step; on a duplicate
 * the left edge contracts step by step until the window is valid again,
 * while the best window found so far is tracked underneath.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { frame, parseWord, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizTextInput } from '../inputs'

interface SWData {
  s: string
  left: number
  /** Inclusive right edge of the window; -1 = window still empty. */
  right: number
  /** Counts of characters currently inside the window. */
  freq: Record<string, number>
  bestLeft: number
  /** Inclusive; -1 = no best recorded yet. */
  bestRight: number
  /** The character currently violating uniqueness, if any. */
  dupChar: string | null
  status: 'start' | 'expand' | 'dup' | 'shrink' | 'keep' | 'best' | 'done'
}

const PSEUDOCODE = [
  'left = 0; best = ""',
  'freq = {}',
  'for right in range(len(s)):',
  '    c = s[right]; freq[c] += 1',
  '    while freq[c] > 1:',
  '        freq[s[left]] -= 1; left += 1',
  '    if right - left + 1 > len(best):',
  '        best = s[left:right+1]',
  'return best',
]

function buildFrames(s: string): Frame<SWData>[] {
  const frames: Frame<SWData>[] = []
  const freq: Record<string, number> = {}
  let left = 0
  let bestLeft = 0
  let bestRight = -1

  const snap = (right: number, status: SWData['status'], dupChar: string | null): SWData => ({
    s,
    left,
    right,
    freq: { ...freq },
    bestLeft,
    bestRight,
    dupChar,
    status,
  })

  frames.push(
    frame(
      snap(-1, 'start', null),
      `Start with an empty window at left = 0 and an empty count map. Scanning "${s}" (${s.length} chars).`,
      1,
    ),
  )

  for (let right = 0; right < s.length; right++) {
    const c = s[right]
    freq[c] = (freq[c] ?? 0) + 1
    const isDup = freq[c] > 1
    frames.push(
      frame(
        snap(right, 'expand', isDup ? c : null),
        isDup
          ? `'${c}' enters at index ${right} — but '${c}' is already inside the window: its count jumps to ${freq[c]}.`
          : `'${c}' enters at index ${right} — window "${s.slice(left, right + 1)}" still has no repeats (count of '${c}' is 1).`,
        4,
      ),
    )

    if (isDup) {
      frames.push(
        frame(
          snap(right, 'dup', c),
          `count['${c}'] = ${freq[c]} > 1 — contract from the left until '${c}' appears only once.`,
          5,
        ),
      )
      while (freq[c] > 1) {
        const out = s[left]
        freq[out] -= 1
        left += 1
        const stillDup = freq[c] > 1
        const outNote =
          freq[out] === 0 ? `'${out}' leaves the map` : `count['${out}'] is now ${freq[out]}`
        frames.push(
          frame(
            snap(right, 'shrink', stillDup ? c : null),
            `Drop '${out}' at index ${left - 1}; left moves to ${left}. ${outNote}${
              stillDup
                ? ` — '${c}' is still duplicated.`
                : ` — window "${s.slice(left, right + 1)}" is valid again.`
            }`,
            6,
          ),
        )
      }
    }

    const len = right - left + 1
    const bestLen = bestRight - bestLeft + 1
    if (len > bestLen) {
      bestLeft = left
      bestRight = right
      frames.push(
        frame(
          snap(right, 'best', null),
          `Window "${s.slice(left, right + 1)}" (indices ${left}–${right}) has length ${len} > ${bestLen} — new best.`,
          8,
        ),
      )
    } else {
      frames.push(
        frame(
          snap(right, 'keep', null),
          `Window "${s.slice(left, right + 1)}" has length ${len}, not better than best "${s.slice(bestLeft, bestRight + 1)}" (${bestLen}).`,
          7,
        ),
      )
    }
  }

  frames.push(
    frame(
      snap(s.length - 1, 'done', null),
      `Scan complete — longest substring without repeating characters is "${s.slice(bestLeft, bestRight + 1)}" (length ${bestRight - bestLeft + 1}).`,
      9,
    ),
  )
  return frames
}

const CELL = 32 // px, matches w-8
const GAP = 4 // px, matches gap-1
const STRIDE = CELL + GAP

function SWFrame({ data }: { data: SWData }) {
  const { s, left, right, freq, bestLeft, bestRight, dupChar, status } = data
  const chars = s.split('')
  const rowWidth = chars.length * STRIDE - GAP
  const hasWindow = right >= left
  const hasBest = bestRight >= bestLeft
  const winLen = hasWindow ? right - left + 1 : 0
  const bestStr = hasBest ? s.slice(bestLeft, bestRight + 1) : ''
  const counts = Object.keys(freq)
    .filter((k) => freq[k] > 0)
    .sort()

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-4">
      {/* character cells with sliding window band + best underline */}
      <div className="max-w-full overflow-x-auto px-1 pb-1">
        <div className="relative" style={{ width: rowWidth }}>
          <motion.div
            initial={false}
            animate={{
              x: (hasWindow ? left : 0) * STRIDE,
              width: Math.max(winLen, 1) * STRIDE - GAP,
              opacity: hasWindow ? 1 : 0,
            }}
            className="absolute top-0 h-10 rounded-lg border border-accent/50 bg-accent/10"
          />
          <div className="relative flex gap-1">
            {chars.map((ch, i) => {
              const inWin = hasWindow && i >= left && i <= right
              const isEntering = status === 'expand' && i === right
              const isDup = dupChar !== null && inWin && ch === dupChar
              const inBest = status === 'done' && hasBest && i >= bestLeft && i <= bestRight
              const opacity =
                status === 'done' ? (inBest ? 1 : 0.35) : inWin ? 1 : i < left ? 0.35 : 0.55
              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{ opacity, scale: isEntering ? 1.1 : isDup ? 1.05 : 1 }}
                  className={`flex h-10 w-8 items-center justify-center rounded-lg border font-mono text-sm ${
                    inBest
                      ? 'border-emerald-500 bg-emerald-500/15 font-bold text-emerald-600 dark:text-emerald-400'
                      : isDup
                        ? 'border-red-500/70 bg-red-500/10 font-semibold text-red-600 dark:text-red-400'
                        : isEntering
                          ? 'border-accent bg-transparent font-semibold text-ink'
                          : inWin
                            ? 'border-accent/40 bg-transparent text-ink'
                            : 'border-edge bg-surface-sunken text-ink-muted'
                  }`}
                >
                  {ch}
                </motion.div>
              )
            })}
          </div>
          {/* best-so-far underline */}
          <div className="relative mt-1 h-1">
            <motion.div
              initial={false}
              animate={{
                x: bestLeft * STRIDE,
                width: Math.max(bestRight - bestLeft + 1, 1) * STRIDE - GAP,
                opacity: hasBest ? 1 : 0,
              }}
              className="absolute h-1 rounded-full bg-emerald-500/80"
            />
          </div>
          {/* L / R markers */}
          <div className="mt-0.5 flex gap-1">
            {chars.map((_, i) => (
              <div
                key={i}
                className="flex h-5 w-8 items-start justify-center font-mono text-[11px] font-semibold"
              >
                {hasWindow && i === left && i === right ? (
                  <span className="text-accent">L·R</span>
                ) : i === left ? (
                  <motion.span layoutId="sw-left" className="text-accent">
                    ▲L
                  </motion.span>
                ) : hasWindow && i === right ? (
                  <motion.span layoutId="sw-right" className="text-violet-500">
                    ▲R
                  </motion.span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* live frequency map of the window */}
      <div className="flex min-h-[30px] max-w-full flex-wrap items-center justify-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          in window
        </span>
        <AnimatePresence mode="popLayout">
          {counts.map((ch) => (
            <motion.span
              key={ch}
              layout
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={`rounded-md border px-1.5 py-0.5 font-mono text-xs tabular-nums ${
                freq[ch] > 1
                  ? 'border-red-500/60 bg-red-500/10 font-semibold text-red-600 dark:text-red-400'
                  : 'border-edge bg-surface-sunken text-ink'
              }`}
            >
              {ch}
              <span className="text-ink-faint">:</span>
              {freq[ch]}
            </motion.span>
          ))}
        </AnimatePresence>
        {counts.length === 0 && <span className="font-mono text-xs text-ink-faint">(empty)</span>}
      </div>

      {/* window / best readout */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 font-mono text-sm tabular-nums text-ink-muted">
        <span>
          window ={' '}
          {hasWindow ? (
            <>
              <span className="font-semibold text-ink">“{s.slice(left, right + 1)}”</span>{' '}
              <span className="text-ink-faint">len {winLen}</span>
            </>
          ) : (
            '—'
          )}
        </span>
        <span>
          best ={' '}
          {hasBest ? (
            <>
              <span
                className={`text-emerald-600 dark:text-emerald-400 ${
                  status === 'best' || status === 'done' ? 'font-bold' : 'font-semibold'
                }`}
              >
                “{bestStr}”
              </span>{' '}
              <span className="text-ink-faint">len {bestStr.length}</span>
            </>
          ) : (
            '—'
          )}
        </span>
      </div>
    </div>
  )
}

export default function SlidingWindowVisualizer() {
  const [word, setWord] = useState('abcabcbb')

  const frames = useMemo(() => buildFrames(word), [word])
  const resetKey = word

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="String"
          defaultValue={word}
          placeholder="abcabcbb"
          hint="Letters only, max 20 characters"
          onParsed={(raw) => {
            const parsed = parseWord(raw, 20)
            if (parsed) {
              setWord(parsed)
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
        renderFrame={(f) => <SWFrame data={f.data} />}
      />
    </div>
  )
}
