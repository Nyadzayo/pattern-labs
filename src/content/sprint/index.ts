/**
 * Self-registering Pattern Sprint catalog. Each `stems/<moduleId>.ts` file
 * default-exports a `SprintStem[]`; importing this module registers them all.
 * The orchestrator owns this wiring (one stem file per module / per agent).
 * Mirrors `src/content/primitives/index.ts`. Order follows the curriculum.
 */
import { registerStems } from './registry'

import twoPointers from './stems/two-pointers'
import hashMapsSets from './stems/hash-maps-sets'
import linkedLists from './stems/linked-lists'
import fastSlowPointers from './stems/fast-slow-pointers'
import slidingWindows from './stems/sliding-windows'
import binarySearch from './stems/binary-search'
import stacks from './stems/stacks'
import heaps from './stems/heaps'
import intervals from './stems/intervals'
import prefixSums from './stems/prefix-sums'
import trees from './stems/trees'
import tries from './stems/tries'
import graphs from './stems/graphs'
import backtracking from './stems/backtracking'
import dynamicProgramming from './stems/dynamic-programming'
import greedy from './stems/greedy'
import sortSearch from './stems/sort-search'
import bitManipulation from './stems/bit-manipulation'
import mathGeometry from './stems/math-geometry'

export * from './types'
export * from './registry'

registerStems(twoPointers)
registerStems(hashMapsSets)
registerStems(linkedLists)
registerStems(fastSlowPointers)
registerStems(slidingWindows)
registerStems(binarySearch)
registerStems(stacks)
registerStems(heaps)
registerStems(intervals)
registerStems(prefixSums)
registerStems(trees)
registerStems(tries)
registerStems(graphs)
registerStems(backtracking)
registerStems(dynamicProgramming)
registerStems(greedy)
registerStems(sortSearch)
registerStems(bitManipulation)
registerStems(mathGeometry)
