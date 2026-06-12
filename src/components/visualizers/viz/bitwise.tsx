/**
 * Bitwise visualizer: an 8-bit register view of AND / OR / XOR computed
 * bit by bit right-to-left, plus left/right shifts where the bits
 * physically slide, the dropped bit falls off the edge, and a fresh zero
 * fills the vacated position. Editable inputs → pure buildFrames →
 * <StepPlayer>.
 */
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { frame, parseIntList, type Frame } from '../engine'
import { StepPlayer } from '../StepPlayer'
import { VizInputRow, VizSelect, VizTextInput } from '../inputs'

type OpKey = 'and' | 'or' | 'xor' | 'shl' | 'shr'
type Bit = 0 | 1

const OPS = {
  and: { name: 'AND', sym: '&', fn: (x: number, y: number) => x & y },
  or: { name: 'OR', sym: '|', fn: (x: number, y: number) => x | y },
  xor: { name: 'XOR', sym: '^', fn: (x: number, y: number) => x ^ y },
} as const

interface BitToken {
  id: string
  v: Bit
  /** true when this bit is a zero that filled a vacated position. */
  fresh: boolean
}

interface BinaryData {
  kind: 'binary'
  op: 'and' | 'or' | 'xor'
  a: number
  b: number
  aBits: Bit[] // MSB first
  bBits: Bit[]
  result: (Bit | null)[] // MSB first; null = not yet computed
  activeCol: number | null // 0..7, MSB first
  rule: string | null // e.g. "1 & 0 = 0"
  done: boolean
}

interface ShiftData {
  kind: 'shift'
  dir: 'left' | 'right'
  k: number
  tokens: BitToken[] // current register, MSB first, always 8
  dropping: string | null // token id about to fall off the edge
  dropped: BitToken[] // tokens dropped so far, most recent last
  value: number
  done: boolean
}

type BitData = BinaryData | ShiftData

function binStr(n: number): string {
  return n.toString(2).padStart(8, '0')
}

function toBits(n: number): Bit[] {
  return Array.from({ length: 8 }, (_, i) => ((n >> (7 - i)) & 1) as Bit)
}

function pseudocodeFor(op: OpKey): string[] {
  if (op === 'shl')
    return [
      'for s in range(k):',
      '    drop = (a >> 7) & 1  # MSB falls off',
      '    a = (a << 1) & 0xFF  # 0 fills bit 0',
      'return a',
    ]
  if (op === 'shr')
    return [
      'for s in range(k):',
      '    drop = a & 1         # LSB falls off',
      '    a = a >> 1           # 0 fills bit 7',
      'return a',
    ]
  const { sym } = OPS[op]
  return [
    'result = 0',
    'for i in range(8):  # LSB → MSB',
    '    bitA = (a >> i) & 1',
    '    bitB = (b >> i) & 1',
    `    result |= (bitA ${sym} bitB) << i`,
    'return result',
  ]
}

function reasonFor(op: 'and' | 'or' | 'xor', bitA: Bit, bitB: Bit): string {
  if (op === 'and') return bitA && bitB ? 'both bits are 1' : 'AND needs both bits to be 1'
  if (op === 'or') return bitA || bitB ? 'at least one bit is 1' : 'neither bit is 1'
  return bitA !== bitB ? 'the bits differ' : 'the bits match, so XOR gives 0'
}

function buildBinaryFrames(op: 'and' | 'or' | 'xor', a: number, b: number): Frame<BitData>[] {
  const { name, sym, fn } = OPS[op]
  const aBits = toBits(a)
  const bBits = toBits(b)
  const result: (Bit | null)[] = Array.from({ length: 8 }, () => null)
  const frames: Frame<BitData>[] = []
  const snap = (activeCol: number | null, rule: string | null, done = false): BinaryData => ({
    kind: 'binary',
    op,
    a,
    b,
    aBits,
    bBits,
    result: [...result],
    activeCol,
    rule,
    done,
  })

  frames.push(
    frame(
      snap(null, null),
      `a = ${a} (0b${binStr(a)}) and b = ${b} (0b${binStr(b)}). Start with result = 0 and fill its 8 bits right to left.`,
      1,
    ),
  )
  let running = 0
  for (let i = 0; i < 8; i++) {
    const col = 7 - i
    const bitA = ((a >> i) & 1) as Bit
    const bitB = ((b >> i) & 1) as Bit
    frames.push(
      frame(
        snap(col, null),
        `Bit ${i} (place value ${1 << i}): a has ${bitA}, b has ${bitB}.`,
        3,
      ),
    )
    const bit = (fn(bitA, bitB) & 1) as Bit
    result[col] = bit
    running += bit << i
    frames.push(
      frame(
        snap(col, `${bitA} ${sym} ${bitB} = ${bit}`),
        `${bitA} ${name} ${bitB} = ${bit} — ${reasonFor(op, bitA, bitB)}. Write ${bit} at bit ${i}; result so far = ${running}.`,
        5,
      ),
    )
  }
  const res = fn(a, b) & 0xff
  frames.push(
    frame(snap(null, null, true), `All 8 bits done: ${a} ${sym} ${b} = 0b${binStr(res)} = ${res}.`, 6),
  )
  return frames
}

function buildShiftFrames(dir: 'left' | 'right', a0: number, k: number): Frame<BitData>[] {
  const frames: Frame<BitData>[] = []
  let tokens: BitToken[] = toBits(a0).map((v, i) => ({ id: `s${i}`, v, fresh: false }))
  let dropped: BitToken[] = []
  let value = a0
  const sym = dir === 'left' ? '<<' : '>>'
  const snap = (dropping: string | null, done = false): ShiftData => ({
    kind: 'shift',
    dir,
    k,
    tokens: [...tokens],
    dropping,
    dropped: [...dropped],
    value,
    done,
  })

  frames.push(
    frame(
      snap(null),
      `a = ${a0} = 0b${binStr(a0)}. Shift ${dir} by ${k}: each step ${
        dir === 'left' ? 'doubles the value (mod 256)' : 'halves the value, rounding down'
      }.`,
      1,
    ),
  )
  if (k === 0) {
    frames.push(frame(snap(null, true), `k = 0, so there is nothing to shift — a stays ${a0}.`, 4))
    return frames
  }
  for (let s = 1; s <= k; s++) {
    const dropTok = dir === 'left' ? tokens[0] : tokens[7]
    frames.push(
      frame(
        snap(dropTok.id),
        `Shift ${s} of ${k}: bit ${dir === 'left' ? 7 : 0} holds ${dropTok.v} — it falls off the ${dir} edge.`,
        2,
      ),
    )
    const prev = value
    if (dir === 'left') {
      tokens = [...tokens.slice(1), { id: `f${s}`, v: 0, fresh: true }]
      value = (value << 1) & 0xff
    } else {
      tokens = [{ id: `f${s}`, v: 0, fresh: true }, ...tokens.slice(0, 7)]
      value = value >> 1
    }
    dropped = [...dropped, dropTok]
    const math =
      dir === 'left'
        ? dropTok.v
          ? `${prev} × 2 = ${prev * 2}, minus 256 for the dropped bit, = ${value}`
          : `${prev} × 2 = ${value}`
        : dropTok.v
          ? `⌊${prev} ÷ 2⌋ = ${value}; the dropped 1 was the lost remainder`
          : `${prev} ÷ 2 = ${value}`
    frames.push(
      frame(
        snap(null),
        `Every bit slides one place ${dir}; a fresh 0 fills bit ${dir === 'left' ? 0 : 7}. ${math}.`,
        3,
      ),
    )
  }
  frames.push(frame(snap(null, true), `Done: ${a0} ${sym} ${k} = 0b${binStr(value)} = ${value}.`, 4))
  return frames
}

function buildFrames(op: OpKey, a: number, b: number, k: number): Frame<BitData>[] {
  if (op === 'shl') return buildShiftFrames('left', a, k)
  if (op === 'shr') return buildShiftFrames('right', a, k)
  return buildBinaryFrames(op, a, b)
}

// ---------- rendering ----------

function OperandCell({ v, hot }: { v: Bit; hot: boolean }) {
  return (
    <div
      className={`relative flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-sm transition-colors ${
        hot ? 'border-accent/60 bg-accent/10' : 'border-edge bg-surface-sunken'
      } ${v ? 'font-semibold text-ink' : 'text-ink-faint'}`}
    >
      {v}
    </div>
  )
}

function ResultCell({ v }: { v: Bit | null }) {
  return (
    <div
      className={`relative flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-sm transition-colors ${
        v === null
          ? 'border-dashed border-edge text-ink-faint'
          : 'border-emerald-500/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      }`}
    >
      {v !== null && (
        <motion.span
          initial={{ scale: 0.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          className={v === 1 ? 'font-bold' : ''}
        >
          {v}
        </motion.span>
      )}
    </div>
  )
}

function BinaryFrame({ data }: { data: BinaryData }) {
  const { op, a, b, aBits, bBits, result, activeCol, rule, done } = data
  const { name, sym, fn } = OPS[op]
  const running = result.reduce<number>((acc, v, col) => acc + (v ?? 0) * (1 << (7 - col)), 0)
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-2">
      <div className="flex items-start gap-1.5">
        {/* row labels */}
        <div className="flex flex-col items-end gap-1.5 pr-1.5 font-mono text-xs text-ink-muted">
          <div className="h-4" />
          <div className="flex h-10 items-center">a</div>
          <div className="flex h-10 items-center">{sym} b</div>
          <div className="h-px" />
          <div className="flex h-10 items-center text-ink-faint">=</div>
        </div>
        {/* bit columns, MSB left */}
        {aBits.map((av, col) => {
          const active = activeCol === col
          return (
            <div key={col} className="relative flex flex-col items-center gap-1.5">
              {active && (
                <motion.div
                  layoutId="bw-col"
                  className="absolute -inset-x-1 -bottom-1 top-[18px] rounded-lg border border-accent/40 bg-accent/10"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <div className="flex h-4 items-center font-mono text-[10px] tabular-nums text-ink-faint">
                {1 << (7 - col)}
              </div>
              <OperandCell v={av} hot={active} />
              <OperandCell v={bBits[col]} hot={active} />
              <div className="relative h-px w-10 bg-edge" />
              <ResultCell v={result[col]} />
            </div>
          )
        })}
        {/* decimal labels */}
        <div className="flex flex-col items-start gap-1.5 pl-1.5 font-mono text-xs tabular-nums text-ink-faint">
          <div className="h-4" />
          <div className="flex h-10 items-center">= {a}</div>
          <div className="flex h-10 items-center">= {b}</div>
          <div className="h-px" />
          <div className={`flex h-10 items-center ${done ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-ink'}`}>
            = {running}
          </div>
        </div>
      </div>
      {/* per-bit rule / final result */}
      <div className="flex h-8 items-center font-mono text-sm tabular-nums">
        {rule ? (
          <motion.div
            key={`${rule}-${activeCol}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-md border border-edge bg-surface-sunken px-3 py-1 text-ink"
          >
            {rule}
          </motion.div>
        ) : done ? (
          <span className="font-bold text-emerald-600 dark:text-emerald-400">
            {a} {sym} {b} = {fn(a, b) & 0xff}
          </span>
        ) : (
          <span className="text-ink-faint">{name} each column, right to left</span>
        )}
      </div>
    </div>
  )
}

function ShiftFrame({ data }: { data: ShiftData }) {
  const { dir, k, tokens, dropping, dropped, value, done } = data
  const lastDropped = dropped.length ? dropped[dropped.length - 1] : null
  const dropZone = (side: 'left' | 'right') => (
    <div className={`relative flex h-[52px] w-12 items-center ${side === 'left' ? 'justify-end' : 'justify-start'}`}>
      {dir === side && lastDropped && (
        <>
          <motion.div
            layoutId={`bit-${lastDropped.id}`}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-red-500/50 font-mono text-sm text-red-500/80 line-through opacity-70"
          >
            {lastDropped.v}
          </motion.div>
          <div className="absolute -bottom-3 left-0 right-0 text-center text-[9px] font-semibold uppercase tracking-wider text-red-500/70">
            dropped
          </div>
        </>
      )}
    </div>
  )
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 py-2">
      <div className="flex flex-col items-center gap-1.5">
        {/* static bit-position labels, MSB left */}
        <div className="flex items-center gap-2">
          <div className="w-12" />
          <div className="flex gap-1.5 px-[7px]">
            {[7, 6, 5, 4, 3, 2, 1, 0].map((p) => (
              <div key={p} className="w-10 text-center font-mono text-[10px] tabular-nums text-ink-faint">
                {p}
              </div>
            ))}
          </div>
          <div className="w-12" />
        </div>
        {/* drop zone · register · drop zone */}
        <div className="flex items-center gap-2">
          {dropZone('left')}
          <div className="flex gap-1.5 rounded-xl border border-edge bg-surface-sunken/50 p-1.5">
            {tokens.map((t) => {
              const isDropping = dropping === t.id
              return (
                <motion.div
                  key={t.id}
                  layoutId={`bit-${t.id}`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: isDropping ? 1.08 : 1 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border font-mono text-sm ${
                    isDropping
                      ? 'border-red-500/70 bg-red-500/10 font-semibold text-red-600 dark:text-red-400'
                      : t.fresh
                        ? 'border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        : `border-edge bg-surface-raised ${t.v ? 'font-semibold text-ink' : 'text-ink-faint'}`
                  }`}
                >
                  {t.v}
                </motion.div>
              )
            })}
          </div>
          {dropZone('right')}
        </div>
      </div>
      {/* current value readout */}
      <div className="flex h-8 items-center gap-3 font-mono text-sm tabular-nums text-ink-muted">
        <span>a = 0b{binStr(value)} =</span>
        <span className={done ? 'font-bold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-ink'}>
          {value}
        </span>
        {done && (
          <span className="text-ink-faint">
            ({dir === 'left' ? '<<' : '>>'} {k}, {dropped.length} bit{dropped.length === 1 ? '' : 's'} dropped)
          </span>
        )}
      </div>
    </div>
  )
}

function BitwiseFrame({ data }: { data: BitData }) {
  return data.kind === 'binary' ? <BinaryFrame data={data} /> : <ShiftFrame data={data} />
}

export default function BitwiseVisualizer() {
  const [op, setOp] = useState<OpKey>('and')
  const [a, setA] = useState(170)
  const [b, setB] = useState(204)
  const [shift, setShift] = useState(3)

  const isShift = op === 'shl' || op === 'shr'
  const frames = useMemo(() => buildFrames(op, a, b, shift), [op, a, b, shift])
  const pseudocode = useMemo(() => pseudocodeFor(op), [op])
  const resetKey = `${op}|${a}|${b}|${shift}`

  return (
    <div>
      <VizInputRow>
        <VizSelect<OpKey>
          label="Operation"
          value={op}
          options={[
            { value: 'and', label: 'AND (a & b)' },
            { value: 'or', label: 'OR (a | b)' },
            { value: 'xor', label: 'XOR (a ^ b)' },
            { value: 'shl', label: 'Left shift (a << k)' },
            { value: 'shr', label: 'Right shift (a >> k)' },
          ]}
          onChange={setOp}
        />
        <VizTextInput
          label="Operand a"
          defaultValue={String(a)}
          hint="Decimal, 0–255"
          onParsed={(raw) => {
            const parsed = parseIntList(raw, { min: 0, max: 255, maxLen: 1 })
            if (parsed && parsed.length === 1) {
              setA(parsed[0])
              return true
            }
            return false
          }}
        />
        {isShift ? (
          <VizTextInput
            key="shift-amount"
            label="Shift amount k"
            defaultValue={String(shift)}
            hint="0–7"
            onParsed={(raw) => {
              const parsed = parseIntList(raw, { min: 0, max: 7, maxLen: 1 })
              if (parsed && parsed.length === 1) {
                setShift(parsed[0])
                return true
              }
              return false
            }}
          />
        ) : (
          <VizTextInput
            key="operand-b"
            label="Operand b"
            defaultValue={String(b)}
            hint="Decimal, 0–255"
            onParsed={(raw) => {
              const parsed = parseIntList(raw, { min: 0, max: 255, maxLen: 1 })
              if (parsed && parsed.length === 1) {
                setB(parsed[0])
                return true
              }
              return false
            }}
          />
        )}
      </VizInputRow>
      <StepPlayer
        frames={frames}
        pseudocode={pseudocode}
        resetKey={resetKey}
        renderFrame={(f) => <BitwiseFrame data={f.data} />}
      />
    </div>
  )
}
