"use client";

import { Mail, MessageSquare, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { ContactForm } from "@/components/contact-form";
import { RevealAnimation } from "@/components/ui/reveal-animation";
import { Typography } from "@/components/ui/typography";

export default function Contact() {
  const t = useTranslations("contactpage");

  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-24 items-center mb-20">
        <div className="flex-1 flex flex-col gap-8 max-w-6xl p-5 w-full">
          <RevealAnimation direction="none">
            <section
              aria-labelledby="contact-heading"
              className="flex flex-col gap-4 items-center py-4 px-4"
            >
              <div className="text-center max-w-4xl mx-auto">
                <header className="text-6xl md:text-5xl font-bold mb-6 leading-tight">
                  <div className="flex items-center justify-center gap-4 mb-2">
                    <Typography
                      as="h1"
                      className="text-5xl md:text-7xl bg-clip-text text-transparent py-6 bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900"
                    >
                      {t("title")}
                    </Typography>
                  </div>
                  <Typography
                    as="h2"
                    className="text-3xl md:text-5xl text-foreground/80"
                  >
                    {t("subtitle")}
                  </Typography>
                </header>
                <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                  {t("description")}
                </p>
              </div>
            </section>
          </RevealAnimation>

          <RevealAnimation delay={0.2} direction="right">
            <section className="w-full px-4 my-4 relative overflow-hidden">
              <div className="max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
                  {/* Left column - Contact Form */}
                  <div className="flex flex-col rounded-2xl bg-white/90 border border-primary-100 shadow-xl p-8 space-y-6 mb-6">
                    <div className="flex flex-col gap-1">
                      <Typography
                        variant="h3"
                        className="text-2xl font-bold text-secondary-950 mb-4"
                      >
                        {t("form.title")}
                      </Typography>
                      <Typography variant="p" className="text-secondary-950/80">
                        {t("form.description")}
                      </Typography>
                    </div>

                    <ContactForm />
                  </div>

                  {/* Right column - Features */}
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <div className="flex gap-4 items-start">
                        <div className="text-secondary-950 bg-secondary-100/70 p-2.5 rounded-2xl border border-secondary-200/50 shadow-sm">
                          <MessageSquare size={22} strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="h4"
                            className="font-bold text-secondary-950 mb-1"
                          >
                            {t("features.support.title")}
                          </Typography>
                          <Typography
                            variant="p"
                            className="text-secondary-950/80"
                          >
                            {t("features.support.description")}
                          </Typography>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        <div className="text-secondary-950 bg-secondary-100/70 p-2.5 rounded-2xl border border-secondary-200/50 shadow-sm">
                          <Users size={22} strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="h4"
                            className="font-bold text-secondary-950 mb-1"
                          >
                            {t("features.expertise.title")}
                          </Typography>
                          <Typography
                            variant="p"
                            className="text-secondary-950/80"
                          >
                            {t("features.expertise.description")}
                          </Typography>
                        </div>
                      </div>

                      <div className="flex gap-4 items-start">
                        <div className="text-secondary-950 bg-secondary-100/70 p-2.5 rounded-2xl border border-secondary-200/50 shadow-sm">
                          <Mail size={22} strokeWidth={1.5} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Typography
                            variant="h4"
                            className="font-bold text-secondary-950 mb-1"
                          >
                            {t("features.followup.title")}
                          </Typography>
                          <Typography
                            variant="p"
                            className="text-secondary-950/80"
                          >
                            {t("features.followup.description")}
                          </Typography>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </RevealAnimation>
        </div>
      </div>
    </main>
  );
}
