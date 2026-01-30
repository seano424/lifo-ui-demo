'use client'

import { Typography } from '@/components/ui/typography'
import Link from 'next/link'
import { useTranslations } from 'next-intl'

export default function PrivacyPage() {
  const t = useTranslations('privacypage')

  return (
    <main className="min-h-screen py-20 px-4 relative overflow-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-16">
          <Typography variant="h1">{t('title')}</Typography>
          <Typography variant="p">{t('lastUpdated')}</Typography>
        </div>

        {/* Content */}
        <div className="rounded-3xl bg-card border-white/20 shadow-lg p-8 space-y-8">
          {/* Section 1 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section1.title')}</Typography>
            <Typography variant="p">{t('section1.content')}</Typography>
          </section>

          {/* Section 2 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section2.title')}</Typography>
            <Typography variant="p">{t('section2.intro')}</Typography>
            <ul className="list-disc list-inside space-y-2 ml-6">
              <li>{t('section2.items.0')}</li>
              <li>{t('section2.items.1')}</li>
              <li>{t('section2.items.2')}</li>
              <li>{t('section2.items.3')}</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section3.title')}</Typography>
            <Typography variant="p">{t('section3.intro')}</Typography>
            <ul className="list-disc list-inside space-y-2 ml-6">
              <li>{t('section3.items.0')}</li>
              <li>{t('section3.items.1')}</li>
              <li>{t('section3.items.2')}</li>
              <li>{t('section3.items.3')}</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section4.title')}</Typography>
            <Typography variant="p">{t('section4.legalBasis.title')}</Typography>
            <ul className="list-disc list-inside space-y-2 ml-6">
              <li>{t('section4.legalBasis.items.0')}</li>
              <li>{t('section4.legalBasis.items.1')}</li>
              <li>{t('section4.legalBasis.items.2')}</li>
              <li>{t('section4.legalBasis.items.3')}</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section5.title')}</Typography>
            <ul className="list-disc list-inside space-y-2 ml-6">
              <li>{t('section5.items.0')}</li>
              <li>{t('section5.items.1')}</li>
              <li>{t('section5.items.2')}</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section6.title')}</Typography>
            <div className="flex flex-col gap-4">
              <div>
                <Typography variant="h3">{t('section6.storage.title')}</Typography>
                <Typography variant="p">{t('section6.storage.content')}</Typography>
              </div>
              <div>
                <Typography variant="h3">{t('section6.retention.title')}</Typography>
                <Typography variant="p">{t('section6.retention.content')}</Typography>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section7.title')}</Typography>
            <Typography variant="p">{t('section7.intro')}</Typography>
            <ul className="list-disc list-inside space-y-2 ml-6">
              <li>{t('section7.items.0')}</li>
              <li>{t('section7.items.1')}</li>
              <li>{t('section7.items.2')}</li>
              <li>{t('section7.items.3')}</li>
              <li>{t('section7.items.4')}</li>
              <li>{t('section7.items.5')}</li>
              <li>{t('section7.items.6')}</li>
            </ul>
            <Typography variant="p">
              {t('section7.contact')}{' '}
              <Link href={`mailto:${t('section7.email')}`}>{t('section7.email')}</Link>.
            </Typography>
            <Typography variant="p">{t('section7.responseTime')}</Typography>
          </section>

          {/* Section 8 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section8.title')}</Typography>
            <Typography variant="p">{t('section8.intro')}</Typography>

            <div className="space-y-4 ml-6">
              <div>
                <Typography variant="h3">{t('section8.whatWeCollect.title')}</Typography>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>{t('section8.whatWeCollect.items.0')}</li>
                  <li>{t('section8.whatWeCollect.items.1')}</li>
                  <li>{t('section8.whatWeCollect.items.2')}</li>
                  <li>{t('section8.whatWeCollect.items.3')}</li>
                </ul>
              </div>

              <div>
                <Typography variant="h3">{t('section8.whatWeDontCollect.title')}</Typography>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>{t('section8.whatWeDontCollect.items.0')}</li>
                  <li>{t('section8.whatWeDontCollect.items.1')}</li>
                  <li>{t('section8.whatWeDontCollect.items.2')}</li>
                  <li>{t('section8.whatWeDontCollect.items.3')}</li>
                </ul>
              </div>

              <div>
                <Typography variant="h3">{t('section8.yourChoices.title')}</Typography>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>{t('section8.yourChoices.items.0')}</li>
                  <li>{t('section8.yourChoices.items.1')}</li>
                  <li>{t('section8.yourChoices.items.2')}</li>
                  <li>{t('section8.yourChoices.items.3')}</li>
                  <li>{t('section8.yourChoices.items.4')}</li>
                </ul>
              </div>

              <div>
                <Typography variant="h3">{t('section8.dataStorage.title')}</Typography>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>{t('section8.dataStorage.items.0')}</li>
                  <li>{t('section8.dataStorage.items.1')}</li>
                  <li>{t('section8.dataStorage.items.2')}</li>
                </ul>
              </div>

              <div>
                <Typography variant="h3">{t('section8.cookiesSet.title')}</Typography>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>{t('section8.cookiesSet.items.0')}</li>
                  <li>{t('section8.cookiesSet.items.1')}</li>
                </ul>
              </div>
            </div>

            <Typography variant="p">{t('section8.outro')}</Typography>
          </section>

          {/* Section 9 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section9.title')}</Typography>
            <Typography variant="p">{t('section9.intro')}</Typography>
            <ul className="list-disc list-inside space-y-2 ml-6">
              <li>{t('section9.items.0')}</li>
              <li>{t('section9.items.1')}</li>
              <li>{t('section9.items.2')}</li>
            </ul>
            <Typography variant="p">{t('section9.outro')}</Typography>
          </section>

          {/* Section 10 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section10.title')}</Typography>
            <Typography variant="p">{t('section10.content')}</Typography>
          </section>

          {/* Section 11 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section11.title')}</Typography>
            <Typography variant="p">{t('section11.intro')}</Typography>
            <ul className="list-disc list-inside space-y-2 ml-6">
              <li>{t('section11.items.0')}</li>
            </ul>
          </section>

          {/* Section 12 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section12.title')}</Typography>
            <Typography variant="p">{t('section12.content')}</Typography>
          </section>

          {/* Section 13 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section13.title')}</Typography>
            <Typography variant="p">{t('section13.content')}</Typography>
          </section>

          {/* Section 14 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section14.title')}</Typography>
            <Typography variant="p">{t('section14.intro')}</Typography>
            <div className="space-y-4 ml-4">
              <div>
                <Typography variant="h3">{t('section14.euAuthorities.title')}</Typography>
                <Typography variant="p">
                  {t('section14.euAuthorities.content')}{' '}
                  <Link
                    href={t('section14.euAuthorities.link')}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('section14.euAuthorities.link')}
                  </Link>
                </Typography>
              </div>
              <div>
                <Typography variant="h3">{t('section14.netherlands.title')}</Typography>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>{t('section14.netherlands.authority')}</li>
                  <li>
                    Website:{' '}
                    <Link
                      href={`https://${t('section14.netherlands.website')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('section14.netherlands.website')}
                    </Link>
                  </li>
                  <li>
                    Email:{' '}
                    <Link href={`mailto:${t('section14.netherlands.email')}`}>
                      {t('section14.netherlands.email')}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 15 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section15.title')}</Typography>
            <Typography variant="p">{t('section15.content')}</Typography>
          </section>

          {/* Section 16 */}
          <section className="flex flex-col gap-4">
            <Typography variant="h2">{t('section16.title')}</Typography>
            <Typography variant="p">{t('section16.intro')}</Typography>
            <Typography variant="p">
              <strong>Email:</strong>{' '}
              <Link href={`mailto:${t('section16.email')}`}>{t('section16.email')}</Link>
            </Typography>
            <Typography variant="p">
              <strong>Response Time:</strong> {t('section16.responseTime')}
            </Typography>
          </section>

          {/* Final Statement */}
          <section className="pt-6 border-t border-foreground/10">
            <Typography variant="p">{t('finalStatement.content')}</Typography>
          </section>
        </div>
      </div>
    </main>
  )
}
