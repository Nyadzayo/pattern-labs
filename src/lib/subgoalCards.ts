// Auto-generated flashcards from subgoal-annotated primitive templates: "what
// are the N subgoals of the <pattern> idiom, in order?". These surface in the
// global Review deck (not per-module), scheduled by SM-2 like any other card.
import { allPrimitives } from '@/content/primitives/registry'
import { findLabelRung } from '@/content/primitives/types'

export interface GeneratedCard {
  moduleId: string
  cardId: string
  front: string
  back: string
}

/** Card id prefix so generated cards never collide with authored flashcard ids. */
export const SUBGOAL_CARD_PREFIX = 'subgoal:'

/** One ordered-subgoals recall card per primitive whose write solution is annotated. */
export function subgoalSkeletonCards(): GeneratedCard[] {
  const out: GeneratedCard[] = []
  for (const p of allPrimitives()) {
    const label = findLabelRung(p)
    if (!label || label.subgoals.length === 0) continue
    const moduleId = p.moduleTags[0] ?? p.category
    const front = `What are the ${label.subgoals.length} subgoals of the **${p.name}** idiom, in order?`
    const back = label.subgoals.map((s, i) => `${i + 1}. ${s.referenceLabel}`).join('\n')
    out.push({ moduleId, cardId: `${SUBGOAL_CARD_PREFIX}${p.id}`, front, back })
  }
  return out
}
