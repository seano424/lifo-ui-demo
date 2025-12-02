// app/api/test-email/route.ts
// Test endpoint for email templates
// Usage: http://localhost:3000/api/test-email?email=your@email.com&lang=en&type=welcome

import {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  type EmailDeliveryResult,
} from '@/lib/email/resend'
import type { SupportedLanguage } from '@/lib/email/resend'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')
  const language = (searchParams.get('lang') || 'fr') as SupportedLanguage
  const type = searchParams.get('type') || 'welcome'

  if (!email) {
    return NextResponse.json(
      { error: 'Email parameter is required. Usage: ?email=your@email.com&lang=en&type=welcome' },
      { status: 400 },
    )
  }

  const credentials = {
    username: 'test_user',
    password: '123456',
    email,
    full_name: 'Test User',
    store_name: 'Test Store',
    language,
  }

  try {
    let result: EmailDeliveryResult
    if (type === 'welcome') {
      result = await sendWelcomeEmail(credentials)
    } else if (type === 'reset') {
      result = await sendPasswordResetEmail(credentials)
    } else {
      return NextResponse.json({ error: 'Invalid type. Use "welcome" or "reset"' }, { status: 400 })
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${type} email sent in ${language.toUpperCase()}`,
        messageId: result.messageId,
      })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
