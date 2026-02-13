'use client'

import { Mail, MessageSquare, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ContactForm } from '@/components/contact-form'
import { Typography } from '@/components/ui/typography'

export default function Contact() {
  const t = useTranslations('contactpage')

  return (
    <section className="bg-white dark:bg-gray-900 min-h-screen pt-20 px-4 relative overflow-hidden">
      <div className="py-8 px-4 mx-auto max-w-screen-xl lg:py-16 lg:px-6 flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-4 items-center justify-center">
          <Typography variant="h2" className="font-extrabold tracking-tight">
            {t('title')}
          </Typography>
          <Typography variant="h5" className="max-w-xl text-center">
            {t('description')}
          </Typography>
        </div>

        {/* Contact Form and Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start max-w-6xl mx-auto">
          {/* Left column - Contact Form */}
          <div className="rounded-3xl bg-card/90 border shadow-lg p-6 lg:p-8 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <Typography variant="h3">{t('form.title')}</Typography>
              <Typography variant="p">{t('form.description')}</Typography>
            </div>

            <ContactForm />
          </div>

          {/* Right column - Features */}
          <div className="flex lg:flex flex-col gap-8 h-full justify-center py-4 lg:py-0">
            <div className="flex lg:flex flex-col gap-6">
              <div className="flex gap-3 items-start group p-4 rounded-2xl bg-card backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-100 to-secondary-100 dark:from-primary-900/50 dark:to-secondary-900/50 flex items-center justify-center text-primary-800 dark:text-primary-200 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography
                    variant="h3"
                    className="text-base lg:text-lg  text-foreground mb-1 lg:mb-2"
                  >
                    {t('features.support.title')}
                  </Typography>
                  <Typography
                    variant="p"
                    className="text-xs lg:text-sm text-foreground/70 leading-relaxed"
                  >
                    {t('features.support.description')}
                  </Typography>
                </div>
              </div>

              <div className="flex gap-3 items-start group p-4 rounded-2xl bg-card backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-100 to-secondary-100 dark:from-primary-900/50 dark:to-secondary-900/50 flex items-center justify-center text-primary-800 dark:text-primary-200 group-hover:scale-110 transition-transform duration-300">
                  <Users size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography
                    variant="h3"
                    className="text-base lg:text-lg  text-foreground mb-1 lg:mb-2"
                  >
                    {t('features.expertise.title')}
                  </Typography>
                  <Typography
                    variant="p"
                    className="text-xs lg:text-sm text-foreground/70 leading-relaxed"
                  >
                    {t('features.expertise.description')}
                  </Typography>
                </div>
              </div>

              <div className="flex gap-3 items-start group p-4 rounded-2xl bg-card backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-primary-100 to-secondary-100 dark:from-primary-900/50 dark:to-secondary-900/50 flex items-center justify-center text-primary-800 dark:text-primary-200 group-hover:scale-110 transition-transform duration-300">
                  <Mail size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography
                    variant="h3"
                    className="text-base lg:text-lg  text-foreground mb-1 lg:mb-2"
                  >
                    {t('features.followup.title')}
                  </Typography>
                  <Typography
                    variant="p"
                    className="text-xs lg:text-sm text-foreground/70 leading-relaxed"
                  >
                    {t('features.followup.description')}
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
