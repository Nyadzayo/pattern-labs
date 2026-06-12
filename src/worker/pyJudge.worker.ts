/**
 * Pyodide judge worker. Loads Pyodide from the CDN (the app's only network
 * dependency), execs the user's submission once, then runs each test case,
 * comparing with the same semantics as scripts/validate-content.ts.
 *
 * The 5-second timeout is enforced by the main thread (src/lib/judge.ts)
 * terminating this worker — Pyodide cannot be preempted from inside.
 */
import type { JudgeRequest, ResultMessage } from '@/lib/judgeTypes'

const PYODIDE_VERSION = '0.26.4'
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

interface PyodideLike {
  runPython(code: string): unknown
  globals: { set(name: string, value: unknown): void }
}

let pyodidePromise: Promise<PyodideLike> | null = null

function loadPyodideOnce(): Promise<PyodideLike> {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      const mod = await import(/* @vite-ignore */ `${PYODIDE_BASE}pyodide.mjs`)
      const py: PyodideLike = await mod.loadPyodide({ indexURL: PYODIDE_BASE })
      // Pre-compile the harness once.
      py.runPython(HARNESS)
      return py
    })()
  }
  return pyodidePromise
}

/**
 * Python harness. normalize/eq/eq_unordered mirror the validator script.
 * Receives the payload as a JSON string; returns a JSON string of results.
 */
const HARNESS = `
import json, math, sys, time, io, contextlib

def _normalize(v):
    if isinstance(v, tuple) or isinstance(v, list):
        return [_normalize(x) for x in v]
    if isinstance(v, dict):
        return {str(k): _normalize(x) for k, x in v.items()}
    if isinstance(v, set):
        return sorted([_normalize(x) for x in v], key=lambda e: json.dumps(e))
    return v

def _eq(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b if isinstance(a, bool) and isinstance(b, bool) else False
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(a, b, rel_tol=1e-6, abs_tol=1e-9)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_eq(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_eq(a[k], b[k]) for k in a)
    return a == b

def _eq_unordered(a, b):
    if not (isinstance(a, list) and isinstance(b, list) and len(a) == len(b)):
        return False
    used = [False] * len(b)
    for x in a:
        hit = False
        for i, y in enumerate(b):
            if not used[i] and _eq(x, y):
                used[i] = True
                hit = True
                break
        if not hit:
            return False
    return True

def _run_judge(payload_json):
    payload = json.loads(payload_json)
    out = {"results": [], "setupError": None}
    ns = {}
    try:
        exec(payload["code"], ns)
        fn = ns.get(payload["functionName"])
        if not callable(fn):
            out["setupError"] = f"Function '{payload['functionName']}' is not defined. Keep the starter function name."
            return json.dumps(out)
    except BaseException as e:
        out["setupError"] = f"{type(e).__name__}: {e}"
        return json.dumps(out)

    for case in payload["cases"]:
        buf = io.StringIO()
        t0 = time.perf_counter()
        try:
            with contextlib.redirect_stdout(buf):
                got = fn(*case["input"])
            ms = (time.perf_counter() - t0) * 1000
            got_n = _normalize(got)
            exp_n = _normalize(case["expected"])
            ok = _eq_unordered(got_n, exp_n) if case.get("unordered") else _eq(got_n, exp_n)
            try:
                got_s = json.dumps(got_n)
            except (TypeError, ValueError):
                got_s = repr(got)
                ok = False
            out["results"].append({
                "ok": ok, "got": got_s, "ms": ms,
                "stdout": buf.getvalue()[:1000],
            })
        except BaseException as e:
            ms = (time.perf_counter() - t0) * 1000
            out["results"].append({
                "ok": False, "got": "", "error": f"{type(e).__name__}: {e}", "ms": ms,
                "stdout": buf.getvalue()[:1000],
            })
    return json.dumps(out)
`

self.onmessage = async (event: MessageEvent<JudgeRequest>) => {
  const msg = event.data
  if (msg.type === 'warmup') {
    await loadPyodideOnce()
    self.postMessage({ type: 'ready' })
    return
  }
  if (msg.type === 'run') {
    const py = await loadPyodideOnce()
    let response: ResultMessage
    try {
      py.globals.set('payload_json', JSON.stringify({
        code: msg.code,
        functionName: msg.functionName,
        cases: msg.cases,
      }))
      const raw = py.runPython('_run_judge(payload_json)') as string
      const parsed = JSON.parse(raw) as {
        results: ResultMessage['results']
        setupError: string | null
      }
      response = {
        type: 'result',
        id: msg.id,
        results: parsed.results,
        setupError: parsed.setupError ?? undefined,
      }
    } catch (e) {
      response = {
        type: 'result',
        id: msg.id,
        results: [],
        setupError: e instanceof Error ? e.message : String(e),
      }
    }
    self.postMessage(response)
  }
}
