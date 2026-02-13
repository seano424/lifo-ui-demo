'use client'

import React from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { CompactLanguageSwitcher } from '@/components/ui/compact-language-switcher'
import { Logo } from '@/components/ui/logo'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { hasEnvVars } from '@/lib/utils'
import { Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { AuthButton } from '../auth-button'
import { EnvVarWarning } from '../env-var-warning'
import { Typography } from '../ui/typography'

interface MenuItem {
  title: string
  url: string
  items?: MenuItem[]
  icon?: React.ReactNode
  description?: string
}

const MarketingNav = React.memo(() => {
  const t = useTranslations('marketing.nav')
  const menuItems = [
    {
      title: 'Home',
      url: '/',
    },
    {
      title: 'Pricing',
      url: '/pricing',
    },
    {
      title: 'Contact',
      url: '/contact',
    },
  ]

  return (
    <section>
      <nav className="hidden justify-between md:flex mx-auto max-w-7xl px-4">
        <div className="flex justify-between lg:grid lg:grid-cols-3 items-center gap-8 w-full">
          {/* <NavbarLogo variant="text" href="/" /> */}

          <Logo variant="svg" size="md" priority href="/" withText />
          <div className="items-center gap-8 hidden lg:flex place-self-center bg-secondary-100/20 text-secondary-900 rounded-full px-4 py-2 dark:bg-secondary-900/0 dark:text-secondary-100">
            {menuItems.map(item => (
              <Link
                key={item.title}
                href={item.url}
                className="rounded-2xl px-4 py-2 dark:bg-secondary-900/0 dark:text-secondary-100"
              >
                {item.title}
              </Link>
            ))}
          </div>
          <div className="place-self-end self-center">
            {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
          </div>
        </div>
      </nav>

      {/* Mobile */}
      <div className="block md:hidden container mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/">
            <Logo variant="svg" size="sm" priority />
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t('menuButton')}>
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  <Link href="/">
                    <Logo variant="svg" size="sm" priority />
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-full gap-10 p-4">
                <Accordion type="single" collapsible className="flex w-full flex-col gap-4">
                  {menuItems.map(item => renderMobileMenuItem(item))}
                </Accordion>

                <div className="flex flex-col gap-3">
                  <AuthButton isMobile />
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <Typography variant="p" color="muted">
                      {t('language')}
                    </Typography>
                    <CompactLanguageSwitcher />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </section>
  )
})

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="text-md py-0  hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2">
          {item.items.map(subItem => (
            <SubMenuLink key={subItem.title} item={subItem} />
          ))}
        </AccordionContent>
      </AccordionItem>
    )
  }

  return (
    <Link key={item.title} href={item.url}>
      {item.title}
    </Link>
  )
}

const SubMenuLink = ({ item }: { item: MenuItem }) => {
  return (
    <Link
      className="flex flex-row gap-4 rounded-2xl p-3 leading-none no-underline transition-colors outline-none select-none hover:bg-muted hover:text-accent-foreground"
      href={item.url}
    >
      <div className="text-foreground">{item.icon}</div>
      <div>
        <div className="text-sm ">{item.title}</div>
        {item.description && (
          <p className="text-sm leading-snug text-muted-foreground">{item.description}</p>
        )}
      </div>
    </Link>
  )
}

export { MarketingNav }
