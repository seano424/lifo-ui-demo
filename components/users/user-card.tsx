// components/users/user-card.tsx
'use client'

import { useUserRoles } from '@/hooks/use-users'
import type { User } from '@/lib/queries/users'

interface UserCardProps {
  user: User
  onActivate: () => void
  onDeactivate: () => void
  isUpdating: boolean
}

export function UserCard({ user, onActivate, onDeactivate, isUpdating }: UserCardProps) {
  const { data: roles = [], isLoading: rolesLoading } = useUserRoles(user.user_id)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const getStatusColor = (isActive: boolean | null) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
            {getInitials(user.full_name, user.email)}
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">{user.full_name || 'No name'}</h3>
            <p className="text-sm text-gray-600">@{user.username}</p>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.is_active)}`}
        >
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span className="truncate">{user.email}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Last login: {formatDate(user.last_login)}</span>
        </div>
      </div>

      {/* Roles */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-700 mb-2">ROLES</p>
        {rolesLoading ? (
          <div className="text-sm text-gray-500">Loading roles...</div>
        ) : roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {roles.map((role, index) => (
              <span key={index} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                {role}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-500">No roles assigned</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={isUpdating}
        >
          Edit
        </button>

        {user.is_active ? (
          <button
            onClick={onDeactivate}
            disabled={isUpdating}
            className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
          >
            {isUpdating ? '...' : 'Deactivate'}
          </button>
        ) : (
          <button
            onClick={onActivate}
            disabled={isUpdating}
            className="px-3 py-2 text-sm text-green-600 border border-green-300 rounded-lg hover:bg-green-50 disabled:opacity-50"
          >
            {isUpdating ? '...' : 'Activate'}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-500">Joined {formatDate(user.created_at)}</p>
      </div>
    </div>
  )
}
