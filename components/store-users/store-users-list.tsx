'use client'

import { useState } from 'react'
import { Typography } from '@/components/ui/typography'
import { useStoreUsers, useStoreUserActions } from '@/hooks/use-store-users'
import { type StoreUser } from '@/lib/queries/store-users'
import { useStoreState } from '@/lib/stores/store-context'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MoreHorizontal,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  Crown,
  Pin,
  User,
} from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { usePermissions, useUserRole } from '@/hooks/use-users'
import { Card, CardContent, CardHeader } from '../ui/card'

export function StoreUsersList() {
  const { data, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage, count, storeId } =
    useStoreUsers()

  const [selectedUser, setSelectedUser] = useState<StoreUser | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)

  const { changeUserRole, toggleUserActiveStatus, enablePinAuth, removeUser } =
    useStoreUserActions()

  const { canManageUsers } = usePermissions()
  const { isOwner } = useUserRole()
  const { activeStore } = useStoreState()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 border border-gray-50 rounded-2xl p-4">
        <Skeleton className="w-full h-10 bg-gray-50" />
        <Skeleton className="w-full h-10 bg-gray-50" />
        <Skeleton className="w-full h-10 bg-gray-50" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 border border-red-100 rounded-2xl p-4">
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
      <Card>
        <CardHeader>
          <div className="flex flex-col">
            <Typography variant="h2">Team Management</Typography>
            <Typography variant="p" color="muted">
              Invite new team members to your store and manage their roles and permissions.
            </Typography>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex justify-between items-center">
            <Typography variant="p" color="muted">
              {count > 0 ? `Showing ${data.length} of ${count} users` : 'No users found'}
            </Typography>
            <Button
              variant="brand"
              onClick={() => setIsAddUserDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite team member
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-opacity-0">
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(storeUser => {
                return (
                  <TableRow key={storeUser.user_id} className="hover:bg-opacity-0">
                    <TableCell className="font-medium">
                      <div>
                        <div>{storeUser.full_name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{storeUser.username}</TableCell>
                    <TableCell className="font-mono text-sm">{storeUser.email}</TableCell>
                    <TableCell>
                      <span className="capitalize">{storeUser.role_in_store}</span>
                    </TableCell>
                    <TableCell>
                      <span>{storeUser.is_active ? 'Active' : 'Inactive'}</span>
                    </TableCell>

                    <TableCell>
                      {canManageUsers && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>User Actions</DropdownMenuLabel>

                            {/* Role Changes */}

                            {storeUser.role_in_store !== 'employee' && (
                              <DropdownMenuItem
                                onClick={() => changeUserRole(storeUser.user_id, 'employee')}
                              >
                                <User className="mr-2 h-4 w-4" />
                                Make Employee
                              </DropdownMenuItem>
                            )}

                            {isOwner && storeUser.role_in_store !== 'manager' && (
                              <DropdownMenuItem
                                onClick={() => changeUserRole(storeUser.user_id, 'manager')}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Make Manager
                              </DropdownMenuItem>
                            )}

                            {isOwner && storeUser.role_in_store !== 'owner' && (
                              <DropdownMenuItem
                                onClick={() => changeUserRole(storeUser.user_id, 'owner')}
                              >
                                <Crown className="mr-2 h-4 w-4" />
                                Make Owner
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            {/* PIN Auth Toggle */}
                            {storeUser.role_in_store === 'employee' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  enablePinAuth(storeUser.user_id, !storeUser.can_use_pin_auth)
                                }
                              >
                                <Pin className="mr-2 h-4 w-4" />
                                {storeUser.can_use_pin_auth ? 'Disable PIN' : 'Enable PIN'}
                              </DropdownMenuItem>
                            )}

                            {/* Active Status Toggle */}
                            <DropdownMenuItem
                              onClick={() =>
                                toggleUserActiveStatus(storeUser.user_id, !storeUser.is_active)
                              }
                            >
                              {storeUser.is_active ? (
                                <>
                                  <UserMinus className="mr-2 h-4 w-4" />
                                  Deactivate User
                                </>
                              ) : (
                                <>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Reactivate User
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Remove from Store */}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(storeUser)
                                setShowRemoveDialog(true)
                              }}
                              className="text-red-600 focus:text-red-600"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Remove from Store
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

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
        </CardContent>
      </Card>

      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <form>
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

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User from Store</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {selectedUser?.full_name || 'this user'} from{' '}
              {activeStore?.business_name || 'this store'}. They will lose all access to this store,
              lose their current role and permissions, and need to be re-invited if you want them
              back. Their user account will remain active for other stores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  removeUser(selectedUser.user_id)
                  setShowRemoveDialog(false)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove from Store
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
