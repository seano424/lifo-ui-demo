'use client'

import { CompactThemeSwitcher } from '@/components/compact-theme-switcher'
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
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Logo variant="svg" size="sm" className="w-10 h-auto" withText />
            </div>
            <Typography variant="p" className="max-w-sm">
              {t('description')}
            </Typography>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-4">
            <Typography variant="h4">{t('quickLinks')}</Typography>
            <div className="grid grid-cols-1 gap-2">
              <Link href="/" className=" hover:text-foreground transition-colors">
                <Typography variant="small" className="hover:text-primary transition-colors">
                  {t('links.homepage')}
                </Typography>
              </Link>
              <Link href="/features">
                <Typography variant="small" className="hover:text-primary transition-colors">
                  {t('links.features')}
                </Typography>
              </Link>
              <Link href="/pricing">
                <Typography variant="small" className="hover:text-primary transition-colors">
                  {t('links.pricing')}
                </Typography>
              </Link>
              <Link href="/contact">
                <Typography variant="small" className="hover:text-primary transition-colors">
                  {t('links.contact')}
                </Typography>
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="flex flex-col gap-4">
            <Typography variant="h4">{t('contactUs')}</Typography>
            <div className="flex flex-col gap-2">
              <a href="mailto:contact@lifo-app.com">
                <Typography variant="small" className="hover:text-primary transition-colors">
                  {t('email')}
                </Typography>
              </a>
              <div className="flex items-center gap-2 mt-8">
                <a
                  href="https://www.linkedin.com/company/lifo-app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className=" hover:text-blue-600 transition-colors"
                  aria-label="Visit lifo on LinkedIn"
                >
                  <Linkedin size={16} />
                </a>
                <div className="flex items-center gap-2">
                  <CompactThemeSwitcher />
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-foreground/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <Typography variant="small">{t('copyright', { year: currentYear })}</Typography>
          <div className="flex items-center gap-6">
            <Link href="/privacy">
              <Typography variant="small" className="hover:text-primary transition-colors">
                {t('legal.privacyPolicy')}
              </Typography>
            </Link>
            <Link href="/terms">
              <Typography variant="small" className="hover:text-primary transition-colors">
                {t('legal.termsOfService')}
              </Typography>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
