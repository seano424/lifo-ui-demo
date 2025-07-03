// components/onboarding/onboarding-signup-form.tsx

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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-users'

// Simple test mode flag - just flip this to true/false
const TEST_MODE = true
const REAL_USER_TEST = true // New flag

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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    console.log('🚀 Starting handleSignUp')
    console.log('🧪 TEST_MODE:', TEST_MODE)
    console.log('🧪 REAL_USER_TEST:', REAL_USER_TEST)
    console.log('👤 currentUser:', currentUser)
    console.log('👤 currentUser?.auth?.id:', currentUser?.auth?.id)

    // Validation
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
      let userId: string = '' // Initialize with empty string

      if (REAL_USER_TEST) {
        console.log('🔄 Entering REAL_USER_TEST mode')
        // Real user test mode: Use current user ID
        const currentUserId = currentUser?.auth?.id
        console.log('🔍 currentUserId from auth:', currentUserId)

        if (currentUserId) {
          console.log('✅ Using current user ID from auth')
          userId = currentUserId
        } else {
          console.log('❌ No current user ID available')
          setError('No user ID available. Please sign in to your account first.')
          setIsLoading(false)
          return
        }

        console.log('🎯 Final userId for REAL_USER_TEST:', userId)
      } else if (TEST_MODE) {
        console.log('🔄 Entering TEST_MODE')
        // Test mode: Skip Supabase Auth entirely
        userId = `test-user-${Date.now()}`
        console.log('🎯 Generated test user ID:', userId)
      } else {
        console.log('🔄 Entering PRODUCTION MODE')
        // Production mode: Use real Supabase Auth
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

        if (!authData.user) {
          throw new Error('No user data returned from Supabase')
        }

        userId = authData.user.id
        console.log('🎯 Production user ID:', userId)
      }

      // Validate we have a userId before proceeding
      console.log('🔍 Final validation - userId:', userId)
      console.log('🔍 userId type:', typeof userId)
      console.log('🔍 userId length:', userId.length)

      if (!userId || userId.trim() === '') {
        console.error('❌ No valid user ID available')
        throw new Error('Failed to get user ID')
      }

      console.log('✅ User ID validated successfully:', userId)

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

      console.log('📦 Prepared store data:', storeData)

      // Call your API to create store and user records
      const apiPayload = {
        userId,
        store: storeData,
        user: {
          email,
          fullName,
        },
      }

      console.log('🚀 Calling API with payload:', apiPayload)

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      })

      console.log('📡 API response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ API error:', errorData)
        throw new Error(errorData.error || 'Failed to create store and user records')
      }

      const result = await response.json()
      console.log('✅ Onboarding API result:', result)

      // Update onboarding state
      setUserDetails({ email, password, fullName })
      setEmailSent(true)

      // Redirect to success page
      if (TEST_MODE) {
        router.push('/onboarding/success?test=true')
      } else {
        router.push('/onboarding/success')
      }
    } catch (error: unknown) {
      console.error('💥 Signup error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred during signup')
    } finally {
      setIsLoading(false)
    }
  }

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

  const hasValidUserId = REAL_USER_TEST ? !!currentUser?.auth?.id : true

  return (
    <div className={cn('flex flex-col gap-6 max-w-md mx-auto', className)} {...props}>
      {/* Show test mode indicator in development */}
      {TEST_MODE && process.env.NODE_ENV === 'development' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            🧪 <strong>Test Mode Active</strong> -
            {REAL_USER_TEST
              ? currentUser?.auth?.id
                ? ` Using your current user account (${currentUser.auth.id.slice(0, 8)}...)`
                : ' ⚠️ No user ID available - please sign in first!'
              : ' Supabase Auth will be bypassed for testing'}
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

      {/* Warning if no user ID is available in real user test mode */}
      {REAL_USER_TEST && !currentUser?.auth?.id && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sign in required:</strong> Please sign in to your account first to test with
            your real user ID.
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
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !hasValidUserId}>
                {isLoading
                  ? TEST_MODE
                    ? 'Testing Account Creation...'
                    : 'Creating Account...'
                  : TEST_MODE
                    ? '🧪 Test Create Account'
                    : 'Create Account'}
              </Button>

              {!TEST_MODE && (
                <Typography variant="p" color="muted" className="text-center text-sm">
                  By creating an account, you agree to our Terms of Service and Privacy Policy.
                  You'll receive a confirmation email to verify your account.
                </Typography>
              )}

              {TEST_MODE && (
                <Typography variant="p" color="muted" className="text-center text-sm">
                  🧪 Test mode: Account will be created without email verification.
                </Typography>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
