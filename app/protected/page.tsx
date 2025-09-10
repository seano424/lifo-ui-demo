import { InfoIcon } from 'lucide-react'
import { redirect } from 'next/navigation'
import { FetchDataSteps } from '@/components/tutorial/fetch-data-steps'
import { Typography } from '@/components/ui/typography'
import { createClient } from '@/lib/supabase/server'

export default async function ProtectedPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/auth/login')
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-2xl text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          This is a protected page that you can only see as an authenticated user
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <Typography variant="h2">Your user details</Typography>
        <pre className="text-xs font-mono p-3 rounded-2xl border max-h-32 overflow-auto">
          {JSON.stringify(data.user, null, 2)}
        </pre>
      </div>
      <div>
        <Typography variant="h2">Next steps</Typography>
        <FetchDataSteps />
      </div>
    </div>
  )
}
