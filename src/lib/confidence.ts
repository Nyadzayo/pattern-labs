// Imperative 1-tap confidence picker, backed by a tiny event singleton (mirrors
// the judge-status pattern). A caller does `await askConfidence(surface)` right
// before a reveal/submit; the <ConfidenceHost/> mounted at app root renders the
// picker and resolves the promise with the chosen level (or null if dismissed).
// The CALLER records the outcome (it knows whether the answer was correct).
import type { CalibrationEntry } from './storage'
import type { ConfidenceLevel } from './calibration'

type Surface = CalibrationEntry['surface']

interface PendingAsk {
  surface: Surface
  moduleId?: string
  resolve: (level: ConfidenceLevel | null) => void
}

let pending: PendingAsk | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function subscribeConfidence(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Current pending ask (or null). Stable reference between emits for useSyncExternalStore. */
export function currentAsk(): PendingAsk | null {
  return pending
}

/**
 * Show the confidence picker and resolve with the chosen level, or null if the
 * learner dismisses it. Never rejects — a dismissed pick just isn't recorded, and
 * the caller proceeds with its action regardless.
 */
export function askConfidence(surface: Surface, moduleId?: string): Promise<ConfidenceLevel | null> {
  if (pending) {
    pending.resolve(null)
    pending = null
  }
  return new Promise((resolve) => {
    pending = { surface, moduleId, resolve }
    emit()
  })
}

export function answerConfidence(level: ConfidenceLevel): void {
  if (!pending) return
  const p = pending
  pending = null
  emit()
  p.resolve(level)
}

export function dismissConfidence(): void {
  if (!pending) return
  const p = pending
  pending = null
  emit()
  p.resolve(null)
}
