import { Link } from 'react-router-dom'
import { MODULES, getModuleMeta, hasContent } from '@/content'
import type { ModuleId } from '@/content'
import { useAppState } from '@/lib/useAppState'
import { moduleProgress, overallProgress, weakestModule } from '@/lib/progress'
import { dueCardCount } from '@/lib/sm2'
import { dueDrillCount } from '@/lib/drills'
import { dueStemCount } from '@/lib/sprint'
import { dailyWarmup, warmupDoneToday } from '@/lib/warmup'
import { ProgressRing } from '@/components/shell/ProgressRing'
import { CalibrationCard } from '@/components/calibration/CalibrationCard'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-edge bg-surface-raised p-4">
      <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-ink-muted">{sub}</div>}
    </div>
  )
}

export function Dashboard() {
  const state = useAppState()
  const overall = overallProgress(state)
  const weakest = weakestModule(state)
  const weakestMeta = weakest ? getModuleMeta(weakest) : undefined
  const due = dueCardCount(state)
  const dueDrills = dueDrillCount(state)
  const warmupDone = warmupDoneToday(state)
  const warmupCount = dailyWarmup(state).length
  const last = state.lastVisited
  const lastMeta = last ? getModuleMeta(last.moduleId as ModuleId) : undefined

  return (
    <div className="mx-auto max-w-5xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Nineteen patterns. Learn the shape, watch it move, then make it yours.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Overall progress" value={`${Math.round(overall * 100)}%`} />
        <StatCard
          label="Streak"
          value={state.streak.count > 0 ? `${state.streak.count} day${state.streak.count === 1 ? '' : 's'}` : '—'}
          sub={state.streak.count > 0 ? 'Keep it alive' : 'Start today'}
        />
        <StatCard
          label="Cards due"
          value={String(due)}
          sub={due > 0 ? 'Review below' : 'All caught up'}
        />
        <StatCard
          label="Problems solved"
          value={String(
            Object.values(state.problems).filter(
              (p) => p.status === 'solved-clean' || p.status === 'solved-with-help',
            ).length,
          )}
        />
      </div>

      {warmupDone ? (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-edge bg-surface-raised px-6 py-5">
          <div>
            <div className="font-semibold">Daily Warm-up ✓</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Done today — consistency over cramming. Back tomorrow.
            </div>
          </div>
          <Link to="/warmup" className="text-sm text-accent">
            Run again
          </Link>
        </div>
      ) : (
        <Link
          to="/warmup"
          className="group mt-6 flex items-center justify-between rounded-2xl border border-accent/40 bg-accent-soft/30 px-6 py-5 transition-colors hover:border-accent/70"
        >
          <div>
            <div className="font-semibold group-hover:text-accent">Daily Warm-up</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              {warmupCount} mixed reps — a Sprint card, a kata, a drill, and a flashcard. 5 minutes.
            </div>
          </div>
          <span className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white">Start</span>
        </Link>
      )}

      <div className="mt-6">
        <CalibrationCard />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {lastMeta && (
          <Link
            to={`/module/${lastMeta.id}?tab=${last!.tab}`}
            className="group rounded-xl border border-edge bg-surface-raised p-5 transition-colors hover:border-accent/50"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Continue where you left off
            </div>
            <div className="mt-2 font-medium group-hover:text-accent">{lastMeta.title}</div>
            <div className="mt-0.5 text-sm capitalize text-ink-muted">{last!.tab} tab</div>
          </Link>
        )}
        {weakestMeta && (
          <Link
            to={`/module/${weakestMeta.id}`}
            className="group rounded-xl border border-edge bg-surface-raised p-5 transition-colors hover:border-accent/50"
          >
            <div className="text-xs font-medium uppercase tracking-wider text-ink-faint">
              Needs attention
            </div>
            <div className="mt-2 font-medium group-hover:text-accent">{weakestMeta.title}</div>
            <div className="mt-0.5 text-sm text-ink-muted">
              Lowest blend of quiz score and solve rate
            </div>
          </Link>
        )}
        <div className="flex flex-col gap-2">
          <Link
            to="/review"
            className="flex flex-1 items-center justify-between rounded-xl border border-edge bg-surface-raised px-5 transition-colors hover:border-accent/50"
          >
            <span className="font-medium">Review due cards</span>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-semibold tabular-nums">
              {due}
            </span>
          </Link>
          <Link
            to="/drills"
            className="flex flex-1 items-center justify-between rounded-xl border border-edge bg-surface-raised px-5 transition-colors hover:border-accent/50"
          >
            <span className="font-medium">Daily Drill</span>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-semibold tabular-nums">
              {dueDrills}
            </span>
          </Link>
          <Link
            to="/sprint"
            className="flex flex-1 items-center justify-between rounded-xl border border-edge bg-surface-raised px-5 transition-colors hover:border-accent/50"
          >
            <span className="font-medium">Pattern Sprint</span>
            <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-sm font-semibold tabular-nums">
              {dueStemCount(state)}
            </span>
          </Link>
          <Link
            to="/katas"
            className="flex flex-1 items-center justify-between rounded-xl border border-edge bg-surface-raised px-5 transition-colors hover:border-accent/50"
          >
            <span className="font-medium">Code Katas</span>
            <span className="text-sm text-ink-muted">type it</span>
          </Link>
          <Link
            to="/mock"
            className="flex flex-1 items-center justify-between rounded-xl border border-edge bg-surface-raised px-5 transition-colors hover:border-accent/50"
          >
            <span className="font-medium">Mock interview</span>
            <span className="text-sm text-ink-muted">45 min</span>
          </Link>
        </div>
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-ink-faint">
        Curriculum
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const p = moduleProgress(state, m.id)
          const ready = hasContent(m.id)
          return (
            <Link
              key={m.id}
              to={`/module/${m.id}`}
              className={`group rounded-xl border border-edge bg-surface-raised p-4 transition-colors hover:border-accent/50 ${
                ready ? '' : 'pointer-events-none opacity-45'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs tabular-nums text-ink-faint">Module {m.order}</div>
                  <div className="mt-0.5 font-medium group-hover:text-accent">{m.title}</div>
                </div>
                <ProgressRing fraction={p.fraction} size={28} strokeWidth={3} />
              </div>
              <div className="mt-2 text-xs text-ink-muted">{ready ? m.blurb : 'Coming soon'}</div>
              {ready && (
                <div className="mt-2 text-xs tabular-nums text-ink-faint">
                  {p.problemsSolved}/{p.problemsTotal} problems
                  {p.bestQuizScore !== null &&
                    ` · quiz ${Math.round(p.bestQuizScore * 100)}%`}
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
