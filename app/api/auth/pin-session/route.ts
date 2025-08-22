// app/api/auth/pin-session/route.ts

import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

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

    console.log('🔐 PIN login attempt for username:', username)

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

    // Try multiple email formats for backward compatibility
    const possibleEmails = [
      `${username}@lifo-test.com`, // Current test format
      `${username}@seantest.dev`, // New working test format
      `${username}@lifo-employee.internal`, // Future employee format
      username.includes('@') ? username : null, // Direct email if provided
      // Special case for testing: map common test usernames to working email
      username === 'test.employee2' || username === 'john.smith' ? 'soreilly424@gmail.com' : null,
      username === 'testme' ? 'seanpatrickstudios@gmail.com' : null,
    ].filter(Boolean)

    console.log('🔍 Trying email formats:', possibleEmails)

    let signInData: {
      session: { access_token: string; refresh_token: string }
      user: {
        id: string
        email?: string
        user_metadata?: { username?: string; full_name?: string }
        raw_user_meta_data?: { username?: string; full_name?: string }
      }
    } | null = null
    let signInError: Error | null = null

    // Try each email format until one works
    for (const email of possibleEmails) {
      console.log('📧 Attempting login with:', email)

      const result = await supabase.auth.signInWithPassword({
        email: email!,
        password: pin,
      })

      if (!result.error && result.data.session) {
        signInData = result.data
        signInError = null
        console.log('✅ Authentication successful with:', email)
        break
      } else {
        signInError = result.error
        console.log('❌ Authentication failed with:', email, result.error?.message)
      }
    }

    // Check if any authentication succeeded
    if (signInError || !signInData?.session) {
      console.error('🚫 All authentication attempts failed')
      return NextResponse.json(
        { success: false, error: 'Invalid username or PIN' },
        { status: 401 },
      )
    }

    if (!signInData.user) {
      console.error('❓ No user returned from authentication')
      return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 })
    }

    console.log('🎉 PIN authentication successful for:', username)

    // Get username from metadata, override for test cases
    let userUsername =
      signInData.user.user_metadata?.username ||
      (signInData.user as { raw_user_meta_data?: { username?: string } }).raw_user_meta_data
        ?.username ||
      username

    let fullName =
      signInData.user.user_metadata?.full_name ||
      (signInData.user as { raw_user_meta_data?: { full_name?: string } }).raw_user_meta_data
        ?.full_name ||
      userUsername

    // Override for john.smith test user
    if (username === 'john.smith') {
      userUsername = 'john.smith'
      fullName = 'John Smith'
    }

    // Return success with session tokens
    return NextResponse.json({
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
