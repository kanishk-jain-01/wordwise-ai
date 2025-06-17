"use client"

import type React from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Smile, Meh, Frown, Zap, Heart, Brain } from "lucide-react"

type ToneIndicatorProps = {
  tone: string | null
}

export function ToneIndicator({ tone }: ToneIndicatorProps) {
  if (!tone) return null

  const getToneConfig = (tone: string) => {
    const toneMap: Record<string, { icon: React.ReactNode; color: string; label: string; description: string }> = {
      positive: {
        icon: <Smile className="w-4 h-4" />,
        color: "bg-green-100 text-green-800 border-green-200",
        label: "Positive",
        description: "Your writing has an upbeat, optimistic tone",
      },
      negative: {
        icon: <Frown className="w-4 h-4" />,
        color: "bg-red-100 text-red-800 border-red-200",
        label: "Negative",
        description: "Your writing conveys a pessimistic or critical tone",
      },
      neutral: {
        icon: <Meh className="w-4 h-4" />,
        color: "bg-gray-100 text-gray-800 border-gray-200",
        label: "Neutral",
        description: "Your writing maintains an objective, balanced tone",
      },
      confident: {
        icon: <Zap className="w-4 h-4" />,
        color: "bg-blue-100 text-blue-800 border-blue-200",
        label: "Confident",
        description: "Your writing shows strong conviction and certainty",
      },
      friendly: {
        icon: <Heart className="w-4 h-4" />,
        color: "bg-pink-100 text-pink-800 border-pink-200",
        label: "Friendly",
        description: "Your writing has a warm, approachable tone",
      },
      formal: {
        icon: <Brain className="w-4 h-4" />,
        color: "bg-purple-100 text-purple-800 border-purple-200",
        label: "Formal",
        description: "Your writing uses professional, academic language",
      },
    }

    return (
      toneMap[tone.toLowerCase()] || {
        icon: <Meh className="w-4 h-4" />,
        color: "bg-gray-100 text-gray-800 border-gray-200",
        label: tone,
        description: "Tone detected in your writing",
      }
    )
  }

  const config = getToneConfig(tone)

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${config.color}`}>{config.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Tone:</span>
              <Badge variant="secondary" className={config.color}>
                {config.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
