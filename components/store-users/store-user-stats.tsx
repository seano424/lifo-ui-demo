'use client'

import { Crown, Shield, Store, TrendingUp, User, UserCheck, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useActiveStoreUsers,
  usePinEnabledUsers,
  useStoreEmployees,
  useStoreManagers,
  useStoreOwners,
  useStoreUsers,
} from '@/hooks/use-store-users'
import { useStoreState } from '@/lib/stores/store-context'

export function StoreUserStats() {
  const { activeStore } = useStoreState()

  // Get all user counts
  const { data: allUsers, isLoading: loadingAll } = useStoreUsers()
  const { data: activeUsers, isLoading: loadingActive } = useActiveStoreUsers()
  const { data: owners, isLoading: loadingOwners } = useStoreOwners()
  const { data: managers, isLoading: loadingManagers } = useStoreManagers()
  const { data: employees, isLoading: loadingEmployees } = useStoreEmployees()
  const { data: pinUsers, isLoading: loadingPin } = usePinEnabledUsers()

  const isLoading =
    loadingAll ||
    loadingActive ||
    loadingOwners ||
    loadingManagers ||
    loadingEmployees ||
    loadingPin

  // Calculate inactive users
  const inactiveUsers = allUsers.filter(user => !user.is_active)

  // Calculate growth (this would be more meaningful with historical data)
  const totalUsers = allUsers.length
  const activePinUsers = pinUsers.filter(user => user.is_active).length

  if (!activeStore) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Store className="w-8 h-8 mx-auto mb-2" />
            <p>Select a store to view team statistics</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    const skeletonCards = Array.from({ length: 4 }, (_, i) => ({ id: `skeleton-${i}` }))

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {skeletonCards.map((skeleton: { id: string }) => (
          <Card key={skeleton.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-12 mb-1 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-24 animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Active Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeUsers.length}</div>
          <p className="text-xs text-muted-foreground">
            {inactiveUsers.length > 0 && (
              <span className="text-orange-600">+{inactiveUsers.length} inactive</span>
            )}
            {inactiveUsers.length === 0 && 'All users active'}
          </p>
        </CardContent>
      </Card>

      {/* Owners */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Store Owners</CardTitle>
          <Crown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{owners.length}</div>
          <p className="text-xs text-muted-foreground">
            {owners.length === 1 ? 'Single owner' : 'Multiple owners'}
          </p>
        </CardContent>
      </Card>

      {/* Managers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Managers</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{managers.length}</div>
          <p className="text-xs text-muted-foreground">
            {((managers.length / Math.max(totalUsers, 1)) * 100).toFixed(0)}% of team
          </p>
        </CardContent>
      </Card>

      {/* Employees */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Employees</CardTitle>
          <User className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{employees.length}</div>
          <p className="text-xs text-muted-foreground">
            {((employees.length / Math.max(totalUsers, 1)) * 100).toFixed(0)}% of team
          </p>
        </CardContent>
      </Card>

      {/* PIN Enabled Users - Second Row */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">PIN Access</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activePinUsers}</div>
          <p className="text-xs text-muted-foreground">
            {pinUsers.length > activePinUsers && (
              <span>{pinUsers.length - activePinUsers} inactive PIN users</span>
            )}
            {pinUsers.length === activePinUsers && 'All PIN users active'}
          </p>
        </CardContent>
      </Card>

      {/* Team Growth (placeholder for future analytics) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Team Size</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUsers}</div>
          <p className="text-xs text-muted-foreground">Total team members</p>
        </CardContent>
      </Card>

      {/* Store Information */}
      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Store Details</CardTitle>
          <Store className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{activeStore.store_name}</span>
            <Badge variant="secondary">{activeStore.store_type}</Badge>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {activeStore.city}, {activeStore.country}
            </span>
            <code className="bg-gray-100 px-2 py-1 rounded text-xs">{activeStore.store_code}</code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
