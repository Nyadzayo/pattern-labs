import { Link, useParams } from 'react-router-dom'
import { getModuleContent, getModuleMeta, MODULE_IDS } from '@/content'
import type { ModuleId } from '@/content'
import { Markdown } from '@/components/markdown/Markdown'
import { CodeBlock } from '@/components/markdown/CodeBlock'

/** Print-friendly one-pager: pattern, signals, template, complexity. */
export function CheatSheetPage() {
  const { moduleId } = useParams()
  const valid = MODULE_IDS.includes(moduleId as ModuleId)
  const meta = valid ? getModuleMeta(moduleId as ModuleId) : undefined
  const content = valid ? getModuleContent(moduleId as ModuleId) : undefined

  if (!meta || !content) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-8">
        <h1 className="text-2xl font-semibold">Cheat sheet unavailable</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {meta ? 'This module has no content yet.' : `No module with id “${moduleId}”.`}
        </p>
      </div>
    )
  }

  const cs = content.cheatSheet
  const skeleton = content.problems.find(
    (p) => p.solution.subgoals && p.solution.subgoals.length > 0,
  )?.solution.subgoals
  return (
    <div className="mx-auto max-w-3xl px-8 py-8 print:max-w-none print:px-0 print:py-0">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link to={`/module/${meta.id}`} className="text-sm text-ink-muted hover:text-accent">
          ← {meta.title}
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-lg border border-edge bg-surface-raised px-4 py-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          Print
        </button>
      </div>

      <div className="rounded-xl border border-edge bg-surface-raised p-6 print:border-0 print:p-0">
        <div className="text-xs uppercase tracking-wider text-ink-faint">
          Pattern Lab cheat sheet · Module {meta.order}
        </div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{meta.title}</h1>

        <h2 className="mt-5 text-sm font-semibold uppercase tracking-wider text-ink-faint">
          The pattern
        </h2>
        <p className="mt-1.5 text-[15px] leading-7">{cs.tldr}</p>

        <h2 className="mt-5 text-sm font-semibold uppercase tracking-wider text-ink-faint">
          Reach for it when
        </h2>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[15px] leading-6">
          {cs.signals.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>

        <h2 className="mt-5 text-sm font-semibold uppercase tracking-wider text-ink-faint">
          Template
        </h2>
        <div className="mt-1.5">
          <CodeBlock code={cs.template} />
        </div>

        {skeleton && (
          <>
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-wider text-ink-faint">
              Structure skeleton
            </h2>
            <p className="mt-1 text-xs text-ink-faint">
              The transferable shape — the roles, in order, that this pattern always follows.
            </p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[15px] leading-6">
              {skeleton.map((s, i) => (
                <li key={i}>{s.referenceLabel}</li>
              ))}
            </ol>
          </>
        )}

        <h2 className="mt-5 text-sm font-semibold uppercase tracking-wider text-ink-faint">
          Complexity
        </h2>
        <div className="mt-1.5 text-[15px]">
          <Markdown>{cs.complexity}</Markdown>
        </div>

        <h2 className="mt-5 text-sm font-semibold uppercase tracking-wider text-ink-faint">
          In the wild
        </h2>
        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-6 text-ink-muted">
          {content.realWorldUses.map((u) => (
            <li key={u.title}>
              <span className="font-medium text-ink">{u.title}.</span> {u.description}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
