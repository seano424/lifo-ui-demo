import { ThemeSwitcher } from '@/components/theme-switcher'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { Typography } from '@/components/ui/typography'
import { Linkedin } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function MarketingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full bg-gradient-to-b from-background to-background/80 border-t border-foreground/10 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
          {/* Logo and Description */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Image
                src="/logos/lifo-logo-icon.svg"
                alt="LIFO.AI Logo"
                width={32}
                height={32}
                className="h-8 w-auto"
              />
              <Typography
                variant="h4"
                className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
              >
                LIFO.AI
              </Typography>
            </div>
            <Typography variant="p" className="text-sm text-muted-foreground max-w-sm">
              Helping businesses optimize inventory management with intelligent solutions to reduce
              waste and maximize profits.
            </Typography>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <Typography variant="h4" className="text-base font-bold">
              Quick Links
            </Typography>
            <div className="grid grid-cols-1 gap-2">
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                About Us
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Products
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Blog
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <Typography variant="h4" className="text-base font-bold">
              Contact Us
            </Typography>
            <div className="space-y-2">
              <a
                href="mailto:contact@lifo-app.com"
                className="hover:text-foreground transition-colors"
              >
                <Typography variant="p" className="text-sm text-muted-foreground">
                  contact@lifo-app.com
                </Typography>
              </a>
              <div className="flex items-center gap-2 mt-8">
                <a
                  href="https://linkedin.com/company/lifo-ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-blue-600 transition-colors"
                >
                  <Linkedin size={20} />
                </a>
                <div className="flex items-center gap-2">
                  <ThemeSwitcher />
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-foreground/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <Typography variant="small" className="text-xs text-muted-foreground">
            © {currentYear} LIFO.AI. All rights reserved.
          </Typography>
          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
