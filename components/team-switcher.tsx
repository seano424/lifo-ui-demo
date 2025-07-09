'use client'

import * as React from 'react'
import { ChevronsUpDown, MapPin, Settings, ShoppingCart } from 'lucide-react'

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

// Type definitions for store types
type StoreType = 'supermarket' | 'convenience' | 'restaurant' | 'bakery' | 'butcher' | 'organic'

// Map store types to icons and colors
const storeConfig: Record<StoreType, { icon: typeof ShoppingCart; color: string }> & {
  [key: string]: { icon: typeof ShoppingCart; color: string }
} = {
  supermarket: { icon: ShoppingCart, color: 'bg-blue-500' },
  convenience: { icon: ShoppingCart, color: 'bg-green-500' },
  restaurant: { icon: ShoppingCart, color: 'bg-orange-500' },
  bakery: { icon: ShoppingCart, color: 'bg-yellow-500' },
  butcher: { icon: ShoppingCart, color: 'bg-red-500' },
  organic: { icon: ShoppingCart, color: 'bg-emerald-500' },
} as const

function StoreIcon({ storeType, className }: { storeType?: string | null; className?: string }) {
  const config = storeConfig[storeType as StoreType] || storeConfig.supermarket
  const IconComponent = config.icon
  return <IconComponent className={className} />
}

function StoreTypeColor({ storeType }: { storeType?: string | null }) {
  const config = storeConfig[storeType as StoreType] || storeConfig.supermarket
  return config.color
}

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
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 animate-pulse items-center justify-center rounded-lg bg-muted">
              <ShoppingCart className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
              <div className="h-3 w-16 animate-pulse rounded bg-muted"></div>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  if (!activeStore || userStores.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
              <ShoppingCart className="size-4 text-muted-foreground" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="text-muted-foreground">No stores available</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              disabled={isChangingStore}
            >
              <div
                className={`flex aspect-square size-8 items-center justify-center rounded-lg text-white ${StoreTypeColor({ storeType: activeStore.store_type })}`}
              >
                <StoreIcon storeType={activeStore.store_type} className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{activeStore.store_name}</span>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  <span className="truncate">{activeStore.city}</span>
                  {activeStore.store_type && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {activeStore.store_type}
                    </Badge>
                  )}
                </div>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
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
                  <div
                    className={`flex size-6 items-center justify-center rounded-md text-white ${StoreTypeColor({ storeType: store.store_type })}`}
                  >
                    <StoreIcon storeType={store.store_type} className="size-3.5 shrink-0" />
                  </div>
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
  )
}
