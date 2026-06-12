/**
 * Main-thread judge manager. Owns the Pyodide worker, enforces the
 * 5-second run timeout (Pyodide can't be preempted, so timeout =
 * terminate + respawn), and exposes a status stream for the UI.
 */
import type { TestCase } from '@/content'
import {
  RUN_TIMEOUT_MS,
  type CaseResult,
  type JudgeResponse,
  type JudgeStatus,
} from './judgeTypes'

export interface RunOutcome {
  results: CaseResult[]
  setupError?: string
  timedOut: boolean
}

type StatusListener = (status: JudgeStatus) => void

let worker: Worker | null = null
let status: JudgeStatus = 'cold'
let nextRunId = 1
const statusListeners = new Set<StatusListener>()

function setStatus(s: JudgeStatus): void {
  status = s
  statusListeners.forEach((l) => l(s))
}

export function judgeStatus(): JudgeStatus {
  return status
}

export function onJudgeStatus(listener: StatusListener): () => void {
  statusListeners.add(listener)
  return () => statusListeners.delete(listener)
}

function spawnWorker(): Worker {
  const w = new Worker(new URL('../worker/pyJudge.worker.ts', import.meta.url), {
    type: 'module',
  })
  return w
}

/** Pre-load Pyodide so the first Run doesn't stall. Safe to call repeatedly. */
export function warmupJudge(): void {
  if (worker) return
  setStatus('loading')
  worker = spawnWorker()
  const w = worker
  w.addEventListener('message', (e: MessageEvent<JudgeResponse>) => {
    if (e.data.type === 'ready' && worker === w) setStatus('ready')
  })
  w.addEventListener('error', () => {
    if (worker === w) {
      worker = null
      setStatus('cold')
    }
  })
  w.postMessage({ type: 'warmup' })
}

/**
 * Run a submission against test cases. Resolves (never rejects) with the
 * outcome; on timeout the worker is killed and respawned cold.
 */
export function runJudge(
  code: string,
  functionName: string,
  cases: TestCase[],
): Promise<RunOutcome> {
  if (!worker) warmupJudge()
  const w = worker!
  const id = nextRunId++
  setStatus('running')

  return new Promise<RunOutcome>((resolve) => {
    const timer = setTimeout(() => {
      w.removeEventListener('message', onMessage)
      w.terminate()
      worker = null
      setStatus('cold')
      warmupJudge() // start re-warming for the next attempt
      resolve({ results: [], timedOut: true })
    }, RUN_TIMEOUT_MS)

    function onMessage(e: MessageEvent<JudgeResponse>) {
      if (e.data.type !== 'result' || e.data.id !== id) return
      clearTimeout(timer)
      w.removeEventListener('message', onMessage)
      setStatus('ready')
      resolve({ results: e.data.results, setupError: e.data.setupError, timedOut: false })
    }

    w.addEventListener('message', onMessage)
    w.postMessage({ type: 'run', id, code, functionName, cases })
  })
}

// Dev hook so the judge can be exercised from the browser console / CDP.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).__judge = { runJudge, warmupJudge, judgeStatus }
}
