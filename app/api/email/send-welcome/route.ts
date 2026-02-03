// app/api/email/send-welcome/route.ts

import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API)

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

    // Get store name for email template
    const { data: store } = await supabase
      .schema('business')
      .from('stores')
      .select('store_name')
      .eq('store_id', storeId)
      .single()

    const storeName = store?.store_name || 'lifo'

    // Send the welcome email using Resend
    const { data, error: emailError } = await resend.emails.send({
      from: 'lifo <noreply@lifo-app.com>', // Use resend.dev for testing
      to: [credentials.email],
      subject: `Welcome to ${storeName} - Your Login Credentials`,
      html: generateWelcomeEmailHTML(credentials, storeName),
      text: generateWelcomeEmailText(credentials, storeName),
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return NextResponse.json(
        { success: false, error: emailError.message || 'Failed to send email' },
        { status: 500 },
      )
    }

    // Update the email delivery record with the sent status
    try {
      await supabase
        .schema('user_mgmt')
        .from('email_deliveries')
        .update({
          status: 'sent',
          resend_email_id: data?.id,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('recipient_email', credentials.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
    } catch (updateError) {
      console.warn('Failed to update email delivery record:', updateError)
      // Don't fail the request if we can't update the record
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
    })
  } catch (error: unknown) {
    console.error('Send welcome email error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}

function generateWelcomeEmailHTML(
  credentials: { username: string; pin: string; email: string; full_name: string },
  storeName: string,
): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${storeName} - Your Login Credentials</title>
    <link href="https://fonts.googleapis.com/css2?family=Raleway:wght@400;600;700&family=Montserrat:wght@400;500;600&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(9, 13, 26, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px; text-align: center;">
                            <img src="https://jrgmetdsohowtxickqij.supabase.co/storage/v1/object/public/brand-assets/logo-white-bg.png" alt="lifo" style="height: 80px;">
                          
                            <h1 style="color: hsl(225 42% 8%); font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; font-family: 'Raleway', sans-serif;">
                                Welcome to lifo!
                            </h1>
                            <p style="color: hsl(225 42% 8%); font-size: 18px; font-weight: 600; line-height: 24px; margin: 8px 0 0 0;">
                                Join your team, ${storeName}!
                            </p>
                            <p style="color: hsl(220 8% 46%); font-size: 14px; line-height: 20px; margin: 8px 0 0 0;">
                                Your employee account has been successfully created
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px;">
                            <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                                Hello <strong>${credentials.full_name}</strong>,
                            </p>
                            
                            <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 24px 0;">
                                Welcome to the team! Your lifo account has been created and you can now access the inventory management system. 🚀
                            </p>
                            
                            <!-- Credentials Box -->
                            <div style="background: linear-gradient(135deg, hsl(252 100% 98%) 0%, hsl(227 100% 98%) 100%); border-radius: 8px; padding: 24px; margin: 0 0 24px 0;">
                                <p style="color: hsl(252 100% 30%); font-size: 16px; font-weight: 600; margin: 0 0 16px 0;">
                                    Your Login Credentials:
                                </p>
                                
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: hsl(252 100% 45%); font-weight: 500; width: 30%;">
                                            Username:
                                        </td>
                                        <td style="padding: 8px 0; color: hsl(225 42% 8%); font-family: monospace; font-weight: 600; font-size: 16px;">
                                            ${credentials.username}
                                        </td>
                                    </tr>
                                </table>
                                
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: hsl(252 100% 45%); font-weight: 500; width: 30%;">
                                            PIN Code:
                                        </td>
                                        <td style="padding: 8px 0; color: hsl(252 100% 57%); font-family: monospace; font-weight: 700; font-size: 20px; letter-spacing: 2px;">
                                            ${credentials.pin}
                                        </td>
                                    </tr>
                                </table>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="padding: 8px 0; color: hsl(252 100% 45%); font-weight: 500; width: 30%;">
                                            Email:
                                        </td>
                                        <td style="padding: 8px 0; color: hsl(225 42% 8%); font-family: monospace; font-weight: 600; font-size: 16px;">
                                            ${credentials.email}
                                        </td>
                                    </tr>
                                </table>
                            </div>
                            
                            <!-- Instructions -->
                            <div style="background: linear-gradient(135deg, hsl(227 100% 98%) 0%, hsl(227 100% 95%) 100%); border-radius: 8px; padding: 24px; margin: 0 0 24px 0;">
                                <p style="color: hsl(227 100% 40%); font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">
                                    How to Log In:
                                </p>
                                <ol style="color: hsl(227 100% 35%); font-size: 14px; line-height: 20px; margin: 0; padding-left: 20px;">
                                    <li>Open the lifo app on the store tablet</li>
                                    <li>Select the <strong>"Employee"</strong> tab</li>
                                    <li>Enter your username and PIN code</li>
                                    <li>Start scanning products and managing inventory</li>
                                </ol>
                            </div>
                            
                            <!-- Security Notice -->
                            <div style="background-color: hsl(252 100% 100%); border-radius: 8px; padding: 16px; margin: 0 0 24px 0;">
                                <p style="color: hsl(227 100% 58%); font-size: 14px; line-height: 20px; margin: 0;">
                                    <strong>Important:</strong> Keep your credentials secure and don't share them with anyone. Your PIN code can be reset at any time by your manager.
                                </p>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 24px 40px; background: linear-gradient(135deg, hsl(225 42% 8%) 0%, hsl(225 42% 12%) 100%); border-radius: 0 0 12px 12px; text-align: center;">
                            <p style="color: hsl(220 8% 65%); font-size: 14px; margin: 0 0 8px 0;">
                                Need help? Contact your manager
                            </p>
                            <p style="color: hsl(220 8% 46%); font-size: 12px; margin: 0;">
                                © 2025 lifo - Smart Food Surplus Management
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `
}

function generateWelcomeEmailText(
  credentials: { username: string; pin: string; email: string; full_name: string },
  storeName: string,
): string {
  return `
Welcome to ${storeName}

Hello ${credentials.full_name},

Welcome to the team! Your lifo account has been successfully created.

YOUR LOGIN CREDENTIALS:
• Username: ${credentials.username}
• PIN Code: ${credentials.pin}
• Email: ${credentials.email}

HOW TO LOG IN:
1. Open the lifo app on the store tablet
2. Select the "Employee" tab
3. Enter your username and PIN code
4. Start scanning products and managing inventory

Important: Keep your credentials secure and don't share them with anyone. Your PIN code can be reset at any time by your manager.

Need help? Contact your manager

© 2025 lifo - Intelligent Food Waste Reduction
  `
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
