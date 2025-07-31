import { Hero } from '@/components/hero'
import { BusinessStats } from '@/components/marketing/business-stats'
import { CtaSection } from '@/components/marketing/cta-section'
import { Divider } from '@/components/marketing/divider'
import { FeaturesSummary } from '@/components/marketing/features-summary'
import { ThemeSwitcher } from '@/components/theme-switcher'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { Typography } from '@/components/ui/typography'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <div className="flex-1 flex flex-col gap-8 max-w-5xl p-5">
          <Hero />
          <Divider />
          <FeaturesSummary />
          <Divider />
          <BusinessStats />
          <Divider />
          <CtaSection />
        </div>

        {/* <main className="flex-1 flex flex-col gap-6 px-4">
          <Typography variant="h2">Next steps</Typography>
          {hasEnvVars ? <SignUpUserSteps /> : <ConnectSupabaseSteps />}
        </main> */}

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <Typography variant="p" color="muted">
            Powered by{' '}
            <a
              href="https://supabase.com/?utm_source=create-next-app&utm_medium=template&utm_term=nextjs"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Supabase
            </a>
          </Typography>
          <ThemeSwitcher />
          <LanguageSwitcher />
        </footer>
      </div>
    </main>
  )
}
