import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'

interface ContactEmailTemplateProps {
  name: string
  email: string
  subject: string
  message: string
}

export default function ContactEmailTemplate({
  name,
  email,
  subject,
  message,
}: ContactEmailTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>New contact message from {name}</Preview>
      <Body
        style={{
          backgroundColor: '#f6f9fc',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          WebkitFontSmoothing: 'antialiased',
          fontSize: '14px',
          lineHeight: '1.5',
          margin: '0',
          padding: '0',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #f0f0f0',
            borderRadius: '5px',
            boxShadow: '0 5px 10px rgba(20, 50, 70, 0.2)',
            marginTop: '20px',
            marginBottom: '20px',
            maxWidth: '600px',
            width: '100%',
          }}
        >
          {/* Header with Title */}
          <Section
            style={{
              backgroundColor: '#2563eb',
              backgroundImage: 'linear-gradient(to right, #2563eb, #9333ea, #ec4899)',
              borderRadius: '5px 5px 0 0',
              padding: '30px 0',
              textAlign: 'center' as const,
            }}
          >
            <Text
              style={{
                color: '#ffffff',
                fontSize: '48px',
                fontWeight: 'bold',
                margin: '0',
                fontFamily:
                  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              }}
            >
              LIFO AI
            </Text>
          </Section>

          {/* Title Section */}
          <Section style={{ padding: '30px 40px 0 40px' }}>
            <Heading
              style={{
                color: '#1d1c1d',
                fontSize: '24px',
                fontWeight: '700',
                lineHeight: '1.3',
                margin: '0',
                padding: '0',
                textAlign: 'center' as const,
              }}
            >
              New Contact Message
            </Heading>
            <Text
              style={{
                color: '#6a7280',
                fontSize: '16px',
                fontWeight: 'normal',
                margin: '10px 0 24px',
                textAlign: 'center' as const,
              }}
            >
              From the website contact form
            </Text>
          </Section>

          {/* Information Section */}
          <Section
            style={{
              padding: '0 40px',
            }}
          >
            <Row
              style={{
                borderTop: '1px solid #e5e7eb',
                margin: '0',
                padding: '16px 0',
              }}
            >
              <Column style={{ width: '30%' }}>
                <Text
                  style={{
                    color: '#4b5563',
                    fontSize: '15px',
                    fontWeight: '600',
                    margin: '0',
                  }}
                >
                  From:
                </Text>
              </Column>
              <Column style={{ width: '70%' }}>
                <Text
                  style={{
                    color: '#111827',
                    fontSize: '15px',
                    fontWeight: 'normal',
                    margin: '0',
                  }}
                >
                  {name}
                </Text>
              </Column>
            </Row>
            <Row
              style={{
                borderTop: '1px solid #e5e7eb',
                margin: '0',
                padding: '16px 0',
              }}
            >
              <Column style={{ width: '30%' }}>
                <Text
                  style={{
                    color: '#4b5563',
                    fontSize: '15px',
                    fontWeight: '600',
                    margin: '0',
                  }}
                >
                  Email:
                </Text>
              </Column>
              <Column style={{ width: '70%' }}>
                <Text
                  style={{
                    color: '#111827',
                    fontSize: '15px',
                    fontWeight: 'normal',
                    margin: '0',
                  }}
                >
                  <Link
                    href={`mailto:${email}`}
                    style={{
                      color: '#2563eb',
                      textDecoration: 'none',
                    }}
                  >
                    {email}
                  </Link>
                </Text>
              </Column>
            </Row>
            <Row
              style={{
                borderTop: '1px solid #e5e7eb',
                margin: '0',
                padding: '16px 0',
              }}
            >
              <Column style={{ width: '30%' }}>
                <Text
                  style={{
                    color: '#4b5563',
                    fontSize: '15px',
                    fontWeight: '600',
                    margin: '0',
                  }}
                >
                  Subject:
                </Text>
              </Column>
              <Column style={{ width: '70%' }}>
                <Text
                  style={{
                    color: '#111827',
                    fontSize: '15px',
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
          <Section
            style={{
              padding: '24px 40px',
            }}
          >
            <Text
              style={{
                color: '#4b5563',
                fontSize: '16px',
                fontWeight: '600',
                margin: '0 0 10px 0',
              }}
            >
              Message:
            </Text>
            <Section
              style={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '20px',
              }}
            >
              <Text
                style={{
                  color: '#1f2937',
                  fontSize: '14px',
                  margin: '0',
                  whiteSpace: 'pre-wrap' as const,
                  wordBreak: 'break-word' as const,
                }}
              >
                {message}
              </Text>
            </Section>
          </Section>

          {/* Call to Action */}
          <Section
            style={{
              padding: '0 40px 32px 40px',
            }}
          >
            <Text
              style={{
                color: '#4b5563',
                fontSize: '14px',
                margin: '0 0 16px 0',
                textAlign: 'center' as const,
              }}
            >
              Want to respond to this message?
            </Text>
            <Section
              style={{
                textAlign: 'center' as const,
              }}
            >
              <Link
                href={`mailto:${email}?subject=Re: ${subject}`}
                style={{
                  background: 'linear-gradient(to right, #2563eb, #9333ea, #ec4899)',
                  borderRadius: '4px',
                  color: '#fff',
                  display: 'inline-block',
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '12px 24px',
                  textDecoration: 'none',
                }}
              >
                Reply to {name}
              </Link>
            </Section>
          </Section>

          {/* Footer */}
          <Section
            style={{
              borderTop: '1px solid #e5e7eb',
              padding: '24px 40px',
              textAlign: 'center' as const,
            }}
          >
            <Text
              style={{
                color: '#6b7280',
                fontSize: '12px',
                fontWeight: 'normal',
                margin: '0',
              }}
            >
              © {new Date().getFullYear()} LIFO - Smart food waste reduction
            </Text>
            <Text
              style={{
                color: '#6b7280',
                fontSize: '12px',
                fontWeight: 'normal',
                margin: '8px 0 0 0',
              }}
            >
              <Link
                href="https://lifo.ai"
                style={{
                  color: '#2563eb',
                  textDecoration: 'none',
                }}
              >
                LIFO.AI
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
