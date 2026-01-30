'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { createClient } from '@/lib/supabase/client'
import { Mail, HelpCircle, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState, useEffect, Suspense } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

// Email validation schema
const emailSchema = z.string().email()

function SignUpSuccessContent() {
  const t = useTranslations('auth.signUpSuccess')
  const tErrors = useTranslations('auth.errors')
  const searchParams = useSearchParams()
  const rawEmail = searchParams.get('email') || ''

  // Validate email from URL parameter
  const email = useMemo(() => {
    const result = emailSchema.safeParse(rawEmail)
    return result.success ? result.data : null
  }, [rawEmail])

  const [isResending, setIsResending] = useState(false)
  const [lastResendTime, setLastResendTime] = useState<number>(0)
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0)
  const supabase = useMemo(() => createClient(), [])

  // Cooldown timer - 60 seconds between resend attempts
  const RESEND_COOLDOWN_MS = 60000

  useEffect(() => {
    if (lastResendTime === 0) return

    const updateCooldown = () => {
      const elapsed = Date.now() - lastResendTime
      const remaining = Math.max(0, RESEND_COOLDOWN_MS - elapsed)
      setCooldownRemaining(Math.ceil(remaining / 1000))

      if (remaining > 0) {
        requestAnimationFrame(updateCooldown)
      }
    }

    updateCooldown()
  }, [lastResendTime])

  // Show error if email is invalid
  useEffect(() => {
    if (!email && rawEmail) {
      toast.error(tErrors('invalidEmail'))
    }
  }, [email, rawEmail, tErrors])

  // Detect email provider for "Open Email" button
  const getEmailProvider = (emailAddress: string) => {
    const domain = emailAddress.split('@')[1]?.toLowerCase()
    if (!domain) return null

    const providers: Record<string, string> = {
      'gmail.com': 'https://mail.google.com',
      'googlemail.com': 'https://mail.google.com',
      'outlook.com': 'https://outlook.live.com/mail',
      'hotmail.com': 'https://outlook.live.com/mail',
      'yahoo.com': 'https://mail.yahoo.com',
      'icloud.com': 'https://www.icloud.com/mail',
      'me.com': 'https://www.icloud.com/mail',
    }

    return providers[domain] || null
  }

  const handleOpenEmail = () => {
    if (!email) {
      toast.error(tErrors('invalidEmail'))
      return
    }

    const providerUrl = getEmailProvider(email)
    if (providerUrl) {
      window.open(providerUrl, '_blank')
    } else {
      // Fallback to mailto protocol - email is validated so safe to use
      window.location.href = `mailto:${email}`
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      toast.error(tErrors('invalidEmail'))
      return
    }

    // Check cooldown
    const timeSinceLastResend = Date.now() - lastResendTime
    if (timeSinceLastResend < RESEND_COOLDOWN_MS) {
      const secondsRemaining = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastResend) / 1000)
      toast.error(`Please wait ${secondsRemaining} seconds before resending`)
      return
    }

    setIsResending(true)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      })

      if (error) throw error

      setLastResendTime(Date.now())
      toast.success(t('resendSuccess'))
    } catch (error) {
      console.error('Error resending verification email:', error)
      toast.error(t('resendError'))
    } finally {
      setIsResending(false)
    }
  }

  const handleGetHelp = () => {
    const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@lifo.ai'
    window.open(`mailto:${supportEmail}`, '_blank')
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card shadow="primary">
            <CardHeader className="text-center flex flex-col gap-4">
              {/* Icon */}
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>

              {/* Title */}
              <CardTitle className="text-2xl">{t('title')}</CardTitle>

              {/* Email display with subtle styling */}
              <div className="pt-2">
                {email ? (
                  <Typography variant="p" className="text-base text-muted-foreground">
                    {t.rich('checkEmail', {
                      email: _ => <span className="font-semibold text-foreground">{email}</span>,
                    })}
                  </Typography>
                ) : (
                  <Typography variant="p" className="text-base text-destructive">
                    {tErrors('invalidEmail')}
                  </Typography>
                )}
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {/* Instructions */}
              <Typography variant="p" color="muted" className="text-center">
                {t('instructions')}
              </Typography>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                {/* Open Email Button - Primary action */}
                <Button onClick={handleOpenEmail} className="w-full" size="lg" variant="default">
                  <Mail className="w-4 h-4 mr-2" />
                  {t('openEmail')}
                </Button>

                {/* Resend Verification Button - Secondary action */}
                <Button
                  onClick={handleResendVerification}
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={isResending || !email || cooldownRemaining > 0}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                  {isResending
                    ? t('resending')
                    : cooldownRemaining > 0
                      ? `Wait ${cooldownRemaining}s`
                      : t('resendVerification')}
                </Button>

                {/* Get Help Button - Tertiary action */}
                <Button onClick={handleGetHelp} variant="ghost" className="w-full" size="lg">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  {t('getHelp')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <Card shadow="primary">
          <CardHeader className="text-center flex flex-col gap-4">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-2xl">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

// Main page component with Suspense boundary
export default function Page() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SignUpSuccessContent />
    </Suspense>
  )
}
