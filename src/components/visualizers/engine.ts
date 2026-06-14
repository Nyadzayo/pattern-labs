/**
 * Step-engine contract shared by every visualizer.
 *
 * A visualizer is: (parsed user input) → Frame[] via a pure builder
 * function, rendered by <StepPlayer>. Frames are immutable snapshots, so
 * stepping is deterministic and fully reversible — no timers mutate state.
 */
import type { ReactNode } from 'react'

export interface Frame<T> {
  /** Immutable data snapshot for this step. */
  data: T
  /** One-sentence narration of what just happened. */
  caption: string
  /** 1-based line of the pseudocode panel to highlight. */
  codeLine?: number
  /**
   * Optional active subgoal label for this step — the role this move plays in
   * the pattern's structure. Surfaced as a chip so the animation and the
   * transferable skeleton reinforce each other (dual coding).
   */
  subgoal?: string
}

export function frame<T>(data: T, caption: string, codeLine?: number, subgoal?: string): Frame<T> {
  return { data, caption, codeLine, subgoal }
}

export interface VisualizerProps {
  /** Optional hook for embedding contexts to react to input changes. */
  onInputChange?: () => void
}

export type FrameRenderer<T> = (current: Frame<T>, index: number) => ReactNode

/** Clamp helper used by players and scrubbing. */
export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

// ---------- shared input parsing ----------

/** "3, 1,4,1 5" → [3,1,4,1,5]; returns null on any non-numeric token. */
export function parseIntList(raw: string, opts?: { min?: number; max?: number; maxLen?: number }): number[] | null {
  const tokens = raw.split(/[\s,]+/).filter(Boolean)
  if (!tokens.length) return null
  const out: number[] = []
  for (const t of tokens) {
    const n = Number(t)
    if (!Number.isInteger(n)) return null
    if (opts?.min !== undefined && n < opts.min) return null
    if (opts?.max !== undefined && n > opts.max) return null
    out.push(n)
  }
  if (opts?.maxLen && out.length > opts.maxLen) return null
  return out
}

/** Letters-only string, length-capped — keeps visualizations legible. */
export function parseWord(raw: string, maxLen = 24): string | null {
  const s = raw.trim()
  if (!s || s.length > maxLen) return null
  if (!/^[a-zA-Z]+$/.test(s)) return null
  return s
}

/** "1-3, 2-6, 8-10" → [[1,3],[2,6],[8,10]] */
export function parseIntervals(raw: string, maxLen = 10): [number, number][] | null {
  const tokens = raw.split(/[,;]+/).map((t) => t.trim()).filter(Boolean)
  if (!tokens.length || tokens.length > maxLen) return null
  const out: [number, number][] = []
  for (const t of tokens) {
    const m = /^(-?\d+)\s*[-–:]\s*(-?\d+)$/.exec(t)
    if (!m) return null
    const a = Number(m[1])
    const b = Number(m[2])
    if (a > b) return null
    out.push([a, b])
  }
  return out
}
