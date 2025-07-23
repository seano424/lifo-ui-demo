'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Typography } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useStorePermissions } from '@/hooks/use-store-permissions'
import {
  useStoreUsers,
  useStoreOwners,
  useStoreManagers,
  useStoreEmployees,
  useActiveStoreUsers,
} from '@/hooks/use-store-users'
import type { UserStorePermissions } from '@/lib/server/permissions'
import {
  Users,
  UserPlus,
  Crown,
  UserCheck,
  User,
  Shield,
  AlertCircle,
  TrendingUp,
  Activity,
} from 'lucide-react'
import { StoreUsersList } from '@/components/store-users/store-users-list'

interface TeamManagementProps {
  serverPermissions?: UserStorePermissions
  storeId: string
  storeName: string
}

export default function TeamManagement({
  serverPermissions,
  storeId,
  storeName,
}: TeamManagementProps) {
  const t = useTranslations('team')
  const [activeTab, setActiveTab] = useState('overview')

  // 🚀 Use hybrid permissions hook with server permissions as fallback
  const permissions = useStorePermissions({ serverPermissions })

  // Fetch team data with different filters
  const { data: allUsers, count: totalCount, isLoading } = useStoreUsers()
  const { data: activeUsers, count: activeCount } = useActiveStoreUsers()
  const { data: owners, count: ownerCount } = useStoreOwners()
  const { data: managers, count: managerCount } = useStoreManagers()
  const { data: employees, count: employeeCount } = useStoreEmployees()

  // Calculate team statistics
  const inactiveCount = totalCount - activeCount
  const pinEnabledCount = allUsers.filter(user => user.can_use_pin_auth && user.requires_pin).length
  const recentlyAddedCount = allUsers.filter(user => {
    const addedDate = new Date(user.assigned_at || user.created_at)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return addedDate > weekAgo
  }).length

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-96" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Permission check
  if (!permissions.canManageTeam) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to manage team members. Contact your store{' '}
              {permissions.isEmployee ? 'manager or owner' : 'owner'} for access.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="h2" className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('title')}
              </Typography>
              <Typography variant="p" color="muted">
                {t('description', { storeName })}
              </Typography>
            </div>
            <div className="flex items-center gap-2">
              {/* Permission indicator */}
              <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-muted-foreground text-xs">
                <Shield className="h-3 w-3" />
                {permissions.isOwner ? 'Owner' : permissions.isManager ? 'Manager' : 'Employee'}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Team Overview Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('tabs.overview')}
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('tabs.members')}
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('tabs.roles')}
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('tabs.activity')}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Team Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography variant="small" className="text-muted-foreground">
                      {t('stats.totalMembers')}
                    </Typography>
                    <Typography variant="h3" className="text-2xl font-bold">
                      {totalCount}
                    </Typography>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography variant="small" className="text-muted-foreground">
                      {t('stats.activeMembers')}
                    </Typography>
                    <Typography variant="h3" className="text-2xl font-bold text-green-600">
                      {activeCount}
                    </Typography>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography variant="small" className="text-muted-foreground">
                      {t('stats.pinEnabled')}
                    </Typography>
                    <Typography variant="h3" className="text-2xl font-bold text-purple-600">
                      {pinEnabledCount}
                    </Typography>
                  </div>
                  <Shield className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography variant="small" className="text-muted-foreground">
                      {t('stats.recentlyAdded')}
                    </Typography>
                    <Typography variant="h3" className="text-2xl font-bold text-orange-600">
                      {recentlyAddedCount}
                    </Typography>
                  </div>
                  <UserPlus className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Role Distribution */}
          <Card>
            <CardHeader>
              <Typography variant="h3">{t('overview.roleDistribution')}</Typography>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <div>
                      <Typography variant="p" className="font-medium">
                        {t('roles.owners')}
                      </Typography>
                      <Typography variant="small" className="text-muted-foreground">
                        {t('roles.ownerDescription')}
                      </Typography>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {ownerCount}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <UserCheck className="h-5 w-5 text-blue-500" />
                    <div>
                      <Typography variant="p" className="font-medium">
                        {t('roles.managers')}
                      </Typography>
                      <Typography variant="small" className="text-muted-foreground">
                        {t('roles.managerDescription')}
                      </Typography>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {managerCount}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-green-500" />
                    <div>
                      <Typography variant="p" className="font-medium">
                        {t('roles.employees')}
                      </Typography>
                      <Typography variant="small" className="text-muted-foreground">
                        {t('roles.employeeDescription')}
                      </Typography>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {employeeCount}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <Typography variant="h3">{t('overview.quickActions')}</Typography>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4 justify-start">
                  <div className="flex items-center gap-3">
                    <UserPlus className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{t('actions.addEmployee')}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('actions.addEmployeeDescription')}
                      </div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" className="h-auto p-4 justify-start">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{t('actions.managePermissions')}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('actions.managePermissionsDescription')}
                      </div>
                    </div>
                  </div>
                </Button>

                <Button variant="outline" className="h-auto p-4 justify-start">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">{t('actions.viewActivity')}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('actions.viewActivityDescription')}
                      </div>
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab - Full Team List */}
        <TabsContent value="members" className="space-y-6">
          <StoreUsersList />
        </TabsContent>

        {/* Roles Tab - Role-based Management */}
        <TabsContent value="roles" className="space-y-6">
          <div className="grid gap-6">
            {/* Owners Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Typography variant="h3" className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    {t('roles.owners')} ({ownerCount})
                  </Typography>
                  {permissions.isOwner && <Badge variant="outline">{t('roles.yourRole')}</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {owners.map(owner => (
                    <div
                      key={owner.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        <div>
                          <Typography variant="p" className="font-medium">
                            {owner.full_name}
                          </Typography>
                          <Typography variant="small" className="text-muted-foreground">
                            {owner.email}
                          </Typography>
                        </div>
                      </div>
                      <Badge
                        variant={owner.is_active ? 'default' : 'secondary'}
                        className={owner.is_active ? 'bg-green-100 text-green-800' : ''}
                      >
                        {owner.is_active ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Managers Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Typography variant="h3" className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-blue-500" />
                    {t('roles.managers')} ({managerCount})
                  </Typography>
                  {permissions.isManager && !permissions.isOwner && (
                    <Badge variant="outline">{t('roles.yourRole')}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {managers.map(manager => (
                    <div
                      key={manager.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <UserCheck className="h-4 w-4 text-blue-500" />
                        <div>
                          <Typography variant="p" className="font-medium">
                            {manager.full_name}
                          </Typography>
                          <Typography variant="small" className="text-muted-foreground">
                            {manager.email}
                          </Typography>
                        </div>
                      </div>
                      <Badge
                        variant={manager.is_active ? 'default' : 'secondary'}
                        className={manager.is_active ? 'bg-green-100 text-green-800' : ''}
                      >
                        {manager.is_active ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Employees Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Typography variant="h3" className="flex items-center gap-2">
                    <User className="h-5 w-5 text-green-500" />
                    {t('roles.employees')} ({employeeCount})
                  </Typography>
                  {permissions.isEmployee && <Badge variant="outline">{t('roles.yourRole')}</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {employees.slice(0, 5).map(employee => (
                    <div
                      key={employee.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-green-500" />
                        <div>
                          <Typography variant="p" className="font-medium">
                            {employee.full_name}
                          </Typography>
                          <Typography variant="small" className="text-muted-foreground">
                            {employee.email}
                          </Typography>
                        </div>
                      </div>
                      <Badge
                        variant={employee.is_active ? 'default' : 'secondary'}
                        className={employee.is_active ? 'bg-green-100 text-green-800' : ''}
                      >
                        {employee.is_active ? t('status.active') : t('status.inactive')}
                      </Badge>
                    </div>
                  ))}
                  {employeeCount > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('members')}>
                        {t('roles.viewAllEmployees', { count: employeeCount - 5 })}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Activity Tab - Recent Activity */}
        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <Typography variant="h3" className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t('activity.recentActivity')}
              </Typography>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* This would show recent team activities */}
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <Typography variant="h3">{t('activity.comingSoon')}</Typography>
                  <Typography variant="p" color="muted">
                    {t('activity.comingSoonDescription')}
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Debug Info (Development only) */}
      {process.env.NODE_ENV === 'development' && serverPermissions && (
        <Card>
          <CardContent className="p-4">
            <Typography variant="small" className="font-medium text-yellow-800 mb-2">
              Debug: Server Permissions
            </Typography>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-32">
              {JSON.stringify(serverPermissions, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
