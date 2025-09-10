'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'

export interface AuthInfoType {
  hasSession: boolean
  hasUser: boolean
  userId: string | null
  email: string | null
  sessionError: string | null
  userError: string | null
  queryResult: { data: number | null; error: string | null } | null
  rawSession: unknown
}

export function AuthStatus() {
  const [authInfo, setAuthInfo] = useState<AuthInfoType | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      // Test a simple query to see if RLS works
      let queryResult = null
      try {
        const { data, error } = await supabase
          .schema('inventory')
          .from('products')
          .select('product_id')
          .limit(1)
        queryResult = { data: data?.length || 0, error: error?.message || null }
      } catch {
        queryResult = { data: null, error: 'Query failed' }
      }

      setAuthInfo({
        hasSession: !!session,
        hasUser: !!user,
        userId: user?.id || null,
        email: user?.email || null,
        sessionError: sessionError?.message || null,
        userError: userError?.message || null,
        queryResult,
        rawSession: session,
      })
    }

    checkAuth()
  }, [])

  if (!authInfo) return <div>Loading auth status...</div>

  return (
    <Card className="mb-4 border-blue-200">
      <CardHeader>
        <CardTitle className="text-blue-600">🔍 Auth Debug Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div>
          <strong>Has Session:</strong> {authInfo.hasSession ? '✅ Yes' : '❌ No'}
        </div>
        <div>
          <strong>Has User:</strong> {authInfo.hasUser ? '✅ Yes' : '❌ No'}
        </div>
        {authInfo.userId && (
          <div>
            <strong>User ID:</strong>{' '}
            <code className="bg-gray-100 px-1 rounded">{authInfo.userId}</code>
          </div>
        )}
        {authInfo.email && (
          <div>
            <strong>Email:</strong> {authInfo.email}
          </div>
        )}
        <div>
          <strong>Can Query Products:</strong>{' '}
          {authInfo.queryResult?.error
            ? `❌ ${authInfo.queryResult.error}`
            : `✅ Found ${authInfo.queryResult?.data} products`}
        </div>
        {(authInfo.sessionError || authInfo.userError) && (
          <div className="text-red-600">
            <strong>Errors:</strong>
            <div>{authInfo.sessionError}</div>
            <div>{authInfo.userError}</div>
          </div>
        )}
        <details className="mt-4">
          <summary className="cursor-pointer font-medium">Raw Session Data</summary>
          <pre className="mt-2 p-2 bg-gray-50 rounded-2xl text-xs overflow-auto">
            {JSON.stringify(authInfo.rawSession, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  )
}
