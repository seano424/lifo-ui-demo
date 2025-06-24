// components/users/users-list.tsx (Client Component)
'use client'

import { useState } from 'react'
import { useUsers, useUserActions } from '@/hooks/use-users'
import { UserCard } from '@/components/users/user-card'
import { UserFilters } from '@/components/users/user-filters'
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
        <p className="text-sm text-gray-600">
          {count > 0 ? `Showing ${data.length} of ${count} users` : 'No users found'}
        </p>

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
        {data?.map(user => (
          <UserCard
            key={user.user_id}
            user={user}
            onActivate={() => activateUser(user.user_id)}
            onDeactivate={() => deactivateUser(user.user_id)}
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
          <h3 className="text-lg font-medium text-gray-900 mb-1">No users found</h3>
          <p className="text-gray-500 mb-4">
            {Object.keys(filters).length > 0
              ? 'Try adjusting your filters to see more results.'
              : 'Get started by adding your first team member.'}
          </p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Add First User
          </button>
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
