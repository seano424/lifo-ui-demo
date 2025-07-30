import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { BookOpen, Sparkles } from 'lucide-react'
import Image from 'next/image'

export function Hero() {
  return (
    <div className="flex flex-col gap-4 items-center py-6 px-4 bg-background">
      {/* Main heading with gradient words */}
      <div className="text-center max-w-4xl mx-auto">
        <Typography className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
          <div className="flex items-center justify-center gap-4 mb-2">
            <Image
              src="/logos/lifo-logo-icon.svg"
              alt="LIFO AI Logo"
              width={50}
              height={50}
              className="h-16 md:h-16 w-auto"
            />
            <span className="text-7xl bg-clip-text text-transparent py-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              LIFO.AI
            </span>
          </div>
          <span className="text-foreground/80">
            The Future of Inventory Management is Here.{' '}
          </span>{' '}
        </Typography>

        <Typography variant="h3" className="mb-12 text-muted-foreground max-w-3xl mx-auto">
          Simplify your inventory management, optimize your costs and make informed decisions with
          our intelligent stock analysis platform.
        </Typography>
        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
          <Button
            size="lg"
            className="px-6 py-3 rounded-md bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Sparkles size={18} />
            Start my free trial
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="px-6 py-3 rounded-md border-foreground/20 hover:border-foreground/40 transition-colors flex items-center gap-2"
          >
            <BookOpen size={18} />
            Explore the platform
          </Button>
        </div>
        {/* Feature badge */}
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/10 mt-10">
          <span className="mr-2 text-primary">✨</span>
          <span className="text-sm font-medium text-primary">Enjoy a 14-day free trial</span>
        </div>
      </div>
      {/* Decorative divider */}
      <div className="w-full p-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent my-12" />
    </div>
  )
}
