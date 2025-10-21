'use client'

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
import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function OnboardingSignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('onboarding.signupForm')

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
    goToPreviousStep,
    reset,
  } = useOnboardingStore()

  // Check if user is logged in - if so, use their ID, otherwise they'll need to sign up
  const isLoggedIn = !!currentUser?.id

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (currentUser?.email && !email) {
      setEmail(currentUser.email)
    }
  }, [currentUser?.email, email])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validation
    if (!isLoggedIn && password.length < 6) {
      setError(t('errors.passwordTooShort'))
      setIsLoading(false)
      return
    }

    if (!isLoggedIn && password !== confirmPassword) {
      setError(t('errors.passwordsNoMatch'))
      setIsLoading(false)
      return
    }

    if (!confirmedStoreInsert && !selectedStoreForm) {
      setError(t('errors.storeInfoMissing'))
      setIsLoading(false)
      return
    }

    if (businessCheckResult?.exists) {
      setError(t('errors.businessAlreadyRegistered'))
      setIsLoading(false)
      return
    }

    try {
      let userId: string

      if (isLoggedIn) {
        // User is already logged in, use their current ID
        userId = currentUser.id
      } else {
        // User needs to sign up first
        const supabase = createClient()

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
            data: {
              store_name: selectedStoreForm?.store_name || 'Unknown Store',
              full_name: fullName,
            },
          },
        })

        if (authError) {
          console.error('🚨 Supabase Auth Error:', authError)
          console.error('🚨 Auth Error Message:', authError.message)
          console.error('🚨 Auth Error Code:', authError.status)

          // Check for email already exists error from Supabase
          const errorMessage = authError.message?.toLowerCase() || ''
          if (
            errorMessage.includes('already registered') ||
            errorMessage.includes('already exists') ||
            errorMessage.includes('duplicate') ||
            errorMessage.includes('user already registered') ||
            errorMessage.includes('email already confirmed') ||
            authError.status === 422
          ) {
            setError(
              'This email address is already registered. Please log in or try a different email.',
            )
            setIsLoading(false)
            return
          }

          throw authError
        }

        if (!authData.user) throw new Error('No user data returned from Supabase')

        userId = authData.user.id
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

      // Call unified API
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

        // Handle specific error types from API
        if (errorData.error === 'EMAIL_ALREADY_EXISTS') {
          setError(
            errorData.message ||
              'This email address is already registered. Please log in or try a different email.',
          )
          setIsLoading(false)
          return
        }

        throw new Error(
          errorData.message || errorData.error || 'Failed to create store and user records',
        )
      }

      // Update onboarding state
      setUserDetails({ email, password, fullName })
      setEmailSent(true)

      // Redirect to success page
      router.push('/onboarding/success')
    } catch (error: unknown) {
      console.error('💥 Signup error:', error)
      console.error('💥 Error type:', typeof error)
      console.error('💥 Error constructor:', error?.constructor?.name)

      // Check if it's a Supabase auth error that we might have missed
      if (error && typeof error === 'object') {
        // Define a type for the error object with optional properties
        interface SupabaseErrorObject {
          message?: string
          details?: string
          hint?: string
          status?: number
          statusCode?: number
          error?: {
            message?: string
            status?: number
          }
        }

        const errorObj = error as SupabaseErrorObject
        const errorMessage = errorObj.message?.toLowerCase() || ''
        const errorDetails = errorObj.details?.toLowerCase() || ''
        const errorHint = errorObj.hint?.toLowerCase() || ''

        console.error('💥 Error message:', errorMessage)
        console.error('💥 Error details:', errorDetails)
        console.error('💥 Error hint:', errorHint)
        console.error('💥 Full error object:', JSON.stringify(error, null, 2))

        // Check all possible error message fields
        const allErrorText = `${errorMessage} ${errorDetails} ${errorHint}`.toLowerCase()

        // Also check if the error has a nested error object
        const nestedError = errorObj.error?.message?.toLowerCase() || ''
        const allText = `${allErrorText} ${nestedError}`.toLowerCase()

        console.error('💥 All error text combined:', allText)

        if (
          allText.includes('already registered') ||
          allText.includes('already exists') ||
          allText.includes('duplicate') ||
          allText.includes('user already registered') ||
          allText.includes('email already confirmed') ||
          allText.includes('a user with this email address has already been registered') ||
          allText.includes('user with this email already exists') ||
          allText.includes('email address has already been registered') ||
          errorObj.status === 422 ||
          errorObj.statusCode === 422 ||
          errorObj.error?.status === 422
        ) {
          console.log('✅ Detected email conflict in catch block')
          setError(
            'This email address is already registered. Please log in or try a different email.',
          )
          setIsLoading(false)
          return
        }
      }

      setError(error instanceof Error ? error.message : t('errors.signupError'))
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
          <AlertDescription>{t('errors.noStoreInfo')}</AlertDescription>
        </Alert>
        <Button onClick={() => reset()} className="mt-4">
          {t('errors.startOver')}
        </Button>
      </div>
    )
  }

  if (businessCheckResult?.exists) {
    return (
      <div className="text-center mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p>
                <strong>{t('businessRegistered')}</strong>
              </p>
              <p>{t('businessRegisteredDesc')}</p>
            </div>
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 mt-4">
          <Button variant="outline" onClick={() => goToPreviousStep()} className="flex-1">
            {t('backButton')}
          </Button>
          <Button variant="outline" onClick={() => reset()} className="flex-1">
            {t('tryDifferentStore')}
          </Button>
        </div>
      </div>
    )
  }

  const storeName =
    selectedStoreForm?.store_name || confirmedStoreInsert?.store_name || 'your store'

  return (
    <div className={cn('flex flex-col gap-6 mx-auto', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{t('createAccount')}</CardTitle>
          <CardDescription>{t('createAccountDesc', { storeName })}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <Label htmlFor="fullName">{t('fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('fullNamePlaceholder')}
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoggedIn} // Disable if user is already logged in
                />
              </div>

              {/* Only show password fields if user is not already logged in */}
              {!isLoggedIn && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password">{t('password')}</Label>
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
                      {t('passwordRequirement')}
                    </Typography>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirm-password">{t('confirmPassword')}</Label>
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

              {isLoggedIn && (
                <Alert>
                  <AlertDescription>
                    {t('loggedInMessage', { email: currentUser?.email })}
                  </AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription className="flex justify-center">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <p>{error}</p>
                      </div>
                      <div className="flex flex-col items-center gap-2 mt-3">
                        <div className="flex justify-center gap-2 w-full">
                          <Button
                            type="button"
                            variant="default"
                            onClick={() => router.push('/auth/login')}
                          >
                            {t('loginInstead')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="text-primary"
                            onClick={() => {
                              setError(null)
                              setEmail('')
                            }}
                          >
                            {t('tryAgain')}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="link"
                          className="text-sm"
                          onClick={() => router.push('/auth/forgot-password')}
                        >
                          {t('forgotPassword')}
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {!error && (
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading
                    ? isLoggedIn
                      ? t('creatingStore')
                      : t('creatingAccount')
                    : isLoggedIn
                      ? t('createStore')
                      : t('createAccountButton')}
                </Button>
              )}

              {!isLoggedIn && (
                <Typography variant="p" color="muted" className="text-center text-sm">
                  {t('termsAndPrivacyPrefix')}{' '}
                  <Link
                    href="/terms"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {t('termsOfUse')}
                  </Link>{' '}
                  {t('termsAndPrivacyMiddle')}{' '}
                  <Link
                    href="/privacy"
                    className="underline underline-offset-4 hover:text-foreground"
                  >
                    {t('privacyPolicy')}
                  </Link>
                </Typography>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
