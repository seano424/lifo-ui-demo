import ContactEmailTemplate from '@/emails/contact-email-template'
import { getTranslations } from 'next-intl/server'
import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { z } from 'zod'

// Initialize Resend with your API key
const resend = new Resend(process.env.RESEND_API)

// Zod schema for contact form validation
const ContactFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .transform(val => val.trim())
    .pipe(z.string().min(1, 'Name cannot be only whitespace')),
  email: z
    .string()
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .email('Invalid email format')
    .refine(
      email =>
        !email.includes('%0A') &&
        !email.includes('%0D') &&
        !email.includes('\n') &&
        !email.includes('\r'),
      'Email cannot contain newline characters',
    ),
  subject: z
    .string()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters')
    .transform(val => val.trim())
    .pipe(z.string().min(1, 'Subject cannot be only whitespace')),
  message: z
    .string()
    .min(1, 'Message is required')
    .max(5000, 'Message must be less than 5000 characters'),
})

// Zod schema for template props (after sanitization)
// This ensures type safety and validation at the template level
export const ContactEmailTemplatePropsSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
})

/**
 * Sanitize input by removing potentially dangerous HTML-like characters
 * React-email handles escaping, but this provides defense in depth
 */
function sanitizeInput(input: string): string {
  return input.replace(/[<>"']/g, '')
}

export async function POST(request: NextRequest) {
  // Get translations
  const t = await getTranslations('contactpage.api')

  try {
    // Parse the request body
    const body = await request.json()

    // Validate with Zod schema
    const validationResult = ContactFormSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: t('allFieldsRequired'),
          details: validationResult.error.errors,
        },
        { status: 400 },
      )
    }

    // Get validated and sanitized inputs
    const validated = validationResult.data
    const sanitizedName = sanitizeInput(validated.name)
    const sanitizedSubject = sanitizeInput(validated.subject)
    const sanitizedMessage = sanitizeInput(validated.message)

    // Use validated email (Zod already ensures it's safe format)
    const safeEmail = validated.email

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'contact@lifo-app.com', // Votre domaine vérifié
      to: ['contact@lifo-app.com'], // Adresse de réception des messages
      replyTo: safeEmail, // Pour que vous puissiez répondre directement à l'expéditeur
      subject: `Contact: ${sanitizedSubject}`,
      react: ContactEmailTemplate({
        name: sanitizedName,
        email: safeEmail,
        subject: sanitizedSubject,
        message: sanitizedMessage,
      }),
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
