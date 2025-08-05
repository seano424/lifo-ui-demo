'use client'

import { usePathname } from 'next/navigation'
import { useStoreState } from '@/lib/stores/store-context'
import { Typography } from '@/components/ui/typography'
import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsHeaderDisplay() {
  const { activeStore, isLoadingStores, isChangingStore } = useStoreState()
  const pathname = usePathname()

  if (pathname.includes('/add-store')) {
    return null
  }

  if (isLoadingStores || isChangingStore) {
    return <Skeleton className="w-[400px] h-12 bg-gray-50 rounded-full" />
  }

  return (
    <Typography variant="h2" className="font-black text-center text-primary-500">
      Settings
    </Typography>
  )
}
