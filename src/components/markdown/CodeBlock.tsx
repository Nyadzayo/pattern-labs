import { Highlight, themes } from 'prism-react-renderer'
import { useAppState } from '@/lib/useAppState'

interface CodeBlockProps {
  code: string
  language?: string
  /** 1-based line numbers to highlight (e.g. the active pseudocode line). */
  highlightLines?: number[]
  showLineNumbers?: boolean
}

export function CodeBlock({
  code,
  language = 'python',
  highlightLines,
  showLineNumbers = false,
}: CodeBlockProps) {
  const { theme } = useAppState()
  const prismTheme = theme === 'dark' ? themes.nightOwl : themes.github
  const marked = new Set(highlightLines ?? [])
  return (
    <Highlight code={code} language={language} theme={prismTheme}>
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${className} overflow-x-auto rounded-lg border border-edge p-4 text-[13px] leading-relaxed`}
          style={{ ...style, backgroundColor: theme === 'dark' ? 'rgb(10 12 16)' : 'rgb(250 250 252)' }}
        >
          {tokens.map((line, i) => {
            const lineProps = getLineProps({ line })
            const active = marked.has(i + 1)
            return (
              <div
                key={i}
                {...lineProps}
                className={`${lineProps.className ?? ''} ${
                  active ? '-mx-4 border-l-2 border-accent bg-accent/10 px-4' : ''
                }`}
              >
                {showLineNumbers && (
                  <span className="mr-4 inline-block w-6 select-none text-right text-ink-faint">
                    {i + 1}
                  </span>
                )}
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            )
          })}
        </pre>
      )}
    </Highlight>
  )
}
