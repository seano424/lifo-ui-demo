import { Typography } from '@/components/ui/typography'
import Image from 'next/image'

export function HeroHeading() {
  return (
    <Typography className="text-5xl md:text-5xl font-bold mb-6 leading-tight">
      <div className="flex items-center justify-center gap-4 mb-2">
        <Image
          src="/logos/lifo-logo-icon.svg"
          alt="LIFO AI Logo"
          width={50}
          height={50}
          className="h-16 md:h-16 w-auto"
        />
        <span className="text-6xl md:text-7xl bg-clip-text text-transparent py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
          LIFO.AI
        </span>
      </div>
      <span className="text-foreground/80">The Future of Inventory Management is Here.</span>
    </Typography>
  )
}
