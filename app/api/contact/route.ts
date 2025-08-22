import { type NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { Resend } from 'resend'
import ContactEmailTemplate from '@/emails/contact-email-template'

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API)

export async function POST(request: NextRequest) {
  // Get translations
  const t = await getTranslations('contactpage.api')

  try {
    // Parse the request body
    const { name, email, subject, message } = await request.json()

    // Validate the input
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: t('allFieldsRequired') }, { status: 400 })
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'contact@lifo-app.com', // Votre domaine vérifié
      to: ['contact@lifo-app.com'], // Adresse de réception des messages
      replyTo: email, // Pour que vous puissiez répondre directement à l'expéditeur
      subject: `Contact: ${subject}`,
      react: ContactEmailTemplate({ name, email, subject, message }),
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message || t('emailSendingFailed') }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: t('internalServerError') }, { status: 500 })
  }
}
