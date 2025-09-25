import { Check, Mail } from 'lucide-react'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

function SuccessContent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md mx-auto space-y-6">
        {/* Success Icon */}
        <div className="text-center flex flex-col items-center gap-2">
          <Check className="w-10 h-10 text-secondary-900 stroke-5 border-2 border-secondary-900 rounded-full p-[3px] bg-primary-100" />
          <Typography variant="h1">Account Created Successfully!</Typography>
        </div>

        <Card shadow="primary" className="flex flex-col gap-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Check Your Email
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Typography variant="p" color="muted">
              We&#39;ve sent you a confirmation email. Please check your inbox and click the
              verification link to complete your registration.
            </Typography>

            <div>
              <Typography variant="p">
                <strong>What&#39;s next?</strong>
              </Typography>
              <ul className="mt-2 space-y-1">
                <li>1. Check your email for the verification link</li>
                <li>2. Click the link to confirm your account</li>
                <li>3. You&#39;ll be redirected to the login page</li>
                <li>4. Sign in and access your store dashboard</li>
              </ul>
            </div>

            <Typography>
              Didn&#39;t receive the email? Check your spam folder or{' '}
              <a
                href="mailto:support@lifo.ai?subject=Email Verification Issue"
                className="text-primary hover:underline"
              >
                contact support
              </a>
              .
            </Typography>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function OnboardingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <Typography variant="p" color="muted">
              Loading...
            </Typography>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
