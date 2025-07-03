import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <Typography variant="h1">Thank you for signing up!</Typography>
              </CardTitle>
              <CardDescription>
                <Typography variant="p" color="muted">
                  Check your email to confirm
                </Typography>
              </CardDescription>
            </CardHeader>
            <CardContent>
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
