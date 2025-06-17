"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (!session) {
      router.push("/auth/login")
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="flex h-screen">
        <div className="w-80 border-r p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        <div className="flex-1 p-4 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return <>{children}</>
}
