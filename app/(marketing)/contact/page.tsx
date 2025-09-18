'use client'

import { ContactForm } from '@/components/contact-form'
import { Typography } from '@/components/ui/typography'
import { Mail, MessageSquare, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function Contact() {
  const t = useTranslations('contactpage')

  return (
    <main className="min-h-screen py-20 px-4 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center justify-center mb-16">
          <Typography
            as="h1"
            className="text-center text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900 mb-6"
          >
            {t('title')}
          </Typography>
          <Typography
            variant="p"
            className="text-center text-xl text-foreground/70 max-w-2xl mx-auto leading-relaxed"
          >
            {t('description')}
          </Typography>
        </div>

        {/* Contact Form and Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-start max-w-6xl mx-auto">
          {/* Left column - Contact Form */}
          <div className="flex flex-col rounded-3xl bg-gradient-to-br from-white/80 to-white/60 border border-white/20 shadow-lg p-6 lg:p-8 space-y-6">
            <div className="flex flex-col gap-1">
              <Typography
                variant="h3"
                className="text-xl lg:text-2xl font-bold text-foreground mb-4"
              >
                {t('form.title')}
              </Typography>
              <Typography variant="p" className="text-sm lg:text-base text-foreground/70">
                {t('form.description')}
              </Typography>
            </div>

            <ContactForm />
          </div>

          {/* Right column - Features */}
          <div className="space-y-6 lg:space-y-8 h-full flex flex-col justify-center py-4 lg:py-0">
            <div className="space-y-4 lg:space-y-6">
              <div className="flex gap-3 items-start group p-4 rounded-2xl bg-gradient-to-br from-white to-secondary-50/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-700 group-hover:scale-110 transition-transform duration-300">
                  <MessageSquare size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="h3" className="text-base lg:text-lg font-bold text-foreground mb-1 lg:mb-2">
                    {t('features.support.title')}
                  </Typography>
                  <Typography variant="p" className="text-xs lg:text-sm text-foreground/70 leading-relaxed">
                    {t('features.support.description')}
                  </Typography>
                </div>
              </div>

              <div className="flex gap-3 items-start group p-4 rounded-2xl bg-gradient-to-br from-white to-secondary-50/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-700 group-hover:scale-110 transition-transform duration-300">
                  <Users size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="h3" className="text-base lg:text-lg font-bold text-foreground mb-1 lg:mb-2">
                    {t('features.expertise.title')}
                  </Typography>
                  <Typography variant="p" className="text-xs lg:text-sm text-foreground/70 leading-relaxed">
                    {t('features.expertise.description')}
                  </Typography>
                </div>
              </div>

              <div className="flex gap-3 items-start group p-4 rounded-2xl bg-gradient-to-br from-white to-secondary-50/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100 flex items-center justify-center text-primary-700 group-hover:scale-110 transition-transform duration-300">
                  <Mail size={20} strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1">
                  <Typography variant="h3" className="text-base lg:text-lg font-bold text-foreground mb-1 lg:mb-2">
                    {t('features.followup.title')}
                  </Typography>
                  <Typography variant="p" className="text-xs lg:text-sm text-foreground/70 leading-relaxed">
                    {t('features.followup.description')}
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
