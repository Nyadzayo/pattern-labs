import { Link, useParams } from 'react-router-dom'
import { VISUALIZER_IDS } from '@/content'
import type { VisualizerId } from '@/content'
import { VisualizerHost } from '@/components/visualizers/VisualizerHost'

/** QA gallery: render any visualizer directly, independent of module content. */
export function GalleryPage() {
  const { vizId } = useParams()
  const valid = (VISUALIZER_IDS as readonly string[]).includes(vizId ?? '')

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Visualizer gallery</h1>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {VISUALIZER_IDS.map((id) => (
          <Link
            key={id}
            to={`/gallery/${id}`}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              id === vizId
                ? 'border-accent bg-accent-soft/60 font-medium text-ink'
                : 'border-edge text-ink-muted hover:text-ink'
            }`}
          >
            {id}
          </Link>
        ))}
      </div>
      <div className="mt-6">
        {valid ? (
          <VisualizerHost id={vizId as VisualizerId} />
        ) : (
          <div className="rounded-xl border border-dashed border-edge p-8 text-center text-sm text-ink-muted">
            Pick a visualizer above.
          </div>
        )}
      </div>
    </div>
  )
}
