'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { headers } from 'next/headers'

interface GetUserByUsernameResult {
  success: boolean
  user?: {
    email: string
    username: string
    full_name: string
  }
}

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
      // Validate username format to prevent injection attacks
      // Username must be 3-20 characters, lowercase letters, numbers, hyphens, underscores only
      const usernameRegex = /^[a-z0-9_-]{3,20}$/
      if (!usernameRegex.test(identifier)) {
        return { error: 'Invalid username format' }
      }

      const { data, error: userError } = await supabase.rpc('get_user_by_username', {
        p_username: identifier,
      })

      if (userError) {
        logger.error('LoginAction', 'Failed to lookup user by username:', userError)
        return { error: 'Authentication service error' }
      }

      const userResult = data as GetUserByUsernameResult | null

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

export async function signInWithGoogle() {
  const supabase = await createClient()
  const headersList = await headers()

  // Get the origin from headers and validate it safely
  // Normalize 127.0.0.1 to localhost for PKCE code verifier compatibility
  const rawOrigin = headersList.get('origin')
  const origin = (() => {
    if (!rawOrigin) return 'http://localhost:3000'

    try {
      const url = new URL(rawOrigin)
      // Normalize 127.0.0.1 to localhost
      if (url.hostname === '127.0.0.1') {
        url.hostname = 'localhost'
      }
      // Validate it's a safe origin (localhost or your domain)
      if (url.hostname !== 'localhost' && !url.hostname.endsWith('.vercel.app')) {
        return 'http://localhost:3000'
      }
      return url.origin
    } catch {
      return 'http://localhost:3000'
    }
  })()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    logger.error('GoogleSignIn', 'Failed to initiate Google sign-in:', error)
    return { error: 'Failed to sign in with Google' }
  }

  if (data?.url) {
    // Return the URL for client-side redirect instead of server-side redirect
    // This prevents the "error" toast from showing before redirect
    return { url: data.url }
  }

  return { error: 'Failed to get authorization URL' }
}
