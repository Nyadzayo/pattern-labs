/**
 * Content entry point. Importing this file loads every written module's
 * content into the registry.
 */
import { registerModule } from './registry'
import twoPointers from './modules/two-pointers'
import hashMapsSets from './modules/hash-maps-sets'
import linkedLists from './modules/linked-lists'
import fastSlowPointers from './modules/fast-slow-pointers'
import slidingWindows from './modules/sliding-windows'
import binarySearch from './modules/binary-search'
import stacks from './modules/stacks'
import heaps from './modules/heaps'
import intervals from './modules/intervals'
import prefixSums from './modules/prefix-sums'
import trees from './modules/trees'
import tries from './modules/tries'
import graphs from './modules/graphs'
import backtracking from './modules/backtracking'
import dynamicProgramming from './modules/dynamic-programming'
import greedy from './modules/greedy'
import sortSearch from './modules/sort-search'
import bitManipulation from './modules/bit-manipulation'
import mathGeometry from './modules/math-geometry'

export * from './types'
export * from './registry'

// The full 19-module curriculum, in order.
registerModule(twoPointers)
registerModule(hashMapsSets)
registerModule(linkedLists)
registerModule(fastSlowPointers)
registerModule(slidingWindows)
registerModule(binarySearch)
registerModule(stacks)
registerModule(heaps)
registerModule(intervals)
registerModule(prefixSums)
registerModule(trees)
registerModule(tries)
registerModule(graphs)
registerModule(backtracking)
registerModule(dynamicProgramming)
registerModule(greedy)
registerModule(sortSearch)
registerModule(bitManipulation)
registerModule(mathGeometry)
