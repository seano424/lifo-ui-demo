// app/api/auth/pin-login/route.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { username, pin } = body

    if (!username || !pin) {
      return NextResponse.json(
        { success: false, error: 'Username and PIN are required' },
        { status: 400 },
      )
    }

    // Validate PIN using your existing RPC
    const { data: result, error } = await supabase.rpc('validate_pin_login', {
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
        { success: false, error: result?.error || 'Invalid username or PIN' },
        { status: 401 },
      )
    }

    // PIN validation succeeded!
    // Since your RPC already handles all the security (PIN validation, lockouts, etc.),
    // we can trust that this user is legitimate.
    // Return the user data and let the client create a session using signInWithPassword
    // or a temporary token approach.

    return NextResponse.json({
      success: true,
      user: result.user,
      // Include a temporary token for the client to use
      temp_auth_token: generateTempToken(result.user.id),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    })
  } catch (error: unknown) {
    console.error('PIN login API error:', error)
    return NextResponse.json(
      { success: false, error: 'Login service unavailable' },
      { status: 500 },
    )
  }
}

// Simple temporary token generator for PIN auth
function generateTempToken(userId: string): string {
  const timestamp = Date.now().toString()
  const random = Math.random().toString(36).substring(2)
  return Buffer.from(`${userId}:${timestamp}:${random}`).toString('base64')
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
