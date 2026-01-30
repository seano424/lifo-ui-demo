import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | lifo',
  description:
    'Privacy Policy for lifo food waste management platform. Learn about our data collection practices, GDPR compliance, and how we protect your personal information.',
  robots: 'index, follow',
  openGraph: {
    title: 'Privacy Policy | lifo',
    description: 'Privacy Policy for lifo food waste management platform',
    type: 'website',
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
