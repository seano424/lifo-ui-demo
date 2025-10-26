'use client'

// import { CompactThemeSwitcher } from '@/components/compact-theme-switcher'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { Logo } from '@/components/ui/logo'
import { Typography } from '@/components/ui/typography'
import { Linkedin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'

export function MarketingFooter() {
  const currentYear = new Date().getFullYear()
  const t = useTranslations('footer')

  return (
    <footer className="mt-30 w-full bg-background border-t border-foreground/10 py-12 px-4 relative z-10">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Logo and Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Logo variant="icon" size="sm" className="w-10 h-auto" />
              <Typography
                variant="h4"
                className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-700 via-indigo-400 to-blue-600"
              >
                LIFO
              </Typography>
            </div>
            <Typography variant="p" className="text-sm text-muted-foreground max-w-sm">
              {t('description')}
            </Typography>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-4">
            <Typography variant="h4" className="text-base font-bold">
              {t('quickLinks')}
            </Typography>
            <div className="grid grid-cols-1 gap-2">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('links.homepage')}
              </Link>
              <Link
                href="/features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('links.features')}
              </Link>
              <Link
                href="/pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('links.pricing')}
              </Link>
              <Link
                href="/contact"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t('links.contact')}
              </Link>
              {/* <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("links.blog")}
              </Link> */}
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <Typography variant="h4" className="text-base font-bold">
              {t('contactUs')}
            </Typography>
            <div className="space-y-2">
              <a
                href="mailto:contact@lifo-app.com"
                className="hover:text-foreground transition-colors"
              >
                <Typography variant="p" className="text-sm text-muted-foreground">
                  {t('email')}
                </Typography>
              </a>
              <div className="flex items-center gap-2 mt-8">
                <a
                  href="https://www.linkedin.com/company/lifo-app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-blue-600 transition-colors"
                  aria-label="Visit LIFO on LinkedIn"
                >
                  <Linkedin size={16} />
                </a>
                <div className="flex items-center gap-2">
                  {/* <CompactThemeSwitcher /> */}
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-foreground/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <Typography variant="small" className="text-xs text-muted-foreground">
            {t('copyright', { year: currentYear })}
          </Typography>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('legal.privacyPolicy')}
            </Link>
            <Link
              href="/terms"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('legal.termsOfService')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
