'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
  User,
  Key,
  Lock,
  RefreshCw,
  Unlock,
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
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Import the new components
import { AddEmployeeDialog } from './add-employee-dialog'

export function StoreUsersList() {
  const t = useTranslations('users')
  const { data, isLoading, error, hasMore, fetchNextPage, isFetchingNextPage, count, storeId } =
    useStoreUsers()

  const [selectedUser, setSelectedUser] = useState<StoreUser | null>(null)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)
  const [isEditUserRoleDialogOpen, setIsEditUserRoleDialogOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [isUnlockDialogOpen, setIsUnlockDialogOpen] = useState(false)
  const [formRole, setFormRole] = useState<StoreUser['role_in_store']>('employee')

  const { changeUserRole, toggleUserActiveStatus, removeUser, refetch } = useStoreUserActions()

  const { canManageUsers } = usePermissions()
  const { isOwner } = useUserRole()
  const { activeStore } = useStoreState()
  const isMoreThanOneOwner = data.filter(user => user.role_in_store === 'owner').length > 1

  // Helper function to safely get translated role
  const getRoleTranslation = (role: string) => {
    try {
      return t(`roles.${role}`)
    } catch {
      return role
    }
  }

  // Helper function to check if PIN is locked
  const isPINLocked = (user: StoreUser): boolean => {
    const lockedUntil = user.pin_locked_until
    if (!lockedUntil) return false
    return new Date(lockedUntil) > new Date()
  }

  // Helper function to check if user has PIN auth
  const hasPINAuth = (user: StoreUser): boolean => {
    return user.can_use_pin_auth && !!user.requires_pin
  }

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

  const handleEditUserRoleSubmit = (role: StoreUser['role_in_store']) => {
    if (!selectedUser || !role || role === selectedUser.role_in_store) return

    if (selectedUser.role_in_store === 'owner' && !isMoreThanOneOwner) {
      toast.error(t('errors.mustHaveOwner'))
      return
    }

    changeUserRole(selectedUser.user_id, role)
    setIsEditUserRoleDialogOpen(false)
  }

  const handleEmployeeCreated = () => {
    // Refresh the users list after creating an employee
    refetch(storeId)
  }

  const handleUserUpdated = () => {
    // Refresh the users list after PIN management actions
    refetch(storeId)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col">
            <Typography variant="h2">{t('title')}</Typography>
            <Typography variant="p" color="muted">
              {t('description')}
            </Typography>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex justify-between items-center">
            <Typography variant="p" color="muted">
              {count > 0 ? t('showing', { current: data.length, total: count }) : t('noUsersFound')}
            </Typography>
            <Button
              variant="brand"
              onClick={() => setIsAddUserDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {t('addEmployee')}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-opacity-0">
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('username')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('pinStatus')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
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
                      <span className="text-sm">{getRoleTranslation(storeUser.role_in_store)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {storeUser.is_active ? t('active') : t('inactive')}
                      </span>
                    </TableCell>
                    <TableCell>
                      {hasPINAuth(storeUser) ? (
                        isPINLocked(storeUser) ? (
                          <span className="text-sm flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            {t('locked')}
                          </span>
                        ) : (
                          <span className="text-sm flex items-center gap-1">
                            <Key className="w-3 h-3" />
                            {t('pinActive')}
                          </span>
                        )
                      ) : (
                        <span className="text-sm">{t('noPin')}</span>
                      )}
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
                            <DropdownMenuLabel>{t('dropdown.userActions')}</DropdownMenuLabel>

                            {/* Role Changes */}
                            {storeUser.role_in_store !== 'employee' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setIsEditUserRoleDialogOpen(true)
                                  setSelectedUser(storeUser)
                                  setFormRole('employee')
                                }}
                              >
                                <User className="mr-2 h-4 w-4" />
                                {t('dropdown.makeEmployee')}
                              </DropdownMenuItem>
                            )}

                            {isOwner && storeUser.role_in_store !== 'manager' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setIsEditUserRoleDialogOpen(true)
                                  setSelectedUser(storeUser)
                                  setFormRole('manager')
                                }}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                {t('dropdown.makeManager')}
                              </DropdownMenuItem>
                            )}

                            {isOwner && storeUser.role_in_store !== 'owner' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setIsEditUserRoleDialogOpen(true)
                                  setSelectedUser(storeUser)
                                  setFormRole('owner')
                                }}
                              >
                                <Crown className="mr-2 h-4 w-4" />
                                {t('dropdown.makeOwner')}
                              </DropdownMenuItem>
                            )}

                            {/* PIN Management Actions */}
                            {hasPINAuth(storeUser) && (
                              <>
                                <DropdownMenuSeparator />

                                {/* Reset PIN */}
                                <DropdownMenuItem
                                  onClick={() => {
                                    // We need to handle this differently since the dropdown will close
                                    // We'll need to store the user and open the dialog after a brief delay
                                    setSelectedUser(storeUser)
                                    setTimeout(() => {
                                      setIsResetDialogOpen(true)
                                    }, 100)
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  {t('dropdown.resetPin')}
                                </DropdownMenuItem>

                                {/* Unlock PIN (only if locked) */}
                                {isPINLocked(storeUser) && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(storeUser)
                                      setTimeout(() => {
                                        setIsUnlockDialogOpen(true)
                                      }, 100)
                                    }}
                                    className="flex items-center gap-2"
                                  >
                                    <Unlock className="w-4 h-4" />
                                    {t('dropdown.unlockPin')}
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}

                            {/* Active Status Toggle */}
                            {canManageUsers && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    toggleUserActiveStatus(storeUser.user_id, !storeUser.is_active)
                                  }
                                >
                                  {storeUser.is_active ? (
                                    <>
                                      <UserMinus className="mr-2 h-4 w-4" />
                                      {t('dropdown.deactivateUser')}
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      {t('dropdown.reactivateUser')}
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}

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
                              {t('dropdown.removeFromStore')}
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
              <Typography variant="h3">{t('noUsersFound')}</Typography>
              <Typography variant="p" color="muted" className="mb-4">
                {t('noUsersMessage')}
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
                    {t('loadingMore')}
                  </>
                ) : (
                  t('loadMoreUsers')
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Employee Dialog */}
      <AddEmployeeDialog
        isOpen={isAddUserDialogOpen}
        onOpenChange={setIsAddUserDialogOpen}
        storeId={storeId}
        onEmployeeCreated={handleEmployeeCreated}
      />

      {/* Edit User Role Dialog */}
      <Dialog open={isEditUserRoleDialogOpen} onOpenChange={setIsEditUserRoleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('dialogs.editRole.title')}</DialogTitle>
            <DialogDescription>
              {!isMoreThanOneOwner && selectedUser?.role_in_store === 'owner' && (
                <>
                  {t('errors.mustHaveOwner')}
                  <br />
                </>
              )}
              {t('dialogs.editRole.description', {
                name: selectedUser?.full_name || 'this user',
                role: selectedUser?.role_in_store
                  ? getRoleTranslation(selectedUser.role_in_store)
                  : 'unknown',
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="edit-role">{t('dialogs.editRole.roleLabel')}</Label>
              <Select
                name="role"
                value={formRole}
                onValueChange={value => setFormRole(value as StoreUser['role_in_store'])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('dialogs.editRole.selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">{t('roles.owner')}</SelectItem>
                  <SelectItem value="manager">{t('roles.manager')}</SelectItem>
                  <SelectItem value="employee">{t('roles.employee')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">{t('dialogs.editRole.cancel')}</Button>
            </DialogClose>
            <Button
              disabled={!isMoreThanOneOwner && selectedUser?.role_in_store === 'owner'}
              onClick={() => handleEditUserRoleSubmit(formRole)}
              className={cn(
                'bg-blue-600 hover:bg-blue-700',
                !isMoreThanOneOwner &&
                  selectedUser?.role_in_store === 'owner' &&
                  'bg-gray-400 hover:bg-gray-400',
              )}
            >
              {t('dialogs.editRole.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.removeUser.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.removeUser.description', {
                name: selectedUser?.full_name || 'this user',
                store: activeStore?.business_name || 'this store',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dialogs.removeUser.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  removeUser(selectedUser.user_id)
                  setShowRemoveDialog(false)
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('dialogs.removeUser.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PIN Management Dialogs */}
      {selectedUser && (
        <>
          {/* Reset PIN Dialog */}
          <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5" />
                  {t('dialogs.resetPin.title', { name: selectedUser.full_name || '' })}
                </DialogTitle>
                <DialogDescription>{t('dialogs.resetPin.description')}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="space-y-2">
                    <div>
                      <strong>{t('dialogs.resetPin.employee')}:</strong> {selectedUser.full_name}
                    </div>
                    <div>
                      <strong>{t('dialogs.resetPin.username')}:</strong>{' '}
                      <span className="font-mono">{selectedUser.username}</span>
                    </div>
                    <div>
                      <strong>{t('dialogs.resetPin.email')}:</strong> {selectedUser.email}
                    </div>
                    <div>
                      <strong>{t('dialogs.resetPin.currentStatus')}:</strong>
                      {isPINLocked(selectedUser) ? (
                        <span className="ml-2 text-red-600 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          {t('dialogs.resetPin.statusLocked')}
                        </span>
                      ) : (
                        <span className="ml-2 text-green-600 flex items-center gap-1">
                          <Key className="w-3 h-3" />
                          {t('dialogs.resetPin.statusActive')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsResetDialogOpen(false)}>
                    {t('dialogs.resetPin.cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      // TODO: Implement PIN reset logic
                      console.log('Reset PIN for:', selectedUser.user_id)
                      setIsResetDialogOpen(false)
                    }}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('dialogs.resetPin.confirm')}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>

          {/* Unlock PIN Dialog */}
          <Dialog open={isUnlockDialogOpen} onOpenChange={setIsUnlockDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Unlock className="w-5 h-5" />
                  {t('dialogs.unlockPin.title', { name: selectedUser.full_name || '' })}
                </DialogTitle>
                <DialogDescription>{t('dialogs.unlockPin.description')}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="space-y-1">
                    <div>
                      <strong>{t('dialogs.unlockPin.employee')}:</strong> {selectedUser.full_name}
                    </div>
                    <div>
                      <strong>{t('dialogs.unlockPin.username')}:</strong>{' '}
                      <span className="font-mono">{selectedUser.username}</span>
                    </div>
                    <div>
                      <strong>Status:</strong> {t('dialogs.unlockPin.lockedMessage')}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUnlockDialogOpen(false)}>
                    {t('dialogs.unlockPin.cancel')}
                  </Button>
                  <Button
                    onClick={() => {
                      // TODO: Implement PIN unlock logic
                      console.log('Unlock PIN for:', selectedUser.user_id)
                      setIsUnlockDialogOpen(false)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    {t('dialogs.unlockPin.confirm')}
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </>
  )
}
