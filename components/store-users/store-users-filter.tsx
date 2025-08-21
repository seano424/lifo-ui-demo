'use client'

import { Filter, Search, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StoreUserFilters as StoreUserFiltersType } from '@/lib/queries/store-users'

interface StoreUserFiltersProps {
  filters: StoreUserFiltersType
  onFiltersChange: (filters: StoreUserFiltersType) => void
}

export function StoreUserFilters({ filters, onFiltersChange }: StoreUserFiltersProps) {
  const updateFilter = (key: keyof StoreUserFiltersType, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value === '' ? undefined : value,
    })
  }

  const clearFilter = (key: keyof StoreUserFiltersType) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const getActiveFilterCount = () => {
    return Object.keys(filters).filter(
      key => filters[key as keyof StoreUserFiltersType] !== undefined,
    ).length
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4" />
          <Label className="text-sm font-medium">Filter Users</Label>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
            </Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Email/Name Search */}
          <div className="space-y-2">
            <Label htmlFor="email-search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email-search"
                placeholder="Email or name..."
                value={filters.email || ''}
                onChange={e => updateFilter('email', e.target.value)}
                className="pl-10"
              />
              {filters.email && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => clearFilter('email')}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Role Filter */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={filters.role_in_store === undefined ? undefined : filters.role_in_store}
              onValueChange={value => updateFilter('role_in_store', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.is_active === undefined ? undefined : filters.is_active.toString()}
              onValueChange={value =>
                updateFilter('is_active', value === undefined ? undefined : value === 'true')
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active only</SelectItem>
                <SelectItem value="false">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PIN Auth Filter */}
          <div className="space-y-2">
            <Label>PIN Access</Label>
            <Select
              value={
                filters.can_use_pin_auth === undefined
                  ? undefined
                  : filters.can_use_pin_auth.toString()
              }
              onValueChange={value =>
                updateFilter('can_use_pin_auth', value === undefined ? undefined : value === 'true')
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">PIN enabled</SelectItem>
                <SelectItem value="false">PIN disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t">
            <span className="text-sm text-gray-600">Active filters:</span>
            <div className="flex flex-wrap gap-2 flex-1">
              {filters.email && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: &quot;{filters.email}&quot;
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => clearFilter('email')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {filters.role_in_store && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Role: {filters.role_in_store}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => clearFilter('role_in_store')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {filters.is_active !== undefined && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Status: {filters.is_active ? 'Active' : 'Inactive'}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => clearFilter('is_active')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}

              {filters.can_use_pin_auth !== undefined && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  PIN: {filters.can_use_pin_auth ? 'Enabled' : 'Disabled'}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 ml-1"
                    onClick={() => clearFilter('can_use_pin_auth')}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear all
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
