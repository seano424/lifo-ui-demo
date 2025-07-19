import type { Metadata } from 'next'
import { Montserrat, Raleway, Roboto_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import { ReactQueryProvider } from '@/lib/react-query/provider'
import { StoreProviderWrapper } from '@/components/providers/store-provider-wrapper'
import { LanguageProvider } from '@/components/providers/language-provider'
import { IntlProvider } from '@/components/providers/intl-provider'
import { getMessages } from 'next-intl/server'

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'LIFO.AI - AI-Powered Food Waste Management',
  description:
    'LIFO.AI helps retailers reduce food waste through AI-driven inventory management. Scan products, track expiration dates, and optimize discounting and donations to maximize profitability.',
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
      className={`${raleway.variable} ${montserrat.variable} ${robotoMono.variable} scroll-smooth`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <LanguageProvider>
              <IntlProvider initialMessages={messages}>
                <StoreProviderWrapper>{children}</StoreProviderWrapper>
              </IntlProvider>
            </LanguageProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
