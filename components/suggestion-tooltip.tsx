"use client"

import type { GrammarSuggestion } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Check, AlertCircle, Lightbulb, Zap } from "lucide-react"

type SuggestionTooltipProps = {
  suggestion: GrammarSuggestion
  position: { x: number; y: number }
  onApply: (replacement: string) => void
  onIgnore: () => void
  onClose: () => void
}

export function SuggestionTooltip({ suggestion, position, onApply, onIgnore, onClose }: SuggestionTooltipProps) {
  const getIcon = () => {
    switch (suggestion.type) {
      case "grammar":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case "spelling":
        return <Zap className="w-4 h-4 text-yellow-500" />
      case "style":
        return <Lightbulb className="w-4 h-4 text-blue-500" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const getBadgeVariant = () => {
    switch (suggestion.type) {
      case "grammar":
        return "destructive"
      case "spelling":
        return "default"
      case "style":
        return "secondary"
      default:
        return "default"
    }
  }

  return (
    <Card
      className="absolute z-50 w-80 shadow-lg border"
      style={{
        left: position.x,
        top: position.y - 10,
        transform: "translateY(-100%)",
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getIcon()}
            <Badge variant={getBadgeVariant()}>
              {suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <CardTitle className="text-sm">{suggestion.shortMessage}</CardTitle>
        <CardDescription className="text-xs">{suggestion.message}</CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        {suggestion.replacements.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Suggestions:</p>
            <div className="space-y-1">
              {suggestion.replacements.slice(0, 3).map((replacement, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2"
                  onClick={() => onApply(replacement)}
                >
                  <Check className="w-3 h-3 mr-2 text-green-500" />
                  <span className="text-xs">{replacement}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="ghost" size="sm" onClick={onIgnore} className="flex-1">
            Ignore
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
