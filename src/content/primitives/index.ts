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
import tpFastSlow from './items/tp-fast-slow'
import swExpandRight from './items/sw-expand-right'
import swShrinkLeft from './items/sw-shrink-left'
import swLengthMath from './items/sw-length-math'
import swFreqMap from './items/sw-freq-map'
import hashCountDefault from './items/hash-count-default'
import hashSeenSet from './items/hash-seen-set'
import hashComplementLookup from './items/hash-complement-lookup'
import trieDescendChildren from './items/trie-descend-children'
import bsLoHiInit from './items/bs-lo-hi-init'
import bsMidOverflowSafe from './items/bs-mid-overflow-safe'
import bsBoundaryCondition from './items/bs-boundary-condition'
import bsInsertionPoint from './items/bs-insertion-point'
import stackPushPopMatch from './items/stack-push-pop-match'
import stackMonotonicPop from './items/stack-monotonic-pop'
import queueBfsLevelSize from './items/queue-bfs-level-size'
import heapPushPopK from './items/heap-push-pop-k'
import recDfsCombine from './items/rec-dfs-combine'
import recBacktrackChoose from './items/rec-backtrack-choose'
import dpTableInit from './items/dp-table-init'
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
registerPrimitive(tpFastSlow)
registerPrimitive(swExpandRight)
registerPrimitive(swShrinkLeft)
registerPrimitive(swLengthMath)
registerPrimitive(swFreqMap)
registerPrimitive(hashCountDefault)
registerPrimitive(hashSeenSet)
registerPrimitive(hashComplementLookup)
registerPrimitive(trieDescendChildren)
registerPrimitive(bsLoHiInit)
registerPrimitive(bsMidOverflowSafe)
registerPrimitive(bsBoundaryCondition)
registerPrimitive(bsInsertionPoint)
registerPrimitive(stackPushPopMatch)
registerPrimitive(stackMonotonicPop)
registerPrimitive(queueBfsLevelSize)
registerPrimitive(heapPushPopK)
registerPrimitive(recDfsCombine)
registerPrimitive(recBacktrackChoose)
registerPrimitive(dpTableInit)
registerPrimitive(arrPrefixSumBuild)
