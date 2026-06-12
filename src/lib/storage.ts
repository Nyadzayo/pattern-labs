/**
 * Typed localStorage-backed app state with a tiny subscribe/snapshot store
 * (consumed via useSyncExternalStore in src/lib/useAppState.ts).
 *
 * The whole state lives under one key so export/import is a single JSON
 * blob. Writes are debounced; call `flushNow()` before page unload.
 */

export const STORAGE_KEY = 'pattern-lab:v1'

export type Theme = 'dark' | 'light'

export type ProblemStatus = 'attempted' | 'solved-clean' | 'solved-with-help'

export interface ProblemProgress {
  status: ProblemStatus
  /** ISO date of first solve. */
  solvedAt?: string
  hintsUsed: number
  viewedSolution: boolean
  /** Best Submit result, e.g. 7/9 cases. */
  bestPassed?: number
  totalCases?: number
}

export interface QuizAttempt {
  score: number
  total: number
  at: string // ISO datetime
}

/** SM-2 scheduling state for one flashcard. */
export interface CardSchedule {
  reps: number
  intervalDays: number
  ease: number
  due: string // ISO date
  lapses: number
}

export interface MockProblemReport {
  problemKey: string // moduleId/problemId
  title: string
  secondsSpent: number
  casesPassed: number
  casesTotal: number
  patternGuess?: string
  patternCorrect?: boolean
}

export interface MockReport {
  at: string
  durationSeconds: number
  problems: MockProblemReport[]
}

export interface AppState {
  version: 1
  theme: Theme
  /** moduleId → true once the Learn tab has been read to the end. */
  conceptRead: Record<string, boolean>
  /** "moduleId/problemId" → progress. */
  problems: Record<string, ProblemProgress>
  /** moduleId → attempts, oldest first. */
  quizAttempts: Record<string, QuizAttempt[]>
  /** "moduleId/cardId" → schedule. Cards never graded have no entry. */
  cards: Record<string, CardSchedule>
  /** "moduleId/problemId" → saved editor draft. */
  drafts: Record<string, string>
  lastVisited: { moduleId: string; tab: string } | null
  streak: { lastActive: string; count: number } // lastActive = YYYY-MM-DD
  mockReports: MockReport[]
}

export function defaultState(): AppState {
  return {
    version: 1,
    theme: 'dark',
    conceptRead: {},
    problems: {},
    quizAttempts: {},
    cards: {},
    drafts: {},
    lastVisited: null,
    streak: { lastActive: '', count: 0 },
    mockReports: [],
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Merge unknown parsed JSON onto the default state, keeping only keys whose
 * shape matches. Tolerant by design: a corrupt section degrades to default
 * instead of nuking everything.
 */
export function sanitizeState(raw: unknown): AppState {
  const base = defaultState()
  if (!isObject(raw)) return base
  if (raw.theme === 'light' || raw.theme === 'dark') base.theme = raw.theme
  for (const key of ['conceptRead', 'problems', 'quizAttempts', 'cards', 'drafts'] as const) {
    if (isObject(raw[key])) base[key] = raw[key] as never
  }
  if (isObject(raw.lastVisited) && typeof raw.lastVisited.moduleId === 'string') {
    base.lastVisited = {
      moduleId: raw.lastVisited.moduleId,
      tab: typeof raw.lastVisited.tab === 'string' ? raw.lastVisited.tab : 'learn',
    }
  }
  if (
    isObject(raw.streak) &&
    typeof raw.streak.lastActive === 'string' &&
    typeof raw.streak.count === 'number'
  ) {
    base.streak = { lastActive: raw.streak.lastActive, count: raw.streak.count }
  }
  if (Array.isArray(raw.mockReports)) base.mockReports = raw.mockReports as MockReport[]
  return base
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    return sanitizeState(JSON.parse(raw))
  } catch {
    return defaultState()
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()
let persistTimer: ReturnType<typeof setTimeout> | null = null

function persistSoon(): void {
  if (persistTimer) clearTimeout(persistTimer)
  persistTimer = setTimeout(flushNow, 400)
}

export function flushNow(): void {
  if (persistTimer) {
    clearTimeout(persistTimer)
    persistTimer = null
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota errors and private-mode failures are non-fatal: state stays in memory.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushNow)
}

export function getState(): AppState {
  return state
}

export function setState(updater: (prev: AppState) => AppState): void {
  state = updater(state)
  persistSoon()
  listeners.forEach((l) => l())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// ---------- export / import ----------

export function exportStateJson(): string {
  return JSON.stringify(state, null, 2)
}

/** Returns an error message, or null on success. */
export function importStateJson(json: string): string | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return 'That file is not valid JSON.'
  }
  if (!isObject(parsed) || parsed.version !== 1) {
    return 'That file does not look like a Pattern Lab backup (missing version: 1).'
  }
  state = sanitizeState(parsed)
  flushNow()
  listeners.forEach((l) => l())
  return null
}

export function resetAllProgress(): void {
  const theme = state.theme
  state = { ...defaultState(), theme }
  flushNow()
  listeners.forEach((l) => l())
}

// ---------- convenience mutators ----------

export function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Call once per app load (and after meaningful activity) to maintain the streak. */
export function touchStreak(): void {
  const today = todayISO()
  setState((prev) => {
    const { lastActive, count } = prev.streak
    if (lastActive === today) return prev
    const yesterday = new Date(Date.now() - 86_400_000)
    const yISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    const next = lastActive === yISO ? count + 1 : 1
    return { ...prev, streak: { lastActive: today, count: next } }
  })
}

export function setTheme(theme: Theme): void {
  setState((prev) => ({ ...prev, theme }))
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function saveDraft(problemKey: string, code: string): void {
  setState((prev) => ({ ...prev, drafts: { ...prev.drafts, [problemKey]: code } }))
}

export function setLastVisited(moduleId: string, tab: string): void {
  setState((prev) => ({ ...prev, lastVisited: { moduleId, tab } }))
}

export function markConceptRead(moduleId: string): void {
  setState((prev) =>
    prev.conceptRead[moduleId] ? prev : { ...prev, conceptRead: { ...prev.conceptRead, [moduleId]: true } },
  )
}

export function recordQuizAttempt(moduleId: string, score: number, total: number): void {
  setState((prev) => ({
    ...prev,
    quizAttempts: {
      ...prev.quizAttempts,
      [moduleId]: [...(prev.quizAttempts[moduleId] ?? []), { score, total, at: new Date().toISOString() }],
    },
  }))
}

export function recordMockReport(report: MockReport): void {
  setState((prev) => ({ ...prev, mockReports: [...prev.mockReports, report] }))
}

export function updateProblemProgress(
  problemKey: string,
  patch: Partial<ProblemProgress>,
): void {
  setState((prev) => {
    const existing: ProblemProgress = prev.problems[problemKey] ?? {
      status: 'attempted',
      hintsUsed: 0,
      viewedSolution: false,
    }
    const merged: ProblemProgress = { ...existing, ...patch }
    // solved-clean must never be downgraded by a later assisted solve
    if (existing.status === 'solved-clean') merged.status = 'solved-clean'
    return { ...prev, problems: { ...prev.problems, [problemKey]: merged } }
  })
}
