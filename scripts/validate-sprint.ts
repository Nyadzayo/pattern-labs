/**
 * Pattern Sprint validator. Usage:
 *
 *   npx tsx scripts/validate-sprint.ts          # validate every registered stem
 *   npx tsx scripts/validate-sprint.ts --full   # also require per-module coverage
 *
 * Stems are data only (no code execution), so the checks are static invariants:
 *   - unique kebab id
 *   - non-empty text (1–3 sentences; warns if very long)
 *   - `pattern` is a real ModuleId
 *   - 2–3 `lookalikes`, each a real ModuleId, distinct, and never equal to `pattern`
 *   - non-empty `tell`
 * `--full` additionally requires every one of the 19 modules to have ≥ MIN_PER_MODULE stems.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULE_IDS } from '../src/content/types'
import type { ModuleId } from '../src/content/types'
import type { SprintStem } from '../src/content/sprint/types'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SPRINT_INDEX = join(ROOT, 'src', 'content', 'sprint', 'index.ts')

const MIN_PER_MODULE = 3
const MAX_TEXT = 360 // ~3 sentences; longer reads as a wall of text under a 10s timer

const errors: string[] = []
const warnings: string[] = []
const err = (id: string, msg: string) => errors.push(`[${id}] ${msg}`)
const warn = (id: string, msg: string) => warnings.push(`[${id}] ${msg}`)

const MODULES = new Set<ModuleId>(MODULE_IDS as readonly ModuleId[])
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

function validateStem(s: SprintStem, seen: Set<string>): void {
  const id = s.id ?? '(missing id)'
  if (!s.id || !ID_RE.test(s.id)) err(id, 'id must be a non-empty kebab-case string')
  if (seen.has(s.id)) err(id, `duplicate stem id "${s.id}"`)
  seen.add(s.id)

  if (!s.text || !s.text.trim()) err(id, 'text is empty')
  else if (s.text.length > MAX_TEXT) warn(id, `text is ${s.text.length} chars (keep it to 1–3 sentences)`)

  if (!MODULES.has(s.pattern)) err(id, `pattern "${s.pattern}" is not a known module`)

  if (!Array.isArray(s.lookalikes) || s.lookalikes.length < 2 || s.lookalikes.length > 3) {
    err(id, `lookalikes must have 2–3 entries (got ${s.lookalikes?.length ?? 0})`)
  } else {
    const ls = new Set<ModuleId>()
    for (const l of s.lookalikes) {
      if (!MODULES.has(l)) err(id, `lookalike "${l}" is not a known module`)
      if (l === s.pattern) err(id, `lookalike "${l}" must not equal the correct pattern`)
      if (ls.has(l)) err(id, `duplicate lookalike "${l}"`)
      ls.add(l)
    }
  }

  if (!s.tell || !s.tell.trim()) err(id, 'tell is empty')
}

async function main() {
  const full = process.argv.slice(2).includes('--full')

  let stems: SprintStem[]
  try {
    const mod = await import(SPRINT_INDEX)
    stems = (mod.allStems as () => SprintStem[])()
  } catch (e) {
    console.log(`ERROR [load] failed to import the sprint catalog: ${(e as Error).message}`)
    process.exit(1)
  }

  const seen = new Set<string>()
  const perModule = new Map<ModuleId, number>()
  for (const s of stems) {
    validateStem(s, seen)
    if (MODULES.has(s.pattern)) perModule.set(s.pattern, (perModule.get(s.pattern) ?? 0) + 1)
  }

  const uncovered = (MODULE_IDS as readonly ModuleId[]).filter(
    (m) => (perModule.get(m) ?? 0) < MIN_PER_MODULE,
  )
  if (uncovered.length) {
    const line = `module(s) with < ${MIN_PER_MODULE} stems: ${uncovered
      .map((m) => `${m}(${perModule.get(m) ?? 0})`)
      .join(', ')}`
    if (full) err('coverage', line)
    else warn('coverage', line)
  }

  for (const w of warnings) console.log(`WARN  ${w}`)
  for (const e of errors) console.log(`ERROR ${e}`)
  console.log(
    `\n${stems.length} stem(s) across ${perModule.size} module(s): ` +
      `${errors.length} error(s), ${warnings.length} warning(s)`,
  )
  process.exit(errors.length ? 1 : 0)
}

main()
