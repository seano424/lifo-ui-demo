// app/dashboard/users/page.tsx (Server Component)

import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { fetchUsersPage } from '@/lib/queries/users'
import { queryKeys } from '@/lib/queries/query-keys'
import { UsersList } from '@/components/users/users-list'
import { UserStats } from '@/components/users/user-stats'

export default async function UsersPage() {
  const { queryClient } = await createPrefetchedQuery()
  const serverClient = await createServerClient()

  // Prefetch the first page of users
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.users.infinite({}),
    queryFn: ({ pageParam = 0 }) =>
      fetchUsersPage({ page: pageParam, pageSize: 20 }, {}, serverClient),
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPage,
    pages: 1,
  })

  // Also prefetch active users for stats
  await queryClient.prefetchInfiniteQuery({
    queryKey: queryKeys.users.infinite({ is_active: true }),
    queryFn: ({ pageParam = 0 }) =>
      fetchUsersPage({ page: pageParam, pageSize: 20 }, { is_active: true }, serverClient),
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextPage,
    pages: 1,
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">User Management</h1>
            <p className="text-gray-600 mt-1">Manage team members and their roles</p>
          </div>
          {/* Future: Add user button */}
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              Export Users
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Add User
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <UserStats />

        {/* Users List */}
        <UsersList />
      </div>
    </HydrationBoundary>
  )
}
