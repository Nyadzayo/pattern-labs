/**
 * Tiny inline trend sparkline from a series of numbers. Normalizes to its own
 * min/max so any metric (WPM, accuracy, time) reads as a shape. The last point
 * is emphasized. Generalizes the quiz-history sparkline.
 */
interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  ariaLabel?: string
}

export function Sparkline({ values, width = 120, height = 32, ariaLabel }: SparklineProps) {
  if (values.length === 0) return null
  const pad = 4
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const points = values.map((v, i) => {
    const x = values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * (width - 2 * pad)
    const y = pad + (1 - (v - min) / span) * (height - 2 * pad)
    return { x, y }
  })
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="shrink-0 text-accent"
      role="img"
      aria-label={ariaLabel ?? `Trend across ${values.length} points`}
    >
      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.8}
        />
      )}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i === points.length - 1 ? 2.5 : 2}
          fill="currentColor"
          opacity={i === points.length - 1 ? 1 : 0.55}
        />
      ))}
    </svg>
  )
}
