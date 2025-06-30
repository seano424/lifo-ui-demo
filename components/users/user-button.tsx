'use client'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/use-users'
import { UserIcon } from 'lucide-react'

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

  return (
    <Button asLink href="/profile" variant="outline" size="sm">
      <UserIcon className="w-4 h-4" />
      {user.profile.full_name || user.auth.email}
    </Button>
  )
}
