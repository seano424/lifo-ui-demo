// app/api/email/send-pin-reset/route.ts

import type { EmailCredentials } from '@/lib/email/client'
import { sendPasswordResetEmail } from '@/lib/email/resend'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export async function POST(request: NextRequest) {
  try {
    const { credentials, storeId } = await request.json()

    // Validate required fields
    if (
      !credentials?.email ||
      !credentials?.username ||
      !credentials?.pin ||
      !credentials?.full_name
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required credentials' },
        { status: 400 },
      )
    }

    if (!storeId) {
      return NextResponse.json({ success: false, error: 'Store ID is required' }, { status: 400 })
    }

    // Validate email format to prevent SQL injection or bypass attempts
    const emailSchema = z.string().email()
    const emailValidation = emailSchema.safeParse(credentials.email)
    if (!emailValidation.success) {
      return NextResponse.json({ success: false, error: 'Invalid email format' }, { status: 400 })
    }

    const validatedEmail = emailValidation.data

    // Verify the user is authenticated and has permission
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 },
      )
    }

    // Optional: Get store name for email template
    const { data: store } = await supabase
      .schema('business')
      .from('stores')
      .select('store_name')
      .eq('store_id', storeId)
      .single()

    const emailCredentials: EmailCredentials = {
      ...credentials,
      email: validatedEmail,
      store_name: store?.store_name || 'lifo',
    }

    // Send the PIN reset email
    const result = await sendPasswordResetEmail(emailCredentials)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    // Update the email delivery record with the sent status
    try {
      await supabase
        .schema('user_mgmt')
        .from('email_deliveries')
        .update({
          status: 'sent',
          resend_email_id: result.messageId,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('recipient_email', validatedEmail)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
    } catch (updateError) {
      console.warn('Failed to update email delivery record:', updateError)
      // Don't fail the request if we can't update the record
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    })
  } catch (error: unknown) {
    console.error('Send PIN reset email error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
