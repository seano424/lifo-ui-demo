import { MarketingNav } from '@/components/marketing/marketing-nav'
import { GridBackground } from '@/components/ui/grid-background'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20">
      <GridBackground gridSize={40} transparencyLevel="medium" dotSize={1.5} />

      <div className="h-20 border-b border-foreground/10 py-4 px-4 fixed top-0 left-0 right-0 z-50 flex flex-col justify-center bg-background ">
        <MarketingNav />
      </div>

      <div className="relative top-20 z-10">{children}</div>
    </div>
  )
}
