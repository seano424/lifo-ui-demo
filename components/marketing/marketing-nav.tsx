import Link from 'next/link'
import Image from 'next/image'
import { Book, Menu, Sunset, Trees, Zap } from 'lucide-react'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
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
  auth?: {
    login: {
      title: string
      url: string
    }
    signup: {
      title: string
      url: string
    }
  }
}

const MarketingNav = ({
  logo = {
    url: '/',
    src: '/logo.png',
    alt: 'logo',
    title: 'LIFO.AI',
  },
  menu = [
    {
      title: 'Resources',
      url: '#',
      items: [
        {
          title: 'Help Center',
          description: 'Get all the answers you need right here',
          icon: <Zap className="size-5 shrink-0" />,
          url: '#',
        },
        {
          title: 'Contact Us',
          description: 'We are here to help you with any questions you have',
          icon: <Sunset className="size-5 shrink-0" />,
          url: '#',
        },
        {
          title: 'Status',
          description: 'Check the current status of our services and APIs',
          icon: <Trees className="size-5 shrink-0" />,
          url: '#',
        },
        {
          title: 'Terms of Service',
          description: 'Our terms and conditions for using our services',
          icon: <Book className="size-5 shrink-0" />,
          url: '#',
        },
      ],
    },
    {
      title: 'Products',
      url: '#',
      items: [
        {
          title: 'Blog',
          description: 'The latest industry news, updates, and info',
          icon: <Book className="size-5 shrink-0" />,
          url: '#',
        },
        {
          title: 'Company',
          description: 'Our mission is to innovate and empower the world',
          icon: <Trees className="size-5 shrink-0" />,
          url: '#',
        },
        {
          title: 'Careers',
          description: 'Browse job listing and discover our workspace',
          icon: <Sunset className="size-5 shrink-0" />,
          url: '#',
        },
        {
          title: 'Support',
          description: 'Get in touch with our support team or visit our community forums',
          icon: <Zap className="size-5 shrink-0" />,
          url: '#',
        },
      ],
    },

    {
      title: 'Pricing',
      url: '#',
    },
  ],
  auth = {
    login: { title: 'Login', url: '#' },
    signup: { title: 'Sign up', url: '#' },
  },
}: MarketingNavProps) => {
  return (
    <section className="py-6 fixed top-0 left-0 right-0 z-50 h-24 backdrop-blur-xs flex flex-col justify-center bg-background/80">
      {/* Desktop Menu */}
      <nav className="hidden justify-between lg:flex container mx-auto">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <Link href={logo.url} className="flex items-center gap-2 relative h-10 aspect-video">
            <Image fill src={logo.src} className="object-cover" alt={logo.alt} />
          </Link>
          <span className="text-2xl font-heading font-black">{logo.title}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center">
            <NavigationMenu>
              <NavigationMenuList>{menu.map(item => renderMenuItem(item))}</NavigationMenuList>
            </NavigationMenu>
          </div>
          {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className="block lg:hidden container mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href={logo.url} className="flex items-center gap-2 relative h-10 aspect-video">
            <Image fill src={logo.src} className="object-cover" alt={logo.alt} />
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>
                  <Link
                    href={logo.url}
                    className="flex items-center gap-2 relative h-10 aspect-video"
                  >
                    <Image src={logo.src} alt={logo.alt} fill className="object-cover" />
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 p-4">
                <Accordion type="single" collapsible className="flex w-full flex-col gap-4">
                  {menu.map(item => renderMobileMenuItem(item))}
                </Accordion>

                <div className="flex flex-col gap-3">
                  <Button asChild variant="default">
                    <Link href={auth.login.url}>{auth.login.title}</Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href={auth.signup.url}>{auth.signup.title}</Link>
                  </Button>
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
        <NavigationMenuTrigger>{item.title}</NavigationMenuTrigger>
        <NavigationMenuContent className="bg-popover text-popover-foreground">
          {item.items.map(subItem => (
            <NavigationMenuLink asChild key={subItem.title} className="w-80">
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
        className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-xs uppercase transition-colors hover:bg-brand-primary/10 hover:text-brand-primary dark:hover:bg-brand-secondary/10 dark:hover:text-brand-secondary"
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
    <a key={item.title} href={item.url} className="text-md font-semibold">
      {item.title}
    </a>
  )
}

const SubMenuLink = ({ item }: { item: MenuItem }) => {
  return (
    <a
      className="flex flex-row gap-4 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none hover:bg-muted hover:text-accent-foreground"
      href={item.url}
    >
      <div className="text-foreground">{item.icon}</div>
      <div>
        <div className="text-sm font-semibold">{item.title}</div>
        {item.description && (
          <p className="text-sm leading-snug text-muted-foreground">{item.description}</p>
        )}
      </div>
    </a>
  )
}

export { MarketingNav }
