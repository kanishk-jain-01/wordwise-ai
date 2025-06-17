"use client"

import { useState, useEffect } from "react"
import type { Document } from "@/lib/db"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Plus, FileText, Search, MoreHorizontal, LogOut } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"

type DocumentSidebarProps = {
  documents: Document[]
  selectedDocumentId: string | null
  onDocumentSelect: (document: Document) => void
  onDocumentCreate: () => void
  onDocumentDelete: (documentId: string) => void
  onRefresh: () => void
}

export function DocumentSidebar({
  documents,
  selectedDocumentId,
  onDocumentSelect,
  onDocumentCreate,
  onDocumentDelete,
  onRefresh,
}: DocumentSidebarProps) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>(documents)

  useEffect(() => {
    const filtered = documents.filter(
      (doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    setFilteredDocuments(filtered)
  }, [documents, searchQuery])

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        onDocumentDelete(documentId)
        onRefresh()
      }
    } catch (error) {
      console.error("Failed to delete document:", error)
    }
  }

  const handleLogout = () => {
    signOut({ callbackUrl: "/auth/login" })
  }

  return (
    <div className="w-80 border-r bg-muted/10 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Documents</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-3">
          <Button onClick={onDocumentCreate} className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Documents List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No documents found</p>
            </div>
          ) : (
            filteredDocuments.map((document) => (
              <Card
                key={document.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedDocumentId === document.id ? "bg-muted border-primary" : ""
                }`}
                onClick={() => onDocumentSelect(document)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate mb-1">{document.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {document.content.replace(/<[^>]*>/g, "").substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-2">
                        {document.tone && (
                          <Badge variant="secondary" className="text-xs">
                            {document.tone}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">{document.word_count} words</span>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteDocument(document.id)
                          }}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <Separator className="my-2" />
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(document.updated_at), { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* User Info */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-primary-foreground">
              {session?.user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.user?.email}</p>
            <p className="text-xs text-muted-foreground">Free Plan</p>
          </div>
        </div>
      </div>
    </div>
  )
}
