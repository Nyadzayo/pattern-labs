import { useCallback, useRef, useState } from 'react'
import { diffChars, type Keystroke } from '@/lib/kataDiff'

interface KataTypingSurfaceProps {
  reference: string
  /** Show the not-yet-typed reference (guided). False hides it (fading recall). */
  revealPending?: boolean
  /**
   * Blank-page mode: render typed text plainly with no diff against the
   * reference (the learner may write any correct solution — the judge decides).
   */
  plain?: boolean
  /** Fires on every value change with the current text and accumulated keystrokes. */
  onChange: (typed: string, keys: Keystroke[]) => void
  onEscape?: () => void
  autoFocus?: boolean
}

const TYPO = 'font-mono text-sm leading-6 whitespace-pre-wrap break-words'

/**
 * The kata typing field: a transparent <textarea> layered under a colored <pre>
 * diff overlay. Paste is disabled (typing is the point), Tab inserts 4 spaces
 * (no focus change), Esc bails. Every inserted character is timestamped with
 * `performance.now()` for the hesitation map — capture is per input event, so no
 * keystroke is dropped under fast typing.
 */
export function KataTypingSurface({
  reference,
  revealPending = true,
  plain = false,
  onChange,
  onEscape,
  autoFocus = true,
}: KataTypingSurfaceProps) {
  const [typed, setTyped] = useState('')
  const keysRef = useRef<Keystroke[]>([])
  const taRef = useRef<HTMLTextAreaElement>(null)
  const rows = Math.max(6, reference.split('\n').length + 1)

  const commit = useCallback(
    (next: string, prev: string) => {
      if (next.length === prev.length + 1) {
        // A single insertion: find where it landed and record the keystroke.
        let idx = 0
        while (idx < prev.length && prev[idx] === next[idx]) idx++
        keysRef.current.push({
          t: performance.now(),
          index: idx,
          correct: next[idx] === reference[idx],
        })
      }
      setTyped(next)
      onChange(next, keysRef.current)
    },
    [reference, onChange],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onEscape?.()
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = taRef.current
      if (!ta) return
      const start = ta.selectionStart
      const end = ta.selectionEnd
      const next = typed.slice(0, start) + '    ' + typed.slice(end)
      commit(next, typed)
      // Restore the caret after the inserted spaces on the next tick.
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 4
      })
    }
  }

  const cells = diffChars(reference, typed)

  return (
    <div className="relative rounded-xl border border-edge bg-surface-sunken">
      <pre className={`${TYPO} pointer-events-none m-0 min-h-[1.5rem] overflow-hidden p-4 text-ink`}>
        {plain ? (
          <span className="text-ink">{typed}</span>
        ) : (
          cells.map((c, i) => {
            if (c.status === 'pending') {
              return (
                <span key={i} className={revealPending ? 'text-ink-faint/50' : 'text-transparent'}>
                  {c.ch}
                </span>
              )
            }
            return (
              <span
                key={i}
                className={
                  c.status === 'correct'
                    ? 'text-ink'
                    : 'rounded-sm bg-rose-500/25 text-rose-600 dark:text-rose-300'
                }
              >
                {c.ch}
              </span>
            )
          })
        )}
        {/* Trailing space keeps an empty last line from collapsing. */}
        {'​'}
      </pre>
      <textarea
        ref={taRef}
        rows={rows}
        autoFocus={autoFocus}
        value={typed}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        onPaste={(e) => e.preventDefault()}
        onKeyDown={onKeyDown}
        onChange={(e) => commit(e.target.value, typed)}
        className={`${TYPO} absolute inset-0 h-full w-full resize-none bg-transparent p-4 text-transparent caret-accent outline-none`}
      />
    </div>
  )
}
