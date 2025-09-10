'use client'

import { useState } from 'react'
import { Typography } from '@/components/ui/typography'
import { UserCard } from '@/components/users/user-card'
import { UserFilters } from '@/components/users/user-filters'
import { useUserActions, useUsers } from '@/hooks/use-users'
import type { UserFilters as UserFiltersType } from '@/lib/queries/users'

export function UsersList() {
  const [filters, setFilters] = useState<UserFiltersType>({})
  const { data, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage, count } =
    useUsers(filters)
  const { activateUser, deactivateUser, isUpdating } = useUserActions()

  if (isLoading) return <div>Loading users...</div>
  if (error) return <div className="text-red-600">Error loading users: {error.message}</div>

  return (
    <div className="space-y-6">
      {/* Filters */}
      <UserFilters filters={filters} onFiltersChange={setFilters} />

      {/* Results Header */}
      <div className="flex justify-between items-center">
        <Typography variant="p" color="muted">
          {count > 0 ? `Showing ${data.length} of ${count} users` : 'No users found'}
        </Typography>

        {/* View Toggle */}
        <div className="flex rounded-2xl border border-gray-200">
          <button type="button" className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-l-lg">
            Grid
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 rounded-r-lg"
          >
            Table
          </button>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onActivate={() => activateUser(user.id)}
            onDeactivate={() => deactivateUser(user.id)}
            isUpdating={isUpdating}
          />
        ))}
      </div>

      {/* Empty State */}
      {data.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <Typography variant="h3">No users found</Typography>
          <Typography variant="p" color="muted" className="mb-4">
            {Object.keys(filters).length > 0
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by adding your first team member.'}
          </Typography>
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700"
          >
            Add First User
          </button>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-3 border border-gray-300 rounded-2xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                Loading more...
              </div>
            ) : (
              'Load More Users'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
