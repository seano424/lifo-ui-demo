'use client'

import { Building2, Key, User } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { loginWithCredentials } from '@/app/(auth)/auth/login/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'

// Types for the authentication modes
type AuthMode = 'admin' | 'employee'

// Submit button component that uses form status
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Signing in...' : 'Sign In'}
    </Button>
  )
}

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [authMode, setAuthMode] = useState<AuthMode>('employee')
  const [state, formAction] = useActionState(loginWithCredentials, null)

  // Reset form when switching modes
  const handleModeChange = (mode: AuthMode) => {
    setAuthMode(mode)
  }

  // Show error toast when state changes
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

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
              <form action={formAction} className="space-y-4 font-mono uppercase">
                <div className="space-y-2">
                  <Label htmlFor="employee-identifier">Username or Email</Label>
                  <Input
                    id="employee-identifier"
                    name="identifier"
                    type="text"
                    placeholder="johnd"
                    required
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="employee-password">PIN</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot PIN?
                    </Link>
                  </div>
                  <Input
                    id="employee-password"
                    name="password"
                    type="password"
                    showPasswordToggle
                    placeholder="••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>

                {state?.error && authMode === 'employee' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                    <Typography variant="p" color="destructive" className="text-sm">
                      {state.error}
                    </Typography>
                  </div>
                )}

                <SubmitButton />
              </form>
            </TabsContent>

            {/* Admin Email/Password Login */}
            <TabsContent value="admin" className="space-y-4">
              <form action={formAction} className="space-y-4 font-mono uppercase">
                <div className="space-y-2">
                  <Label htmlFor="admin-identifier">Username or Email</Label>
                  <Input
                    id="admin-identifier"
                    name="identifier"
                    type="text"
                    placeholder="manager@store.com or admin.user"
                    required
                    autoComplete="username"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="admin-password">Password</Label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    id="admin-password"
                    name="password"
                    type="password"
                    showPasswordToggle
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </div>

                {state?.error && authMode === 'admin' && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                    <Typography variant="p" color="destructive" className="text-sm">
                      {state.error}
                    </Typography>
                  </div>
                )}

                <SubmitButton />
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
