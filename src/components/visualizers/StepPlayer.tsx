import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { clamp, type Frame, type FrameRenderer } from './engine'

interface StepPlayerProps<T> {
  frames: Frame<T>[]
  renderFrame: FrameRenderer<T>
  /** Pseudocode lines shown beside the canvas; frame.codeLine highlights one. */
  pseudocode?: string[]
  /** Reset playback when this key changes (e.g. serialized input). */
  resetKey?: string
  children?: ReactNode
}

const SPEEDS = [0.5, 1, 2, 4] as const
const BASE_MS = 900

export function StepPlayer<T>({ frames, renderFrame, pseudocode, resetKey }: StepPlayerProps<T>) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // New input → restart from the first frame.
  useEffect(() => {
    setIndex(0)
    setPlaying(false)
  }, [resetKey])

  const last = frames.length - 1
  const safeIndex = clamp(index, 0, Math.max(0, last))
  const current = frames[safeIndex]

  useEffect(() => {
    if (!playing) return
    timerRef.current = setInterval(() => {
      setIndex((i) => {
        if (i >= last) {
          setPlaying(false)
          return i
        }
        return i + 1
      })
    }, BASE_MS / speed)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [playing, speed, last])

  const step = useCallback(
    (delta: number) => {
      setPlaying(false)
      setIndex((i) => clamp(i + delta, 0, last))
    },
    [last],
  )

  const togglePlay = useCallback(() => {
    if (safeIndex >= last) {
      setIndex(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }, [safeIndex, last])

  // Space toggles play when the player area has focus.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault()
      togglePlay()
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      step(1)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      step(-1)
    }
  }

  if (!frames.length) {
    return (
      <div className="rounded-xl border border-dashed border-edge p-8 text-center text-sm text-ink-muted">
        Enter a valid input above to generate steps.
      </div>
    )
  }

  return (
    <div
      className="rounded-xl border border-edge bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      tabIndex={0}
      onKeyDown={onKeyDown}
      data-step-player
    >
      <div className={`grid gap-0 ${pseudocode ? 'lg:grid-cols-[1fr_260px]' : ''}`}>
        <div className="min-h-[260px] p-5">{renderFrame(current, safeIndex)}</div>
        {pseudocode && (
          <div className="border-t border-edge p-4 lg:border-l lg:border-t-0">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Pseudocode
            </div>
            <pre className="font-mono text-[12px] leading-6">
              {pseudocode.map((line, i) => (
                <div
                  key={i}
                  className={`-mx-2 rounded px-2 transition-colors ${
                    current.codeLine === i + 1
                      ? 'bg-accent/15 font-medium text-ink'
                      : 'text-ink-muted'
                  }`}
                >
                  {line || ' '}
                </div>
              ))}
            </pre>
          </div>
        )}
      </div>

      <div className="border-t border-edge px-5 py-3">
        <div className="min-h-[20px] text-sm text-ink-muted" aria-live="polite">
          {current.caption}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={() => step(-Infinity)} title="First step" className="player-btn" aria-label="First step">
            ⏮
          </button>
          <button onClick={() => step(-1)} title="Step back (←)" className="player-btn" aria-label="Step back">
            ◀
          </button>
          <button
            onClick={togglePlay}
            title="Play/Pause (space)"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm text-white transition-opacity hover:opacity-90"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <button onClick={() => step(1)} title="Step forward (→)" className="player-btn" aria-label="Step forward">
            ▶
          </button>
          <button onClick={() => step(Infinity)} title="Last step" className="player-btn" aria-label="Last step">
            ⏭
          </button>

          <input
            type="range"
            min={0}
            max={last}
            value={safeIndex}
            onChange={(e) => {
              setPlaying(false)
              setIndex(Number(e.target.value))
            }}
            className="mx-2 h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-surface-sunken accent-[rgb(var(--accent))]"
            aria-label="Scrub steps"
          />

          <span className="w-16 text-right font-mono text-xs tabular-nums text-ink-faint">
            {safeIndex + 1}/{frames.length}
          </span>

          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value) as (typeof SPEEDS)[number])}
            className="rounded-lg border border-edge bg-surface-raised px-2 py-1 text-xs text-ink-muted"
            aria-label="Playback speed"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
