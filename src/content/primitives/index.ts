/**
 * Self-registering Primitives Lab catalog. Each item file default-exports a
 * `Primitive`; importing this module registers them all. Mirrors
 * `src/content/index.ts` for modules.
 */
import { registerPrimitive } from './registry'

import loopForwardIndex from './items/loop-forward-index'
import tpOppositeEnds from './items/tp-opposite-ends'
import hashCountDefault from './items/hash-count-default'
import bsMidOverflowSafe from './items/bs-mid-overflow-safe'
import arrPrefixSumBuild from './items/arr-prefix-sum-build'

export * from './types'
export * from './registry'
export * from './manifest'

registerPrimitive(loopForwardIndex)
registerPrimitive(tpOppositeEnds)
registerPrimitive(hashCountDefault)
registerPrimitive(bsMidOverflowSafe)
registerPrimitive(arrPrefixSumBuild)
