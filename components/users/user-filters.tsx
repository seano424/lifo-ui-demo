// components/users/user-filters.tsx
'use client'

import { useState } from 'react'
import type { UserFilters as UserFiltersType } from '@/lib/queries/users'

interface UserFiltersProps {
  filters: UserFiltersType
  onFiltersChange: (filters: UserFiltersType) => void
}

export function UserFilters({ filters, onFiltersChange }: UserFiltersProps) {
  const [localEmail, setLocalEmail] = useState(filters.email || '')

  const handleStatusChange = (status: string) => {
    if (status === 'all') {
      const rest = Object.fromEntries(
        Object.entries(filters).filter(([key]) => key !== 'is_active'),
      )
      onFiltersChange(rest)
    } else {
      onFiltersChange({ ...filters, is_active: status === 'active' })
    }
  }

  const handleEmailSearch = () => {
    if (localEmail.trim()) {
      onFiltersChange({ ...filters, email: localEmail.trim() })
    } else {
      const rest = Object.fromEntries(Object.entries(filters).filter(([key]) => key !== 'email'))
      onFiltersChange(rest)
    }
  }

  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEmailSearch()
    }
  }

  const clearFilters = () => {
    setLocalEmail('')
    onFiltersChange({})
  }

  const activeFiltersCount = Object.keys(filters).length

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search by Email */}
        <div className="flex-1">
          <label className="block text-sm font-bold text-gray-700 mb-1">Search by Email</label>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Enter email address..."
              value={localEmail}
              onChange={e => setLocalEmail(e.target.value)}
              onKeyPress={handleEmailKeyPress}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleEmailSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>

        {/* Status Filter */}
        <div className="sm:w-48">
          <label className="block text-sm font-bold text-gray-700 mb-1">Status</label>
          <select
            value={
              filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'
            }
            onChange={e => handleStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Users</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {/* Role Filter (Future Enhancement) */}
        <div className="sm:w-48">
          <label className="block text-sm font-bold text-gray-700 mb-1">Role</label>
          <select
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-2xl bg-gray-50 text-gray-500"
          >
            <option>All Roles (Coming Soon)</option>
          </select>
        </div>
      </div>

      {/* Active Filters & Clear */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Active filters:</span>
            {filters.is_active !== undefined && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-2xl text-xs">
                Status: {filters.is_active ? 'Active' : 'Inactive'}
              </span>
            )}
            {filters.email && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-2xl text-xs">
                Email: {filters.email}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}
