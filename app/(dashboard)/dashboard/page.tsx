'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { useSetupProgress } from '@/lib/hooks/use-setup-progress'

export default function DashboardPage() {
  const router = useRouter()
  const { hasSquareConnection, isLoading } = useSetupProgress()

  useEffect(() => {
    if (!isLoading && !hasSquareConnection) {
      router.replace('/onboarding/setup')
    }
  }, [isLoading, hasSquareConnection, router])

  if (isLoading || !hasSquareConnection) return null

  return (
    <div className="container py-6 lg:py-8">
      <DashboardContent />
    </div>
  )
}
