/**
 * Stack visualizer: bracket matching over ()[]{}<>. A cursor scans the
 * string; openers push onto a vertical stack, closers compare with the
 * top — match pops (green), mismatch fails (red), leftovers at the end
 * mean unbalanced. Editable input → pure buildFrames → <StepPlayer>.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { frame, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizTextInput } from '../inputs'

const OPENERS = '([{<'
const PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{', '>': '<' }
const MAX_LEN = 16

/** Only bracket characters, whitespace ignored, length 1..16. */
function parseBrackets(raw: string): string | null {
  const s = raw.replace(/\s+/g, '')
  if (!s || s.length > MAX_LEN) return null
  for (const ch of s) {
    if (!OPENERS.includes(ch) && !(ch in PAIRS)) return null
  }
  return s
}

interface StackItem {
  ch: string
  /** Index in the input string where this opener was read — stable key. */
  idx: number
}

type Status =
  | 'init'
  | 'push'
  | 'check-ok'
  | 'check-bad'
  | 'pop'
  | 'fail'
  | 'balanced'
  | 'unbalanced'

interface BracketData {
  s: string
  /** -1 before the scan starts, s.length once the scan is done. */
  cursor: number
  stack: StackItem[]
  status: Status
}

const PSEUDOCODE = [
  "pairs = {')':'(', ']':'[', '}':'{', '>':'<'}",
  'stack = []',
  'for ch in s:',
  '    if ch is an opener:',
  '        stack.push(ch)',
  '    elif stack and stack.top == pairs[ch]:',
  '        stack.pop()',
  '    else:',
  '        return False',
  'return stack is empty',
]

function buildFrames(s: string): Frame<BracketData>[] {
  const frames: Frame<BracketData>[] = []
  const stack: StackItem[] = []
  const snap = (cursor: number, status: Status): BracketData => ({
    s,
    cursor,
    stack: [...stack],
    status,
  })

  frames.push(
    frame(snap(-1, 'init'), `Scan "${s}" left to right, starting with an empty stack.`, 2),
  )

  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (OPENERS.includes(ch)) {
      stack.push({ ch, idx: i })
      frames.push(
        frame(
          snap(i, 'push'),
          `'${ch}' at index ${i} is an opener — push it. Stack depth is now ${stack.length}.`,
          5,
        ),
      )
      continue
    }
    const top = stack[stack.length - 1]
    if (!top) {
      frames.push(
        frame(
          snap(i, 'check-bad'),
          `'${ch}' at index ${i} is a closer, but the stack is empty — nothing to match it.`,
          6,
        ),
      )
      frames.push(
        frame(snap(i, 'fail'), `Unmatched '${ch}' — return False. The string is not balanced.`, 9),
      )
      return frames
    }
    if (top.ch === PAIRS[ch]) {
      frames.push(
        frame(
          snap(i, 'check-ok'),
          `'${ch}' at index ${i} is a closer — top of stack is '${top.ch}', and '${top.ch}${ch}' is a matching pair.`,
          6,
        ),
      )
      stack.pop()
      frames.push(
        frame(snap(i, 'pop'), `Pop '${top.ch}'. Stack depth is now ${stack.length}.`, 7),
      )
    } else {
      frames.push(
        frame(
          snap(i, 'check-bad'),
          `'${ch}' at index ${i} is a closer — top of stack is '${top.ch}', but '${ch}' needs '${PAIRS[ch]}'.`,
          6,
        ),
      )
      frames.push(
        frame(
          snap(i, 'fail'),
          `'${top.ch}' cannot be closed by '${ch}' — return False. Not balanced.`,
          9,
        ),
      )
      return frames
    }
  }

  if (stack.length === 0) {
    frames.push(
      frame(
        snap(s.length, 'balanced'),
        'Reached the end with an empty stack — every bracket found its partner. Balanced!',
        10,
      ),
    )
  } else {
    const leftovers = stack.map((it) => it.ch).join('')
    frames.push(
      frame(
        snap(s.length, 'unbalanced'),
        `Reached the end but ${stack.length} opener${stack.length > 1 ? 's' : ''} ('${leftovers}') never closed — not balanced.`,
        10,
      ),
    )
  }
  return frames
}

function BracketFrame({ data }: { data: BracketData }) {
  const { s, cursor, stack, status } = data
  const failed = status === 'check-bad' || status === 'fail'
  const matched = status === 'check-ok' || status === 'pop'
  const done = status === 'balanced' || status === 'unbalanced' || status === 'fail'

  return (
    <div className="flex h-full flex-col items-center gap-5 py-2">
      {/* Input string with scanning cursor */}
      <div className="flex gap-1.5">
        {s.split('').map((ch, i) => {
          const isCursor = i === cursor
          const consumed = i < cursor
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <motion.div
                layout
                animate={{ scale: isCursor ? 1.1 : 1, opacity: consumed && !done ? 0.45 : 1 }}
                className={`flex h-10 w-9 items-center justify-center rounded-lg border font-mono text-base ${
                  isCursor && matched
                    ? 'border-emerald-500 bg-emerald-500/15 font-bold text-emerald-600 dark:text-emerald-400'
                    : isCursor && failed
                      ? 'border-red-500 bg-red-500/15 font-bold text-red-600 dark:text-red-400'
                      : isCursor
                        ? 'border-accent bg-accent/10 font-semibold'
                        : status === 'balanced'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'border-edge bg-surface-sunken'
                }`}
              >
                {ch}
              </motion.div>
              <div className="h-4 font-mono text-[11px] font-semibold">
                {isCursor && (
                  <motion.span
                    layoutId="bracket-cursor"
                    className={failed ? 'text-red-500' : matched ? 'text-emerald-500' : 'text-accent'}
                  >
                    ▲
                  </motion.span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stack column, growing upward from a base plate */}
      <div className="flex flex-col items-center">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          stack · depth {stack.length}
        </div>
        <div className="flex min-h-[120px] w-16 flex-col-reverse justify-start gap-1">
          <AnimatePresence initial={false} mode="popLayout">
            {stack.map((it, i) => {
              const isTop = i === stack.length - 1
              const topMatch = isTop && status === 'check-ok'
              const topClash = isTop && (status === 'check-bad' || status === 'fail')
              const leftover = status === 'unbalanced'
              return (
                <motion.div
                  key={it.idx}
                  layout
                  initial={{ opacity: 0, y: -18, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: topMatch || topClash ? 1.08 : 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.8 }}
                  transition={{ duration: 0.25 }}
                  className={`flex h-8 w-16 items-center justify-center rounded-md border font-mono text-sm ${
                    topMatch
                      ? 'border-emerald-500 bg-emerald-500/15 font-bold text-emerald-600 dark:text-emerald-400'
                      : topClash
                        ? 'border-red-500 bg-red-500/15 font-bold text-red-600 dark:text-red-400'
                        : leftover
                          ? 'border-amber-500/70 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : isTop
                            ? 'border-accent/60 bg-surface-sunken font-semibold'
                            : 'border-edge bg-surface-sunken'
                  }`}
                >
                  {it.ch}
                </motion.div>
              )
            })}
          </AnimatePresence>
          {stack.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex h-8 w-16 items-center justify-center rounded-md border border-dashed border-edge text-[11px] text-ink-faint"
            >
              empty
            </motion.div>
          )}
        </div>
        <div className="mt-1 h-1.5 w-24 rounded-full bg-surface-sunken" />
      </div>

      {/* Verdict */}
      <div className="h-6 font-mono text-sm">
        {status === 'balanced' ? (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-bold text-emerald-600 dark:text-emerald-400"
          >
            ✓ balanced
          </motion.span>
        ) : status === 'fail' || status === 'unbalanced' ? (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-bold text-red-600 dark:text-red-400"
          >
            ✗ not balanced
          </motion.span>
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </div>
    </div>
  )
}

export default function StackVisualizer() {
  const [str, setStr] = useState('([]{<>})')

  const frames = useMemo(() => buildFrames(str), [str])
  const resetKey = `s:${str}`

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="Bracket string"
          defaultValue={str}
          hint={`Only ( ) [ ] { } < > — max ${MAX_LEN} chars. Try "([)]" or "(()" for failures.`}
          onParsed={(raw) => {
            const parsed = parseBrackets(raw)
            if (parsed) {
              setStr(parsed)
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
        renderFrame={(f) => <BracketFrame data={f.data} />}
      />
    </div>
  )
}
