import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppState } from '@/lib/useAppState'
import { getKata, recordKataAttempt } from '@/lib/katas'
import { codeWpm, isComplete, keystrokeAccuracy, type Keystroke } from '@/lib/kataDiff'
import { runJudge, warmupJudge } from '@/lib/judge'
import { KataTypingSurface } from '@/components/katas/KataTypingSurface'
import { KataEndScreen, type KataMode } from '@/components/katas/KataEndScreen'
import { KataModeSelect, type KataModeDef } from '@/components/katas/KataModeSelect'
import { Sparkline } from '@/components/Sparkline'

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
    enabled: true,
  },
  {
    mode: 'blank',
    title: 'Blank-page recall',
    blurb: 'Only the name and intent — write the whole thing and run it against the tests.',
    enabled: true,
  },
]

const COUNTDOWN_SECONDS = 5
const PEEK_PENALTY_SECONDS = 15

interface Result {
  mode: KataMode
  keys: Keystroke[]
  elapsedSeconds: number
  passed?: boolean
  casesPassed?: number
  casesTotal?: number
}

export function KataPage() {
  const { kataId } = useParams()
  const navigate = useNavigate()
  const state = useAppState()
  const kata = kataId ? getKata(kataId) : null

  const [mode, setMode] = useState<KataMode>('guided')
  const [phase, setPhase] = useState<'select' | 'countdown' | 'typing' | 'judging' | 'end'>('select')
  const [runId, setRunId] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS)
  const [peeked, setPeeked] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const startRef = useRef(0)
  const penaltyRef = useRef(0)
  const typedRef = useRef('')
  const keysRef = useRef<Keystroke[]>([])

  // Live typing timer (starts on the first keystroke).
  useEffect(() => {
    if (phase !== 'typing') return
    const id = setInterval(() => {
      if (startRef.current > 0) {
        setElapsed((performance.now() - startRef.current) / 1000 + penaltyRef.current)
      }
    }, 100)
    return () => clearInterval(id)
  }, [phase, runId])

  // Fading countdown, then hand off to typing.
  useEffect(() => {
    if (phase !== 'countdown') return
    setCountdown(COUNTDOWN_SECONDS)
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id)
          setPhase('typing')
          return 0
        }
        return c - 1
      })
    }, 1000)
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

  const begin = (m: KataMode) => {
    startRef.current = 0
    penaltyRef.current = 0
    typedRef.current = ''
    keysRef.current = []
    setMode(m)
    setElapsed(0)
    setPeeked(false)
    setResult(null)
    setRunId((n) => n + 1)
    if (m === 'blank') warmupJudge()
    setPhase(m === 'fading' ? 'countdown' : 'typing')
  }

  const finishTyping = (m: KataMode, keys: Keystroke[]) => {
    const seconds = (startRef.current > 0 ? (performance.now() - startRef.current) / 1000 : 0) + penaltyRef.current
    recordKataAttempt(kata.id, {
      mode: m,
      seconds,
      accuracy: keystrokeAccuracy(keys),
      wpm: codeWpm(kata.code.length, seconds),
      parSeconds: kata.parSeconds,
    })
    setResult({ mode: m, keys, elapsedSeconds: seconds })
    setPhase('end')
  }

  const onChange = (typed: string, keys: Keystroke[]) => {
    typedRef.current = typed
    keysRef.current = keys
    if (startRef.current === 0 && keys.length > 0) startRef.current = performance.now()
    if ((mode === 'guided' || mode === 'fading') && isComplete(kata.code, typed)) {
      finishTyping(mode, keys)
    }
  }

  const peek = () => {
    if (peeked) return
    penaltyRef.current += PEEK_PENALTY_SECONDS
    setPeeked(true)
  }

  const runBlank = async () => {
    const seconds = startRef.current > 0 ? (performance.now() - startRef.current) / 1000 : 0
    const keys = keysRef.current
    setPhase('judging')
    const outcome = await runJudge(typedRef.current, kata.functionName, kata.testCases)
    const total = kata.testCases.length
    const casesPassed = outcome.results.filter((r) => r.ok).length
    const passed =
      !outcome.timedOut && !outcome.setupError && outcome.results.length === total && casesPassed === total
    recordKataAttempt(kata.id, {
      mode: 'blank',
      seconds,
      accuracy: passed ? 1 : 0,
      wpm: codeWpm(typedRef.current.length, seconds),
      parSeconds: kata.parSeconds,
      passed,
    })
    setResult({ mode: 'blank', keys, elapsedSeconds: seconds, passed, casesPassed, casesTotal: total })
    setPhase('end')
  }

  const prog = state.katas[kata.id]
  const best = prog?.bestSeconds ?? null

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link to="/katas" className="text-sm text-accent">
        ← Code Katas
      </Link>

      <div className="mt-3 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{kata.name}</h1>
        {(phase === 'typing' || phase === 'judging') && (
          <span className="tabular-nums text-sm text-ink-muted">
            {elapsed.toFixed(1)}s <span className="text-ink-faint">/ par {kata.parSeconds}s</span>
            {penaltyRef.current > 0 && <span className="ml-1 text-rose-500">+{penaltyRef.current}s</span>}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm leading-6 text-ink-muted">{kata.intent}</p>

      <div className="mt-6">
        {phase === 'select' && (
          <>
            {prog && prog.attempts.length > 0 && (
              <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-edge bg-surface-raised p-4">
                <div className="text-sm">
                  <div className="text-xs uppercase tracking-wider text-ink-faint">Your runs</div>
                  <div className="mt-1 text-ink-muted">
                    {prog.attempts.length} run{prog.attempts.length === 1 ? '' : 's'}
                    {prog.bestSeconds != null
                      ? ` · best blank-page ${prog.bestSeconds.toFixed(1)}s`
                      : ' · no clean blank-page yet'}
                    {prog.automatic && (
                      <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
                        automatic
                      </span>
                    )}
                  </div>
                </div>
                <Sparkline values={prog.attempts.map((a) => a.wpm)} ariaLabel="WPM trend" />
              </div>
            )}
            <KataModeSelect modes={MODES} onPick={begin} />
          </>
        )}

        {phase === 'countdown' && (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-ink-faint">
              <span>Memorize it</span>
              <span className="tabular-nums text-accent">{countdown}s</span>
            </div>
            <pre className="rounded-xl border border-edge bg-surface-sunken p-4 font-mono text-sm leading-6 text-ink">
              {kata.code}
            </pre>
          </div>
        )}

        {phase === 'typing' && (
          <>
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wider text-ink-faint">
              <span>
                {mode === 'blank'
                  ? 'Write it from scratch · Tab inserts spaces · Esc to bail'
                  : 'Type it · Tab inserts spaces · Esc to bail'}
              </span>
              {mode === 'fading' && (
                <button
                  onClick={peek}
                  disabled={peeked}
                  className="text-accent disabled:text-ink-faint"
                >
                  {peeked ? `revealed (+${PEEK_PENALTY_SECONDS}s)` : `Reveal (+${PEEK_PENALTY_SECONDS}s)`}
                </button>
              )}
            </div>
            <KataTypingSurface
              key={runId}
              reference={kata.code}
              revealPending={mode === 'guided' || (mode === 'fading' && peeked)}
              plain={mode === 'blank'}
              onChange={onChange}
              onEscape={() => setPhase('select')}
            />
            {mode === 'blank' && (
              <button
                onClick={runBlank}
                className="mt-3 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
              >
                Run against tests
              </button>
            )}
          </>
        )}

        {phase === 'judging' && (
          <p className="mt-4 text-sm text-ink-muted">Running your solution against the test cases…</p>
        )}

        {phase === 'end' && result && (
          <KataEndScreen
            reference={kata.code}
            mode={result.mode}
            keys={result.keys}
            elapsedSeconds={result.elapsedSeconds}
            parSeconds={kata.parSeconds}
            bestSeconds={best}
            passed={result.passed}
            casesPassed={result.casesPassed}
            casesTotal={result.casesTotal}
            onAgain={() => begin(result.mode)}
            onExit={() => navigate('/katas')}
          />
        )}
      </div>
    </div>
  )
}
