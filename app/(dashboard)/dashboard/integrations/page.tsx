/**
 * Integrations Hub Page
 * Displays available third-party integrations and their connection status
 */

'use client'

import { useRouter } from 'next/navigation'

import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { SquareConnectionCard } from '@/components/integrations/square-connection-card'
import { useSquareStatus } from '@/hooks/use-square-integration'

export default function IntegrationsPage() {
  const router = useRouter()

  // Fetch Square connection status
  const { data: squareStatus, isLoading: isLoadingSquare } = useSquareStatus()

  const handleSquareConnect = () => {
    router.push('/dashboard/integrations/square/connect')
  }

  return (
    <div className="flex flex-col gap-6 container py-6 lg:py-8">
      <DashboardInsetHeader page="integrations" />

      <div className="flex flex-col gap-4">
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
  )
}
