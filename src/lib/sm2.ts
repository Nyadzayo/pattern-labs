/**
 * SM-2 spaced repetition scheduling.
 *
 * Grades map to SM-2 quality scores: Again=1, Hard=3, Good=4, Easy=5.
 * Quality < 3 resets repetitions (card relearns from scratch) but, per the
 * classic algorithm, ease is still adjusted downward.
 */
import { allLoadedContent } from '@/content'
import type { AppState, CardSchedule, DrillProgress } from './storage'
import { setState, todayISO } from './storage'

export type Grade = 'again' | 'hard' | 'good' | 'easy'

const GRADE_QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 }

export const MIN_EASE = 1.3
export const INITIAL_EASE = 2.5

export function newSchedule(): CardSchedule {
  return { reps: 0, intervalDays: 0, ease: INITIAL_EASE, due: todayISO(), lapses: 0 }
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function applyGrade(prev: CardSchedule | undefined, grade: Grade): CardSchedule {
  const s = prev ?? newSchedule()
  const q = GRADE_QUALITY[grade]
  const today = todayISO()

  // Ease update from SM-2: EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
  const ease = Math.max(MIN_EASE, s.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  if (q < 3) {
    // Lapse: relearn. Due again today so it reappears in this session.
    return { reps: 0, intervalDays: 0, ease, due: today, lapses: s.lapses + 1 }
  }

  const reps = s.reps + 1
  let intervalDays: number
  if (reps === 1) intervalDays = 1
  else if (reps === 2) intervalDays = 6
  else intervalDays = Math.round(s.intervalDays * ease)
  // "Hard" on a mature card shouldn't grow the interval.
  if (grade === 'hard' && reps > 2) intervalDays = Math.max(1, Math.round(s.intervalDays * 1.2))

  return { reps, intervalDays, ease, due: addDays(today, intervalDays), lapses: s.lapses }
}

/** Grade a card and persist its new schedule. */
export function gradeCard(moduleId: string, cardId: string, grade: Grade): void {
  const key = `${moduleId}/${cardId}`
  setState((prev) => ({
    ...prev,
    cards: { ...prev.cards, [key]: applyGrade(prev.cards[key], grade) },
  }))
}

export interface DueCard {
  moduleId: string
  cardId: string
  front: string
  back: string
  schedule: CardSchedule | undefined
}

/**
 * All cards due today or earlier across loaded modules. Cards never graded
 * are due immediately (they're new).
 */
export function dueCards(state: AppState): DueCard[] {
  const today = todayISO()
  const out: DueCard[] = []
  for (const mod of allLoadedContent()) {
    for (const card of mod.flashcards) {
      const key = `${mod.id}/${card.id}`
      const schedule = state.cards[key]
      if (!schedule || schedule.due <= today) {
        out.push({ moduleId: mod.id, cardId: card.id, front: card.front, back: card.back, schedule })
      }
    }
  }
  return out
}

export function dueCardCount(state: AppState): number {
  return dueCards(state).length
}

// ── Primitives Lab: drill scheduling ────────────────────────────────────────

export function newDrillProgress(): DrillProgress {
  return { rung: 1, schedule: newSchedule(), rung6PassDates: [], mastered: false }
}

/**
 * Apply one drill outcome (pure). Pass → promote a rung (cap = `maxRung`, the
 * primitive's ladder length, default 6) and grade the card 'good'; a pass on the
 * LAST rung (always Write) records `today` and mastery flips on after 2 distinct
 * days. Fail → demote a rung (floor 1) and grade 'again'. `today` and `maxRung`
 * are passed in so this stays deterministic and testable. The persisted field is
 * still named `rung6PassDates` (data compat); it now means "mastery-rung passes".
 */
export function applyDrillResult(
  prev: DrillProgress | undefined,
  opts: { passed: boolean; rung: number; today: string; maxRung?: number },
): DrillProgress {
  const base = prev ?? newDrillProgress()
  const { passed, rung, today } = opts
  const maxRung = opts.maxRung ?? 6
  const schedule = applyGrade(base.schedule, passed ? 'good' : 'again')

  let rung6PassDates = base.rung6PassDates
  if (passed && rung >= maxRung && !rung6PassDates.includes(today)) {
    rung6PassDates = [...rung6PassDates, today]
  }
  const mastered = rung6PassDates.length >= 2
  const nextRung = passed ? Math.min(maxRung, rung + 1) : Math.max(1, rung - 1)

  return { rung: nextRung, schedule, rung6PassDates, mastered }
}

/** Apply a drill outcome to a primitive and persist it. */
export function gradeDrill(
  primitiveId: string,
  passed: boolean,
  rung: number,
  maxRung = 6,
): void {
  const today = todayISO()
  setState((prev) => ({
    ...prev,
    drills: {
      ...prev.drills,
      [primitiveId]: applyDrillResult(prev.drills[primitiveId], { passed, rung, today, maxRung }),
    },
  }))
}
