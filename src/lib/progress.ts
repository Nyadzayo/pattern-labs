import { getModuleContent, MODULES } from '@/content'
import type { ModuleId } from '@/content'
import type { AppState } from './storage'

export interface ModuleProgress {
  /** 0..1 — weighted blend of concept, problems, quiz, flashcards. */
  fraction: number
  problemsSolved: number
  problemsTotal: number
  bestQuizScore: number | null // 0..1
  cardsGraded: number
  cardsTotal: number
  conceptRead: boolean
  hasContent: boolean
}

/**
 * Weighting: solving problems is the bulk of mastery (45%), quiz 25%,
 * reading the concept 15%, touching the flashcards 15%.
 */
export function moduleProgress(state: AppState, moduleId: ModuleId): ModuleProgress {
  const content = getModuleContent(moduleId)
  if (!content) {
    return {
      fraction: 0,
      problemsSolved: 0,
      problemsTotal: 0,
      bestQuizScore: null,
      cardsGraded: 0,
      cardsTotal: 0,
      conceptRead: false,
      hasContent: false,
    }
  }
  const conceptRead = !!state.conceptRead[moduleId]
  const problemsTotal = content.problems.length
  const problemsSolved = content.problems.filter((p) => {
    const s = state.problems[`${moduleId}/${p.id}`]?.status
    return s === 'solved-clean' || s === 'solved-with-help'
  }).length
  const attempts = state.quizAttempts[moduleId] ?? []
  const bestQuizScore = attempts.length
    ? Math.max(...attempts.map((a) => (a.total > 0 ? a.score / a.total : 0)))
    : null
  const cardsTotal = content.flashcards.length
  const cardsGraded = content.flashcards.filter(
    (c) => state.cards[`${moduleId}/${c.id}`],
  ).length

  const fraction =
    0.15 * (conceptRead ? 1 : 0) +
    0.45 * (problemsTotal ? problemsSolved / problemsTotal : 0) +
    0.25 * (bestQuizScore ?? 0) +
    0.15 * (cardsTotal ? cardsGraded / cardsTotal : 0)

  return {
    fraction,
    problemsSolved,
    problemsTotal,
    bestQuizScore,
    cardsGraded,
    cardsTotal,
    conceptRead,
    hasContent: true,
  }
}

export function overallProgress(state: AppState): number {
  const withContent = MODULES.filter((m) => moduleProgress(state, m.id).hasContent)
  if (!withContent.length) return 0
  const sum = withContent.reduce((acc, m) => acc + moduleProgress(state, m.id).fraction, 0)
  return sum / withContent.length
}

/**
 * Per-module mastery score in 0..1 (higher = stronger), judged primarily by
 * quiz scores, then solve rate. Untaken quizzes count as 0.5 so brand-new
 * modules don't always shadow genuinely weak ones. Modules without content
 * are omitted.
 */
export function moduleMastery(state: AppState): { id: ModuleId; score: number }[] {
  const out: { id: ModuleId; score: number }[] = []
  for (const m of MODULES) {
    const p = moduleProgress(state, m.id)
    if (!p.hasContent) continue
    const quiz = p.bestQuizScore ?? 0.5
    const solveRate = p.problemsTotal ? p.problemsSolved / p.problemsTotal : 0
    out.push({ id: m.id, score: 0.7 * quiz + 0.3 * solveRate })
  }
  return out
}

/** The module the learner is weakest in. */
export function weakestModule(state: AppState): ModuleId | null {
  const scored = moduleMastery(state)
  if (!scored.length) return null
  return scored.reduce((a, b) => (b.score < a.score ? b : a)).id
}
