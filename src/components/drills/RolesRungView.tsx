import { Fragment, useState } from 'react'
import type { RolesRung } from '@/content/primitives/types'
import { checkRoles } from '@/lib/drillCheckers'
import type { RungViewProps } from './rungProps'

/** Rung 5 — Roles: assign each marked variable/expression its semantic role. */
export function RolesRungView({ rung, phase, revealed, onSubmit }: RungViewProps<RolesRung>) {
  const [assign, setAssign] = useState<Record<string, string>>({})
  const locked = phase === 'feedback'
  const correctRole = (id: string) => rung.slots.find((s) => s.id === id)?.correctRole

  const allAssigned = rung.slots.every((s) => assign[s.id])

  function set(id: string, role: string) {
    if (!locked) setAssign((a) => ({ ...a, [id]: role }))
  }
  function check() {
    if (!locked && allAssigned) onSubmit(checkRoles(rung, assign))
  }

  return (
    <div>
      <pre className="overflow-x-auto rounded-xl border border-edge bg-surface-sunken p-4 font-mono text-[13px] leading-8 text-ink">
        <code>
          {rung.lines.map((line, lineIdx) => {
            // Split on ⟦id⟧ markers; capturing group puts ids on odd indices.
            const parts = line.split(/⟦([^⟧]+)⟧/)
            return (
              <div key={lineIdx}>
                {parts.map((part, p) => {
                  if (p % 2 === 0) return <span key={p}>{part}</span>
                  const id = part
                  const ok = locked && assign[id] === correctRole(id)
                  return (
                    <select
                      key={p}
                      value={assign[id] ?? ''}
                      disabled={locked}
                      onChange={(e) => set(id, e.target.value)}
                      className={`mx-0.5 rounded border bg-surface-raised px-1 py-0.5 font-mono text-[12px] ${
                        locked
                          ? ok
                            ? 'border-emerald-500/60 text-emerald-600 dark:text-emerald-400'
                            : 'border-red-500/60 text-red-600 dark:text-red-400'
                          : 'border-accent/50 text-ink'
                      }`}
                    >
                      <option value="" disabled>
                        role…
                      </option>
                      {rung.roleBank.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  )
                })}
              </div>
            )
          })}
        </code>
      </pre>

      {!locked && (
        <button
          onClick={check}
          disabled={!allAssigned}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Check roles
        </button>
      )}

      {revealed && (
        <div className="mt-3 space-y-1 text-xs text-ink-muted">
          {rung.slots.map((s) => (
            <Fragment key={s.id}>
              <span className="font-mono text-ink">{s.correctRole}</span>
              {' was the right role.'}
              <br />
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}
