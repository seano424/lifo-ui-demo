/**
 * Integrations Hub Page
 * Displays available third-party integrations and their connection status
 */

'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { SquareConnectionCard } from '@/components/integrations/square-connection-card'
import { useSquareStatus } from '@/hooks/use-square-integration'

export default function IntegrationsPage() {
  const router = useRouter()
  const t = useTranslations('integrations')

  // Fetch Square connection status
  const { data: squareStatus, isLoading: isLoadingSquare } = useSquareStatus()

  const handleSquareConnect = () => {
    router.push('/dashboard/integrations/square/connect')
  }

  return (
    <div className="space-y-6 container md:py-6 lg:py-8">
      <DashboardInsetHeader page="integrations" />

      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t('title')}</h2>
          <p className="text-gray-600">{t('description')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Square POS Integration */}
          <SquareConnectionCard
            status={squareStatus}
            isLoading={isLoadingSquare}
            onConnect={handleSquareConnect}
          />

          {/* Future integrations will be added here */}
          {/* e.g., Shopify, WooCommerce, Toast POS, etc. */}
        </div>
      </div>
    </div>
  )
}
