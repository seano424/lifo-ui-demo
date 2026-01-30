import { Suspense } from 'react'
import { PostHogPageView } from '@/app/providers/posthog-pageview'
import { PostHogProvider } from '@/app/providers/posthog-provider'
import { CookieConsentBanner } from '@/components/cookie-consent-banner'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { MarketingNav } from '@/components/marketing/marketing-nav'
// import Image from 'next/image'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <CookieConsentBanner />
      <div className="relative">
        {/* <div className='absolute inset-0 -z-10 mask-[linear-gradient(to_bottom,black_10%,transparent)]'>

          <Image src="/images/bg.svg" alt="Background" fill className='object-cover rotate-180 scale-x-[-1]' />
        </div> */}

        <div className="py-6 px-4 absolute top-0 left-0 right-0 z-50 flex flex-col justify-center">
          <MarketingNav />
        </div>

        <div>{children}</div>

        <MarketingFooter />
      </div>
    </PostHogProvider>
  )
}
