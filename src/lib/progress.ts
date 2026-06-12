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
 * The module the learner is weakest in, judged primarily by quiz scores,
 * then by unsolved problems. Only modules with content qualify.
 */
export function weakestModule(state: AppState): ModuleId | null {
  let worst: { id: ModuleId; score: number } | null = null
  for (const m of MODULES) {
    const p = moduleProgress(state, m.id)
    if (!p.hasContent) continue
    // Quiz score dominates; untaken quizzes count as 0.5 so brand-new
    // modules don't always shadow genuinely weak ones.
    const quiz = p.bestQuizScore ?? 0.5
    const solveRate = p.problemsTotal ? p.problemsSolved / p.problemsTotal : 0
    const score = 0.7 * quiz + 0.3 * solveRate
    if (!worst || score < worst.score) worst = { id: m.id, score }
  }
  return worst?.id ?? null
}
