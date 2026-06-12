/**
 * Graph Traversal visualizer: BFS ripple vs DFS dive on a small grid.
 * BFS expands a frontier outward, settling cells in distance-colored rings;
 * DFS snakes toward the goal and visibly backtracks out of dead ends. When
 * the goal is reached, the found path is highlighted by walking parent links.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { frame, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizSelect, VizTextInput } from '../inputs'

type Mode = 'bfs' | 'dfs'

interface GTData {
  mode: Mode
  rows: number
  cols: number
  /** Flattened wall mask — built once per buildFrames call, never mutated. */
  walls: boolean[]
  /** BFS: discovery distance per cell (null = unseen). */
  dist: (number | null)[]
  /** BFS: cells currently waiting in the queue. */
  frontier: number[]
  /** DFS: the active path, bottom → top of stack. */
  stack: number[]
  /** DFS: every cell ever visited (popped cells stay here). */
  visited: number[]
  /** Cell the head marker sits on. */
  current: number | null
  /** Found path — grows while walking parent links back to S. */
  path: number[] | null
  backtracks: number
  status: 'running' | 'found' | 'no-path'
}

const BFS_PSEUDOCODE = [
  'queue = [S]; dist[S] = 0',
  'while queue:',
  '    cell = queue.popleft()',
  '    if cell == G:',
  '        return walk_parents(G)',
  '    for nb in open_neighbors(cell):',
  '        if dist[nb] is None:',
  '            dist[nb] = dist[cell] + 1',
  '            queue.append(nb)',
  'return None  # unreachable',
]

const DFS_PSEUDOCODE = [
  'stack = [S]; visited = {S}',
  'while stack:',
  '    cell = stack[-1]',
  '    if cell == G:',
  '        return stack  # the path',
  '    nb = first unvisited neighbor',
  '    if nb:',
  '        visited.add(nb)',
  '        stack.append(nb)',
  '    else:',
  '        stack.pop()  # backtrack',
]

/** Neighbor order right, down, left, up — DFS dives toward the goal first. */
function neighborsOf(i: number, rows: number, cols: number): number[] {
  const r = Math.floor(i / cols)
  const c = i % cols
  const out: number[] = []
  if (c + 1 < cols) out.push(i + 1)
  if (r + 1 < rows) out.push(i + cols)
  if (c - 1 >= 0) out.push(i - 1)
  if (r - 1 >= 0) out.push(i - cols)
  return out
}

function buildBfsFrames(walls: boolean[], rows: number, cols: number): Frame<GTData>[] {
  const n = rows * cols
  const goal = n - 1
  const at = (i: number) => `(${Math.floor(i / cols)},${i % cols})`
  const frames: Frame<GTData>[] = []
  const dist: (number | null)[] = Array(n).fill(null)
  const parent: (number | null)[] = Array(n).fill(null)
  const queue: number[] = [0]
  dist[0] = 0

  const snap = (current: number | null, path: number[] | null, status: GTData['status']): GTData => ({
    mode: 'bfs',
    rows,
    cols,
    walls,
    dist: [...dist],
    frontier: [...queue],
    stack: [],
    visited: [],
    current,
    path: path ? [...path] : null,
    backtracks: 0,
    status,
  })

  frames.push(
    frame(
      snap(null, null, 'running'),
      `BFS from S=(0,0): the queue holds just S with dist 0. Goal is G=(${rows - 1},${cols - 1}).`,
      1,
    ),
  )

  let found = false
  while (queue.length) {
    const cell = queue.shift() as number
    if (cell === goal) {
      frames.push(
        frame(
          snap(cell, [goal], 'found'),
          `Dequeued G=${at(goal)} at distance ${dist[goal]} — shortest possible. Now walk parent links back to S.`,
          4,
        ),
      )
      found = true
      break
    }
    const d = dist[cell] as number
    const discovered: number[] = []
    for (const nb of neighborsOf(cell, rows, cols)) {
      if (!walls[nb] && dist[nb] === null) {
        dist[nb] = d + 1
        parent[nb] = cell
        queue.push(nb)
        discovered.push(nb)
      }
    }
    frames.push(
      frame(
        snap(cell, null, 'running'),
        discovered.length
          ? `Dequeue ${at(cell)} (dist ${d}): discovered ${discovered.length} new cell${discovered.length === 1 ? '' : 's'} at dist ${d + 1} — frontier grows to ${queue.length}.`
          : `Dequeue ${at(cell)} (dist ${d}): every neighbor is a wall or already seen — frontier shrinks to ${queue.length}.`,
        discovered.length ? 9 : 6,
      ),
    )
  }

  if (!found) {
    frames.push(
      frame(
        snap(null, null, 'no-path'),
        `Queue is empty: every reachable cell is settled and G=${at(goal)} was never reached — no path exists.`,
        10,
      ),
    )
    return frames
  }

  const total = (dist[goal] as number) + 1
  const revealed: number[] = [goal]
  let child = goal
  let cur = parent[goal]
  while (cur !== null) {
    revealed.unshift(cur)
    frames.push(
      frame(
        snap(cur, revealed, 'found'),
        cur === 0
          ? `parent[${at(child)}] = S=(0,0) — shortest path locked in: ${revealed.length} cells, ${revealed.length - 1} moves.`
          : `parent[${at(child)}] = ${at(cur)} — path grown to ${revealed.length} of ${total} cells.`,
        5,
      ),
    )
    child = cur
    cur = parent[cur]
  }
  return frames
}

function buildDfsFrames(walls: boolean[], rows: number, cols: number): Frame<GTData>[] {
  const n = rows * cols
  const goal = n - 1
  const at = (i: number) => `(${Math.floor(i / cols)},${i % cols})`
  const frames: Frame<GTData>[] = []
  const stack: number[] = [0]
  const visited = new Set<number>([0])
  let backtracks = 0

  const snap = (status: GTData['status']): GTData => ({
    mode: 'dfs',
    rows,
    cols,
    walls,
    dist: [],
    frontier: [],
    stack: [...stack],
    visited: [...visited],
    current: stack.length ? (stack[stack.length - 1] as number) : null,
    path: status === 'found' ? [...stack] : null,
    backtracks,
    status,
  })

  frames.push(
    frame(
      snap('running'),
      `DFS from S=(0,0): push S onto the stack. Goal is G=(${rows - 1},${cols - 1}); try right, down, left, up — in that order.`,
      1,
    ),
  )

  let found = false
  while (stack.length) {
    const cell = stack[stack.length - 1] as number
    if (cell === goal) {
      frames.push(
        frame(
          snap('found'),
          `G=${at(goal)} is on top of the stack — the stack IS the path: ${stack.length} cells, after ${backtracks} backtrack${backtracks === 1 ? '' : 's'}.`,
          5,
        ),
      )
      found = true
      break
    }
    const nb = neighborsOf(cell, rows, cols).find((j) => !walls[j] && !visited.has(j))
    if (nb !== undefined) {
      visited.add(nb)
      stack.push(nb)
      frames.push(
        frame(
          snap('running'),
          `Dive ${at(cell)} → ${at(nb)}: the path is now ${stack.length} cells deep.`,
          9,
        ),
      )
    } else {
      stack.pop()
      backtracks++
      frames.push(
        frame(
          snap('running'),
          `Dead end at ${at(cell)} — all neighbors are walls or visited. Pop it (backtrack #${backtracks}); path shrinks to ${stack.length}.`,
          11,
        ),
      )
    }
  }

  if (!found) {
    frames.push(
      frame(
        snap('no-path'),
        `Stack is empty after ${backtracks} backtracks — G=${at(goal)} is unreachable.`,
        2,
      ),
    )
  }
  return frames
}

function buildFrames(grid: boolean[][], mode: Mode): Frame<GTData>[] {
  const rows = grid.length
  const cols = (grid[0] as boolean[]).length
  const walls = grid.flat()
  return mode === 'bfs' ? buildBfsFrames(walls, rows, cols) : buildDfsFrames(walls, rows, cols)
}

/** Distance ring palette — emerald is reserved for the final path. */
const RING_STYLES = [
  'border-accent/60 bg-accent/20 text-accent',
  'border-violet-500/60 bg-violet-500/20 text-violet-600 dark:text-violet-400',
  'border-amber-500/60 bg-amber-500/20 text-amber-600 dark:text-amber-400',
  'border-red-500/60 bg-red-500/20 text-red-600 dark:text-red-400',
]

function GridFrame({ data }: { data: GTData }) {
  const { mode, rows, cols, walls, dist, frontier, stack, visited, current, path, backtracks, status } = data
  const frontierSet = new Set(frontier)
  const stackSet = new Set(stack)
  const visitedSet = new Set(visited)
  const pathSet = new Set(path ?? [])
  const n = rows * cols
  const goal = n - 1
  const settledCount = dist.filter((d) => d !== null).length - frontier.length

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-2">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 2.5rem)` }}>
        {Array.from({ length: n }, (_, i) => {
          const isWall = walls[i]
          const inPath = pathSet.has(i)
          const isHead = current === i && !isWall
          let cls = 'border-edge bg-surface-sunken text-ink-faint'
          let distLabel: number | null = null
          if (isWall) {
            cls = 'border-transparent bg-ink/70'
          } else if (inPath) {
            cls = 'border-emerald-500 bg-emerald-500/25 font-bold text-emerald-600 dark:text-emerald-400'
          } else if (mode === 'bfs') {
            const d = dist[i]
            if (frontierSet.has(i)) cls = 'border-dashed border-accent bg-accent/10 text-accent'
            else if (d !== null) cls = RING_STYLES[d % RING_STYLES.length]
            if (d !== null) distLabel = d
          } else if (stackSet.has(i)) {
            cls = 'border-accent bg-accent/20 font-semibold text-accent'
          } else if (visitedSet.has(i)) {
            cls = 'border-red-500/40 bg-red-500/10 text-red-600/70 dark:text-red-400/70'
          }
          const text = i === 0 ? 'S' : i === goal ? 'G' : distLabel
          return (
            <motion.div
              key={i}
              animate={{ scale: isHead ? 1.1 : frontierSet.has(i) ? 1.04 : 1 }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-[12px] tabular-nums transition-colors duration-300 ${cls}`}
            >
              {text}
              {isHead && (
                <motion.div
                  layoutId="gt-head"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className={`pointer-events-none absolute -inset-0.5 rounded-lg ring-2 ${
                    status === 'found' ? 'ring-emerald-500' : 'ring-accent'
                  }`}
                />
              )}
            </motion.div>
          )
        })}
      </div>

      <div className="flex items-center gap-4 font-mono text-xs tabular-nums text-ink-muted">
        {status === 'no-path' ? (
          <span className="font-semibold text-red-500">goal unreachable</span>
        ) : mode === 'bfs' ? (
          <>
            <span>
              frontier <span className="font-semibold text-accent">{frontier.length}</span>
            </span>
            <span>
              settled <span className="font-semibold text-ink">{settledCount}</span>
            </span>
            {path && (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                path {path.length}/{(dist[goal] ?? 0) + 1} cells
              </span>
            )}
          </>
        ) : (
          <>
            <span>
              path <span className="font-semibold text-accent">{stack.length}</span>
            </span>
            <span>
              backtracks{' '}
              <span className="font-semibold text-amber-600 dark:text-amber-400">{backtracks}</span>
            </span>
            {path && (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                found — {path.length} cells
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** Chosen so BFS shows rings flowing around walls AND DFS visibly dead-ends
 *  in the top-right pocket and backtracks before snaking down the left side. */
const DEFAULT_GRID = '......,..##.#,.#..##,......'

/** Rows of . and # separated by commas; 2–6 rows × 2–8 cols; S and G open. */
function parseGrid(raw: string): boolean[][] | null {
  const rows = raw
    .split(/[,;\s]+/)
    .map((r) => r.trim())
    .filter(Boolean)
  if (rows.length < 2 || rows.length > 6) return null
  const w = (rows[0] as string).length
  if (w < 2 || w > 8) return null
  const grid: boolean[][] = []
  for (const row of rows) {
    if (row.length !== w || !/^[.#]+$/.test(row)) return null
    grid.push([...row].map((ch) => ch === '#'))
  }
  if ((grid[0] as boolean[])[0] || (grid[rows.length - 1] as boolean[])[w - 1]) return null
  return grid
}

export default function GraphTraversalVisualizer() {
  const [mode, setMode] = useState<Mode>('bfs')
  const [grid, setGrid] = useState<boolean[][]>(() => parseGrid(DEFAULT_GRID) as boolean[][])

  const frames = useMemo(() => buildFrames(grid, mode), [grid, mode])
  const gridKey = grid.map((row) => row.map((w) => (w ? '#' : '.')).join('')).join(',')
  const resetKey = `${mode}|${gridKey}`

  return (
    <div>
      <VizInputRow>
        <VizSelect
          label="Traversal"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'bfs', label: 'BFS (ripple)' },
            { value: 'dfs', label: 'DFS (dive)' },
          ]}
        />
        <VizTextInput
          label="Grid"
          defaultValue={DEFAULT_GRID}
          hint="Rows of . (open) and # (wall), comma-separated — max 6×8. S = top-left, G = bottom-right."
          onParsed={(raw) => {
            const parsed = parseGrid(raw)
            if (parsed) {
              setGrid(parsed)
              return true
            }
            return false
          }}
        />
      </VizInputRow>
      <StepPlayer
        frames={frames}
        pseudocode={mode === 'bfs' ? BFS_PSEUDOCODE : DFS_PSEUDOCODE}
        resetKey={resetKey}
        renderFrame={(f) => <GridFrame data={f.data} />}
      />
    </div>
  )
}
