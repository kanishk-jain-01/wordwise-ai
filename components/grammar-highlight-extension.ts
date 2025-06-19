import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { GrammarSuggestion } from '@/lib/db'

// Unique plugin key for grammar highlights
const grammarHighlightKey = new PluginKey('grammarHighlight')

export const GrammarHighlight = Extension.create({
  name: 'grammarHighlight',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: grammarHighlightKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, oldDecos) {
            // Map decorations through document changes
            let decos = oldDecos.map(tr.mapping, tr.doc)

            // If transaction carries new suggestions meta, rebuild decorations
            const meta = tr.getMeta(grammarHighlightKey)
            if (meta && meta.suggestions) {
              decos = createDecorations(tr.doc, meta.suggestions)
            }

            return decos
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

// Build decoration set from suggestions
function createDecorations(doc: any, suggestions: (GrammarSuggestion & { from: number; to: number })[]) {
  const decorations: Decoration[] = []

  suggestions.forEach(({ from, to, type, id }) => {
    if (from >= 0 && to <= doc.content.size && from < to) {
      const className = `grammar-highlight ${type}-error`
      const deco = Decoration.inline(from, to, {
        class: className,
        'data-grammar-id': id,
        'data-grammar-type': type,
      })
      decorations.push(deco)
    }
  })

  return DecorationSet.create(doc, decorations)
}

// Helper: set highlights by passing suggestions via transaction meta
export function applyGrammarHighlights(editor: any, suggestions: (GrammarSuggestion & { from: number; to: number })[]) {
  if (!editor) return
  const tr = editor.state.tr.setMeta(grammarHighlightKey, { suggestions })
  editor.view.dispatch(tr)
}

// Helper: clear all highlights
export function clearGrammarHighlights(editor: any) {
  if (!editor) return
  const tr = editor.state.tr.setMeta(grammarHighlightKey, { suggestions: [] })
  editor.view.dispatch(tr)
} 