/**
 * Code Katas catalog. A kata reuses a primitive's write-rung solution as its
 * reference code (no new authoring), so the catalog is just an index of which
 * primitives are kata-eligible plus an optional par-time override. All 40
 * primitives are eligible, in manifest order. Resolved against the primitives
 * registry by `src/lib/katas.ts`.
 */
import { MANIFEST_IDS } from '../primitives/manifest'

export interface KataEntry {
  /** Primitive id whose write-rung solution is the kata's reference code. */
  primitiveId: string
  /** Optional par time (seconds). Defaults to the primitive's write-rung parSeconds. */
  parSeconds?: number
}

/**
 * Per-kata par overrides. Empty by default — the write-rung parSeconds is a fine
 * target for blank-page recall (recall + type). Tune individual katas here.
 */
const PAR_OVERRIDES: Record<string, number> = {}

/** Every primitive is kata-eligible, in manifest order. */
export const KATA_ENTRIES: KataEntry[] = MANIFEST_IDS.map((id) => ({
  primitiveId: id,
  parSeconds: PAR_OVERRIDES[id],
}))
