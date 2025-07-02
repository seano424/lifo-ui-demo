// app/dashboard/users/page.tsx (Server Component)

import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createPrefetchedQuery } from '@/lib/react-query/prefetch'
import { fetchUsersPage } from '@/lib/queries/users'
import { queryKeys } from '@/lib/queries/query-keys'
import { UsersList } from '@/components/users/users-list'
import { UserStats } from '@/components/users/user-stats'
import DashboardInsetHeader from '@/components/dashboard/dashboard-inset-header'
import { Button } from '@/components/ui/button'

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
        <DashboardInsetHeader
          title="User Management"
          description="Manage team members and their roles"
          rightContent={
            <div className="flex gap-2">
              <Button variant="outline">Export Users</Button>
              <Button>Add User</Button>
            </div>
          }
        />

        {/* Stats Cards */}
        <UserStats />

        {/* Users List */}
        <UsersList />
      </div>
    </HydrationBoundary>
  )
}
