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
      .from('business.stores')
      .select('store_name')
      .eq('store_id', storeId)
      .single()

    const storeName = store?.store_name || 'LIFO'

    // Send the welcome email using Resend
    const { data, error: emailError } = await resend.emails.send({
      from: 'LIFO <noreply@lifo-app.com>', // Use resend.dev for testing
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

    // Update the PIN delivery record with the sent status
    try {
      await supabase
        .from('user_mgmt.pin_deliveries')
        .update({
          delivery_status: 'sent',
          external_message_id: data?.id,
        })
        .eq('delivery_address', credentials.email)
        .eq('delivery_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
    } catch (updateError) {
      console.warn('Failed to update PIN delivery record:', updateError)
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
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to LIFO</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .email-container {
            background: white;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 32px;
        }
        .logo {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            border-radius: 12px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 24px;
        }
        .credentials-box {
            background: #f1f5f9;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            padding: 24px;
            margin: 24px 0;
        }
        .credential-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .credential-item:last-child {
            border-bottom: none;
        }
        .credential-label {
            font-weight: 600;
            color: #475569;
        }
        .credential-value {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 16px;
            font-weight: 600;
            color: #1e293b;
        }
        .pin-value {
            font-size: 20px;
            color: #3b82f6;
            letter-spacing: 2px;
        }
        .instructions {
            background: #dbeafe;
            border-left: 4px solid #3b82f6;
            padding: 16px;
            margin: 24px 0;
            border-radius: 0 8px 8px 0;
        }
        .instructions h3 {
            margin: 0 0 12px 0;
            color: #1e40af;
        }
        .steps {
            margin: 0;
            padding-left: 20px;
        }
        .steps li {
            margin: 8px 0;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">L</div>
            <h1 style="margin: 0; color: #1e293b;">Welcome to ${storeName}</h1>
            <p style="margin: 8px 0 0 0; color: #64748b;">Your employee account has been successfully created</p>
        </div>

        <p>Hello <strong>${credentials.full_name}</strong>,</p>
        
        <p>Welcome to the team! Your LIFO account has been created and you can now access the inventory management system.</p>

        <div class="credentials-box">
            <h3 style="margin: 0 0 16px 0; color: #1e293b;">Your Login Credentials:</h3>
            
            <div class="credential-item">
                <span class="credential-label">Username:</span>
                <span class="credential-value">${credentials.username}</span>
            </div>
            
            <div class="credential-item">
                <span class="credential-label">PIN Code:</span>
                <span class="credential-value pin-value">${credentials.pin}</span>
            </div>
            
            <div class="credential-item">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${credentials.email}</span>
            </div>
        </div>

        <div class="instructions">
            <h3>How to Log In:</h3>
            <ol class="steps">
                <li>Open the LIFO app on the store tablet</li>
                <li>Select the <strong>"Employee"</strong> tab</li>
                <li>Enter your username and PIN code</li>
                <li>Start scanning products and managing inventory</li>
            </ol>
        </div>

        <p><strong>Important:</strong> Keep your credentials secure and don't share them with anyone. Your PIN code can be reset at any time by your manager.</p>

        <div class="footer">
            <p>Need help? Contact your manager</p>
            <p style="margin: 8px 0 0 0;">© 2025 LIFO - Intelligent Food Waste Reduction</p>
        </div>
    </div>
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

Welcome to the team! Your LIFO account has been successfully created.

YOUR LOGIN CREDENTIALS:
• Username: ${credentials.username}
• PIN Code: ${credentials.pin}
• Email: ${credentials.email}

HOW TO LOG IN:
1. Open the LIFO app on the store tablet
2. Select the "Employee" tab
3. Enter your username and PIN code
4. Start scanning products and managing inventory

Important: Keep your credentials secure and don't share them with anyone. Your PIN code can be reset at any time by your manager.

Need help? Contact your manager

© 2025 LIFO - Intelligent Food Waste Reduction
  `
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
