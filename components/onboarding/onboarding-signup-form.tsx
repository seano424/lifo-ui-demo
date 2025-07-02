'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

// Simple test mode flag - just flip this to true/false
const TEST_MODE = true

export function OnboardingSignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Get store data from onboarding flow
  const { confirmedStore, setUserDetails, setEmailSent, setCurrentStep } = useOnboardingStore()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!confirmedStore) {
      setError('Store information is missing. Please go back and complete store setup.')
      setIsLoading(false)
      return
    }

    try {
      let userId: string

      if (TEST_MODE) {
        // Test mode: Skip Supabase Auth entirely
        console.log('🧪 TEST MODE: Skipping Supabase Auth')
        userId = `test-user-${Date.now()}`
        console.log('🧪 Generated test user ID:', userId)
      } else {
        // Production mode: Use real Supabase Auth
        console.log('🔐 PRODUCTION MODE: Using Supabase Auth')
        const supabase = createClient()

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              store_name: confirmedStore.name,
            },
          },
        })

        if (authError) throw authError

        if (!authData.user) {
          throw new Error('No user data returned from Supabase')
        }

        userId = authData.user.id
      }

      // Call your API (works for both test and production)
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          store: confirmedStore,
          user: {
            email,
            fullName: '',
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create store and user records')
      }

      // Update onboarding state
      setUserDetails({ email, password })
      setEmailSent(true)

      // Redirect to success page
      router.push('/onboarding/success')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!confirmedStore) {
    return (
      <div className="text-center max-w-md mx-auto">
        <p>No store information found. Please go back and complete the previous steps.</p>
        <Button onClick={() => setCurrentStep(1)} className="mt-4">
          Start Over
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6 max-w-md mx-auto', className)} {...props}>
      {/* Show test mode indicator in development */}
      {TEST_MODE && process.env.NODE_ENV === 'development' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
          🧪 <strong>Test Mode Active</strong> - Supabase Auth will be bypassed
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Almost done! Create your account to access your {confirmedStore?.name} dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="manager@yourstore.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <Typography variant="p" color="muted">
                  Must be at least 8 characters
                </Typography>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? TEST_MODE
                    ? 'Testing...'
                    : 'Creating Account...'
                  : TEST_MODE
                    ? '🧪 Test Create Account'
                    : 'Create Account'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
