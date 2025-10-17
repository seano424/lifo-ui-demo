import { OfflineIndicator } from '@/components/offline-indicator'
import { IntlProvider } from '@/components/providers/intl-provider'
import { LanguageProvider } from '@/components/providers/language-provider'
// import PWAInstallPrompt from '@/components/pwa-install-prompt'
import ServiceWorkerRegistrar from '@/components/service-worker-registrar'
import { Toaster } from '@/components/ui/toaster'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import type { Metadata } from 'next'
import { getMessages } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { Montserrat, Raleway, Roboto_Mono } from 'next/font/google'
import './globals.css'

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'LIFO.AI - AI-Powered Food Waste Management',
  description:
    'LIFO.AI helps retailers reduce food waste through AI-driven inventory management. Scan products, track expiration dates, and optimize discounting and donations to maximize profitability.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LIFO.AI',
  },
}

// Raleway font for headings
const raleway = Raleway({
  variable: '--font-raleway',
  display: 'swap',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

// Montserrat font for body text
const montserrat = Montserrat({
  variable: '--font-montserrat',
  display: 'swap',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  display: 'swap',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  preload: false, // Only used in specific components, not on every page
})

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const messages = await getMessages()

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${raleway.variable} ${montserrat.variable} ${robotoMono.variable}`}
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
          <ServiceWorkerRegistrar />
          {/* <PWAInstallPrompt /> */}
          <OfflineIndicator />
          <Toaster
            position="top-right"
            richColors
            theme="light"
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
