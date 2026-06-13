/**
 * Primitives Lab validator. Usage:
 *
 *   npx tsx scripts/validate-primitives.ts            # validate every authored primitive
 *   npx tsx scripts/validate-primitives.ts <id> ...   # validate specific primitive(s)
 *   npx tsx scripts/validate-primitives.ts --full     # also require full manifest + module coverage
 *
 * Static checks: schema shape, 6 rungs in order, marked-line bounds, predict
 * correctIndex/distractor parity, order/fade distractor ids, cloze blanks, roles
 * bank, fade blank tokens, per-primitive misconception coverage, manifest orphans.
 *
 * Execution checks (what makes the answer keys trustworthy — system python3):
 *   - Reconstruct order/fade/cloze from the *correct* answer and assert it equals
 *     the canonical `snippet` (whitespace-normalized) and that the snippet compiles.
 *   - Predict: run `verify.setup` + `snippet`, the result must equal choices[correctIndex].
 *   - Write: the reference `solution` must pass all of its `testCases`.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULE_IDS } from '../src/content/types'
import type { ModuleId, TestCase } from '../src/content/types'
import { CLOZE_BLANK } from '../src/content/primitives/types'
import type {
  ClozeRung,
  FadeRung,
  OrderRung,
  Primitive,
  PredictRung,
  RolesRung,
  RungKind,
} from '../src/content/primitives/types'
import { PRIMITIVE_MANIFEST, MANIFEST_IDS } from '../src/content/primitives/manifest'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ITEMS_DIR = join(ROOT, 'src', 'content', 'primitives', 'items')

const errors: string[] = []
const warnings: string[] = []
const err = (id: string, msg: string) => errors.push(`[${id}] ${msg}`)
const warn = (id: string, msg: string) => warnings.push(`[${id}] ${msg}`)

const RUNG_ORDER: RungKind[] = ['predict', 'order', 'fade', 'cloze', 'roles', 'write']

/** trim trailing whitespace per line + drop blank lines; leading indent preserved. */
function norm(code: string): string {
  return code
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim() !== '')
    .join('\n')
}

function reconstructOrder(lines: { text: string; indent: number }[]): string {
  return lines.map((l) => '    '.repeat(l.indent) + l.text).join('\n')
}

function reconstructCloze(rung: ClozeRung): string {
  return rung.lines
    .map((line, i) => {
      let out = line
      for (const b of rung.blanks.filter((x) => x.lineIndex === i)) {
        out = out.replace(CLOZE_BLANK, b.accept[0] ?? '')
      }
      return out
    })
    .join('\n')
}

// ── Python harness: one call per primitive (compile + predict + write-judge) ──

const PY_HARNESS = `
import json, sys, math, io, contextlib

def normalize(v):
    if isinstance(v, tuple): return [normalize(x) for x in v]
    if isinstance(v, list): return [normalize(x) for x in v]
    if isinstance(v, dict): return {str(k): normalize(x) for k, x in v.items()}
    if isinstance(v, set): return sorted([normalize(x) for x in v], key=lambda e: json.dumps(e))
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
    if not (isinstance(a, list) and isinstance(b, list) and len(a) == len(b)): return False
    used = [False] * len(b)
    for x in a:
        ok = False
        for i, y in enumerate(b):
            if not used[i] and eq(x, y):
                used[i] = True; ok = True; break
        if not ok: return False
    return True

def do_compile(code):
    try:
        compile(code, "<primitive>", "exec")
        return {"ok": True, "error": None}
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}

def do_predict(p):
    if p is None: return None
    ns = {}
    src = (p.get("setup") or "") + "\\n" + p["snippet"]
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(src, ns)
        mode = p["mode"]
        if mode == "stdout":
            value = buf.getvalue().strip()
        else:
            value = str(eval(mode["expr"], ns))
        return {"value": value}
    except Exception as e:
        return {"error": f"{type(e).__name__}: {e}"}

def do_write(w):
    if w is None: return None
    ns = {}
    try:
        exec(w["code"], ns)
        fn = ns[w["functionName"]]
    except Exception as e:
        return {"setupError": f"{type(e).__name__}: {e}", "results": []}
    results = []
    for case in w["cases"]:
        try:
            out = normalize(fn(*case["input"]))
            expected = normalize(case["expected"])
            ok = eq_unordered(out, expected) if case.get("unordered") else eq(out, expected)
            results.append({"ok": ok, "got": None if ok else repr(out)})
        except Exception as e:
            results.append({"ok": False, "got": f"{type(e).__name__}: {e}"})
    return {"setupError": None, "results": results}

payload = json.load(sys.stdin)
print(json.dumps({
    "compile": do_compile(payload["compile"]),
    "predict": do_predict(payload.get("predict")),
    "write": do_write(payload.get("write")),
}))
`

interface PyResult {
  compile: { ok: boolean; error: string | null }
  predict: { value: string } | { error: string } | null
  write: { setupError: string | null; results: { ok: boolean; got: string | null }[] } | null
}

function runPython(payload: unknown): PyResult | null {
  try {
    const stdout = execFileSync('python3', ['-c', PY_HARNESS], {
      input: JSON.stringify(payload),
      encoding: 'utf-8',
      timeout: 30_000,
    })
    return JSON.parse(stdout.trim())
  } catch (e) {
    return { compile: { ok: false, error: `harness crashed: ${(e as Error).message.slice(0, 200)}` }, predict: null, write: null }
  }
}

// ── Static + execution checks per primitive ──────────────────────────────────

function validatePrimitive(p: Primitive, expectedId: string): void {
  const id = expectedId
  if (p.id !== expectedId) err(id, `id is "${p.id}", expected "${expectedId}" (filename)`)

  const entry = PRIMITIVE_MANIFEST.find((e) => e.id === p.id)
  if (!entry) err(id, `not in manifest (orphan) — add it to manifest.ts or remove the file`)
  else {
    if (p.category !== entry.category) err(id, `category "${p.category}" != manifest "${entry.category}"`)
    if (JSON.stringify([...p.moduleTags].sort()) !== JSON.stringify([...entry.moduleTags].sort()))
      err(id, `moduleTags differ from manifest`)
  }

  for (const t of p.moduleTags) {
    if (!(MODULE_IDS as readonly string[]).includes(t)) err(id, `unknown moduleTag "${t}"`)
  }

  // 6 rungs in order.
  if (p.rungs.length !== 6) err(id, `has ${p.rungs.length} rungs; expected exactly 6`)
  p.rungs.forEach((r, i) => {
    if (r.kind !== RUNG_ORDER[i]) err(id, `rung ${i} is "${r.kind}"; expected "${RUNG_ORDER[i]}"`)
  })

  const snippetLines = p.snippet.split('\n')
  const declaredIds = new Set(p.misconceptions.map((m) => m.id))
  const referencedIds = new Set<string>()
  const refMis = (mid: string | null | undefined, where: string) => {
    if (!mid) return
    referencedIds.add(mid)
    if (!declaredIds.has(mid)) err(id, `${where} references unknown misconception "${mid}"`)
  }

  const [predict, order, fade, cloze, roles] = p.rungs as [
    PredictRung, OrderRung, FadeRung, ClozeRung, RolesRung, unknown,
  ]

  // Predict.
  if (predict.kind === 'predict') {
    if (predict.markedLine < 0 || predict.markedLine >= snippetLines.length)
      err(id, `predict.markedLine ${predict.markedLine} out of snippet bounds (0..${snippetLines.length - 1})`)
    if (predict.correctIndex < 0 || predict.correctIndex >= predict.choices.length)
      err(id, `predict.correctIndex out of range`)
    if (predict.distractorMisconceptions.length !== predict.choices.length)
      err(id, `predict.distractorMisconceptions length != choices length`)
    if (predict.distractorMisconceptions[predict.correctIndex] != null)
      warn(id, `predict.distractorMisconceptions[correctIndex] should be null`)
    predict.distractorMisconceptions.forEach((m) => refMis(m, 'predict'))
  }

  // Order.
  if (order.kind === 'order') {
    const recon = reconstructOrder(order.lines)
    if (norm(recon) !== norm(p.snippet)) err(id, `order rung does not reconstruct to snippet`)
    if (order.distractors.length < 1) warn(id, `order rung has no distractor trap lines`)
    order.distractors.forEach((d) => refMis(d.misconceptionId, 'order distractor'))
  }

  // Fade.
  if (fade.kind === 'fade') {
    const recon = reconstructOrder(fade.lines)
    if (norm(recon) !== norm(p.snippet)) err(id, `fade rung does not reconstruct to snippet`)
    fade.distractors.forEach((d) => refMis(d.misconceptionId, 'fade distractor'))
    fade.blanks.forEach((b, i) => {
      if (b.lineIndex < 0 || b.lineIndex >= fade.lines.length)
        err(id, `fade blank ${i} lineIndex out of range`)
      else if (!fade.lines[b.lineIndex].text.includes(b.token))
        err(id, `fade blank ${i}: line does not contain token "${b.token}"`)
      if (!b.options.includes(b.token)) err(id, `fade blank ${i}: token not among options`)
      for (const v of Object.values(b.misconceptionByOption ?? {})) refMis(v, `fade blank ${i}`)
    })
  }

  // Cloze.
  if (cloze.kind === 'cloze') {
    const recon = reconstructCloze(cloze)
    if (norm(recon) !== norm(p.snippet)) err(id, `cloze rung does not reconstruct to snippet`)
    cloze.blanks.forEach((b, i) => {
      if (b.lineIndex < 0 || b.lineIndex >= cloze.lines.length)
        err(id, `cloze blank ${i} lineIndex out of range`)
      else if (!cloze.lines[b.lineIndex].includes(CLOZE_BLANK))
        err(id, `cloze blank ${i}: line ${b.lineIndex} has no "${CLOZE_BLANK}" sentinel`)
      if (!b.accept || b.accept.length === 0) err(id, `cloze blank ${i}: accept[] is empty`)
      for (const v of Object.values(b.misconceptionByInput ?? {})) refMis(v, `cloze blank ${i}`)
    })
  }

  // Roles.
  if (roles.kind === 'roles') {
    const bank = new Set(roles.roleBank)
    const correctRoles = new Set(roles.slots.map((s) => s.correctRole))
    roles.slots.forEach((s) => {
      if (!bank.has(s.correctRole)) err(id, `roles slot "${s.id}" correctRole not in roleBank`)
    })
    if (roles.roleBank.length <= correctRoles.size)
      err(id, `roles roleBank has no distractor roles`)
  }

  // Per-primitive misconception coverage: every declared id referenced ≥1×.
  for (const m of p.misconceptions) {
    if (!referencedIds.has(m.id)) err(id, `misconception "${m.id}" is declared but never referenced by a rung`)
  }

  // Write rung shape.
  const write = p.rungs[5]
  if (write.kind === 'write') {
    if (!write.solution.includes(`def ${write.functionName}(`))
      err(id, `write solution does not define "def ${write.functionName}("`)
    if (!write.starterCode.includes(`def ${write.functionName}(`))
      err(id, `write starterCode does not define "def ${write.functionName}("`)
    const visible = write.testCases.filter((t) => !t.hidden).length
    const hidden = write.testCases.filter((t) => t.hidden).length
    if (visible < 2) err(id, `write rung: only ${visible} visible test cases; need ≥2`)
    if (hidden < 2) err(id, `write rung: only ${hidden} hidden test cases; need ≥2`)
  }

  // ── Execution (python) ──
  const writeRung = p.rungs[5]
  const py = runPython({
    compile: p.snippet,
    predict:
      predict.kind === 'predict'
        ? { setup: predict.verify.setup ?? '', snippet: p.snippet, mode: predict.verify.mode }
        : null,
    write:
      writeRung.kind === 'write'
        ? { code: writeRung.solution, functionName: writeRung.functionName, cases: writeRung.testCases as TestCase[] }
        : null,
  })
  if (!py) {
    err(id, `python harness returned nothing`)
    return
  }
  if (!py.compile.ok) err(id, `snippet does not compile: ${py.compile.error}`)
  if (predict.kind === 'predict' && py.predict) {
    if ('error' in py.predict) err(id, `predict snippet crashed: ${py.predict.error}`)
    else {
      const want = predict.choices[predict.correctIndex]
      if (py.predict.value !== want)
        err(id, `predict answer key wrong: running snippet gives "${py.predict.value}" but choices[correctIndex]="${want}"`)
    }
  }
  if (writeRung.kind === 'write' && py.write) {
    if (py.write.setupError) err(id, `write solution failed to load: ${py.write.setupError}`)
    py.write.results.forEach((r, i) => {
      if (!r.ok) {
        const c = writeRung.testCases[i]
        err(id, `write solution FAILS case ${i}${c.label ? ` (${c.label})` : ''}: input=${JSON.stringify(c.input)} expected=${JSON.stringify(c.expected)} got=${r.got}`)
      }
    })
  }
}

async function main() {
  const args = process.argv.slice(2)
  const full = args.includes('--full')
  const requested = args.filter((a) => !a.startsWith('--'))
  const ids = requested.length ? requested : [...MANIFEST_IDS]

  const authored: string[] = []
  const seenIds = new Set<string>()

  for (const id of ids) {
    const file = join(ITEMS_DIR, `${id}.ts`)
    if (!existsSync(file)) {
      if (requested.length) err(id, `no file at src/content/primitives/items/${id}.ts`)
      continue
    }
    let p: Primitive
    try {
      const imported = await import(file)
      p = imported.default
      if (!p || typeof p !== 'object') throw new Error('default export is not an object')
    } catch (e) {
      err(id, `failed to import: ${(e as Error).message}`)
      continue
    }
    if (seenIds.has(p.id)) err(id, `duplicate primitive id "${p.id}"`)
    seenIds.add(p.id)
    authored.push(id)
    validatePrimitive(p, id)
  }

  // Coverage summary (and, with --full, hard requirements).
  const authoredSet = new Set(authored)
  const missing = MANIFEST_IDS.filter((m) => !authoredSet.has(m))
  const coveredModules = new Set<ModuleId>()
  for (const id of authored) {
    const entry = PRIMITIVE_MANIFEST.find((e) => e.id === id)
    entry?.moduleTags.forEach((m) => coveredModules.add(m))
  }
  const uncoveredModules = (MODULE_IDS as readonly ModuleId[]).filter((m) => !coveredModules.has(m))

  if (missing.length) {
    const line = `${missing.length} manifest primitive(s) not yet authored: ${missing.join(', ')}`
    if (full) err('coverage', line)
    else warn('coverage', line)
  }
  if (uncoveredModules.length) {
    const line = `module(s) with no authored primitive: ${uncoveredModules.join(', ')}`
    if (full) err('coverage', line)
    else warn('coverage', line)
  }

  for (const w of warnings) console.log(`WARN  ${w}`)
  for (const e of errors) console.log(`ERROR ${e}`)
  console.log(
    `\n${authored.length} primitive(s) validated (${MANIFEST_IDS.length} in manifest): ` +
      `${errors.length} error(s), ${warnings.length} warning(s)`,
  )
  process.exit(errors.length ? 1 : 0)
}

void main()
