'use client'

import { useState } from 'react'
import { Typography } from '@/components/ui/typography'
import { useStoreUsers, useStoreUserActions } from '@/hooks/use-store-users'
import { StoreUserCard } from '@/components/store-users/store-user-card'
import { StoreUserFilters } from '@/components/store-users/store-users-filter'
import { Button } from '@/components/ui/button'
import { UserPlus, Users } from 'lucide-react'
import type { StoreUserFilters as StoreUserFiltersType } from '@/lib/queries/store-users'

interface StoreUsersListProps {
  showAddButton?: boolean
  onAddUser?: () => void
}

export function StoreUsersList({ showAddButton = true, onAddUser }: StoreUsersListProps) {
  const [filters, setFilters] = useState<StoreUserFiltersType>({})
  const { data, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage, count, storeId } =
    useStoreUsers(filters)

  const {
    changeUserRole,
    toggleUserActiveStatus,
    enablePinAuth,
    removeUser,
    isUpdating,
    storeName,
  } = useStoreUserActions()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <span>Loading store users...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">Error loading store users: {error.message}</div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!storeId) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <Typography variant="h3">No Store Selected</Typography>
        <Typography variant="p" color="muted">
          Please select a store to view its users.
        </Typography>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Typography variant="h2">Store Team</Typography>
          <Typography variant="p" color="muted">
            Manage users for {storeName}
          </Typography>
        </div>

        {showAddButton && (
          <Button onClick={onAddUser} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        )}
      </div>

      {/* Filters */}
      <StoreUserFilters filters={filters} onFiltersChange={setFilters} />

      {/* Results Header */}
      <div className="flex justify-between items-center">
        <Typography variant="p" color="muted">
          {count > 0 ? `Showing ${data.length} of ${count} users` : 'No users found'}
        </Typography>

        {/* View Toggle */}
        <div className="flex rounded-lg border border-gray-200">
          <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-l-lg">Grid</button>
          <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-r-lg">
            Table
          </button>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map(storeUser => (
          <StoreUserCard
            key={storeUser.user_id}
            storeUser={storeUser}
            onChangeRole={role => changeUserRole(storeUser.user_id, role)}
            onToggleActive={isActive => toggleUserActiveStatus(storeUser.user_id, isActive)}
            onTogglePinAuth={enabled => enablePinAuth(storeUser.user_id, enabled)}
            onRemove={() => removeUser(storeUser.user_id)}
            isUpdating={isUpdating}
          />
        ))}
      </div>

      {/* Empty State */}
      {data.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
            <Users className="w-full h-full" />
          </div>
          <Typography variant="h3">No users found</Typography>
          <Typography variant="p" color="muted" className="mb-4">
            {Object.keys(filters).length > 0
              ? 'Try adjusting your filters to see more results.'
              : "This store doesn't have any users yet."}
          </Typography>
          {showAddButton && Object.keys(filters).length === 0 && (
            <Button onClick={onAddUser} className="flex items-center gap-2 mx-auto">
              <UserPlus className="w-4 h-4" />
              Add First User
            </Button>
          )}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isFetchingNextPage ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                Loading more...
              </>
            ) : (
              'Load More Users'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
