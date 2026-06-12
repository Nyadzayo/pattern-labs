/**
 * Backtracking visualizer: the recursion tree for subsets or permutations
 * of a small list, growing edge by edge. Each step either descends
 * (choose), records a complete solution (leaf turns emerald and joins the
 * results row), backtracks (the finished subtree dims), or — for
 * permutations — prunes an already-used element (a ghost branch flashes
 * "pruned" and stays grayed out).
 */
import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { frame, parseIntList, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizSelect, VizTextInput } from '../inputs'

type Mode = 'subsets' | 'permutations'
type NodeStatus = 'active' | 'path' | 'solution' | 'done' | 'pruning' | 'pruned'
type Phase = 'start' | 'choose' | 'record' | 'unchoose' | 'prune' | 'done'

interface BTData {
  /** node id → status; ids absent from the map are not yet discovered. */
  status: Record<string, NodeStatus>
  activeId: string | null
  results: string[]
  path: string
  phase: Phase
}

interface TreeNode {
  id: string
  depth: number
  label: string
  ghost: boolean
  children: TreeNode[]
  weight: number
  x: number
  y: number
}

interface FlatNode {
  id: string
  x: number
  y: number
  label: string
  ghost: boolean
  /** Parent center, for the incoming edge (undefined at the root). */
  px?: number
  py?: number
}

interface Built {
  flat: FlatNode[]
  w: number
  h: number
  totalSolutions: number
  frames: Frame<BTData>[]
}

const SUBSETS_CODE = [
  'def backtrack(i, cur):',
  '    if i == n:',
  '        res.append(cur.copy())',
  '        return',
  '    cur.append(nums[i])    # choose',
  '    backtrack(i + 1, cur)  # explore',
  '    cur.pop()              # un-choose',
  '    backtrack(i + 1, cur)  # skip nums[i]',
  'backtrack(0, [])',
]

const PERMS_CODE = [
  'def backtrack(path):',
  '    if len(path) == n:',
  '        res.append(path.copy())',
  '        return',
  '    for x in nums:',
  '        if x in path:',
  '            continue       # prune',
  '        path.append(x)     # choose',
  '        backtrack(path)    # explore',
  '        path.pop()         # un-choose',
  'backtrack([])',
]

// ---------- geometry ----------
const SLOT_W = 40
const LEVEL_H = 60
const GHOST_W = 0.8
const PAD_X = 26
const PAD_TOP = 22
const R = 13

function buildSubsetTree(items: number[]): TreeNode {
  const n = items.length
  const make = (depth: number, id: string, label: string): TreeNode => {
    const node: TreeNode = { id, depth, label, ghost: false, children: [], weight: 0, x: 0, y: 0 }
    if (depth < n) {
      node.children.push(make(depth + 1, `${id}I`, `+${items[depth]}`))
      node.children.push(make(depth + 1, `${id}E`, `−${items[depth]}`))
    }
    return node
  }
  return make(0, 'R', '∅')
}

function buildPermTree(items: number[]): TreeNode {
  const n = items.length
  const make = (used: number[], depth: number, id: string, label: string, ghost: boolean): TreeNode => {
    const node: TreeNode = { id, depth, label, ghost, children: [], weight: 0, x: 0, y: 0 }
    if (!ghost && depth < n) {
      for (let k = 0; k < n; k++) {
        const isUsed = used.includes(k)
        node.children.push(
          make(isUsed ? used : [...used, k], depth + 1, `${id}.${k}`, String(items[k]), isUsed),
        )
      }
    }
    return node
  }
  return make([], 0, 'R', '∅', false)
}

/** Tidy layout: leaves get sequential slots, parents sit over their children. */
function layoutTree(root: TreeNode): { w: number; h: number } {
  const weigh = (node: TreeNode): number => {
    node.weight = node.children.length
      ? node.children.reduce((s, c) => s + weigh(c), 0)
      : node.ghost
        ? GHOST_W
        : 1
    return node.weight
  }
  weigh(root)
  let maxDepth = 0
  const place = (node: TreeNode, offset: number) => {
    maxDepth = Math.max(maxDepth, node.depth)
    if (!node.children.length) {
      node.x = PAD_X + (offset + node.weight / 2) * SLOT_W
    } else {
      let o = offset
      for (const c of node.children) {
        place(c, o)
        o += c.weight
      }
      node.x = (node.children[0].x + node.children[node.children.length - 1].x) / 2
    }
    node.y = PAD_TOP + R + node.depth * LEVEL_H
  }
  place(root, 0)
  return { w: 2 * PAD_X + root.weight * SLOT_W, h: PAD_TOP + 2 * R + maxDepth * LEVEL_H + 24 }
}

const fmtList = (vals: number[]) => `[${vals.join(', ')}]`
const fmtSet = (vals: number[]) => (vals.length ? `{${vals.join(', ')}}` : '{ }')

/** Pure builder: (mode, items) → static layout + frames. */
function buildAll(mode: Mode, items: number[]): Built {
  const root = mode === 'subsets' ? buildSubsetTree(items) : buildPermTree(items)
  const { w, h } = layoutTree(root)

  const flat: FlatNode[] = []
  const collect = (node: TreeNode, parent: TreeNode | null) => {
    flat.push({
      id: node.id,
      x: node.x,
      y: node.y,
      label: node.label,
      ghost: node.ghost,
      px: parent?.x,
      py: parent?.y,
    })
    node.children.forEach((c) => collect(c, node))
  }
  collect(root, null)

  const n = items.length
  const frames: Frame<BTData>[] = []
  const status: Record<string, NodeStatus> = {}
  const results: string[] = []
  let activeId: string | null = root.id

  const push = (codeLine: number, caption: string, phase: Phase, path: string) => {
    frames.push(frame({ status: { ...status }, activeId, results: [...results], path, phase }, caption, codeLine))
    // A prune highlight only lasts one frame, then the ghost stays faint.
    for (const key of Object.keys(status)) {
      if (status[key] === 'pruning') status[key] = 'pruned'
    }
  }

  /** After returning from a subtree, dim everything in it except solutions. */
  const dim = (node: TreeNode) => {
    const st = status[node.id]
    if (st !== undefined && st !== 'solution' && st !== 'pruned') status[node.id] = 'done'
    node.children.forEach(dim)
  }

  if (mode === 'subsets') {
    status[root.id] = 'active'
    push(9, `Call backtrack(0, []). At each index we branch twice: include the element, or skip it.`, 'start', '[]')
    const visit = (node: TreeNode, cur: number[]) => {
      if (node.depth === n) {
        status[node.id] = 'solution'
        results.push(fmtSet(cur))
        push(3, `i = ${n}: every element is decided — record subset ${fmtSet(cur)}.`, 'record', fmtList(cur))
        return
      }
      const v = items[node.depth]
      const [inc, exc] = node.children
      status[node.id] = 'path'
      status[inc.id] = 'active'
      activeId = inc.id
      push(5, `Choose ${v}: append it, cur = ${fmtList([...cur, v])}. Recurse to index ${node.depth + 1}.`, 'choose', fmtList([...cur, v]))
      visit(inc, [...cur, v])
      dim(inc)
      status[node.id] = 'active'
      activeId = node.id
      push(7, `Un-choose ${v}: pop it off — backtrack to cur = ${fmtList(cur)}.`, 'unchoose', fmtList(cur))
      status[node.id] = 'path'
      status[exc.id] = 'active'
      activeId = exc.id
      push(8, `Skip ${v}: recurse without it — cur stays ${fmtList(cur)}.`, 'choose', fmtList(cur))
      visit(exc, cur)
      dim(exc)
      status[node.id] = 'active'
      activeId = node.id
      push(8, `Both branches for ${v} explored — backtrack to cur = ${fmtList(cur)}.`, 'unchoose', fmtList(cur))
    }
    visit(root, [])
    dim(root)
    activeId = null
    push(9, `Tree fully explored — ${results.length} subsets recorded (2^${n} = ${results.length}).`, 'done', '[]')
  } else {
    status[root.id] = 'active'
    push(11, `Call backtrack([]). At every level, try each of the ${n} elements that is not already used.`, 'start', '[]')
    const visit = (node: TreeNode, cur: number[]) => {
      if (node.depth === n) {
        status[node.id] = 'solution'
        results.push(fmtList(cur))
        push(3, `path = ${fmtList(cur)} uses all ${n} elements — record this permutation.`, 'record', fmtList(cur))
        return
      }
      node.children.forEach((child, k) => {
        const v = items[k]
        if (child.ghost) {
          status[child.id] = 'pruning'
          push(7, `${v} is already in ${fmtList(cur)} — prune this branch and try the next element.`, 'prune', fmtList(cur))
        } else {
          status[node.id] = 'path'
          status[child.id] = 'active'
          activeId = child.id
          push(8, `Choose ${v}: path = ${fmtList([...cur, v])}. Recurse one level deeper.`, 'choose', fmtList([...cur, v]))
          visit(child, [...cur, v])
          dim(child)
          status[node.id] = 'active'
          activeId = node.id
          push(10, `Un-choose ${v}: pop it — backtrack to path = ${fmtList(cur)}.`, 'unchoose', fmtList(cur))
        }
      })
    }
    visit(root, [])
    dim(root)
    activeId = null
    push(11, `All ${results.length} permutations of ${fmtList(items)} found (${n}! = ${results.length}).`, 'done', '[]')
  }

  return { flat, w, h, totalSolutions: results.length, frames }
}

// ---------- rendering ----------

function edgeClass(st: NodeStatus): string {
  switch (st) {
    case 'active':
      return 'stroke-accent'
    case 'path':
      return 'stroke-accent/70'
    case 'solution':
      return 'stroke-emerald-500'
    case 'pruning':
      return 'stroke-ink-faint'
    case 'pruned':
    case 'done':
      return 'stroke-edge'
  }
}

function circleClass(st: NodeStatus): string {
  switch (st) {
    case 'active':
      return 'fill-accent/15 stroke-accent'
    case 'path':
      return 'fill-accent/10 stroke-accent/60'
    case 'solution':
      return 'fill-emerald-500/15 stroke-emerald-500'
    case 'pruning':
    case 'pruned':
      return 'fill-surface-sunken stroke-ink-faint'
    case 'done':
      return 'fill-surface-raised stroke-edge'
  }
}

function labelClass(st: NodeStatus): string {
  switch (st) {
    case 'active':
    case 'path':
      return 'fill-ink'
    case 'solution':
      return 'fill-emerald-600 dark:fill-emerald-400'
    case 'pruning':
      return 'fill-ink-muted'
    case 'pruned':
    case 'done':
      return 'fill-ink-faint'
  }
}

const GROUP_OPACITY: Record<NodeStatus, number> = {
  active: 1,
  path: 1,
  solution: 1,
  pruning: 0.95,
  pruned: 0.35,
  done: 0.45,
}

const PHASE_STYLE: Record<Phase, string> = {
  start: 'border-edge text-ink-muted',
  choose: 'border-accent/50 bg-accent/10 text-accent',
  record: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  unchoose: 'border-violet-500/50 bg-violet-500/10 text-violet-600 dark:text-violet-400',
  prune: 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  done: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
}

const PHASE_LABEL: Record<Phase, string> = {
  start: 'start',
  choose: 'choose + explore',
  record: 'record ✓',
  unchoose: 'un-choose',
  prune: 'prune',
  done: 'done',
}

function BTFrame({ built, data, mode }: { built: Built; data: BTData; mode: Mode }) {
  const { status, activeId, results, path, phase } = data
  const visible = built.flat.filter((node) => status[node.id] !== undefined)

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-sm tabular-nums text-ink-muted">
          {mode === 'subsets' ? 'cur' : 'path'} ={' '}
          <span className="font-semibold text-ink">{path}</span>
        </div>
        <motion.span
          key={phase}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${PHASE_STYLE[phase]}`}
        >
          {PHASE_LABEL[phase]}
        </motion.span>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <svg
          viewBox={`0 0 ${built.w} ${built.h}`}
          className="h-auto w-full"
          style={{ maxWidth: Math.max(built.w * 1.4, 340), maxHeight: 330 }}
        >
          <AnimatePresence>
            {visible.map((node) => {
              if (node.px === undefined || node.py === undefined) return null
              const st = status[node.id]
              const dx = node.x - node.px
              const dy = node.y - node.py
              const len = Math.hypot(dx, dy) || 1
              const x1 = node.px + (dx / len) * (R + 2)
              const y1 = node.py + (dy / len) * (R + 2)
              const x2 = node.x - (dx / len) * (R + 2)
              const y2 = node.y - (dy / len) * (R + 2)
              const dashed = node.ghost
              const opacity = st === 'done' ? 0.5 : st === 'pruned' ? 0.3 : 1
              return (
                <motion.line
                  key={`e-${node.id}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={edgeClass(st)}
                  strokeWidth={st === 'active' || st === 'path' ? 2 : 1.5}
                  strokeLinecap="round"
                  strokeDasharray={dashed ? '4 3' : undefined}
                  initial={dashed ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
                  animate={dashed ? { opacity } : { pathLength: 1, opacity }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )
            })}
          </AnimatePresence>
          <AnimatePresence>
            {visible.map((node) => {
              const st = status[node.id]
              const isActive = activeId === node.id
              return (
                <motion.g
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: GROUP_OPACITY[st], scale: isActive ? 1.12 : 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                  transition={{ duration: 0.28 }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                >
                  {isActive && (
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r={R + 4.5}
                      fill="none"
                      strokeWidth={1.5}
                      className={st === 'solution' ? 'stroke-emerald-500' : 'stroke-accent'}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.85 }}
                    />
                  )}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={R}
                    strokeWidth={1.5}
                    strokeDasharray={node.ghost ? '3 3' : undefined}
                    className={circleClass(st)}
                  />
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={9.5}
                    className={`font-mono ${labelClass(st)}`}
                  >
                    {node.label}
                  </text>
                  {st === 'pruning' && (
                    <text
                      x={node.x}
                      y={node.y + R + 11}
                      textAnchor="middle"
                      fontSize={8}
                      className="fill-amber-500 font-mono font-semibold"
                    >
                      pruned
                    </text>
                  )}
                </motion.g>
              )
            })}
          </AnimatePresence>
        </svg>
      </div>

      <div className="flex min-h-[30px] flex-wrap items-center gap-1.5 border-t border-edge pt-3">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          results {results.length}/{built.totalSolutions}
        </span>
        <AnimatePresence>
          {results.map((r) => (
            <motion.span
              key={r}
              layout
              initial={{ opacity: 0, scale: 0.5, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-emerald-600 dark:text-emerald-400"
            >
              {r}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function BacktrackingVisualizer() {
  const [mode, setMode] = useState<Mode>('subsets')
  const [items, setItems] = useState<number[]>([1, 2, 3])

  // Permutation trees fan out as n! — keep them to 3 elements (subsets: 4).
  const effective = useMemo(
    () => (mode === 'permutations' ? items.slice(0, 3) : items.slice(0, 4)),
    [mode, items],
  )
  const built = useMemo(() => buildAll(mode, effective), [mode, effective])
  const resetKey = `${mode}|${effective.join(',')}`

  return (
    <div>
      <VizInputRow>
        <VizSelect<Mode>
          label="Problem"
          value={mode}
          options={[
            { value: 'subsets', label: 'Subsets (include / skip)' },
            { value: 'permutations', label: 'Permutations (used-set pruning)' },
          ]}
          onChange={setMode}
        />
        <VizTextInput
          label="Elements"
          defaultValue={items.join(', ')}
          hint="Distinct integers 0–99 — subsets use up to 4, permutations the first 3"
          onParsed={(raw) => {
            const parsed = parseIntList(raw, { min: 0, max: 99, maxLen: 4 })
            if (parsed && new Set(parsed).size === parsed.length) {
              setItems(parsed)
              return true
            }
            return false
          }}
        />
      </VizInputRow>
      <StepPlayer
        frames={built.frames}
        pseudocode={mode === 'subsets' ? SUBSETS_CODE : PERMS_CODE}
        resetKey={resetKey}
        renderFrame={(f) => <BTFrame built={built} data={f.data} mode={mode} />}
      />
    </div>
  )
}
