import type { ContactEmailTemplatePropsSchema } from '@/lib/schemas/contact-email-schemas'
import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import type { z } from 'zod'

// Type-safe props inferred from Zod schema
// This ensures props match validation constraints (min/max length, email format)
// XSS protection: React-email's Text, Heading, and Link components automatically escape HTML
// API route sanitizes inputs as defense in depth before passing to template
type ContactEmailTemplateProps = z.infer<typeof ContactEmailTemplatePropsSchema>

export default function ContactEmailTemplate({
  name,
  email,
  subject,
  message,
}: ContactEmailTemplateProps) {
  const logoUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://lifo-app.com'}/logos/lifo-logo-vertical-light.png`

  return (
    <Html>
      <Head />
      <Preview>New contact message from {name}</Preview>
      <Body
        style={{
          margin: '0',
          padding: '0',
          backgroundColor: '#f8fafc',
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <Container
          style={{
            backgroundColor: '#f8fafc',
            padding: '40px 20px',
          }}
        >
          <Section
            style={{
              maxWidth: '600px',
              width: '100%',
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(9, 13, 26, 0.1)',
            }}
          >
            {/* Header */}
            <Section
              style={{
                padding: '40px 40px 20px 40px',
                textAlign: 'center',
              }}
            >
              <Img
                src={logoUrl}
                alt="LIFO.AI - Smart Food Management System Logo"
                width="120"
                height="120"
                style={{
                  display: 'block',
                  margin: '0 auto',
                  marginBottom: '16px',
                }}
              />

              {/* Icon Circle */}
              <Text
                role="img"
                aria-label="Email icon"
                style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #5721C5 0%, #228CEE 100%)',
                  borderRadius: '50%',
                  margin: '0 auto 24px auto',
                  textAlign: 'center',
                  fontSize: '32px',
                  lineHeight: '80px',
                  display: 'block',
                }}
              >
                ✉️
              </Text>

              <Heading
                style={{
                  color: '#090D1A',
                  fontSize: '28px',
                  fontWeight: '700',
                  margin: '0',
                  letterSpacing: '-0.5px',
                }}
              >
                New Contact Message
              </Heading>
            </Section>

            {/* Content */}
            <Section
              style={{
                padding: '0 40px 40px 40px',
              }}
            >
              <Text
                style={{
                  color: '#374151',
                  fontSize: '16px',
                  lineHeight: '24px',
                  margin: '0 0 24px 0',
                }}
              >
                You have received a new message from the contact form on your website.
              </Text>

              {/* Information Section */}
              <Section
                style={{
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  padding: '24px',
                  margin: '0 0 24px 0',
                }}
              >
                <Row style={{ margin: '0 0 16px 0' }}>
                  <Column style={{ width: '100%' }}>
                    <Text
                      style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        fontWeight: '600',
                        margin: '0 0 4px 0',
                      }}
                    >
                      From:
                    </Text>
                    <Text
                      style={{
                        color: '#111827',
                        fontSize: '16px',
                        fontWeight: 'normal',
                        margin: '0',
                      }}
                    >
                      {name}
                    </Text>
                  </Column>
                </Row>
                <Row style={{ margin: '0 0 16px 0' }}>
                  <Column style={{ width: '100%' }}>
                    <Text
                      style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        fontWeight: '600',
                        margin: '0 0 4px 0',
                      }}
                    >
                      Email:
                    </Text>
                    <Text
                      style={{
                        color: '#5721C5',
                        fontSize: '16px',
                        fontWeight: 'normal',
                        margin: '0',
                      }}
                    >
                      <Link
                        href={`mailto:${email}`}
                        style={{
                          color: '#5721C5',
                          textDecoration: 'none',
                        }}
                      >
                        {email}
                      </Link>
                    </Text>
                  </Column>
                </Row>
                <Row style={{ margin: '0' }}>
                  <Column style={{ width: '100%' }}>
                    <Text
                      style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        fontWeight: '600',
                        margin: '0 0 4px 0',
                      }}
                    >
                      Subject:
                    </Text>
                    <Text
                      style={{
                        color: '#111827',
                        fontSize: '16px',
                        fontWeight: 'normal',
                        margin: '0',
                      }}
                    >
                      {subject}
                    </Text>
                  </Column>
                </Row>
              </Section>

              {/* Message Section */}
              <Section style={{ margin: '0 0 32px 0' }}>
                <Text
                  style={{
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '600',
                    margin: '0 0 12px 0',
                  }}
                >
                  Message:
                </Text>
                <Section
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                  }}
                >
                  <Text
                    style={{
                      color: '#1f2937',
                      fontSize: '14px',
                      lineHeight: '24px',
                      margin: '0',
                      whiteSpace: 'pre-wrap' as const,
                      wordBreak: 'break-word' as const,
                    }}
                  >
                    {message}
                  </Text>
                </Section>
              </Section>

              {/* CTA Button */}
              <Section
                style={{
                  textAlign: 'center',
                  padding: '0 0 32px 0',
                }}
              >
                <Link
                  href={`mailto:${email}?subject=${encodeURIComponent(`Re: ${subject}`)}`}
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #5721C5 0%, #228CEE 100%)',
                    color: '#ffffff',
                    textDecoration: 'none',
                    padding: '16px 32px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '16px',
                    boxShadow: '0 4px 12px rgba(87, 33, 197, 0.3)',
                  }}
                >
                  ✉️ Reply to {name}
                </Link>
              </Section>
            </Section>

            {/* Footer */}
            <Section
              style={{
                padding: '24px 40px',
                backgroundColor: '#090D1A',
                borderRadius: '0 0 12px 12px',
                textAlign: 'center',
              }}
            >
              <Text
                style={{
                  color: '#9ca3af',
                  fontSize: '14px',
                  margin: '0 0 8px 0',
                }}
              >
                Reducing food waste, one store at a time 🌱
              </Text>
              <Text
                style={{
                  color: '#6b7280',
                  fontSize: '12px',
                  margin: '0',
                }}
              >
                © {new Date().getFullYear()} LIFO.AI - Smart Food Surplus Management
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
