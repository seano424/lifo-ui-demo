// app/api/email/test/route.ts
import { sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/email/resend'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'Test endpoint only available in development' },
      { status: 403 },
    )
  }

  try {
    const body = await request.json()
    const { type, email, name } = body

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'Email and name are required' },
        { status: 400 },
      )
    }

    const testCredentials = {
      username: 'testuser',
      password: '1234',
      email: email,
      full_name: name,
      store_name: 'Test Store lifo',
    }

    let result: { data?: unknown; error?: unknown; success?: boolean; messageId?: string }
    if (type === 'welcome') {
      result = await sendWelcomeEmail(testCredentials)
    } else if (type === 'password_reset') {
      result = await sendPasswordResetEmail(testCredentials)
    } else {
      return NextResponse.json(
        { success: false, error: 'Type must be "welcome" or "password_reset"' },
        { status: 400 },
      )
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
      message: result.success
        ? `Test ${type} email sent successfully to ${email}`
        : `Failed to send test email: ${result.error}`,
    })
  } catch (error: unknown) {
    console.error('Email test error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to send test email'
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Test endpoint only available in development' },
      { status: 403 },
    )
  }

  return NextResponse.json({
    message: 'Email test endpoint',
    usage: {
      method: 'POST',
      body: {
        type: '"welcome" or "pin_reset"',
        email: 'recipient@example.com',
        name: 'Recipient Name',
      },
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      RESEND_API: process.env.RESEND_API ? 'configured' : 'missing',
    },
  })
}
