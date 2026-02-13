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
          <div className="flex flex-col justify-between gap-8 p-6 mx-auto max-w-lg lg:text-center bg-muted rounded-2xl border border-secondary-200/50 shadow-sm hover:shadow-md hover:shadow-secondary-500/10 transition-all duration-300 dark:bg-gray-800">
            <div className="flex flex-col gap-4">
              <Typography variant="h3">{t('form.title')}</Typography>
              <Typography variant="p">{t('form.description')}</Typography>
            </div>

            <ContactForm />
          </div>

          {/* Right column - Features */}
          <div className="flex lg:flex flex-col gap-8 h-full justify-center py-4 lg:py-0">
            <div className="flex lg:flex flex-col gap-6">
              <div className="flex gap-3 items-start group p-4 rounded-2xl bg-muted border border-secondary-200/50 shadow-sm hover:shadow-md hover:shadow-secondary-500/10 transition-all duration-300">
                <div className="flex flex-col justify-between gap-4 p-6 mx-auto max-w-lg lg:text-center text-gray-900 bg-white rounded-lg border border-gray-100 shadow dark:border-gray-600 xl:p-8 dark:bg-gray-800 dark:text-white">
                  <MessageSquare size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="h5">{t('features.support.title')}</Typography>
                  <Typography variant="small" color="muted">
                    {t('features.support.description')}
                  </Typography>
                </div>
              </div>

              <div className="flex gap-3 items-start group p-4 rounded-2xl bg-muted border border-secondary-200/50 shadow-sm hover:shadow-md hover:shadow-secondary-500/10 transition-all duration-300">
                <div className="flex flex-col justify-between gap-4 p-6 mx-auto max-w-lg lg:text-center text-gray-900 bg-white rounded-lg border border-gray-100 shadow dark:border-gray-600 xl:p-8 dark:bg-gray-800 dark:text-white">
                  <Users size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="h5">{t('features.expertise.title')}</Typography>
                  <Typography variant="small" color="muted">
                    {t('features.expertise.description')}
                  </Typography>
                </div>
              </div>

              <div className="flex gap-3 items-start group p-4 rounded-2xl bg-muted border border-secondary-200/50 shadow-sm hover:shadow-md hover:shadow-secondary-500/10 transition-all duration-300">
                <div className="flex flex-col justify-between gap-4 p-6 mx-auto max-w-lg lg:text-center text-gray-900 bg-white rounded-lg border border-gray-100 shadow dark:border-gray-600 xl:p-8 dark:bg-gray-800 dark:text-white">
                  <Mail size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="h5">{t('features.followup.title')}</Typography>
                  <Typography variant="small" color="muted">
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
