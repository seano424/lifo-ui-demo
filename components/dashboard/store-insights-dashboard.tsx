'use client'

import { AlertTriangle, ArrowRightFromLine, Loader2, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { useStoreInsights } from '@/hooks/use-store-insights'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { ActionableBatchesEnhanced } from './actionable-batches-enhanced'

interface StoreInsightsDashboardProps {
  storeId?: string
}

export function StoreInsightsDashboard({ storeId: propStoreId }: StoreInsightsDashboardProps) {
  const activeStoreId = useActiveStoreId()
  const storeId = propStoreId || activeStoreId || ''

  const [showDetailedView, setShowDetailedView] = useState(false)

  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
  } = useStoreInsights(storeId)

  if (!storeId) {
    return null
  }

  if (insightsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading store insights...</span>
        </CardContent>
      </Card>
    )
  }

  if (insightsError || !insights) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Store Insights Dashboard</CardTitle>
          <CardDescription>Unable to load insights</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load store insights: {insightsError?.message || 'Unknown error'}
              <br />
              <small className="text-muted-foreground mt-2 block">Store ID: {storeId}</small>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Handle both old and new data structures
  const data = insights?.insights || insights

  // Add safety checks for data structure
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Store Insights Dashboard</CardTitle>
          <CardDescription>No insights data available</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>No insights data found for store: {storeId}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  // Extract data with fallbacks for different structures
  const expiring_soon = data.expiring_soon || { count: data.expiring_soon || 0 }
  const ready_for_discount = data.ready_for_discount || { count: 0 }
  const perfect_for_donation = data.perfect_for_donation || { count: 0 }
  const high_urgency = data.high_urgency || { count: 0 }
  const summary = data.summary || {
    total_active_batches: (data as { active_batches?: number }).active_batches || 0,
    total_actionable_items: 0,
    action_required_percentage: 0,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-4 text-center sm:text-left">
        <div className="flex flex-col gap-2">
          <Typography variant="h4" className="font-bold">
            Today&apos;s priority actions
          </Typography>
          <Typography variant="p" className="text-muted-foreground dark:text-secondary-50">
            Review and take action on the most urgent items.
          </Typography>
        </div>

        <Button className="flex dark:hidden" asChild>
          <Link href="/dashboard/actionable-batches">
            Take Action <ArrowRightFromLine className="w-4 h-4" />
          </Link>
        </Button>
        <Button className="hidden dark:flex" variant="black" asChild>
          <Link href="/dashboard/actionable-batches">
            Take Action <ArrowRightFromLine className="w-4 h-4" />
          </Link>
        </Button>
      </div>
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 text-center sm:text-left">
          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">Expiring Soon</Typography>
            <Typography variant="p">Expiring in 1-2 days</Typography>
            <Typography variant="p">{expiring_soon.count}</Typography>
          </div>

          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">Ready for Discount</Typography>
            <Typography variant="p">Suggested for discount</Typography>
            <Typography variant="p">{ready_for_discount.count}</Typography>
          </div>

          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">Perfect for Donation</Typography>
            <Typography variant="p">Suggested for donation</Typography>
            <Typography variant="p">{perfect_for_donation.count}</Typography>
          </div>

          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">High Urgency</Typography>
            <Typography variant="p">Needs attention</Typography>
            <Typography variant="p">{high_urgency.count}</Typography>
          </div>
        </div>

        {true && (
          <Card>
            <CardHeader>
              <CardTitle className="flex text-center sm:text-left justify-center sm:justify-start items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Store Overview
              </CardTitle>
              <CardDescription className="text-center sm:text-left">
                {summary.total_actionable_items} actionable items of {summary.total_active_batches}{' '}
                active batches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-center sm:text-left">
                {(expiring_soon.count > 0 ||
                  ready_for_discount.count > 0 ||
                  perfect_for_donation.count > 0) && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Action Required:</strong> You have{' '}
                      {expiring_soon.count + ready_for_discount.count + perfect_for_donation.count}{' '}
                      batches that need immediate attention.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {summary.action_required_percentage.toFixed(1)}% of non-expired inventory needs
                    action
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetailedView(!showDetailedView)}
                  >
                    {showDetailedView ? 'Hide Details' : 'Show Details'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Actionable Batches */}
        {showDetailedView && <ActionableBatchesEnhanced storeId={storeId} />}
      </div>
    </div>
  )
}
