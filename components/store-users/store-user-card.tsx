'use client'

import {
  AlertTriangle,
  Clock,
  Crown,
  MoreHorizontal,
  Pin,
  Shield,
  User,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Typography } from '@/components/ui/typography'
import type { StoreUser } from '@/lib/queries/store-users'

interface StoreUserCardProps {
  storeUser: StoreUser
  onChangeRole: (role: 'owner' | 'manager' | 'employee' | 'staff') => void
  onToggleActive: (isActive: boolean) => void
  onTogglePinAuth: (enabled: boolean) => void
  onRemove: () => void
  isUpdating: boolean
}

export function StoreUserCard({
  storeUser,
  onChangeRole,
  onToggleActive,
  onTogglePinAuth,
  onRemove,
  isUpdating,
}: StoreUserCardProps) {
  const t = useTranslations('users')
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  // Helper function to safely get translated role
  const getRoleTranslation = (role: string) => {
    try {
      return t(`roles.${role}`)
    } catch {
      return role
    }
  }

  // Helper function to get role icon and color
  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'owner':
        return {
          icon: Crown,
          color: 'bg-yellow-100 text-yellow-800',
          label: getRoleTranslation('owner'),
        }
      case 'manager':
        return {
          icon: UserCheck,
          color: 'bg-blue-100 text-blue-800',
          label: getRoleTranslation('manager'),
        }
      case 'employee':
        return {
          icon: User,
          color: 'bg-green-100 text-green-800',
          label: getRoleTranslation('employee'),
        }
      case 'staff':
        return {
          icon: Users,
          color: 'bg-gray-100 text-gray-800',
          label: getRoleTranslation('staff'),
        }
      default:
        return {
          icon: User,
          color: 'bg-gray-100 text-gray-800',
          label: getRoleTranslation('unknown'),
        }
    }
  }

  // Helper function to get PIN status
  const getPinStatus = () => {
    if (!storeUser.can_use_pin_auth) {
      return { icon: Pin, color: 'text-gray-400', label: t('card.pinStatus.disabled') }
    }

    if (storeUser.pin_locked_until && new Date() < new Date(storeUser.pin_locked_until)) {
      return { icon: AlertTriangle, color: 'text-red-500', label: t('card.pinStatus.locked') }
    }

    if (storeUser.requires_pin && !storeUser.username) {
      return { icon: Clock, color: 'text-orange-500', label: t('card.pinStatus.pending') }
    }

    return { icon: Shield, color: 'text-green-500', label: t('card.pinStatus.active') }
  }

  const roleInfo = getRoleInfo(storeUser.role_in_store)
  const pinStatus = getPinStatus()
  const RoleIcon = roleInfo.icon
  const PinIcon = pinStatus.icon

  // Get user initials for avatar
  const getInitials = () => {
    if (storeUser.full_name) {
      return storeUser.full_name
        .split(' ')
        .map(name => name[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return storeUser.email.split('@')[0].slice(0, 2).toUpperCase()
  }

  return (
    <>
      <Card className={`relative ${!storeUser.is_active ? 'opacity-60' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={storeUser.avatar_url}
                alt={storeUser.full_name || storeUser.email}
              />
              <AvatarFallback>{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <Typography variant="h4" className="truncate">
                {storeUser.full_name || storeUser.email.split('@')[0]}
              </Typography>
              <Typography variant="small" color="muted" className="truncate">
                {storeUser.email}
              </Typography>
            </div>
          </div>

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
              <DropdownMenuItem onClick={() => onChangeRole('employee')}>
                <User className="mr-2 h-4 w-4" />
                {t('dropdown.makeEmployee')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangeRole('manager')}>
                <UserCheck className="mr-2 h-4 w-4" />
                {t('dropdown.makeManager')}
              </DropdownMenuItem>
              {storeUser.role_in_store !== 'owner' && (
                <DropdownMenuItem onClick={() => onChangeRole('owner')}>
                  <Crown className="mr-2 h-4 w-4" />
                  {t('dropdown.makeOwner')}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* PIN Auth Toggle */}
              <DropdownMenuItem onClick={() => onTogglePinAuth(!storeUser.can_use_pin_auth)}>
                <Pin className="mr-2 h-4 w-4" />
                {storeUser.can_use_pin_auth ? t('card.disablePin') : t('card.enablePin')}
              </DropdownMenuItem>

              {/* Active Status Toggle */}
              <DropdownMenuItem onClick={() => onToggleActive(!storeUser.is_active)}>
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

              <DropdownMenuSeparator />

              {/* Remove from Store */}
              <DropdownMenuItem
                onClick={() => setShowRemoveDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <UserMinus className="mr-2 h-4 w-4" />
                {t('dropdown.removeFromStore')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Role Badge */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className={roleInfo.color}>
              <RoleIcon className="w-3 h-3 mr-1" />
              {roleInfo.label}
            </Badge>

            {/* Status Indicators */}
            <div className="flex items-center gap-2">
              {!storeUser.is_active && (
                <Badge variant="destructive" className="text-xs">
                  {t('card.inactive')}
                </Badge>
              )}
              {storeUser.can_use_pin_auth && (
                <div className="flex items-center gap-1" title={pinStatus.label}>
                  <PinIcon className={`w-3 h-3 ${pinStatus.color}`} />
                </div>
              )}
            </div>
          </div>

          {/* Username (if available) */}
          {storeUser.username && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{t('card.username')}:</span>
              <code className="bg-gray-100 px-2 py-1 rounded-2xl text-xs">{storeUser.username}</code>
            </div>
          )}

          {/* Permissions Summary */}
          <div className="space-y-2">
            <Typography variant="small" className="font-medium">
              {t('card.permissions')}:
            </Typography>
            <div className="flex flex-wrap gap-1">
              {Object.entries(storeUser.permissions).map(([permission, enabled]) => (
                <Badge
                  key={permission}
                  variant={enabled ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {permission.replace('can_', '').replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Last Login */}
          {storeUser.last_login && (
            <Typography variant="small" color="muted">
              {t('card.lastLogin')}: {new Date(storeUser.last_login).toLocaleDateString()}
            </Typography>
          )}

          {/* PIN Attempts Warning */}
          {storeUser.pin_attempts && storeUser.pin_attempts > 0 && (
            <div className="flex items-center gap-1 text-orange-600 text-xs">
              <AlertTriangle className="w-3 h-3" />
              {t('card.failedAttempts', {
                count: storeUser.pin_attempts,
                plural: storeUser.pin_attempts > 1 ? 's' : '',
              })}
            </div>
          )}
        </CardContent>

        {/* Loading Overlay */}
        {isUpdating && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
        )}
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('card.removeDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('card.removeDialog.description', { name: storeUser.full_name || storeUser.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('card.removeDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRemove()
                setShowRemoveDialog(false)
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('card.removeDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
