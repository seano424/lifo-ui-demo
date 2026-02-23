'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSetupProgress } from '@/lib/hooks/use-setup-progress'
import { useUserStores } from '@/hooks/use-stores'
import { AddStoreStep } from '@/components/dashboard/setting-up-flow/steps/add-store-step'
import { BatchTrackingStep } from '@/components/dashboard/setting-up-flow/steps/batch-tracking-step'
import { SquareConnectedStep } from '@/components/dashboard/setting-up-flow/steps/square-connected-step'

type Step = 'loading' | 'connect-square' | 'square-connected' | 'setup-automation' | 'complete'

export function SetupPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useUserStores()

  const progress = useSetupProgress()
  const justConnected = searchParams.get('square_connected') === 'true'
  const [showingSuccess, setShowingSuccess] = useState(justConnected)

  const step: Step = useMemo(() => {
    if (progress.isLoading) return 'loading'
    if (!progress.hasSquareConnection) return 'connect-square'
    if (showingSuccess) return 'square-connected'
    if (!progress.hasAutomation) return 'setup-automation'
    return 'complete'
  }, [progress, showingSuccess])

  useEffect(() => {
    if (step === 'complete') {
      router.replace('/dashboard')
    }
  }, [step, router])

  const handleSuccessContinue = () => {
    router.replace('/onboarding/setup')
    setShowingSuccess(false)
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-2xl">
        {(step === 'loading' || step === 'complete') && <SetupSkeleton />}
        {step === 'connect-square' && <AddStoreStep />}
        {step === 'square-connected' && <SquareConnectedStep onContinue={handleSuccessContinue} />}
        {step === 'setup-automation' && <BatchTrackingStep />}
      </div>
    </div>
  )
}

function SetupSkeleton() {
  return (
    <div className="flex flex-col items-center gap-10 ob-animate-in">
      <div className="flex flex-col items-center gap-5 w-full">
        <div className="h-10 w-72 rounded-lg bg-muted animate-pulse" />
        <div className="h-5 w-96 rounded-md bg-muted animate-pulse" />
      </div>
      <div className="w-full max-w-[480px] h-24 rounded-2xl bg-muted animate-pulse" />
    </div>
  )
}
