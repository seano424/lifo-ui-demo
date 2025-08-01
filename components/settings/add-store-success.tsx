'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { CheckCircle, ArrowRight } from 'lucide-react'

interface AddStoreSuccessProps {
  storeName: string
}

export function AddStoreSuccess({ storeName }: AddStoreSuccessProps) {
  const router = useRouter()

  const handleGoToSettings = () => {
    router.push('/settings/store')
  }

  const handleGoToDashboard = () => {
    router.push('/')
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <Typography variant="h1">Store Created Successfully!</Typography>
        <Typography variant="p" color="muted">
          Your store &quot;{storeName}&quot; has been created and is ready to use.
        </Typography>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">What&apos;s Next?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">1</span>
              </div>
              <div>
                <Typography variant="small" className="font-medium">
                  Complete Store Setup
                </Typography>
                <Typography variant="small" color="muted">
                  Add additional details, upload your logo, and configure settings
                </Typography>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">2</span>
              </div>
              <div>
                <Typography variant="small" className="font-medium">
                  Start Managing Inventory
                </Typography>
                <Typography variant="small" color="muted">
                  Add products, set up pricing, and begin tracking your inventory
                </Typography>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-primary">3</span>
              </div>
              <div>
                <Typography variant="small" className="font-medium">
                  Invite Team Members
                </Typography>
                <Typography variant="small" color="muted">
                  Add employees and managers to help run your store
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