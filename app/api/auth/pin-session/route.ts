// app/api/auth/pin-session/route.ts

import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limiter'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, pin } = body

    if (!username || !pin) {
      return NextResponse.json(
        { success: false, error: 'Username and PIN are required' },
        { status: 400 },
      )
    }

    // Check rate limiting before processing authentication
    const rateLimit = checkRateLimit(request, username)
    if (!rateLimit.allowed) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Too many authentication attempts. Please try again later.',
        },
        { status: 429 },
      )

      // Add rate limit headers
      Object.entries(rateLimit.headers).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      return response
    }

    // Create admin Supabase client for user management
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // First, look up the user by username to get their actual email
    let userEmail: string | null = null

    // If the username contains @, treat it as an email
    if (username.includes('@')) {
      userEmail = username
    } else {
      // Look up user by username using optimized function
      const { data: userResult, error: userError } = await supabase.rpc('get_user_by_username', {
        p_username: username,
      })

      if (userError) {
        console.error('🚫 Failed to lookup user by username:', userError)
        return NextResponse.json(
          { success: false, error: 'Authentication service error' },
          { status: 500 },
        )
      }

      if (userResult && userResult.length > 0 && userResult[0].email) {
        userEmail = userResult[0].email
        console.log(`✅ Found user by username ${username}: ${userEmail}`)
      } else {
        console.log(`❌ No user found with username: ${username}`)
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or PIN' },
        { status: 401 },
      )
    }

    // Now authenticate with the found email and PIN
    const result = await supabase.auth.signInWithPassword({
      email: userEmail,
      password: pin,
    })

    if (result.error || !result.data.session) {
      console.error('🚫 Authentication failed for', userEmail, ':', result.error?.message)
      return NextResponse.json(
        { success: false, error: 'Invalid username or PIN' },
        { status: 401 },
      )
    }

    const signInData = result.data

    if (!signInData.user) {
      console.error('❓ No user returned from authentication')
      return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 })
    }

    // Get username and full name from metadata
    const rawMetadata =
      (signInData.user as { raw_user_meta_data?: Record<string, unknown> }).raw_user_meta_data || {}
    const userMetadata = signInData.user.user_metadata || {}

    const userUsername = rawMetadata.username || userMetadata.username || username

    const fullName = rawMetadata.full_name || userMetadata.full_name || userUsername

    // Return success with session tokens
    const successResponse = NextResponse.json({
      success: true,
      user: {
        id: signInData.user.id,
        email: signInData.user.email || '',
        username: userUsername,
        full_name: fullName,
        role: 'employee',
      },
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    })

    // Add rate limit headers to successful responses too
    Object.entries(rateLimit.headers).forEach(([key, value]) => {
      successResponse.headers.set(key, value)
    })

    return successResponse
  } catch (error: unknown) {
    console.error('💥 PIN authentication error:', error)
    return NextResponse.json(
      { success: false, error: 'Authentication service error' },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
