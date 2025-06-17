"use client"

import { useState, useEffect, useCallback } from "react"
import type { Document } from "@/lib/db"
import { DocumentSidebar } from "@/components/document-sidebar"
import { EditorPanel, type EditorActions } from "@/components/editor-panel"
import { ToneIndicator } from "@/components/tone-indicator"
import { WritingIssues } from "@/components/writing-issues"
import { ProtectedRoute } from "@/components/protected-route"
import type { GrammarSuggestion } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Save, FileText, Clock, BarChart3 } from "lucide-react"
import { debounce } from "lodash"

export default function DashboardPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const [documentTitle, setDocumentTitle] = useState("")
  const [documentContent, setDocumentContent] = useState("")
  const [documentTone, setDocumentTone] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<GrammarSuggestion[]>([])
  const [editorActions, setEditorActions] = useState<EditorActions | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Load documents
  const loadDocuments = async () => {
    try {
      const response = await fetch("/api/documents")
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])

        // Select first document if none selected
        if (data.documents?.length > 0 && !selectedDocument) {
          const firstDoc = data.documents[0]
          setSelectedDocument(firstDoc)
          setDocumentTitle(firstDoc.title)
          setDocumentContent(firstDoc.content)
          setDocumentTone(firstDoc.tone)
        }
      }
    } catch (error) {
      console.error("Failed to load documents:", error)
    } finally {
      setLoading(false)
    }
  }

  // Save document
  const saveDocument = async () => {
    if (!selectedDocument) return

    setSaving(true)
    try {
      const response = await fetch(`/api/documents/${selectedDocument.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: documentTitle,
          content: documentContent,
          tone: documentTone,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments((prev) => prev.map((doc) => (doc.id === selectedDocument.id ? data.document : doc)))
        setSelectedDocument(data.document)
      }
    } catch (error) {
      console.error("Failed to save document:", error)
    } finally {
      setSaving(false)
    }
  }

  // Debounced save
  const debouncedSave = useCallback(debounce(saveDocument, 2000), [
    selectedDocument,
    documentTitle,
    documentContent,
    documentTone,
  ])

  // Create new document
  const createDocument = async () => {
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Untitled Document",
          content: "",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments((prev) => [data.document, ...prev])
        setSelectedDocument(data.document)
        setDocumentTitle(data.document.title)
        setDocumentContent(data.document.content)
        setDocumentTone(data.document.tone)
      }
    } catch (error) {
      console.error("Failed to create document:", error)
    }
  }

  // Handle document selection
  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document)
    setDocumentTitle(document.title)
    setDocumentContent(document.content)
    setDocumentTone(document.tone)
    setSuggestions([]) // Clear suggestions when switching documents
  }

  // Handle document deletion
  const handleDocumentDelete = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId))
    if (selectedDocument?.id === documentId) {
      const remainingDocs = documents.filter((doc) => doc.id !== documentId)
      if (remainingDocs.length > 0) {
        handleDocumentSelect(remainingDocs[0])
      } else {
        setSelectedDocument(null)
        setDocumentTitle("")
        setDocumentContent("")
        setDocumentTone(null)
        setSuggestions([])
      }
    }
  }

  // Auto-save when content changes
  useEffect(() => {
    if (
      selectedDocument &&
      (documentTitle !== selectedDocument.title || documentContent !== selectedDocument.content)
    ) {
      debouncedSave()
    }
  }, [documentTitle, documentContent, documentTone, selectedDocument, debouncedSave])

  // Handle writing issues actions
  const handleApplySuggestion = (suggestion: GrammarSuggestion, replacement: string) => {
    if (editorActions) {
      editorActions.applySuggestion(suggestion, replacement)
    }
  }

  const handleIgnoreSuggestion = (suggestion: GrammarSuggestion) => {
    if (editorActions) {
      editorActions.ignoreSuggestion(suggestion)
    }
  }

  const handleHighlightSuggestion = (suggestion: GrammarSuggestion) => {
    if (editorActions) {
      editorActions.highlightSuggestion(suggestion)
    }
  }

  useEffect(() => {
    loadDocuments()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        <DocumentSidebar
          documents={documents}
          selectedDocumentId={selectedDocument?.id || null}
          onDocumentSelect={handleDocumentSelect}
          onDocumentCreate={createDocument}
          onDocumentDelete={handleDocumentDelete}
          onRefresh={loadDocuments}
        />

        <div className="flex-1 flex flex-col">
          {selectedDocument ? (
            <>
              {/* Header */}
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 max-w-md">
                    <Input
                      value={documentTitle}
                      onChange={(e) => setDocumentTitle(e.target.value)}
                      className="text-lg font-semibold border-none shadow-none p-0 h-auto focus-visible:ring-0"
                      placeholder="Document title..."
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {saving ? "Saving..." : "Saved"}
                    </div>
                    <Button onClick={saveDocument} disabled={saving} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex">
                <div className="flex-1 p-4">
                  <EditorPanel
                    documentId={selectedDocument.id}
                    initialContent={documentContent}
                    onContentChange={setDocumentContent}
                    onToneChange={setDocumentTone}
                    onSuggestionsChange={setSuggestions}
                    onEditorReady={setEditorActions}
                  />
                </div>

                {/* Right Sidebar */}
                <div className="w-80 border-l p-4 space-y-4">
                  <ToneIndicator tone={documentTone} />

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Document Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Words</span>
                        <Badge variant="secondary">
                          {
                            documentContent
                              .replace(/<[^>]*>/g, "")
                              .split(" ")
                              .filter(Boolean).length
                          }
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Characters</span>
                        <Badge variant="secondary">{documentContent.replace(/<[^>]*>/g, "").length}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Paragraphs</span>
                        <Badge variant="secondary">{documentContent.split("</p>").length - 1 || 1}</Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <WritingIssues
                    suggestions={suggestions}
                    onApplySuggestion={handleApplySuggestion}
                    onIgnoreSuggestion={handleIgnoreSuggestion}
                    onHighlightSuggestion={handleHighlightSuggestion}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">No Document Selected</h2>
                <p className="text-muted-foreground mb-4">
                  Create a new document or select an existing one to start writing
                </p>
                <Button onClick={createDocument}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create New Document
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
