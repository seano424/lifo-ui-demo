'use client'

import { Menu } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { CompactLanguageSwitcher } from '@/components/ui/compact-language-switcher'
import { NavbarLogo } from '@/components/ui/logo'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { hasEnvVars } from '@/lib/utils'
import { AuthButton } from '../auth-button'
import { EnvVarWarning } from '../env-var-warning'

interface MenuItem {
  title: string
  url: string
  description?: string
  icon?: React.ReactNode
  items?: MenuItem[]
}

interface MarketingNavProps {
  logo?: {
    url: string
    src: string
    alt: string
    title: string
  }
  menu?: MenuItem[]
}

const MarketingNav = ({ menu }: MarketingNavProps) => {
  const t = useTranslations('marketing.nav')

  const defaultMenu = [
    // {
    //   title: t('product'),
    //   url: '#',
    //   items: [
    //     {
    //       title: t('blog'),
    //       description: t('blogDesc'),
    //       icon: <Book className="size-5 shrink-0" />,
    //       url: '#',
    //     },
    //     {
    //       title: t('company'),
    //       description: t('companyDesc'),
    //       icon: <Trees className="size-5 shrink-0" />,
    //       url: '#',
    //     },
    //     {
    //       title: t('careers'),
    //       description: t('careersDesc'),
    //       icon: <Sunset className="size-5 shrink-0" />,
    //       url: '#',
    //     },
    //     {
    //       title: t('support'),
    //       description: t('supportDesc'),
    //       icon: <Zap className="size-5 shrink-0" />,
    //       url: '#',
    //     },
    //   ],
    // },
    // {
    //   title: t('resources'),
    //   url: '#',
    //   items: [
    //     {
    //       title: t('contactUs'),
    //       description: t('contactUsDesc'),
    //       icon: <Sunset className="size-5 shrink-0" />,
    //       url: '/contact',
    //     },
    //     {
    //       title: t('helpCenter'),
    //       description: t('helpCenterDesc'),
    //       icon: <Zap className="size-5 shrink-0" />,
    //       url: '#',
    //     },
    //     {
    //       title: t('status'),
    //       description: t('statusDesc'),
    //       icon: <Trees className="size-5 shrink-0" />,
    //       url: '#',
    //     },
    //     {
    //       title: t('terms'),
    //       description: t('termsDesc'),
    //       icon: <Book className="size-5 shrink-0" />,
    //       url: '#',
    //     },
    //   ],
    // },
    {
      title: t('features'),
      url: '/features',
    },
    {
      title: t('pricing'),
      url: '/pricing',
    },
    {
      title: t('support'),
      url: '/support',
    },
    {
      title: t('contactUs'),
      url: '/contact',
    },
  ]

  const menuItems = menu || defaultMenu
  return (
    <section>
      <nav className="hidden justify-between lg:flex container mx-auto">
        <div className="flex items-center gap-8">
          <NavbarLogo variant="text" href="/" />

          <NavigationMenu>
            <NavigationMenuList>{menuItems.map(item => renderMenuItem(item))}</NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-2">
          <CompactLanguageSwitcher />
          {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
        </div>
      </nav>

      {/* Mobile */}
      <div className="block lg:hidden container mx-auto">
        <div className="flex items-center justify-between">
          <NavbarLogo variant="text" href="/" />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  <NavbarLogo />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col h-full gap-10 p-4">
                <Accordion type="single" collapsible className="flex w-full flex-col gap-4">
                  {menuItems.map(item => renderMobileMenuItem(item))}
                </Accordion>

                <div className="flex flex-col gap-3">
                  <AuthButton isMobile />
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-sm text-muted-foreground">Langue</span>
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
}

const renderMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger className="rounded-2xl tracking-wide font-medium font-heading text-sm">
          {item.title}
        </NavigationMenuTrigger>
        <NavigationMenuContent className="bg-popover text-popover-foreground w-full min-w-80">
          {item.items.map(subItem => (
            <NavigationMenuLink asChild key={subItem.title}>
              <SubMenuLink item={subItem} />
            </NavigationMenuLink>
          ))}
        </NavigationMenuContent>
      </NavigationMenuItem>
    )
  }

  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuLink
        href={item.url}
        className="group inline-flex h-10 w-max items-center justify-center bg-background px-4 py-2 transition-colors hover:bg-brand-primary/10 hover:text-brand-primary dark:hover:bg-brand-secondary/10 dark:hover:text-white rounded-2xl tracking-wide font-medium font-heading text-base"
      >
        {item.title}
      </NavigationMenuLink>
    </NavigationMenuItem>
  )
}

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="text-md py-0 font-semibold hover:no-underline">
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
    <Link key={item.title} href={item.url} className="text-md font-semibold">
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
        <div className="text-sm font-semibold">{item.title}</div>
        {item.description && (
          <p className="text-sm leading-snug text-muted-foreground">{item.description}</p>
        )}
      </div>
    </Link>
  )
}

export { MarketingNav }
