import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MODULES, hasContent } from '@/content'

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return !!el.closest('.cm-editor')
}

/**
 * Global shortcuts: j/k step through modules (with content), space toggles
 * a visible step-player. Cmd/Ctrl+Enter (Run) lives in the code editor.
 */
export function useGlobalShortcuts(): void {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isTypingTarget(e.target)) return

      if (e.key === 'j' || e.key === 'k') {
        const ready = MODULES.filter((m) => hasContent(m.id))
        if (!ready.length) return
        const match = /^\/module\/([^/]+)/.exec(location.pathname)
        const idx = match ? ready.findIndex((m) => m.id === match[1]) : -1
        const next =
          e.key === 'j'
            ? ready[Math.min(idx + 1, ready.length - 1)]
            : ready[Math.max(idx - 1, 0)]
        if (next && (!match || next.id !== match[1])) {
          const tab = new URLSearchParams(location.search).get('tab')
          navigate(`/module/${next.id}${tab ? `?tab=${tab}` : ''}`)
        }
        e.preventDefault()
      } else if (e.key === ' ') {
        const playBtn = document.querySelector<HTMLButtonElement>('[data-play-toggle]')
        if (playBtn) {
          playBtn.click()
          e.preventDefault()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, location])
}
