import {
  codeWpm,
  hesitationMap,
  keystrokeAccuracy,
  tokenizeReference,
  type Keystroke,
} from '@/lib/kataDiff'

export type KataMode = 'guided' | 'fading' | 'blank'

interface KataEndScreenProps {
  reference: string
  mode: KataMode
  keys: Keystroke[]
  elapsedSeconds: number
  parSeconds: number
  bestSeconds: number | null
  /** Blank-page recall: whether the reproduced solution passed the judge. */
  passed?: boolean
  casesPassed?: number
  casesTotal?: number
  onAgain: () => void
  onExit: () => void
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-edge bg-surface-raised p-4 text-center">
      <div className={`text-2xl font-semibold tabular-nums ${tone ?? ''}`}>{value}</div>
      <div className="mt-0.5 text-xs uppercase tracking-wider text-ink-faint">{label}</div>
    </div>
  )
}

/** Reference rendered with the tokens the learner mistyped (any wrong keystroke) underlined. */
function MistypedView({ reference, keys }: { reference: string; keys: Keystroke[] }) {
  const errorIdx = new Set(keys.filter((k) => !k.correct).map((k) => k.index))
  const tokens = tokenizeReference(reference)
  const badTokens = new Set(
    tokens.filter((t) => [...errorIdx].some((i) => i >= t.start && i < t.end)).map((t) => t.text),
  )
  if (badTokens.size === 0) {
    return <p className="text-sm text-ink-muted">Clean run — no mistyped tokens.</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {[...badTokens].map((t) => (
        <code
          key={t}
          className="rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-xs text-rose-600 dark:text-rose-300"
        >
          {t}
        </code>
      ))}
    </div>
  )
}

export function KataEndScreen({
  reference,
  mode,
  keys,
  elapsedSeconds,
  parSeconds,
  bestSeconds,
  passed,
  casesPassed,
  casesTotal,
  onAgain,
  onExit,
}: KataEndScreenProps) {
  const accuracy = Math.round(keystrokeAccuracy(keys) * 100)
  const wpm = Math.round(codeWpm(reference.length, elapsedSeconds))
  const hesitation = hesitationMap(reference, keys)
  const underPar = elapsedSeconds <= parSeconds
  const isBlank = mode === 'blank'
  const blankFailed = isBlank && passed === false

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">
          {blankFailed
            ? 'Not quite — keep drilling'
            : isBlank
              ? 'Reproduced from memory'
              : 'Nice typing'}
        </h2>
        <span className="text-xs uppercase tracking-wider text-ink-faint">{mode} recall</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Time"
          value={`${elapsedSeconds.toFixed(1)}s`}
          tone={
            isBlank && !passed
              ? 'text-rose-600 dark:text-rose-400'
              : underPar
                ? 'text-emerald-600 dark:text-emerald-400'
                : undefined
          }
        />
        <Stat label="Par" value={`${parSeconds}s`} />
        {isBlank ? (
          <Stat
            label="Cases"
            value={`${casesPassed ?? 0}/${casesTotal ?? 0}`}
            tone={passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}
          />
        ) : (
          <Stat label="Accuracy" value={`${accuracy}%`} />
        )}
        <Stat label="Speed" value={`${wpm} wpm`} />
      </div>
      {bestSeconds !== null && (
        <p className="mt-2 text-xs text-ink-muted">
          Best blank-page: <span className="tabular-nums">{bestSeconds.toFixed(1)}s</span>
          {isBlank && passed && elapsedSeconds <= bestSeconds && (
            <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">new best!</span>
          )}
        </p>
      )}

      {isBlank ? (
        <div className="mt-6 rounded-xl border border-edge bg-surface-raised p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Reference solution
          </div>
          <pre className="mt-2 overflow-x-auto font-mono text-xs leading-6 text-ink">{reference}</pre>
        </div>
      ) : (
        <>
          <div className="mt-6 rounded-xl border border-edge bg-surface-raised p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Where you slowed down
            </div>
            {hesitation.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">Even pace throughout — nothing stood out.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {hesitation.map((h) => (
                  <span
                    key={`${h.start}-${h.token}`}
                    className="flex items-center gap-1.5 rounded bg-surface-sunken px-2 py-0.5 font-mono text-xs"
                  >
                    <span>{h.token}</span>
                    <span className="tabular-nums text-ink-faint">{(h.pauseMs / 1000).toFixed(1)}s</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 rounded-xl border border-edge bg-surface-raised p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Where you mistyped
            </div>
            <div className="mt-2">
              <MistypedView reference={reference} keys={keys} />
            </div>
          </div>
        </>
      )}

      <div className="mt-6 flex gap-3">
        <button
          onClick={onAgain}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Run it again
        </button>
        <button
          onClick={onExit}
          className="rounded-lg border border-edge px-5 py-2.5 text-sm font-medium hover:border-accent/60"
        >
          Back to katas
        </button>
      </div>
    </div>
  )
}
