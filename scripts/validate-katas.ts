/**
 * Code Katas validator. Usage:
 *
 *   npx tsx scripts/validate-katas.ts
 *
 * A kata's reference code IS a primitive's write-rung solution — already
 * compiled and executed against its test cases by validate-primitives. So this
 * is a light wiring check: every KATA_ENTRY must resolve to a registered
 * primitive whose write rung has a function name, a solution, and test cases.
 * Warns when a kata's code exceeds the 3–15 line typing-snippet guideline.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { KATA_ENTRIES } from '../src/content/katas'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PRIMITIVES_INDEX = join(ROOT, 'src', 'content', 'primitives', 'index.ts')

const MAX_LINES = 15
const errors: string[] = []
const warnings: string[] = []

async function main() {
  // Importing the index self-registers every primitive into the shared registry.
  let getPrimitive: (id: string) => unknown
  try {
    const mod = await import(PRIMITIVES_INDEX)
    getPrimitive = mod.getPrimitive as (id: string) => unknown
  } catch (e) {
    console.log(`ERROR [load] failed to import the primitives catalog: ${(e as Error).message}`)
    process.exit(1)
  }

  const seen = new Set<string>()
  for (const entry of KATA_ENTRIES) {
    const id = entry.primitiveId
    if (seen.has(id)) errors.push(`[${id}] duplicate kata entry`)
    seen.add(id)

    const p = getPrimitive(id) as
      | { rungs?: { kind?: string; functionName?: string; solution?: string; testCases?: unknown[] }[] }
      | undefined
    if (!p) {
      errors.push(`[${id}] no registered primitive with this id`)
      continue
    }
    const w = p.rungs?.[5]
    if (!w || w.kind !== 'write') {
      errors.push(`[${id}] primitive has no write rung (rung 6)`)
      continue
    }
    if (!w.functionName) errors.push(`[${id}] write rung has no functionName`)
    if (!w.solution || !w.solution.trim()) errors.push(`[${id}] write rung has no solution`)
    if (!Array.isArray(w.testCases) || w.testCases.length < 4) {
      errors.push(`[${id}] write rung needs ≥4 test cases (got ${w.testCases?.length ?? 0})`)
    }
    if (entry.parSeconds !== undefined && entry.parSeconds <= 0) {
      errors.push(`[${id}] parSeconds override must be > 0`)
    }
    const lines = (w.solution ?? '').split('\n').filter((l) => l.trim() !== '').length
    if (lines > MAX_LINES) {
      warnings.push(`[${id}] solution is ${lines} lines (typing katas read best at ≤ ${MAX_LINES})`)
    }
  }

  for (const w of warnings) console.log(`WARN  ${w}`)
  for (const e of errors) console.log(`ERROR ${e}`)
  console.log(
    `\n${KATA_ENTRIES.length} kata(s): ${errors.length} error(s), ${warnings.length} warning(s)`,
  )
  process.exit(errors.length ? 1 : 0)
}

main()
