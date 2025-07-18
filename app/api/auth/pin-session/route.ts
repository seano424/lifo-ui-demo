// app/api/auth/pin-session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    // First validate the PIN using regular client
    const regularClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { data: result, error } = await regularClient.rpc('validate_pin_login', {
      p_username: username,
      p_pin: pin,
    })

    if (error) {
      console.error('PIN validation RPC error:', error)
      return NextResponse.json(
        { success: false, error: 'Authentication service error' },
        { status: 500 },
      )
    }

    if (!result || !result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result?.error || 'Invalid username or PIN',
          isLocked: result?.is_locked,
          attemptsRemaining: result?.attempts_remaining,
        },
        { status: 401 },
      )
    }

    console.log('PIN validation successful, user data:', result.user)

    // PIN validation succeeded!
    // For now, let's return success and handle session creation differently
    console.log('PIN validation successful for user:', result.user.username)

    return NextResponse.json({
      success: true,
      user: result.user,
      message: 'PIN authentication successful',
      // We'll handle session creation on the client side using a different approach
    })
  } catch (error: unknown) {
    console.error('PIN session API error:', error)
    return NextResponse.json(
      { success: false, error: 'Login service unavailable' },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
