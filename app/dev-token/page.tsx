'use client'

import { Card } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
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
          <Typography variant="h1" color="destructive">
            {t('accessDenied')}
          </Typography>
          <Typography variant="p" color="muted">
            {t('accessDeniedMessage')}
          </Typography>
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
        <Typography variant="h1" color="primary">
          {t('title')}
        </Typography>
        {userEmail && (
          <Typography variant="p" color="muted">
            {t('loggedInAs')}{' '}
            <Typography variant="p" color="primary">
              {userEmail}
            </Typography>
          </Typography>
        )}
        <Card className="bg-white rounded-lg shadow p-6 mb-4">
          <Typography variant="p" color="muted">
            {t('yourJwtToken')}
          </Typography>
          <Typography variant="code" color="primary">
            {token}
          </Typography>
        </Card>

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
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg  transition inline-block"
            >
              {t('goToLogin')}
            </a>
          )}
        </div>

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Typography variant="h2" color="primary">
            📝 {t('usageInstructions')}
          </Typography>
          <Typography variant="p" color="muted">
            {t('instruction1')}
          </Typography>
          <Typography variant="p" color="muted">
            {t('instruction2')}
          </Typography>
          <Typography variant="p" color="muted">
            {t('instruction3')}{' '}
            <Typography variant="code" color="primary">
              Bearer [paste-token-here]
            </Typography>
          </Typography>
          <Typography variant="p" color="muted">
            {t('instruction4')}
          </Typography>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <Typography variant="h2" color="primary">
            ⚠️ {t('securityNote')}
          </Typography>
          <Typography variant="p" color="muted">
            {t('securityMessage')}
          </Typography>
        </div>

        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <Typography variant="h2" color="primary">
            🔧 {t('apiEndpointsToTest')}
          </Typography>
          <Typography variant="code" color="primary">
            GET /api/v1/integrations/square/status
          </Typography>
          <Typography variant="code" color="primary">
            POST /api/v1/integrations/square/connect
          </Typography>
          <Typography variant="code" color="primary">
            GET /api/v1/integrations/square/connections?store_id=YOUR_STORE_ID
          </Typography>
        </div>
      </div>
    </div>
  )
}
