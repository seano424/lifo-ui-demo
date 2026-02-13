import { CookieConsentBanner } from '@/components/cookie-consent-banner'
import { PostHogConsentHandler } from '@/components/posthog-consent-handler'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingNav } from '@/components/marketing/marketing-nav'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PostHogConsentHandler />
      <CookieConsentBanner />
      <div className="relative">
        <div className="py-6 px-4 absolute top-0 left-0 right-0 z-50 flex flex-col justify-center">
          <MarketingNav />
        </div>
        <main>{children}</main>
        <MarketingFooter />
      </div>
    </>
  )
}
