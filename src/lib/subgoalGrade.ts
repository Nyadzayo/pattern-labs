// Pure, deterministic grading for the self-generated subgoal-labeling exercise.
// No Date / Math.random / judge inside. The learner types a free-form purpose
// label for a chunk; we grade it LENIENTLY against author-supplied concept
// keywords — rewarding understanding of the chunk's *role*, not exact wording.

/** Minimum coverage (fraction of keywords hit) for a label to count as acceptable. */
export const SUBGOAL_PASS = 0.3

export interface GradeResult {
  /** Coverage in [0,1]: fraction of acceptableKeywords whose concept appears. */
  score: number
  /** Lenient pass: score >= SUBGOAL_PASS. */
  matched: boolean
}

// Words that carry no pattern meaning — dropped before matching so "skip the
// duplicate" and "skip duplicate" grade the same. Kept deliberately small;
// direction/role words (left, right, past, before) are NOT stopwords.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'at', 'is', 'it', 'be',
  'for', 'we', 'you', 'i', 'this', 'that', 'then', 'than', 'with', 'as', 'from',
  'its', 'each', 'so', 'do', 'if', 'our', 'my', 'are', 'was',
])

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

function contentTokens(s: string): string[] {
  return tokenize(s).filter((t) => !STOPWORDS.has(t))
}

/** Lenient single-token match: equal, or one is a prefix of the other (len ≥ 4). */
function tokenMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true
  return false
}

/**
 * Does the typed label express this concept keyword? A multi-word keyword counts
 * as hit when a majority of its content tokens appear in the typed tokens
 * (inflection-tolerant), so "move the left pointer" hits the keyword "move left".
 */
function keywordHit(keyword: string, typedTokens: string[]): boolean {
  const kw = contentTokens(keyword)
  if (kw.length === 0) return false
  const hits = kw.filter((kt) => typedTokens.some((tt) => tokenMatch(kt, tt))).length
  return hits >= Math.ceil(kw.length / 2)
}

/**
 * Grade a typed label against a chunk's acceptable concept keywords. Lenient by
 * design: score is the fraction of keywords whose concept is present; `matched`
 * passes at SUBGOAL_PASS (~a third). Deterministic and order-independent.
 */
export function gradeLabel(typed: string, acceptableKeywords: string[]): GradeResult {
  const typedTokens = contentTokens(typed)
  if (typedTokens.length === 0 || acceptableKeywords.length === 0) {
    return { score: 0, matched: false }
  }
  const hits = acceptableKeywords.filter((k) => keywordHit(k, typedTokens)).length
  const score = hits / acceptableKeywords.length
  return { score, matched: score >= SUBGOAL_PASS }
}

/**
 * Which chunk's keyword set the typed label fits best — drives misconception
 * feedback (a label that fits a *different* chunk means the learner has the
 * roles swapped). Returns the index of the highest-scoring chunk, -1 if the
 * label matches no chunk at all. Ties resolve to the earliest chunk.
 */
export function bestChunkMatch(typed: string, chunkKeywords: string[][]): number {
  let bestIdx = -1
  let bestScore = 0
  for (let i = 0; i < chunkKeywords.length; i++) {
    const { score } = gradeLabel(typed, chunkKeywords[i])
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  return bestScore > 0 ? bestIdx : -1
}

/** "Structure understood": every chunk was labeled acceptably. */
export function labelingComplete(scores: number[], threshold = SUBGOAL_PASS): boolean {
  return scores.length > 0 && scores.every((s) => s >= threshold)
}
