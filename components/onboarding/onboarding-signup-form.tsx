'use client'

import { AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
      setError(t('errors.passwordTooShort'))
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
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
            setError(t('errors.testModeSignInRequired'))
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
        <Button onClick={() => setCurrentStep(1)} className="mt-4">
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
          <Button variant="outline" onClick={() => setCurrentStep(3)} className="flex-1">
            {t('backButton')}
          </Button>
          <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
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
      {/* Auth requirement warning */}
      {showAuthWarning && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('signInRequired')}</strong> {t('testModeWarning')}
          </AlertDescription>
        </Alert>
      )}

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
                />
              </div>

              {/* Only show password fields in production mode */}
              {ONBOARDING_MODE === 'production' && (
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
                      {t('form.passwordRequirement')}
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

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || !isAuthReady}>
                {isLoading
                  ? `${ONBOARDING_MODE === 'production' ? t('creatingAccount') : t('form.testingButton')}...`
                  : `${ONBOARDING_MODE === 'production' ? t('createAccountButton') : `🧪 Test ${ONBOARDING_MODE.toUpperCase()}`}`}
              </Button>

              {ONBOARDING_MODE === 'production' && (
                <Typography variant="p" color="muted" className="text-center text-sm">
                  {t('form.termsAndPrivacy')}
                </Typography>
              )}

              {ONBOARDING_MODE !== 'production' && (
                <Typography variant="p" color="muted" className="text-center text-sm">
                  {t('form.testModePrefix', {
                    mode: ONBOARDING_MODE.toUpperCase(),
                  })}
                  {ONBOARDING_MODE === 'mock' ? t('noChanges') : t('realChanges')}
                </Typography>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
