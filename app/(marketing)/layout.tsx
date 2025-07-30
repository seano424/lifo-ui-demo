import { MarketingNav } from '@/components/marketing/marketing-nav'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20">
        <MarketingNav />
        <div className="pt-24">{children}</div>
      </div>
    </>
  )
}
