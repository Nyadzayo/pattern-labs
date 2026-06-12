interface ProgressRingProps {
  /** 0..1 */
  fraction: number
  size?: number
  strokeWidth?: number
  className?: string
}

export function ProgressRing({ fraction, size = 22, strokeWidth = 2.5, className }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(1, fraction))
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const dash = circumference * clamped
  const done = clamped >= 0.999
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-edge"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference - dash}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className={done ? 'stroke-emerald-500' : 'stroke-accent'}
      />
      {done && (
        <path
          d={`M ${size * 0.32} ${size * 0.52} l ${size * 0.12} ${size * 0.12} l ${size * 0.24} ${size * -0.26}`}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-emerald-500"
        />
      )}
    </svg>
  )
}
