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

interface PINLoginData {
  username: string
  pin: string
}

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
      const { data, error } = await supabase.auth.signInWithPassword({
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

  // PIN login form handler - with enhanced debugging
  const handlePINLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Starting PIN login form submission...')

    setIsLoading(true)
    setError(null)

    try {
      console.log('📞 Calling validatePINLogin...')

      // Call your custom PIN validation function
      const result = await validatePINLogin({ username, pin })

      console.log('📬 validatePINLogin returned:', result)

      if (!result.success) {
        console.log('❌ PIN validation failed:', result.error)
        throw new Error(result.error || 'Invalid credentials')
      }

      console.log('✅ PIN validation succeeded, showing toast...')
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
                  <Label htmlFor="pin">PIN</Label>
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

                <div className="text-center">
                  <Button variant="link" size="sm" type="button">
                    Forgot PIN?
                  </Button>
                </div>
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

// PIN validation function - with cookie for middleware
async function validatePINLogin(data: PINLoginData): Promise<{
  success: boolean
  user?: any
  error?: string
}> {
  const supabase = createClient()

  try {
    console.log('🔐 PIN login attempt:', {
      username: data.username,
      pin: data.pin.replace(/./g, '*'),
    })

    // Call your RPC function directly
    const { data: result, error } = await supabase.rpc('validate_pin_login', {
      p_username: data.username,
      p_pin: data.pin,
    })

    console.log('🔍 RPC Response:', { result, error })

    if (error) {
      console.error('❌ PIN validation RPC error:', error)
      return {
        success: false,
        error: 'Authentication service error: ' + error.message,
      }
    }

    if (!result) {
      console.error('❌ No result from RPC')
      return {
        success: false,
        error: 'No response from authentication service',
      }
    }

    console.log('📋 Full RPC result:', JSON.stringify(result, null, 2))

    if (!result.success) {
      console.log('❌ PIN validation failed:', result.error)
      return {
        success: false,
        error: result.error || 'Invalid username or PIN',
      }
    }

    console.log('✅ PIN validation succeeded!', result.user)

    // Store PIN auth state in sessionStorage
    const pinAuthData = {
      userId: result.user.id,
      email: result.user.email,
      username: result.user.username,
      fullName: result.user.full_name,
      storeId: result.user.store_id,
      storeName: result.user.store_name,
      loginMethod: 'pin',
      authenticatedAt: new Date().toISOString(),
    }

    console.log('💾 Storing PIN auth data:', pinAuthData)

    sessionStorage.setItem('lifo_pin_auth', JSON.stringify(pinAuthData))
    sessionStorage.setItem('lifo_auth_method', 'pin')

    // Set a cookie that the middleware can check
    document.cookie = `lifo_pin_auth=true; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`
    console.log('🍪 Set PIN auth cookie for middleware')

    console.log('🎉 PIN login successful!')

    return {
      success: true,
      user: result.user,
    }
  } catch (error: any) {
    console.error('💥 PIN login error:', error)
    return {
      success: false,
      error: 'Login service unavailable: ' + error.message,
    }
  }
}
