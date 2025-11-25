// lib/email/resend.ts
import { Resend } from 'resend'

if (!process.env.RESEND_API) {
  throw new Error('RESEND_API environment variable is required')
}

const resend = new Resend(process.env.RESEND_API)

export type SupportedLanguage = 'en' | 'fr' | 'nl'

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
  credentialsTitle: string
  usernameLabel: string
  passwordLabel: string
  emailLabel: string
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
    subject: (storeName: string) => `Welcome to ${storeName} - Your Login Credentials`,
    title: (storeName: string) => `Welcome to ${storeName}`,
    subtitle: 'Your employee account has been successfully created',
    greeting: (fullName: string) => `Hello <strong>${fullName}</strong>,`,
    welcomeMessage:
      'Welcome to the team! Your LIFO account has been created and you can now access the inventory management system.',
    credentialsTitle: 'Your login credentials:',
    usernameLabel: 'Username:',
    passwordLabel: 'Password:',
    emailLabel: 'Email:',
    howToLoginTitle: 'How to log in:',
    steps: [
      'Open the LIFO app on the store tablet',
      'Select the <strong>"Employee"</strong> tab',
      'Enter your username and password',
      'Start scanning products and managing inventory',
    ],
    importantNote:
      "<strong>Important:</strong> Keep your credentials secure and don't share them with anyone. Your password can be reset at any time by your manager.",
    footerHelp:
      'Need help? Contact your manager or <a href="mailto:support@lifo-app" class="support-link">our support</a>',
    footerCopyright: '© 2025 LIFO - Smart Food Waste Reduction',
  },
  fr: {
    subject: (storeName: string) => `Bienvenue chez ${storeName} - Vos identifiants de connexion`,
    title: (storeName: string) => `Bienvenue chez ${storeName}`,
    subtitle: 'Votre compte employé a été créé avec succès',
    greeting: (fullName: string) => `Bonjour <strong>${fullName}</strong>,`,
    welcomeMessage:
      "Bienvenue dans l'équipe ! Votre compte LIFO a été créé et vous pouvez maintenant accéder au système de gestion des stocks.",
    credentialsTitle: 'Vos identifiants de connexion :',
    usernameLabel: "Nom d'utilisateur :",
    passwordLabel: 'Mot de passe :',
    emailLabel: 'Email :',
    howToLoginTitle: 'Comment vous connecter :',
    steps: [
      "Ouvrez l'application LIFO sur la tablette du magasin",
      'Sélectionnez l\'onglet <strong>"Employé"</strong>',
      "Saisissez votre nom d'utilisateur et votre mot de passe",
      "Commencez à scanner les produits et gérer l'inventaire",
    ],
    importantNote:
      '<strong>Important :</strong> Gardez vos identifiants en sécurité et ne les partagez avec personne. Votre mot de passe peut être réinitialisé à tout moment par votre responsable.',
    footerHelp:
      'Besoin d\'aide ? Contactez votre responsable ou <a href="mailto:support@lifo-app" class="support-link">notre support</a>',
    footerCopyright: '© 2025 LIFO - Réduction intelligente du gaspillage alimentaire',
  },
  nl: {
    subject: (storeName: string) => `Welkom bij ${storeName} - Uw inloggegevens`,
    title: (storeName: string) => `Welkom bij ${storeName}`,
    subtitle: 'Uw werknemersaccount is succesvol aangemaakt',
    greeting: (fullName: string) => `Hallo <strong>${fullName}</strong>,`,
    welcomeMessage:
      'Welkom bij het team! Uw LIFO-account is aangemaakt en u kunt nu toegang krijgen tot het voorraadbeheerssysteem.',
    credentialsTitle: 'Uw inloggegevens:',
    usernameLabel: 'Gebruikersnaam:',
    passwordLabel: 'Wachtwoord:',
    emailLabel: 'E-mail:',
    howToLoginTitle: 'Hoe in te loggen:',
    steps: [
      'Open de LIFO-app op de winkeltablet',
      'Selecteer het tabblad <strong>"Medewerker"</strong>',
      'Voer uw gebruikersnaam en wachtwoord in',
      'Begin met het scannen van producten en beheer van voorraad',
    ],
    importantNote:
      '<strong>Belangrijk:</strong> Houd uw inloggegevens veilig en deel ze met niemand. Uw wachtwoord kan op elk moment door uw manager worden gereset.',
    footerHelp:
      'Hulp nodig? Neem contact op met uw manager of <a href="mailto:support@lifo-app" class="support-link">onze support</a>',
    footerCopyright: '© 2025 LIFO - Slimme Voedselafvalvermindering',
  },
}

const passwordResetEmailTranslations: Record<SupportedLanguage, PasswordResetEmailContent> = {
  en: {
    subject: 'LIFO - New Password Generated',
    title: 'New Password Generated',
    subtitle: 'Your password has been reset',
    greeting: (fullName: string) => `Hello <strong>${fullName}</strong>,`,
    resetMessage: (storeName: string) =>
      `A new password has been generated for your LIFO account at ${storeName}.`,
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
    footerCopyright: '© 2025 LIFO',
  },
  fr: {
    subject: 'LIFO - Nouveau mot de passe généré',
    title: 'Nouveau mot de passe généré',
    subtitle: 'Votre mot de passe a été réinitialisé',
    greeting: (fullName: string) => `Bonjour <strong>${fullName}</strong>,`,
    resetMessage: (storeName: string) =>
      `Un nouveau mot de passe a été généré pour votre compte LIFO chez ${storeName}.`,
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
    footerCopyright: '© 2025 LIFO',
  },
  nl: {
    subject: 'LIFO - Nieuw wachtwoord gegenereerd',
    title: 'Nieuw wachtwoord gegenereerd',
    subtitle: 'Uw wachtwoord is gereset',
    greeting: (fullName: string) => `Hallo <strong>${fullName}</strong>,`,
    resetMessage: (storeName: string) =>
      `Er is een nieuw wachtwoord gegenereerd voor uw LIFO-account bij ${storeName}.`,
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
    footerCopyright: '© 2025 LIFO',
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
    const language = credentials.language || 'fr' // Default to French
    const content = welcomeEmailTranslations[language]
    const storeName = credentials.store_name || 'LIFO'

    const { data, error } = await resend.emails.send({
      from: 'LIFO <noreply@lifo-app.com>',
      to: [credentials.email],
      subject: content.subject(storeName),
      html: generateWelcomeEmailHTML(credentials, language, content),
      text: generateWelcomeEmailText(credentials, language, content),
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
    const language = credentials.language || 'fr' // Default to French
    const content = passwordResetEmailTranslations[language]

    const { data, error } = await resend.emails.send({
      from: 'LIFO <noreply@lifo-app.com>',
      to: [credentials.email],
      subject: content.subject,
      html: generatePasswordResetEmailHTML(credentials, language, content),
      text: generatePasswordResetEmailText(credentials, language, content),
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
  const storeName = credentials.store_name || 'LIFO'

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
            <h1 style="margin: 0; color: #1e293b;">${content.title(storeName)}</h1>
            <p style="margin: 8px 0 0 0; color: #64748b;">${content.subtitle}</p>
        </div>

        <p>${content.greeting(credentials.full_name)}</p>

        <p>${content.welcomeMessage}</p>

        <div class="credentials-box">
            <h3 style="margin: 0 0 16px 0; color: #1e293b;">${content.credentialsTitle}</h3>

            <div class="credential-item">
                <span class="credential-label">${content.usernameLabel}</span>
                <span class="credential-value">${credentials.username}</span>
            </div>

            <div class="credential-item">
                <span class="credential-label">${content.passwordLabel}</span>
                <span class="credential-value password-value">${credentials.password}</span>
            </div>

            <div class="credential-item">
                <span class="credential-label">${content.emailLabel}</span>
                <span class="credential-value">${credentials.email}</span>
            </div>
        </div>

        <div class="instructions">
            <h3>${content.howToLoginTitle}</h3>
            <ol class="steps">
                ${content.steps.map(step => `<li>${step}</li>`).join('\n                ')}
            </ol>
        </div>

        <p>${content.importantNote}</p>

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
 * Generate plain text content for welcome email
 */
function generateWelcomeEmailText(
  credentials: EmailCredentials,
  _language: SupportedLanguage,
  content: WelcomeEmailContent,
): string {
  const storeName = credentials.store_name || 'LIFO'
  const stepsText = content.steps
    .map((step, index) => `${index + 1}. ${step.replace(/<\/?strong>/g, '')}`)
    .join('\n')

  return `
${content.title(storeName)}

${content.greeting(credentials.full_name).replace(/<\/?strong>/g, '')}

${content.welcomeMessage}

${content.credentialsTitle.toUpperCase()}
• ${content.usernameLabel} ${credentials.username}
• ${content.passwordLabel} ${credentials.password}
• ${content.emailLabel} ${credentials.email}

${content.howToLoginTitle.toUpperCase()}
${stepsText}

${content.importantNote.replace(/<\/?strong>/g, '')}

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
  const storeName = credentials.store_name || 'your store'

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
  _language: SupportedLanguage,
  content: PasswordResetEmailContent,
): string {
  const storeName = credentials.store_name || 'your store'

  return `
LIFO - ${content.title}

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
