"use client"

import type React from "react"
import type { GrammarSuggestion } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, SpellCheck, PenTool, CheckCircle, X } from "lucide-react"

type WritingIssuesProps = {
  suggestions: GrammarSuggestion[]
  onApplySuggestion: (suggestion: GrammarSuggestion, replacement: string) => void
  onIgnoreSuggestion: (suggestion: GrammarSuggestion) => void
  onHighlightSuggestion: (suggestion: GrammarSuggestion) => void
}

export function WritingIssues({ 
  suggestions, 
  onApplySuggestion, 
  onIgnoreSuggestion, 
  onHighlightSuggestion 
}: WritingIssuesProps) {
  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'grammar':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'spelling':
        return <SpellCheck className="w-4 h-4 text-orange-600" />
      case 'style':
        return <PenTool className="w-4 h-4 text-blue-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'grammar':
        return 'border-l-red-500'
      case 'spelling':
        return 'border-l-orange-500'
      case 'style':
        return 'border-l-blue-500'
      default:
        return 'border-l-gray-500'
    }
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Writing Issues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
            <p className="text-sm text-muted-foreground">No issues found!</p>
            <p className="text-xs text-muted-foreground">Your writing looks great.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Writing Issues
          </span>
          <Badge variant="secondary">{suggestions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-96 overflow-y-auto">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`border-l-4 ${getIssueColor(suggestion.type)} bg-muted/30 p-3 rounded-r-md cursor-pointer hover:bg-muted/50 transition-colors`}
            onClick={() => onHighlightSuggestion(suggestion)}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getIssueIcon(suggestion.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs capitalize">
                    {suggestion.type}
                  </Badge>
                </div>
                
                <p className="text-sm font-medium text-foreground mb-1">
                  {suggestion.shortMessage || suggestion.message}
                </p>
                
                {suggestion.context && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    "{suggestion.context.text.substring(0, 80)}..."
                  </p>
                )}
                
                <div className="flex items-center gap-2">
                  {suggestion.replacements && suggestion.replacements.length > 0 && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation()
                        onApplySuggestion(suggestion, suggestion.replacements[0])
                      }}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Apply
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onIgnoreSuggestion(suggestion)
                    }}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Ignore
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 