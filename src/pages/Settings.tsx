import { useRef, useState } from 'react'
import { useAppState } from '@/lib/useAppState'
import {
  exportStateJson,
  importStateJson,
  resetAllProgress,
  setTheme,
} from '@/lib/storage'

export function Settings() {
  const state = useAppState()
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [confirmingReset, setConfirmingReset] = useState(false)

  function downloadBackup() {
    const blob = new Blob([exportStateJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pattern-lab-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ kind: 'ok', text: 'Backup downloaded.' })
  }

  async function onImportFile(file: File) {
    const text = await file.text()
    const error = importStateJson(text)
    setMessage(
      error
        ? { kind: 'error', text: error }
        : { kind: 'ok', text: 'Backup imported. Your progress has been restored.' },
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
          Appearance
        </h2>
        <div className="mt-3 flex gap-2">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`rounded-lg border px-4 py-2 text-sm capitalize transition-colors ${
                state.theme === t
                  ? 'border-accent bg-accent-soft/60 font-medium'
                  : 'border-edge bg-surface-raised text-ink-muted hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">Backup</h2>
        <p className="mt-2 text-sm text-ink-muted">
          All progress lives in this browser&apos;s localStorage. Export a JSON backup before
          clearing browser data or moving machines.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={downloadBackup}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Export backup
          </button>
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-lg border border-edge bg-surface-raised px-4 py-2 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onImportFile(f)
              e.target.value = ''
            }}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-faint">
          Danger zone
        </h2>
        {confirmingReset ? (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/5 p-4">
            <p className="text-sm">
              This erases all progress, quiz history, flashcard schedules, and code drafts.
              There is no undo. Export a backup first?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  resetAllProgress()
                  setConfirmingReset(false)
                  setMessage({ kind: 'ok', text: 'All progress has been reset.' })
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Yes, erase everything
              </button>
              <button
                onClick={() => setConfirmingReset(false)}
                className="rounded-lg border border-edge px-4 py-2 text-sm text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingReset(true)}
            className="mt-3 rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-500 transition-colors hover:bg-red-500/10"
          >
            Reset all progress
          </button>
        )}
      </section>

      {message && (
        <div
          className={`mt-6 rounded-lg border p-3 text-sm ${
            message.kind === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
              : 'border-red-500/40 bg-red-500/5 text-red-500'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
