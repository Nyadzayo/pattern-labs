import { useEffect, useSyncExternalStore } from 'react'
import { CONFIDENCE_LABELS, type ConfidenceLevel } from '@/lib/calibration'
import { subscribeConfidence, currentAsk, answerConfidence, dismissConfidence } from '@/lib/confidence'

const BLURB: Record<string, string> = {
  quiz: 'How sure are you of this answer?',
  solution: 'Before you peek — could you solve this yourself?',
  kata: 'How sure are you this will pass?',
  subgoal: 'How sure are you of these labels?',
}

/**
 * App-root host for the 1-tap confidence picker. Renders a small modal whenever a
 * caller is awaiting `askConfidence`. Picking (or dismissing) resolves the promise
 * so the caller proceeds. Mounted once near the app root.
 */
export function ConfidenceHost() {
  const ask = useSyncExternalStore(subscribeConfidence, currentAsk, currentAsk)

  useEffect(() => {
    if (!ask) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismissConfidence()
      else if (e.key >= '1' && e.key <= '4') answerConfidence((Number(e.key) - 1) as ConfidenceLevel)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ask])

  if (!ask) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={dismissConfidence}
    >
      <div
        className="w-[min(92vw,380px)] rounded-2xl border border-edge bg-surface-raised p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-semibold text-ink">{BLURB[ask.surface] ?? 'How confident are you?'}</p>
        <p className="mt-0.5 text-xs text-ink-faint">One tap — we compare it to how you actually do.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {CONFIDENCE_LABELS.map((label, level) => (
            <button
              key={label}
              onClick={() => answerConfidence(level as ConfidenceLevel)}
              className="rounded-xl border border-edge bg-surface px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:bg-accent/10"
            >
              <span className="mr-1.5 text-[11px] text-ink-faint">{level + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={dismissConfidence}
          className="mt-3 w-full text-center text-xs text-ink-faint transition-colors hover:text-ink-muted"
        >
          skip
        </button>
      </div>
    </div>
  )
}
