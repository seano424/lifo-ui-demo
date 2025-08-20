'use client'

import * as React from 'react'
import { MapPin, Settings } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Badge } from '@/components/ui/badge'
import { useUserStores, useStoreActions } from '@/hooks/use-stores'
import { useStoreState } from '@/lib/stores/store-context'
import type { Store } from '@/lib/queries/stores'
import { cn } from '@/lib/utils'

import { Skeleton } from './ui/skeleton'
import { Button } from './ui/button'

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
              className={cn(
                'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex items-center gap-4 px-4 rounded-lg border',
                'group-data-[state=collapsed]:border-none',
              )}
            >
              <div className="flex flex-col gap-1">
                <Skeleton className="h-5 w-32 rounded bg-muted" />
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
              className={cn(
                'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground flex items-center gap-4 py-8 px-4 rounded-lg border',
                'group-data-[state=collapsed]:border-none',
              )}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted" />
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
              <Button disabled={isChangingStore} variant="outline">
                {activeStore.store_name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
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
                    className="gap-2 p-2"
                    disabled={isChangingStore}
                  >
                    <div className="flex flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{store.store_name}</span>
                        {isActive && (
                          <Badge variant="default" className="text-xs">
                            Active
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {userStore.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        <span>{store.city}</span>
                        {store.store_code && <span className="text-xs">• {store.store_code}</span>}
                      </div>
                    </div>
                    <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
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
                  <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
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
