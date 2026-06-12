/**
 * Tree Traversal visualizer: BFS (level order) vs DFS pre/in/post-order on a
 * binary tree built from level-order input with nulls. Editable input →
 * pure buildFrames → <StepPlayer>. Nodes are stamped with their visit-order
 * number as they are visited; the queue/stack is shown as a row of chips.
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { frame, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizSelect, VizTextInput } from '../inputs'

type Mode = 'bfs' | 'preorder' | 'inorder' | 'postorder'

interface TreeNode {
  id: number
  value: number
  left: number | null
  right: number | null
  depth: number
  /** Layout coordinates (px, before padding) — x by inorder rank, y by depth. */
  x: number
  y: number
}

interface TTData {
  /** Immutable node list (never mutated after build). */
  nodes: TreeNode[]
  mode: Mode
  /** Id of the node currently being processed. */
  current: number | null
  /** stamps[id] = 1-based visit-order number once visited. */
  stamps: (number | null)[]
  /** Queue contents (front first) for BFS; call stack (bottom first) for DFS. */
  pending: number[]
  phase: 'idle' | 'running' | 'done'
}

const MODE_LABEL: Record<Mode, string> = {
  bfs: 'BFS (level order)',
  preorder: 'DFS pre-order',
  inorder: 'DFS in-order',
  postorder: 'DFS post-order',
}

const PSEUDOCODE: Record<Mode, string[]> = {
  bfs: [
    'queue = deque([root])',
    'while queue:',
    '    node = queue.popleft()',
    '    visit(node)',
    '    if node.left:  queue.append(node.left)',
    '    if node.right: queue.append(node.right)',
  ],
  preorder: [
    'def dfs(node):',
    '    if node is None: return',
    '    visit(node)',
    '    dfs(node.left)',
    '    dfs(node.right)',
    '',
    'dfs(root)',
  ],
  inorder: [
    'def dfs(node):',
    '    if node is None: return',
    '    dfs(node.left)',
    '    visit(node)',
    '    dfs(node.right)',
    '',
    'dfs(root)',
  ],
  postorder: [
    'def dfs(node):',
    '    if node is None: return',
    '    dfs(node.left)',
    '    dfs(node.right)',
    '    visit(node)',
    '',
    'dfs(root)',
  ],
}

const MAX_NODES = 15

/** "8, 3, 10, 1, 6, null, 14" → [8,3,10,1,6,null,14]; null on bad input. */
function parseLevelOrder(raw: string): (number | null)[] | null {
  const tokens = raw.split(/[\s,]+/).filter(Boolean)
  if (!tokens.length || tokens.length > 31) return null
  const out: (number | null)[] = []
  for (const t of tokens) {
    if (/^(null|none|nil|_)$/i.test(t)) {
      out.push(null)
      continue
    }
    const n = Number(t)
    if (!Number.isInteger(n) || n < -999 || n > 9999) return null
    out.push(n)
  }
  if (out[0] === null) return null
  if (out.filter((v) => v !== null).length > MAX_NODES) return null
  return out
}

/**
 * Build the tree from compact level-order tokens (LeetCode convention: only
 * non-null nodes get child slots) and lay it out: x by inorder rank, y by
 * depth. Returns null when non-null tokens are unreachable.
 */
function buildTree(level: (number | null)[]): TreeNode[] | null {
  const rootVal = level[0]
  if (rootVal === null || rootVal === undefined) return null
  const nodes: TreeNode[] = [{ id: 0, value: rootVal, left: null, right: null, depth: 0, x: 0, y: 0 }]
  const q: number[] = [0]
  let i = 1
  while (q.length && i < level.length) {
    const pid = q.shift()!
    for (const side of ['left', 'right'] as const) {
      if (i >= level.length) break
      const v = level[i++]
      if (v === null) continue
      const id = nodes.length
      nodes.push({ id, value: v, left: null, right: null, depth: nodes[pid].depth + 1, x: 0, y: 0 })
      nodes[pid][side] = id
      q.push(id)
    }
  }
  while (i < level.length) if (level[i++] !== null) return null // unreachable token

  const XGAP = 46
  const YGAP = 58
  let rank = 0
  const assign = (id: number) => {
    const n = nodes[id]
    if (n.left !== null) assign(n.left)
    n.x = rank++ * XGAP
    n.y = n.depth * YGAP
    if (n.right !== null) assign(n.right)
  }
  assign(0)
  return nodes
}

function buildFrames(nodes: TreeNode[], mode: Mode): Frame<TTData>[] {
  const frames: Frame<TTData>[] = []
  const stamps: (number | null)[] = nodes.map(() => null)
  const pending: number[] = []
  const seq: number[] = []
  let order = 0
  const v = (id: number) => nodes[id].value
  const list = () => (pending.length ? pending.map(v).join(', ') : 'empty')
  const snap = (current: number | null, phase: TTData['phase']): TTData => ({
    nodes,
    mode,
    current,
    stamps: [...stamps],
    pending: [...pending],
    phase,
  })

  if (mode === 'bfs') {
    pending.push(0)
    frames.push(frame(snap(null, 'idle'), `Enqueue root ${v(0)} — the queue starts as [${v(0)}].`, 1))
    while (pending.length) {
      const id = pending.shift()!
      frames.push(
        frame(snap(id, 'running'), `Dequeue ${v(id)} from the front — queue is now [${list()}].`, 3),
      )
      order += 1
      stamps[id] = order
      seq.push(v(id))
      const n = nodes[id]
      const leaf = n.left === null && n.right === null
      frames.push(
        frame(
          snap(id, 'running'),
          `Visit ${v(id)}: stamp #${order}.${leaf ? ` ${v(id)} is a leaf — nothing to enqueue.` : ''}`,
          4,
        ),
      )
      if (n.left !== null) {
        pending.push(n.left)
        frames.push(
          frame(snap(id, 'running'), `${v(id)} has a left child — enqueue ${v(n.left)}. Queue: [${list()}].`, 5),
        )
      }
      if (n.right !== null) {
        pending.push(n.right)
        frames.push(
          frame(snap(id, 'running'), `${v(id)} has a right child — enqueue ${v(n.right)}. Queue: [${list()}].`, 6),
        )
      }
    }
    frames.push(frame(snap(null, 'done'), `Queue is empty — BFS level order: ${seq.join(' → ')}.`, 2))
    return frames
  }

  // DFS: simulate the recursion with an explicit call stack.
  const visitLine = mode === 'preorder' ? 3 : mode === 'inorder' ? 4 : 5
  const leftLine = mode === 'preorder' ? 4 : 3
  const rightLine = mode === 'postorder' ? 4 : 5
  frames.push(
    frame(snap(null, 'idle'), `Start ${MODE_LABEL[mode]} from root ${v(0)} — the call stack is empty.`, 7),
  )

  const go = (id: number, callLine: number, intro: string) => {
    pending.push(id)
    frames.push(frame(snap(id, 'running'), `${intro} — push ${v(id)} onto the stack.`, callLine))
    const n = nodes[id]
    const leaf = n.left === null && n.right === null
    const visit = (why: string) => {
      order += 1
      stamps[id] = order
      seq.push(v(id))
      frames.push(frame(snap(id, 'running'), `${why} Stamp #${order} on ${v(id)}.`, visitLine))
    }
    if (mode === 'preorder')
      visit(`Visit ${v(id)} immediately — pre-order stamps a node before exploring its children.`)
    if (n.left !== null) go(n.left, leftLine, `dfs(${v(n.left)}): recurse into the left child of ${v(id)}`)
    if (mode === 'inorder')
      visit(
        n.left !== null
          ? `Left subtree of ${v(id)} is finished — in-order visits the node now.`
          : `${v(id)} has no left child — in-order visits it right away.`,
      )
    if (n.right !== null) go(n.right, rightLine, `dfs(${v(n.right)}): recurse into the right child of ${v(id)}`)
    if (mode === 'postorder')
      visit(
        leaf
          ? `${v(id)} is a leaf — nothing below it, so post-order visits now.`
          : `Both subtrees of ${v(id)} are done — post-order visits it last.`,
      )
    pending.pop()
    const top = pending.length ? pending[pending.length - 1] : null
    frames.push(
      frame(
        snap(top, 'running'),
        `dfs(${v(id)}) returns — pop ${v(id)} off the stack${top !== null ? `, back inside dfs(${v(top)})` : ''}.`,
        5,
      ),
    )
  }
  go(0, 7, `dfs(${v(0)}): call on the root`)
  frames.push(frame(snap(null, 'done'), `Stack is empty — ${MODE_LABEL[mode]}: ${seq.join(' → ')}.`, 7))
  return frames
}

const R = 16
const PAD = 30

function TreeFrame({ data }: { data: TTData }) {
  const { nodes, mode, current, stamps, pending, phase } = data
  const w = Math.max(...nodes.map((n) => n.x)) + PAD * 2
  const h = Math.max(...nodes.map((n) => n.y)) + PAD * 2
  const pendingSet = new Set(pending)
  const visitedSeq = nodes
    .filter((n) => stamps[n.id] !== null)
    .sort((a, b) => stamps[a.id]! - stamps[b.id]!)

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="block h-auto"
        style={{ width: '100%', maxWidth: w * 1.2 }}
        role="img"
        aria-label="Binary tree"
      >
        {nodes.map((n) =>
          ([n.left, n.right] as const)
            .filter((c): c is number => c !== null)
            .map((c) => (
              <line
                key={`${n.id}-${c}`}
                x1={n.x + PAD}
                y1={n.y + PAD}
                x2={nodes[c].x + PAD}
                y2={nodes[c].y + PAD}
                strokeWidth={1.5}
                className={`transition-colors duration-300 ${
                  c === current
                    ? 'stroke-accent'
                    : stamps[c] !== null
                      ? 'stroke-ink-faint'
                      : 'stroke-edge'
                }`}
              />
            )),
        )}
        {nodes.map((n) => {
          const isCur = n.id === current
          const visited = stamps[n.id] !== null
          const discovered = pendingSet.has(n.id)
          const cx = n.x + PAD
          const cy = n.y + PAD
          return (
            <g key={n.id}>
              <motion.circle
                cx={cx}
                cy={cy}
                initial={false}
                animate={{ r: isCur ? R + 3 : R }}
                strokeWidth={isCur ? 2.5 : 1.5}
                className={`transition-colors duration-300 ${
                  isCur
                    ? 'fill-accent stroke-accent'
                    : visited
                      ? 'fill-emerald-500/15 stroke-emerald-500'
                      : discovered
                        ? 'fill-amber-500/15 stroke-amber-500'
                        : 'fill-surface-sunken stroke-edge'
                }`}
              />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                className={`pointer-events-none select-none font-mono text-[12px] font-semibold transition-colors duration-300 ${
                  isCur ? 'fill-white' : 'fill-ink'
                }`}
              >
                {n.value}
              </text>
              <AnimatePresence>
                {visited && (
                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <circle cx={cx + R - 2} cy={cy - R + 2} r={8.5} className="fill-emerald-500" />
                    <text
                      x={cx + R - 2}
                      y={cy - R + 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      className="pointer-events-none select-none fill-white font-mono text-[9px] font-bold"
                    >
                      {stamps[n.id]}
                    </text>
                  </motion.g>
                )}
              </AnimatePresence>
            </g>
          )
        })}
      </svg>

      <div className="flex w-full max-w-[560px] flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {mode === 'bfs' ? 'Queue' : 'Stack'}
          </span>
          <div className="flex min-h-[34px] flex-1 flex-wrap items-center gap-1.5 rounded-lg border border-edge bg-surface-sunken px-2.5 py-1.5">
            {mode === 'bfs' && pending.length > 0 && (
              <span className="font-mono text-[10px] text-ink-faint">front →</span>
            )}
            <AnimatePresence mode="popLayout" initial={false}>
              {pending.map((id) => (
                <motion.span
                  key={id}
                  layout
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="rounded-md border border-amber-500/50 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400"
                >
                  {nodes[id].value}
                </motion.span>
              ))}
            </AnimatePresence>
            {pending.length === 0 ? (
              <span className="text-xs italic text-ink-faint">
                {phase === 'done' ? 'empty — traversal complete' : 'empty'}
              </span>
            ) : (
              mode !== 'bfs' && <span className="font-mono text-[10px] text-ink-faint">← top</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-14 shrink-0 text-right text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Visited
          </span>
          <div className="flex min-h-[34px] flex-1 flex-wrap items-center gap-1.5 rounded-lg border border-edge bg-surface-sunken px-2.5 py-1.5">
            <AnimatePresence initial={false}>
              {visitedSeq.map((n) => (
                <motion.span
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-emerald-600 dark:text-emerald-400"
                >
                  {n.value}
                </motion.span>
              ))}
            </AnimatePresence>
            {visitedSeq.length === 0 && <span className="text-xs italic text-ink-faint">none yet</span>}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-[11px] text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" /> current
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-amber-500 bg-amber-500/20" />{' '}
          {mode === 'bfs' ? 'in queue' : 'on stack'}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-emerald-500 bg-emerald-500/20" /> visited
        </span>
      </div>
    </div>
  )
}

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: 'bfs', label: 'BFS (level order)' },
  { value: 'preorder', label: 'DFS pre-order' },
  { value: 'inorder', label: 'DFS in-order' },
  { value: 'postorder', label: 'DFS post-order' },
]

export default function TreeTraversalVisualizer() {
  const [levels, setLevels] = useState<(number | null)[]>([8, 3, 10, 1, 6, null, 14])
  const [mode, setMode] = useState<Mode>('bfs')

  const nodes = useMemo(() => buildTree(levels), [levels])
  const frames = useMemo(() => (nodes ? buildFrames(nodes, mode) : []), [nodes, mode])
  const resetKey = `${levels.map((v) => (v === null ? 'n' : v)).join(',')}|${mode}`

  return (
    <div>
      <VizInputRow>
        <VizTextInput
          label="Tree (level order)"
          defaultValue={levels.map((v) => (v === null ? 'null' : v)).join(', ')}
          hint={`Comma-separated, "null" for a missing child (max ${MAX_NODES} nodes)`}
          onParsed={(raw) => {
            const parsed = parseLevelOrder(raw)
            if (parsed && buildTree(parsed)) {
              setLevels(parsed)
              return true
            }
            return false
          }}
        />
        <VizSelect label="Traversal" value={mode} options={MODE_OPTIONS} onChange={setMode} />
      </VizInputRow>
      <StepPlayer
        frames={frames}
        pseudocode={PSEUDOCODE[mode]}
        resetKey={resetKey}
        renderFrame={(f) => <TreeFrame data={f.data} />}
      />
    </div>
  )
}
