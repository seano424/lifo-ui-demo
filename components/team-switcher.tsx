'use client'

// import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  // useSidebar,
} from '@/components/ui/sidebar'
import { useStoreActions, useUserStores } from '@/hooks/use-stores'
import type { Store } from '@/lib/queries/stores'
import { useStoreState } from '@/lib/stores/store-context'
import { cn } from '@/lib/utils'
import { Settings, Store as StoreIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

interface TeamSwitcherProps {
  compact?: boolean
}

export function TeamSwitcher({ compact = false }: TeamSwitcherProps) {
  // const { isMobile } = useSidebar()
  const { userStores, isLoading } = useUserStores()
  const { switchStore, isChangingStore } = useStoreActions()
  const { activeStore } = useStoreState()
  const t = useTranslations('teamSwitcher')
  // const tRoles = useTranslations('users.roles')

  const handleStoreSwitch = (store: Store, makePrimary: boolean = false) => {
    if (store.store_id !== activeStore?.store_id) {
      switchStore(store, makePrimary)
    }
  }

  if (isLoading) {
    return (
      <div className="flex gap-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              disabled
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex items-center gap-4 px-4 rounded-2xl border group-data-[state=collapsed]:border-none"
            >
              <StoreIcon className="w-4 h-4 text-muted-foreground" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-5 w-32 rounded-2xl bg-muted" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    )
  }

  if (!activeStore || userStores.length === 0) {
    return (
      <div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              disabled
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex items-center gap-4 px-4 py-2 rounded-2xl border group-data-[state=collapsed]:border-none"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-2xl bg-muted">
                <StoreIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="text-muted-foreground">{t('noStoresAvailable')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    )
  }

  return (
    <div>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="w-full">
              <Button
                disabled={isChangingStore}
                variant="outline"
                className={cn(
                  'flex items-center gap-2',
                  compact && 'px-2.5 w-auto md:px-3 md:w-auto',
                  'rounded-full sm:rounded-2xl', // More rounded on mobile, less on desktop
                )}
              >
                <StoreIcon className="w-4 h-4" />
                {compact ? (
                  <span className="hidden sm:inline">
                    {activeStore?.store_name || t('noStoreSelected')}
                  </span>
                ) : (
                  activeStore?.store_name || t('noStoreSelected')
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] sm:min-w-56 rounded-2xl mr-2 mt-4 border-4 border-muted"
              align="start"
              // side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t('yourStores')} ({userStores.length})
              </DropdownMenuLabel>

              {userStores.map((userStore, index) => {
                const store = userStore.store
                // const isActive = activeStore ? store.store_id === activeStore.store_id : false

                return (
                  <DropdownMenuItem
                    key={store.store_id}
                    onClick={() => handleStoreSwitch(store)}
                    className={cn(
                      'gap-2 p-2 border-b border-b-border rounded-none',
                      index === userStores.length - 1 && 'border-b-0',
                      index === 0 && 'border-t border-t-border/50',
                    )}
                    disabled={isChangingStore}
                  >
                    <div className="flex items-center gap-5 justify-between w-full">
                      <div className="flex flex-1 flex-col gap-1 justify-between">
                        <span className="">{store.store_name}</span>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          {/* <MapPin className="size-3" /> */}
                          <span>{store.address}</span>
                        </div>
                      </div>
                      {/* <div className="flex items-center gap-2">
                        {isActive && (
                          <Badge variant="primary" className="text-xs">
                            {t('active')}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {tRoles(userStore.role)}
                        </Badge>
                      </div> */}
                    </div>

                    {/* <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut> */}
                  </DropdownMenuItem>
                )
              })}

              <DropdownMenuSeparator />

              {/* Set as Primary Store Option */}
              {activeStore && (
                <DropdownMenuItem
                  onClick={() => handleStoreSwitch(activeStore, true)}
                  className="gap-2 p-2"
                  disabled={isChangingStore}
                >
                  <div className="flex size-6 items-center justify-center rounded-2xl border bg-transparent">
                    <Settings className="size-4" />
                  </div>
                  <div className=" text-muted-foreground">{t('setAsPrimaryStore')}</div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  )
}
