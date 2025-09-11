'use client'

import { Typography } from '@/components/ui/typography'
import { useUserRoles } from '@/hooks/use-users'
import type { User } from '@/lib/types/user'

interface UserCardProps {
  user: User
  onActivate: () => void
  onDeactivate: () => void
  isUpdating: boolean
}

export function UserCard({ user, onActivate, onDeactivate, isUpdating }: UserCardProps) {
  const { data: roles = [], isLoading: rolesLoading } = useUserRoles(user.id)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const getDisplayName = (user: User): string => {
    // Priority: full_name -> username -> email
    if (user.full_name?.trim()) {
      return user.full_name
    }
    if (user.username?.trim()) {
      return user.username
    }
    return user.email || 'Unknown User'
  }

  const getInitials = (user: User): string => {
    const displayName = getDisplayName(user)

    if (user.full_name?.includes(' ')) {
      // For full names with spaces, take first letter of each word
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    // For usernames or single names, take first 2 characters
    return displayName.slice(0, 2).toUpperCase()
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-primary-100 text-primary-800' : 'bg-red-100 text-red-800'
  }

  const displayName = getDisplayName(user)
  const initials = getInitials(user)

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
            {initials}
          </div>

          <div>
            <Typography variant="h3">{displayName}</Typography>
            {user.username && user.username !== displayName && (
              <Typography variant="p" color="muted">
                @{user.username}
              </Typography>
            )}
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
          <span>Last login: {formatDate(user.last_login || null)}</span>
        </div>
      </div>

      {/* Roles */}
      <div className="mb-4">
        <Typography variant="p" color="muted" className="text-xs uppercase tracking-wide mb-1">
          ROLES
        </Typography>
        {rolesLoading ? (
          <div className="text-sm text-gray-500">Loading roles...</div>
        ) : roles.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {roles.map((role, index) => (
              <span
                key={role || `role-${index}`}
                className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
              >
                {role}
              </span>
            ))}
          </div>
        ) : (
          <Typography variant="p" color="muted" className="text-sm">
            No roles assigned
          </Typography>
        )}
      </div>

      {/* User Info */}
      {user.requires_pin && (
        <div className="mb-4">
          <span className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded">
            PIN Required
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-2xl hover:bg-gray-50"
          disabled={isUpdating}
        >
          Edit
        </button>

        {user.is_active ? (
          <button
            type="button"
            onClick={onDeactivate}
            disabled={isUpdating}
            className="px-3 py-2 text-sm text-red-600 border border-red-300 rounded-2xl hover:bg-red-50 disabled:opacity-50"
          >
            {isUpdating ? '...' : 'Deactivate'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onActivate}
            disabled={isUpdating}
            className="px-3 py-2 text-sm text-primary-600 border border-primary-300 rounded-2xl hover:bg-primary-50 disabled:opacity-50"
          >
            {isUpdating ? '...' : 'Activate'}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <Typography variant="p" color="muted" className="text-sm">
          Joined {formatDate(user.created_at)}
        </Typography>
      </div>
    </div>
  )
}
