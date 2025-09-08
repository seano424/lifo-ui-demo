import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')
  const type = searchParams.get('type') // recovery, signup, email_change, etc.

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Determine where to redirect based on auth type
      if (type === 'recovery') {
        // Password reset - redirect to update password form
        redirect('/auth/update-password')
      } else if (next) {
        // Use the next parameter if provided
        redirect(next)
      } else {
        // Default redirect for successful auth (login/signup)
        redirect('/dashboard')
      }
    } else {
      console.error('Auth callback error:', error)
      // Redirect to error page with error details
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
    }
  }

  // If no code is provided, redirect to login
  redirect('/auth/login?error=No authorization code provided')
}
