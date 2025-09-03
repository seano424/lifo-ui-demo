'use client'

import { AlertTriangle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { useCurrentUser } from '@/hooks/use-users'
import { useOnboardingStore } from '@/lib/stores/onboarding-store'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const ONBOARDING_MODE = process.env.NEXT_PUBLIC_ONBOARDING_MODE || 'production'

export function OnboardingSignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { data: currentUser } = useCurrentUser()

  // Get store data from onboarding flow
  const {
    confirmedStoreInsert,
    selectedStoreForm,
    businessCheckResult,
    setUserDetails,
    setEmailSent,
    setCurrentStep,
  } = useOnboardingStore()

  // Determine what's required based on mode
  const requiresAuth = ONBOARDING_MODE === 'test'
  const isAuthReady = !requiresAuth || !!currentUser?.id
  const showAuthWarning = requiresAuth && !currentUser?.id

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validation
    if (ONBOARDING_MODE === 'production' && password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (!confirmedStoreInsert && !selectedStoreForm) {
      setError('Store information is missing. Please go back and complete store setup.')
      setIsLoading(false)
      return
    }

    if (businessCheckResult?.exists) {
      setError('This business is already registered. Please contact support.')
      setIsLoading(false)
      return
    }

    try {
      let userId: string = ''

      switch (ONBOARDING_MODE) {
        case 'mock':
          // Mock mode: generate fake user ID
          userId = `mock-user-${Date.now()}`
          break

        case 'test': {
          // Test mode: use current logged-in user
          const currentUserId = currentUser?.id
          if (!currentUserId) {
            setError('Test mode requires you to be signed in first.')
            setIsLoading(false)
            return
          }
          userId = currentUserId
          break
        }
        default: {
          // Production mode: create new auth user
          const supabase = createClient()

          const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/dashboard`,
              data: {
                store_name: selectedStoreForm?.store_name || 'Unknown Store',
                full_name: fullName,
              },
            },
          })

          if (authError) throw authError
          if (!authData.user) throw new Error('No user data returned from Supabase')

          userId = authData.user.id
          break
        }
      }

      // Prepare store data for API call
      const storeData = selectedStoreForm || {
        store_name: confirmedStoreInsert?.store_name || 'Unknown Store',
        address: confirmedStoreInsert?.address,
        city: confirmedStoreInsert?.city,
        postal_code: confirmedStoreInsert?.postal_code,
        country: confirmedStoreInsert?.country,
        store_type: confirmedStoreInsert?.store_type,
        business_name: confirmedStoreInsert?.business_name,
      }

      // Call API
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          store: storeData,
          user: { email, fullName },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create store and user records')
      }

      const _result = await response.json()

      // Update onboarding state
      setUserDetails({ email, password, fullName })
      setEmailSent(true)

      // Redirect based on mode
      const redirectPath =
        ONBOARDING_MODE === 'production'
          ? '/onboarding/success'
          : `/onboarding/success?mode=${ONBOARDING_MODE}`

      router.push(redirectPath)
    } catch (error: unknown) {
      console.error('💥 Signup error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred during signup')
    } finally {
      setIsLoading(false)
    }
  }

  // Early returns for missing requirements
  if (!confirmedStoreInsert && !selectedStoreForm) {
    return (
      <div className="text-center max-w-md mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No store information found. Please go back and complete the previous steps.
          </AlertDescription>
        </Alert>
        <Button onClick={() => setCurrentStep(1)} className="mt-4">
          Start Over
        </Button>
      </div>
    )
  }

  if (businessCheckResult?.exists) {
    return (
      <div className="text-center max-w-md mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>
                <strong>Business Already Registered</strong>
              </p>
              <p>
                This business is already in our system. Please contact support or try a different
                store.
              </p>
            </div>
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => setCurrentStep(3)} className="flex-1">
            Back
          </Button>
          <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
            Try Different Store
          </Button>
        </div>
      </div>
    )
  }

  const storeName =
    selectedStoreForm?.store_name || confirmedStoreInsert?.store_name || 'your store'

  return (
    <div className={cn('flex flex-col gap-6 max-w-md mx-auto', className)} {...props}>
      {/* Mode indicator for development */}
      {process.env.NODE_ENV === 'development' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>🧪 {ONBOARDING_MODE.toUpperCase()} MODE</strong>
            {ONBOARDING_MODE === 'mock' && ' - No database changes, returns fake success'}
            {ONBOARDING_MODE === 'test' &&
              currentUser?.id &&
              ` - Using your account (${currentUser.id.slice(0, 8)}...)`}
            {ONBOARDING_MODE === 'production' && ' - Full signup with new user account'}
          </AlertDescription>
        </Alert>
      )}

      {/* Business verification status */}
      {businessCheckResult && !businessCheckResult.exists && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Business Verified!</strong> This store is available for registration.
          </AlertDescription>
        </Alert>
      )}

      {/* Auth requirement warning */}
      {showAuthWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sign in required:</strong> Test mode requires you to be signed in first.
            <br />
            <small>Switch to MOCK mode if you want to test without authentication.</small>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create Your Account</CardTitle>
          <CardDescription>
            Almost done! Create your account to access your {storeName} dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>

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

              {/* Only show password fields in production mode */}
              {ONBOARDING_MODE === 'production' && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      showPasswordToggle
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                    <Typography variant="p" color="muted">
                      Must be at least 6 characters
                    </Typography>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      showPasswordToggle
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !isAuthReady}>
                {isLoading
                  ? `${ONBOARDING_MODE === 'production' ? 'Creating Account' : 'Testing'}...`
                  : `${ONBOARDING_MODE === 'production' ? 'Create Account' : `🧪 Test ${ONBOARDING_MODE.toUpperCase()}`}`}
              </Button>

              {ONBOARDING_MODE === 'production' && (
                <Typography variant="p" color="muted" className="text-center text-sm">
                  By creating an account, you agree to our Terms of Service and Privacy Policy.
                  You&#39;ll receive a confirmation email to verify your account.
                </Typography>
              )}

              {ONBOARDING_MODE !== 'production' && (
                <Typography variant="p" color="muted" className="text-center text-sm">
                  🧪 {ONBOARDING_MODE} mode:{' '}
                  {ONBOARDING_MODE === 'mock'
                    ? 'No real changes will be made'
                    : 'Real database changes with your account'}
                </Typography>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
