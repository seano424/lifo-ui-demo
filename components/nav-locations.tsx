'use client'

import { SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { Typography } from '@/components/ui/typography'
import { useStoreActions, useUserStores } from '@/hooks/use-stores'
import { useStoreState } from '@/lib/stores/store-context'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'

// Derive up to 2 initials from a store name
function getStoreInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// Deterministic color index from a string
function getColorIndex(str: string, total: number): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % total
}

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-emerald-500',
  'bg-blue-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-cyan-500',
] as const

export function NavLocations() {
  const t = useTranslations('navigation')
  const { userStores, isLoading } = useUserStores()
  const { switchStore, isChangingStore } = useStoreActions()
  const { activeStore } = useStoreState()

  return (
    <SidebarGroup className="md:hidden">
      <SidebarGroupLabel className="mb-1 px-4">
        <Typography
          variant="extraSmall"
          color="muted"
          className="uppercase text-slate-400/90 font-mono"
        >
          {t('locations')}
        </Typography>
      </SidebarGroupLabel>

      <div className="flex flex-col gap-1 max-h-[210px] overflow-y-auto border-b border-border">
        {isLoading ? (
          <>
            <Skeleton className="h-10 w-full bg-muted" />
            <Skeleton className="h-10 w-full bg-muted" />
          </>
        ) : (
          userStores.map(({ store }) => {
            const isActive = activeStore?.store_id === store.store_id
            const initials = getStoreInitials(store.store_name)
            const colorClass = AVATAR_COLORS[getColorIndex(store.store_id, AVATAR_COLORS.length)]

            return (
              <button
                key={store.store_id}
                type="button"
                onClick={() => {
                  if (!isActive) switchStore(store)
                }}
                disabled={isChangingStore || isActive}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-2 transition-colors text-left',
                  isActive
                    ? 'bg-muted-foreground/5 cursor-default'
                    : 'hover:bg-muted-foreground/5 cursor-pointer',
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg text-white text-xs font-semibold shrink-0 border border-transparent outline-2 outline-transparent',
                    isActive && 'outline-primary-900 border-white',
                    colorClass,
                  )}
                >
                  {initials}
                </div>

                <Typography
                  variant="small"
                  color={isActive ? 'primary' : 'muted'}
                  className={cn(isActive && 'font-medium', 'line-clamp-1 pr-2')}
                >
                  {store.store_name}
                </Typography>
              </button>
            )
          })
        )}
      </div>
    </SidebarGroup>
  )
}
