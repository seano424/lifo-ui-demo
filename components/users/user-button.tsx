'use client'

import { UserIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/use-users'
import Image from 'next/image'

function UserButtonContent() {
  const { data: user, isLoading, isError } = useCurrentUser()
  const [imgError, setImgError] = useState(false)

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
      {user.avatar_url && !imgError ? (
        <Image
          src={user.avatar_url}
          alt={user.full_name || ''}
          width={36}
          height={36}
          className="rounded-full"
          onError={() => setImgError(true)}
        />
      ) : (
        <UserIcon className="w-4 h-4" />
      )}
    </Button>
  )
}

export default function UserButton() {
  const [mounted, setMounted] = useState(false)

  // Ensure component only renders on client after QueryClientProvider is ready
  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything until client-side mount completes
  // This ensures QueryClientProvider is available before calling React Query hooks
  if (!mounted) {
    return <Skeleton className="h-10 w-10 rounded-full" />
  }

  return <UserButtonContent />
}
