/**
 * CodeMirror 6 Python editor. Uncontrolled: the parent passes an initial
 * doc and receives changes via onChange; `docKey` swaps the document
 * (e.g. reset-to-starter or navigating between problems).
 */
import { useEffect, useRef } from 'react'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { indentOnInput, indentUnit, bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import { useAppState } from '@/lib/useAppState'

interface CodeEditorProps {
  initialDoc: string
  /** Changing this key replaces the editor contents with initialDoc. */
  docKey: string
  onChange?: (doc: string) => void
  /** Cmd/Ctrl+Enter handler (Run). */
  onRunShortcut?: () => void
}

const themeCompartment = new Compartment()

const lightTheme = [
  EditorView.theme({
    '&': { backgroundColor: 'rgb(250 250 252)' },
    '.cm-gutters': { backgroundColor: 'rgb(244 244 248)', border: 'none' },
  }),
  syntaxHighlighting(defaultHighlightStyle),
]

export function CodeEditor({ initialDoc, docKey, onChange, onRunShortcut }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const { theme } = useAppState()
  const onChangeRef = useRef(onChange)
  const onRunRef = useRef(onRunShortcut)
  onChangeRef.current = onChange
  onRunRef.current = onRunShortcut

  useEffect(() => {
    if (!containerRef.current) return
    const state = EditorState.create({
      doc: initialDoc,
      extensions: [
        lineNumbers(),
        history(),
        highlightActiveLine(),
        indentOnInput(),
        bracketMatching(),
        indentUnit.of('    '),
        python(),
        keymap.of([
          {
            key: 'Mod-Enter',
            run: () => {
              onRunRef.current?.()
              return true
            },
          },
          indentWithTab,
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        themeCompartment.of(theme === 'dark' ? oneDark : lightTheme),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) onChangeRef.current?.(update.state.doc.toString())
        }),
      ],
    })
    const view = new EditorView({ state, parent: containerRef.current })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
    // Recreate the editor only when the document identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docKey])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeCompartment.reconfigure(theme === 'dark' ? oneDark : lightTheme),
    })
  }, [theme])

  return <div ref={containerRef} className="h-full overflow-hidden rounded-lg border border-edge" />
}
