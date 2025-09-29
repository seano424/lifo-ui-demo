'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function loginWithCredentials(_prevState: unknown, formData: FormData) {
  const supabase = await createClient()

  const identifier = formData.get('identifier') as string
  const password = formData.get('password') as string

  if (!identifier || !password) {
    return { error: 'Username/email and password are required' }
  }

  try {
    let email = identifier

    // If identifier doesn't contain @, treat it as a username and lookup email
    if (!identifier.includes('@')) {
      const { data: userResult, error: userError } = await supabase.rpc('get_user_by_username', {
        p_username: identifier,
      })

      if (userError) {
        logger.error('LoginAction', 'Failed to lookup user by username:', userError)
        return { error: 'Authentication service error' }
      }

      if (!userResult || !userResult.success || !userResult.user?.email) {
        return { error: 'Invalid credentials' }
      }

      email = userResult.user.email
    }

    // Authenticate with Supabase
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      logger.error('LoginAction', 'Authentication failed:', error)
      return { error: 'Invalid credentials' }
    }

    // Success - redirect using server-side redirect
    // This ensures middleware runs and session cookies propagate before navigation
  } catch (error: unknown) {
    logger.error('LoginAction', 'Unexpected error during login:', error)
    return { error: 'An unexpected error occurred' }
  }

  redirect('/dashboard')
}
