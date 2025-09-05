'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('auth.forgotPassword')
  const tErrors = useTranslations('auth.errors')

  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // The url which will be included in the email. This URL needs to be configured in your redirect URLs in the Supabase dashboard at https://supabase.com/dashboard/project/_/auth/url-configuration
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })
      if (error) throw error
      setSuccess(true)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : tErrors('genericError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      {success ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <Typography variant="h1">{t('checkEmailTitle')}</Typography>
            </CardTitle>
            <CardDescription>
              <Typography variant="p" color="muted">
                {t('checkEmailDescription')}
              </Typography>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Typography variant="p" color="muted">
              {t('emailInstructions')}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              <Typography variant="h1">{t('title')}</Typography>
            </CardTitle>
            <CardDescription>
              <Typography variant="p" color="muted">
                {t('description')}
              </Typography>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="flex flex-col gap-6">
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
                {error && (
                  <Typography variant="p" color="destructive">
                    {error}
                  </Typography>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t('sending') : t('sendResetEmail')}
                </Button>
              </div>
              <div className="mt-4 text-center">
                <Typography variant="p" color="muted">
                  {t('alreadyHaveAccount')}{' '}
                  <Link href="/auth/login" className="underline underline-offset-4">
                    {t('loginLink')}
                  </Link>
                </Typography>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
