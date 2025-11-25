'use client'

import { BackToHomeButton } from '@/components/back-to-home-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Building2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('auth.signUpForm')
  const tErrors = useTranslations('auth.errors')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password.length < 6) {
      const errorMsg = tErrors('passwordTooShort')
      setError(errorMsg)
      toast.error(errorMsg)
      setIsLoading(false)
      return
    }

    if (password !== repeatPassword) {
      const errorMsg = tErrors('passwordsNoMatch')
      setError(errorMsg)
      toast.error(errorMsg)
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })
      if (error) throw error
      router.push(`/auth/sign-up-success?email=${encodeURIComponent(email)}`)
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : tErrors('genericError')
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

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
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4 font-mono uppercase">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                showPasswordToggle
                placeholder={t('passwordPlaceholder')}
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repeat-password">{t('repeatPassword')}</Label>
              <Input
                id="repeat-password"
                name="repeat-password"
                type="password"
                showPasswordToggle
                placeholder={t('repeatPasswordPlaceholder')}
                required
                value={repeatPassword}
                onChange={e => setRepeatPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl">
                <Typography variant="p" color="destructive" className="text-sm">
                  {error}
                </Typography>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('creatingAccount') : t('signUpButton')}
            </Button>
          </form>

          {/* Footer for existing accounts */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Typography variant="p" color="muted">
              {t('alreadyHaveAccount')}{' '}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                {t('loginLink')}
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
