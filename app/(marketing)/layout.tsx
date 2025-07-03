import { MarketingNav } from '@/components/marketing/marketing-nav'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarketingNav />
      <div className="pt-24">{children}</div>
    </>
  )
}
