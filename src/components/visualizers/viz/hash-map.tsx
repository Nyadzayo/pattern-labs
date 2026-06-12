/**
 * Hash Map visualizer: keys are hashed with a visible letter-code sum,
 * placed into buckets (collisions chain within a bucket row), then a
 * lookup walks the computed bucket's chain comparing entries until
 * hit or miss. Editable input → pure buildFrames → <StepPlayer>.
 */
import { Fragment, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { frame, parseWord, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizSelect, VizTextInput } from '../inputs'

type Phase = 'idle' | 'insert' | 'lookup'

interface HMData {
  /** Snapshot of every bucket's chain (array of keys per bucket). */
  buckets: string[][]
  bucketCount: number
  phase: Phase
  /** Key currently being hashed / inserted / looked up. */
  activeKey: string | null
  /** Letter-code sum of activeKey, once computed. */
  hashSum: number | null
  /** hashSum % bucketCount, once computed. */
  bucketIndex: number | null
  /** Lookup: chain position currently being compared. */
  chainPos: number | null
  compare: 'match' | 'mismatch' | null
  /** Insert: where the key just landed. */
  landed: { bucket: number; pos: number } | null
  result: 'hit' | 'miss' | null
}

const PSEUDOCODE = [
  'def insert(key):',
  '    h = sum(ord(c) for c in key)',
  '    i = h % B',
  '    buckets[i].append(key)',
  '',
  'def lookup(key):',
  '    h = sum(ord(c) for c in key)',
  '    i = h % B',
  '    for entry in buckets[i]:',
  '        if entry == key: return True',
  '    return False',
]

function letterSum(word: string): number {
  let s = 0
  for (const c of word) s += c.charCodeAt(0)
  return s
}

function breakdown(word: string): string {
  return word
    .split('')
    .map((c) => `${c}(${c.charCodeAt(0)})`)
    .join(' + ')
}

function buildFrames(keys: string[], bucketCount: number, query: string): Frame<HMData>[] {
  const frames: Frame<HMData>[] = []
  const buckets: string[][] = Array.from({ length: bucketCount }, () => [])

  // Every frame gets independent copies of the bucket chains.
  const mk = (over: Partial<HMData>): HMData => ({
    buckets: buckets.map((b) => [...b]),
    bucketCount,
    phase: 'idle',
    activeKey: null,
    hashSum: null,
    bucketIndex: null,
    chainPos: null,
    compare: null,
    landed: null,
    result: null,
    ...over,
  })

  frames.push(
    frame(
      mk({}),
      `Insert ${keys.length} key${keys.length === 1 ? '' : 's'} into ${bucketCount} buckets, then look up "${query}".`,
      1,
    ),
  )

  for (const key of keys) {
    const h = letterSum(key)
    const i = h % bucketCount
    frames.push(
      frame(
        mk({ phase: 'insert', activeKey: key, hashSum: h }),
        `Hash "${key}": ${breakdown(key)} = ${h}.`,
        2,
      ),
    )
    frames.push(
      frame(
        mk({ phase: 'insert', activeKey: key, hashSum: h, bucketIndex: i }),
        `${h} % ${bucketCount} = ${i}, so "${key}" belongs in bucket ${i}.`,
        3,
      ),
    )
    const before = buckets[i].length
    buckets[i].push(key)
    frames.push(
      frame(
        mk({
          phase: 'insert',
          activeKey: key,
          hashSum: h,
          bucketIndex: i,
          landed: { bucket: i, pos: before },
        }),
        before === 0
          ? `Bucket ${i} is empty — "${key}" slots in as its first entry.`
          : `Collision! Bucket ${i} already holds "${buckets[i][before - 1]}" — "${key}" chains on after it (${before + 1} entries now).`,
        4,
      ),
    )
  }

  // Lookup walk for the query key.
  const qh = letterSum(query)
  const qi = qh % bucketCount
  frames.push(
    frame(
      mk({ phase: 'lookup', activeKey: query, hashSum: qh }),
      `Look up "${query}": ${breakdown(query)} = ${qh}.`,
      7,
    ),
  )
  const chain = buckets[qi]
  frames.push(
    frame(
      mk({ phase: 'lookup', activeKey: query, hashSum: qh, bucketIndex: qi }),
      `${qh} % ${bucketCount} = ${qi} — only bucket ${qi} can hold "${query}". Its chain has ${chain.length} entr${chain.length === 1 ? 'y' : 'ies'}.`,
      8,
    ),
  )

  if (chain.length === 0) {
    frames.push(
      frame(
        mk({ phase: 'lookup', activeKey: query, hashSum: qh, bucketIndex: qi, result: 'miss' }),
        `Bucket ${qi} is empty — nothing to compare. "${query}" is not in the map. Miss.`,
        11,
      ),
    )
    return frames
  }

  for (let k = 0; k < chain.length; k++) {
    if (chain[k] === query) {
      frames.push(
        frame(
          mk({
            phase: 'lookup',
            activeKey: query,
            hashSum: qh,
            bucketIndex: qi,
            chainPos: k,
            compare: 'match',
            result: 'hit',
          }),
          `Chain position ${k}: "${chain[k]}" == "${query}" — hit! Found after ${k + 1} comparison${k === 0 ? '' : 's'}.`,
          10,
        ),
      )
      return frames
    }
    frames.push(
      frame(
        mk({
          phase: 'lookup',
          activeKey: query,
          hashSum: qh,
          bucketIndex: qi,
          chainPos: k,
          compare: 'mismatch',
        }),
        `Chain position ${k}: "${chain[k]}" ≠ "${query}" — not it, step to the next link.`,
        10,
      ),
    )
  }

  frames.push(
    frame(
      mk({
        phase: 'lookup',
        activeKey: query,
        hashSum: qh,
        bucketIndex: qi,
        chainPos: chain.length,
        result: 'miss',
      }),
      `Walked all ${chain.length} entr${chain.length === 1 ? 'y' : 'ies'} in bucket ${qi} without a match — "${query}" is not in the map. Miss.`,
      11,
    ),
  )
  return frames
}

function HMFrame({ data }: { data: HMData }) {
  const { buckets, bucketCount, phase, activeKey, hashSum, bucketIndex, chainPos, compare, landed, result } = data
  return (
    <div className="flex h-full flex-col justify-center gap-4 py-2">
      {/* Hash computation strip */}
      <div className="flex min-h-[40px] items-center justify-center">
        <AnimatePresence mode="wait">
          {activeKey ? (
            <motion.div
              key={`${phase}-${activeKey}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[13px] tabular-nums"
            >
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  phase === 'lookup' ? 'bg-violet-500/15 text-violet-500' : 'bg-accent/15 text-accent'
                }`}
              >
                {phase}
              </span>
              <span className="font-semibold text-ink">"{activeKey}"</span>
              {hashSum !== null && (
                <span className="text-ink-muted">
                  {breakdown(activeKey)} = <span className="font-semibold text-ink">{hashSum}</span>
                </span>
              )}
              {hashSum !== null && bucketIndex !== null && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-ink-muted"
                >
                  {hashSum} % {bucketCount} ={' '}
                  <span className={`font-bold ${phase === 'lookup' ? 'text-violet-500' : 'text-accent'}`}>
                    {bucketIndex}
                  </span>
                </motion.span>
              )}
            </motion.div>
          ) : (
            <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-ink-faint">
              hash(key) = sum of letter codes, bucket = hash % {bucketCount}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Bucket rows */}
      <div className="flex flex-col gap-1.5">
        {buckets.map((chain, bi) => {
          const active = bucketIndex === bi
          return (
            <motion.div
              key={bi}
              layout
              animate={{ scale: active ? 1.01 : 1 }}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                active
                  ? phase === 'lookup'
                    ? 'border-violet-500/60 bg-violet-500/5'
                    : 'border-accent/60 bg-accent/5'
                  : 'border-edge bg-surface-sunken/50'
              }`}
            >
              <div
                className={`w-7 shrink-0 text-center font-mono text-xs font-semibold tabular-nums ${
                  active ? (phase === 'lookup' ? 'text-violet-500' : 'text-accent') : 'text-ink-faint'
                }`}
              >
                {bi}
              </div>
              <div className="h-6 w-px shrink-0 bg-edge" />
              <div className="flex min-h-[36px] flex-wrap items-center gap-1.5">
                {chain.length === 0 && <span className="text-[11px] italic text-ink-faint">empty</span>}
                {chain.map((key, ki) => {
                  const isLanded = landed !== null && landed.bucket === bi && landed.pos === ki
                  const isComparing = phase === 'lookup' && active && chainPos === ki
                  const passed = phase === 'lookup' && active && chainPos !== null && ki < chainPos
                  return (
                    <Fragment key={key}>
                      {ki > 0 && <span className="font-mono text-xs text-ink-faint">→</span>}
                      <motion.div
                        layout
                        initial={{ scale: 0.4, opacity: 0 }}
                        animate={{
                          scale: isLanded || isComparing ? 1.08 : 1,
                          opacity: passed ? 0.35 : 1,
                        }}
                        className={`rounded-md border px-2.5 py-1.5 font-mono text-sm ${
                          isComparing && compare === 'match'
                            ? 'border-emerald-500 bg-emerald-500/15 font-bold text-emerald-600 dark:text-emerald-400'
                            : isComparing && compare === 'mismatch'
                              ? 'border-red-500/70 bg-red-500/10 text-red-600 dark:text-red-400'
                              : isLanded
                                ? 'border-accent bg-accent/15 font-semibold text-accent'
                                : 'border-edge bg-surface-raised text-ink'
                        }`}
                      >
                        {key}
                      </motion.div>
                    </Fragment>
                  )
                })}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Result line */}
      <div className="min-h-[20px] text-center font-mono text-sm">
        {result === 'hit' ? (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-bold text-emerald-600 dark:text-emerald-400"
          >
            "{activeKey}" found in bucket {bucketIndex}
          </motion.span>
        ) : result === 'miss' ? (
          <motion.span initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-red-500">
            "{activeKey}" not found — miss
          </motion.span>
        ) : null}
      </div>
    </div>
  )
}

/** "cat, dog, BEE" → ["cat","dog","bee"]; null on bad token, >10 keys, or key >8 letters. */
function parseKeys(raw: string): string[] | null {
  const tokens = raw.split(/[\s,]+/).filter(Boolean)
  if (!tokens.length || tokens.length > 10) return null
  const out: string[] = []
  for (const t of tokens) {
    if (!/^[a-zA-Z]+$/.test(t) || t.length > 8) return null
    const w = t.toLowerCase()
    if (!out.includes(w)) out.push(w)
  }
  return out
}

type BucketChoice = '2' | '3' | '4' | '5' | '6' | '7' | '8'
const BUCKET_OPTIONS = (['2', '3', '4', '5', '6', '7', '8'] as const).map((v) => ({
  value: v,
  label: `${v} buckets`,
}))

export default function HashMapVisualizer() {
  const [keys, setKeys] = useState<string[]>(['cat', 'dog', 'bee', 'fox', 'owl', 'ant'])
  const [bucketChoice, setBucketChoice] = useState<BucketChoice>('4')
  const [query, setQuery] = useState('owl')

  const frames = useMemo(() => buildFrames(keys, Number(bucketChoice), query), [keys, bucketChoice, query])
  const resetKey = `${keys.join(',')}|${bucketChoice}|${query}`

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="Keys to insert"
          defaultValue={keys.join(', ')}
          hint="Comma-separated words (max 10, ≤8 letters each, duplicates dropped)"
          onParsed={(raw) => {
            const parsed = parseKeys(raw)
            if (parsed) {
              setKeys(parsed)
              return true
            }
            return false
          }}
        />
        <VizSelect label="Buckets" value={bucketChoice} options={BUCKET_OPTIONS} onChange={setBucketChoice} />
        <VizTextInput
          label="Lookup key"
          defaultValue={query}
          hint="One word to search for after inserts"
          onParsed={(raw) => {
            const parsed = parseWord(raw, 8)
            if (parsed) {
              setQuery(parsed.toLowerCase())
              return true
            }
            return false
          }}
        />
      </VizInputRow>
      <StepPlayer
        frames={frames}
        pseudocode={PSEUDOCODE}
        resetKey={resetKey}
        renderFrame={(f) => <HMFrame data={f.data} />}
      />
    </div>
  )
}
