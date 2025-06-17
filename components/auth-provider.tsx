"use client"

import type React from "react"
import { createContext } from "react"
import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { SessionProvider } from "next-auth/react"

type AuthContextType = {
  user: any
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const signIn = async (email: string, password: string) => {
    const result = await nextAuthSignIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      throw new Error("Invalid credentials")
    }

    router.push("/dashboard")
  }

  const signUp = async (email: string, password: string, name: string) => {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create account")
    }

    // Auto sign in after successful signup
    await signIn(email, password)
  }

  const logout = async () => {
    await nextAuthSignOut({ redirect: false })
    router.push("/auth/login")
  }

  return {
    user: session?.user || null,
    loading: status === "loading",
    signIn,
    signUp,
    logout,
  }
}
