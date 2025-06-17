"use client"

import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { useEffect, useState, useCallback } from "react"
import { debounce } from "lodash"
import type { GrammarSuggestion } from "@/lib/db"
import { SuggestionTooltip } from "./suggestion-tooltip"
import { Card } from "@/components/ui/card"

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
    extensions: [StarterKit],
    content: initialContent,
    onUpdate: ({ editor }) => {
      const content = editor.getHTML()
      onContentChange(content)
      debouncedCheckGrammar(editor.getText())
    },
  })

  const checkGrammar = async (text: string) => {
    if (!text.trim()) {
      setSuggestions([])
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
        setSuggestions(data.suggestions || [])
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
      editor.commands.setContent(initialContent)
    }
  }, [initialContent, editor])

  const handleTextSelection = () => {
    if (!editor) return

    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)

    if (selectedText) {
      const suggestion = suggestions.find((s) => from >= s.offset && to <= s.offset + s.length)

      if (suggestion) {
        const coords = editor.view.coordsAtPos(from)
        setTooltipPosition({ x: coords.left, y: coords.top - 10 })
        setSelectedSuggestion(suggestion)
      }
    } else {
      setSelectedSuggestion(null)
      setTooltipPosition(null)
    }
  }

  const applySuggestion = (suggestion: GrammarSuggestion, replacement: string) => {
    if (!editor) return

    const { from, to } = editor.state.selection
    editor
      .chain()
      .focus()
      .deleteRange({ from: suggestion.offset, to: suggestion.offset + suggestion.length })
      .insertContentAt(suggestion.offset, replacement)
      .run()

    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
    setSelectedSuggestion(null)
    setTooltipPosition(null)
  }

  const ignoreSuggestion = (suggestion: GrammarSuggestion) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestion.id))
    setSelectedSuggestion(null)
    setTooltipPosition(null)
  }

  useEffect(() => {
    if (editor) {
      const handleSelectionUpdate = () => handleTextSelection()
      editor.on("selectionUpdate", handleSelectionUpdate)
      return () => editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, suggestions])

  if (!editor) {
    return <div>Loading editor...</div>
  }

  return (
    <div className="relative h-full">
      <Card className="h-full p-6">
        <div
          className="prose prose-sm max-w-none h-full overflow-auto focus-within:outline-none"
          onClick={handleTextSelection}
        >
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

      {/* Grammar highlights overlay */}
      <style jsx global>{`
        .ProseMirror {
          outline: none !important;
        }
        .grammar-error {
          background-color: rgba(239, 68, 68, 0.2);
          border-bottom: 2px wavy #ef4444;
          cursor: pointer;
        }
        .spelling-error {
          background-color: rgba(245, 158, 11, 0.2);
          border-bottom: 2px wavy #f59e0b;
          cursor: pointer;
        }
        .style-suggestion {
          background-color: rgba(59, 130, 246, 0.2);
          border-bottom: 2px wavy #3b82f6;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
