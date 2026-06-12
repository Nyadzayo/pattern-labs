/**
 * Trie visualizer: insert words letter by letter, watching shared prefixes
 * get reused while new suffixes grow fresh nodes. Optionally finishes with a
 * prefix-query walk that lights up the subtree of words sharing that prefix.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { frame, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizTextInput } from '../inputs'

const MAX_WORDS = 6
const MAX_WORD_LEN = 8
const X_GAP = 60
const Y_GAP = 58
const R = 16
const PAD = 42

interface TrieNode {
  id: number
  /** Letter on the incoming edge ('' for root). */
  char: string
  parentId: number | null
  depth: number
  x: number
  y: number
}

type Phase = 'insert' | 'query' | 'found' | 'fail' | 'done'

interface TrieData {
  /** Final laid-out trie (immutable, shared across frames like the exemplar's array). */
  nodes: TrieNode[]
  width: number
  height: number
  words: string[]
  /** Node ids that exist as of this step. */
  visible: number[]
  /** Node ids marked as word ends as of this step. */
  wordEnds: number[]
  /** Root → cursor path being walked right now. */
  path: number[]
  currentId: number | null
  /** Node created on this exact step (emerald flash). */
  newId: number | null
  /** Subtree lit up by a successful prefix query. */
  subtree: number[]
  phase: Phase
  /** Index of the word being inserted (-1 outside inserts). */
  wordIdx: number
  /** Letters of the active word consumed so far. */
  letterIdx: number
  doneWords: number
  created: number
  reused: number
}

const PSEUDOCODE = [
  'def insert(word):',
  '    node = root',
  '    for ch in word:',
  '        if ch in node.children:',
  '            node = node.children[ch]   # reuse',
  '        else:',
  '            node.children[ch] = Node() # create',
  '    node.is_word = True',
  '',
  'def starts_with(prefix):',
  '    node = root',
  '    for ch in prefix:',
  '        if ch not in node.children: return False',
  '        node = node.children[ch]',
  '    return True',
]

/** Build the complete trie for all words and lay it out (root at top). */
function buildLayout(words: string[]): { nodes: TrieNode[]; childMap: Map<string, number>[]; width: number; height: number } {
  const nodes: TrieNode[] = [{ id: 0, char: '', parentId: null, depth: 0, x: 0, y: 0 }]
  const childMap: Map<string, number>[] = [new Map()]
  const kids: number[][] = [[]]
  for (const w of words) {
    let cur = 0
    for (const ch of w) {
      let next = childMap[cur].get(ch)
      if (next === undefined) {
        next = nodes.length
        nodes.push({ id: next, char: ch, parentId: cur, depth: nodes[cur].depth + 1, x: 0, y: 0 })
        childMap.push(new Map())
        kids.push([])
        childMap[cur].set(ch, next)
        kids[cur].push(next)
      }
      cur = next
    }
  }
  // Tidy layout: leaves take sequential slots, parents center over children.
  let nextLeaf = 0
  const slot = new Array<number>(nodes.length).fill(0)
  const place = (id: number): void => {
    if (!kids[id].length) {
      slot[id] = nextLeaf++
      return
    }
    for (const k of kids[id]) place(k)
    slot[id] = (slot[kids[id][0]] + slot[kids[id][kids[id].length - 1]]) / 2
  }
  place(0)
  const maxDepth = Math.max(...nodes.map((n) => n.depth))
  const width = Math.max((nextLeaf - 1) * X_GAP, 120) + PAD * 2
  const height = maxDepth * Y_GAP + PAD * 2
  for (const n of nodes) {
    n.x = slot[n.id] * X_GAP + PAD + (nextLeaf === 1 ? (width - PAD * 2) / 2 : 0)
    n.y = n.depth * Y_GAP + PAD
  }
  return { nodes, childMap, width, height }
}

/** Read the full word spelled by the path from root down to `id`. */
function spell(nodes: TrieNode[], id: number): string {
  let s = ''
  let cur: number | null = id
  while (cur !== null) {
    s = nodes[cur].char + s
    cur = nodes[cur].parentId
  }
  return s
}

function collectSubtree(nodes: TrieNode[], rootId: number): number[] {
  const out: number[] = []
  const stack = [rootId]
  while (stack.length) {
    const id = stack.pop()!
    out.push(id)
    for (const n of nodes) if (n.parentId === id) stack.push(n.id)
  }
  return out
}

function buildFrames(words: string[], prefix: string): Frame<TrieData>[] {
  const { nodes, childMap, width, height } = buildLayout(words)
  const frames: Frame<TrieData>[] = []
  const visible = new Set<number>([0])
  const wordEnds: number[] = []
  let created = 0
  let reused = 0

  const snap = (over: Partial<TrieData>): TrieData => ({
    nodes,
    width,
    height,
    words,
    visible: [...visible],
    wordEnds: [...wordEnds],
    path: [0],
    currentId: null,
    newId: null,
    subtree: [],
    phase: 'insert',
    wordIdx: -1,
    letterIdx: 0,
    doneWords: 0,
    created,
    reused,
    ...over,
  })

  let doneWords = 0
  frames.push(
    frame(
      snap({ doneWords }),
      `Start with an empty trie — just the root. ${words.length} word${words.length > 1 ? 's' : ''} to insert: ${words.map((w) => `"${w}"`).join(', ')}.`,
      1,
    ),
  )

  words.forEach((w, wi) => {
    let cur = 0
    const path = [0]
    let walked = ''
    frames.push(
      frame(
        snap({ path: [...path], currentId: 0, wordIdx: wi, letterIdx: 0, doneWords }),
        `insert("${w}"): put the cursor on the root and walk down one letter at a time.`,
        2,
      ),
    )
    for (let i = 0; i < w.length; i++) {
      const ch = w[i]
      const child = childMap[cur].get(ch)! // always exists in the final trie
      walked += ch
      if (visible.has(child)) {
        reused++
        cur = child
        path.push(child)
        frames.push(
          frame(
            snap({ path: [...path], currentId: cur, wordIdx: wi, letterIdx: i + 1, doneWords }),
            `'${ch}' already hangs below "${walked.slice(0, -1) || 'root'}" — reuse the existing node for "${walked}". No allocation.`,
            5,
          ),
        )
      } else {
        created++
        visible.add(child)
        cur = child
        path.push(child)
        frames.push(
          frame(
            snap({ path: [...path], currentId: cur, newId: cur, wordIdx: wi, letterIdx: i + 1, doneWords }),
            `'${ch}' is missing below "${walked.slice(0, -1) || 'root'}" — create a new node for "${walked}" and step into it.`,
            7,
          ),
        )
      }
    }
    const already = wordEnds.includes(cur)
    if (!already) wordEnds.push(cur)
    doneWords = wi + 1
    frames.push(
      frame(
        snap({ path: [...path], currentId: cur, wordIdx: wi, letterIdx: w.length, doneWords }),
        already
          ? `"${w}" ends on a node already marked as a word end — inserting a duplicate changes nothing.`
          : `"${w}" is fully inserted — mark node "${walked}" as a word end (amber ring).`,
        8,
      ),
    )
  })

  const totalLetters = words.reduce((s, w) => s + w.length, 0)
  frames.push(
    frame(
      snap({ doneWords }),
      `All ${words.length} words inserted: ${totalLetters} letters stored in ${created} nodes — ${reused} step${reused === 1 ? '' : 's'} reused existing edges instead of allocating.`,
      8,
    ),
  )

  if (prefix) {
    let cur = 0
    const path = [0]
    let walked = ''
    frames.push(
      frame(
        snap({ path: [...path], currentId: 0, phase: 'query', doneWords }),
        `starts_with("${prefix}"): same walk as insert, but never create — begin at the root.`,
        11,
      ),
    )
    for (const ch of prefix) {
      const child = childMap[cur].get(ch)
      if (child === undefined) {
        frames.push(
          frame(
            snap({ path: [...path], currentId: cur, phase: 'fail', doneWords }),
            `'${ch}' has no edge below "${walked || 'root'}" — return False: no stored word starts with "${prefix}".`,
            13,
          ),
        )
        return frames
      }
      walked += ch
      cur = child
      path.push(child)
      frames.push(
        frame(
          snap({ path: [...path], currentId: cur, phase: 'query', doneWords }),
          `'${ch}' found — follow the shared edge to "${walked}". This path was built once and is shared by every word through it.`,
          14,
        ),
      )
    }
    const subtree = collectSubtree(nodes, cur).filter((id) => visible.has(id))
    const under = subtree
      .filter((id) => wordEnds.includes(id))
      .sort((a, b) => a - b)
      .map((id) => spell(nodes, id))
    frames.push(
      frame(
        snap({ path: [...path], currentId: cur, phase: 'found', subtree, doneWords }),
        `"${prefix}" is a live prefix — return True. ${under.length} word${under.length === 1 ? '' : 's'} hang${under.length === 1 ? 's' : ''} in this subtree: ${under.map((u) => `"${u}"`).join(', ')}.`,
        15,
      ),
    )
  }
  return frames
}

// ---------- rendering ----------

function nodeFill(onPath: boolean, isCurrent: boolean, isNew: boolean, inSubtree: boolean, querying: boolean): string {
  if (isNew) return 'fill-emerald-500/20 stroke-emerald-500'
  if (isCurrent) return querying ? 'fill-violet-500 stroke-violet-500' : 'fill-accent stroke-accent'
  if (onPath) return querying ? 'fill-violet-500/15 stroke-violet-500' : 'fill-accent/15 stroke-accent'
  if (inSubtree) return 'fill-violet-500/15 stroke-violet-400'
  return 'fill-surface-sunken stroke-edge'
}

function TrieFrame({ data }: { data: TrieData }) {
  const { nodes, width, height, words, currentId, newId, phase } = data
  const visibleSet = new Set(data.visible)
  const pathSet = new Set(data.path)
  const endSet = new Set(data.wordEnds)
  const subtreeSet = new Set(data.subtree)
  const querying = phase === 'query' || phase === 'found' || phase === 'fail'
  const cur = currentId !== null ? nodes[currentId] : null

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-2">
      {/* word progress chips */}
      <div className="flex flex-wrap justify-center gap-2">
        {words.map((w, wi) => {
          const isActive = wi === data.wordIdx
          const isDone = wi < data.doneWords
          return (
            <motion.div
              key={wi}
              layout
              animate={{ scale: isActive ? 1.06 : 1 }}
              className={`flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs ${
                isActive
                  ? 'border-accent bg-accent/10'
                  : isDone
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-edge bg-surface-sunken opacity-60'
              }`}
            >
              {w.split('').map((ch, ci) => (
                <span
                  key={ci}
                  className={
                    isActive && ci < data.letterIdx
                      ? 'font-bold text-accent'
                      : isActive || isDone
                        ? 'text-ink'
                        : 'text-ink-muted'
                  }
                >
                  {ch}
                </span>
              ))}
              {isDone && <span className="ml-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">✓</span>}
            </motion.div>
          )
        })}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mx-auto block"
        style={{ width: '100%', maxWidth: Math.min(620, width * 1.5), maxHeight: 320, aspectRatio: `${width} / ${height}` }}
      >
        {/* edges */}
        <AnimatePresence>
          {nodes
            .filter((n) => n.parentId !== null && visibleSet.has(n.id))
            .map((n) => {
              const p = nodes[n.parentId!]
              const onPath = pathSet.has(n.id) && pathSet.has(p.id)
              const inSub = subtreeSet.has(n.id) && subtreeSet.has(p.id)
              return (
                <motion.line
                  key={`e${n.id}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ pathLength: 0, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  x1={p.x}
                  y1={p.y + R}
                  x2={n.x}
                  y2={n.y - R}
                  strokeWidth={onPath ? 2.5 : 1.5}
                  className={
                    onPath
                      ? querying
                        ? 'stroke-violet-500'
                        : 'stroke-accent'
                      : inSub
                        ? 'stroke-violet-400/70'
                        : 'stroke-edge'
                  }
                />
              )
            })}
        </AnimatePresence>

        {/* cursor ring glides between nodes */}
        {cur && (
          <motion.circle
            initial={false}
            animate={{ cx: cur.x, cy: cur.y }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            r={R + 7}
            strokeWidth={2.5}
            className={`fill-none ${
              phase === 'fail'
                ? 'stroke-red-500'
                : newId !== null
                  ? 'stroke-emerald-500'
                  : querying
                    ? 'stroke-violet-500'
                    : 'stroke-accent'
            }`}
          />
        )}

        {/* nodes (new ones slide in from their parent) */}
        <AnimatePresence>
          {nodes
            .filter((n) => visibleSet.has(n.id))
            .map((n) => {
              const p = n.parentId !== null ? nodes[n.parentId] : null
              const isCurrent = n.id === currentId
              const isNew = n.id === newId
              const isEnd = endSet.has(n.id)
              return (
                <motion.g
                  key={n.id}
                  initial={p ? { x: p.x - n.x, y: p.y - n.y, opacity: 0 } : { opacity: 0 }}
                  animate={{ x: 0, y: 0, opacity: 1 }}
                  exit={p ? { x: p.x - n.x, y: p.y - n.y, opacity: 0 } : { opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                >
                  <g transform={`translate(${n.x} ${n.y})`}>
                    {isEnd && (
                      <motion.circle
                        initial={{ scale: 1.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        r={R + 4}
                        strokeWidth={2}
                        className="fill-none stroke-amber-500"
                      />
                    )}
                    <motion.circle
                      animate={{ scale: isCurrent ? 1.12 : 1 }}
                      r={R}
                      strokeWidth={1.5}
                      className={nodeFill(pathSet.has(n.id), isCurrent, isNew, subtreeSet.has(n.id), querying)}
                    />
                    <text
                      textAnchor="middle"
                      dy="0.35em"
                      fontSize={13}
                      className={`select-none font-mono font-semibold ${
                        isCurrent && !isNew ? 'fill-white' : 'fill-ink'
                      }`}
                    >
                      {n.id === 0 ? '·' : n.char}
                    </text>
                    {n.id === 0 && (
                      <text textAnchor="middle" y={-R - 9} fontSize={9} className="select-none fill-ink-faint">
                        root
                      </text>
                    )}
                  </g>
                </motion.g>
              )
            })}
        </AnimatePresence>
      </svg>

      {/* legend + running stats */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${querying ? 'bg-violet-500' : 'bg-accent'}`} />
          {querying ? 'query walk' : 'walked path'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" /> new node
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-amber-500" /> word end
        </span>
        <span className="font-mono tabular-nums text-ink-faint">
          nodes {data.visible.length} · created {data.created} · reused {data.reused}
        </span>
      </div>
    </div>
  )
}

// ---------- input parsing ----------

function parseWords(raw: string): string[] | null {
  const tokens = raw.split(/[\s,]+/).filter(Boolean)
  if (!tokens.length || tokens.length > MAX_WORDS) return null
  const out: string[] = []
  for (const t of tokens) {
    const w = t.toLowerCase()
    if (!/^[a-z]+$/.test(w) || w.length > MAX_WORD_LEN) return null
    out.push(w)
  }
  return out
}

export default function TrieVisualizer() {
  const [words, setWords] = useState<string[]>(['tea', 'ted', 'ten', 'in', 'inn'])
  const [prefix, setPrefix] = useState('te')

  const frames = useMemo(() => buildFrames(words, prefix), [words, prefix])
  const resetKey = `${words.join(',')}|${prefix}`

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="Words"
          defaultValue={words.join(', ')}
          hint={`Comma-separated, letters only (max ${MAX_WORDS} words × ${MAX_WORD_LEN} letters)`}
          onParsed={(raw) => {
            const parsed = parseWords(raw)
            if (parsed) {
              setWords(parsed)
              return true
            }
            return false
          }}
        />
        <VizTextInput
          label="Prefix query"
          defaultValue={prefix}
          hint="Walked after all inserts (blank = skip)"
          onParsed={(raw) => {
            const t = raw.trim().toLowerCase()
            if (/^[a-z]{0,8}$/.test(t)) {
              setPrefix(t)
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
        renderFrame={(f) => <TrieFrame data={f.data} />}
      />
    </div>
  )
}
