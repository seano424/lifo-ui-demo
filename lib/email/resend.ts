// lib/email/resend.ts
import { Resend } from 'resend'

if (!process.env.RESEND_API) {
  throw new Error('RESEND_API environment variable is required')
}

const resend = new Resend(process.env.RESEND_API)

export interface EmailCredentials {
  username: string
  password: string
  email: string
  full_name: string
  store_name?: string
}

export interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send welcome email with login credentials to new employee
 */
export async function sendWelcomeEmail(
  credentials: EmailCredentials,
): Promise<EmailDeliveryResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'LIFO <noreply@lifo-app.com>', // Your verified domain
      to: [credentials.email],
      subject: `Bienvenue chez ${credentials.store_name || 'LIFO'} - Vos identifiants de connexion`,
      html: generateWelcomeEmailHTML(credentials),
      text: generateWelcomeEmailText(credentials),
    })

    if (error) {
      console.error('Resend error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email',
      }
    }

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error: unknown) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    }
  }
}

/**
 * Send password reset email to employee
 */
export async function sendPasswordResetEmail(
  credentials: EmailCredentials,
): Promise<EmailDeliveryResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: 'LIFO <noreply@lifo-app.com>', // Your verified domain
      to: [credentials.email],
      subject: `LIFO - Nouveau mot de passe généré`,
      html: generatePasswordResetEmailHTML(credentials),
      text: generatePasswordResetEmailText(credentials),
    })

    if (error) {
      console.error('Resend error:', error)
      return {
        success: false,
        error: error.message || 'Failed to send email',
      }
    }

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error: unknown) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error',
    }
  }
}

/**
 * Generate HTML content for welcome email
 */
function generateWelcomeEmailHTML(credentials: EmailCredentials): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenue chez LIFO</title>
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
        .password-value {
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
        .support-link {
            color: #3b82f6;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">L</div>
            <h1 style="margin: 0; color: #1e293b;">Bienvenue chez ${credentials.store_name || 'LIFO'}</h1>
            <p style="margin: 8px 0 0 0; color: #64748b;">Votre compte employé a été créé avec succès</p>
        </div>

        <p>Bonjour <strong>${credentials.full_name}</strong>,</p>

        <p>Bienvenue dans l'équipe ! Votre compte LIFO a été créé et vous pouvez maintenant accéder au système de gestion des stocks.</p>

        <div class="credentials-box">
            <h3 style="margin: 0 0 16px 0; color: #1e293b;">Vos identifiants de connexion :</h3>

            <div class="credential-item">
                <span class="credential-label">Nom d'utilisateur :</span>
                <span class="credential-value">${credentials.username}</span>
            </div>

            <div class="credential-item">
                <span class="credential-label">Mot de passe :</span>
                <span class="credential-value password-value">${credentials.password}</span>
            </div>

            <div class="credential-item">
                <span class="credential-label">Email :</span>
                <span class="credential-value">${credentials.email}</span>
            </div>
        </div>

        <div class="instructions">
            <h3>Comment vous connecter :</h3>
            <ol class="steps">
                <li>Ouvrez l'application LIFO sur la tablette du magasin</li>
                <li>Sélectionnez l'onglet <strong>"Employé"</strong></li>
                <li>Saisissez votre nom d'utilisateur et votre mot de passe</li>
                <li>Commencez à scanner les produits et gérer l'inventaire</li>
            </ol>
        </div>

        <p><strong>Important :</strong> Gardez vos identifiants en sécurité et ne les partagez avec personne. Votre mot de passe peut être réinitialisé à tout moment par votre responsable.</p>

        <div class="footer">
            <p>Besoin d'aide ? Contactez votre responsable ou <a href="mailto:support@lifo.ai" class="support-link">notre support</a></p>
            <p style="margin: 8px 0 0 0;">© 2025 LIFO - Réduction intelligente du gaspillage alimentaire</p>
        </div>
    </div>
</body>
</html>
  `
}

/**
 * Generate plain text content for welcome email
 */
function generateWelcomeEmailText(credentials: EmailCredentials): string {
  return `
Bienvenue chez ${credentials.store_name || 'LIFO'}

Bonjour ${credentials.full_name},

Bienvenue dans l'équipe ! Votre compte LIFO a été créé avec succès.

VOS IDENTIFIANTS DE CONNEXION :
• Nom d'utilisateur : ${credentials.username}
• Mot de passe : ${credentials.password}
• Email : ${credentials.email}

COMMENT VOUS CONNECTER :
1. Ouvrez l'application LIFO sur la tablette du magasin
2. Sélectionnez l'onglet "Employé"
3. Saisissez votre nom d'utilisateur et votre mot de passe
4. Commencez à scanner les produits et gérer l'inventaire

Important : Gardez vos identifiants en sécurité et ne les partagez avec personne. Votre mot de passe peut être réinitialisé à tout moment par votre responsable.

Besoin d'aide ? Contactez votre responsable ou notre support : support@lifo.ai

© 2025 LIFO - Réduction intelligente du gaspillage alimentaire
  `
}

/**
 * Generate HTML content for password reset email
 */
function generatePasswordResetEmailHTML(credentials: EmailCredentials): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouveau mot de passe - LIFO</title>
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
            background: linear-gradient(135deg, #f59e0b, #d97706);
            border-radius: 12px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 24px;
        }
        .alert-box {
            background: #fef3c7;
            border: 2px solid #f59e0b;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
            text-align: center;
        }
        .new-pin {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            font-size: 32px;
            font-weight: bold;
            color: #d97706;
            letter-spacing: 4px;
            margin: 16px 0;
        }
        .credentials-summary {
            background: #f1f5f9;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
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
            <div class="logo">🔑</div>
            <h1 style="margin: 0; color: #1e293b;">Nouveau mot de passe généré</h1>
            <p style="margin: 8px 0 0 0; color: #64748b;">Votre mot de passe a été réinitialisé</p>
        </div>

        <p>Bonjour <strong>${credentials.full_name}</strong>,</p>

        <p>Un nouveau mot de passe a été généré pour votre compte LIFO chez ${credentials.store_name || 'votre magasin'}.</p>

        <div class="alert-box">
            <h3 style="margin: 0 0 8px 0; color: #92400e;">Votre nouveau mot de passe :</h3>
            <div class="new-pin">${credentials.password}</div>
            <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">Ce mot de passe est actif immédiatement</p>
        </div>

        <div class="credentials-summary">
            <h4 style="margin: 0 0 12px 0; color: #1e293b;">Rappel de vos identifiants :</h4>
            <p style="margin: 4px 0;"><strong>Nom d'utilisateur :</strong> <code>${credentials.username}</code></p>
            <p style="margin: 4px 0;"><strong>Nouveau mot de passe :</strong> <code>${credentials.password}</code></p>
            <p style="margin: 4px 0;"><strong>Email :</strong> ${credentials.email}</p>
        </div>

        <p><strong>Important :</strong> Votre ancien mot de passe ne fonctionne plus. Utilisez uniquement ce nouveau mot de passe pour vous connecter.</p>

        <p>Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement votre responsable.</p>

        <div class="footer">
            <p>Questions ? Contactez votre responsable ou <a href="mailto:support@lifo.ai" style="color: #3b82f6;">notre support</a></p>
            <p style="margin: 8px 0 0 0;">© 2025 LIFO</p>
        </div>
    </div>
</body>
</html>
  `
}

/**
 * Generate plain text content for password reset email
 */
function generatePasswordResetEmailText(credentials: EmailCredentials): string {
  return `
LIFO - Nouveau mot de passe généré

Bonjour ${credentials.full_name},

Un nouveau mot de passe a été généré pour votre compte LIFO.

VOTRE NOUVEAU MOT DE PASSE : ${credentials.password}

RAPPEL DE VOS IDENTIFIANTS :
• Nom d'utilisateur : ${credentials.username}
• Nouveau mot de passe : ${credentials.password}
• Email : ${credentials.email}

Important : Votre ancien mot de passe ne fonctionne plus. Utilisez uniquement ce nouveau mot de passe pour vous connecter.

Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement votre responsable.

Questions ? Contactez votre responsable ou notre support : support@lifo.ai

© 2025 LIFO
  `
}
