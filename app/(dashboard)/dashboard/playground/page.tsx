'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, CheckCircle, Loader2, RefreshCw } from 'lucide-react'
import { useActiveStoreId } from '@/lib/stores/store-context'

// FastAPI scoring endpoints testing
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

// Helper to get the correct token from Supabase session
function getSupabaseToken(): string | null {
  try {
    // Method 1: Check ALL auth-related localStorage keys (including studio auth)
    const authKeys = Object.keys(localStorage).filter(
      key => key.includes('auth') && key.includes('token'),
    )

    console.log('Found auth keys:', authKeys)

    for (const key of authKeys) {
      try {
        const sessionData = localStorage.getItem(key)
        if (sessionData) {
          console.log(`Checking key: ${key}`)
          console.log(`Raw data (first 100 chars):`, sessionData.substring(0, 100))
          const parsed = JSON.parse(sessionData)
          console.log('Parsed object structure:', Object.keys(parsed))
          console.log('Full parsed object:', parsed)

          // Handle different token structures
          if (parsed?.access_token) {
            console.log('Found access_token in parsed object')
            return parsed.access_token
          }

          // Check if it's a nested session object
          if (parsed?.session?.access_token) {
            console.log('Found access_token in session object')
            return parsed.session.access_token
          }

          // Check for studio token format (token field instead of access_token)
          if (parsed?.token && typeof parsed.token === 'string' && parsed.token.length > 50) {
            console.log('Found studio token in parsed object')
            return parsed.token
          }

          // Check all nested properties for various token field names
          const searchForToken = (obj: any, path = ''): string | null => {
            if (typeof obj !== 'object' || obj === null) return null

            for (const [key, value] of Object.entries(obj)) {
              const currentPath = path ? `${path}.${key}` : key

              // Look for various token field names
              if (
                (key === 'access_token' || key === 'token' || key === 'jwt') &&
                typeof value === 'string' &&
                value.length > 50
              ) {
                console.log(`Found ${key} at path: ${currentPath}`)
                return value as string
              }

              if (typeof value === 'object' && value !== null) {
                const found = searchForToken(value, currentPath)
                if (found) return found
              }
            }
            return null
          }

          const foundToken = searchForToken(parsed)
          if (foundToken) return foundToken

          // Check if the whole thing is a token string
          if (typeof parsed === 'string' && parsed.length > 100) {
            console.log('Found token as direct string')
            return parsed
          }
        }
      } catch (e) {
        console.log(`Failed to parse ${key}:`, e)
        // Continue to next key
      }
    }

    // Method 2: Check Supabase-specific patterns
    const supabaseKeys = Object.keys(localStorage).filter(
      key => key.startsWith('sb-') || key.includes('supabase'),
    )

    console.log('Found Supabase keys:', supabaseKeys)

    for (const key of supabaseKeys) {
      try {
        const value = localStorage.getItem(key)
        if (value) {
          const parsed = JSON.parse(value)
          if (parsed?.access_token) return parsed.access_token
          if (parsed?.session?.access_token) return parsed.session.access_token
        }
      } catch {
        // Continue
      }
    }

    return null
  } catch (e) {
    console.error('Error getting Supabase token:', e)
    return null
  }
}

async function fetchWithAuth(url: string) {
  try {
    const token = getSupabaseToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      console.log('Using token (first 20 chars):', token.substring(0, 20) + '...')
    } else {
      console.warn('No authentication token found in localStorage')
      // Log all localStorage keys for debugging
      console.log(
        'Available localStorage keys:',
        Object.keys(localStorage).filter(
          k => k.includes('auth') || k.includes('token') || k.startsWith('sb-'),
        ),
      )
    }

    const response = await fetch(url, { headers })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${response.statusText}\n${errorText}`)
    }

    return response.json()
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
}

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

function useScoringAlerts(storeId: string | null, threshold: number = 0.6) {
  return useQuery({
    queryKey: ['scoring-alerts', storeId, threshold],
    queryFn: () =>
      fetchWithAuth(
        `${FASTAPI_BASE_URL}/api/v1/scoring/alerts/${storeId}?threshold=${threshold}&limit=50`,
      ),
    enabled: !!storeId,
    retry: 1,
  })
}

function useScoringRecommendations(storeId: string | null, category?: string) {
  return useQuery({
    queryKey: ['scoring-recommendations', storeId, category],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '20' })
      if (category) params.append('category', category)
      return fetchWithAuth(
        `${FASTAPI_BASE_URL}/api/v1/scoring/recommendations/${storeId}?${params}`,
      )
    },
    enabled: !!storeId,
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
  data: any
  isLoading: boolean
  error: any
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

        {data && !error && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Success</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(data, null, 2)}</pre>
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
  const activeStoreId = useActiveStoreId()

  // FastAPI Queries
  const healthQuery = useHealthCheck()
  const dbHealthQuery = useDatabaseHealthCheck()
  const alertsQuery = useScoringAlerts(activeStoreId, alertThreshold)
  const recommendationsQuery = useScoringRecommendations(
    activeStoreId,
    recommendationCategory || undefined,
  )

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Development Playground</h1>
        <p className="text-muted-foreground">
          Test components and API endpoints. Current store: {activeStoreId || 'None selected'}
        </p>
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
