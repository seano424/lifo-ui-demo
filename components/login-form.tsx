'use client'

import { loginWithCredentials } from '@/app/(auth)/auth/login/actions'
import { BackToHomeButton } from '@/components/back-to-home-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { Building2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useActionState, useEffect } from 'react'
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
  const t = useTranslations('auth.loginForm')

  // Show error toast when state changes
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <div className={cn('flex flex-col gap-6 max-w-md mx-auto', className)} {...props}>
      {/* Back button */}
      <BackToHomeButton className="flex justify-start" />

      <Card>
        <CardHeader className="text-center space-y-4 mb-4">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1.5 flex flex-col">
            <CardTitle>{t('welcomeTitle')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form action={formAction} className="space-y-4 font-mono uppercase">
            <div className="space-y-2">
              <Label htmlFor="identifier">{t('usernameOrEmail')}</Label>
              <Input
                id="identifier"
                name="identifier"
                type="text"
                placeholder={t('usernamePlaceholder')}
                required
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('password')}</Label>
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
              {t('newStore')}{' '}
              <Link
                href="/onboarding/create-account"
                className="text-primary hover:underline font-medium"
              >
                {t('createAccount')}
              </Link>
            </Typography>
          </div>

          {/* Privacy and Terms */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Typography variant="extraSmall" color="muted" className="leading-loose">
              {t('termsAndPrivacyPrefix')}{' '}
              <Link
                href="/terms"
                className="underline hover:text-foreground font-medium text-foreground underline-offset-4"
              >
                {t('termsOfUse')}
              </Link>{' '}
              {t('termsAndPrivacyMiddle')}{' '}
              <Link
                href="/privacy"
                className="underline hover:text-foreground font-medium text-foreground underline-offset-4"
              >
                {t('privacyPolicy')}
              </Link>
            </Typography>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
