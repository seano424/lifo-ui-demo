'use client'

import { loginWithCredentials, signInWithGoogle } from '@/app/(auth)/auth/login/actions'
import { BackToHomeButton } from '@/components/back-to-home-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'

// Submit button component that uses form status
function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('auth.loginForm')
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? t('signingIn') : t('signIn')}
    </Button>
  )
}

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [state, formAction] = useActionState(loginWithCredentials, null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const t = useTranslations('auth.loginForm')

  // Show error toast when state changes
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      const result = await signInWithGoogle()
      if (result?.error) {
        toast.error(result.error)
        setIsGoogleLoading(false)
      } else if (result?.url) {
        // Redirect to Google OAuth URL
        window.location.href = result.url
      }
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : t('common.errors.genericError')
      toast.error(errorMsg)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col bg-secondary/10 rounded-4xl p-6', className)} {...props}>
      {/* Back button */}
      <BackToHomeButton className="flex justify-start" />

      <Card>
        <CardHeader className="flex flex-col gap-4 mb-4">
          <div className="gap-1.5 flex flex-col">
            <Typography variant="h2" className="font-semibold tracking-tight">
              {t('welcomeTitle')}
            </Typography>
            <Typography variant="p">{t('description')}</Typography>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-1">
          {/* Google Sign-In Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              'Signing in...'
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t('signInWithGoogle')}
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            {/* Divider line left side */}
            <div className="absolute inset-0 right-1/2 flex items-center">
              <span className="w-11/12 border-t-2 border-foreground/10" />
            </div>
            <div className="relative flex justify-center">
              <Typography color="muted" variant="extraSmall" className="uppercase">
                {t('orContinueWith')}
              </Typography>
            </div>
            {/* Divider line right side */}
            <div className="absolute inset-0 left-1/2 right-0 flex justify-end items-center">
              <span className="w-11/12 border-t-2 border-foreground/10" />
            </div>
          </div>

          <form action={formAction} className="flex flex-col gap-4 font-mono uppercase">
            <div className="flex flex-col gap-2">
              <Label className="text-foreground" htmlFor="identifier">
                {t('usernameOrEmail')}
              </Label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                placeholder={t('usernamePlaceholder')}
                required
                autoComplete="username"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="text-foreground" htmlFor="password">
                  {t('password')}
                </Label>
                <Link href="/auth/forgot-password" className="text-sm text-primary hover:underline">
                  {t('forgotPassword')}
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                showPasswordToggle
                placeholder={t('passwordPlaceholder')}
                required
                autoComplete="current-password"
              />
            </div>

            {state?.error && (
              <div className="p-3 bg-red-50 border border-destructive rounded-2xl">
                <Typography variant="p" color="destructive" className="text-sm">
                  {state.error}
                </Typography>
              </div>
            )}

            <SubmitButton />
          </form>

          {/* Footer for new accounts */}
          <div className="mt-6 text-center">
            <Typography variant="p">
              {t('noAccount')} <Link href="/auth/sign-up">{t('signUp')}</Link>
            </Typography>
          </div>

          {/* Privacy and Terms */}
          <div className="mt-4 text-center">
            <Typography variant="extraSmall" className="leading-loose">
              {t('termsAndPrivacyPrefix')}{' '}
              <Link href="/terms" className="text-secondary">
                {t('termsOfUse')}
              </Link>{' '}
              {t('termsAndPrivacyMiddle')}{' '}
              <Link href="/privacy" className="text-secondary">
                {t('privacyPolicy')}
              </Link>
            </Typography>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
