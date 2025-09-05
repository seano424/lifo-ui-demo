'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle, Loader2, Mail, RefreshCw } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  useDashboardInsights,
  useScoringAlerts,
  useScoringRecommendations,
  useStoreAnalytics,
} from '@/hooks/use-scoring-analytics'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { createClient } from '@/lib/supabase/client'

// FastAPI scoring endpoints testing
const FASTAPI_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

// Email template generator (copied from the API route)
function generateWelcomeEmailHTML(
  credentials: {
    username: string
    pin: string
    email: string
    full_name: string
  },
  storeName: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${storeName} - Your Login Credentials</title>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(9, 13, 26, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            <img src="https://jrgmetdsohowtxickqij.supabase.co/storage/v1/object/public/brand-assets/logo-white-bg.png" alt="LIFO.AI" style="height: 80px;">
                          
                            <h1 style="color: hsl(225 42% 8%); font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; font-family: 'Raleway', sans-serif;">
                                Welcome to LIFO!
                            </h1>
                            <p style="color: hsl(225 42% 8%); font-size: 18px; font-weight: 600; line-height: 24px; margin: 8px 0 0 0;">
                                Join your team, ${storeName}!
                            </p>
                            <p style="color: hsl(220 8% 46%); font-size: 14px; line-height: 20px; margin: 8px 0 0 0;">
                                Your employee account has been successfully created
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                                Hello <strong>${credentials.full_name}</strong>,
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                                Welcome to the team! Your LIFO account has been created and you can now access the inventory management system. 🚀
                            </p>
                            
                            <!-- Credentials Box -->
                            <div style="background: linear-gradient(135deg, hsl(252 100% 98%) 0%, hsl(227 100% 98%) 100%); border-radius: 8px; padding: 24px; margin: 0 0 24px 0;">
                                <p style="color: hsl(252 100% 30%); font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
                                    Your Login Credentials:
                                </p>
                                
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: hsl(252 100% 45%); font-weight: 500; width: 30%;">
                                            Username:
                                        </td>
                                        <td style="padding: 8px 0; color: hsl(225 42% 8%); font-family: monospace; font-weight: 600; font-size: 16px;">
                                            ${credentials.username}
                                        </td>
                                    </tr>
                                </table>
                                
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: hsl(252 100% 45%); font-weight: 500; width: 30%;">
                                            PIN Code:
                                        </td>
                                        <td style="padding: 8px 0; color: hsl(252 100% 57%); font-family: monospace; font-weight: 700; font-size: 20px; letter-spacing: 2px;">
                                            ${credentials.pin}
                                        </td>
                                    </tr>
                                </table>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 8px 0; color: hsl(252 100% 45%); font-weight: 500; width: 30%;">
                                            Email:
                                        </td>
                                        <td style="padding: 8px 0; color: hsl(225 42% 8%); font-family: monospace; font-weight: 600; font-size: 16px;">
                                            ${credentials.email}
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Instructions -->
                            <div style="background: linear-gradient(135deg, hsl(227 100% 98%) 0%, hsl(227 100% 95%) 100%); border-radius: 8px; padding: 24px; margin: 0 0 24px 0;">
                                <p style="color: hsl(227 100% 40%); font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                                    How to Log In:
                                </p>
                                <ol style="color: hsl(227 100% 35%); font-size: 14px; line-height: 20px; margin: 0; padding-left: 20px;">
                                    <li>Open the LIFO app on the store tablet</li>
                                    <li>Select the <strong>"Employee"</strong> tab</li>
                                    <li>Enter your username and PIN code</li>
                                    <li>Start scanning products and managing inventory</li>
                                </ol>
                            </div>
                            
                            <!-- Security Notice -->
                            <div style="background-color: hsl(252 100% 100%); border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                                <p style="color: hsl(227 100% 58%); font-size: 14px; line-height: 20px; margin: 0;">
                                    <strong>Important:</strong> Keep your credentials secure and don't share them with anyone. Your PIN code can be reset at any time by your manager.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background: linear-gradient(135deg, hsl(225 42% 8%) 0%, hsl(225 42% 12%) 100%); border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="color: hsl(220 8% 65%); font-size: 14px; margin: 0 0 8px 0;">
                                Need help? Contact your manager
                            </p>
                            <p style="color: hsl(220 8% 46%); font-size: 12px; margin: 0;">
                                © 2025 LIFO - Smart Food Surplus Management
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `
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
  const _t = useTranslations('playground')

  // FastAPI Testing State
  const [alertThreshold, setAlertThreshold] = useState(0.6)
  const [recommendationCategory, setRecommendationCategory] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const activeStoreId = useActiveStoreId()

  // Email Preview State
  const [emailPreview, setEmailPreview] = useState({
    full_name: 'John Smith',
    username: 'j.smith',
    pin: '1234',
    email: 'john.smith@example.com',
    storeName: 'Demo Store',
  })

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

      {/* Email Template Preview */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Welcome Email Template Preview
        </h2>

        <div className="grid gap-6">
          {/* Email Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Email Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={emailPreview.full_name}
                  onChange={e =>
                    setEmailPreview(prev => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={emailPreview.username}
                  onChange={e =>
                    setEmailPreview(prev => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="pin">PIN Code</Label>
                <Input
                  id="pin"
                  value={emailPreview.pin}
                  onChange={e =>
                    setEmailPreview(prev => ({
                      ...prev,
                      pin: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={emailPreview.email}
                  onChange={e =>
                    setEmailPreview(prev => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  value={emailPreview.storeName}
                  onChange={e =>
                    setEmailPreview(prev => ({
                      ...prev,
                      storeName: e.target.value,
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Email Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  srcDoc={generateWelcomeEmailHTML(
                    {
                      username: emailPreview.username,
                      pin: emailPreview.pin,
                      email: emailPreview.email,
                      full_name: emailPreview.full_name,
                    },
                    emailPreview.storeName,
                  )}
                  className="w-full h-96 border-0"
                  title="Email Preview"
                />
              </div>
              <div className="mt-4 space-y-2">
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                    View HTML Source
                  </summary>
                  <Textarea
                    value={generateWelcomeEmailHTML(
                      {
                        username: emailPreview.username,
                        pin: emailPreview.pin,
                        email: emailPreview.email,
                        full_name: emailPreview.full_name,
                      },
                      emailPreview.storeName,
                    )}
                    readOnly
                    className="mt-2 font-mono text-xs h-32"
                  />
                </details>
              </div>
            </CardContent>
          </Card>
        </div>
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
