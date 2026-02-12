import { OfflineIndicator } from '@/components/offline-indicator'
import { IntlProvider } from '@/components/providers/intl-provider'
import { LanguageProvider } from '@/components/providers/language-provider'
import { Toaster } from '@/components/ui/toaster'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import type { Metadata } from 'next'
import { getLocale, getMessages } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { Inter, Raleway, Roboto_Mono } from 'next/font/google'
import './globals.css'

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'Expiry Tracking for Retailers | lifo',
  description:
    "lifo helps retailers reduce waste by tracking what's expiring and when to act—discount, donate, or sell in time.",
  icons: {
    icon: '/logos/logo.png',
    apple: '/logos/logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: defaultUrl,
    title: 'lifo: Expiry Tracking for Retailers',
    description:
      "lifo helps retailers reduce waste by tracking what's expiring and when to act—discount, donate, or sell in time.",
    siteName: 'lifo',
    images: [
      {
        url: '/logos/logo.png',
        width: 1078,
        height: 1078,
        alt: 'lifo logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'lifo: Expiry Tracking for Retailers',
    description:
      "lifo helps retailers reduce waste by tracking what's expiring and when to act—discount, donate, or sell in time.",
    images: ['/logos/logo.png'],
  },
}

// Raleway font for headings
const raleway = Raleway({
  variable: '--font-raleway',
  display: 'swap',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  preload: true,
  fallback: ['system-ui', 'arial'],
})

// Inter font for body text
const inter = Inter({
  variable: '--font-inter',
  display: 'swap',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  preload: true,
})

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  display: 'swap',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  preload: true,
})

const debugScreens = process.env.NODE_ENV === 'development' ? 'debug-screens' : ''

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${raleway.variable} ${inter.variable} ${robotoMono.variable} ${debugScreens}`}
    >
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <LanguageProvider>
              <IntlProvider initialMessages={messages}>{children}</IntlProvider>
            </LanguageProvider>
          </ReactQueryProvider>
          <OfflineIndicator />
          <Toaster
            position="top-right"
            richColors
            className="toaster"
            closeButton
            closeOnClickOutside
            toastOptions={{
              className: 'toast',
              duration: 4000,
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
