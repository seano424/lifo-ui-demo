'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function UpdatePasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('auth.updatePassword')
  const tErrors = useTranslations('auth.errors')

  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password.length < 6) {
      setError(tErrors('passwordTooShort'))
      setIsLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      // Update this route to redirect to an authenticated route. The user already has an active session.
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : tErrors('genericError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
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
                <Label htmlFor="password">{t('newPassword')}</Label>
                <Input
                  id="password"
                  type="password"
                  showPasswordToggle
                  placeholder={t('newPasswordPlaceholder')}
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <Typography variant="p" color="destructive">
                  {error}
                </Typography>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('saving') : t('savePassword')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
