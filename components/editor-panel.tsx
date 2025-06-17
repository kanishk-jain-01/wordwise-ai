"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect, useState, useCallback } from "react"
import { debounce } from "lodash"
import type { GrammarSuggestion } from "@/lib/db"
import { Card } from "@/components/ui/card"
import { GrammarHighlight, applyGrammarHighlights } from "./grammar-highlight-extension"

export type EditorActions = {
  applySuggestion: (suggestion: GrammarSuggestion, replacement: string) => void
  ignoreSuggestion: (suggestion: GrammarSuggestion) => void
  highlightSuggestion: (suggestion: GrammarSuggestion) => void
}

type EditorPanelProps = {
  documentId: string
  initialContent: string
  onContentChange: (content: string) => void
  onToneChange: (tone: string) => void
  onSuggestionsChange?: (suggestions: GrammarSuggestion[]) => void
  onEditorReady?: (actions: EditorActions) => void
}

export function EditorPanel({ documentId, initialContent, onContentChange, onToneChange, onSuggestionsChange, onEditorReady }: EditorPanelProps) {
  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([])

  const editor = useEditor({
    extensions: [StarterKit, GrammarHighlight],
    content: initialContent || '<p></p>',

    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      onContentChange(content)
      debouncedCheckGrammar(editor.getText())
      debouncedAnalyzeTone(editor.getText())
    },
  })

  const checkGrammar = async (text: string) => {
    if (!text.trim()) {
      setSuggestions([])
      if (editor) {
        applyGrammarHighlights(editor, [])
      }
      onSuggestionsChange?.([])
      return
    }

    try {
      const response = await fetch("/api/grammar/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, documentId }),
      })

      if (response.ok) {
        const data = await response.json()
        const newSuggestions = data.suggestions || []
        
        setSuggestions(newSuggestions)
        onSuggestionsChange?.(newSuggestions)
        
        // Apply highlights to editor
        if (editor) {
          applyGrammarHighlights(editor, newSuggestions)
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

  const debouncedCheckGrammar = useCallback(debounce(checkGrammar, 1000), [documentId])
  const debouncedAnalyzeTone = useCallback(debounce(analyzeTone, 2000), [documentId])

  useEffect(() => {
    if (editor && initialContent !== editor.getHTML()) {
      const properContent = initialContent || '<p></p>'
      editor.commands.setContent(properContent)
    }
  }, [initialContent, editor])

  // Apply highlights when suggestions change
  useEffect(() => {
    if (editor && suggestions.length > 0) {
      applyGrammarHighlights(editor, suggestions)
    }
  }, [editor, suggestions])

  // Function to apply suggestion (will be called from parent)
  const applySuggestion = useCallback((suggestion: GrammarSuggestion, replacement: string) => {
    if (!editor) return

    // Remove the grammar highlight first
    editor.commands.removeGrammarHighlight(suggestion.id)
    
    // Apply the replacement
    const from = suggestion.offset
    const to = suggestion.offset + suggestion.length
    
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContentAt(from, replacement)
      .run()

    // Remove suggestion from state
    const updatedSuggestions = suggestions.filter((s) => s.id !== suggestion.id)
    setSuggestions(updatedSuggestions)
    onSuggestionsChange?.(updatedSuggestions)
  }, [editor, suggestions, onSuggestionsChange])

  // Function to ignore suggestion (will be called from parent)
  const ignoreSuggestion = useCallback((suggestion: GrammarSuggestion) => {
    // Remove the grammar highlight
    if (editor) {
      editor.commands.removeGrammarHighlight(suggestion.id)
    }
    
    const updatedSuggestions = suggestions.filter((s) => s.id !== suggestion.id)
    setSuggestions(updatedSuggestions)
    onSuggestionsChange?.(updatedSuggestions)
  }, [editor, suggestions, onSuggestionsChange])

  // Function to highlight suggestion in editor (will be called from parent)
  const highlightSuggestion = useCallback((suggestion: GrammarSuggestion) => {
    if (!editor) return
    
    // Focus editor and scroll to the suggestion
    editor.commands.focus()
    
    // Set cursor position to the suggestion
    const from = suggestion.offset
    const to = suggestion.offset + suggestion.length
    
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
        /* Fallback styles with data attributes */
        span[data-grammar-id] {
          background-color: rgba(239, 68, 68, 0.25) !important;
          border-bottom: 2px wavy #ef4444 !important;
          cursor: pointer !important;
        }
      `}</style>
    </div>
  )
}
