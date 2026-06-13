/**
 * Self-registering Primitives Lab catalog. Each item file default-exports a
 * `Primitive`; importing this module registers them all. Mirrors
 * `src/content/index.ts` for modules.
 */
import { registerPrimitive } from './registry'

import loopForwardIndex from './items/loop-forward-index'
import loopReverseIndex from './items/loop-reverse-index'
import loopNestedPairs from './items/loop-nested-pairs'
import loopWhileCompound from './items/loop-while-compound'
import loopAndAHalf from './items/loop-and-a-half'
import loopBitScan from './items/loop-bit-scan'
import stateAccumulatorIdentity from './items/state-accumulator-identity'
import stateBestSoFar from './items/state-best-so-far'
import stateSwap from './items/state-swap'
import stateMultiAssignAdvance from './items/state-multi-assign-advance'
import stateVisitedSet from './items/state-visited-set'
import stateXorAccumulate from './items/state-xor-accumulate'
import tpOppositeEnds from './items/tp-opposite-ends'
import tpReaderWriter from './items/tp-reader-writer'
import hashCountDefault from './items/hash-count-default'
import bsMidOverflowSafe from './items/bs-mid-overflow-safe'
import arrPrefixSumBuild from './items/arr-prefix-sum-build'

export * from './types'
export * from './registry'
export * from './manifest'

registerPrimitive(loopForwardIndex)
registerPrimitive(loopReverseIndex)
registerPrimitive(loopNestedPairs)
registerPrimitive(loopWhileCompound)
registerPrimitive(loopAndAHalf)
registerPrimitive(loopBitScan)
registerPrimitive(stateAccumulatorIdentity)
registerPrimitive(stateBestSoFar)
registerPrimitive(stateSwap)
registerPrimitive(stateMultiAssignAdvance)
registerPrimitive(stateVisitedSet)
registerPrimitive(stateXorAccumulate)
registerPrimitive(tpOppositeEnds)
registerPrimitive(tpReaderWriter)
registerPrimitive(hashCountDefault)
registerPrimitive(bsMidOverflowSafe)
registerPrimitive(arrPrefixSumBuild)
