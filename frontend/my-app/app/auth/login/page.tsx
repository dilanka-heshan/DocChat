"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, Eye, EyeOff, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const { signIn, loading: authLoading, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  // Redirect if user is already logged in
  useEffect(() => {
    console.log('Login page useEffect:', { user: !!user, authLoading, pathname: window.location.pathname })
    if (user && !authLoading) {
      console.log('User already logged in, redirecting to dashboard')
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  // Add a loading screen while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Login form submitted')
    console.log('Email:', email)
    console.log('Password length:', password.length)
    
    // Validate inputs
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    
    setLoading(true)
    setError("")

    try {
      console.log('Calling signIn...')
      const { error } = await signIn(email, password)
      console.log('signIn result:', { error })

      if (error) {
        console.error('Sign in error:', error)
        setError(error.message || 'Failed to sign in')
      } else {
        console.log('Sign in successful, auth context will handle redirect')
        // The auth context SIGNED_IN event will handle the redirect
      }
    } catch (err) {
      console.error('Unexpected error during sign in:', err)
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold">DocChat</span>
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || authLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading || authLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || authLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                type="button"
                className="w-full" 
                disabled={loading || authLoading}
                onClick={async (e) => {
                  e.preventDefault()
                  console.log('Button clicked - starting login process')
                  await handleLogin(e as any)
                }}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-blue-600 hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
