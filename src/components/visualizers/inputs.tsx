/**
 * Shared input controls for visualizers. Each keeps raw text locally and
 * reports the parsed value (or null when invalid) so the visualizer can
 * keep showing the last valid frames while the user types.
 */
import { useId, useState } from 'react'

interface TextInputProps {
  label: string
  /** Initial raw text. */
  defaultValue: string
  /** Return null when invalid — shows the error state. */
  onParsed: (raw: string) => boolean
  placeholder?: string
  hint?: string
}

export function VizTextInput({ label, defaultValue, onParsed, placeholder, hint }: TextInputProps) {
  const id = useId()
  const [raw, setRaw] = useState(defaultValue)
  const [invalid, setInvalid] = useState(false)
  return (
    <div className="min-w-[180px] flex-1">
      <label htmlFor={id} className="viz-label">
        {label}
      </label>
      <input
        id={id}
        value={raw}
        placeholder={placeholder}
        onChange={(e) => {
          setRaw(e.target.value)
          setInvalid(!onParsed(e.target.value))
        }}
        className={`viz-input ${invalid ? 'border-red-500/60' : ''}`}
        spellCheck={false}
        autoComplete="off"
      />
      {hint && <div className="mt-1 text-[11px] text-ink-faint">{hint}</div>}
    </div>
  )
}

interface SelectProps<T extends string> {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}

export function VizSelect<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="viz-label">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="viz-input cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function VizInputRow({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end gap-3">{children}</div>
}
