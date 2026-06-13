/**
 * Runtime registry for Primitives Lab. Each primitive file default-exports a
 * `Primitive` and is registered in `primitives/index.ts`. Mirrors the module
 * registry in `src/content/registry.ts`.
 */
import type { ModuleId } from '../types'
import type { Primitive } from './types'
import { PRIMITIVE_MANIFEST } from './manifest'

const registry = new Map<string, Primitive>()

export function registerPrimitive(p: Primitive): void {
  registry.set(p.id, p)
}

export function getPrimitive(id: string): Primitive | undefined {
  return registry.get(id)
}

export function hasPrimitive(id: string): boolean {
  return registry.has(id)
}

/** All registered primitives, in manifest order (stable for UI listing). */
export function allPrimitives(): Primitive[] {
  return PRIMITIVE_MANIFEST.map((e) => registry.get(e.id)).filter(
    (p): p is Primitive => p !== undefined,
  )
}

/** Registered primitives whose `moduleTags` include the given module. */
export function primitivesForModule(moduleId: ModuleId): Primitive[] {
  return allPrimitives().filter((p) => p.moduleTags.includes(moduleId))
}
