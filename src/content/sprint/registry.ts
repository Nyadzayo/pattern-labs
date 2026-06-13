/**
 * Runtime registry for Pattern Sprint stems. Stem files call `registerStems`
 * (via `src/content/sprint/index.ts`); pages read through the accessors here.
 * Mirrors `src/content/primitives/registry.ts`.
 */
import type { ModuleId } from '../types'
import type { SprintStem } from './types'

const registry = new Map<string, SprintStem>()
/** Insertion order, so `allStems()` is stable across reloads. */
const order: string[] = []

export function registerStems(stems: SprintStem[]): void {
  for (const stem of stems) {
    if (!registry.has(stem.id)) order.push(stem.id)
    registry.set(stem.id, stem)
  }
}

export function getStem(id: string): SprintStem | undefined {
  return registry.get(id)
}

export function allStems(): SprintStem[] {
  return order.map((id) => registry.get(id)!).filter(Boolean)
}

export function stemsForPattern(pattern: ModuleId): SprintStem[] {
  return allStems().filter((s) => s.pattern === pattern)
}
