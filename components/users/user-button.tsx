'use client'

import { UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/use-users'

export default function UserButton() {
  const { data: user, isLoading, isError } = useCurrentUser()

  if (isLoading) {
    return <Skeleton className="h-10 w-24" />
  }

  if (isError || !user) {
    return (
      <Button asLink href="/login" variant="outline" size="sm">
        <UserIcon className="w-4 h-4" />
        Sign In
      </Button>
    )
  }

  // const displayName = user.full_name || user.username || user.email?.split('@')[0] || 'User'

  return (
    <Button
      asLink
      size="icon"
      href="/dashboard/settings?tab=account"
      variant="outline"
      className="rounded-full border"
    >
      <UserIcon className="w-4 h-4" />
    </Button>
  )
}
