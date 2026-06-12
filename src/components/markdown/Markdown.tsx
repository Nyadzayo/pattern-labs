import type { ReactElement, ReactNode } from 'react'
import { isValidElement } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { CodeBlock } from './CodeBlock'

/** Matches complexity notation like O(n log n), Θ(n²), Ω(1), O(V + E). */
const COMPLEXITY_RE = /^[OΘΩo]\([^()]{1,30}(\([^()]*\))?[^()]{0,30}\)$/

function ComplexityChip({ text }: { text: string }) {
  return (
    <span className="mx-0.5 inline-block rounded-md bg-accent-soft/70 px-1.5 py-px font-mono text-[0.85em] font-medium text-accent dark:text-indigo-300">
      {text}
    </span>
  )
}

function InlineCode({ children }: { children?: ReactNode }) {
  const text = String(children ?? '')
  if (COMPLEXITY_RE.test(text.trim())) return <ComplexityChip text={text.trim()} />
  return (
    <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.875em] text-ink">
      {children}
    </code>
  )
}

/** react-markdown v9 wraps block code in <pre><code class="language-x">. */
function PreBlock({ children }: { children?: ReactNode }) {
  if (isValidElement(children)) {
    const codeEl = children as ReactElement<{ className?: string; children?: ReactNode }>
    const cls = codeEl.props.className ?? ''
    const lang = /language-(\w+)/.exec(cls)?.[1] ?? 'python'
    const text = String(codeEl.props.children ?? '').replace(/\n$/, '')
    return (
      <div className="my-4">
        <CodeBlock code={text} language={lang} />
      </div>
    )
  }
  return <pre>{children}</pre>
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-pattern-lab max-w-none text-[15px] leading-7 text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mb-3 mt-8 text-xl font-semibold tracking-tight" {...p} />,
          h2: (p) => <h2 className="mb-3 mt-8 text-lg font-semibold tracking-tight" {...p} />,
          h3: (p) => <h3 className="mb-2 mt-6 text-base font-semibold" {...p} />,
          p: (p) => <p className="my-3" {...p} />,
          ul: (p) => <ul className="my-3 list-disc space-y-1.5 pl-6" {...p} />,
          ol: (p) => <ol className="my-3 list-decimal space-y-1.5 pl-6" {...p} />,
          li: (p) => <li className="pl-1" {...p} />,
          strong: (p) => <strong className="font-semibold text-ink" {...p} />,
          blockquote: (p) => (
            <blockquote
              className="my-4 border-l-2 border-accent/60 bg-accent-soft/20 py-1 pl-4 italic text-ink-muted"
              {...p}
            />
          ),
          table: (p) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          th: (p) => (
            <th className="border-b-2 border-edge px-3 py-2 text-left font-semibold" {...p} />
          ),
          td: (p) => <td className="border-b border-edge px-3 py-2 align-top" {...p} />,
          a: (p) => <a className="text-accent underline underline-offset-2" {...p} />,
          code: InlineCode,
          pre: PreBlock,
          hr: () => <hr className="my-6 border-edge" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
