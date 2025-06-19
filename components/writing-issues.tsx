"use client"

import type React from "react"
import type { Suggestion } from './editor-panel'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, SpellCheck, PenTool, CheckCircle, X, Shield, AlertTriangle, Zap } from "lucide-react"

type WritingIssuesProps = {
  suggestions: Suggestion[]
  onApplySuggestion: (suggestion: Suggestion, replacement: string) => void
  onIgnoreSuggestion: (suggestion: Suggestion) => void
  onHighlightSuggestion: (suggestion: Suggestion) => void
}

export function WritingIssues({ 
  suggestions, 
  onApplySuggestion, 
  onIgnoreSuggestion, 
  onHighlightSuggestion 
}: WritingIssuesProps) {
  const getRiskIcon = (risk?: string) => {
    switch (risk) {
      case 'SAFE':
        return <Shield className="w-3 h-3 text-green-500" />
      case 'MODERATE':
        return <AlertTriangle className="w-3 h-3 text-yellow-500" />
      case 'RISKY':
        return <Zap className="w-3 h-3 text-red-500" />
      default:
        return null
    }
  }

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'SAFE':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'MODERATE':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'RISKY':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'grammar':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'spelling':
        return <SpellCheck className="w-4 h-4 text-amber-500" />
      case 'style':
        return <PenTool className="w-4 h-4 text-blue-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'grammar':
        return 'border-l-red-500'
      case 'spelling':
        return 'border-l-amber-500'
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
                  {suggestion.confidence && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(suggestion.confidence * 100)}% confident
                    </Badge>
                  )}
                  {/* Enhanced: Show validation risk level */}
                  {(suggestion as any).validationRisk && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs flex items-center gap-1 ${getRiskColor((suggestion as any).validationRisk)}`}
                    >
                      {getRiskIcon((suggestion as any).validationRisk)}
                      {(suggestion as any).validationRisk}
                    </Badge>
                  )}
                  {/* Enhanced: Show if suggestion was validated */}
                  {(suggestion as any).validated && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                      ✓ Validated
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm font-medium text-foreground mb-1">
                  {suggestion.shortMessage || suggestion.message}
                </p>
                
                {/* Enhanced: Show validation reasons if available */}
                {(suggestion as any).validationReasons && (suggestion as any).validationReasons.length > 0 && (
                  <div className="mb-2">
                    <details className="text-xs">
                      <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                        Why this suggestion? ({(suggestion as any).validationReasons.length} reasons)
                      </summary>
                      <ul className="mt-1 ml-4 space-y-1 text-muted-foreground">
                        {(suggestion as any).validationReasons.map((reason: string, index: number) => (
                          <li key={index} className="list-disc">
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                )}
                
                {suggestion.context && (
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    "{suggestion.context.text.substring(0, 80)}..."
                  </p>
                )}
                
                {/* Enhanced suggestion display for multiple options */}
                {suggestion.replacements && suggestion.replacements.length > 0 && (
                  <div className="space-y-2">
                    {suggestion.replacements.length === 1 ? (
                      // Single suggestion - show as before
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={(suggestion as any).validationRisk === 'RISKY' ? "outline" : "default"}
                          className={`h-6 px-2 text-xs ${
                            (suggestion as any).validationRisk === 'RISKY' 
                              ? 'border-red-200 text-red-700 hover:bg-red-50' 
                              : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            onApplySuggestion(suggestion, suggestion.replacements[0])
                          }}
                        >
                          {(suggestion as any).validationRisk === 'RISKY' 
                            ? <AlertTriangle className="w-3 h-3 mr-1" />
                            : <CheckCircle className="w-3 h-3 mr-1" />
                          }
                          Apply "{suggestion.replacements[0]}"
                        </Button>
                        {(suggestion as any).validationRisk === 'RISKY' && (
                          <span className="text-xs text-red-600">⚠ High risk</span>
                        )}
                      </div>
                    ) : (
                      // Multiple suggestions - show as options
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">Suggestions:</p>
                        <div className="flex flex-wrap gap-1">
                          {suggestion.replacements.slice(0, 3).map((replacement, index) => (
                            <Button
                              key={replacement}
                              size="sm"
                              variant={index === 0 ? "default" : "outline"}
                              className="h-6 px-2 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                onApplySuggestion(suggestion, replacement)
                              }}
                            >
                              {index === 0 && <CheckCircle className="w-3 h-3 mr-1" />}
                              "{replacement}"
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs hover:bg-gray-100 hover:text-gray-900"
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
                )}

                {/* Fallback for suggestions without replacements */}
                {(!suggestion.replacements || suggestion.replacements.length === 0) && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs hover:bg-gray-100 hover:text-gray-900"
                      onClick={(e) => {
                        e.stopPropagation()
                        onIgnoreSuggestion(suggestion)
                      }}
                    >
                      <X className="w-3 h-3 mr-1" />
                      Ignore
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
} 