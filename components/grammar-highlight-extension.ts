import { Mark, mergeAttributes } from '@tiptap/core'
import type { GrammarSuggestion } from '@/lib/db'

export interface GrammarHighlightOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    grammarHighlight: {
      setGrammarHighlight: (attributes: { id: string; type: string }) => ReturnType
      unsetGrammarHighlight: () => ReturnType
      removeGrammarHighlight: (id: string) => ReturnType
    }
  }
}

export const GrammarHighlight = Mark.create<GrammarHighlightOptions>({
  name: 'grammarHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-grammar-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {}
          }
          return {
            'data-grammar-id': attributes.id,
          }
        },
      },
      type: {
        default: 'grammar',
        parseHTML: element => element.getAttribute('data-grammar-type'),
        renderHTML: attributes => {
          if (!attributes.type) {
            return {}
          }
          return {
            'data-grammar-type': attributes.type,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-grammar-id]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { type } = HTMLAttributes
    const className = `grammar-highlight ${type}-error`
    
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: className,
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setGrammarHighlight:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes)
        },
      unsetGrammarHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
      removeGrammarHighlight:
        (id: string) =>
        ({ tr, state }) => {
          const { doc } = state
          const ranges: { from: number; to: number }[] = []

          doc.descendants((node, pos) => {
            if (node.isText) {
              node.marks.forEach(mark => {
                if (mark.type.name === 'grammarHighlight' && mark.attrs.id === id) {
                  ranges.push({
                    from: pos,
                    to: pos + node.nodeSize,
                  })
                }
              })
            }
          })

          ranges.forEach(range => {
            tr.removeMark(range.from, range.to, state.schema.marks.grammarHighlight)
          })

          return true
        },
    }
  },
})

// Helper function to apply grammar highlights to editor
export function applyGrammarHighlights(editor: any, suggestions: GrammarSuggestion[]) {
  if (!editor) return

  const { state } = editor
  const { doc } = state
  
  // Create a new transaction
  let tr = state.tr
  
  // First, clear all existing grammar highlights
  doc.descendants((node: any, pos: number) => {
    if (node.isText) {
      node.marks.forEach((mark: any) => {
        if (mark.type.name === 'grammarHighlight') {
          tr = tr.removeMark(pos, pos + node.nodeSize, mark.type)
        }
      })
    }
  })

  // Apply new highlights
  suggestions.forEach(suggestion => {
    const from = suggestion.offset
    const to = suggestion.offset + suggestion.length

    // Ensure the range is valid and within document bounds
    if (from >= 0 && to <= doc.content.size && from < to && from < doc.content.size) {
      try {
        const mark = state.schema.marks.grammarHighlight.create({
          id: suggestion.id,
          type: suggestion.type,
        })
        
        tr = tr.addMark(from, Math.min(to, doc.content.size), mark)
      } catch (error) {
        console.warn('Failed to apply grammar highlight:', error, { from, to, suggestion })
      }
    }
  })

  // Dispatch the transaction if there are changes
  if (tr.steps.length > 0) {
    editor.view.dispatch(tr)
  }
} 