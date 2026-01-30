// app/api/email/send/route.ts
import { type EmailCredentials, sendPasswordResetEmail, sendWelcomeEmail } from '@/lib/email/resend'
import { createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export interface EmailRequest {
  type: 'welcome' | 'password_reset'
  credentials: EmailCredentials
  store_id?: string
  delivery_id?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
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

    const body: EmailRequest = await request.json()
    const { type, credentials, store_id, delivery_id } = body

    // Validate request
    if (
      !type ||
      !credentials ||
      !credentials.email ||
      !credentials.username ||
      !credentials.password
    ) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 },
      )
    }

    // Check if user has permission to send emails for this store (if store_id provided)
    if (store_id) {
      const { data: storeAccess } = await supabase
        .from('business.store_users')
        .select('role_in_store')
        .eq('store_id', store_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (!storeAccess || !['owner', 'manager'].includes(storeAccess.role_in_store)) {
        return NextResponse.json(
          { success: false, error: 'Permission denied for this store' },
          { status: 403 },
        )
      }
    }

    // Get store information for email context
    let storeName = 'lifo'
    if (store_id) {
      const { data: storeData } = await supabase
        .from('business.stores')
        .select('store_name, business_name')
        .eq('store_id', store_id)
        .single()

      if (storeData) {
        storeName = storeData.business_name || storeData.store_name || 'lifo'
      }
    }

    // Enhance credentials with store name
    const enhancedCredentials = {
      ...credentials,
      store_name: storeName,
    }

    // Send appropriate email
    let emailResult: { data?: unknown; error?: unknown; success?: boolean; messageId?: string }
    if (type === 'welcome') {
      emailResult = await sendWelcomeEmail(enhancedCredentials)
    } else if (type === 'password_reset') {
      emailResult = await sendPasswordResetEmail(enhancedCredentials)
    } else {
      return NextResponse.json({ success: false, error: 'Invalid email type' }, { status: 400 })
    }

    // Update delivery status in database if delivery_id provided
    if (delivery_id && emailResult.success) {
      try {
        await supabase
          .from('user_mgmt.pin_deliveries')
          .update({
            delivery_status: 'sent',
            delivery_sent_at: new Date().toISOString(),
            external_message_id: emailResult.messageId,
            updated_at: new Date().toISOString(),
          })
          .eq('delivery_id', delivery_id)
      } catch (updateError) {
        console.error('Failed to update delivery status:', updateError)
        // Don't fail the whole request if status update fails
      }
    }

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId,
      message: `${type === 'welcome' ? 'Welcome' : 'PIN reset'} email sent successfully`,
    })
  } catch (error: unknown) {
    console.error('Email API error:', error)

    const errorMessage = error instanceof Error ? error.message : 'Failed to send email'
    const errorStack = error instanceof Error ? error.stack : undefined

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 },
    )
  }
}

// Handle other HTTP methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
