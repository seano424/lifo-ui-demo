// lib/email/client.ts
import { type EmailCredentials } from './resend'

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface EmailSendOptions {
  credentials: EmailCredentials
  storeId?: string
  deliveryId?: string
}

/**
 * Send welcome email with login credentials to new employee
 */
export async function sendWelcomeEmail(options: EmailSendOptions): Promise<EmailSendResult> {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'welcome',
        credentials: options.credentials,
        store_id: options.storeId,
        delivery_id: options.deliveryId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error: any) {
    console.error('Failed to send welcome email:', error)
    return {
      success: false,
      error: error.message || 'Network error while sending email',
    }
  }
}

/**
 * Send PIN reset email to employee
 */
export async function sendPinResetEmail(options: EmailSendOptions): Promise<EmailSendResult> {
  try {
    const response = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'pin_reset',
        credentials: options.credentials,
        store_id: options.storeId,
        delivery_id: options.deliveryId,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    return {
      success: true,
      messageId: result.messageId,
    }
  } catch (error: any) {
    console.error('Failed to send PIN reset email:', error)
    return {
      success: false,
      error: error.message || 'Network error while sending email',
    }
  }
}

/**
 * Retry sending an email (useful for failed deliveries)
 */
export async function retryEmailDelivery(
  type: 'welcome' | 'pin_reset',
  options: EmailSendOptions,
): Promise<EmailSendResult> {
  if (type === 'welcome') {
    return sendWelcomeEmail(options)
  } else {
    return sendPinResetEmail(options)
  }
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Get user-friendly error message for email errors
 */
export function getEmailErrorMessage(error: string): string {
  if (error.includes('Authentication required')) {
    return 'Vous devez être connecté pour envoyer des emails'
  }

  if (error.includes('Permission denied')) {
    return "Vous n'avez pas les permissions pour envoyer des emails pour ce magasin"
  }

  if (error.includes('Invalid email')) {
    return "L'adresse email n'est pas valide"
  }

  if (error.includes('Network error') || error.includes('Failed to fetch')) {
    return 'Erreur de connexion. Vérifiez votre connexion internet.'
  }

  if (error.includes('HTTP 429')) {
    return "Trop de tentatives d'envoi. Réessayez dans quelques minutes."
  }

  if (error.includes('HTTP 5')) {
    return 'Erreur du serveur email. Réessayez plus tard.'
  }

  // Return original error for development, generic message for production
  return process.env.NODE_ENV === 'development'
    ? error
    : "Erreur lors de l'envoi de l'email. Réessayez plus tard."
}
