'use client'

import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

export default function DevTokenPage() {
  const t = useTranslations('common.devToken')
  const [token, setToken] = useState<string>(t('loading'))
  const [copied, setCopied] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')

  // All hooks must be called before any conditional returns
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
        setToken(t('notLoggedIn'))
      }
    }
    getToken()
  }, [t])

  const copyToken = () => {
    if (token && token !== t('loading') && !token.startsWith(t('notLoggedIn').split(' ')[0])) {
      navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isValidToken =
    token && token !== t('loading') && !token.startsWith(t('notLoggedIn').split(' ')[0])

  // Block access in production or if dev tools are not explicitly enabled
  // This prevents accidental exposure of tokens in production even if NODE_ENV is misconfigured
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS !== 'true'
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md p-8 bg-white rounded-lg shadow">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{t('accessDenied')}</h1>
          <p className="text-gray-700 mb-4">{t('accessDeniedMessage')}</p>
          <a
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg  transition inline-block"
          >
            {t('goToHome')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🔑 {t('title')}</h1>

        {userEmail && (
          <div className="mb-4 text-sm text-gray-600">
            {t('loggedInAs')} <span className="font-semibold">{userEmail}</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <label className="block text-sm  text-gray-700 mb-2">{t('yourJwtToken')}</label>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs break-all overflow-auto max-h-96">
            {token}
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            type="button"
            onClick={copyToken}
            disabled={!isValidToken}
            className={`px-6 py-3 rounded-lg  transition ${
              isValidToken
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {copied ? `✓ ${t('copied')}` : t('copyToClipboard')}
          </button>

          <a
            href="/"
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg  transition inline-block"
          >
            {t('backToHome')}
          </a>

          {!isValidToken && (
            <a
              href="/login"
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg  transition inline-block"
            >
              {t('goToLogin')}
            </a>
          )}
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="font-semibold mb-2 text-blue-900">📝 {t('usageInstructions')}</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
            <li>{t('instruction1')}</li>
            <li>{t('instruction2')}</li>
            <li>
              {t('instruction3')}{' '}
              <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                Bearer [paste-token-here]
              </code>
            </li>
            <li>{t('instruction4')}</li>
          </ol>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h2 className="font-semibold mb-2 text-yellow-900">⚠️ {t('securityNote')}</h2>
          <p className="text-sm text-gray-700">{t('securityMessage')}</p>
        </div>

        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <h2 className="font-semibold mb-2 text-purple-900">🔧 {t('apiEndpointsToTest')}</h2>
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
