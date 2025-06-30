'use client'

import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/hooks/use-users'

export default function UserButton() {
  const { data: user } = useCurrentUser()

  return <Button>{user?.profile.full_name}</Button>
}
