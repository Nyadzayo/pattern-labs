/** Read-only monospace code block with an optional highlighted line. */
export function CodeView({
  code,
  markedLine,
  className = '',
}: {
  code: string
  markedLine?: number
  className?: string
}) {
  const lines = code.split('\n')
  return (
    <pre
      className={`overflow-x-auto rounded-xl border border-edge bg-surface-sunken p-4 font-mono text-[13px] leading-6 text-ink ${className}`}
    >
      <code>
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              i === markedLine
                ? '-mx-2 rounded bg-accent/15 px-2 ring-1 ring-inset ring-accent/40'
                : undefined
            }
          >
            {line === '' ? ' ' : line}
          </div>
        ))}
      </code>
    </pre>
  )
}
