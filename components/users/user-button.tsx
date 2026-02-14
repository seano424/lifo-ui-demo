'use client'

import { UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useCurrentUser } from '@/hooks/use-users'

export default function UserButton() {
  const { data: user, isLoading, isError } = useCurrentUser()

  if (isLoading) {
    return <Skeleton className="h-10 w-10 rounded-full" />
  }

  if (isError || !user) {
    return (
      <Button asLink href="/login" variant="outline" size="sm">
        <UserIcon className="w-4 h-4" />
        Sign In
      </Button>
    )
  }

  return (
    <Button
      asLink
      size="icon"
      href="/dashboard/settings?tab=account"
      variant="outline"
      className="rounded-full border p-0 h-10 w-10"
      aria-label="Account settings"
    >
      <Avatar className="h-9 w-9 rounded-full">
        <AvatarImage src={user.avatar_url || ''} alt={user.full_name || ''} />
        <AvatarFallback className="rounded-full">
          {user.full_name
            ?.split(' ')
            .map(name => name.charAt(0))
            .join('') || <UserIcon className="w-4 h-4" />}
        </AvatarFallback>
      </Avatar>
    </Button>
  )
}
