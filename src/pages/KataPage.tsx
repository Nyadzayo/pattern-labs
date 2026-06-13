import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppState } from '@/lib/useAppState'
import { getKata } from '@/lib/katas'
import { isComplete, type Keystroke } from '@/lib/kataDiff'
import { KataTypingSurface } from '@/components/katas/KataTypingSurface'
import { KataEndScreen, type KataMode } from '@/components/katas/KataEndScreen'
import { KataModeSelect, type KataModeDef } from '@/components/katas/KataModeSelect'

const MODES: KataModeDef[] = [
  {
    mode: 'guided',
    title: 'Guided type',
    blurb: 'The reference is shown — type it exactly. Correct characters lock in, mistakes flag red.',
    enabled: true,
  },
  {
    mode: 'fading',
    title: 'Fading recall',
    blurb: 'See it for five seconds, then it disappears — reproduce it from memory.',
    enabled: false,
  },
  {
    mode: 'blank',
    title: 'Blank-page recall',
    blurb: 'Only the name and intent — write the whole thing and run it against the tests.',
    enabled: false,
  },
]

interface Result {
  mode: KataMode
  keys: Keystroke[]
  elapsedSeconds: number
}

export function KataPage() {
  const { kataId } = useParams()
  const navigate = useNavigate()
  const state = useAppState()
  const kata = kataId ? getKata(kataId) : null

  const [phase, setPhase] = useState<'select' | 'typing' | 'end'>('select')
  const [runId, setRunId] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const startRef = useRef(0)

  // Live timer while typing (starts on the first keystroke).
  useEffect(() => {
    if (phase !== 'typing') return
    const id = setInterval(() => {
      if (startRef.current > 0) setElapsed((performance.now() - startRef.current) / 1000)
    }, 100)
    return () => clearInterval(id)
  }, [phase, runId])

  if (!kata) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <Link to="/katas" className="text-sm text-accent">
          ← Code Katas
        </Link>
        <p className="mt-6 text-sm text-ink-muted">No kata “{kataId}”.</p>
      </div>
    )
  }

  const begin = (mode: KataMode) => {
    if (mode !== 'guided') return
    startRef.current = 0
    setElapsed(0)
    setResult(null)
    setRunId((n) => n + 1)
    setPhase('typing')
  }

  const onChange = (typed: string, keys: Keystroke[]) => {
    if (startRef.current === 0 && keys.length > 0) startRef.current = performance.now()
    if (isComplete(kata.code, typed)) {
      const seconds = startRef.current > 0 ? (performance.now() - startRef.current) / 1000 : 0
      setResult({ mode: 'guided', keys, elapsedSeconds: seconds })
      setPhase('end')
    }
  }

  const best = state.katas[kata.id]?.bestSeconds ?? null

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link to="/katas" className="text-sm text-accent">
        ← Code Katas
      </Link>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{kata.name}</h1>
        {phase === 'typing' && (
          <span className="tabular-nums text-sm text-ink-muted">
            {elapsed.toFixed(1)}s <span className="text-ink-faint">/ par {kata.parSeconds}s</span>
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-6 text-ink-muted">{kata.intent}</p>

      <div className="mt-6">
        {phase === 'select' && <KataModeSelect modes={MODES} onPick={begin} />}

        {phase === 'typing' && (
          <>
            <p className="mb-2 text-xs uppercase tracking-wider text-ink-faint">
              Type the reference · Tab inserts spaces · Esc to bail
            </p>
            <KataTypingSurface
              key={runId}
              reference={kata.code}
              revealPending
              onChange={onChange}
              onEscape={() => setPhase('select')}
            />
          </>
        )}

        {phase === 'end' && result && (
          <KataEndScreen
            reference={kata.code}
            mode={result.mode}
            keys={result.keys}
            elapsedSeconds={result.elapsedSeconds}
            parSeconds={kata.parSeconds}
            bestSeconds={best}
            onAgain={() => begin('guided')}
            onExit={() => navigate('/katas')}
          />
        )}
      </div>
    </div>
  )
}
