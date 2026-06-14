// Pure, deterministic aggregation of confidence predictions vs actual outcomes.
// No Date / Math.random inside — entries carry their own timestamps. Feeds the
// Dashboard Calibration card: are you right as often as you feel you are?
import type { CalibrationEntry } from './storage'

/** 0..3 confidence levels, lowest → highest. */
export const CONFIDENCE_LABELS = ['Guessing', 'Unsure', 'Confident', 'Certain'] as const
export type ConfidenceLevel = 0 | 1 | 2 | 3

/** Map a 0..3 level to a 0..1 expected-accuracy the learner is implicitly claiming. */
export function confidenceToExpected(level: number): number {
  return level / 3
}

export interface ConfidenceBucket {
  level: number
  label: string
  n: number
  correct: number
  /** correct / n, or 0 when n === 0. */
  accuracy: number
}

export interface ModuleCalibration {
  moduleId: string
  n: number
  /** Mean predicted confidence, normalized to 0..1. */
  avgConfidence: number
  /** Mean actual correctness, 0..1. */
  accuracy: number
  /** avgConfidence − accuracy. Positive = overconfident. */
  gap: number
}

export interface CalibrationReport {
  total: number
  /** One bucket per confidence level (0..3), always length 4. */
  byConfidence: ConfidenceBucket[]
  /** Modules where confidence outran accuracy (gap > 0), worst first. */
  overconfidenceByModule: ModuleCalibration[]
  /** The single worst-overconfidence module, or null. */
  topOverconfident: ModuleCalibration | null
}

/**
 * Aggregate calibration entries into per-confidence-level accuracy and
 * per-module overconfidence gaps. Deterministic; ties in gap resolve by
 * moduleId so output order is stable.
 */
export function calibrationReport(entries: CalibrationEntry[]): CalibrationReport {
  const byConfidence: ConfidenceBucket[] = [0, 1, 2, 3].map((level) => ({
    level,
    label: CONFIDENCE_LABELS[level],
    n: 0,
    correct: 0,
    accuracy: 0,
  }))

  const perModule = new Map<string, { n: number; confSum: number; correct: number }>()

  for (const e of entries) {
    const lvl = e.confidence
    if (lvl >= 0 && lvl <= 3) {
      const b = byConfidence[lvl]
      b.n += 1
      if (e.correct) b.correct += 1
    }
    if (e.moduleId) {
      const m = perModule.get(e.moduleId) ?? { n: 0, confSum: 0, correct: 0 }
      m.n += 1
      m.confSum += confidenceToExpected(e.confidence)
      if (e.correct) m.correct += 1
      perModule.set(e.moduleId, m)
    }
  }

  for (const b of byConfidence) b.accuracy = b.n > 0 ? b.correct / b.n : 0

  const overconfidenceByModule: ModuleCalibration[] = [...perModule.entries()]
    .map(([moduleId, m]) => {
      const avgConfidence = m.confSum / m.n
      const accuracy = m.correct / m.n
      return { moduleId, n: m.n, avgConfidence, accuracy, gap: avgConfidence - accuracy }
    })
    .filter((m) => m.gap > 0)
    .sort((a, b) => b.gap - a.gap || a.moduleId.localeCompare(b.moduleId))

  return {
    total: entries.length,
    byConfidence,
    overconfidenceByModule,
    topOverconfident: overconfidenceByModule[0] ?? null,
  }
}
