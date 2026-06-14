import { useState } from 'react'
import type { ModuleContent, ModuleMeta } from '@/content'
import { recordFirstAttempt } from '@/lib/storage'
import { Markdown } from '@/components/markdown/Markdown'
import { CodeEditor } from '@/components/practice/CodeEditor'

/**
 * Productive-failure gate shown the first time a module is opened. Presents one
 * representative problem to attempt BEFORE instruction unlocks — getting stuck
 * primes the learner so the lesson lands on prepared ground. Captures whatever
 * they write (it is expected to be incomplete or wrong — that is the point) and
 * never blocks: a "skip, just teach me" escape is always present. No judging.
 */
export function FirstAttemptGate({ meta, content }: { meta: ModuleMeta; content: ModuleContent }) {
  const problem = content.problems[0]
  const [code, setCode] = useState(problem.starterCode)

  function gaveItAGo() {
    recordFirstAttempt(meta.id, { attemptCode: code, skipped: false })
  }
  function skip() {
    recordFirstAttempt(meta.id, { attemptCode: '', skipped: true })
  }

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-accent/40 bg-accent-soft/20 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Try it first</p>
        <h2 className="mt-1 text-lg font-semibold">Before the lesson — give this a real shot.</h2>
        <p className="mt-1 text-sm leading-6 text-ink-muted">
          You’re not expected to get it. Struggling with the problem first is what makes the
          explanation stick — so sketch whatever you can, even a wrong start. Then we’ll teach it,
          and show your attempt next to the worked approach.
        </p>
      </div>

      <div className="mt-5 rounded-xl border border-edge bg-surface-raised p-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{problem.title}</h3>
          <span className="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] text-ink-muted">
            {problem.difficulty}
          </span>
        </div>
        <div className="prose-tight mt-2 text-sm">
          <Markdown>{problem.statement}</Markdown>
        </div>
        {problem.examples[0] && (
          <div className="mt-3 rounded-lg border border-edge bg-surface-sunken p-3 font-mono text-xs">
            <div>Input: {problem.examples[0].input}</div>
            <div>Output: {problem.examples[0].output}</div>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-edge">
        <div className="min-h-[200px] p-3">
          <CodeEditor initialDoc={code} docKey={`firstattempt:${meta.id}`} onChange={setCode} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={gaveItAGo}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          I gave it a go → teach me
        </button>
        <button
          onClick={skip}
          className="text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          Skip, just teach me
        </button>
      </div>
    </div>
  )
}
