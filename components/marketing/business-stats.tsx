"use client";
import { Typography } from "@/components/ui/typography";
import { Award, Shield, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

interface StatProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  subtext: string;
}

function Stat({ icon, label, description, subtext }: StatProps) {
  return (
    <div className="group flex flex-col gap-6 p-8 rounded-3xl bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-md border border-white/20 shadow-lg hover:shadow-xl hover:from-white/90 hover:to-white/70 transition-all duration-500 h-full relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary-50/30 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

      <div className="flex flex-row items-center justify-between gap-4 relative z-10">
        {/* Enhanced Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 border border-primary-100/50 flex items-center justify-center text-secondary-950 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
          {icon}
        </div>

        {/* Content */}
        <div className="flex-grow">
          <Typography
            variant="h3"
            className="text-xl font-bold text-secondary-950 transition-colors duration-300"
          >
            {label}
          </Typography>
        </div>
      </div>

      <div className="flex flex-col gap-4 relative z-10">
        <Typography
          variant="p"
          className="text-secondary-950 text-base leading-relaxed"
        >
          {description}
        </Typography>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent"></div>

        <Typography
          variant="p"
          className="text-foreground/60 text-sm font-medium"
        >
          {subtext}
        </Typography>
      </div>
    </div>
  );
}

export function BusinessStats() {
  const t = useTranslations("landingpage.businessStats");

  return (
    <section className="w-full py-20 px-4 relative overflow-hidden">
      <div className="sm:max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <Typography
            variant="h2"
            as={"h2"}
            className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-800 via-primary-700 to-secondary-900 mb-4"
          >
            {t("title")}
          </Typography>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Stat
            icon={<TrendingUp size={26} strokeWidth={1.5} />}
            label={t("revenue.label")}
            description={t("revenue.description")}
            subtext={t("revenue.subtext")}
          />

          <Stat
            icon={<Shield size={26} strokeWidth={1.5} />}
            label={t("lossReduction.label")}
            description={t("lossReduction.description")}
            subtext={t("lossReduction.subtext")}
          />

          <Stat
            icon={<Award size={26} strokeWidth={1.5} />}
            label={t("taxCredits.label")}
            description={t("taxCredits.description")}
            subtext={t("taxCredits.subtext")}
          />
        </div>
      </div>
    </section>
  );
}
