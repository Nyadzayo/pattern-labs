import { NavLink } from 'react-router-dom'
import { MODULES, hasContent } from '@/content'
import { useAppState } from '@/lib/useAppState'
import { moduleProgress } from '@/lib/progress'
import { ProgressRing } from './ProgressRing'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
    isActive
      ? 'bg-accent-soft/60 text-ink font-medium'
      : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
  }`

export function Sidebar() {
  const state = useAppState()
  return (
    <aside className="no-print flex h-full w-64 shrink-0 flex-col border-r border-edge bg-surface-raised">
      <NavLink to="/" className="flex items-center gap-2 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-base font-bold text-white">
          λ
        </span>
        <span className="text-base font-semibold tracking-tight">Pattern Lab</span>
      </NavLink>

      <nav className="flex flex-col gap-0.5 px-2 pb-2">
        <NavLink to="/" end className={navItemClass}>
          Dashboard
        </NavLink>
        <NavLink to="/drills" className={navItemClass}>
          Primitives Lab
        </NavLink>
        <NavLink to="/sprint" className={navItemClass}>
          Pattern Sprint
        </NavLink>
        <NavLink to="/katas" className={navItemClass}>
          Code Katas
        </NavLink>
        <NavLink to="/mock" className={navItemClass}>
          Mock interview
        </NavLink>
        <NavLink to="/decide" className={navItemClass}>
          Which pattern?
        </NavLink>
        <NavLink to="/settings" className={navItemClass}>
          Settings
        </NavLink>
      </nav>

      <div className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        Modules
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {MODULES.map((m) => {
          const p = moduleProgress(state, m.id)
          const ready = hasContent(m.id)
          return (
            <NavLink
              key={m.id}
              to={`/module/${m.id}`}
              className={({ isActive }) =>
                `${navItemClass({ isActive })} ${ready ? '' : 'opacity-45'}`
              }
            >
              <ProgressRing fraction={p.fraction} className="shrink-0" />
              <span className="truncate">
                <span className="mr-1.5 tabular-nums text-ink-faint">{m.order}.</span>
                {m.title}
              </span>
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}
