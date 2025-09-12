'use client'

import { ArrowRight, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'

interface OnboardingSuccessProps {
  storeName: string
}

export function OnboardingSuccess({ storeName }: OnboardingSuccessProps) {
  const router = useRouter()

  const handleGoToSettings = () => {
    router.push('/dashboard/settings?tab=store')
  }

  const handleGoToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-4 flex flex-col items-center justify-center">
        <Check className="w-10 h-10 stroke-2 rounded-full p-2 bg-primary-900 text-white" />
        <Typography variant="h1">Welcome to LIFO!</Typography>
        <Typography variant="p" color="muted">
          Your store "{storeName}" has been set up successfully. You're ready to start managing your
          inventory and reducing waste!
        </Typography>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">What's Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div className="space-y-1 flex flex-col">
                <Typography variant="small" className="font-bold">
                  Complete Store Setup
                </Typography>
                <Typography variant="small" color="muted">
                  Configure your store settings, preferences, and operational hours
                </Typography>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div className="space-y-1 flex flex-col">
                <Typography variant="small" className="font-bold">
                  Add Your First Products
                </Typography>
                <Typography variant="small" color="muted">
                  Start building your inventory to track expiration dates and reduce waste
                </Typography>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div className="space-y-1 flex flex-col">
                <Typography variant="small" className="font-bold">
                  Invite Your Team
                </Typography>
                <Typography variant="small" color="muted">
                  Add staff members to help manage your store's inventory
                </Typography>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={handleGoToDashboard} className="w-full">
              Go to Dashboard
            </Button>
            <Button onClick={handleGoToSettings} className="w-full">
              Complete Setup
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
