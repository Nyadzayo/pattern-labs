/**
 * Content entry point. Importing this file loads every written module's
 * content into the registry. Modules not yet imported here show as
 * "coming soon" in the UI.
 */
import { registerModule } from './registry'
import twoPointers from './modules/two-pointers'
import hashMapsSets from './modules/hash-maps-sets'
import slidingWindows from './modules/sliding-windows'

export * from './types'
export * from './registry'

// Phase 2 modules (Phase 6 completes the remaining sixteen).
registerModule(twoPointers)
registerModule(hashMapsSets)
registerModule(slidingWindows)
