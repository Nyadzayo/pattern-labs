import { useEffect, useMemo, useRef, useState } from 'react'
import { MODULE_IDS, MODULE_TITLES } from '@/content'
import type { ModuleId } from '@/content'
import type { SprintStem } from '@/content/sprint/types'
import { SprintCard } from '@/components/sprint/SprintCard'
import { buildOptions, seedFromId } from '@/lib/sprintScore'
import { gradeStem } from '@/lib/sprint'
import { KataTypingSurface } from '@/components/katas/KataTypingSurface'
import { codeWpm, isComplete, keystrokeAccuracy, type Keystroke } from '@/lib/kataDiff'
import { recordKataAttempt, type ResolvedKata } from '@/lib/katas'
import { DrillSession } from '@/components/drills/DrillSession'
import { CardReviewSession } from '@/components/flashcards/CardReviewSession'
import { completeWarmup, type WarmupStep } from '@/lib/warmup'

const KIND_LABEL: Record<WarmupStep['kind'], string> = {
  sprint: 'Pattern Sprint',
  kata: 'Code Kata',
  drill: 'Primitive drill',
  card: 'Flashcard',
}

function WarmupSprint({ stem, onDone }: { stem: SprintStem; onDone: () => void }) {
  const [selected, setSelected] = useState<ModuleId | null>(null)
  const [revealed, setRevealed] = useState(false)
  const options = useMemo(
    () => buildOptions(stem, MODULE_IDS as readonly ModuleId[], seedFromId(stem.id)),
    [stem],
  )
  const answer = (p: ModuleId) => {
    if (revealed) return
    setSelected(p)
    setRevealed(true)
    gradeStem(stem.id, p === stem.pattern)
  }
  return (
    <div>
      <SprintCard
        text={stem.text}
        options={options}
        selected={selected}
        correctPattern={stem.pattern}
        revealed={revealed}
        onSelect={answer}
      />
      {revealed && (
        <div className="mt-4 rounded-xl border border-edge bg-surface-raised p-4">
          <div className="flex items-center justify-between">
            <span
              className={`text-sm font-semibold ${
                selected === stem.pattern
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {selected === stem.pattern ? 'Correct' : `It's ${MODULE_TITLES[stem.pattern]}`}
            </span>
            <button
              onClick={onDone}
              className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              Next →
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            <span className="font-medium text-ink-faint">The tell: </span>
            {stem.tell}
          </p>
        </div>
      )}
    </div>
  )
}

function WarmupKata({ kata, onDone }: { kata: ResolvedKata; onDone: () => void }) {
  const startRef = useRef(0)
  const onChange = (typed: string, keys: Keystroke[]) => {
    if (startRef.current === 0 && keys.length > 0) startRef.current = performance.now()
    if (isComplete(kata.code, typed)) {
      const seconds = startRef.current > 0 ? (performance.now() - startRef.current) / 1000 : 0
      recordKataAttempt(kata.id, {
        mode: 'guided',
        seconds,
        accuracy: keystrokeAccuracy(keys),
        wpm: codeWpm(kata.code.length, seconds),
        parSeconds: kata.parSeconds,
      })
      onDone()
    }
  }
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{kata.name}</p>
      <p className="mb-2 text-xs uppercase tracking-wider text-ink-faint">
        Type it · Tab inserts spaces
      </p>
      <KataTypingSurface key={kata.id} reference={kata.code} revealPending onChange={onChange} onEscape={onDone} />
      <button onClick={onDone} className="mt-3 text-sm text-ink-faint hover:text-accent">
        Skip →
      </button>
    </div>
  )
}

export function WarmupSession({ steps, onClose }: { steps: WarmupStep[]; onClose: () => void }) {
  const [i, setI] = useState(0)
  const done = i >= steps.length

  useEffect(() => {
    if (done) completeWarmup()
  }, [done])

  if (steps.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-8 text-center">
        <p className="text-sm text-ink-muted">Nothing to warm up on yet — add some progress first.</p>
        <button onClick={onClose} className="mt-4 text-sm text-accent">
          ← Dashboard
        </button>
      </div>
    )
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Warm-up done</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {steps.length} mixed reps in the bank. Streak kept — see you tomorrow.
        </p>
        <button
          onClick={onClose}
          className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  const step = steps[i]
  const goNext = () => setI((x) => x + 1)

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="text-sm text-accent">
          ← End warm-up
        </button>
        <div className="text-sm text-ink-muted">
          <span className="font-medium text-ink">{KIND_LABEL[step.kind]}</span>
          <span className="ml-2 tabular-nums text-ink-faint">
            {i + 1}/{steps.length}
          </span>
        </div>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        <div
          className="h-full rounded-full bg-accent transition-[width]"
          style={{ width: `${(i / steps.length) * 100}%` }}
        />
      </div>

      <div className="mt-6">
        {step.kind === 'sprint' && <WarmupSprint key={i} stem={step.stem} onDone={goNext} />}
        {step.kind === 'kata' && <WarmupKata key={i} kata={step.kata} onDone={goNext} />}
        {step.kind === 'drill' && (
          <DrillSession key={i} initialItems={[step.item]} onExit={goNext} title="Warm-up drill" />
        )}
        {step.kind === 'card' && <CardReviewSession key={i} cards={[step.card]} onDone={goNext} />}
      </div>
    </div>
  )
}
