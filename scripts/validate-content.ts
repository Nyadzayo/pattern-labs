/**
 * Content validator. Usage:
 *
 *   npx tsx scripts/validate-content.ts                 # validate every module file present
 *   npx tsx scripts/validate-content.ts two-pointers    # validate specific module(s)
 *
 * Checks the schema contract (counts, shapes, kinds) and then executes each
 * problem's reference solution against all of its test cases using system
 * python3, with the same comparison semantics as the in-browser judge
 * (JSON round-trip, 1e-6 float tolerance, optional multiset compare).
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULE_IDS, VISUALIZER_IDS } from '../src/content/types'
import type { ModuleContent } from '../src/content/types'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODULES_DIR = join(ROOT, 'src', 'content', 'modules')

const errors: string[] = []
const warnings: string[] = []

function err(id: string, msg: string) {
  errors.push(`[${id}] ${msg}`)
}
function warn(id: string, msg: string) {
  warnings.push(`[${id}] ${msg}`)
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter(Boolean).length
}

function validateSchema(mod: ModuleContent, expectedId: string) {
  const id = expectedId
  if (mod.id !== expectedId) err(id, `id is "${mod.id}", expected "${expectedId}"`)
  if (!(MODULE_IDS as readonly string[]).includes(mod.id)) err(id, `unknown module id`)
  if (!(VISUALIZER_IDS as readonly string[]).includes(mod.visualizer))
    err(id, `unknown visualizer "${mod.visualizer}"`)

  const words = wordCount(mod.concept)
  if (words < 550 || words > 1200)
    err(id, `concept is ${words} words; expected 600–1000 (tolerance 550–1200)`)

  if (mod.realWorldUses.length < 2 || mod.realWorldUses.length > 3)
    err(id, `realWorldUses has ${mod.realWorldUses.length} entries; expected 2–3`)

  if (mod.problems.length < 3 || mod.problems.length > 10)
    err(id, `has ${mod.problems.length} problems; expected 3–10`)

  const problemIds = new Set<string>()
  for (const p of mod.problems) {
    const pid = `${id}/${p.id}`
    if (problemIds.has(p.id)) err(pid, 'duplicate problem id')
    problemIds.add(p.id)
    if (!['easy', 'medium', 'hard'].includes(p.difficulty)) err(pid, `bad difficulty`)
    if (p.examples.length < 2 || p.examples.length > 4)
      err(pid, `${p.examples.length} examples; expected 2–4`)
    if (p.hints.length !== 3) err(pid, `${p.hints.length} hints; expected exactly 3`)
    if (p.constraints.length < 1) err(pid, 'no constraints listed')
    if (p.testCases.length < 6 || p.testCases.length > 10)
      err(pid, `${p.testCases.length} test cases; expected 6–10`)
    const visible = p.testCases.filter((t) => !t.hidden).length
    const hidden = p.testCases.filter((t) => t.hidden).length
    if (visible < 2) err(pid, `only ${visible} visible test cases; need ≥2 for the Run button`)
    if (hidden < 2) err(pid, `only ${hidden} hidden test cases; need ≥2 for Submit`)
    if (!p.starterCode.includes(`def ${p.functionName}(`))
      err(pid, `starterCode does not define "def ${p.functionName}("`)
    if (!p.solution.code.includes(`def ${p.functionName}(`))
      err(pid, `solution does not define "def ${p.functionName}("`)
    if (!p.solution.commentary.trim()) err(pid, 'solution commentary is empty')
    if (!p.solution.complexity.trim()) err(pid, 'solution complexity is empty')
    if (wordCount(p.statement) < 40) warn(pid, 'statement seems very short')
  }

  if (mod.quiz.length !== 8) err(id, `quiz has ${mod.quiz.length} questions; expected exactly 8`)
  const kinds = new Set(mod.quiz.map((q) => q.kind))
  for (const k of ['conceptual', 'complexity', 'scenario'] as const) {
    if (!kinds.has(k)) warn(id, `quiz has no "${k}" question`)
  }
  const qids = new Set<string>()
  for (const q of mod.quiz) {
    const qid = `${id}/quiz/${q.id}`
    if (qids.has(q.id)) err(qid, 'duplicate quiz id')
    qids.add(q.id)
    if (q.choices.length < 3 || q.choices.length > 5)
      err(qid, `${q.choices.length} choices; expected 3–5`)
    if (q.correctIndex < 0 || q.correctIndex >= q.choices.length)
      err(qid, `correctIndex ${q.correctIndex} out of range`)
    if (!q.explanation.trim()) err(qid, 'missing explanation')
  }

  if (mod.flashcards.length !== 10)
    err(id, `has ${mod.flashcards.length} flashcards; expected exactly 10`)
  const cids = new Set<string>()
  for (const c of mod.flashcards) {
    if (cids.has(c.id)) err(`${id}/card/${c.id}`, 'duplicate flashcard id')
    cids.add(c.id)
  }

  if (!mod.cheatSheet.tldr.trim()) err(id, 'cheatSheet.tldr is empty')
  if (mod.cheatSheet.signals.length < 3) err(id, 'cheatSheet.signals needs ≥3 bullets')
  if (!mod.cheatSheet.template.trim()) err(id, 'cheatSheet.template is empty')
}

/**
 * Run every reference solution against its test cases with python3. The
 * comparison mirrors the browser judge: JSON round-trip, floats compared
 * with 1e-6 tolerance, multiset compare when `unordered`.
 */
const PY_HARNESS = `
import json, sys, math

def normalize(v):
    if isinstance(v, tuple):
        return [normalize(x) for x in v]
    if isinstance(v, list):
        return [normalize(x) for x in v]
    if isinstance(v, dict):
        return {str(k): normalize(x) for k, x in v.items()}
    if isinstance(v, set):
        return sorted([normalize(x) for x in v], key=lambda e: json.dumps(e))
    if isinstance(v, float) and v == int(v) and abs(v) < 1e15:
        return v
    return v

def eq(a, b):
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b if isinstance(a, bool) and isinstance(b, bool) else False
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(a, b, rel_tol=1e-6, abs_tol=1e-9)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(eq(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(eq(a[k], b[k]) for k in a)
    return a == b

def eq_unordered(a, b):
    if not (isinstance(a, list) and isinstance(b, list) and len(a) == len(b)):
        return False
    used = [False] * len(b)
    for x in a:
        found = False
        for i, y in enumerate(b):
            if not used[i] and eq(x, y):
                used[i] = True
                found = True
                break
        if not found:
            return False
    return True

payload = json.load(sys.stdin)
ns = {}
exec(payload["code"], ns)
fn = ns[payload["functionName"]]
results = []
for case in payload["cases"]:
    try:
        out = normalize(fn(*case["input"]))
        expected = normalize(case["expected"])
        ok = eq_unordered(out, expected) if case.get("unordered") else eq(out, expected)
        results.append({"ok": ok, "got": repr(out) if not ok else None})
    except Exception as e:
        results.append({"ok": False, "got": f"{type(e).__name__}: {e}"})
print(json.dumps(results))
`

function runSolutions(mod: ModuleContent) {
  for (const p of mod.problems) {
    const pid = `${mod.id}/${p.id}`
    const payload = JSON.stringify({
      code: p.solution.code,
      functionName: p.functionName,
      cases: p.testCases,
    })
    let stdout: string
    try {
      stdout = execFileSync('python3', ['-c', PY_HARNESS], {
        input: payload,
        encoding: 'utf-8',
        timeout: 30_000,
      })
    } catch (e) {
      err(pid, `reference solution crashed the harness: ${(e as Error).message.slice(0, 300)}`)
      continue
    }
    let results: { ok: boolean; got: string | null }[]
    try {
      results = JSON.parse(stdout.trim())
    } catch {
      err(pid, `harness produced unparseable output: ${stdout.slice(0, 200)}`)
      continue
    }
    results.forEach((r, i) => {
      if (!r.ok) {
        const c = p.testCases[i]
        err(
          pid,
          `reference solution FAILS case ${i}${c.label ? ` (${c.label})` : ''}: input=${JSON.stringify(c.input)} expected=${JSON.stringify(c.expected)} got=${r.got}`,
        )
      }
    })
  }
}

async function main() {
  const requested = process.argv.slice(2)
  const ids = requested.length ? requested : [...MODULE_IDS]
  let validated = 0

  for (const id of ids) {
    const file = join(MODULES_DIR, `${id}.ts`)
    if (!existsSync(file)) {
      if (requested.length) err(id, `no content file at src/content/modules/${id}.ts`)
      continue
    }
    let mod: ModuleContent
    try {
      const imported = await import(file)
      mod = imported.default
      if (!mod || typeof mod !== 'object') throw new Error('default export is not an object')
    } catch (e) {
      err(id, `failed to import: ${(e as Error).message}`)
      continue
    }
    validateSchema(mod, id)
    runSolutions(mod)
    validated++
  }

  for (const w of warnings) console.log(`WARN  ${w}`)
  for (const e of errors) console.log(`ERROR ${e}`)
  console.log(
    `\n${validated} module(s) validated: ${errors.length} error(s), ${warnings.length} warning(s)`,
  )
  process.exit(errors.length ? 1 : 0)
}

void main()
