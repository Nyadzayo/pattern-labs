import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MODULE_IDS } from '@/content'
import type { ModuleId } from '@/content'
import { useAppState } from '@/lib/useAppState'
import { dueStemCount, recordSprintScore, sprintRound } from '@/lib/sprint'
import { DEFAULT_TIMER_MS, type SprintRoundKind } from '@/lib/sprintScore'
import { getState } from '@/lib/storage'
import { SprintRound, type RoundSummary } from '@/components/sprint/SprintRound'
import { SprintRoundSelect } from '@/components/sprint/SprintRoundSelect'
import { SprintEndScreen } from '@/components/sprint/SprintEndScreen'

/** Cards per timed Sprint deck (Warmup and Sudden Death use the full deck). */
const SPRINT_DECK = 12

const ROUNDS = [
  {
    round: 'warmup' as SprintRoundKind,
    title: 'Warmup',
    blurb: 'No timer — read each stem, guess, and learn the tell. Build the instinct first.',
    meta: 'no timer',
  },
  {
    round: 'sprint' as SprintRoundKind,
    title: 'Sprint',
    blurb: '10 seconds per card. Score is your streak times how fast you answer.',
    meta: '10s · scored',
  },
  {
    round: 'sudden-death' as SprintRoundKind,
    title: 'Sudden Death',
    blurb: 'One wrong answer or timeout ends the run. How long can your streak survive?',
    meta: 'one life',
  },
]

function parseFocus(raw: string | null): ModuleId[] {
  if (!raw) return []
  const valid = new Set<string>(MODULE_IDS as readonly string[])
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => valid.has(s)) as ModuleId[]
}

export function SprintPage() {
  const state = useAppState()
  const [params] = useSearchParams()
  const focus = useMemo(() => parseFocus(params.get('focus')), [params])

  const [active, setActive] = useState<{
    round: SprintRoundKind
    timerMs: number
    deck: ReturnType<typeof sprintRound>
  } | null>(null)
  const [result, setResult] = useState<{ summary: RoundSummary; isBest: boolean } | null>(null)

  const start = (round: SprintRoundKind) => {
    const full = sprintRound(getState(), round, focus)
    const deck = round === 'sprint' ? full.slice(0, SPRINT_DECK) : full
    setResult(null)
    setActive({ round, timerMs: round === 'warmup' ? 0 : DEFAULT_TIMER_MS, deck })
  }

  if (result) {
    return (
      <SprintEndScreen
        summary={result.summary}
        isBest={result.isBest}
        onAgain={() => start(result.summary.round)}
        onHome={() => {
          setResult(null)
          setActive(null)
        }}
      />
    )
  }

  if (active) {
    if (active.deck.length === 0) {
      return (
        <div className="mx-auto max-w-2xl px-8 py-8">
          <p className="text-sm text-ink-muted">No stems available yet.</p>
          <button onClick={() => setActive(null)} className="mt-4 text-sm text-accent">
            ← Back to rounds
          </button>
        </div>
      )
    }
    return (
      <div className="px-8 py-8">
        <SprintRound
          key={active.round}
          round={active.round}
          timerMs={active.timerMs}
          deck={active.deck}
          onExit={() => setActive(null)}
          onFinish={(summary) => {
            const isBest = recordSprintScore(summary.round, summary.score)
            setResult({ summary, isBest })
            setActive(null)
          }}
        />
      </div>
    )
  }

  return (
    <SprintRoundSelect
      rounds={ROUNDS}
      dueCount={dueStemCount(state)}
      bestSprint={state.sprintStats.bestSprint}
      bestSuddenDeath={state.sprintStats.bestSuddenDeath}
      onPick={start}
    />
  )
}
