'use client'

import { AlertTriangle, ArrowRightFromLine, Loader2, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Loader2, AlertTriangle, ArrowRightFromLine, TrendingUp } from 'lucide-react'

import { useActiveStoreId } from '@/lib/stores/store-context'
import { useDashboardInsights } from '@/hooks/use-fastapi-scoring'

import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
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
  } = useDashboardInsights(storeId)

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

  // Transform analytics data to match component interface
  const overview = insights?.analytics?.overview || {}
  const urgentBatches = overview.urgent_items || 0
  const totalActions = overview.actions_taken || 0
  const discountValue = overview.total_discount_value || 0
  const avgScore = overview.avg_composite_score || 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-col sm:flex-row gap-4 text-center sm:text-left">
        <div className="flex flex-col gap-2">
          <Typography variant="h4" className="font-bold">
            Today&apos;s priority actions
          </Typography>
          <Typography variant="p" className="text-muted-foreground">
            Review and take action on the most urgent items from AI scoring.
          </Typography>
        </div>

        <Button asChild>
          <Link href="/dashboard/actionable-batches">
            Take Action <ArrowRightFromLine className="w-4 h-4" />
          </Link>
        </Button>
      </div>
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5 text-center sm:text-left">
          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">Urgent Items</Typography>
            <Typography variant="p">High urgency batches</Typography>
            <Typography variant="p">{urgentBatches}</Typography>
          </div>

          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">Actions Taken</Typography>
            <Typography variant="p">Total actions this period</Typography>
            <Typography variant="p">{totalActions}</Typography>
          </div>

          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">Discount Value</Typography>
            <Typography variant="p">Total discounts applied</Typography>
            <Typography variant="p">€{discountValue.toFixed(0)}</Typography>
          </div>

          <div className="flex flex-col gap-2 border rounded-2xl p-4">
            <Typography variant="h4">Avg Score</Typography>
            <Typography variant="p">Average urgency score</Typography>
            <Typography variant="p">{(avgScore * 100).toFixed(1)}%</Typography>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex text-center sm:text-left justify-center sm:justify-start items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Store Overview & Analytics
            </CardTitle>
            <CardDescription className="text-center sm:text-left">
              {totalActions} actions taken • {urgentBatches} urgent items tracked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-center sm:text-left">
              {urgentBatches > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Scoring Alert:</strong> {urgentBatches} urgent batches need immediate
                    attention to prevent losses.
                  </AlertDescription>
                </Alert>
              )}

              {/* Analytics Summary */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Recent Activity</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="font-medium">Actions Taken</p>
                    <p className="text-blue-600">{totalActions} this period</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded">
                    <p className="font-medium">Discounts Applied</p>
                    <p className="text-green-600">€{discountValue.toFixed(0)} saved</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  Average Score: {(avgScore * 100).toFixed(1)}% • €{discountValue.toFixed(0)}{' '}
                  discounts applied
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

        {/* Detailed Actionable Batches */}
        {showDetailedView && <ActionableBatchesEnhanced storeId={storeId} />}
      </div>
    </div>
  )
}
