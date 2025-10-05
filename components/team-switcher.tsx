'use client'

import { Badge } from '@/components/ui/badge'
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
  useSidebar,
} from '@/components/ui/sidebar'
import { useStoreActions, useUserStores } from '@/hooks/use-stores'
import type { Store } from '@/lib/queries/stores'
import { useStoreState } from '@/lib/stores/store-context'
import { cn } from '@/lib/utils'
import { MapPin, Settings, Store as StoreIcon } from 'lucide-react'
import { Button } from './ui/button'
import { Skeleton } from './ui/skeleton'

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { userStores, isLoading } = useUserStores()
  const { switchStore, isChangingStore } = useStoreActions()
  const { activeStore } = useStoreState()

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
                <span className="text-muted-foreground">No stores available</span>
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
                className="flex items-center gap-2"
              >
                <StoreIcon className="w-4 h-4" />
                {activeStore.store_name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-2xl"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Your Stores ({userStores.length})
              </DropdownMenuLabel>

              {userStores.map((userStore, index) => {
                const store = userStore.store
                const isActive = store.store_id === activeStore.store_id

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
                        <span className="font-medium">{store.store_name}</span>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          <span>{store.address}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isActive && (
                          <Badge variant="primary" className="text-xs">
                            Active
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs capitalize">
                          {userStore.role}
                        </Badge>
                      </div>
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
                  <div className="font-medium text-muted-foreground">Set as Primary Store</div>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  )
}
