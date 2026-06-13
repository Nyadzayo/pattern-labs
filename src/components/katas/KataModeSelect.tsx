import type { KataMode } from './KataEndScreen'

export interface KataModeDef {
  mode: KataMode
  title: string
  blurb: string
  enabled: boolean
}

interface KataModeSelectProps {
  modes: KataModeDef[]
  onPick: (mode: KataMode) => void
}

export function KataModeSelect({ modes, onPick }: KataModeSelectProps) {
  return (
    <div className="grid gap-3">
      {modes.map((m) => (
        <button
          key={m.mode}
          disabled={!m.enabled}
          onClick={() => onPick(m.mode)}
          className={`group flex items-center justify-between rounded-2xl border p-5 text-left transition-colors ${
            m.enabled
              ? 'border-edge bg-surface-raised hover:border-accent/60'
              : 'border-edge bg-surface-raised opacity-50'
          }`}
        >
          <div>
            <div className="font-semibold group-hover:text-accent">{m.title}</div>
            <div className="mt-1 text-sm text-ink-muted">{m.blurb}</div>
          </div>
          {!m.enabled && (
            <span className="shrink-0 pl-4 text-xs uppercase tracking-wider text-ink-faint">soon</span>
          )}
        </button>
      ))}
    </div>
  )
}
