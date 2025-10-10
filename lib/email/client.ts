// lib/email/client.ts

export interface EmailCredentials {
  username: string
  password: string
  email: string
  full_name: string
  store_name?: string
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface WelcomeEmailParams {
  credentials: EmailCredentials
  storeId: string
}

export interface PasswordResetEmailParams {
  credentials: EmailCredentials
  storeId: string
}

/**
 * Send welcome email with login credentials to new employee
 */
export async function sendWelcomeEmail({
  credentials,
  storeId,
}: WelcomeEmailParams): Promise<EmailSendResult> {
  try {
    const response = await fetch('/api/email/send-welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credentials,
        storeId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to send email',
      }
    }

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error: unknown) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Send password reset email to employee
 */
export async function sendPasswordResetEmail({
  credentials,
  storeId,
}: PasswordResetEmailParams): Promise<EmailSendResult> {
  try {
    const response = await fetch('/api/email/send-password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        credentials,
        storeId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to send email',
      }
    }

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error: unknown) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    }
  }
}

/**
 * Get user-friendly error message from email error
 */
export function getEmailErrorMessage(error: string): string {
  const errorMap: Record<string, string> = {
    'Network error': 'Network connection problem. Please check your internet connection.',
    'Invalid email address': 'The email address is not valid.',
    'Email delivery failed': 'Email could not be delivered. Please check the email address.',
    'Rate limit exceeded': 'Too many emails sent. Please wait a few minutes and try again.',
    'Authentication failed': 'Email service authentication failed. Please contact support.',
    'Invalid template': 'Email template error. Please contact support.',
    'Blacklisted email': 'This email address cannot receive emails from our service.',
  }

  // Check for specific error patterns
  for (const [pattern, message] of Object.entries(errorMap)) {
    if (error.toLowerCase().includes(pattern.toLowerCase())) {
      return message
    }
  }

  // Default message for unknown errors
  return 'Email sending failed. Please try again or contact support.'
}
