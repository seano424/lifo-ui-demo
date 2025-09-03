import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card shadow="primary">
            <CardHeader className="text-center">
              <CardTitle className="mb-4">
                <Typography variant="h1">Thank you for signing up!</Typography>
              </CardTitle>
              <CardDescription>
                <Typography variant="p" color="muted" className="text-center">
                  Check your email to confirm
                </Typography>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Typography variant="p" color="muted">
                You&apos;ve successfully signed up. Please check your email to confirm your account
                before signing in.
              </Typography>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
