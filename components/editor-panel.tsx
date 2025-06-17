"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect, useState, useCallback } from "react"
import { debounce } from "lodash"
import type { GrammarSuggestion } from "@/lib/db"
import { SuggestionTooltip } from "./suggestion-tooltip"
import { Card } from "@/components/ui/card"
import { GrammarHighlight, applyGrammarHighlights } from "./grammar-highlight-extension"

type EditorPanelProps = {
  documentId: string
  initialContent: string
  onContentChange: (content: string) => void
  onToneChange: (tone: string) => void
}

export function EditorPanel({ documentId, initialContent, onContentChange, onToneChange }: EditorPanelProps) {
  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<GrammarSuggestion | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  const editor = useEditor({
    extensions: [StarterKit, GrammarHighlight],
    content: initialContent || '<p></p>', // Ensure we start with a paragraph, not empty content

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
      // Ensure content is in proper format for grammar highlighting
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

  const handleTextClick = (event: MouseEvent) => {
    if (!editor) return

    const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })
    if (!pos) return

    // Check if click is on a grammar highlight
    const { doc } = editor.state
    let clickedSuggestion: GrammarSuggestion | null = null

    doc.nodesBetween(pos.pos, pos.pos + 1, (node, nodePos) => {
      if (node.isText) {
        node.marks.forEach(mark => {
          if (mark.type.name === 'grammarHighlight') {
            const suggestionId = mark.attrs.id
            const suggestion = suggestions.find(s => s.id === suggestionId)
            if (suggestion) {
              clickedSuggestion = suggestion
            }
          }
        })
      }
    })

    if (clickedSuggestion) {
      const coords = editor.view.coordsAtPos(pos.pos)
      setTooltipPosition({ x: coords.left, y: coords.top - 10 })
      setSelectedSuggestion(clickedSuggestion)
    } else {
      setSelectedSuggestion(null)
      setTooltipPosition(null)
    }
  }

  const applySuggestion = (suggestion: GrammarSuggestion, replacement: string) => {
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
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
    setSelectedSuggestion(null)
    setTooltipPosition(null)
  }

  const ignoreSuggestion = (suggestion: GrammarSuggestion) => {
    // Remove the grammar highlight
    if (editor) {
      editor.commands.removeGrammarHighlight(suggestion.id)
    }
    
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
    setSelectedSuggestion(null)
    setTooltipPosition(null)
  }

  useEffect(() => {
    if (editor) {
      const editorElement = editor.view.dom
      editorElement.addEventListener('click', handleTextClick)
      return () => editorElement.removeEventListener('click', handleTextClick)
    }
  }, [editor, suggestions])

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

      {selectedSuggestion && tooltipPosition && (
        <SuggestionTooltip
          suggestion={selectedSuggestion}
          position={tooltipPosition}
          onApply={(replacement) => applySuggestion(selectedSuggestion, replacement)}
          onIgnore={() => ignoreSuggestion(selectedSuggestion)}
          onClose={() => {
            setSelectedSuggestion(null)
            setTooltipPosition(null)
          }}
        />
      )}

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
