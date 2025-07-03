import { Typography } from '@/components/ui/typography'

export default function OnboardingSuccessPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm text-center space-y-4">
        <Typography variant="h1">Check Your Email</Typography>
        <Typography variant="p" color="muted">
          We&apos;ve sent you a confirmation link. Click it to activate your account and access your
          dashboard.
        </Typography>
      </div>
    </div>
  )
}
