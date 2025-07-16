'use client'

import { useState } from 'react'
import { Typography } from '@/components/ui/typography'
import { useStoreUsers, useStoreUserActions } from '@/hooks/use-store-users'
import { StoreUserCard } from '@/components/store-users/store-user-card'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function StoreUsersList() {
  const { data, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage, count, storeId } =
    useStoreUsers()

  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)

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
    <>
      <div className="space-y-6 border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Typography variant="h2">Team Management</Typography>
        </div>

        <div className="flex justify-between items-center">
          <Typography variant="p" color="muted">
            {count > 0 ? `Showing ${data.length} of ${count} users` : 'No users found'}
          </Typography>

          <div className="hidden md:flex rounded-lg border border-gray-200">
            <button
              className={`px-3 py-1 text-sm ${view === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'} rounded-l-lg`}
              onClick={() => setView('grid')}
            >
              Grid
            </button>
            <button
              className={`px-3 py-1 text-sm ${view === 'list' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'} rounded-r-lg`}
              onClick={() => setView('list')}
            >
              List
            </button>
          </div>
        </div>

        {view === 'grid' && (
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
        )}

        {view === 'list' && (
          <div className="flex flex-col gap-4">
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
        )}

        {/* Empty State */}
        {data.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-4 text-gray-400">
              <Users className="w-full h-full" />
            </div>
            <Typography variant="h3">No users found</Typography>
            <Typography variant="p" color="muted" className="mb-4">
              This store doesn't have any users yet.
            </Typography>
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

      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <form>
          <DialogTrigger asChild>
            <Button variant="outline">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
              <DialogDescription>Add a new user to the store.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label htmlFor="name-1">Email</Label>
                <Input id="name-1" name="name" placeholder="Enter email" />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="role-1">Role</Label>
                <Select name="role" defaultValue="employee">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3">
                <Label htmlFor="status-1">Status</Label>
                <Select name="status" defaultValue="active">
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </DialogContent>
        </form>
      </Dialog>
    </>
  )
}
