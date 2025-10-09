'use client'

import { loginWithCredentials } from '@/app/(auth)/auth/login/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'

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
  const [state, formAction] = useActionState(loginWithCredentials, null)

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
          <form action={formAction} className="space-y-4 font-mono uppercase">
            <div className="space-y-2">
              <Label htmlFor="identifier">Username or Email</Label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="johnd"
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                showPasswordToggle
                placeholder="••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {state?.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                <Typography variant="p" color="destructive" className="text-sm">
                  {state.error}
                </Typography>
              </div>
            )}

            <SubmitButton />
          </form>

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
