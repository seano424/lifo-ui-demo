// app/(onboarding)/onboarding/success/page.tsx

import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { CheckCircle, Mail, ArrowRight } from 'lucide-react'
import Link from 'next/link'

function SuccessContent() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Success Icon */}
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <Typography variant="h1">Account Created Successfully!</Typography>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Check Your Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Typography variant="p" color="muted">
              We&#39;ve sent you a confirmation email. Please check your inbox and click the
              verification link to activate your account.
            </Typography>

            <div className="bg-muted/50 p-4 rounded-lg">
              <Typography variant="p" className="text-sm">
                <strong>What&#39;s next?</strong>
              </Typography>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>1. Check your email for verification link</li>
                <li>2. Click the link to verify your account</li>
                <li>3. Access your store dashboard</li>
                <li>4. Start tracking your inventory</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Link href="/dashboard" className="block">
                <Button className="w-full">
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>

              <Link href="/auth/signin" className="block">
                <Button variant="outline" className="w-full">
                  Sign In Later
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Support Information */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <Typography variant="p" color="muted" className="text-center text-sm">
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
