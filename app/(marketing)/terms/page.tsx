'use client'

import { Typography } from '@/components/ui/typography'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function TermsPage() {
  const t = useTranslations('termspage')

  return (
    <main className="min-h-screen py-20 px-4 relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-16">
          <Typography
            variant="h1"
            className="text-center text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900 mb-6"
          >
            {t('title')}
          </Typography>
          <Typography variant="p" className="text-center text-sm text-muted-foreground">
            {t('lastUpdated')}
          </Typography>
        </div>

        {/* Content */}
        <div className="rounded-3xl bg-card border border-white/20 shadow-lg p-8 md:p-12 space-y-8">
          {/* Section 1 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section1.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section1.content')}
            </Typography>
          </section>

          {/* Section 2 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section2.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section2.content')}
            </Typography>
          </section>

          {/* Section 3 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section3.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section3.intro')}
            </Typography>
            <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
              <li>{t('section3.items.0')}</li>
              <li>{t('section3.items.1')}</li>
              <li>{t('section3.items.2')}</li>
              <li>{t('section3.items.3')}</li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section3.outro')}
            </Typography>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section4.title')}
            </Typography>
            <div className="space-y-4">
              <div>
                <Typography variant="h3" className="text-lg font-semibold text-foreground mb-2">
                  {t('section4.whatWeCollect.title')}
                </Typography>
                <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
                  <li>{t('section4.whatWeCollect.items.0')}</li>
                  <li>{t('section4.whatWeCollect.items.1')}</li>
                  <li>{t('section4.whatWeCollect.items.2')}</li>
                  <li>{t('section4.whatWeCollect.items.3')}</li>
                  <li>{t('section4.whatWeCollect.items.4')}</li>
                </ul>
              </div>
              <div>
                <Typography variant="h3" className="text-lg font-semibold text-foreground mb-2">
                  {t('section4.howWeUse.title')}
                </Typography>
                <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
                  <li>{t('section4.howWeUse.items.0')}</li>
                  <li>{t('section4.howWeUse.items.1')}</li>
                  <li>{t('section4.howWeUse.items.2')}</li>
                  <li>{t('section4.howWeUse.items.3')}</li>
                  <li>{t('section4.howWeUse.items.4')}</li>
                  <li>{t('section4.howWeUse.items.5')}</li>
                </ul>
              </div>
              <div>
                <Typography variant="h3" className="text-lg font-semibold text-foreground mb-2">
                  {t('section4.legalBasis.title')}
                </Typography>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  {t('section4.legalBasis.intro')}
                </Typography>
                <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
                  <li>{t('section4.legalBasis.items.0')}</li>
                  <li>{t('section4.legalBasis.items.1')}</li>
                  <li>{t('section4.legalBasis.items.2')}</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section5.title')}
            </Typography>
            <div className="space-y-4">
              <div>
                <Typography variant="h3" className="text-lg font-semibold text-foreground mb-2">
                  {t('section5.yourData.title')}
                </Typography>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  {t('section5.yourData.content')}
                </Typography>
              </div>
              <div>
                <Typography variant="h3" className="text-lg font-semibold text-foreground mb-2">
                  {t('section5.dataRetention.title')}
                </Typography>
                <Typography variant="p" className="text-foreground/80 leading-relaxed">
                  {t('section5.dataRetention.content')}
                </Typography>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section6.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section6.intro')}
            </Typography>
            <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
              <li>{t('section6.items.0')}</li>
              <li>{t('section6.items.1')}</li>
              <li>{t('section6.items.2')}</li>
              <li>{t('section6.items.3')}</li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section6.outro')}
            </Typography>
          </section>

          {/* Section 7 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section7.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section7.intro')}
            </Typography>
            <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
              <li>{t('section7.items.0')}</li>
              <li>{t('section7.items.1')}</li>
              <li>{t('section7.items.2')}</li>
              <li>{t('section7.items.3')}</li>
              <li>{t('section7.items.4')}</li>
              <li>{t('section7.items.5')}</li>
              <li>{t('section7.items.6')}</li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section7.contact')}{' '}
              <Link
                href={`mailto:${t('section7.email')}`}
                className="text-primary-800 hover:text-primary-800 underline"
              >
                {t('section7.email')}
              </Link>
              .
            </Typography>
          </section>

          {/* Section 8 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section8.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section8.intro')}
            </Typography>
            <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
              <li>{t('section8.items.0')}</li>
              <li>{t('section8.items.1')}</li>
              <li>{t('section8.items.2')}</li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section8.outro')}
            </Typography>
          </section>

          {/* Section 9 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section9.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section9.intro')}
            </Typography>
            <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
              <li>{t('section9.items.0')}</li>
              <li>{t('section9.items.1')}</li>
              <li>{t('section9.items.2')}</li>
              <li>{t('section9.items.3')}</li>
              <li>{t('section9.items.4')}</li>
              <li>{t('section9.items.5')}</li>
            </ul>
          </section>

          {/* Section 10 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section10.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section10.content')}
            </Typography>
          </section>

          {/* Section 11 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section11.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section11.content')}
            </Typography>
          </section>

          {/* Section 12 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section12.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section12.intro')}
            </Typography>
            <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
              <li>{t('section12.items.0')}</li>
              <li>{t('section12.items.1')}</li>
              <li>{t('section12.items.2')}</li>
              <li>{t('section12.items.3')}</li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section12.outro')}
            </Typography>
          </section>

          {/* Section 13 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section13.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section13.intro')}
            </Typography>
            <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
              <li>{t('section13.items.0')}</li>
              <li>{t('section13.items.1')}</li>
              <li>{t('section13.items.2')}</li>
              <li>{t('section13.items.3')}</li>
              <li>{t('section13.items.4')}</li>
            </ul>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section13.outro')}
            </Typography>
          </section>

          {/* Section 14 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section14.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section14.intro')}
            </Typography>
            <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
              <li>{t('section14.items.0')}</li>
              <li>{t('section14.items.1')}</li>
              <li>{t('section14.items.2')}</li>
              <li>{t('section14.items.3')}</li>
            </ul>
          </section>

          {/* Section 15 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section15.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section15.content')}
            </Typography>
          </section>

          {/* Section 16 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section16.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section16.intro')}
            </Typography>
            <ul className="list-disc list-inside space-y-2 ml-6 text-foreground/80 leading-relaxed">
              <li>{t('section16.items.0')}</li>
              <li>{t('section16.items.1')}</li>
              <li>{t('section16.items.2')}</li>
            </ul>
          </section>

          {/* Section 17 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section17.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section17.content')}
            </Typography>
          </section>

          {/* Section 18 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section18.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section18.content')}
            </Typography>
          </section>

          {/* Section 19 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section19.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section19.intro')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section19.email').replace('Email: ', '')}
              <Link
                href={`mailto:${t('section7.email')}`}
                className="text-primary-800 hover:text-primary-800 underline"
              >
                {t('section7.email')}
              </Link>
            </Typography>
          </section>

          {/* Section 20 */}
          <section className="space-y-4">
            <Typography variant="h2" className="text-2xl font-bold text-foreground">
              {t('section20.title')}
            </Typography>
            <Typography variant="p" className="text-foreground/80 leading-relaxed">
              {t('section20.content')}
            </Typography>
          </section>

          {/* Final Statement */}
          <section className="pt-6 border-t border-foreground/10">
            <Typography variant="p" className="text-foreground/80 leading-relaxed italic">
              {t('finalStatement.content')}
            </Typography>
          </section>
        </div>
      </div>
    </main>
  )
}
