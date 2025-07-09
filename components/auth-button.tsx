import Link from 'next/link'
import { Button } from './ui/button'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from './logout-button'

export async function AuthButton() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user ? (
    <div className="flex items-center gap-4">
      <LogoutButton />
      <Button asChild size="default" variant={'brand'}>
        <Link href="/dashboard">Go to dashboard</Link>
      </Button>
    </div>
  ) : (
    <div className="flex gap-10 items-center uppercase">
      <Link
        className="text-xs dark:hover:text-brand-secondary hover:text-brand-primary"
        href="/auth/login"
      >
        Login
      </Link>

      <Button asChild size="sm" variant={'brandSecondary'} className="uppercase">
        <Link href="/onboarding/create-account">Business Signup</Link>
      </Button>
    </div>
  )
}
