import Image from 'next/image'
import { Typography } from '../ui/typography'

export function HeroHeading() {
  return (
    <header className="text-6xl md:text-5xl font-bold mb-6 leading-tight">
      <div className="flex items-center justify-center gap-4 mb-2">
        <Image
          src="/logos/lifo-logo-icon.svg"
          alt="LIFO AI Logo"
          width={64}
          height={64}
          className="h-12 w-auto md:h-16"
          priority
        />
        <Typography
          as="h1"
          className="text-5xl md:text-7xl bg-clip-text text-transparent py-6 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
        >
          LIFO.AI
        </Typography>
      </div>
      <Typography as="h2" className="text-4xl md:text-6xl text-foreground/80">
        The Future of Inventory Management is Here.
      </Typography>
    </header>
  )
}
