import { findWriteRung, type LabelRung } from '@/content/primitives/types'
import { recordSubgoalAttempt } from '@/lib/storage'
import { SubgoalLabeler } from '@/components/subgoals/SubgoalLabeler'
import type { RungViewProps } from './rungProps'

/**
 * Drill-ladder rung 6 (Label): self-generated subgoal labeling over the
 * primitive's write-rung solution. Reports pass/fail to the session (correct =
 * structure understood) and persists the per-chunk grade keyed `primitive:<id>`.
 */
export function LabelRungView({ primitive, rung, onSubmit }: RungViewProps<LabelRung>) {
  const write = findWriteRung(primitive)
  return (
    <div>
      <p className="mb-3 text-sm text-ink-muted">
        Label what each block of <span className="font-medium text-ink">{primitive.name}</span> is
        for — in your own words — then reveal the canonical roles and compare.
      </p>
      <SubgoalLabeler
        code={write.solution}
        subgoals={rung.subgoals}
        onSubmit={({ scores, understood }) => {
          recordSubgoalAttempt(`primitive:${primitive.id}`, scores, understood)
          onSubmit({
            correct: understood,
            message: understood ? 'Structure understood.' : 'Some roles to revisit.',
          })
        }}
      />
    </div>
  )
}
