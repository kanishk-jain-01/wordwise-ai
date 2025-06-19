"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect, useState, useCallback, useRef } from "react"
import { debounce } from "lodash"
import type { GrammarSuggestion, IgnoredSuggestion } from "@/lib/db"
import { Card } from "@/components/ui/card"
import { GrammarHighlight, applyGrammarHighlights, clearGrammarHighlights } from "./grammar-highlight-extension"
import { filterIgnoredSuggestions, createIgnoredSuggestionData } from "@/lib/ignore-matcher"

export type Suggestion = GrammarSuggestion & { from: number; to: number }

export type EditorActions = {
  applySuggestion: (suggestion: Suggestion, replacement: string) => void
  ignoreSuggestion: (suggestion: Suggestion) => void
  highlightSuggestion: (suggestion: Suggestion) => void
}

type EditorPanelProps = {
  documentId: string
  initialContent: string
  onContentChange: (content: string) => void
  onToneChange: (tone: string) => void
  onSuggestionsChange?: (suggestions: Suggestion[]) => void
  onEditorReady?: (actions: EditorActions) => void
}

export function EditorPanel({ documentId, initialContent, onContentChange, onToneChange, onSuggestionsChange, onEditorReady }: EditorPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [ignoredSuggestions, setIgnoredSuggestions] = useState<IgnoredSuggestion[]>([])
  
  // Refs to hold the latest function references
  const checkGrammarRef = useRef<((text: string) => Promise<void>) | undefined>(undefined)
  const analyzeToneRef = useRef<((text: string) => Promise<void>) | undefined>(undefined)

  const editor = useEditor({
    extensions: [StarterKit, GrammarHighlight],
    content: initialContent || '<p></p>',

    // Initial analysis when the editor is first created
    onCreate: ({ editor }) => {
      const text = editor.getText()
      checkGrammar(text) // immediate, non-debounced
      analyzeTone(text)
    },

    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      onContentChange(content)
      debouncedCheckGrammar(editor.getText())
      debouncedAnalyzeTone(editor.getText())
    },
  })

  // Load ignored suggestions for this document
  const loadIgnoredSuggestions = async () => {
    try {
      const response = await fetch(`/api/suggestions/ignore?documentId=${documentId}`)
      if (response.ok) {
        const data = await response.json()
        setIgnoredSuggestions(data.ignoredSuggestions || [])
      }
    } catch (error) {
      console.error("Failed to load ignored suggestions:", error)
    }
  }

  const checkGrammar = async (text: string) => {
    if (!text.trim() || !editor) {
      setSuggestions([])
      if (editor) {
        clearGrammarHighlights(editor)
      }
      onSuggestionsChange?.([])
      return
    }

    try {
      // Build plain text representation using ProseMirror's helper and create a position map
      const { doc } = editor.state

      // `textBetween` with block separator of two spaces matches ProseMirror's default for `getText()`
      const plainText = doc.textBetween(0, doc.content.size, '  ')

      // Build mapping from plain-text index -> ProseMirror position
      const posMap: number[] = []
      let currentIndex = 0

      doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          for (let i = 0; i < node.text.length; i++) {
            posMap[currentIndex++] = pos + i
          }
        } else if (node.isBlock && currentIndex > 0) {
          // Two-space block separator – map both spaces to the boundary position
          posMap[currentIndex++] = pos
          posMap[currentIndex++] = pos
        }
      })

      const response = await fetch("/api/grammar/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: plainText, documentId }),
      })

      if (response.ok) {
        const data = await response.json()
        const rawSuggestions: GrammarSuggestion[] = data.suggestions || []
        
        // Remap suggestions to include absolute 'from' and 'to' positions for ProseMirror
        const remappedSuggestions = rawSuggestions.map(s => {
          const from = posMap[s.offset]
          const to = from ? from + s.length : undefined
          
          if (from === undefined || to === undefined) {
            console.warn("Could not map suggestion:", s)
            return null
          }
          
          return { ...s, from, to }
        }).filter(Boolean) as Suggestion[]

        // Filter out ignored suggestions
        const filteredSuggestions = filterIgnoredSuggestions(remappedSuggestions, plainText, ignoredSuggestions)

        setSuggestions(filteredSuggestions)
        onSuggestionsChange?.(filteredSuggestions)
        
        // Apply highlights to editor
        if (editor) {
          applyGrammarHighlights(editor, filteredSuggestions)
        }
      }
    } catch (error) {
      console.error("Grammar check failed:", error)
    }
  }

  const analyzeTone = async (text: string) => {
    if (!text.trim()) return

    try {
      const response = await fetch("/api/tone/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, documentId }),
      })

      if (response.ok) {
        const data = await response.json()
        onToneChange(data.tone)
      }
    } catch (error) {
      console.error("Tone analysis failed:", error)
    }
  }

  // Update refs with latest functions
  checkGrammarRef.current = checkGrammar
  analyzeToneRef.current = analyzeTone

  // Create stable debounced functions that use the refs
  const debouncedCheckGrammar = useCallback(
    debounce((text: string) => checkGrammarRef.current?.(text), 1000),
    [documentId]
  )
  const debouncedAnalyzeTone = useCallback(
    debounce((text: string) => analyzeToneRef.current?.(text), 2000),
    [documentId]
  )

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      const properContent = initialContent || '<p></p>'
      editor.commands.setContent(properContent)
    }
  }, [initialContent, editor])

  // Load ignored suggestions when document changes
  useEffect(() => {
    if (documentId) {
      loadIgnoredSuggestions()
    }
  }, [documentId])

  // Apply highlights when suggestions change
  useEffect(() => {
    if (editor && suggestions.length > 0) {
      applyGrammarHighlights(editor, suggestions)
    }
  }, [editor, suggestions])

  // Function to apply suggestion (will be called from parent)
  const applySuggestion = useCallback((suggestion: Suggestion, replacement: string) => {
    if (!editor) return

    // Apply the replacement using the accurate 'from' and 'to' positions
    const { from, to } = suggestion
    
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContentAt(from, replacement)
      .run()

    // Highlights will be refreshed after we update suggestions below
    const updatedSuggestions = suggestions.filter((s) => s.id !== suggestion.id)
    setSuggestions(updatedSuggestions)
    onSuggestionsChange?.(updatedSuggestions)

    if (editor) {
      applyGrammarHighlights(editor, updatedSuggestions)

      // Cancel any pending debounced checks to prevent stale overwrite
      debouncedCheckGrammar.cancel()
      debouncedAnalyzeTone.cancel()

      // Re-run analysis to get fresh suggestions after content change
      checkGrammar(editor.getText())
      analyzeTone(editor.getText())
    }
  }, [editor, suggestions, onSuggestionsChange, debouncedCheckGrammar, debouncedAnalyzeTone])

  // Function to ignore suggestion (will be called from parent)
  const ignoreSuggestion = useCallback(async (suggestion: Suggestion) => {
    if (!editor) return

    try {
      // Get the current text for context extraction
      const plainText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '  ')
      
      // Create ignored suggestion data
      const ignoredData = createIgnoredSuggestionData(suggestion, plainText, documentId)
      
      // Save to backend
      const response = await fetch('/api/suggestions/ignore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: ignoredData.document_id,
          originalText: ignoredData.original_text,
          suggestionType: ignoredData.suggestion_type,
          ruleId: ignoredData.rule_id,
          positionStart: ignoredData.position_start,
          positionEnd: ignoredData.position_end,
          contextBefore: ignoredData.context_before,
          contextAfter: ignoredData.context_after,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.ignored) {
          // Add to local ignored list
          setIgnoredSuggestions(prev => [...prev, data.ignored])
        }
        
        // Remove from current suggestions immediately
        const updatedSuggestions = suggestions.filter((s) => s.id !== suggestion.id)
        setSuggestions(updatedSuggestions)
        onSuggestionsChange?.(updatedSuggestions)

        if (editor) {
          applyGrammarHighlights(editor, updatedSuggestions)
        }
      } else {
        console.error('Failed to ignore suggestion:', await response.text())
      }
    } catch (error) {
      console.error('Error ignoring suggestion:', error)
    }
  }, [editor, suggestions, onSuggestionsChange, documentId])

  // Function to highlight suggestion in editor (will be called from parent)
  const highlightSuggestion = useCallback((suggestion: Suggestion) => {
    if (!editor) return
    
    // Focus editor and scroll to the suggestion
    editor.commands.focus()
    
    // Set cursor position to the suggestion using accurate 'from' and 'to'
    const { from, to } = suggestion
    
    // Select the text range
    editor.commands.setTextSelection({ from, to })
    
    // Scroll into view
    const pos = editor.view.coordsAtPos(from)
    if (pos) {
      editor.view.dom.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [editor])

  // Expose editor actions to parent component
  useEffect(() => {
    if (editor && onEditorReady) {
      const actions: EditorActions = {
        applySuggestion,
        ignoreSuggestion,
        highlightSuggestion
      }
      onEditorReady(actions)
    }
  }, [editor, applySuggestion, ignoreSuggestion, highlightSuggestion, onEditorReady])

  if (!editor) {
    return <div>Loading editor...</div>
  }

  return (
    <div className="relative h-full">
      <Card className="h-full p-6">
        <div className="prose prose-sm max-w-none h-full overflow-auto focus-within:outline-none">
          <EditorContent editor={editor} className="h-full min-h-[500px] focus:outline-none" />
        </div>
      </Card>

      {/* Grammar highlights styles */}
      <style jsx global>{`
        .ProseMirror {
          outline: none !important;
        }
        .grammar-highlight {
          cursor: pointer !important;
          border-radius: 2px !important;
          transition: all 0.2s ease !important;
        }
        .grammar-highlight:hover {
          opacity: 0.8 !important;
        }
        .grammar-error {
          background-color: rgba(239, 68, 68, 0.25) !important;
          border-bottom: 2px wavy #ef4444 !important;
        }
        .spelling-error {
          background-color: rgba(245, 158, 11, 0.25) !important;
          border-bottom: 2px wavy #f59e0b !important;
        }
        .style-error {
          background-color: rgba(59, 130, 246, 0.25) !important;
          border-bottom: 2px wavy #3b82f6 !important;
        }
        /* Attribute-based fallback (in case CSS classes are missing) */
        span[data-grammar-type="grammar"] {
          background-color: rgba(239, 68, 68, 0.25) !important;
          border-bottom: 2px wavy #ef4444 !important;
        }
        span[data-grammar-type="spelling"] {
          background-color: rgba(245, 158, 11, 0.25) !important;
          border-bottom: 2px wavy #f59e0b !important;
        }
        span[data-grammar-type="style"] {
          background-color: rgba(59, 130, 246, 0.25) !important;
          border-bottom: 2px wavy #3b82f6 !important;
        }
        /* (Removed fallback generic red highlight rule) */
      `}</style>
    </div>
  )
}
