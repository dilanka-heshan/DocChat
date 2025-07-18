"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabase } from "./supabase"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    console.log('AuthProvider useEffect starting...')
    let isMounted = true
    let initialized = false
    
    // Get initial session
    const getInitialSession = async () => {
      if (initialized) return // Prevent multiple initializations
      
      try {
        console.log('Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        console.log('Initial session check:', { session: !!session, userId: session?.user?.id, error })
        
        if (error) {
          console.error('Session error:', error)
        }
        
        if (isMounted && !initialized) {
          initialized = true
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
        if (isMounted && !initialized) {
          initialized = true
          setSession(null)
          setUser(null)
          setLoading(false)
        }
      }
    }
    
    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', { event, session: !!session, userId: session?.user?.id, currentPath: typeof window !== 'undefined' ? window.location.pathname : 'server' })
      
      if (!isMounted) return
      
      // Update state first
      setSession(session)
      setUser(session?.user ?? null)
      if (!initialized) {
        initialized = true
        setLoading(false)
      }

      // Handle redirects after state update (only on client side)
      if (typeof window !== 'undefined') {
        if (event === "SIGNED_IN" && window.location.pathname !== '/dashboard') {
          console.log('SIGNED_IN event detected, redirecting to dashboard...')
          setTimeout(() => {
            if (isMounted) {
              console.log('Executing redirect now...')
              window.location.replace('/dashboard')
            }
          }, 100)
        } else if (event === "SIGNED_OUT" && window.location.pathname !== '/') {
          console.log('SIGNED_OUT event detected, redirecting to home...')
          if (isMounted) {
            router.push("/")
          }
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    console.log('AuthContext signIn called with:', { email, passwordLength: password.length })
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log('Supabase signIn result:', { error })
      return { error }
    } catch (err) {
      console.error('Error in signIn:', err)
      return { error: err }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
