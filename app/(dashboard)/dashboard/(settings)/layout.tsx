import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { HydrationBoundary } from '@tanstack/react-query'
import SettingsHeaderDisplay from '@/components/settings/settings-header-display'
import SettingsTabs from '@/components/settings/settings-tabs'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { dehydratedState } = await createPrefetchedQuery()

  return (
    <HydrationBoundary state={dehydratedState}>
      <div className="space-y-6 lg:min-w-5xl lg:mx-auto">
        <SettingsHeaderDisplay />
        <SettingsTabs />
        {children}
      </div>
    </HydrationBoundary>
  )
}
