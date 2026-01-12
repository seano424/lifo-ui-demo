'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function DevTokenPage() {
  const [token, setToken] = useState<string>('Loading...')
  const [copied, setCopied] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const getToken = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.access_token) {
        setToken(session.access_token)
        setUserEmail(session.user?.email || 'Unknown user')
      } else {
        setToken('Not logged in - please login first')
      }
    }
    getToken()
  }, [])

  const copyToken = () => {
    if (token && token !== 'Loading...' && !token.startsWith('Not logged in')) {
      navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isValidToken = token && token !== 'Loading...' && !token.startsWith('Not logged in')

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔑 Dev Token Helper</h1>

        {userEmail && (
          <div className="mb-4 text-sm text-gray-600">
            Logged in as: <span className="font-semibold">{userEmail}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Your JWT Token:</label>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs break-all overflow-auto max-h-96">
            {token}
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={copyToken}
            disabled={!isValidToken}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              isValidToken
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy to Clipboard'}
          </button>

          <a
            href="/"
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition inline-block"
          >
            Back to Home
          </a>

          {!isValidToken && (
            <a
              href="/login"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition inline-block"
            >
              Go to Login
            </a>
          )}
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="font-semibold mb-2 text-blue-900">📝 Usage Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>Make sure you're logged in to the app</li>
            <li>Click "Copy to Clipboard" button</li>
            <li>
              In Postman/API client, set Authorization header to:{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                Bearer [paste-token-here]
              </code>
            </li>
            <li>Token expires in ~1 hour - refresh this page to get a new one</li>
          </ol>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h2 className="font-semibold mb-2 text-yellow-900">⚠️ Security Note:</h2>
          <p className="text-sm text-gray-700">
            This page is for <strong>development only</strong>. Never expose JWT tokens in
            production. Tokens provide full access to your account.
          </p>
        </div>

        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h2 className="font-semibold mb-2 text-purple-900">🔧 API Endpoints to Test:</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 font-mono">
            <li>GET /api/v1/integrations/square/status</li>
            <li>POST /api/v1/integrations/square/connect</li>
            <li>GET /api/v1/integrations/square/connections?store_id=YOUR_STORE_ID</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
