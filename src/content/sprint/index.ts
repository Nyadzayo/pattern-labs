/**
 * Self-registering Pattern Sprint catalog. Each `stems/<moduleId>.ts` file
 * default-exports a `SprintStem[]`; importing this module registers them all.
 * The orchestrator owns this wiring (one stem file per module / per agent).
 * Mirrors `src/content/primitives/index.ts`.
 */
import { registerStems } from './registry'

import twoPointers from './stems/two-pointers'
import slidingWindows from './stems/sliding-windows'
import hashMapsSets from './stems/hash-maps-sets'
import binarySearch from './stems/binary-search'
import stacks from './stems/stacks'

export * from './types'
export * from './registry'

registerStems(twoPointers)
registerStems(slidingWindows)
registerStems(hashMapsSets)
registerStems(binarySearch)
registerStems(stacks)
