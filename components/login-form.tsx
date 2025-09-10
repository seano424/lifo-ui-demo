'use client'

import { Building2, Key, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Typography } from '@/components/ui/typography'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

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

  // Email/Password login with username support
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      let loginEmail = email

      // If the input doesn't contain @, treat it as a username and look up the email
      if (!email.includes('@')) {
        // Look up user by username using optimized function
        const { data: userResult, error: userError } = await supabase.rpc('get_user_by_username', {
          p_username: email,
        })

        if (userError) {
          console.error('Failed to lookup user by username:', userError)
          throw new Error('Authentication service error')
        }

        if (!userResult || userResult.length === 0 || !userResult[0].email) {
          throw new Error('Invalid username or password')
        }

        loginEmail = userResult[0].email
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      })

      if (error) throw error

      toast.success('Welcome back!')
      router.push('/dashboard')
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

    setIsLoading(true)
    setError(null)

    try {
      // Call the PIN session API to validate and create session
      const response = await fetch('/api/auth/pin-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, pin }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Invalid credentials')
      }

      if (result.session) {
        // Set the session in Supabase client if we have session tokens
        const supabase = createClient()
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: result.session.access_token,
          refresh_token: result.session.refresh_token,
        })

        if (sessionError) {
          console.error('❌ Failed to set session:', sessionError)
          throw new Error('Failed to create session')
        }
      } else {
        throw new Error('No session returned from authentication')
      }

      toast.success(`Welcome back, ${result.user.full_name}!`)

      router.push('/dashboard') // Same redirect for all users
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6 max-w-md mx-auto', className)} {...props}>
      <Card>
        <CardHeader className="text-center space-y-4 mb-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1.5 flex flex-col">
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
            <TabsList className="grid w-full grid-cols-2 font-mono">
              <TabsTrigger value="employee" className="flex items-center gap-2 uppercase">
                <User className="w-4 h-4" />
                Employee
              </TabsTrigger>
              <TabsTrigger value="admin" className="flex items-center gap-2 uppercase">
                <Key className="w-4 h-4" />
                Manager/Owner
              </TabsTrigger>
            </TabsList>

            {/* Employee PIN Login */}
            <TabsContent value="employee" className="space-y-4">
              <form onSubmit={handlePINLogin} className="space-y-4 font-mono uppercase">
                <div className="space-y-2">
                  <Label htmlFor="username">Username or Email</Label>
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
                    placeholder="••••••"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    required
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                </div>

                {error && authMode === 'employee' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
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
              <form onSubmit={handleEmailLogin} className="space-y-4 font-mono uppercase">
                <div className="space-y-2">
                  <Label htmlFor="email">Username or Email</Label>
                  <Input
                    id="email"
                    type="text"
                    placeholder="manager@store.com or admin.user"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="username"
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
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
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
              <Link
                href="/onboarding/create-account"
                className="text-primary hover:underline font-medium"
              >
                Create an account
              </Link>
            </Typography>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
