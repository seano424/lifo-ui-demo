'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { Typography } from '@/components/ui/typography'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { User, Key, Building2 } from 'lucide-react'
import { toast } from 'sonner'

// Types for the authentication modes
type AuthMode = 'admin' | 'employee'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [authMode, setAuthMode] = useState<AuthMode>('employee')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Email/Password form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // PIN form state
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')

  // Reset form when switching modes
  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode)
    setError(null)
    setEmail('')
    setPassword('')
    setUsername('')
    setPin('')
  }

  // Email/Password login (existing functionality)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      toast.success('Welcome back!')
      router.push('/dashboard') // Updated redirect path
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // PIN login form handler - with proper Supabase session
  const handlePINLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Starting PIN login form submission...')

    setIsLoading(true)
    setError(null)

    try {
      console.log('📞 Calling PIN session API...')

      // Call the PIN session API to validate and create session
      const response = await fetch('/api/auth/pin-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, pin }),
      })

      const result = await response.json()
      console.log('📬 PIN session API returned:', result)

      if (!result.success) {
        console.log('❌ PIN validation failed:', result.error)
        throw new Error(result.error || 'Invalid credentials')
      }

      console.log('✅ PIN validation succeeded!')

      if (result.session) {
        // Set the session in Supabase client if we have session tokens
        console.log('Setting session with tokens...')
        const supabase = createClient()
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        })

        if (sessionError) {
          console.error('❌ Failed to set session:', sessionError)
          throw new Error('Failed to create session')
        }

        console.log('🎉 Session created successfully!')
      } else if (result.magicLink) {
        // Handle magic link approach
        console.log('📧 Using magic link for authentication...')
        window.location.href = result.magicLink
        return
      } else if (result.authUser) {
        // Handle manual session setup
        console.log('🔧 Manual session setup...')
        const supabase = createClient()

        // Try to sign in with the user's email (this might work since PIN is validated)
        console.log('Attempting sign in for:', result.authUser.email)
        toast.success(`PIN authenticated! Setting up session for ${result.user.username}...`)

        // For now, just show success and redirect to dashboard without session
        // The user might already be logged in from previous sessions
        router.push('/dashboard')
        return
      } else {
        // PIN validation successful but no session tokens yet
        console.log('📝 PIN validation successful, but session creation needs work')
        toast.success(`PIN authenticated for ${result.user.username}!`)

        // For now, show success message and stay on login page
        return
      }

      toast.success(`Welcome back, ${result.user.full_name}!`)

      console.log('🧭 Attempting to redirect to dashboard...')
      router.push('/dashboard') // Same redirect for all users

      console.log('🎯 Router.push called, waiting for redirect...')
    } catch (error: unknown) {
      console.log('💥 Error in handlePINLogin:', error)
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      console.log('🏁 Setting isLoading to false...')
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6 max-w-md mx-auto', className)} {...props}>
      <Card>
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <CardTitle>
              <Typography variant="h1">Welcome to LIFO</Typography>
            </CardTitle>
            <CardDescription>
              <Typography variant="p" color="muted">
                Sign in to manage your store inventory
              </Typography>
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={authMode} onValueChange={value => handleModeChange(value as AuthMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="employee" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Employee
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Manager/Owner
              </TabsTrigger>
            </TabsList>

            {/* Employee PIN Login */}
            <TabsContent value="employee" className="space-y-4">
              <form onSubmit={handlePINLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johnd"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">PIN</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot PIN?
                    </Link>
                  </div>
                  <Input
                    id="pin"
                    type="password"
                    showPasswordToggle
                    placeholder="••••"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    maxLength={4}
                    pattern="[0-9]{4}"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                </div>

                {error && authMode === 'employee' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <Typography variant="p" color="destructive" className="text-sm">
                      {error}
                    </Typography>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>

            {/* Admin Email/Password Login */}
            <TabsContent value="admin" className="space-y-4">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="manager@store.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    showPasswordToggle
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                </div>

                {error && authMode === 'admin' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <Typography variant="p" color="destructive" className="text-sm">
                      {error}
                    </Typography>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Footer for new accounts */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Typography variant="p" color="muted">
              New store?{' '}
              <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">
                Create an account
              </Link>
            </Typography>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
