import { Suspense } from 'react'
import { PostHogPageView } from '@/app/providers/posthog-pageview'
import { PostHogProvider } from '@/app/providers/posthog-provider'
import { CookieConsentBanner } from '@/components/cookie-consent-banner'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingNav } from '@/components/marketing/marketing-nav'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <CookieConsentBanner />
      <div className="relative">
        <div className="h-20 py-4 px-4 absolute top-0 left-0 right-0 z-50 flex flex-col justify-center">
          <MarketingNav />
        </div>
        <div className="relative z-10">{children}</div>
        <MarketingFooter />
      </div>
    </PostHogProvider>
  )
}
