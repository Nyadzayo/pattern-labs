import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getModuleContent, getModuleMeta, MODULE_IDS } from '@/content'
import type { Difficulty, ModuleContent, ModuleId, ModuleMeta } from '@/content'
import { useAppState } from '@/lib/useAppState'
import { markConceptRead, setLastVisited } from '@/lib/storage'
import { Markdown } from '@/components/markdown/Markdown'
import { VisualizerHost } from '@/components/visualizers/VisualizerHost'
import { QuizTab } from '@/components/quiz/QuizTab'
import { FlashcardsTab } from '@/components/flashcards/FlashcardsTab'
import { primitivesForModule } from '@/content/primitives/registry'

export const MODULE_TABS = ['learn', 'visualize', 'practice', 'quiz', 'flashcards'] as const
export type ModuleTab = (typeof MODULE_TABS)[number]

const TAB_LABELS: Record<ModuleTab, string> = {
  learn: 'Learn',
  visualize: 'Visualize',
  practice: 'Practice',
  quiz: 'Quiz',
  flashcards: 'Flashcards',
}

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  easy: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hard: 'bg-red-500/10 text-red-500',
}

export function ModulePage() {
  const { moduleId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const valid = MODULE_IDS.includes(moduleId as ModuleId)
  const meta = valid ? getModuleMeta(moduleId as ModuleId) : undefined
  const content = valid ? getModuleContent(moduleId as ModuleId) : undefined

  const rawTab = searchParams.get('tab') ?? 'learn'
  const tab: ModuleTab = (MODULE_TABS as readonly string[]).includes(rawTab)
    ? (rawTab as ModuleTab)
    : 'learn'

  useEffect(() => {
    if (meta) setLastVisited(meta.id, tab)
  }, [meta, tab])

  if (!meta) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <h1 className="text-2xl font-semibold">Module not found</h1>
        <p className="mt-2 text-sm text-ink-muted">No module with id “{moduleId}”.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <div className="text-xs tabular-nums text-ink-faint">Module {meta.order}</div>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{meta.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{meta.blurb}</p>

      {!content ? (
        <div className="mt-8 rounded-xl border border-dashed border-edge p-8 text-center text-sm text-ink-muted">
          Content for this module is coming in Phase 6.
        </div>
      ) : (
        <>
          <div className="no-print mt-6 flex gap-1 border-b border-edge">
            {MODULE_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setSearchParams({ tab: t })}
                className={`-mb-px border-b-2 px-4 py-2 text-sm transition-colors ${
                  tab === t
                    ? 'border-accent font-medium text-ink'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
            <div className="flex-1" />
            <Link
              to={`/cheatsheet/${meta.id}`}
              className="self-center px-2 pb-1 text-xs text-ink-faint hover:text-accent"
            >
              Cheat sheet →
            </Link>
          </div>

          <div className="py-6">
            {tab === 'learn' && <LearnTab meta={meta} content={content} />}
            {tab === 'visualize' && <VisualizerHost id={content.visualizer} />}
            {tab === 'practice' && <PracticeTab meta={meta} content={content} />}
            {tab === 'quiz' && <QuizTab moduleId={meta.id} />}
            {tab === 'flashcards' && <FlashcardsTab moduleId={meta.id} />}
          </div>
        </>
      )}
    </div>
  )
}

function LearnTab({ meta, content }: { meta: ModuleMeta; content: ModuleContent }) {
  const state = useAppState()
  const read = !!state.conceptRead[meta.id]
  const primitives = primitivesForModule(meta.id)
  return (
    <div>
      <Markdown>{content.concept}</Markdown>

      <h2 className="mb-3 mt-10 text-lg font-semibold tracking-tight">In the wild</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {content.realWorldUses.map((use) => (
          <div key={use.title} className="rounded-xl border border-edge bg-surface-raised p-4">
            <div className="text-sm font-medium">{use.title}</div>
            <div className="mt-1 text-sm leading-6 text-ink-muted">{use.description}</div>
          </div>
        ))}
      </div>

      {primitives.length > 0 && (
        <div className="no-print mt-10">
          <h2 className="mb-1 text-lg font-semibold tracking-tight">Primitives used here</h2>
          <p className="mb-3 text-sm text-ink-muted">
            Drill the micro-patterns this pattern leans on, from predict up to writing them cold.
          </p>
          <div className="flex flex-wrap gap-2">
            {primitives.map((p) => {
              const prog = state.drills[p.id]
              return (
                <Link
                  key={p.id}
                  to={`/drills/${p.id}`}
                  className="group inline-flex items-center gap-2 rounded-full border border-edge bg-surface-raised px-3 py-1.5 text-sm transition-colors hover:border-accent/60"
                >
                  <span className="group-hover:text-accent">{p.name}</span>
                  {prog?.mastered ? (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">✓</span>
                  ) : prog ? (
                    <span className="text-[11px] text-ink-faint">r{Math.min(6, Math.max(1, Math.round(prog.rung)))}</span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="no-print mt-10 flex justify-center">
        <button
          onClick={() => markConceptRead(meta.id)}
          disabled={read}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
            read
              ? 'cursor-default bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-accent text-white hover:opacity-90'
          }`}
        >
          {read ? '✓ Marked as read' : 'Mark concept as read'}
        </button>
      </div>
    </div>
  )
}

function PracticeTab({ meta, content }: { meta: ModuleMeta; content: ModuleContent }) {
  const state = useAppState()
  return (
    <div className="space-y-3">
      {content.problems.map((p, idx) => {
        const progress = state.problems[`${meta.id}/${p.id}`]
        const status = progress?.status
        return (
          <Link
            key={p.id}
            to={`/module/${meta.id}/problem/${p.id}`}
            className="group flex items-center gap-4 rounded-xl border border-edge bg-surface-raised p-4 transition-colors hover:border-accent/50"
          >
            <div className="text-sm tabular-nums text-ink-faint">{idx + 1}</div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium group-hover:text-accent">{p.title}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium capitalize ${DIFFICULTY_STYLE[p.difficulty]}`}
                >
                  {p.difficulty}
                </span>
                <span className="text-ink-faint">{p.testCases.length} test cases</span>
              </div>
            </div>
            <div className="text-sm">
              {status === 'solved-clean' && (
                <span className="text-emerald-600 dark:text-emerald-400">✓ Solved</span>
              )}
              {status === 'solved-with-help' && (
                <span className="text-amber-600 dark:text-amber-400">✓ With help</span>
              )}
              {status === 'attempted' && <span className="text-ink-faint">In progress</span>}
              {!status && <span className="text-ink-faint">—</span>}
            </div>
          </Link>
        )
      })}
    </div>
  )
}
