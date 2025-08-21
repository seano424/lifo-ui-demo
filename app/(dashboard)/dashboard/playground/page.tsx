'use client'

import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { createClient } from '@/lib/supabase/client'
import {
  useScoringAlerts,
  useScoringRecommendations,
  useStoreAnalytics,
  useDashboardInsights,
} from '@/hooks/use-fastapi-scoring'

// FastAPI scoring endpoints testing
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

async function fetchHealthCheck() {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/health`)
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`)
    }
    return response.json()
  } catch (error) {
    console.error('Health check error:', error)
    throw error
  }
}

async function fetchDatabaseHealth() {
  try {
    const response = await fetch(`${FASTAPI_BASE_URL}/api/v1/health/health/database`)
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`)
    }
    return response.json()
  } catch (error) {
    console.error('Database health check error:', error)
    throw error
  }
}

function useHealthCheck() {
  return useQuery({
    queryKey: ['health-check'],
    queryFn: fetchHealthCheck,
    retry: 1,
  })
}

function useDatabaseHealthCheck() {
  return useQuery({
    queryKey: ['database-health-check'],
    queryFn: fetchDatabaseHealth,
    retry: 1,
  })
}

function TestResults({
  title,
  data,
  isLoading,
  error,
  onRefetch,
}: {
  title: string
  data: unknown | null | undefined
  isLoading: boolean
  error: Error | null
  onRefetch: () => void
}) {
  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefetch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-red-900">Request Failed</p>
              <p className="text-red-700 mt-1">{error.message}</p>
            </div>
          </div>
        )}

        {data !== null && data !== undefined && !error && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Success</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <pre className="text-xs overflow-auto max-h-64">
                {JSON.stringify(data as Record<string, unknown>, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function PlaygroundPage() {
  // FastAPI Testing State
  const [alertThreshold, setAlertThreshold] = useState(0.6)
  const [recommendationCategory, setRecommendationCategory] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const activeStoreId = useActiveStoreId()

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)

      if (!session) {
        console.warn('No active session - API calls requiring authentication will fail')
      }
    }
    checkAuth()
  }, [])

  // FastAPI Health Checks (direct calls)
  const healthQuery = useHealthCheck()
  const dbHealthQuery = useDatabaseHealthCheck()

  // Integrated Scoring System (using existing backend with scoring)
  const alertsQuery = useScoringAlerts(activeStoreId, alertThreshold)
  const recommendationsQuery = useScoringRecommendations(
    activeStoreId,
    recommendationCategory || undefined,
  )
  const analyticsQuery = useStoreAnalytics(activeStoreId, '7d')
  const dashboardQuery = useDashboardInsights(activeStoreId)

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Development Playground</h1>
        <p className="text-muted-foreground">
          Test components and API endpoints. Current store: {activeStoreId || 'None selected'}
        </p>
        {!isAuthenticated && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Not authenticated - API calls requiring auth will fail
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FastAPI Scoring Endpoints Testing */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4">FastAPI Scoring Endpoints Test</h2>

        {/* Health Checks First */}
        <div className="grid gap-4 lg:grid-cols-2 mb-6">
          <TestResults
            title="FastAPI General Health"
            data={healthQuery.data}
            isLoading={healthQuery.isLoading}
            error={healthQuery.error}
            onRefetch={healthQuery.refetch}
          />
          <TestResults
            title="Database Connection Test"
            data={dbHealthQuery.data}
            isLoading={dbHealthQuery.isLoading}
            error={dbHealthQuery.error}
            onRefetch={dbHealthQuery.refetch}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="threshold">Alert Threshold</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={alertThreshold}
                  onChange={e => setAlertThreshold(parseFloat(e.target.value))}
                  className="mt-1"
                />
              </div>
              <Button onClick={() => alertsQuery.refetch()}>Test Alerts</Button>
            </div>
            <TestResults
              title="Scoring Alerts API"
              data={alertsQuery.data}
              isLoading={alertsQuery.isLoading}
              error={alertsQuery.error}
              onRefetch={alertsQuery.refetch}
            />
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label htmlFor="category">Category Filter</Label>
                <select
                  id="category"
                  value={recommendationCategory}
                  onChange={e => setRecommendationCategory(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-md"
                >
                  <option value="">All Categories</option>
                  <option value="fresh_produce">Fresh Produce</option>
                  <option value="dairy">Dairy</option>
                  <option value="bakery_fresh">Bakery Fresh</option>
                  <option value="fresh_meat_fish">Fresh Meat & Fish</option>
                  <option value="frozen">Frozen</option>
                  <option value="beverages">Beverages</option>
                  <option value="dry_goods">Dry Goods</option>
                  <option value="canned_jarred">Canned & Jarred</option>
                </select>
              </div>
              <Button onClick={() => recommendationsQuery.refetch()}>Test Recommendations</Button>
            </div>
            <TestResults
              title="AI Recommendations API"
              data={recommendationsQuery.data}
              isLoading={recommendationsQuery.isLoading}
              error={recommendationsQuery.error}
              onRefetch={recommendationsQuery.refetch}
            />
          </div>
        </div>

        {/* Integrated Scoring System Tests */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold mb-4">Integrated Scoring System Tests</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <TestResults
              title="Alerts (via /api/alerts)"
              data={alertsQuery.data}
              isLoading={alertsQuery.isLoading}
              error={alertsQuery.error}
              onRefetch={alertsQuery.refetch}
            />
            <TestResults
              title="Recommendations (low threshold alerts)"
              data={recommendationsQuery.data}
              isLoading={recommendationsQuery.isLoading}
              error={recommendationsQuery.error}
              onRefetch={recommendationsQuery.refetch}
            />
            <TestResults
              title="Store Analytics (via /api/analytics)"
              data={analyticsQuery.data}
              isLoading={analyticsQuery.isLoading}
              error={analyticsQuery.error}
              onRefetch={analyticsQuery.refetch}
            />
            <TestResults
              title="Dashboard Insights (overview analytics)"
              data={dashboardQuery.data}
              isLoading={dashboardQuery.isLoading}
              error={dashboardQuery.error}
              onRefetch={dashboardQuery.refetch}
            />
          </div>
        </div>

        {/* API Status Summary */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>API Status Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">General Health:</p>
                <Badge
                  variant={
                    healthQuery.error ? 'destructive' : healthQuery.data ? 'default' : 'secondary'
                  }
                >
                  {healthQuery.error ? 'Failed' : healthQuery.data ? 'Working' : 'Untested'}
                </Badge>
              </div>
              <div>
                <p className="font-medium">Database:</p>
                <Badge
                  variant={
                    dbHealthQuery.error
                      ? 'destructive'
                      : dbHealthQuery.data
                        ? 'default'
                        : 'secondary'
                  }
                >
                  {dbHealthQuery.error ? 'Failed' : dbHealthQuery.data ? 'Connected' : 'Untested'}
                </Badge>
              </div>
              <div>
                <p className="font-medium">Alerts Endpoint:</p>
                <Badge
                  variant={
                    alertsQuery.error ? 'destructive' : alertsQuery.data ? 'default' : 'secondary'
                  }
                >
                  {alertsQuery.error ? 'Failed' : alertsQuery.data ? 'Working' : 'Untested'}
                </Badge>
              </div>
              <div>
                <p className="font-medium">Recommendations:</p>
                <Badge
                  variant={
                    recommendationsQuery.error
                      ? 'destructive'
                      : recommendationsQuery.data
                        ? 'default'
                        : 'secondary'
                  }
                >
                  {recommendationsQuery.error
                    ? 'Failed'
                    : recommendationsQuery.data
                      ? 'Working'
                      : 'Untested'}
                </Badge>
              </div>
              <div>
                <p className="font-medium">FastAPI URL:</p>
                <p className="font-mono text-xs">{FASTAPI_BASE_URL}</p>
              </div>
              <div>
                <p className="font-medium">Active Store:</p>
                <p className="font-mono text-xs">{activeStoreId || 'Not selected'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
