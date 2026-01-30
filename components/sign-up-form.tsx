'use client'

import { BackToHomeButton } from '@/components/back-to-home-button'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Typography } from '@/components/ui/typography'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema, type SignUpFormData } from '@/lib/schemas/auth-schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const t = useTranslations('auth.signUpForm')
  const tErrors = useTranslations('auth.errors')
  const locale = useLocale()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [isLoading, setIsLoading] = useState(false)

  // Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: 'onBlur',
  })

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true)

    try {
      // Sign up with Supabase and pass language preference in user metadata
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            language_preference: locale,
          },
        },
      })

      if (error) throw error

      router.push(`/auth/sign-up-success?email=${encodeURIComponent(data.email)}`)
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : tErrors('genericError')
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-mono uppercase">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                autoComplete="email"
                {...register('email')}
              />
              {errors.email && (
                <Typography variant="extraSmall" color="destructive" className="mt-1">
                  {errors.email.message}
                </Typography>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                showPasswordToggle
                placeholder={t('passwordPlaceholder')}
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <Typography variant="extraSmall" color="destructive" className="mt-1">
                  {errors.password.message}
                </Typography>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="repeatPassword">{t('repeatPassword')}</Label>
              <Input
                id="repeatPassword"
                type="password"
                showPasswordToggle
                placeholder={t('repeatPasswordPlaceholder')}
                autoComplete="new-password"
                {...register('repeatPassword')}
              />
              {errors.repeatPassword && (
                <Typography variant="extraSmall" color="destructive" className="mt-1">
                  {errors.repeatPassword.message}
                </Typography>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? t('creatingAccount') : t('signUpButton')}
            </Button>
          </form>

          {/* Footer for existing accounts */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Typography variant="p" color="muted">
              {t('alreadyHaveAccount')}{' '}
              <Link href="/auth/login" className="text-primary hover:underline ">
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
                className="underline hover:text-foreground  text-foreground underline-offset-4"
              >
                {t('termsOfUse')}
              </Link>{' '}
              {t('termsAndPrivacyMiddle')}{' '}
              <Link
                href="/privacy"
                className="underline hover:text-foreground  text-foreground underline-offset-4"
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
