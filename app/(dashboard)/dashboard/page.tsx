import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .schema('integrations')
    .from('square_connections')
    .select('connection_id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    // Don't gate on a failed query — fall through to dashboard
    console.error('Failed to check Square connection:', error)
  } else if (!data) {
    redirect('/onboarding/setup')
  }

  return (
    <div className="container py-6 lg:py-8">
      <DashboardContent />
    </div>
  )
}
