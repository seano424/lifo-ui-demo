// lib/email/resend.ts
import { Resend } from 'resend'
import { isSupportedLocale, type SupportedLocale } from '@/types/i18n'

if (!process.env.RESEND_API) {
  throw new Error('RESEND_API environment variable is required')
}

const resend = new Resend(process.env.RESEND_API)

export type SupportedLanguage = SupportedLocale

export interface EmailCredentials {
  username: string
  password: string
  email: string
  full_name: string
  store_name?: string
  language?: SupportedLanguage // Language preference for email content
}

export interface EmailDeliveryResult {
  success: boolean
  messageId?: string
  error?: string
}

// ============================================================================
// EMAIL CONTENT TRANSLATIONS
// ============================================================================

interface WelcomeEmailContent {
  subject: (storeName: string) => string
  title: (storeName: string) => string
  subtitle: string
  greeting: (fullName: string) => string
  welcomeMessage: string
  howToLoginTitle: string
  steps: string[]
  importantNote: string
  footerHelp: string
  footerCopyright: string
}

interface PasswordResetEmailContent {
  subject: string
  title: string
  subtitle: string
  greeting: (fullName: string) => string
  resetMessage: (storeName: string) => string
  newPasswordTitle: string
  passwordActiveNote: string
  credentialsSummaryTitle: string
  usernameLabel: string
  newPasswordLabel: string
  emailLabel: string
  importantNote: string
  securityWarning: string
  footerHelp: string
  footerCopyright: string
}

const welcomeEmailTranslations: Record<SupportedLanguage, WelcomeEmailContent> = {
  en: {
    subject: (storeName: string) => `Welcome to ${storeName}!`,
    title: (storeName: string) => `Welcome to ${storeName}!`,
    subtitle: "Thanks for joining the team! We're excited to have you.",
    greeting: (fullName: string) => `Hi ${fullName},`,
    welcomeMessage:
      "Your lifo account is all set up. You can now start scanning products and helping reduce food waste. Let's make an impact together!",
    howToLoginTitle: 'To get started:',
    steps: [
      'Open the lifo app dashboard',
      'Add your store',
      'Add a delivery note, csv, or start scanning to create batches!',
    ],
    importantNote:
      "Keep your login info safe and don't share it with anyone. If you forget your password, your manager can reset it for you anytime.",
    footerHelp: 'Questions? Just ask your manager or reach out to us at support@lifo-app.com',
    footerCopyright: '© 2025 lifo',
  },
  fr: {
    subject: (storeName: string) => `Bienvenue chez ${storeName} !`,
    title: (storeName: string) => `Bienvenue chez ${storeName} !`,
    subtitle: "Merci de rejoindre l'équipe ! Nous sommes ravis de vous accueillir.",
    greeting: (fullName: string) => `Bonjour ${fullName},`,
    welcomeMessage:
      'Votre compte lifo est prêt. Vous pouvez maintenant commencer à scanner les produits et aider à réduire le gaspillage alimentaire. Faisons la différence ensemble !',
    howToLoginTitle: 'Pour commencer :',
    steps: [
      "Ouvrez le tableau de bord de l'application lifo",
      'Ajoutez votre magasin',
      'Ajoutez un bon de livraison, un csv ou commencez à scanner pour créer des lots !',
    ],
    importantNote:
      'Gardez vos identifiants en sécurité et ne les partagez avec personne. Si vous oubliez votre mot de passe, votre responsable peut le réinitialiser à tout moment.',
    footerHelp:
      'Des questions ? Demandez à votre responsable ou contactez-nous à support@lifo-app.com',
    footerCopyright: '© 2025 lifo',
  },
  nl: {
    subject: (storeName: string) => `Welkom bij ${storeName}!`,
    title: (storeName: string) => `Welkom bij ${storeName}!`,
    subtitle: 'Bedankt voor het aansluiten bij het team! We zijn blij je te hebben.',
    greeting: (fullName: string) => `Hallo ${fullName},`,
    welcomeMessage:
      'Uw lifo-account is klaar. U kunt nu beginnen met het scannen van producten en helpen voedselverspilling te verminderen. Laten we samen impact maken!',
    howToLoginTitle: 'Om te beginnen:',
    steps: [
      'Open het lifo-app dashboard',
      'Voeg uw winkel toe',
      'Voeg een leveringsbon, csv toe of begin met scannen om batches te maken!',
    ],
    importantNote:
      'Houd uw inloggegevens veilig en deel ze met niemand. Als u uw wachtwoord vergeet, kan uw manager het op elk moment opnieuw instellen.',
    footerHelp: 'Vragen? Vraag het uw manager of neem contact met ons op via support@lifo-app.com',
    footerCopyright: '© 2025 lifo',
  },
}

const passwordResetEmailTranslations: Record<SupportedLanguage, PasswordResetEmailContent> = {
  en: {
    subject: 'lifo - New Password Generated',
    title: 'New Password Generated',
    subtitle: 'Your password has been reset',
    greeting: (fullName: string) => `Hello <strong>${fullName}</strong>,`,
    resetMessage: (storeName: string) =>
      `A new password has been generated for your lifo account at ${storeName}.`,
    newPasswordTitle: 'Your new password:',
    passwordActiveNote: 'This password is active immediately',
    credentialsSummaryTitle: 'Reminder of your credentials:',
    usernameLabel: 'Username:',
    newPasswordLabel: 'New password:',
    emailLabel: 'Email:',
    importantNote:
      '<strong>Important:</strong> Your old password no longer works. Use only this new password to log in.',
    securityWarning: 'If you did not request this reset, contact your manager immediately.',
    footerHelp:
      'Questions? Contact your manager or <a href="mailto:support@lifo-app" style="color: #3b82f6;">our support</a>',
    footerCopyright: '© 2025 lifo',
  },
  fr: {
    subject: 'lifo - Nouveau mot de passe généré',
    title: 'Nouveau mot de passe généré',
    subtitle: 'Votre mot de passe a été réinitialisé',
    greeting: (fullName: string) => `Bonjour <strong>${fullName}</strong>,`,
    resetMessage: (storeName: string) =>
      `Un nouveau mot de passe a été généré pour votre compte lifo chez ${storeName}.`,
    newPasswordTitle: 'Votre nouveau mot de passe :',
    passwordActiveNote: 'Ce mot de passe est actif immédiatement',
    credentialsSummaryTitle: 'Rappel de vos identifiants :',
    usernameLabel: "Nom d'utilisateur :",
    newPasswordLabel: 'Nouveau mot de passe :',
    emailLabel: 'Email :',
    importantNote:
      '<strong>Important :</strong> Votre ancien mot de passe ne fonctionne plus. Utilisez uniquement ce nouveau mot de passe pour vous connecter.',
    securityWarning:
      "Si vous n'avez pas demandé cette réinitialisation, contactez immédiatement votre responsable.",
    footerHelp:
      'Questions ? Contactez votre responsable ou <a href="mailto:support@lifo-app" style="color: #3b82f6;">notre support</a>',
    footerCopyright: '© 2025 lifo',
  },
  nl: {
    subject: 'lifo - Nieuw wachtwoord gegenereerd',
    title: 'Nieuw wachtwoord gegenereerd',
    subtitle: 'Uw wachtwoord is gereset',
    greeting: (fullName: string) => `Hallo <strong>${fullName}</strong>,`,
    resetMessage: (storeName: string) =>
      `Er is een nieuw wachtwoord gegenereerd voor uw lifo-account bij ${storeName}.`,
    newPasswordTitle: 'Uw nieuwe wachtwoord:',
    passwordActiveNote: 'Dit wachtwoord is onmiddellijk actief',
    credentialsSummaryTitle: 'Herinnering van uw inloggegevens:',
    usernameLabel: 'Gebruikersnaam:',
    newPasswordLabel: 'Nieuw wachtwoord:',
    emailLabel: 'E-mail:',
    importantNote:
      '<strong>Belangrijk:</strong> Uw oude wachtwoord werkt niet meer. Gebruik alleen dit nieuwe wachtwoord om in te loggen.',
    securityWarning:
      'Als u deze reset niet hebt aangevraagd, neem dan onmiddellijk contact op met uw manager.',
    footerHelp:
      'Vragen? Neem contact op met uw manager of <a href="mailto:support@lifo-app" style="color: #3b82f6;">onze support</a>',
    footerCopyright: '© 2025 lifo',
  },
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

/**
 * Send welcome email with login credentials to new employee
 */
export async function sendWelcomeEmail(
  credentials: EmailCredentials,
): Promise<EmailDeliveryResult> {
  try {
    // Validate and default language
    const language: SupportedLanguage =
      credentials.language && isSupportedLocale(credentials.language) ? credentials.language : 'fr' // Default to French
    const content = welcomeEmailTranslations[language]
    const storeName = credentials.store_name || 'lifo'

    const { data, error } = await resend.emails.send({
      from: 'lifo <noreply@lifo-app.com>',
      to: [credentials.email],
      subject: content.subject(storeName),
      html: generateWelcomeEmailHTML(credentials, language, content),
      text: generateWelcomeEmailText(credentials, content),
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
    // Validate and default language
    const language: SupportedLanguage =
      credentials.language && isSupportedLocale(credentials.language) ? credentials.language : 'fr' // Default to French
    const content = passwordResetEmailTranslations[language]

    const { data, error } = await resend.emails.send({
      from: 'lifo <noreply@lifo-app.com>',
      to: [credentials.email],
      subject: content.subject,
      html: generatePasswordResetEmailHTML(credentials, language, content),
      text: generatePasswordResetEmailText(credentials, content),
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

// ============================================================================
// HTML TEMPLATE GENERATORS
// ============================================================================

/**
 * Generate HTML content for welcome email
 */
function generateWelcomeEmailHTML(
  credentials: EmailCredentials,
  language: SupportedLanguage,
  content: WelcomeEmailContent,
): string {
  const storeName = credentials.store_name || 'lifo'

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title(storeName)}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
        }
        .email-container {
            background: white;
            padding: 20px;
        }
        .logo {
            margin-bottom: 16px;
        }
        .logo img {
            max-width: 80px;
            height: auto;
            display: block;
        }
        h1 {
            color: #1e293b;
            font-size: 24px;
            margin-bottom: 8px;
        }
        p {
            margin: 12px 0;
            color: #374151;
        }
        .steps {
            margin: 16px 0;
            padding-left: 20px;
        }
        .steps li {
            margin: 6px 0;
        }
        .footer {
            margin-top: 32px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="logo">
            <img src="https://jrgmetdsohowtxickqij.supabase.co/storage/v1/object/public/brand-assets/lifo%20Logo%20Light.png" alt="lifo" />
        </div>

        <h1>${content.title(storeName)}</h1>
        <p style="color: #6b7280; margin-top: 0;">${content.subtitle}</p>

        <p>${content.greeting(credentials.full_name)}</p>

        <p>${content.welcomeMessage}</p>

        <p style="font-weight: 600; margin-bottom: 8px; margin-top: 24px;">${content.howToLoginTitle}</p>
        <ol class="steps">
            ${content.steps.map(step => `<li>${step}</li>`).join('\n            ')}
        </ol>

        <p style="font-size: 14px; color: #6b7280;">${content.importantNote}</p>

        <div class="footer">
            <p style="margin: 0;">${content.footerHelp}</p>
            <p style="margin: 8px 0 0 0;">${content.footerCopyright}</p>
        </div>
    </div>
</body>
</html>
  `
}

/**
 * Generate plain text content for welcome email
 */
function generateWelcomeEmailText(
  credentials: EmailCredentials,
  content: WelcomeEmailContent,
): string {
  const storeName = credentials.store_name || 'lifo'
  const stepsText = content.steps
    .map(
      (step, index) =>
        `${index + 1}. ${step.replace(/<\/?strong>/g, '').replace(/"Employee"/g, 'Employee')}`,
    )
    .join('\n')

  return `
${content.title(storeName)}
${content.subtitle}

${content.greeting(credentials.full_name)}

${content.welcomeMessage}

${content.howToLoginTitle}
${stepsText}

${content.importantNote}

${content.footerHelp.replace(/<a [^>]*>|<\/a>/g, '')}

${content.footerCopyright}
  `
}

/**
 * Generate HTML content for password reset email
 */
function generatePasswordResetEmailHTML(
  credentials: EmailCredentials,
  language: SupportedLanguage,
  content: PasswordResetEmailContent,
): string {
  const storeName = credentials.store_name || 'lifo'

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${content.title}</title>
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
            margin-bottom: 16px;
        }
        .logo img {
            max-width: 80px;
            height: auto;
            display: block;
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
        <div class="logo">
            <img src="https://jrgmetdsohowtxickqij.supabase.co/storage/v1/object/public/brand-assets/lifo%20Logo%20Light.png" alt="lifo" />
        </div>

        <div class="header">
            <h1 style="margin: 0; color: #1e293b;">${content.title}</h1>
            <p style="margin: 8px 0 0 0; color: #64748b;">${content.subtitle}</p>
        </div>

        <p>${content.greeting(credentials.full_name)}</p>

        <p>${content.resetMessage(storeName)}</p>

        <div class="alert-box">
            <h3 style="margin: 0 0 8px 0; color: #92400e;">${content.newPasswordTitle}</h3>
            <div class="new-pin">${credentials.password}</div>
            <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">${content.passwordActiveNote}</p>
        </div>

        <div class="credentials-summary">
            <h4 style="margin: 0 0 12px 0; color: #1e293b;">${content.credentialsSummaryTitle}</h4>
            <p style="margin: 4px 0;"><strong>${content.usernameLabel}</strong> <code>${credentials.username}</code></p>
            <p style="margin: 4px 0;"><strong>${content.newPasswordLabel}</strong> <code>${credentials.password}</code></p>
            <p style="margin: 4px 0;"><strong>${content.emailLabel}</strong> ${credentials.email}</p>
        </div>

        <p>${content.importantNote}</p>

        <p>${content.securityWarning}</p>

        <div class="footer">
            <p>${content.footerHelp}</p>
            <p style="margin: 8px 0 0 0;">${content.footerCopyright}</p>
        </div>
    </div>
</body>
</html>
  `
}

/**
 * Generate plain text content for password reset email
 */
function generatePasswordResetEmailText(
  credentials: EmailCredentials,
  content: PasswordResetEmailContent,
): string {
  const storeName = credentials.store_name || 'lifo'

  return `
lifo - ${content.title}

${content.greeting(credentials.full_name).replace(/<\/?strong>/g, '')}

${content.resetMessage(storeName)}

${content.newPasswordTitle.toUpperCase()} ${credentials.password}

${content.credentialsSummaryTitle.toUpperCase()}
• ${content.usernameLabel} ${credentials.username}
• ${content.newPasswordLabel} ${credentials.password}
• ${content.emailLabel} ${credentials.email}

${content.importantNote.replace(/<\/?strong>/g, '')}

${content.securityWarning}

${content.footerHelp.replace(/<a [^>]*>|<\/a>/g, '')}

${content.footerCopyright}
  `
}
