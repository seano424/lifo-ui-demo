'use client'

import { Typography } from '@/components/ui/typography'
import { useActiveUsers, useInactiveUsers, useUsers } from '@/hooks/use-users'

export function UserStats() {
  const { count: totalUsers } = useUsers({}, 1) // Just get count, minimal page size
  const { count: activeUsers } = useActiveUsers()
  const { count: inactiveUsers } = useInactiveUsers()

  const stats = [
    {
      name: 'Total Users',
      value: totalUsers.toLocaleString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: 'blue',
      description: 'All registered users',
    },
    {
      name: 'Active Users',
      value: activeUsers.toLocaleString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'green',
      description: 'Currently active users',
    },
    {
      name: 'Inactive Users',
      value: inactiveUsers.toLocaleString(),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636"
          />
        </svg>
      ),
      color: 'red',
      description: 'Deactivated users',
    },
    {
      name: 'Active Rate',
      value: totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}%` : '0%',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      color: 'purple',
      description: 'Percentage of active users',
    },
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      red: 'bg-red-50 text-red-600 border-red-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.name} className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <Typography variant="p" color="muted">
                {stat.name}
              </Typography>
              <Typography variant="p" color="muted">
                {stat.value}
              </Typography>
              <Typography variant="p" color="muted">
                {stat.description}
              </Typography>
            </div>
            <div className={`p-3 rounded-2xl border ${getColorClasses(stat.color)}`}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
