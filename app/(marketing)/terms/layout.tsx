import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms and Conditions | LIFO',
  description:
    'Terms of Service and Privacy Policy for LIFO food waste management platform. Learn about our data collection practices, user responsibilities, and GDPR compliance.',
  robots: 'index, follow',
  openGraph: {
    title: 'Terms and Conditions | LIFO',
    description: 'Terms of Service and Privacy Policy for LIFO food waste management platform',
    type: 'website',
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
