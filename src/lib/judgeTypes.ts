/**
 * Message protocol between the UI and the Pyodide judge worker.
 * Comparison semantics must stay in sync with scripts/validate-content.ts.
 */
import type { TestCase } from '@/content'

export interface RunRequest {
  type: 'run'
  id: number
  code: string
  functionName: string
  cases: TestCase[]
}

export interface WarmupRequest {
  type: 'warmup'
}

export type JudgeRequest = RunRequest | WarmupRequest

export interface CaseResult {
  /** Did the case pass? */
  ok: boolean
  /** JSON of the (normalized) returned value, or a repr string on failure. */
  got: string
  /** Python exception text, if the call raised. */
  error?: string
  /** Captured stdout (truncated). */
  stdout?: string
  /** Wall-clock milliseconds for this case. */
  ms: number
}

export interface ReadyMessage {
  type: 'ready'
}

export interface ResultMessage {
  type: 'result'
  id: number
  results: CaseResult[]
  /** Set when the submission itself failed to exec (syntax error etc.). */
  setupError?: string
}

export type JudgeResponse = ReadyMessage | ResultMessage

/** UI-facing judge status. */
export type JudgeStatus = 'cold' | 'loading' | 'ready' | 'running'

export const RUN_TIMEOUT_MS = 5_000
