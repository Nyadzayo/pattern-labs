export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-8 rounded-xl border border-dashed border-edge p-8 text-center text-sm text-ink-muted">
        This page arrives in {phase}.
      </div>
    </div>
  )
}
